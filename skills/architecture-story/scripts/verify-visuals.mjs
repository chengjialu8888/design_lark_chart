#!/usr/bin/env node
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {validate,exportPage} from '../runtime/story.mjs';
import {fitNodeSize,canvasGeometry,logicalBox,cubicProgress,transferPoint} from '../runtime/scene-geometry.mjs';
import {visualProgress,transferVisual} from '../runtime/scene-visuals.mjs';
import {slowTransfers} from './slow-transfers.mjs';
import {resolveRelations} from '../runtime/scene-contract.mjs';
const example=()=>readFile(new URL('../examples/support-comparison.json',import.meta.url),'utf8').then(JSON.parse);
test('same chat and metric schema works for an independent support domain',async()=>{
  const spec=await example();validate(spec);
  const html=await exportPage(spec);
  assert.ok(html.includes('metric-row')&&html.includes('Mia'));
  assert.ok(!/__STORY_[A-Z_]+__/.test(html),'All runtime helpers must be embedded');
  assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(html));
});
test('invalid avatar, chart data and unbounded animation input are rejected',async()=>{
  for(const change of [
    s=>s.actors[0].visual.avatar='remote-image',
    s=>s.actors[0].visual.avatarText='Too long',
    s=>s.actors[1].visual.variant='chat',
    s=>s.scenes[0].frames[3].items.cost.metric.max=5,
    s=>s.scenes[0].frames[3].items.cost.metric.series[0].value=-1,
    s=>s.scenes[0].frames[3].items.cost.metric.duration=0,
    s=>s.scenes[0].frames[3].items.cost.metric.delay=Infinity,
    s=>s.scenes[0].frames[3].items.cost.metric.series.pop(),
    s=>s.scenes[0].frames[3].items.cost.lines=['Incompatible body'],
    s=>s.actors[0].visual.unknown='silently ignored'
  ]){const s=await example();change(s);assert.throws(()=>validate(s));}
});
test('external avatars participate in stage and container geometry',async()=>{
  const s=await example();s.scenes[0].frames[0].items.request.narrow=[.28,24,.70,96];
  assert.throws(()=>validate(s),/Avatar.*escapes stage/);
});
test('micro plain sizing follows the icon-free typography used by the browser',()=>{
  const actor={kind:'service',label:'Worker #02',visual:{variant:'plain',avatar:'bot'}};
  const item={lines:['On PR','Example']};
  assert.ok(fitNodeSize(item,actor,83,true).height<=96);
});
test('bar clocks hold before delay, settle exactly and honor reduced motion',()=>{
  assert.equal(visualProgress(-100,900),0);
  assert.equal(visualProgress(900,900),1);
  assert.equal(visualProgress(250,900,true),1);
  const p=[0,100,300,600,900,1200].map(age=>visualProgress(age,900));
  assert.ok(p.every((v,i)=>i===0||v>=p[i-1]));
});
test('design canvas scales once, centers at cap and preserves legacy coordinates',()=>{
  const scene={height:320,narrowHeight:524},p={canvas:{wideWidth:720,narrowWidth:380,maxScale:1.35}};
  assert.deepEqual(canvasGeometry(p,scene,320),{narrow:true,logicalWidth:380,logicalHeight:524,scale:320/380,offsetX:0,displayHeight:442});
  assert.equal(canvasGeometry(p,scene,559).narrow,true);
  assert.equal(canvasGeometry(p,scene,560).narrow,false);
  const large=canvasGeometry(p,scene,1200);assert.equal(large.scale,1.35);assert.ok(Math.abs(large.offsetX-114)<1e-9);
  assert.equal(canvasGeometry({},scene,736).scale,1);
  assert.deepEqual(logicalBox({x:30,y:50,width:40,height:60},{x:10,y:10},2),{x:10,y:20,w:20,h:30});
});
test('equal-time segments ignore obstacle bends and remain continuous at boundaries',()=>{
  const points=[{x:0,y:0},{x:20,y:0},{x:20,y:80},{x:200,y:80}],t={timing:'segments',easing:[.22,.9,.24,1]};
  assert.equal(cubicProgress(0),0);assert.equal(cubicProgress(1),1);
  const mid=transferPoint(points,.5,[1],t);assert.equal(mid.x,20);assert.equal(mid.y,80);
  const a=transferPoint(points,.5-1e-7,[1],t),b=transferPoint(points,.5+1e-7,[1],t);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.01);
  assert.deepEqual(transferPoint([{x:2,y:3},{x:2,y:3}],.5,[],t),{x:2,y:3,fraction:.5});
  assert.equal(transferPoint(points,1,[0,1],t).x,200);
  assert.equal(transferPoint([{x:0,y:0},{x:100,y:0}],.25).x,25);
  assert.equal(transferPoint([{x:0,y:0},{x:100,y:0}],.25,[],undefined,true).x,15.625);
  assert.ok(fitNodeSize({lines:['On PR','Example']},{label:'Worker #02',visual:{variant:'plain',avatar:'bot'}},110,true,'compact').height<=64);
});
test('invalid canvas, transition, transfer and waypoint stops fail strictly',async()=>{
  for(const change of [
    s=>s.presentation.canvas.maxScale=0,
    s=>s.presentation.canvas.narrowWidth=800,
    s=>s.presentation.canvas.extra=1,
    s=>s.presentation.transition.easing=[-1,0,1,1],
    s=>s.presentation.transition.duration=99,
    s=>s.scenes[0].frames[1].links[0].transfer.easing=[0,1,Infinity,1],
    s=>s.scenes[0].frames[1].links[0].transfer.timing='waypoints',
    s=>s.relations[0].narrowRoute.stops=[1],
    s=>s.relations[0].wideRoute.stops=[1,0],
    s=>s.relations[0].wideRoute.stops=[0,0],
  ]){const s=await example();change(s);assert.throws(()=>validate(s));}
});
test('frame badges retain task text and reset presentation without changing relations',async()=>{
  const s=await example();
  const actor=s.actors.find(a=>a.visual?.variant==='plain');
  assert.ok(actor);
  const frame=s.scenes[0].frames.find(f=>f.items[actor.id]);
  const item=frame.items[actor.id],lines=structuredClone(item.lines);
  item.visual={tone:'warning',badge:'Review'};
  if(frame.links.length)frame.links[0].label='';
  validate(s);
  const resolved=resolveRelations(s);
  assert.deepEqual(item.lines,lines);
  if(frame.links.length){
    assert.equal(resolved.scenes[0].frames[s.scenes[0].frames.indexOf(frame)].links[0].label,'');
    assert.ok(s.relations.find(r=>r.id===frame.links[0].relation).label);
  }
  for(const visual of [{badge:'123456789'},{tone:'unknown'},{badge:''},{badge:42},{extra:true}]){
    item.visual=visual;assert.throws(()=>validate(s));
  }
  item.visual={badge:'Review'};item.wide[1]=4;
  assert.throws(()=>validate(s),/escapes stage/);
});
test('soft signal and arrival have continuous finite opacity without flashing',()=>{
  const travel=1710;
  for(const age of [0,travel,travel+650]){const v=transferVisual(age,travel,true);assert.equal(v.signal,0);assert.equal(v.arrival,0);}
  let previous=transferVisual(0,travel,true);
  for(let age=16;age<=travel+800;age+=16){
    const v=transferVisual(age,travel,true);
    assert.ok(Number.isFinite(v.radius)&&v.signal>=0&&v.signal<=1&&v.arrival>=0&&v.arrival<=.3);
    assert.ok(Math.abs(v.signal-previous.signal)<.11&&Math.abs(v.arrival-previous.arrival)<.06);
    if(age<travel)assert.equal(v.arrival,0);
    previous=v;
  }
  assert.deepEqual(transferVisual(400,travel,true,true),{signal:0,arrival:0,radius:0});
});
test('slow retiming preserves facts and holds, rejects receiver-before-delivery',async()=>{
  const source=await example(),s=slowTransfers(source);
  assert.deepEqual(source.contract,s.contract);assert.deepEqual(source.actors,s.actors);
  assert.deepEqual(source.relations,s.relations);
  const a=source.scenes[0],b=s.scenes[0];
  assert.equal(b.frames[1].links[0].travel,1710);
  assert.equal(b.frames[1].links[0].transfer.scope,'route');
  assert.ok(b.frames[2].at-b.frames[1].at>=1710+700);
  assert.equal(b.duration-b.frames.at(-1).at,a.duration-a.frames.at(-1).at);
  assert.deepEqual(b.frames.map(f=>f.facts),a.frames.map(f=>f.facts));
  b.frames[2].at=b.frames[1].at+1700;assert.throws(()=>validate(s),/transfer|Transfer/);
  for(const o of [{factor:0},{returnFactor:Infinity},{settle:100}])assert.throws(()=>slowTransfers(source,o));
  for(const change of [s=>s.scenes[0].frames[1].links[0].transfer.scope='random',s=>s.scenes[0].frames[1].links[0].transfer.effect='blink']){
    const bad=slowTransfers(source);change(bad);assert.throws(()=>validate(bad));
  }
});
