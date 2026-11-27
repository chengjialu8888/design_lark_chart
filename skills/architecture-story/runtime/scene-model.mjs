import {validateVisualFields} from './scene-visuals.mjs';

/** Deterministic full-frame lookup supports replay, backtracking and interrupted transitions. */
export function frameIndexAt(scene, elapsed) {
  let result = 0;
  for (let i = 1; i < scene.frames.length; i++) {
    if (scene.frames[i].at > elapsed) break;
    result = i;
  }
  return result;
}

/** Repeated pause must retain existing handles so navigation can cancel them. */
export function pauseVisualAnimations(previous, current) {
  const animations=[...new Set([...previous.filter(a=>a.playState==='paused'),...current.filter(a=>a.playState==='running')])];
  animations.forEach(a=>a.pause());
  return animations;
}

export function validateScenes(spec) {
  const fail = message => { throw new Error(message); };
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const id = value => text(value) && /^[a-z][a-z0-9-]*$/.test(value);
  if (!record(spec) || spec.version !== 2 || !id(spec.id) || !text(spec.title) || !text(spec.notice)) fail('Invalid scene story header');
  if (!Array.isArray(spec.actors) || spec.actors.length < 1 || spec.actors.length > 16) fail('actors: expected 1–16 actors');
  const actors = new Set();
  for (const actor of spec.actors) {
    if (!record(actor) || !id(actor.id) || !text(actor.label) || !['person','service','message','terminal','document','group'].includes(actor.kind)) fail('Invalid actor');
    if (actors.has(actor.id)) fail(`Duplicate actor: ${actor.id}`);
    validateVisualFields(actor);
    actors.add(actor.id);
  }
  if(spec.presentation!==undefined){
    const p=spec.presentation;
    if(!record(p)||Object.keys(p).some(k=>!['style','navigation','motion','canvas','density','transition','legend'].includes(k))||
      p.style!==undefined&&!['compact','module','sequence'].includes(p.style)||
      p.navigation!==undefined&&!['menu','questions','pills'].includes(p.navigation)||
      p.motion!==undefined&&!['packet','pointer'].includes(p.motion))fail('Invalid presentation');
    if(p.density!==undefined&&!['regular','compact'].includes(p.density))fail('Invalid density');
    if(p.legend!==undefined&&!['auto','none'].includes(p.legend))fail('Invalid legend');
    if(p.canvas!==undefined){
      const c=p.canvas;
      if(!record(c)||Object.keys(c).some(k=>!['wideWidth','narrowWidth','maxScale'].includes(k))||
        !Number.isFinite(c.wideWidth)||c.wideWidth<560||c.wideWidth>1200||
        !Number.isFinite(c.narrowWidth)||c.narrowWidth<280||c.narrowWidth>560||c.narrowWidth>=c.wideWidth||
        c.maxScale!==undefined&&(!Number.isFinite(c.maxScale)||c.maxScale<.5||c.maxScale>2))fail('Invalid canvas');
    }
    if(p.transition!==undefined){
      const t=p.transition;
      if(!record(t)||Object.keys(t).some(k=>!['duration','easing'].includes(k))||
        t.duration!==undefined&&(!Number.isFinite(t.duration)||t.duration<100||t.duration>2000)||
        t.easing!==undefined&&(!Array.isArray(t.easing)||t.easing.length!==4||t.easing.some(n=>!Number.isFinite(n)||n<0||n>1)))fail('Invalid transition');
    }
  }
  const actorIds=(value,name)=>{if(!Array.isArray(value)||new Set(value).size!==value.length||value.some(v=>!actors.has(v)))fail(`Invalid ${name}`);};
  if (!Array.isArray(spec.scenes) || !spec.scenes.length) fail('scenes must not be empty');
  const pose = (p, height) => Array.isArray(p) && p.length === 4 && p.every(Number.isFinite) && p[0] >= 0 && p[1] >= 0 && p[2] > 0 && p[3] >= 48 && p[0]+p[2] <= 1.001 && p[1]+p[3] <= height;
  for (const [i, scene] of spec.scenes.entries()) {
    if (!record(scene) || !text(scene.label) || !text(scene.detail)) fail(`Invalid scene ${i}`);
    if(scene.layout!==undefined&&!['stable','fit'].includes(scene.layout))fail('Invalid layout');
    if(scene.anchors!==undefined)actorIds(scene.anchors,'anchors');
    if (![scene.height,scene.narrowHeight].every(n=>Number.isFinite(n)&&n>=240&&n<=900)) fail(`Invalid scene height ${i}`);
    if (!Number.isFinite(scene.duration) || scene.duration < 1000 || scene.duration > 180000) fail(`Invalid scene duration ${i}`);
    if (!Array.isArray(scene.frames) || !scene.frames.length || scene.frames[0].at !== 0) fail(`Scene ${i} must start at zero`);
    let previous = -1;
    for (const frame of scene.frames) {
      if (!record(frame) || !Number.isFinite(frame.at) || frame.at <= previous || frame.at > scene.duration-700 || !text(frame.caption) || !record(frame.items)) fail(`Invalid frame timing/content in scene ${i}`);
      previous = frame.at;
      if(frame.resetFacts!==undefined&&typeof frame.resetFacts!=='boolean')fail('frame.resetFacts must be boolean');
      if(frame.resetFacts&&!text(frame.branchReason))fail('Alternative frame requires branchReason');
      if(frame.headline!==undefined&&!text(frame.headline))fail('Invalid headline');
      for(const k of ['focus','processing'])if(frame[k]!==undefined){
        actorIds(frame[k],k);if(frame[k].some(id=>!Object.hasOwn(frame.items,id)))fail(`${k} requires visible actors`);
      }
      const entries = Object.entries(frame.items);
      if (!entries.length) fail('Frame must have visible actors');
      for (const [key,item] of entries) {
        if (!actors.has(key) || !record(item) || !pose(item.wide,scene.height) || !pose(item.narrow,scene.narrowHeight)) fail(`Invalid actor pose: ${key}`);
        if (item.label !== undefined && !text(item.label)) fail(`Invalid label: ${key}`);
        if (!Array.isArray(item.lines) || item.lines.length>6 || item.lines.some(line=>typeof line!=='string')) fail(`Invalid lines: ${key}`);
        if (item.state !== undefined && !['normal','active','done','muted','waiting'].includes(item.state)) fail(`Invalid actor state: ${key}`);
        if(item.opacity!==undefined&&(!Number.isFinite(item.opacity)||item.opacity<0||item.opacity>1))fail(`Invalid opacity: ${key}`);
        validateVisualFields(spec.actors.find(a=>a.id===key),item);
      }
      if (!Array.isArray(frame.links) || frame.links.some(link=>!record(link)||!Object.hasOwn(frame.items,link.from)||!Object.hasOwn(frame.items,link.to)||link.from===link.to)) fail(`Invalid links in scene ${i}`);
    }
  }
  return spec;
}
