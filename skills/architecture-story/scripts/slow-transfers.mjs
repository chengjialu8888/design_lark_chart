#!/usr/bin/env node
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validate} from '../runtime/story.mjs';

/** Stretch only transfer beats; retain facts, snapshots and final reading holds. */
export function slowTransfers(source,{factor=1.9,returnFactor=2.5,settle=700}={}){
  if(!Number.isFinite(factor)||factor<1||factor>5||!Number.isFinite(returnFactor)||returnFactor<1||returnFactor>5||!Number.isFinite(settle)||settle<650||settle>2000)throw Error('Invalid slow-transfer options');
  validate(source);
  if(source.version!==2||!source.relations)throw Error('Slow transfers require canonical scene relations');
  const spec=structuredClone(source),relations=new Map(spec.relations.map(r=>[r.id,r]));
  for(const scene of spec.scenes){
    const original=scene.frames.map(f=>f.at);let shift=0;
    for(const [i,frame] of scene.frames.entries()){
      frame.at=original[i]+shift;
      const flows=frame.links.filter(l=>l.state==='flow');
      if(!flows.length)continue;
      for(const link of flows){
        link.travel=Math.round((link.travel??800)*(relations.get(link.relation).kind==='return'?returnFactor:factor));
        link.transfer={timing:'continuous',scope:'route',effect:'soft',easing:[.35,0,.65,1]};
      }
      const span=(original[i+1]??scene.duration)-original[i],required=Math.max(...flows.map(l=>l.travel))+settle;
      shift+=Math.max(0,required-span);
    }
    scene.duration+=shift;
  }
  validate(spec);return spec;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(await realpath(process.argv[1])).href){
  const [input,output,...extra]=process.argv.slice(2);
  if(!input||!output||extra.length)throw Error('Usage: node slow-transfers.mjs source.json new-story.json');
  await writeFile(output,JSON.stringify(slowTransfers(JSON.parse(await readFile(input,'utf8'))),null,2)+'\n',{flag:'wx'});
  console.log(`Retimed ${output}`);
}
