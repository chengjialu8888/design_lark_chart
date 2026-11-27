/** Presets resolve before validation, audit and export. Unstyled legacy inputs stay untouched. */
export const stylePresets = Object.freeze({
  compact: {
    label: '示例紧凑风', variant: 'plain',
    presentation: {density:'compact',navigation:'pills',motion:'packet',legend:'auto',
      canvas:{wideWidth:720,narrowWidth:380,maxScale:1.35},
      transition:{duration:720,easing:[.22,.9,.24,1]}},
    composition: 'Compact nodes inside quiet ownership boundaries; retain object identity and reserve route lanes.'
  },
  module: {
    label: '架构模块风', variant:'module',
    presentation:{density:'regular',navigation:'pills',motion:'packet',legend:'auto',
      canvas:{wideWidth:720,narrowWidth:380,maxScale:1.35},
      transition:{duration:720,easing:[.22,.9,.24,1]}},
    composition:'Arrange modules by responsibility and system boundary; avoid repeated equal-width cards.'
  },
  sequence: {
    label:'调用时序风',variant:'plain',
    presentation:{density:'compact',navigation:'pills',motion:'pointer',legend:'auto',
      canvas:{wideWidth:720,narrowWidth:380,maxScale:1.35},
      transition:{duration:720,easing:[.22,.9,.24,1]}},
    composition:'Keep participants fixed; use separate call, return and retry lanes. Waiting is not acknowledgement.'
  }
});

/** Labels are accepted at the authoring boundary; persisted data uses stable IDs. */
export function styleId(selection) {
  if(Object.hasOwn(stylePresets,selection))return selection;
  const id=Object.keys(stylePresets).find(id=>stylePresets[id].label===selection);
  if(id)return id;
  throw new Error(`Unknown presentation style: ${selection}; choose compact (示例紧凑风), module (架构模块风) or sequence (调用时序风)`);
}

export function resolveStyle(spec, selection) {
  const choice = selection ?? spec?.presentation?.style;
  if(choice===undefined)return spec;
  const style=styleId(choice);
  if(spec?.version!==2)throw new Error('Presentation styles require scene schema v2');
  const preset=stylePresets[style],explicit=spec.presentation||{};
  for(const key of ['canvas','transition'])if(explicit[key]!==undefined&&
    (!explicit[key]||typeof explicit[key]!=='object'||Array.isArray(explicit[key])))
    throw new Error(`Invalid ${key}`);
  const presentation={...structuredClone(preset.presentation),...explicit,style};
  for(const key of ['canvas','transition'])if(explicit[key]!==undefined)
    presentation[key]={...structuredClone(preset.presentation[key]),...explicit[key]};
  return {...spec,presentation,actors:spec.actors.map(actor=>({
    ...actor,visual:actor.visual??{variant:preset.variant,...(actor.kind==='group'?{avatar:'none'}:{})}
  }))};
}

/** New authoring opts in explicitly; existing JSON never changes merely by being exported. */
export function newStory(spec, style=spec?.presentation?.style??'compact') {
  style=styleId(style);
  resolveStyle(spec,style);
  // Store the authorial choice, not materialized defaults that would later look
  // like explicit actor overrides. Export embeds the fully resolved data.
  return {...spec,presentation:{...spec.presentation,style}};
}
