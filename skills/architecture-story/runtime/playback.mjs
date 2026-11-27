/** The default preserves existing stories; presentation is an explicit author choice. */
export function normalizePlayback(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('playback: expected an object');
  if (Object.keys(value).some(key => !['mode', 'end', 'selector', 'controls', 'autoplay'].includes(key))) throw new Error('playback: unknown option');
  const {mode = 'interactive', end = 'replay', selector = false, controls = 'minimal', autoplay = mode === 'presentation'} = value;
  if (!['interactive', 'presentation'].includes(mode)) throw new Error('playback.mode: expected interactive or presentation');
  if (!['loop', 'replay'].includes(end)) throw new Error('playback.end: expected loop or replay');
  if (typeof selector !== 'boolean') throw new Error('playback.selector: expected boolean');
  if (!['minimal', 'full'].includes(controls)) throw new Error('playback.controls: expected minimal or full');
  if (typeof autoplay !== 'boolean') throw new Error('playback.autoplay: expected boolean');
  return {mode, end, selector, controls, autoplay};
}

/** Shared presentation chrome and lifecycle. Renderers retain ownership of their clocks. */
export function createPlayback(root, defaults, hooks) {
  let options = normalizePlayback(defaults), ready = false, inView = false;
  let pendingStart = false, resumeAfterVisible = false, ended = false, runs = 0, started = false, expanded = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = hooks.stage;
  const document = root.ownerDocument;
  const originalRole = stage.getAttribute('role');
  const originalTabIndex = stage.getAttribute('tabindex');
  // Interactive buttons must not live inside an atomic role=img accessibility node.
  stage.setAttribute('role', 'group');
  stage.tabIndex = 0;
  stage.setAttribute('aria-keyshortcuts', 'Space Enter');
  stage.style.position = 'relative';
  const style = document.createElement('style');
  style.textContent = `#${root.id} [data-playback-hidden]{display:none!important}
    #${root.id} .playback-overlay{position:absolute;inset:0;z-index:20;display:grid;place-content:center;gap:10px;justify-items:center;background:color-mix(in srgb,var(--background) 55%,transparent);backdrop-filter:blur(2px)}
    #${root.id} .playback-overlay[hidden],#${root.id} .playback-float[hidden],#${root.id} .playback-options [hidden]{display:none!important}
    #${root.id} .playback-float{position:absolute;right:12px;bottom:12px;z-index:21;display:flex;gap:4px;align-items:center;padding:4px;border:1px solid var(--border);border-radius:10px;background:var(--background);box-shadow:0 3px 14px #00000008;opacity:0;transform:translateY(4px);transition:opacity .18s,transform .18s}
    #${root.id} .playback-float:hover,#${root.id} .playback-float:focus-within,#${root.id} [data-menu-open="true"] .playback-float{opacity:1;transform:none}
    #${root.id} [data-playback-controls="minimal"]{cursor:pointer}
    #${root.id} .playback-float .btn{min-width:30px;min-height:30px;padding:4px 8px;border:0;font-size:12px}
    #${root.id} .playback-hint{position:absolute;left:14px;bottom:12px;z-index:10;pointer-events:none;color:var(--muted-foreground);font-size:10px}
    #${root.id} .playback-hint[hidden]{display:none}
    #${root.id} .playback-hint span{display:flex;gap:7px;align-items:center;padding:5px 9px;border-radius:8px;background:var(--background);border:1px solid var(--border)}
    #${root.id} .playback-hint span::before{content:'';border-left:6px solid currentColor;border-top:4px solid transparent;border-bottom:4px solid transparent}
    #${root.id} .playback-meter{position:absolute;bottom:0;left:14px;right:14px;height:2px;border-radius:2px;overflow:hidden;pointer-events:none;background:color-mix(in srgb,var(--border) 50%,transparent);z-index:5}
    #${root.id} .playback-meter i{display:block;height:100%;width:0;background:var(--viz-series-1);opacity:.6}
    #${root.id} .playback-overlay>span{font-size:11px;color:var(--muted-foreground)}
    #${root.id} .playback-overlay .btn{font-size:12px;padding:8px 14px;border-radius:20px}
    #${root.id} [data-playback-controls="minimal"]:focus-visible{outline:2px solid var(--ring);outline-offset:4px}
    #${root.id} .playback-options{display:flex;gap:12px;align-items:end;flex-wrap:wrap}
    #${root.id} .playback-field{display:grid;gap:5px;max-width:100%}
    @media(hover:none){#${root.id} .playback-float{opacity:.8;transform:none}#${root.id} .playback-float .btn{min-width:44px;min-height:44px}}
    @media(prefers-reduced-motion:reduce){#${root.id} .playback-float{transition:none}}`;
  root.append(style);
  const overlay = document.createElement('div');overlay.className='playback-overlay';overlay.hidden=true;
  const message = document.createElement('span');message.textContent='演示结束';
  const restart = document.createElement('button');restart.type='button';restart.className='btn btn-primary';restart.textContent='↻ 重播';
  overlay.append(message,restart);stage.append(overlay);
  const floating = document.createElement('div');floating.className='playback-float';floating.hidden=true;
  const toggle = document.createElement('button');toggle.type='button';toggle.className='btn';toggle.textContent='暂停';
  const menu = document.createElement('button');menu.type='button';menu.className='btn';menu.textContent='⋯';menu.setAttribute('aria-label','展开分镜菜单');menu.setAttribute('aria-expanded','false');
  floating.append(toggle,menu);stage.append(floating);
  const hint=document.createElement('div');hint.className='playback-hint';const hintText=document.createElement('span');hintText.textContent='点击画面播放';hint.append(hintText);stage.append(hint);
  const meter=document.createElement('div');meter.className='playback-meter';meter.setAttribute('aria-hidden','true');meter.append(document.createElement('i'));stage.append(meter);
  const chooser = document.createElement('div');chooser.className='playback-options';
  function select(labelText, entries) {
    const label=document.createElement('label');label.className='playback-field form-label';
    const text=document.createElement('span');text.textContent=labelText;
    const input=document.createElement('select');input.className='form-select';input.setAttribute('aria-label',labelText);
    for(const [value,caption] of entries){const option=document.createElement('option');option.value=value;option.textContent=caption;input.append(option);}
    label.append(text,input);chooser.append(label);return input;
  }
  const modeSelect=select('播放模式',[['presentation','演示模式'],['interactive','交互模式']]);
  const endSelect=select('播放结束后',[['loop','循环播放'],['replay','显示重播遮罩']]);
  if(options.selector)root.insertBefore(chooser,root.firstChild);
  function sync() {
    const playing=hooks.isPlaying();
    if(playing){started=true;hint.hidden=true;}
    root.dataset.playing=String(playing);
    toggle.textContent=playing?'Ⅱ':'▷';toggle.setAttribute('aria-label',playing?'暂停':'继续播放');toggle.title=playing?'暂停':'继续播放';
    floating.hidden=(options.controls!=='minimal'&&options.mode!=='presentation')||!overlay.hidden;
    hint.hidden=started||!overlay.hidden||options.controls!=='minimal';
    meter.hidden=options.controls!=='minimal';
    const progress=root.querySelector('.progress');
    meter.firstChild.style.width=`${Math.max(0,Math.min(100,Number(progress?.getAttribute('aria-valuenow'))||0))}%`;
  }
  function chrome() {
    root.dataset.playbackMode=options.mode;
    stage.dataset.playbackControls=options.controls;
    stage.dataset.menuOpen=String(expanded);
    for(const el of hooks.controls)el.toggleAttribute('data-playback-hidden',!expanded&&(options.controls==='minimal'||options.mode==='presentation'));
    menu.setAttribute('aria-expanded',String(expanded));menu.setAttribute('aria-label',expanded?'收起分镜菜单':'展开分镜菜单');
    modeSelect.value=options.mode;endSelect.value=options.end;endSelect.parentElement.hidden=options.mode!=='presentation';
    sync();
  }
  function standby() {overlay.hidden=false;message.textContent='已启用减少动态效果';restart.textContent='播放演示';sync();}
  function begin() {pendingStart=false;resumeAfterVisible=false;ended=false;started=true;overlay.hidden=true;root.dataset.playbackRuns=String(++runs);hooks.start();sync();}
  function visibility() {
    if(!ready)return;
    if(document.hidden||!inView){
      if(hooks.isPlaying()){resumeAfterVisible=options.mode==='presentation';hooks.pause();sync();}
    } else {
      if(pendingStart)begin();
      else if(resumeAfterVisible&&!ended){resumeAfterVisible=false;hooks.resume();sync();}
    }
  }
  function configure(value, persist=false) {
    const next=normalizePlayback(value);
    // A host echo must not restart a running presentation.
    if(next.mode===options.mode&&next.end===options.end&&next.controls===options.controls&&next.autoplay===options.autoplay)return;
    hooks.pause();options={...next,selector:options.selector};pendingStart=false;resumeAfterVisible=false;ended=false;overlay.hidden=true;chrome();
    if(options.autoplay){
      if(reduced.matches)standby();else{pendingStart=true;visibility();}
    }
    if(persist)hooks.save?.();
  }
  modeSelect.addEventListener('change',()=>configure({...options,mode:modeSelect.value},true));
  endSelect.addEventListener('change',()=>configure({...options,end:endSelect.value},true));
  restart.addEventListener('click',()=>{begin();hooks.save?.();});
  function togglePlay() {
    resumeAfterVisible=false;pendingStart=false;
    if(hooks.isPlaying())hooks.pause();
    else if(ended)begin();
    else if(hooks.play)hooks.play();
    else hooks.resume();
    sync();
  }
  toggle.addEventListener('click',togglePlay);
  menu.addEventListener('click',()=>{expanded=!expanded;chrome();});
  const stageClick=event=>{
    if(options.controls!=='minimal'||event.target.closest('button,a,input,select,textarea,summary')||document.getSelection()?.toString())return;
    if(!overlay.hidden){begin();return;}togglePlay();
  };
  const stageKey=event=>{
    if(event.target!==stage||![' ','Enter'].includes(event.key))return;
    event.preventDefault();if(!event.repeat){if(!overlay.hidden)begin();else togglePlay();}
  };
  stage.addEventListener('click',stageClick);stage.addEventListener('keydown',stageKey);
  document.addEventListener('visibilitychange',visibility);
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;visibility();},{threshold:0}):null;
  if(observer)observer.observe(root);else inView=true;
  const reducedChanged=()=>{if(reduced.matches&&options.mode==='presentation'){hooks.pause();pendingStart=false;resumeAfterVisible=false;standby();}};
  reduced.addEventListener('change',reducedChanged);
  const initial=window.openai?.widgetState?.privateContent;
  if(initial?.id===root.id&&initial.playback){try{options={...normalizePlayback(initial.playback),selector:options.selector};}catch{}}
  chrome();
  return {
    get options(){return {...options};},
    get interactive(){return options.mode==='interactive';},
    sync,
    reset(){ended=false;overlay.hidden=true;sync();},
    init(){ready=true;if(options.autoplay){if(reduced.matches)standby();else pendingStart=true;}visibility();},
    finish(){
      if(options.mode!=='presentation'&&options.controls!=='minimal')return false;
      if(options.end==='loop'){begin();return true;}
      hooks.pause();ended=true;resumeAfterVisible=false;overlay.hidden=false;message.textContent='演示结束';restart.textContent='↻ 重播';sync();return true;
    },
    restore(state){const saved=state?.privateContent;if(saved?.id===root.id&&saved.playback){try{configure(saved.playback);}catch{}}},
    destroy(){ready=false;observer?.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reducedChanged);stage.removeEventListener('click',stageClick);stage.removeEventListener('keydown',stageKey);hooks.pause();if(originalRole)stage.setAttribute('role',originalRole);else stage.removeAttribute('role');if(originalTabIndex===null)stage.removeAttribute('tabindex');else stage.setAttribute('tabindex',originalTabIndex);}
  };
}
