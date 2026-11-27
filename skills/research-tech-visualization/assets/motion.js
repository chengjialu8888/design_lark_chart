for (const root of document.querySelectorAll('[data-motion-root]')) {
  const controls = root.querySelector('[data-motion-controls]');
  const status = root.querySelector('[data-motion-status]');
  const svg = root.querySelector('svg');
  const edges = [...root.querySelectorAll('[data-motion-edge]')];
  const stages = [...root.querySelectorAll('[data-motion-stage]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fixed = new URLSearchParams(location.search).get('motion') === 'static';
  const mode = controls.querySelector('select');
  const play = controls.querySelector('[data-action="play"]');
  const pause = controls.querySelector('[data-action="pause"]');
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  layer.setAttribute('data-motion-decoration', '');
  layer.setAttribute('aria-hidden', 'true');
  const overlays = edges.map(edge => {
    const overlay = edge.cloneNode(false);
    for (const attribute of [...overlay.attributes]) {
      if (attribute.name.startsWith('data-') || ['id', 'marker-end', 'class'].includes(attribute.name)) overlay.removeAttribute(attribute.name);
    }
    overlay.setAttribute('marker-end', 'none');
    overlay.setAttribute('stroke', '#23a4c0');
    overlay.setAttribute('stroke-width', '4');
    overlay.setAttribute('stroke-linecap', 'round');
    layer.appendChild(overlay);
    return overlay;
  });
  let elapsed = 0;
  let running = false;
  let frame = 0;
  let previousTime = null;
  const duration = 6000;
  const draw = () => {
    const progress = Math.min(elapsed / duration, 1);
    root.dataset.motionProgress = progress.toFixed(3);
    stages.forEach((stage, index) => stage.classList.toggle('current-stage', mode.value === 'focus' && index === Math.min(stages.length - 1, Math.floor(progress * stages.length))));
    overlays.forEach((overlay, index) => {
      const length = edges[index].getTotalLength();
      overlay.style.display = mode.value === 'focus' ? 'none' : '';
      if (mode.value === 'flow') {
        overlay.setAttribute('stroke-dasharray', '12 32');
        overlay.setAttribute('stroke-dashoffset', String(-(elapsed / 1000 * 90 + index * 11) % 44));
      } else {
        const local = Math.max(0, Math.min(1, progress * overlays.length - index));
        overlay.setAttribute('stroke-dasharray', `${length} ${length}`);
        overlay.setAttribute('stroke-dashoffset', String(length * (1 - local)));
      }
    });
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(frame);
    previousTime = null;
    play.disabled = fixed || reduced.matches;
    pause.disabled = true;
    root.dataset.motionState = 'paused';
  };
  const complete = () => {
    stop();
    elapsed = duration;
    layer.style.display = 'none';
    stages.forEach(stage => stage.classList.remove('current-stage'));
    root.dataset.motionState = 'static';
    root.dataset.motionProgress = '1.000';
    status.textContent = reduced.matches ? '减少动态效果：显示完整静态图。' : '完整静态图；播放仅为机制示意，不表示实测速度。';
  };
  const tick = time => {
    if (!running) return;
    if (previousTime !== null) elapsed += time - previousTime;
    previousTime = time;
    if (elapsed >= duration && mode.value === 'flow') elapsed %= duration;
    draw();
    if (elapsed >= duration) {
      stop();
      root.dataset.motionState = 'complete';
      status.textContent = '讲解完成；所有节点和关系始终保留。';
    } else frame = requestAnimationFrame(tick);
  };
  controls.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (!action || fixed || reduced.matches) return;
    if (action === 'static') return complete();
    if (action === 'pause') {
      stop();
      status.textContent = '播放已暂停。';
      return;
    }
    if (action === 'prev' || action === 'next') {
      stop();
      elapsed = Math.max(0, Math.min(duration, elapsed + (action === 'next' ? 1 : -1) * duration / 3));
      layer.style.display = '';
      draw();
      status.textContent = `讲解位置 ${Math.round(elapsed / duration * 3)} / 3；不是实测时间。`;
      return;
    }
    if (running) return;
    if (elapsed >= duration) elapsed = 0;
    running = true;
    previousTime = null;
    layer.style.display = '';
    play.disabled = true;
    pause.disabled = false;
    root.dataset.motionState = 'playing';
    status.textContent = mode.value === 'flow' ? '正在循环展示方向；可随时暂停。' : '正在播放一次机制讲解。';
    frame = requestAnimationFrame(tick);
  });
  mode.addEventListener('change', complete);
  const preferences = () => {
    complete();
    controls.hidden = fixed || reduced.matches;
  };
  reduced.addEventListener('change', preferences);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) {
      stop();
      status.textContent = '页面不可见，播放已暂停。';
    }
  });
  window.addEventListener('beforeprint', complete);
  svg.appendChild(layer);
  preferences();
}
