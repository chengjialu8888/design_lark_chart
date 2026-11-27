#!/usr/bin/env node
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {resolveStyle,newStory,stylePresets,styleId} from '../runtime/styles.mjs';
import {validate,exportPage} from '../runtime/story.mjs';
import {resolveRelations} from '../runtime/scene-contract.mjs';
import {fitNodeSize} from '../runtime/scene-geometry.mjs';
import {styleExample} from './generate-style-gallery.mjs';

test('new stories select compact; unstyled legacy inputs remain byte-equivalent',async()=>{
  const legacy=JSON.parse(await readFile(new URL('../examples/expense-approval.json',import.meta.url),'utf8'));
  assert.equal(resolveStyle(legacy),legacy);
  const next=newStory(legacy);
  assert.equal(next.presentation.style,'compact');
  assert.equal(resolveStyle(next).actors[0].visual.variant,'plain');
  assert.equal(resolveStyle(next,'module').actors[0].visual.variant,'module');
  assert.deepEqual(next.contract,legacy.contract);
  assert.ok((await exportPage(legacy)).includes('"actors"'));
});
test('preset resolution is idempotent and explicit values win',()=>{
  const s=styleExample();
  s.presentation.canvas={wideWidth:800};
  s.actors[0].visual={variant:'module'};
  const r=resolveStyle(s);
  assert.equal(r.presentation.canvas.wideWidth,800);
  assert.equal(r.actors[0].visual.variant,'module');
  assert.deepEqual(resolveStyle(r),r);
  assert.throws(()=>resolveStyle(s,'unknown'),/Unknown presentation style/);
  s.presentation.canvas=null;
  assert.throws(()=>resolveStyle(s),/Invalid canvas/);
});
test('Chinese labels select canonical IDs and revisions preserve an existing choice',()=>{
  for(const [id,preset] of Object.entries(stylePresets)){
    assert.equal(styleId(preset.label),id);
    const s=styleExample(id);
    assert.equal(newStory(s).presentation.style,id);
    assert.equal(newStory(s,preset.label).presentation.style,id);
    assert.equal(resolveStyle({...s,presentation:{style:preset.label}}).presentation.style,id);
  }
  assert.throws(()=>styleId('其他风格'),/Unknown presentation style/);
});
test('select CLI persists each choice without modifying source, facts, poses or overrides',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'architecture-style-selection-'));
  const cli=fileURLToPath(new URL('../runtime/story.mjs',import.meta.url));
  const source=styleExample('compact');
  const text=JSON.stringify(source,null,2);
  const input=join(directory,'source.json');
  try{
    await writeFile(input,text);
    for(const [id,preset] of Object.entries(stylePresets)){
      const output=join(directory,id+'.json');
      execFileSync(process.execPath,[cli,'select',input,output,'--style',preset.label]);
      const saved=JSON.parse(await readFile(output,'utf8'));
      assert.deepEqual(saved,{...source,presentation:{...source.presentation,style:id}});
      assert.equal(await readFile(input,'utf8'),text);
      const html=join(directory,id+'.html');
      execFileSync(process.execPath,[cli,'export',output,html]);
      assert.ok((await readFile(html,'utf8')).includes(`"style":"${id}"`));
      assert.throws(()=>execFileSync(process.execPath,[cli,'select',input,output,'--style',id],{stdio:'pipe'}),/EEXIST/);
    }
    const invalid=join(directory,'invalid.json');
    assert.throws(()=>execFileSync(process.execPath,[cli,'select',input,invalid,'--style','unknown'],{stdio:'pipe'}),/Unknown presentation style/);
    assert.throws(()=>execFileSync(process.execPath,[cli,'select',input,invalid],{stdio:'pipe'}),/Usage/);
    await writeFile(join(directory,'v1.json'),JSON.stringify({version:1}));
    assert.throws(()=>execFileSync(process.execPath,[cli,'select',join(directory,'v1.json'),invalid,'--style','module'],{stdio:'pipe'}),/schema v2/);
  }finally{await rm(directory,{recursive:true,force:true});}
});
test('three independently authored layouts preserve identical business contracts and flow facts',async()=>{
  const examples=['compact','module','sequence'].map(styleExample);
  for(const spec of examples){validate(spec);assert.deepEqual(spec.contract,examples[0].contract);assert.ok((await exportPage(spec)).includes(`"style":"${spec.presentation.style}"`));}
  const strip=r=>({from:r.from,to:r.to,kind:r.kind,requires:r.requires,produces:r.produces});
  for(const spec of examples)assert.deepEqual(spec.relations.map(strip),examples[0].relations.map(strip));
  const resolved=resolveStyle(examples[0]),actor=resolved.actors.find(a=>a.id==='worker');
  assert.ok(fitNodeSize(resolved.scenes[0].frames[0].items.worker,actor,200,false,'compact').height<80);
});
test('long persistent scenes allow a genuine explicit alternate run and still reject causal counterexamples',()=>{
  const s=styleExample();
  s.scenes[0].duration=65000;
  const alternative=structuredClone(s.scenes[0].frames[0]);
  alternative.at=40000;alternative.resetFacts=true;alternative.branchReason='Independent alternate request; replace the previous run';
  s.scenes[0].frames.push(alternative);validate(s);
  const missingReason=structuredClone(s);delete missingReason.scenes[0].frames.at(-1).branchReason;
  assert.throws(()=>validate(missingReason),/Alternative frame requires/);
  const premature=structuredClone(s);
  premature.scenes[0].frames[1].facts.push('received');
  assert.throws(()=>validate(premature),/before its transfer completes/);
  const omittedReset=structuredClone(s);delete omittedReset.scenes[0].frames.at(-1).resetFacts;
  assert.throws(()=>validate(omittedReset),/disappears/);
  assert.equal(resolveRelations(s).scenes[0].frames.at(-1).resetFacts,true);
});
