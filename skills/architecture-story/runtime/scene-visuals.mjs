import {semanticIcons} from './icons.mjs';

/** Legend swatches come from actual current links, including their overrides. */
export function legendEntries(links) {
  const names={call:'调用 / 执行',return:'返回',message:'消息',ownership:'归属',dependency:'依赖'};
  const entries=new Map();
  for(const link of links){
    const style={pattern:link.style?.pattern||'solid',tone:link.style?.tone||'neutral',
      arrow:link.style?.arrow!==false,head:link.style?.head||'open'};
    const label=link.legend||names[link.kind]||'连接';
    const key=JSON.stringify({label,...style});
    if(!entries.has(key))entries.set(key,{label,...style});
  }
  return [...entries.values()];
}

/** Finite visual progress is derived from the scene clock, never a second timer. */
export function visualProgress(age, duration, reduced = false) {
  if (reduced) return 1;
  const t = Math.max(0, Math.min(1, age / duration));
  return t * t * (3 - 2 * t);
}

/** One envelope for a finite signal and a gentle arrival, without pulsing. */
export function transferVisual(age, travel, soft = false, reduced = false) {
  if(reduced)return {signal:0,arrival:0,radius:0};
  const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  if(!soft){
    const click=Math.max(0,(age-travel)/420);
    return {signal:age<travel?Math.min(1,age/100):Math.max(0,1-click),arrival:age>=travel&&click<1?(1-click)*.65:0,radius:6+click*14};
  }
  const fade=Math.min(240,travel*.2),after=age-travel;
  const signal=smooth(age/fade)*smooth((travel-age)/fade);
  const arrival=after>=0?smooth(after/140)*(1-smooth(after/650))*.3:0;
  return {signal,arrival,radius:5+smooth(after/650)*5};
}

export function validateVisualFields(actor, item) {
  const fail = message => { throw new Error(message); };
  const record = v => v && typeof v === 'object' && !Array.isArray(v);
  const text = v => typeof v === 'string' && v.trim().length > 0;
  const keys = (v, allowed, name) => {
    if (!record(v) || Object.keys(v).some(k => !allowed.includes(k))) fail(`Invalid ${name}`);
  };
  if (actor.visual !== undefined) {
    const v = actor.visual;
    keys(v, ['variant', 'avatar', 'avatarText', 'side', 'tone', 'entrance','icon','outline'], 'actor.visual');
    if (!['module', 'plain', 'chat'].includes(v.variant)) fail('Invalid visual variant');
    if (v.variant === 'chat' && actor.kind !== 'message') fail('Chat appearance requires a message actor');
    if (v.avatar !== undefined && !['person', 'bot', 'branch', 'status', 'initials', 'none'].includes(v.avatar)) fail('Invalid avatar');
    if (v.avatar === 'initials' && (!text(v.avatarText) || [...v.avatarText].length > 4)) fail('Initials avatar requires 1–4 characters');
    if (v.avatarText !== undefined && v.avatar !== 'initials') fail('avatarText requires initials avatar');
    if (v.side !== undefined && !['left', 'right'].includes(v.side)) fail('Invalid avatar side');
    if (v.tone !== undefined && !['neutral', 'accent', 'success', 'warning'].includes(v.tone)) fail('Invalid visual tone');
    if (v.entrance !== undefined && !['fade', 'pop'].includes(v.entrance)) fail('Invalid entrance');
    if(v.icon!==undefined&&!Object.hasOwn(semanticIcons,v.icon))fail('Unknown semantic icon');
    if(v.outline!==undefined&&!['solid','dashed','dotted'].includes(v.outline))fail('Invalid outline');
  }
  if (item?.visual !== undefined) {
    keys(item.visual, ['tone', 'badge'], 'item.visual');
    if (actor.visual?.variant !== 'plain') fail('Frame visual requires a plain actor');
    if (item.visual.tone !== undefined && !['neutral', 'accent', 'success', 'warning'].includes(item.visual.tone)) fail('Invalid frame visual tone');
    if (item.visual.badge !== undefined && (!text(item.visual.badge) || [...item.visual.badge].length > 8)) fail('Badge requires 1–8 characters');
  }
  if (item?.metric !== undefined) {
    const m = item.metric;
    keys(m, ['series', 'max', 'duration', 'delay', 'stagger', 'legend', 'labelSpace'], 'item.metric');
    if (actor.kind !== 'document' || item.contains !== undefined || item.lines.length) fail('Metric requires a document actor with empty lines and no children');
    if (!Array.isArray(m.series) || m.series.length !== 2) fail('Metric requires two series');
    for (const s of m.series) {
      keys(s, ['label', 'value', 'display', 'tone'], 'metric series');
      if (!text(s.label) || !text(s.display) || !Number.isFinite(s.value) || s.value < 0 ||
          !['neutral', 'accent', 'success', 'warning'].includes(s.tone)) fail('Invalid metric series');
    }
    if (!Number.isFinite(m.max) || m.max <= 0 || m.series.some(s => s.value > m.max)) fail('Metric max must contain both values');
    for (const [key, minimum, maximum] of [['duration', 100, 5000], ['delay', 0, 5000], ['stagger', 0, 1000]]) {
      if (m[key] !== undefined && (!Number.isFinite(m[key]) || m[key] < minimum || m[key] > maximum)) fail(`Invalid metric ${key}`);
    }
    if (m.legend !== undefined && typeof m.legend !== 'boolean') fail('Invalid metric legend');
    if (m.labelSpace !== undefined && (!Number.isFinite(m.labelSpace) || m.labelSpace < 24 || m.labelSpace > 160)) fail('Invalid metric labelSpace');
  }
}
