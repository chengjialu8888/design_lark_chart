/** Geometry is shared by offline checks and the player; no domain-specific routes. */
export function fitNodeSize(item, actor, availableWidth, narrow, density='regular') {
  // Node slots are layout space, not a request to stretch a short label.
  // Keep all source text; long content wraps rather than disappearing.
  if(Array.isArray(item.contains))return {width:availableWidth,height:item[narrow?'narrow':'wide'][3]};
  const measure=(text,font)=>[...text].reduce((n,c)=>n+(/[^\x00-\x7f]/.test(c)?font:font*.62),0);
  const title=item.label||actor.label,lines=item.lines||[];
  if (item.metric) {
    const width=Math.min(availableWidth, 320);
    const titleRows=Math.max(1,Math.ceil(measure(title,11)/Math.max(24,width)));
    const legendWidth=item.metric.series.reduce((n,s)=>n+measure(s.label,11)+24,0);
    const legendRows=Math.max(1,Math.ceil(legendWidth/Math.max(24,width)));
    return {width,height:titleRows*16+6+34+(item.metric.legend?legendRows*16+6:0)};
  }
  if (actor.visual?.variant === 'chat') {
    const width=Math.min(availableWidth,narrow?280:300);
    const titleRows=Math.max(1,Math.ceil(measure(title,11)/Math.max(24,width-20)));
    const bodyRows=lines.reduce((n,line)=>n+Math.max(1,Math.ceil(measure(line,13)/Math.max(24,width-20))),0);
    return {width,height:Math.max(48,14+titleRows*14+bodyRows*18+Math.max(0,lines.length-1)*2)};
  }
  if (actor.visual?.variant === 'plain') {
    if(density==='compact'){
      const width=Math.min(availableWidth,250),indent=actor.visual.avatar==='none'?0:18;
      const titleRows=Math.max(1,Math.ceil(measure(title,11)/Math.max(24,width-12-indent)));
      const bodyRows=lines.reduce((n,line)=>n+Math.max(1,Math.ceil(measure(line,11)/Math.max(24,width-12))),0);
      return {width,height:Math.max(48,12+titleRows*16+(bodyRows?4+bodyRows*15:0))};
    }
    const width=Math.min(availableWidth,250),micro=width<104,indent=micro||actor.visual.avatar==='none'?0:22;
    const titleRows=Math.max(1,Math.ceil(measure(title,micro?11:13)/Math.max(24,width-20-indent)));
    const bodyRows=lines.reduce((n,line)=>n+Math.max(1,Math.ceil(measure(line,11)/Math.max(24,width-20-indent))),0);
    return {width,height:Math.max(48,18+titleRows*(micro?16:18)+bodyRows*15)};
  }
  const padding=20,indent=availableWidth<104?0:29,status=8;
  const preferred=Math.max(measure(title,13)+padding+indent+status,...lines.map(line=>measure(line,11)+padding+indent));
  const width=Math.min(availableWidth,narrow?210:250,Math.max(narrow?132:144,Math.ceil(preferred)));
  const titleRows=Math.max(1,Math.ceil(measure(title,13)/Math.max(24,width-padding-indent-status)));
  const bodyRows=lines.reduce((n,line)=>n+Math.max(1,Math.ceil(measure(line,11)/Math.max(24,width-padding-indent))),0);
  const height=Math.max(48,padding+Math.max(22,titleRows*18)+(lines.length?4+bodyRows*15+(lines.length-1)*2+(indent?6:0):0));
  return {width,height};
}

/** One coordinate model for authored poses, browser drawing and offline audit. */
export function canvasGeometry(presentation, scene, actualWidth) {
  const narrow=actualWidth<560,canvas=presentation?.canvas;
  const logicalWidth=canvas?(narrow?canvas.narrowWidth:canvas.wideWidth):actualWidth;
  const logicalHeight=narrow?scene.narrowHeight:scene.height;
  const scale=canvas?Math.min(canvas.maxScale??1,actualWidth/logicalWidth):1;
  return {narrow,logicalWidth,logicalHeight,scale,offsetX:(actualWidth-logicalWidth*scale)/2,displayHeight:Math.ceil(logicalHeight*scale)};
}

export function logicalBox(rect, origin, scale=1) {
  return {x:(rect.x-origin.x)/scale,y:(rect.y-origin.y)/scale,w:rect.width/scale,h:rect.height/scale};
}

export function cubicProgress(progress, easing=[.22,.9,.24,1]) {
  const p=Math.max(0,Math.min(1,progress));
  if(p===0||p===1)return p;
  const [x1,y1,x2,y2]=easing,curve=(t,a,b)=>3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;
  let lo=0,hi=1;
  for(let i=0;i<32;i++){const t=(lo+hi)/2;if(curve(t,x1,x2)<p)lo=t;else hi=t;}
  return curve((lo+hi)/2,y1,y2);
}

/** Stops index authored via points; obstacle bends do not add timing beats. */
export function transferPoint(points, progress, stops=[], transfer, pointer=false) {
  const p=Math.max(0,Math.min(1,progress)),lengths=points.slice(1).map((b,i)=>Math.hypot(b.x-points[i].x,b.y-points[i].y));
  const total=lengths.reduce((a,b)=>a+b,0);
  if(!total)return {...points[0],fraction:p};
  const bounds=transfer?.timing==='segments'?[0,...stops.map(i=>i+1),points.length-1]:[0,points.length-1];
  const legs=bounds.slice(1).map((end,i)=>({start:bounds[i],end,length:lengths.slice(bounds[i],end).reduce((a,b)=>a+b,0)})).filter(l=>l.length>0);
  const legIndex=Math.min(legs.length-1,Math.floor(p*legs.length)),leg=legs[legIndex];
  const local=p===1?1:p*legs.length-legIndex;
  const eased=transfer?cubicProgress(local,transfer.easing):pointer?local*local*(3-2*local):local;
  let distance=leg.length*eased;
  const before=lengths.slice(0,leg.start).reduce((a,b)=>a+b,0),fraction=(before+distance)/total;
  for(let i=leg.start;i<leg.end;i++){
    if(distance<=lengths[i]||i===leg.end-1){
      const t=lengths[i]?distance/lengths[i]:0,a=points[i],b=points[i+1];
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,fraction};
    }
    distance-=lengths[i];
  }
}

export function routePoints(link, boxes, width, narrow) {
  const a=boxes[link.from],b=boxes[link.to],config=link[narrow?'narrowRoute':'wideRoute']||{};
  const ac={x:a.x+a.w/2,y:a.y+a.h/2},bc={x:b.x+b.w/2,y:b.y+b.h/2};
  const horizontal=a.x+a.w+20<=b.x||b.x+b.w+20<=a.x;
  const from=config.from||(horizontal?(bc.x>ac.x?'right':'left'):(bc.y>ac.y?'bottom':'top'));
  const to=config.to||({right:'left',left:'right',bottom:'top',top:'bottom'}[from]);
  const port=(box,side)=>({left:{x:box.x-4,y:box.y+box.h/2},right:{x:box.x+box.w+4,y:box.y+box.h/2},top:{x:box.x+box.w/2,y:box.y-4},bottom:{x:box.x+box.w/2,y:box.y+box.h+4}}[side]);
  return [port(a,from),...(config.via||[]).map(([x,y])=>({x:x*width,y})),port(b,to)];
}

export function segmentHitsBox(a,b,box) {
  // Liang–Barsky clipping against the interior; grazing an outline is allowed.
  const inset=2,x0=box.x+inset,x1=box.x+box.w-inset,y0=box.y+inset,y1=box.y+box.h-inset;
  let lo=0,hi=1;
  for(const [p,q] of [[a.x-b.x,a.x-x0],[b.x-a.x,x1-a.x],[a.y-b.y,a.y-y0],[b.y-a.y,y1-a.y]]){
    if(p===0){if(q<0)return false;continue;}
    const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
    if(lo>hi)return false;
  }
  return true;
}
