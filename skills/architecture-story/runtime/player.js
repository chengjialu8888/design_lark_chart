(() => {
  'use strict';
  __STORY_PLAYBACK__
  const root = document.getElementById('__STORY_ID__');
  const spec = JSON.parse(root.querySelector('[data-story]').textContent);
  const $ = selector => root.querySelector(selector);
  const svg = $('.story-wires');
  const ns = 'http://www.w3.org/2000/svg';
  const restoreIndex = __STORY_STATE__;
  let index = 0, timer = null, playing = false, resizeFrame = null, motionFrame = null, lastWidth = 0, lastHeight = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let playback;
  const element = (tag, attrs = {}) => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    return el;
  };
  $('[data-title]').textContent = spec.title;
  $('[data-notice]').textContent = spec.notice;
  const lanes = spec.lanes || [];
  root.style.setProperty('--lanes', lanes.length || 3);
  lanes.forEach(lane => {
    const label = document.createElement('span'); label.className='lane-label text-small'; label.textContent=lane.label;
    $('.story-lanes').append(label);
  });
  const buttons = spec.steps.map((step, i) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn'; button.textContent = String(i + 1).padStart(2,'0');
    button.setAttribute('aria-label',`${i + 1} ${step.label}`); button.dataset.tooltip=step.label;
    button.addEventListener('click', () => { pause(); go(i, true); });
    $('.story-steps').append(button);
    return button;
  });
  const nodes = new Map(spec.nodes.map((node, i) => {
    const el = document.createElement('div'); el.className = 'story-node'; el.dataset.node = node.id;
    const label = document.createElement('strong'); label.textContent = node.label;
    const heading = document.createElement('div'); heading.className='node-heading';
    const code = document.createElement('span'); code.className='text-small node-code'; code.textContent=String(i + 1).padStart(2,'0'); heading.append(code,label);
    const role = document.createElement('span'); role.className = 'text-small node-role'; role.textContent = node.role;
    const status = document.createElement('span'); status.className = 'text-small node-status';
    if (lanes.length) {el.style.gridColumn=lanes.findIndex(l=>l.id===node.lane)+1;el.style.gridRow=node.row+1;}
    el.append(heading, role, status); $('.story-nodes').append(el);
    return [node.id, {el, status}];
  }));
  function save() {
    const host = window.openai;
    if (host?.setWidgetState) host.setWidgetState({modelContent:{story:spec.id, step:index + 1, label:spec.steps[index].label},privateContent:{id:spec.id,index,playback:playback.options}}).catch(() => {});
  }
  function restore(state) {
    playback.restore(state);
    if(!playback.interactive)return;
    // The host echoes saved state. Reapplying our current step would cancel playback and motion.
    const next = restoreIndex(state, spec.id, index, spec.steps.length);
    if (next !== index) { pause(); go(next); }
  }
  function pause() {
    clearTimeout(timer); timer = null; playing = false;
    $('[data-play]').textContent = index === spec.steps.length - 1 ? '从头播放' : '播放流程';
    $('[data-play]').setAttribute('aria-pressed', 'false');
    cancelAnimationFrame(motionFrame);playback?.sync();
  }
  function schedule() {
    clearTimeout(timer);
    if (playing) timer = setTimeout(() => {
      if (!root.isConnected) { pause(); return; }
      if (index === spec.steps.length - 1) { if(!playback.finish())pause(); return; }
      go(index + 1, true);
      schedule();
    }, 4200);
  }
  function go(next, persist = false) {
    playback?.reset();
    index = Math.max(0, Math.min(spec.steps.length - 1, next));
    const step = spec.steps[index];
    buttons.forEach((button, i) => { button.setAttribute('aria-pressed', String(i === index)); });
    for (const [id, node] of nodes) {
      node.el.dataset.active = String(step.active.includes(id));
      node.status.textContent = step.status[id] || '待命';
    }
    $('[data-task]').textContent = step.task;
    $('[data-payload]').textContent = step.payload;
    $('[data-detail]').textContent = step.detail;
    $('[data-step-title]').textContent = `${String(index + 1).padStart(2,'0')} / ${step.label}`;
    $('.story-diagram').setAttribute('aria-label',`${step.label}。${step.detail}。${spec.nodes.map(n=>`${n.label}：${step.status[n.id]||'待命'}`).join('；')}`);
    $('[data-count]').textContent = `${index + 1} / ${spec.steps.length}`;
    $('[data-prev]').disabled = index === 0;
    $('[data-next]').disabled = index === spec.steps.length - 1;
    if (!playing) $('[data-play]').textContent = index === spec.steps.length - 1 ? '从头播放' : '播放流程';
    draw(persist);
    if (persist) save();
  }
  /** Route links through the gaps; never draw through a node's label. */
  function route(a, b) {
    const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
    if (Math.abs(ay - by) < 2) {
      const sign = bx > ax ? 1 : -1;
      return `M ${ax + sign * a.w / 2} ${ay} L ${bx - sign * (b.w / 2 + 5)} ${by}`;
    }
    if (Math.abs(ax-bx)<2) {
      const sign=by>ay?1:-1;
      return `M ${ax} ${ay+sign*a.h/2} L ${bx} ${by-sign*(b.h/2+5)}`;
    }
    const direction=bx>ax?1:-1, vertical=by>ay?1:-1;
    const start=ax+direction*a.w/2,end=bx-direction*(b.w/2+5),mid=(start+end)/2,r=7;
    return `M ${start} ${ay} L ${mid-direction*r} ${ay} Q ${mid} ${ay} ${mid} ${ay+vertical*r} L ${mid} ${by-vertical*r} Q ${mid} ${by} ${mid+direction*r} ${by} L ${end} ${by}`;
  }
  /** One finite packet traversal per active edge, in narrative order. */
  function animate(paths) {
    if (reduced.matches || !paths.length || document.hidden) return;
    const packets=paths.map(path=>{
      const g=element('g',{opacity:0});g.append(element('circle',{r:9,class:'packet-halo'}),element('circle',{r:3.5,class:'packet-dot'}));svg.append(g);
      return {path,g,length:path.getTotalLength()};
    });
    const start=performance.now(),duration=620;
    function frame(now) {
      if (!root.isConnected) return;
      const elapsed=now-start;
      packets.forEach((p,i)=>{
        const t=(elapsed-i*duration)/duration;
        p.g.setAttribute('opacity',t>=0&&t<=1?'1':'0');
        if(t>=0&&t<=1){const at=p.path.getPointAtLength(t*p.length);p.g.setAttribute('transform',`translate(${at.x} ${at.y})`);}
      });
      if(elapsed<duration*packets.length) motionFrame=requestAnimationFrame(frame);
      else packets.forEach(p=>p.g.remove());
    }
    motionFrame=requestAnimationFrame(frame);
  }
  function draw(withMotion=false) {
    cancelAnimationFrame(motionFrame);
    const box = $('.story-diagram').getBoundingClientRect();
    if (!box.width) return;
    lastWidth = box.width; lastHeight = box.height;
    const positions = new Map([...nodes].map(([id, node]) => {
      const r = node.el.getBoundingClientRect();
      return [id, {x:r.left-box.left, y:r.top-box.top, w:r.width, h:r.height}];
    }));
    svg.replaceChildren();
    const defs = element('defs');
    for (const active of [false, true]) {
      const marker = element('marker', {id:`${spec.id}-arrow-${active}`,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:5,markerHeight:5,orient:'auto'});
      marker.append(element('path',{d:'M 0 0 L 10 5 L 0 10 Z',fill:active?'var(--viz-series-1)':'var(--border)'})); defs.append(marker);
    }
    svg.append(defs);
    const step = spec.steps[index];
    if(lanes.length && box.width>560) {
      const values=[...positions.values()];
      for(let col=1;col<lanes.length;col++) {
        const first=values.find(r=>r.x>box.width*col/lanes.length);
        if(first)svg.append(element('line',{x1:first.x-16,x2:first.x-16,y1:0,y2:box.height,class:'lane-divider'}));
      }
    }
    // One neutral link per node pair, with the active direction drawn on top.
    const drawn = new Set();
    const activePaths = [];
    for (const edge of [...spec.edges.filter(e => !step.edges.includes(e.id)), ...step.edges.map(id=>spec.edges.find(e=>e.id===id))]) {
      const active = step.edges.includes(edge.id), key = [edge.from,edge.to].sort().join(':');
      if (!active && drawn.has(key)) continue;
      drawn.add(key);
      const path=element('path',{d:route(positions.get(edge.from),positions.get(edge.to)),class:`wire${active?' active':''}`,'marker-end':active?`url(#${spec.id}-arrow-true)`:'none'});
      svg.append(path);if(active)activePaths.push(path);
    }
    for (const [id, r] of positions) {
      const active=step.active.includes(id);
      svg.append(element('rect',{x:r.x,y:r.y,width:r.w,height:r.h,rx:8,class:`node-shape${active?' active':''}`}));
      if(active)svg.append(element('rect',{x:r.x,y:r.y+18,width:3,height:r.h-36,rx:1.5,class:'node-accent'}));
    }
    if(withMotion)animate(activePaths);
  }
  $('[data-prev]').addEventListener('click', () => { pause(); go(index - 1, true); });
  $('[data-next]').addEventListener('click', () => { pause(); go(index + 1, true); });
  function playOrPause() {
    if (playing) return pause();
    if (index === spec.steps.length - 1) go(0, true);
    resume();
  }
  $('[data-play]').addEventListener('click', playOrPause);
  function resume(){playing=true;$('[data-play]').textContent='暂停';$('[data-play]').setAttribute('aria-pressed','true');draw(true);schedule();playback?.sync();}
  root.addEventListener('keydown', event => {
    if(!playback.interactive||event.target.tagName==='SELECT')return;
    if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
    event.preventDefault(); pause(); go(index + (event.key === 'ArrowRight' ? 1 : -1), true);
  });
  window.addEventListener('openai:set_globals', event => restore(event.detail?.globals?.widgetState));
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(()=>{
      const box=$('.story-diagram').getBoundingClientRect();
      if(Math.abs(box.width-lastWidth)>.5||Math.abs(box.height-lastHeight)>.5)draw();
    });
  });
  observer.observe($('.story-diagram'));
  reduced.addEventListener('change', () => { pause(); draw(); });
  playback=createPlayback(root,spec.playback,{stage:$('.story-stage'),controls:[$('.story-navigation'),$('.story-footer')],isPlaying:()=>playing,pause,resume,play:playOrPause,start:()=>{pause();go(0);resume();},save});
  go(0); restore(window.openai?.widgetState);playback.init();
})();
