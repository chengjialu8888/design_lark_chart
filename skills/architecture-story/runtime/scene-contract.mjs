import {routePoints,segmentHitsBox,canvasGeometry} from './scene-geometry.mjs';

const fail=message=>{throw new Error(message);};
const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.trim();
const id=x=>text(x)&&/^[a-z][a-z0-9-]*$/.test(x);
const list=(x,name)=>{if(!Array.isArray(x)||x.some(v=>!id(v))||new Set(x).size!==x.length)fail(`${name}: expected unique ids`);return x;};
const keys=(x,allowed,name)=>{if(!record(x)||Object.keys(x).some(k=>!allowed.includes(k)))fail(`${name}: unknown or invalid field`);};
const style=value=>{
  if(value===undefined)return;
  keys(value,['pattern','tone','arrow','head'],'relation.style');
  if(value.pattern!==undefined&&!['solid','dashed','dotted'].includes(value.pattern)||
    value.tone!==undefined&&!['neutral','accent','success','warning'].includes(value.tone)||
    value.arrow!==undefined&&typeof value.arrow!=='boolean'||
    value.head!==undefined&&!['open','filled','diamond'].includes(value.head))fail('Invalid relation style');
};

/** Expand canonical relations once, leaving legacy v2 direct links compatible. */
export function resolveRelations(spec) {
  if(spec.relations===undefined)return spec;
  if(!Array.isArray(spec.relations))fail('relations must be an array');
  const relations=new Map();
  for(const r of spec.relations){
    keys(r,['id','from','to','kind','label','requires','produces','wideRoute','narrowRoute','style','legend'],'relation');
    if(!id(r.id)||relations.has(r.id)||!id(r.from)||!id(r.to)||r.from===r.to||!text(r.label)||!['message','call','return','ownership','dependency'].includes(r.kind))fail('Invalid or duplicate relation');
    style(r.style);
    if(r.legend!==undefined&&(!text(r.legend)||[...r.legend].length>16))fail('Invalid relation legend');
    for(const k of ['requires','produces'])if(r[k]!==undefined)list(r[k],`relation.${k}`);
    relations.set(r.id,r);
  }
  return {...spec,scenes:spec.scenes.map(s=>({...s,frames:s.frames.map(f=>({...f,links:f.links.map(l=>{
    keys(l,['relation','state','travel','motion','packet','transfer','label'],'frame link');
    if(!relations.has(l.relation))fail(`Unknown relation: ${l.relation}`);
    if(l.label!==undefined&&typeof l.label!=='string')fail('Invalid frame link label');
    return {...relations.get(l.relation),state:l.state??'idle',...Object.fromEntries(['travel','motion','packet','transfer','label'].filter(k=>l[k]!==undefined).map(k=>[k,l[k]]))};
  })}))}))};
}

/** Validate declared causal rules, never claim that authored evidence is true. */
export function auditScenes(spec) {
  const errors=[],warnings=[];const error=(where,message)=>errors.push({where,message});
  const actors=new Set(spec.actors.map(a=>a.id)),contract=spec.contract;
  const facts=new Map(),sources=new Set();
  if(!contract)warnings.push({where:'contract',message:'No evidence/causal contract; only structural checks apply.'});
  else {
    if(!Array.isArray(spec.relations))fail('A semantic contract requires canonical relations');
    keys(contract,['sources','facts','rules'],'contract');
    if(!Array.isArray(contract.sources)||!Array.isArray(contract.facts)||!Array.isArray(contract.rules))fail('contract arrays required');
    if(!contract.facts.length||!contract.rules.length)warnings.push({where:'contract',message:'Declare facts and rules for a meaningful semantic audit.'});
    for(const source of contract.sources){
      keys(source,['id','reference','scope'],'source');
      if(!id(source.id)||sources.has(source.id)||!text(source.reference)||!text(source.scope))fail('Invalid source');sources.add(source.id);
    }
    if(!sources.size)warnings.push({where:'sources',message:'No source record; identify an explicit illustrative assumption or inspected source.'});
    for(const fact of contract.facts){
      keys(fact,['id','description','source','origin','after'],'fact');
      if(!id(fact.id)||facts.has(fact.id)||!text(fact.description)||!sources.has(fact.source)||!['external','flow'].includes(fact.origin))fail('Invalid fact/source');
      list(fact.after||[],`fact ${fact.id}.after`);facts.set(fact.id,fact);
    }
    for(const fact of facts.values())for(const parent of fact.after||[])if(!facts.has(parent)||parent===fact.id)fail('Unknown/self fact dependency');
    const visiting=new Set(),visited=new Set();
    const visit=id=>{if(visiting.has(id))fail('Cyclic fact dependency');if(visited.has(id))return;visiting.add(id);for(const p of facts.get(id).after||[])visit(p);visiting.delete(id);visited.add(id);};
    for(const id of facts.keys())visit(id);
    const ruleIds=new Set();
    for(const r of contract.rules){
      if(!id(r.id)||ruleIds.has(r.id))fail('Invalid rule id');ruleIds.add(r.id);
      if(r.type==='requires'){
        keys(r,['id','type','actor','states','facts','when'],'requires rule');
        if(r.when!==undefined&&!facts.has(r.when))fail('Unknown conditional rule fact');
        if(!actors.has(r.actor)||!Array.isArray(r.states)||!r.states.length||r.states.some(s=>!['active','done'].includes(s)))fail('Invalid requires rule');
        for(const f of list(r.facts,`rule ${r.id}`))if(!facts.has(f))fail('Unknown required fact');
      }else if(r.type==='independent'){
        keys(r,['id','type','actors'],'independent rule');
        if(list(r.actors,`rule ${r.id}`).length<2||r.actors.some(a=>!actors.has(a)))fail('Invalid independent actors');
      }else fail(`Unknown rule type: ${r.type}`);
    }
  }
  for(const r of spec.relations||[]){
    if(!actors.has(r.from)||!actors.has(r.to))fail('Unknown relation actor');
    for(const f of [...r.requires||[],...r.produces||[]])if(!facts.has(f))fail(`Unknown relation fact: ${f}`);
    for(const f of r.produces||[])if(facts.get(f).origin!=='flow')fail('Only flow facts may be produced by relations');
  }
  let previous=new Set(),available=new Map(),offset=0;
  for(const [si,scene] of spec.scenes.entries()){
    if(scene.resetFacts!==undefined&&typeof scene.resetFacts!=='boolean')fail('resetFacts must be boolean');
    if(scene.resetFacts){if(!text(scene.branchReason))fail('Alternative scene requires branchReason');previous=new Set();available=new Map();}
    for(const [fi,frame] of scene.frames.entries()){
      if(frame.resetFacts){if(!text(frame.branchReason))fail('Alternative frame requires branchReason');previous=new Set();available=new Map();}
      const where=`scenes[${si}].frames[${fi}]`,now=offset+frame.at,span=(scene.frames[fi+1]?.at??scene.duration)-frame.at;
      const current=new Set(contract?list(frame.facts,`${where}.facts`):[]);
      for(const f of current){
        if(!facts.has(f))fail(`Unknown frame fact: ${f}`);
        if(!previous.has(f)){
          if((facts.get(f).after||[]).some(p=>!previous.has(p)))error(where,`Fact ${f} appears before its prerequisite frame`);
          if(facts.get(f).origin==='flow'&&!(available.get(f)<=now))error(where,`Fact ${f} appears before its transfer completes`);
        }
      }
      for(const f of previous)if(!current.has(f))error(where,`Fact ${f} disappears without an explicit alternative branch`);
      const edgeIds=new Set();
      for(const link of frame.links){
        if(link.id&&edgeIds.has(link.id))error(where,`Duplicate relation ${link.id}`);edgeIds.add(link.id);
        if(link.state!==undefined&&!['idle','flow','waiting'].includes(link.state))fail('Invalid link state');
        if(link.travel!==undefined&&(link.state!=='flow'||!Number.isFinite(link.travel)||link.travel<100))fail('travel is only valid for a timed flow');
        if(link.motion!==undefined&&!['pointer','packet'].includes(link.motion))fail('Invalid motion');
        if(link.packet!==undefined&&!text(link.packet))fail('Invalid packet');
        if(link.transfer!==undefined){
          keys(link.transfer,['timing','easing','scope','effect'],'transfer');
          if(link.transfer.timing!==undefined&&!['continuous','segments'].includes(link.transfer.timing)||
            link.transfer.scope!==undefined&&!['centers','route'].includes(link.transfer.scope)||
            link.transfer.effect!==undefined&&!['classic','soft'].includes(link.transfer.effect)||
            link.transfer.easing!==undefined&&(!Array.isArray(link.transfer.easing)||link.transfer.easing.length!==4||link.transfer.easing.some(n=>!Number.isFinite(n)||n<0||n>1)))fail('Invalid transfer');
        }
        style(link.style);
        for(const name of ['wideRoute','narrowRoute'])if(link[name]){
          keys(link[name],['from','to','via','labelAt','labelOffset','stops'],name);
          if(link[name].stops!==undefined&&(!Array.isArray(link[name].stops)||link[name].stops.some((n,i,a)=>!Number.isInteger(n)||n<0||n>=(link[name].via?.length??0)||i>0&&n<=a[i-1])))fail('Invalid route stops');
          if(link[name].labelAt!==undefined&&(!Number.isFinite(link[name].labelAt)||link[name].labelAt<0||link[name].labelAt>1))fail('Invalid route labelAt');
          if(link[name].labelOffset!==undefined&&(!Array.isArray(link[name].labelOffset)||link[name].labelOffset.length!==2||!link[name].labelOffset.every(Number.isFinite)))fail('Invalid route labelOffset');
          for(const port of ['from','to'])if(link[name][port]!==undefined&&!['left','right','top','bottom'].includes(link[name][port]))fail('Invalid route port');
          if(link[name].via!==undefined&&(!Array.isArray(link[name].via)||link[name].via.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>1||p[1]<0||p[1]>(name==='wideRoute'?scene.height:scene.narrowHeight))))fail('Invalid route waypoint');
        }
        if(link.state==='flow'){
          const travel=link.travel??800;
          if(travel>span)error(where,`Transfer ${link.id||link.from} is cut off by the next frame`);
          if((link.requires||[]).some(f=>!current.has(f)))error(where,`Transfer ${link.id} starts before prerequisites`);
          for(const f of link.produces||[])available.set(f,Math.min(available.get(f)??Infinity,now+travel));
        }
      }
      for(const r of contract?.rules||[]){
        if(r.type==='requires'&&(!r.when||current.has(r.when))&&r.states.includes(frame.items[r.actor]?.state)&&(r.facts.some(f=>!current.has(f))))error(where,`${r.actor} is active/done before required facts (${r.id})`);
        if(r.type==='independent'&&frame.links.some(l=>r.actors.includes(l.from)&&r.actors.includes(l.to)))error(where,`Independent actors connected (${r.id})`);
      }
      for(const [actor,item] of Object.entries(frame.items))if(item.contains!==undefined){
        for(const child of list(item.contains,`${actor}.contains`)){
          if(child===actor||!frame.items[child]||frame.items[child].contains)fail('Containers require visible, non-container children');
          for(const view of ['wide','narrow']){const a=item[view],b=frame.items[child][view];if(b[0]<a[0]||b[1]<a[1]||b[0]+b[2]>a[0]+a[2]+.001||b[1]+b[3]>a[1]+a[3])error(where,`${child} escapes container ${actor} (${view})`);}
        }
      }
      if(contract||spec.relations)for(const [view,actualWidth] of [['wide',736],['narrow',320]]){
        const width=canvasGeometry(spec.presentation,scene,actualWidth).logicalWidth;
        const boxes=Object.fromEntries(Object.entries(frame.items).map(([id,p])=>[id,{x:p[view][0]*width,y:p[view][1],w:p[view][2]*width,h:p[view][3]}]));
        const visualBoxes=Object.fromEntries(Object.entries(boxes).map(([id,b])=>{
          const v=spec.actors.find(a=>a.id===id).visual;
          const badge=frame.items[id].visual?.badge;
          if(badge)b={...b,y:b.y-8,h:b.h+8};
          if(v?.variant!=='chat'||v.avatar==='none')return [id,b];
          const right=v.side==='right';return [id,{...b,x:b.x-(right?0:31),w:b.w+31}];
        }));
        for(const [id,b] of Object.entries(visualBoxes)){
          if(b.y<0||b.y+b.h>(view==='wide'?scene.height:scene.narrowHeight)+1)error(where,`Visual of ${id} escapes stage (${view})`);
          if(b.x<0||b.x+b.w>width+1)error(where,`Avatar of ${id} escapes stage (${view})`);
          for(const [container,item] of Object.entries(frame.items))if(item.contains?.includes(id)){
            const c=boxes[container];
            if(b.x<c.x||b.x+b.w>c.x+c.w+1)error(where,`Avatar of ${id} escapes container ${container} (${view})`);
            if(b.y<c.y||b.y+b.h>c.y+c.h+1)error(where,`Visual of ${id} escapes container ${container} (${view})`);
          }
        }
        const ids=Object.keys(boxes);
        for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
          const a=visualBoxes[ids[i]],b=visualBoxes[ids[j]];
          if(frame.items[ids[i]].contains?.includes(ids[j])||frame.items[ids[j]].contains?.includes(ids[i]))continue;
          if(a.x<b.x+b.w-1&&a.x+a.w>b.x+1&&a.y<b.y+b.h-1&&a.y+a.h>b.y+1)error(where,`Overlapping actors ${ids[i]}/${ids[j]} (${view})`);
        }
        for(const link of frame.links){
          const points=routePoints(link,boxes,width,view==='narrow');
          for(const [id,box] of Object.entries(visualBoxes)){
            if([link.from,link.to].includes(id)||frame.items[id].contains)continue;
            if(points.slice(1).some((p,i)=>segmentHitsBox(points[i],p,box)))error(where,`Link ${link.id||link.from} crosses ${id} (${view}); reserve a route lane`);
          }
        }
      }
      previous=current;
    }
    for(const actor of scene.anchors||[])for(const frame of scene.frames){
      const original=scene.frames[0].items[actor],item=frame.items[actor];
      if(!original||!item||['wide','narrow'].some(view=>JSON.stringify(original[view])!==JSON.stringify(item[view])))error(`scenes[${si}]`,`Anchor ${actor} moves or disappears`);
    }
    offset+=scene.duration;
  }
  return {errors,warnings,scope:'Checks authored constraints and geometry, not source truth or browser text fitting.'};
}
