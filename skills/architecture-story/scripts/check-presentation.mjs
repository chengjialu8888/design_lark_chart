#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validate} from '../runtime/story.mjs';

/** Heuristics for reading rhythm, not a certificate of visual quality. */
export function checkPresentation(spec){
  validate(spec);
  const warnings=[],scenes=[];
  if(spec.version!==2)return {scenes,warnings};
  for(const [i,scene] of spec.scenes.entries()){
    const beats=[];
    for(const frame of scene.frames){
      if(beats.at(-1)?.caption===frame.caption)continue;
      beats.push({at:frame.at,caption:frame.caption});
    }
    const firstFlow=scene.frames.find(f=>f.links.some(l=>l.state==='flow'))?.at;
    if(firstFlow!==undefined&&firstFlow>3000)warnings.push({scene:i,message:'First transfer starts after 3s'});
    for(const [j,beat] of beats.entries()){
      const hold=(beats[j+1]?.at??scene.duration)-beat.at;
      const minimum=Math.max(1800,[...beat.caption].length*65);
      if(hold<minimum)warnings.push({scene:i,at:beat.at,message:`Caption has ${hold}ms; suggest at least ${minimum}ms`});
    }
    if(beats.length>Math.ceil(scene.duration/2500))warnings.push({scene:i,message:'Frequent caption changes compete with causal actions'});
    const last=scene.frames.at(-1);
    if(scene.duration-last.at<2500)warnings.push({scene:i,message:'Final state has less than 2.5s reading hold'});
    if(!scene.frames.some(f=>f.focus?.length))warnings.push({scene:i,message:'No explicit focus; inspect background hierarchy'});
    scenes.push({scene:i,duration:scene.duration,frames:scene.frames.length,readingBeats:beats.length,firstTransfer:firstFlow??null,finalHold:scene.duration-last.at});
  }
  return {scenes,warnings};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [input,...extra]=process.argv.slice(2);
  if(!input||extra.length)throw Error('Usage: node check-presentation.mjs <story.json>');
  console.log(JSON.stringify(checkPresentation(JSON.parse(await readFile(input,'utf8'))),null,2));
}
