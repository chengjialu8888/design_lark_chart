#!/usr/bin/env node
import {readFile,writeFile,stat} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {exportPage,compile,validate} from '../runtime/story.mjs';
import {newStory,stylePresets} from '../runtime/styles.mjs';

/** Same declared facts, three authored layouts. No domain-specific player code. */
export function styleExample(style='compact'){
  const roomy=style==='module',sequence=style==='sequence';
  const s={version:2,id:`style-${style}`,title:stylePresets[style]?.label||style,
    notice:'说明性示例：请求读取记录并生成结果，不代表真实业务系统。',
    presentation:{style},playback:{mode:'interactive',controls:'minimal',autoplay:false,end:'replay',selector:false},
    actors:[['client','Client','service'],['runtime','Runtime','group'],['worker','Worker','service'],['record','Record Store','document'],['result','Result','document']].map(([id,label,kind])=>({id,label,kind,
      visual:{variant:roomy?'module':'plain',icon:({client:'gateway',runtime:'pipeline',worker:'process',record:'database',result:'package'})[id]}})),
    contract:{sources:[{id:'assumption',reference:'Explicit illustrative assumption',scope:'A worker reads a record, then creates and owns a result after receiving the return.'}],
      facts:[{id:'ready',description:'Client has a request',source:'assumption',origin:'external',after:[]},
        ...['received','read','returned','created'].map((id,i)=>({id,description:id,source:'assumption',origin:'flow',after:[['ready','received','read','returned'][i]]}))],
      rules:[{id:'result-after-return',type:'requires',actor:'result',states:['active','done'],facts:['returned','created']}]},
    relations:[],scenes:[]};
  const wp=sequence?{
    client:[.025,70,.21,110],runtime:[.28,35,.42,320],worker:[.35,70,.28,110],result:[.35,230,.28,90],record:[.745,70,.23,110]
  }:{
    client:[.025,170,.21,110],runtime:[.28,35,.42,355],worker:[.35,90,.28,roomy?110:80],result:[.35,260,.28,90],record:[.745,170,.23,110]
  };
  const np=sequence?{
    client:[.08,30,.36,100],record:[.56,30,.36,100],runtime:[.12,180,.76,415],worker:[.24,230,.52,110],result:[.24,445,.52,95]
  }:{
    client:[.20,25,.60,100],runtime:[.12,165,.76,390],worker:[.24,210,.52,110],result:[.24,410,.52,95],record:[.20,630,.60,110]
  };
  const items=Object.fromEntries(s.actors.map(a=>[a.id,{wide:wp[a.id],narrow:np[a.id],lines:({client:['request'],worker:['read → assemble'],result:['not created'],record:['record data'],runtime:[]})[a.id],state:'normal',...(a.id==='runtime'?{contains:['worker','result']}:{})}]));
  const scene={label:'读取与结果',detail:'相同事实，不同构图',height:460,narrowHeight:800,duration:25700,layout:'stable',anchors:s.actors.map(a=>a.id),frames:[]};
  s.scenes.push(scene);
  let facts=['ready'],time=0;
  const frame=(caption,links=[],focus=[])=>scene.frames.push({at:time,caption,items:structuredClone(items),facts:[...facts],links,focus});
  frame('请求交给 Worker，读取返回后才生成结果。');
  const pairs=[['client','worker','request','received'],['worker','record','read','read'],['record','worker','return','returned'],['worker','result','create','created']];
  for(const [i,[from,to,label,produce]] of pairs.entries()){
    const id=`flow-${i}`,kind=i===2?'return':i===3?'ownership':'call',travel=i===2?2000:1700;
    let wideRoute,narrowRoute;
    if(i<3){
      if(sequence){
        wideRoute=i===0?{from:'right',to:'left'}:i===1?{from:'right',to:'left'}:{from:'bottom',to:'bottom',via:[[.86,200],[.49,200]]};
        narrowRoute=i===0?{from:'bottom',to:'top',via:[[.26,155],[.50,155]]}:i===1?{from:'right',to:'bottom',via:[[.96,285],[.96,155],[.74,155]]}:{from:'bottom',to:'left',via:[[.74,155],[.06,155],[.06,285]]};
      }else {
        wideRoute=i===0?{from:'right',to:'left',via:[[.25,225],[.25,roomy?145:130]]}:i===1?{from:'right',to:'left',via:[[.72,roomy?145:130],[.72,225]]}:{from:'top',to:'top',via:[[.86,15],[.49,15]]};
        narrowRoute=i===0?{from:'bottom',to:'top'}:i===1?{from:'right',to:'right',via:[[.94,265],[.94,685]]}:{from:'left',to:'left',via:[[.06,685],[.06,265]]};
      }
    }else {wideRoute={from:'bottom',to:'top'};narrowRoute={from:'bottom',to:'top'};}
    s.relations.push({id,from,to,label,kind,requires:[facts.at(-1)],produces:[produce],wideRoute,narrowRoute,style:{pattern:i===2?'dashed':i===3?'dotted':'solid',tone:'accent',arrow:true,head:i===3?'diamond':'open'}});
    time+=500;frame(i<3?'请求与读取返回保留各自方向，未返回时不生成结果。':'返回已确认，Worker 才创建结果。',[{relation:id,state:'flow',travel,transfer:{timing:'continuous',scope:'route',effect:'soft',easing:[.35,0,.65,1]},label:''}],[from,to]);
    time+=travel+700;facts.push(produce);
    if(i===3){items.result.lines=['created after return'];items.result.state='done';}
    frame(scene.frames.at(-1).caption,[{relation:id,state:'idle',label:''}],[to]);time+=3000;
  }
  frame('四种事实顺序保持一致：请求接收、读取、返回、结果。风格改变节点和路径组织，不能改变确认含义。');
  scene.duration=time+4500;
  return newStory(s,style);
}

export async function generateGallery(directory){
  if(!(await stat(directory)).isDirectory())throw Error('Output directory must already exist');
  const version=JSON.parse(await readFile(new URL('../runtime/package.json',import.meta.url),'utf8')).version;
  let content='';
  const examples={};
  for(const [style,preset] of Object.entries(stylePresets)){
    const spec=styleExample(style);validate(spec);
    examples[style]=spec;
    await writeFile(new URL(`style-${style}.json`,pathToFileURL(`${directory}/`)),JSON.stringify(spec,null,2),{flag:'wx'});
    await writeFile(new URL(`style-${style}.html`,pathToFileURL(`${directory}/`)),await exportPage(spec),{flag:'wx'});
    content+=`<section id="${style}" data-example ${style==='compact'?'':'hidden'}><p>${preset.label} · ${style}</p>${await compile(spec)}</section>`;
  }
  const css=await readFile(new URL('../runtime/standalone.css',import.meta.url),'utf8');
  const script=await readFile(new URL('./style-gallery.js',import.meta.url),'utf8');
  const safeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  const final=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Architecture Story · 风格选择</title><style>${css}body{background:#fff}main{max-width:800px;margin:auto;padding:24px}nav,.choice-actions{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}nav button,.choice-actions button,.choice-actions a,#adopt-style{font:inherit;font-size:12px;border:0;border-radius:20px;min-height:44px;padding:12px 16px;background:#f0f3f8;color:#526078;cursor:pointer;text-decoration:none}nav button[aria-pressed=true],#adopt-style{background:#4f7cff;color:#fff}[hidden]{display:none!important}h1{font-size:20px;font-weight:400}p,label{font-size:12px;color:#61718a;line-height:1.8}button:focus-visible,a:focus-visible,textarea:focus-visible{outline:2px solid #4f7cff;outline-offset:3px}#adoption{margin-top:16px}textarea{display:block;width:100%;box-sizing:border-box;min-height:110px;resize:vertical;border:1px solid #dce2ec;border-radius:10px;padding:12px;font:inherit;font-size:13px;line-height:1.8;color:#354158;background:#f8faff}#choice-status{min-height:22px}main>section{margin-top:16px}</style><main><h1>三种构图，同一条事实链</h1><p>切换风格，点击图中播放按钮预览。点“采用此风格”，即可复制选用指令或下载示例。</p><nav aria-label="风格">${Object.entries(stylePresets).map(([id,p])=>`<button data-style="${id}" aria-pressed="${id==='compact'}">${p.label}</button>`).join('')}</nav><button id="adopt-style">采用此风格</button><div id="adoption" hidden><label for="style-request">复制到会话，按此风格绘图</label><textarea id="style-request" readonly></textarea><div class="choice-actions"><button id="copy-request">复制指令</button><a id="download-template">下载示例 JSON</a></div><p>示例展示构图方式，实际绘图会按你的需求替换内容。</p></div><p id="choice-status" role="status" aria-live="polite"></p>${content}</main><script type="application/json" id="style-examples">${safeJSON(examples)}</script><script type="application/json" id="style-labels">${safeJSON(Object.fromEntries(Object.entries(stylePresets).map(([id,p])=>[id,p.label])))}</script><script>${script}</script></html>`;
  await writeFile(new URL(`architecture-story-styles-${version}.html`,pathToFileURL(`${directory}/`)),final,{flag:'wx'});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===realpathSync(process.argv[1])){
  if(process.argv.length!==3)throw Error('Usage: node generate-style-gallery.mjs <existing-output-directory>');
  await generateGallery(process.argv[2]);
}
