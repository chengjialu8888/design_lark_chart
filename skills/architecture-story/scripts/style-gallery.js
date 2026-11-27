// Offline authoring handoff: expose the choice as text and portable JSON.
(()=>{
  const examples=JSON.parse(document.getElementById('style-examples').textContent);
  const labels=JSON.parse(document.getElementById('style-labels').textContent);
  const buttons=[...document.querySelectorAll('nav [data-style]')];
  const adoption=document.getElementById('adoption');
  const request=document.getElementById('style-request');
  const status=document.getElementById('choice-status');
  const download=document.getElementById('download-template');
  let selected='compact',blobURL;
  function choose(id){
    if(!Object.hasOwn(examples,id))return;
    selected=id;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.style===id)));
    document.querySelectorAll('main>section[data-example]').forEach(section=>{
      if(section.id!==id&&!section.hidden){
        const play=section.querySelector('[data-play]');
        if(play?.textContent==='暂停')play.click();
      }
      section.hidden=section.id!==id;
    });
    adoption.hidden=true;
    status.textContent='';
    if(blobURL){URL.revokeObjectURL(blobURL);blobURL=undefined;}
    download.removeAttribute('href');
    window.dispatchEvent(new Event('resize'));
  }
  buttons.forEach(button=>button.onclick=()=>choose(button.dataset.style));
  document.getElementById('adopt-style').onclick=()=>{
    request.value=`请用 architecture-story 的「${labels[selected]}」绘制当前需求，并在故事 JSON 中保存 presentation.style: "${selected}"。按该风格示例组织节点、图例、箭头和边框。`;
    if(blobURL)URL.revokeObjectURL(blobURL);
    blobURL=URL.createObjectURL(new Blob([JSON.stringify(examples[selected],null,2)+'\n'],{type:'application/json'}));
    download.href=blobURL;
    download.download=`architecture-story-${selected}.json`;
    adoption.hidden=false;
    status.textContent=`已选择${labels[selected]}。复制指令发给助手，或下载示例 JSON。`;
    request.focus();
    request.select();
  };
  document.getElementById('copy-request').onclick=async()=>{
    try{
      await navigator.clipboard.writeText(request.value);
      status.textContent='指令已复制，可粘贴到会话中。';
    }catch{
      request.focus();request.select();
      status.textContent='请复制已选中的指令，再粘贴到会话中。';
    }
  };
})();
