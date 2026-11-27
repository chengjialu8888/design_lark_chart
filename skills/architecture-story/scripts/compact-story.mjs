#!/usr/bin/env node
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validate} from '../runtime/story.mjs';
import {fitNodeSize} from '../runtime/scene-geometry.mjs';

// Rewrite existing poses, never facts, transfer timing or actor identity.
// Size estimates are conservative; browser text-fitting verification is still required.
export function compactStory(source) {
  if(source.version !== 2) throw new Error('Compact layout requires scene schema v2');
  const spec=structuredClone(source);
  const actorById=new Map(spec.actors.map(actor=>[actor.id,actor]));
  for(const scene of spec.scenes) {
    // Stable scenes and named anchors share authored coordinates across frames.
    // Resizing each snapshot independently would destroy their identity.
    if(scene.layout==='stable'||scene.anchors?.length)continue;
    // Explicit return/loop lanes are authored geometry. Keep their coordinate
    // system and only reduce node surfaces, rather than compressing a lane
    // into an actor that needs a minimum readable height.
    const routed=scene.frames.some(frame=>frame.links.some(link=>{
      const relation=spec.relations?.find(r=>r.id===link.relation);
      return ['wideRoute','narrowRoute'].some(key=>(link[key]||relation?.[key])?.via?.length);
    }));
    const scale=routed?1:.48;
    const bounds={wide:240,narrow:240};
    for(const frame of scene.frames) {
      for(const variant of ['wide','narrow']) {
        const width=variant==='wide'?688:296;
        const entries=Object.entries(frame.items), original=new Map(entries.map(([id,item])=>[id,[...item[variant]]]));
        for(const [id,item] of entries) {
          const [x,y,w,h]=original.get(id);
          if(Array.isArray(item.contains)){item[variant]=[x,y*scale,w,44];continue;}
          const fitted=fitNodeSize(item,actorById.get(id),w*width,variant==='narrow');
          item[variant]=[x+(w-fitted.width/width)/2,y*scale,fitted.width/width,fitted.height];
        }
        // Preserve vertical ordering of independent actors. Children are handled
        // by their container, not incorrectly separated from their own parent.
        for(let pass=0;pass<entries.length+2;pass++) {
          let changed=false;
          for(const [aId,a] of entries) for(const [bId,b] of entries) {
            if(aId===bId||a.contains?.includes(bId)||b.contains?.includes(aId))continue;
            const ao=original.get(aId),bo=original.get(bId),ap=a[variant],bp=b[variant];
            if(ao[1]+ao[3]<=bo[1]&&ap[0]<bp[0]+bp[2]&&bp[0]<ap[0]+ap[2]) {
              const next=ap[1]+ap[3]+48;
              if(bp[1]<next){bp[1]=next;changed=true;}
            }
          }
          for(const [,item] of entries) {
            if(!item.contains?.length)continue;
            const box=item[variant],children=item.contains.map(id=>frame.items[id]?.[variant]).filter(Boolean);
            // Preserve a title lane in expanded groups.
            for(const child of children)if(child[1]<box[1]+40){child[1]=box[1]+40;changed=true;}
            const required=Math.max(...children.map(p=>p[1]+p[3]))-box[1]+12;
            if(box[3]<required){box[3]=required;changed=true;}
          }
          if(!changed)break;
        }
        const controlLane=variant==='narrow'?72:52;
        for(const [,item] of entries)bounds[variant]=Math.max(bounds[variant],Math.ceil(item[variant][1]+item[variant][3]+controlLane));
        // Explicit route lanes use the same vertical coordinate system.
        for(const link of frame.links) {
          const route=link[variant+'Route'];
          if(route?.via)route.via=route.via.map(([x,y])=>[x,y*scale]);
        }
      }
    }
    for(const frame of scene.frames)for(const link of frame.links)for(const variant of ['wide','narrow']){
      const route=link[variant+'Route']||spec.relations?.find(r=>r.id===link.relation)?.[variant+'Route'];
      for(const [,y] of route?.via||[])bounds[variant]=Math.max(bounds[variant],Math.ceil(y+20));
    }
    scene.height=bounds.wide;scene.narrowHeight=bounds.narrow;
    // Center each composition in its available canvas. Preserve explicitly
    // authored return/loop lanes, which share the original coordinate system.
    if(!routed)for(const frame of scene.frames)for(const variant of ['wide','narrow']){
      const poses=Object.values(frame.items).map(item=>item[variant]);
      const left=Math.min(...poses.map(p=>p[0])),right=Math.max(...poses.map(p=>p[0]+p[2]));
      const top=Math.min(...poses.map(p=>p[1])),bottom=Math.max(...poses.map(p=>p[1]+p[3]));
      const dx=(1-left-right)/2,available=bounds[variant]-(variant==='narrow'?72:52);
      const dy=Math.max(12,(available-bottom+top)/2)-top;
      for(const pose of poses){pose[0]+=dx;pose[1]+=dy;}
    }
  }
  validate(spec);
  return spec;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [input,output,...extra]=process.argv.slice(2);
  if(!input||!output||extra.length)throw new Error('Usage: node compact-story.mjs <source.json> <new-output.json>');
  const spec=compactStory(JSON.parse(await readFile(input,'utf8')));
  await writeFile(output,JSON.stringify(spec,null,2)+'\n',{flag:'wx'});
  console.log(`Compacted ${spec.scenes.length} scenes into ${output}`);
}
