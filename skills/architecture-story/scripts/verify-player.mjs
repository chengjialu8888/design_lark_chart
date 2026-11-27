#!/usr/bin/env node
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizePlayback} from '../runtime/playback.mjs';
import {validate,exportPage} from '../runtime/story.mjs';
import {compactStory} from './compact-story.mjs';
import {resolveRelations,auditScenes} from '../runtime/scene-contract.mjs';
import {fitNodeSize} from '../runtime/scene-geometry.mjs';
import {checkPresentation} from './check-presentation.mjs';

test('canonical segmented transfer survives normalization and offline helper injection',async()=>{
  const s=JSON.parse(await readFile(new URL('../examples/support-comparison.json',import.meta.url),'utf8'));
  const r=resolveRelations(s);
  assert.deepEqual(r.scenes[0].frames[1].links[0].transfer,s.scenes[0].frames[1].links[0].transfer);
  assert.deepEqual(r.scenes[0].frames[1].links[0].wideRoute.stops,[0]);
  const html=await exportPage(s);
  assert.ok(html.includes('function canvasGeometry')&&html.includes('function transferPoint'));
  assert.ok(!/__STORY_[A-Z_]+__/.test(html));
});

test('short content stays compact in a full-width slot; long content retains readable height',()=>{
  const actor={label:'TCC 原文',kind:'message'};
  const item={wide:[0,0,.9,200],narrow:[0,0,.9,200],lines:['每次仍读取 TCC','相同配置内容']};
  const wide=fitNodeSize(item,actor,700,false),narrow=fitNodeSize(item,actor,296,true);
  assert.ok(wide.width<210&&narrow.width<210);
  assert.ok(wide.height<100&&narrow.height<100);
  const long=fitNodeSize({...item,lines:['这是需要完整显示的长说明，不能为了缩小节点而把业务信息截断或隐藏。']},actor,132,true);
  assert.ok(long.height>narrow.height);
  assert.deepEqual(item.lines,['每次仍读取 TCC','相同配置内容']);
});

test('minimal controls and explicit autoplay remain independent of mode',()=>{
  assert.equal(normalizePlayback().controls,'minimal');
  assert.equal(normalizePlayback().autoplay,false);
  assert.equal(normalizePlayback({mode:'presentation'}).autoplay,true);
  assert.equal(normalizePlayback({mode:'presentation',autoplay:false}).autoplay,false);
  assert.equal(normalizePlayback({controls:'full'}).controls,'full');
  for(const input of [{controls:'invisible'},{autoplay:1},{autopaly:true},{mode:'video'}])
    assert.throws(()=>normalizePlayback(input));
});

for(const name of ['expense-approval','shared-result','react-loop']) {
  test(`${name}: compact poses preserve causal content and export offline`,async()=>{
    const source=JSON.parse(await readFile(new URL(`../examples/${name}.json`,import.meta.url),'utf8'));
    const compact=compactStory(source);
    validate(compact);
    assert.deepEqual(compact.actors,source.actors);
    assert.deepEqual(compact.contract,source.contract);
    assert.equal(compact.scenes.length,source.scenes.length);
    source.scenes.forEach((scene,i)=>scene.frames.forEach((frame,j)=>{
      const next=compact.scenes[i].frames[j];
      assert.equal(next.at,frame.at);assert.equal(next.caption,frame.caption);
      assert.deepEqual(next.facts,frame.facts);
      for(const [id,item] of Object.entries(frame.items)){
        const stripped=({wide,narrow,...rest})=>rest;
        assert.deepEqual(stripped(next.items[id]),stripped(item));
      }
    }));
    const html=await exportPage(compact);
    assert.ok(html.includes('playback-hint'));
    assert.ok(html.includes('aria-keyshortcuts'));
    assert.ok(html.includes('prefers-reduced-motion'));
    assert.ok(!/<script[^>]+src=|<link[^>]+href=/.test(html));
  });
}

test('receiver-before-delivery and premature result still fail after compacting',async()=>{
  const source=JSON.parse(await readFile(new URL('../examples/expense-approval.json',import.meta.url),'utf8'));
  const spec=compactStory(source);
  const requires=spec.contract.rules.filter(rule=>rule.type==='requires');
  assert.ok(requires.length>=2,'Example must protect multiple receiver/result states');
  for(const rule of requires.slice(0,2)){
    const broken=structuredClone(spec),first=broken.scenes[0].frames[0];
    const original=broken.scenes.flatMap(s=>s.frames).find(f=>f.items[rule.actor])?.items[rule.actor];
    assert.ok(original);
    first.items[rule.actor]={...structuredClone(original),state:rule.states[0]};
    const report=auditScenes(resolveRelations(broken));
    assert.ok(report.errors.some(error=>error.message.includes('before required facts')));
  }
});

test('pointer presentation preserves anchors and rejects premature work',async()=>{
  const spec=JSON.parse(await readFile(new URL('../examples/pointer-approval.json',import.meta.url),'utf8'));
  validate(spec);
  assert.deepEqual(compactStory(spec),spec);
  assert.equal(checkPresentation(spec).warnings.length,0);
  const html=await exportPage(spec);
  assert.ok(html.includes('focus-ring')&&html.includes('data-processing'));
  const early=structuredClone(spec);
  early.scenes[0].frames[0].items.review.state='active';
  assert.throws(()=>validate(early),/before required facts/);
  const moving=structuredClone(spec);
  moving.scenes[0].frames[1].items.review.wide[1]+=1;
  assert.throws(()=>validate(moving),/Anchor review moves/);
});

test('new presentation fields reject bad references and values',async()=>{
  const spec=JSON.parse(await readFile(new URL('../examples/pointer-approval.json',import.meta.url),'utf8'));
  for(const mutate of [
    s=>s.presentation.navigation='tabs',
    s=>s.scenes[0].frames[0].focus=['unknown'],
    s=>s.scenes[0].frames[0].processing=['review','review'],
    s=>s.relations[0].style.pattern='random',
    s=>s.scenes[0].frames[1].links[0].motion='fly',
    s=>s.scenes[0].frames[0].items.request.opacity=2
  ]){
    const invalid=structuredClone(spec);mutate(invalid);assert.throws(()=>validate(invalid));
  }
  const empty={contains:[],wide:[0,0,.8,200],narrow:[0,0,.8,200],lines:[]};
  assert.deepEqual(fitNodeSize(empty,{label:'Group'},500,false),{width:500,height:200});
});

test('conditional prerequisites apply again in a subsequent round',async()=>{
  const spec=JSON.parse(await readFile(new URL('../examples/pointer-approval.json',import.meta.url),'utf8'));
  spec.contract.facts.push(
    {id:'later-ready',description:'Next round starts',source:'assumption',origin:'external',after:['received']},
    {id:'later-received',description:'Next application arrives',source:'assumption',origin:'external',after:['later-ready']}
  );
  spec.contract.rules.push({id:'later-arrival',type:'requires',actor:'review',states:['active'],facts:['later-received'],when:'later-ready'});
  const scene=structuredClone(spec.scenes[0]);
  for(const [i,frame] of scene.frames.entries()){
    frame.facts=['ready','received','later-ready',...i?['later-received']:[]];
    frame.items.review.state=i?'active':'normal';
  }
  spec.scenes.push(scene);validate(spec);
  const early=structuredClone(spec);
  early.scenes[1].frames[0].items.review.state='active';
  assert.throws(()=>validate(early),/later-arrival/);
  const unknown=structuredClone(spec);
  unknown.contract.rules.at(-1).when='unknown';
  assert.throws(()=>validate(unknown),/Unknown conditional rule fact/);
});
