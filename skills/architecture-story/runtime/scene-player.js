(() => {
  __STORY_PLAYBACK__
  __STORY_GEOMETRY__
  const root = document.getElementById('__STORY_ID__');
  const spec = JSON.parse(root.querySelector('[data-story]').textContent);
  const restoreIndex = __STORY_STATE__;
  const frameIndexAt = __STORY_FRAME__;
  const pauseVisualAnimations = __STORY_PAUSE__;
  const routePoints = __STORY_ROUTE__;
  const fitNodeSize = __STORY_FIT__;
  const visualProgress = __STORY_VISUAL_PROGRESS__;
  const legendEntries = __STORY_LEGEND__;
  const $ = selector => root.querySelector(selector);
  const stage = $('.scene-stage'), surface = $('.scene-actors'), svg = $('.scene-links');
  const canvas=$('.scene-canvas');
  let geometry;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const makeSVG = (tag, attrs) => {const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
  const actors = new Map(), buttons = [], edgeNodes=new Map(), focusNodes=new Map();
  const focusSVG=makeSVG('svg',{class:'scene-focus','aria-hidden':'true'});canvas.append(focusSVG);
  root.dataset.navigation=spec.presentation?.navigation||'menu';
  root.dataset.style=spec.presentation?.style||'legacy';
  root.dataset.density=spec.presentation?.density||'regular';
  if(spec.presentation?.transition?.duration)root.style.setProperty('--scene-duration',`${spec.presentation.transition.duration}ms`);
  if(spec.presentation?.transition?.easing)root.style.setProperty('--scene-easing',`cubic-bezier(${spec.presentation.transition.easing.join(',')})`);
  const iconPaths = {
    service:'M8 5 3 12l5 7M16 5l5 7-5 7M14 4l-4 16',
    person:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
    message:'M4 4h16v12H9l-5 4zM8 8h8M8 12h5',
    terminal:'M3 4h18v16H3zM7 9l3 3-3 3M13 15h4',
    document:'M5 3h9l5 5v13H5zM14 3v6h5M9 13h6M9 17h4',
    group:'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 8h8v8H8z',
    bot:'M12 3v3M10 3h4M6 7h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM8 11v2M16 11v2M9 16h6M2 11v5M22 11v5',
    branch:'M6 7v10M16 7v3a3 3 0 0 1-3 3H9M8 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM18 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    status:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 8l8 8M16 8l-8 8',
    ...__STORY_ICONS__
  };
  let index = restoreIndex(window.openai?.widgetState,spec.id,0,spec.scenes.length);
  let frameIndex = -1, elapsed = 0, running = false, continuous = false;
  let clock = 0, lastTime = 0, edgeClock = 0, edgeUntil = 0, currentFrame;
  let pausedAnimations = [];
  let playback;
  $('[data-title]').textContent = spec.title;
  $('[data-notice]').textContent = spec.notice;
  if(/拟议|提案|方案|示意|illustrat|propos/i.test(spec.notice))$('.scene-provenance summary').textContent='方案说明';
  const marker = makeSVG('marker',{id:`${spec.id}-arrow`,orient:'auto',markerUnits:'userSpaceOnUse',refX:8,refY:5,markerWidth:10,markerHeight:10});
  marker.append(makeSVG('path',{d:'M1 1L8 5 1 9',fill:'none',stroke:'context-stroke','stroke-width':1.5}));
  const defs=makeSVG('defs',{});defs.append(marker);svg.append(defs);
  for(const head of ['filled','diamond']){
    const m=makeSVG('marker',{id:`${spec.id}-arrow-${head}`,orient:'auto',markerUnits:'userSpaceOnUse',refX:9,refY:5,markerWidth:11,markerHeight:10});
    m.append(makeSVG('path',{d:head==='filled'?'M1 1L9 5 1 9Z':'M1 5L5 1 9 5 5 9Z',
      fill:head==='filled'?'context-stroke':'white',stroke:'context-stroke','stroke-width':1.2}));
    defs.append(m);
  }
  const arrowMarker=link=>link.state==='waiting'||link.style?.arrow===false?'none':
    `url(#${spec.id}-arrow${link.style?.head&&link.style.head!=='open'?'-'+link.style.head:''})`;
  function drawLegend(links){
    const target=$('.scene-legend'),entries=spec.presentation?.legend==='auto'?legendEntries(links):[];
    target.hidden=!entries.length;
    target.replaceChildren(...entries.map(entry=>{
      const row=document.createElement('span');row.className='legend-entry';row.dataset.tone=entry.tone;
      row.dataset.pattern=entry.pattern;row.dataset.head=entry.head;
      const swatch=makeSVG('svg',{viewBox:'0 0 40 14','aria-hidden':'true',class:'legend-swatch'});
      swatch.append(makeSVG('path',{d:'M2 7H33',class:'legend-line',fill:'none'}));
      if(entry.arrow)swatch.append(makeSVG('path',{d:entry.head==='diamond'?'M27 7L31 3 35 7 31 11Z':entry.head==='filled'?'M28 3L35 7 28 11Z':'M29 3L35 7 29 11',
        class:'legend-head',fill:entry.head==='filled'?'currentColor':entry.head==='diamond'?'white':'none'}));
      const text=document.createElement('span');text.textContent=entry.label;row.append(swatch,text);return row;
    }));
  }
  const edges=makeSVG('g',{});svg.append(edges);

  for (const actor of spec.actors) {
    const element=document.createElement('div');element.className='scene-actor';element.dataset.kind=actor.kind;element.dataset.actor=actor.id;
    element.dataset.variant=actor.visual?.variant||'module';
    element.dataset.tone=actor.visual?.tone||'neutral';
    element.dataset.avatar=actor.visual?.avatar||(actor.visual?.variant==='chat'?'person':'default');
    element.dataset.side=actor.visual?.side||'left';
    element.dataset.outline=actor.visual?.outline||'solid';
    const bg=makeSVG('svg',{class:'actor-surface','aria-hidden':'true'});
    bg.append(makeSVG('rect',{class:'actor-shape',x:1,y:1,width:'calc(100% - 2px)',height:'calc(100% - 2px)',rx:actor.kind==='message'?6:8}));
    const top=document.createElement('div');top.className='actor-top';
    const mark=document.createElement('span');mark.className='actor-mark';
    const icon=makeSVG('svg',{class:'actor-icon',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':1.5,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'});
    icon.append(makeSVG('path',{d:iconPaths[actor.visual?.icon]||iconPaths[actor.visual?.avatar]||iconPaths[actor.kind]||iconPaths.service}));
    if(actor.visual?.avatar==='initials')mark.textContent=actor.visual.avatarText;else mark.append(icon);
    const label=document.createElement('span');label.className='actor-title';label.textContent=actor.label;
    top.append(mark,label);
    const lines=document.createElement('div');lines.className='actor-lines text-small text-muted';
    const state=document.createElement('span');state.className='actor-state';state.setAttribute('aria-hidden','true');
    const badge=document.createElement('span');badge.className='actor-badge';badge.hidden=true;
    const ports=['left','right','top','bottom'].map(side=>{const port=document.createElement('span');port.className='actor-port';port.dataset.side=side;port.hidden=true;port.setAttribute('aria-hidden','true');return port;});
    element.append(bg,top,lines,state,badge,...ports);surface.append(element);
    const metric=document.createElement('div');metric.className='actor-metric';metric.hidden=true;element.append(metric);
    actors.set(actor.id,{element,label,lines,badge,metric,actor,visible:false,visualStart:null,metricStart:null,metricSignature:null});
  }
  spec.scenes.forEach((scene,i)=>{
    const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=root.dataset.navigation==='pills'?scene.label:`${i+1} ${scene.label}`;
    button.addEventListener('click',()=>go(i,true,false,true));$('.scene-nav').append(button);buttons.push(button);
  });
  function syncNavigation() {
    const nav=$('.scene-nav');
    buttons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===index));if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    if(root.dataset.navigation!=='pills')return;
    const button=buttons[index],a=nav.getBoundingClientRect(),b=button.getBoundingClientRect();
    if(b.left<a.left+4)nav.scrollLeft-=a.left+4-b.left;
    else if(b.right>a.right-4)nav.scrollLeft+=b.right-a.right+4;
    nav.dataset.start=String(nav.scrollLeft<=1);
    nav.dataset.end=String(nav.scrollLeft+nav.clientWidth>=nav.scrollWidth-1);
  }
  $('.scene-nav').addEventListener('scroll',()=>{const n=$('.scene-nav');n.dataset.start=String(n.scrollLeft<=1);n.dataset.end=String(n.scrollLeft+n.clientWidth>=n.scrollWidth-1);});

  function updateMetric(entry, item) {
    entry.element.dataset.metric=String(!!item.metric);
    entry.metric.hidden=!item.metric;
    if(!item.metric)return;
    const signature=JSON.stringify(item.metric);
    if(entry.metricSignature===signature)return;
    entry.metricSignature=signature;entry.metricStart=currentFrame.at;
    const legend=document.createElement('div');legend.className='metric-legend';legend.hidden=!item.metric.legend;
    entry.metricRows=item.metric.series.map(series=>{
      const key=document.createElement('span');key.dataset.tone=series.tone;key.textContent=series.label;legend.append(key);
      const row=document.createElement('div');row.className='metric-row';row.dataset.tone=series.tone;
      const track=document.createElement('div');track.className='metric-track';
      const fill=document.createElement('div');fill.className='metric-fill';fill.setAttribute('aria-hidden','true');
      const value=document.createElement('span');value.className='metric-value';value.textContent=series.display;
      row.setAttribute('aria-label',`${series.label}：${series.display}`);
      track.append(fill,value);row.append(track);return {row,fill,value,series};
    });
    entry.metric.replaceChildren(legend,...entry.metricRows.map(r=>r.row));
    const labelWidth=Math.max(item.metric.labelSpace||0,Math.max(...entry.metricRows.map(r=>r.value.getBoundingClientRect().width/(geometry?.scale||1)))+12);
    entry.metric.style.setProperty('--metric-label-space',`${Math.ceil(labelWidth)}px`);
  }
  function updateVisuals() {
    if(!currentFrame)return;
    for(const [id,entry] of actors) {
      const item=currentFrame.items[id];if(!item)continue;
      if(entry.visualStart!==null){
        const age=elapsed-entry.visualStart,p=visualProgress(age,500,reduced.matches);
        entry.element.style.opacity=String(entry.baseOpacity*p);
        const scale=entry.actor.visual?.entrance==='pop'?
          (p<.65?.96+.065*visualProgress(p/.65,1):1.025-.025*visualProgress((p-.65)/.35,1)):1;
        entry.element.style.scale=String(scale);
        // Individual CSS scale precedes transform translation. Compensate that
        // translation so a bubble pops around its own slot rather than the canvas origin.
        const pose=entry.visualPose||{x:0,y:0};
        entry.element.style.translate=`${pose.x*(1-scale)}px ${pose.y*(1-scale)}px`;
        entry.element.querySelector('.actor-mark').style.opacity=String(visualProgress(age-60,300,reduced.matches));
      }
      if(item.metric) {
        const m=item.metric;
        for(const [i,row] of entry.metricRows.entries()){
          const p=visualProgress(elapsed-entry.metricStart-(m.delay||0)-i*(m.stagger??80),m.duration??900,reduced.matches);
          const width=row.series.value/m.max*100*p;
          row.fill.style.width=`${width}%`;row.value.style.left=`calc(${width}% + 6px)`;
          row.value.style.opacity=String(p);
          row.row.dataset.progress=p.toFixed(4);
        }
      }
    }
  }
  // Link endpoints follow the actual interpolated actor positions, not their target poses.
  function drawEdges() {
    if(!currentFrame||!geometry?.scale)return;
    updateVisuals();
    const base=canvas.getBoundingClientRect(),width=geometry.logicalWidth,narrow=geometry.narrow,height=canvas.clientHeight;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    focusSVG.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const boxes=Object.fromEntries([...actors].map(([id,entry])=>[id,logicalBox(entry.element.getBoundingClientRect(),base,geometry.scale)]));
    for(const entry of actors.values())entry.element.querySelectorAll('.actor-port').forEach(port=>port.hidden=true);
    for(let i=0;i<currentFrame.links.length;i++) {
      const link=currentFrame.links[i],g=edgeNodes.get(link.id||`${link.from}:${link.to}:${i}`),path=g.querySelector('.scene-edge');
      const points=routePoints(link,boxes,width,narrow);
      for(const [id,point] of [[link.from,points[0]],[link.to,points.at(-1)]]){
        if(id===link.to&&link.state==='waiting')continue;
        const box=boxes[id],side=point.x<box.x?'left':point.x>box.x+box.w?'right':point.y<box.y?'top':'bottom';
        const port=actors.get(id).element.querySelector(`.actor-port[data-side="${side}"]`);
        port.hidden=false;port.dataset.state=link.state||'idle';port.dataset.kind=link.kind||'dependency';port.dataset.tone=link.style?.tone||'neutral';
      }
      // Round authored orthogonal bends without moving endpoints or route lanes.
      let d=`M${points[0].x} ${points[0].y}`;
      for(let j=1;j<points.length-1;j++){
        const a=points[j-1],b=points[j],c=points[j+1],ab=Math.hypot(b.x-a.x,b.y-a.y),bc=Math.hypot(c.x-b.x,c.y-b.y),r=Math.min(10,ab/2,bc/2);
        if(!ab||!bc){d+=`L${b.x} ${b.y}`;continue;}
        d+=`L${b.x-(b.x-a.x)/ab*r} ${b.y-(b.y-a.y)/ab*r}Q${b.x} ${b.y} ${b.x+(c.x-b.x)/bc*r} ${b.y+(c.y-b.y)/bc*r}`;
      }
      d+=`L${points.at(-1).x} ${points.at(-1).y}`;
      path.setAttribute('d',d);g.querySelector('.edge-track').setAttribute('d',d);
      const beam=g.querySelector('.edge-beam');beam.setAttribute('d',d);
      const route=link[narrow?'narrowRoute':'wideRoute']||{},offset=route.labelOffset||[0,-9];
      const length=path.getTotalLength(),label=g.querySelector('.edge-label'),center=path.getPointAtLength(length*(route.labelAt??.5));
      label.setAttribute('x',center.x+offset[0]);label.setAttribute('y',center.y+offset[1]);
      const waiting=link.state==='waiting',end=points.at(-1),before=points.at(-2),dx=end.x-before.x,dy=end.y-before.y,norm=Math.hypot(dx,dy)||1,stop=g.querySelector('line');
      stop.setAttribute('x1',end.x-dy/norm*6);stop.setAttribute('y1',end.y+dx/norm*6);stop.setAttribute('x2',end.x+dy/norm*6);stop.setAttribute('y2',end.y-dx/norm*6);stop.style.display=waiting?'':'none';
      const packet=g.querySelector('.edge-packet'),halo=g.querySelector('.edge-halo'),travel=link.travel??800,age=Math.max(0,elapsed-currentFrame.at),progress=Math.min(1,age/travel);
      const soft=link.transfer?.effect==='soft',onRoute=link.transfer?.scope==='route',envelope=transferVisual(age,travel,soft,reduced.matches);
      packet.style.display=link.state==='flow'&&!reduced.matches&&progress<1?'':'none';
      halo.style.display=packet.style.display;
      beam.style.display=link.state==='flow'?'':'none';
      beam.style.opacity=soft?String(envelope.signal*.35):'';
      // All transfer accents derive from the existing story clock. Pausing or
      // jumping freezes/cancels them with the packet; waiting never lights a path.
      const focus=focusNodes.get(link.id||`${link.from}:${link.to}:${i}`);
      const source=boxes[link.from],target=boxes[link.to],sx=source.x+source.w/2,sy=source.y+source.h/2,tx=target.x+target.w/2,ty=target.y+target.h/2;
      const cursorPath=focus.querySelector('path');
      cursorPath.setAttribute('d',`M${sx} ${sy}L${points[0].x} ${points[0].y}`+d.slice(d.indexOf('L'))+`L${tx} ${ty}`);
      const centers=!!link.transfer&&!onRoute;
      const timingPoints=centers?[{x:sx,y:sy},...points,{x:tx,y:ty}]:points;
      const timing=transferPoint(timingPoints,progress,(route.stops||[]).map(i=>i+(centers?1:0)),link.transfer);
      const movingPath=centers?cursorPath:path;
      const movingLength=movingPath.getTotalLength(),movingDistance=movingLength*timing.fraction;
      const routeFraction=centers?Math.max(0,Math.min(1,(movingDistance-Math.hypot(points[0].x-sx,points[0].y-sy))/(length||1))):timing.fraction;
      beam.setAttribute('stroke-dasharray',`${reduced.matches?1:routeFraction} 1`);
      const point=movingPath.getPointAtLength(movingDistance);packet.setAttribute('cx',point.x);packet.setAttribute('cy',point.y);
      halo.setAttribute('cx',point.x);halo.setAttribute('cy',point.y);
      packet.style.opacity=soft?String(envelope.signal):'';
      halo.style.opacity=soft?String(envelope.signal*.12):'';
      const pointerMode=(link.motion||spec.presentation?.motion)==='pointer',payload=g.querySelector('.edge-payload');
      payload.style.display=!pointerMode&&link.packet&&packet.style.display!=='none'?'':'none';
      payload.style.opacity=soft?String(envelope.signal):'';
      if(!pointerMode&&link.packet){
        payload.querySelector('text').textContent=link.packet;
        const w=Math.max(32,payload.querySelector('text').getComputedTextLength()+18);
        payload.querySelector('rect').setAttribute('x',-w/2);payload.querySelector('rect').setAttribute('width',w);
        payload.setAttribute('transform',`translate(${point.x},${point.y})`);
        packet.style.display='none';halo.style.display='none';
      }
      focus.style.display=pointerMode&&link.state==='flow'&&!reduced.matches?'':'none';
      if(pointerMode){
        packet.style.display='none';halo.style.display='none';beam.style.display='none';
        // Include both actor centers; never send a moving text label through a node.
        const cursorTiming=transferPoint(onRoute?points:[{x:sx,y:sy},...points,{x:tx,y:ty}],progress,(route.stops||[]).map(i=>i+(onRoute?0:1)),link.transfer,true);
        const cursor=onRoute?path:cursorPath,pos=cursor.getPointAtLength(cursor.getTotalLength()*cursorTiming.fraction);
        const dot=focus.querySelector('.focus-dot'),ring=focus.querySelector('.focus-ring');
        dot.setAttribute('cx',pos.x);dot.setAttribute('cy',pos.y);
        dot.style.opacity=String(envelope.signal);
        ring.setAttribute('cx',onRoute?end.x:tx);ring.setAttribute('cy',onRoute?end.y:ty);ring.setAttribute('r',String(envelope.radius));
        ring.style.opacity=String(envelope.arrival);
        focus.dataset.tone=link.style?.tone||'accent';
      }
      path.style.strokeDashoffset=link.state==='flow'&&link.style?.pattern==='dashed'&&!reduced.matches&&progress<1?String(-age/42):'0';
      g.querySelectorAll('.edge-trail').forEach((trail,j)=>{
        const offset=(j+1)*7;
        trail.style.display=(soft?link.state!=='flow'||progress>=1||reduced.matches:packet.style.display==='none')||movingDistance<offset?'none':'';
        if(soft)trail.style.opacity=String(envelope.signal*[.22,.12,.06][j]);
        else trail.style.opacity='';
        const p=movingPath.getPointAtLength(Math.max(0,movingDistance-offset));
        trail.setAttribute('cx',p.x);trail.setAttribute('cy',p.y);
      });
      const arrival=g.querySelector('.edge-arrival'),arrivalAt=(age-travel)/420;
      arrival.style.display=link.state==='flow'&&!reduced.matches&&arrivalAt>=0&&arrivalAt<1?'':'none';
      arrival.setAttribute('cx',end.x);arrival.setAttribute('cy',end.y);
      arrival.setAttribute('r',String(5+Math.max(0,arrivalAt)*15));
      arrival.style.opacity=String(Math.max(0,1-arrivalAt)*.6);
      if(soft){arrival.style.display=link.state==='flow'&&envelope.arrival>0?'':'none';arrival.setAttribute('r',String(envelope.radius));arrival.style.opacity=String(envelope.arrival);}
      if(pointerMode)arrival.style.display='none';
    }
  }
  function trackEdges(now) {drawEdges();if(now<edgeUntil)edgeClock=requestAnimationFrame(trackEdges);}
  function updateLines(target, lines, instant) {
    const old=[...target.children].map(el=>el.textContent);
    if(JSON.stringify(old)===JSON.stringify(lines))return;
    const previous=[...target.children];
    target.replaceChildren(...lines.map((line,i)=>{
      if(old[i]===line)return previous[i];
      const el=document.createElement('div');el.className='actor-line'+(!instant&&!reduced.matches?' enter':'');
      el.textContent=line;el.style.animationDelay=`${i*80}ms`;return el;
    }));
  }
  function renderFrame(next, instant=false) {
    currentFrame=spec.scenes[index].frames[next];frameIndex=next;
    drawLegend(currentFrame.links);
    const scene=spec.scenes[index];
    geometry=canvasGeometry(spec.presentation,scene,stage.clientWidth);
    const width=geometry.logicalWidth,narrow=geometry.narrow;
    if(instant)stage.classList.add('no-motion');
    const poses=new Map(Object.entries(currentFrame.items).map(([id,item])=>{
      const [x,y,w,h]=item[narrow?'narrow':'wide'];
      const slotWidth=spec.presentation?.canvas||Array.isArray(item.contains)?w*width:Math.min(w*width,w*(narrow?296:688));
      const fitted=fitNodeSize(item,actors.get(id).actor,slotWidth,narrow,spec.presentation?.density);
      if(scene.anchors?.includes(id)||scene.layout==='stable'){
        fitted.width=slotWidth;fitted.height=Math.max(h,fitted.height);
      }
      return [id,{x:x*width+(w*width-fitted.width)/2,y:y+Math.max(0,(h-fitted.height)/2),w:fitted.width,h:fitted.height}];
    }));
    const fixedRoutes=scene.layout==='stable'||scene.anchors?.length||scene.frames.some(frame=>frame.links.some(link=>link.wideRoute?.via?.length||link.narrowRoute?.via?.length));
    // Keep compact nodes on the same authored row center-aligned, so different
    // amounts of metadata do not turn a simple horizontal flow into a slope.
    if(!fixedRoutes){
      const rows=new Map();
      for(const [id,pose] of poses){
        if(currentFrame.items[id].contains?.length)continue;
        const key=Math.round(pose.y*100)/100;
        if(!rows.has(key))rows.set(key,[]);
        rows.get(key).push(pose);
      }
      for(const row of rows.values()){
        const height=Math.max(...row.map(p=>p.h));
        for(const pose of row)pose.y+=(height-pose.h)/2;
      }
    }
    const values=[...poses.values()],left=Math.min(...values.map(p=>p.x)),right=Math.max(...values.map(p=>p.x+p.w)),top=Math.min(...values.map(p=>p.y)),bottom=Math.max(...values.map(p=>p.y+p.h));
    const visualHeight=fixedRoutes?(narrow?scene.narrowHeight:scene.height):Math.max(narrow?220:170,bottom-top+24+(narrow?64:44));
    const dx=fixedRoutes?0:(width-left-right)/2,dy=fixedRoutes?0:12-top;
    const designHeight=spec.presentation?.canvas?geometry.logicalHeight:visualHeight;
    stage.style.height=`${Math.ceil(designHeight*geometry.scale)}px`;
    canvas.style.width=`${width}px`;canvas.style.height=`${designHeight}px`;
    canvas.style.transform=`translateX(${geometry.offsetX}px) scale(${geometry.scale})`;
    for(const [id,entry] of actors) {
      const item=currentFrame.items[id],el=entry.element;
      if(!item) {el.style.opacity=0;el.dataset.processing='false';el.setAttribute('aria-hidden','true');entry.visible=false;continue;}
      const pose=poses.get(id),px=pose.x+dx,py=pose.y+dy;
      entry.visualPose={x:px,y:py};
      const entering=!entry.visible&&!instant;
      if(!entry.visible&&!instant&&entry.actor.visual)entry.visualStart=elapsed;
      if(entering)el.classList.add('no-motion');
      entry.label.textContent=item.label||entry.actor.label;
      el.dataset.tone=item.visual?.tone||entry.actor.visual?.tone||'neutral';
      entry.badge.textContent=item.visual?.badge||'';
      entry.badge.hidden=!item.visual?.badge;
      updateMetric(entry,item);
      updateLines(entry.lines,item.lines,instant);el.dataset.state=item.state||'normal';
      el.dataset.container=String(Array.isArray(item.contains));el.style.zIndex=Array.isArray(item.contains)?'0':'2';
      const focused=!currentFrame.focus?.length||currentFrame.focus.includes(id)||item.contains?.some(child=>currentFrame.focus.includes(child));
      el.dataset.focus=String(focused);
      el.dataset.processing=String(currentFrame.processing?currentFrame.processing.includes(id):item.state==='active');
      el.dataset.density=pose.w<104?'micro':'regular';
      entry.baseOpacity=(item.opacity??1)*(focused?1:(spec.presentation?.style==='compact' ? .62 : .32));
      el.style.width=`${pose.w}px`;el.style.height=`${pose.h}px`;el.style.transform=`translate(${px}px,${py}px)`;el.style.opacity=entry.baseOpacity;
      el.dataset.muted=String(item.state==='muted');
      if(item.opacity===0)el.setAttribute('aria-hidden','true');else el.removeAttribute('aria-hidden');entry.visible=item.opacity!==0;
      if(entering){el.getBoundingClientRect();el.classList.remove('no-motion');}
    }
    const edgeKey=(link,i)=>link.id||`${link.from}:${link.to}:${i}`;
    const live=new Set(currentFrame.links.map(edgeKey));
    for(const [key,g] of edgeNodes)if(!live.has(key)){
      g.style.opacity=0;focusNodes.get(key).style.display='none';
      g.querySelectorAll('.edge-payload,.edge-packet,.edge-halo,.edge-trail,.edge-arrival').forEach(el=>el.style.display='none');
    }
    currentFrame.links.forEach((link,i)=>{
      const key=edgeKey(link,i),pointerMode=(link.motion||spec.presentation?.motion)==='pointer';
      const focused=!currentFrame.focus?.length||currentFrame.focus.includes(link.from)&&currentFrame.focus.includes(link.to);
      if(edgeNodes.has(key)){
        const g=edgeNodes.get(key);g.dataset.state=link.state||'idle';g.style.opacity=focused?1:.25;
        g.dataset.pattern=link.style?.pattern||'solid';g.dataset.tone=link.style?.tone||'neutral';
        g.querySelector('.edge-label').textContent=link.state==='flow'&&link.packet&&!pointerMode?'':link.label||'';
        g.querySelector('.scene-edge').setAttribute('marker-end',arrowMarker(link));
        return;
      }
      const g=makeSVG('g',{'data-relation':link.id||'', 'data-kind':link.kind||'dependency','data-state':link.state||'idle',class:'scene-connection'});
      g.dataset.pattern=link.style?.pattern||'solid';g.dataset.tone=link.style?.tone||'neutral';g.style.opacity=focused?1:.25;
      const path=makeSVG('path',{class:'scene-edge','marker-end':arrowMarker(link)});
      const label=makeSVG('text',{class:'edge-label text-small','text-anchor':'middle'});label.textContent=link.state==='flow'&&link.packet&&!pointerMode?'':link.label||'';
      const payload=makeSVG('g',{class:'edge-payload'});
      payload.append(makeSVG('rect',{y:-12,height:24,rx:12}),makeSVG('text',{'text-anchor':'middle',y:4}));
      g.append(makeSVG('path',{class:'edge-track'}),path,makeSVG('path',{class:'edge-beam',pathLength:1}),
        makeSVG('line',{class:'edge-stop'}),makeSVG('circle',{r:10,class:'edge-halo'}),
        ...[2.6,1.9,1.2].map((r,j)=>makeSVG('circle',{r,class:'edge-trail',opacity:[.55,.32,.18][j]})),
        makeSVG('circle',{r:3.5,class:'edge-packet'}),makeSVG('circle',{class:'edge-arrival'}),label,payload);
      edgeNodes.set(key,g);edges.append(g);
      const focus=makeSVG('g',{'data-relation':link.id||'',class:'transfer-focus'});
      focus.append(makeSVG('path',{fill:'none',stroke:'none'}),makeSVG('circle',{class:'focus-ring',fill:'none'}),makeSVG('circle',{class:'focus-dot',r:4.5}));
      focusNodes.set(key,focus);focusSVG.append(focus);
    });
    const caption=$('[data-caption]');
    if(caption.textContent!==currentFrame.caption){
      caption.classList.remove('text-reveal');caption.textContent=currentFrame.caption;
      if(!instant&&!reduced.matches){caption.getBoundingClientRect();caption.classList.add('text-reveal');}
    }
    $('[data-scene-title]').textContent=currentFrame.headline||scene.detail;
    stage.setAttribute('aria-label',`${scene.detail}。${Object.entries(currentFrame.items).filter(([,item])=>item.opacity!==0).map(([id,item])=>`${item.label||actors.get(id).actor.label}：${item.metric?item.metric.series.map(s=>`${s.label} ${s.display}`).join('，'):item.lines.join('，')}${item.visual?.badge?`，${item.visual.badge}`:''}`).join('；')}`);
    cancelAnimationFrame(edgeClock);drawEdges();
    if(!instant&&!reduced.matches){edgeUntil=performance.now()+800;edgeClock=requestAnimationFrame(trackEdges);}
    if(instant){stage.getBoundingClientRect();stage.classList.remove('no-motion');}
    root.dataset.frame=String(next);
  }
  function progress() {
    const value=Math.min(100,elapsed/spec.scenes[index].duration*100);
    $('.progress-bar').style.width=`${value}%`;$('.progress').setAttribute('aria-valuenow',String(Math.round(value)));
    $('[data-play]').textContent=running?'暂停':'播放演示';
    playback?.sync();
  }
  function pause() {
    running=false;cancelAnimationFrame(clock);cancelAnimationFrame(edgeClock);
    pausedAnimations=pauseVisualAnimations(pausedAnimations,root.getAnimations({subtree:true}));progress();
  }
  function resume(all) {
    continuous=all;running=true;lastTime=performance.now();
    pausedAnimations.forEach(a=>a.play());pausedAnimations=[];
    edgeUntil=performance.now()+800;cancelAnimationFrame(edgeClock);edgeClock=requestAnimationFrame(trackEdges);
    clock=requestAnimationFrame(tick);progress();
  }
  function tick(now) {
    if(!running)return;
    elapsed+=Math.max(0,now-lastTime);lastTime=Math.max(lastTime,now);
    const scene=spec.scenes[index],next=frameIndexAt(scene,elapsed);
    if(next!==frameIndex)renderFrame(next);
    progress();drawEdges();
    if(elapsed>=scene.duration) {
      if(continuous&&index<spec.scenes.length-1){go(index+1,true,true,true);return;}
      if(continuous&&playback.finish())return;
      running=false;progress();return;
    }
    clock=requestAnimationFrame(tick);
  }
  function save() {
    window.openai?.setWidgetState?.({modelContent:{story:spec.title,scene:spec.scenes[index].label},privateContent:{id:spec.id,index,playback:playback.options}})?.catch(()=>{});
  }
  function go(next, play=false, all=false, persist=false, instant=false) {
    pause();pausedAnimations.forEach(a=>a.cancel());pausedAnimations=[];
    for(const entry of actors.values()){
      entry.visualStart=null;entry.metricStart=null;entry.metricSignature=null;
      entry.element.style.scale='';entry.element.style.translate='';entry.element.querySelector('.actor-mark').style.opacity='';
    }
    playback?.reset();
    index=Math.max(0,Math.min(next,spec.scenes.length-1));elapsed=0;frameIndex=-1;
    root.dataset.scene=String(index);
    syncNavigation();
    $('[data-scene-title]').textContent=spec.scenes[index].detail;
    $('[data-count]').textContent=`${String(index+1).padStart(2,'0')} / ${String(spec.scenes.length).padStart(2,'0')}`;
    $('[data-prev]').disabled=index===0;$('[data-next]').disabled=index===spec.scenes.length-1;
    renderFrame(0,instant);progress();if(persist)save();if(play)resume(all);
  }
  function playOrPause() {
    if(running)pause();else if(elapsed>=spec.scenes[index].duration)go(index===spec.scenes.length-1?0:index,true,true,true);else resume(true);
  }
  $('[data-play]').addEventListener('click',playOrPause);
  $('[data-replay]').addEventListener('click',()=>go(index,true,false,true));
  $('[data-prev]').addEventListener('click',()=>go(index-1,true,false,true));
  $('[data-next]').addEventListener('click',()=>go(index+1,true,false,true));
  root.addEventListener('keydown',event=>{if(!playback.interactive||event.target.tagName==='SELECT')return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();go(index+(event.key==='ArrowLeft'?-1:1),true,false,true);}});
  window.addEventListener('openai:set_globals',event=>{playback.restore(event.detail?.globals?.widgetState);if(!playback.interactive)return;const next=restoreIndex(event.detail?.globals?.widgetState,spec.id,index,spec.scenes.length);if(next!==index)go(next,false,false,false,true);});
  let lastWidth=stage.clientWidth;
  new ResizeObserver(()=>{const width=stage.clientWidth;if(width!==lastWidth){lastWidth=width;renderFrame(frameIndex,true);syncNavigation();}}).observe(stage);
  playback=createPlayback(root,spec.playback,{stage,controls:[...(['questions','pills'].includes(spec.presentation?.navigation)?[]:[$('.scene-nav')]),$('.scene-controls'),$('.progress')],isPlaying:()=>running,pause,resume:()=>resume(true),play:playOrPause,start:()=>go(0,true,true,false,true),save});
  if(root.querySelector('.playback-options')){
    const settings=document.createElement('details');settings.className='playback-settings';const summary=document.createElement('summary');summary.textContent='播放设置';settings.append(summary,root.querySelector('.playback-options'));root.append(settings);
  }
  go(index,false,false,false,true);playback.init();
})();
