#!/usr/bin/env node
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legendEntries} from '../runtime/scene-visuals.mjs';
import {resolveStyle} from '../runtime/styles.mjs';
import {styleExample} from './generate-style-gallery.mjs';
import {validate,exportPage} from '../runtime/story.mjs';

test('compact retains role icons, preserves explicit hiding and keeps legacy unstyled',()=>{
 const source=styleExample();
 const resolved=resolveStyle(source);
 assert.notEqual(resolved.actors.find(a=>a.id==='worker').visual.avatar,'none');
 source.actors.find(a=>a.id==='worker').visual={variant:'plain',avatar:'none'};
 assert.equal(resolveStyle(source).actors.find(a=>a.id==='worker').visual.avatar,'none');
 delete source.presentation.style;
 assert.equal(resolveStyle(source),source);
});
test('legend is deduplicated by actual label and swatch, with no invented statuses',()=>{
 const link={kind:'return',legend:'失败返回',style:{pattern:'dashed',tone:'warning',arrow:true,head:'filled'}};
 assert.deepEqual(legendEntries([link,link]),[{label:'失败返回',pattern:'dashed',tone:'warning',arrow:true,head:'filled'}]);
 assert.equal(legendEntries([]).length,0);
 assert.equal(legendEntries([link,{...link,style:{...link.style,pattern:'dotted'}}]).length,2);
 assert.equal(legendEntries([{kind:'ownership',style:{arrow:false}}])[0].arrow,false);
});
test('icons, outlines, heads and live legends export offline and reject malformed choices',async()=>{
 const source=styleExample();
 source.actors[0].visual={variant:'plain',icon:'gateway',outline:'dashed'};
 source.relations[0].style.head='filled';source.relations[0].legend='入口调用';
 validate(source);
 const html=await exportPage(source);
 assert.ok(html.includes('function legendEntries')&&html.includes('"head":"filled"')&&html.includes('"gateway"'));
 assert.ok(!/__STORY_[A-Z_]+__/.test(html));
 for(const alter of [
   s=>s.actors[0].visual.icon='remote-url',
   s=>s.actors[0].visual.outline='thick',
   s=>s.relations[0].style.head='unverified-success',
   s=>s.presentation.legend='invented',
   s=>s.relations[0].legend=''
 ]){const s=structuredClone(source);alter(s);assert.throws(()=>validate(s));}
});
test('visual richness never weakens causal delivery checks',()=>{
 const source=styleExample();source.actors[0].visual={variant:'plain',icon:'gateway'};
 source.relations[0].style.head='filled';source.relations[0].legend='入口调用';
 source.scenes[0].frames[1].facts.push('received');
 assert.throws(()=>validate(source),/before its transfer completes/);
});
