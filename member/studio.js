/* Member tools shared by four independent static sites. */
(() => {
  'use strict';
  const config = window.BOOTCAMP_CONFIG;
  if (!config || document.getElementById('bc-studio')) return;
  const site = config.site;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const empty = () => ({ bookmarks: [], read: [], checklist: [], notes: {}, preset: null, rsvp: null });
  const normalize = v => ({...empty(), ...(v && typeof v === 'object' && !Array.isArray(v) ? v : {}), bookmarks: Array.isArray(v?.bookmarks) ? v.bookmarks.filter(x => typeof x === 'string') : [], read: Array.isArray(v?.read) ? v.read.filter(x => typeof x === 'string') : [], checklist: Array.isArray(v?.checklist) ? v.checklist.filter(x => typeof x === 'string') : [], notes: v?.notes && typeof v.notes === 'object' && !Array.isArray(v.notes) ? v.notes : {} });
  const guestKey = `bootcamp:${site}:guest:v1`;
  function guest() { try { return normalize(JSON.parse(localStorage.getItem(guestKey))); } catch { return empty(); } }
  let state = guest(), user = null, client = null, saving = false, authReady = false, authMode = 'signup', toastTimer, sessionEpoch = 0, cloudLoaded = false, revision = null;
  const titles = {
    'fluid-landing': ['Motion playground', '내 손끝에 맞는 움직임.', '세 가지 모션을 비교하고, 마음에 드는 설정을 내 실험실에 저장하세요.'],
    'ma-admissions': ['My Gangwon collection', '나만의 강원을 모으다.', '풍경의 성질로 지역을 고르고, 마음에 남은 장소와 디자인 설정을 간직하세요.'],
    'my-blog': ['Personal reading room', '읽고, 남기고, 다시 발견하기.', '관심 있는 글을 찾고 나만의 서재에 모아보세요.'],
    'invitation': ['With our favorite people', '함께할 순간을 기다립니다.', '참석 여부를 남기고, 소중한 날을 캘린더에 담아주세요.']
  };
  if (!titles[site]) return;
  const [eyebrow, title, description] = titles[site];
  const studio = document.createElement('section');
  studio.id = 'bc-studio'; studio.className = 'bc bc-studio'; studio.dataset.site = site;
  studio.setAttribute('aria-labelledby', 'bc-title');
  studio.innerHTML = `<div class="bc-head"><div><p class="bc-eyebrow">${eyebrow}</p><h2 id="bc-title">${title}</h2><p class="bc-sub">${description}</p></div><span class="bc-status" id="bc-storage-status">이 기기에 저장</span></div><div id="bc-content"></div><div class="bc-row" style="margin-top:24px"><button class="bc-btn bc-btn-primary" data-bc-auth>회원가입 · 로그인</button><p class="bc-note" id="bc-storage-note">로그인하면 내 기록을 다른 기기에서도 이어볼 수 있어요.</p></div>`;
  const anchor = site === 'invitation' ? $('#location') : $('.hero');
  if (anchor) anchor.insertAdjacentElement(site === 'invitation' ? 'beforebegin' : 'afterend', studio);
  else ($('main') || document.body).prepend(studio);
  const floating = document.createElement('div');floating.className = 'bc bc-float';floating.dataset.site = site;
  floating.innerHTML = `<button class="bc-btn" id="bc-open-studio">${site==='invitation'?'참석 응답':'내 공간'}</button><button class="bc-btn bc-btn-primary" data-bc-auth>회원가입</button>`;
  document.body.append(floating);
  const toastEl = document.createElement('div');toastEl.className='bc bc-toast';toastEl.hidden=true;toastEl.setAttribute('role','status');toastEl.setAttribute('aria-live','polite');document.body.append(toastEl);
  const dialog = document.createElement('dialog');dialog.className='bc bc-dialog';dialog.dataset.site=site;dialog.setAttribute('aria-labelledby','bc-auth-title');document.body.append(dialog);
  const panel = $('#bc-content');
  function toast(message) { clearTimeout(toastTimer);toastEl.textContent=message;toastEl.hidden=false;toastTimer=setTimeout(()=>toastEl.hidden=true,4500); }
  function celebrate() { if(matchMedia('(prefers-reduced-motion: reduce)').matches)return; for(let i=0;i<18;i++){const p=document.createElement('i');p.className='bc-spark';p.style.cssText=`left:${50+(Math.random()-.5)*20}%;top:45%;background:${['#adc4ff','#e2c091','#b0d8bd'][i%3]};--dx:${(Math.random()-.5)*330}px;--dy:${70+Math.random()*200}px`;document.body.append(p);setTimeout(()=>p.remove(),950);} }
  function safeError(error) {
    const code=error?.code || '';const msg=String(error?.message||'');
    if(code==='invalid_credentials'||/Invalid login credentials/i.test(msg))return '이메일 또는 비밀번호를 확인해 주세요.';
    if(code==='email_not_confirmed')return '이메일 인증을 먼저 완료해 주세요.';
    if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||/rate limit/i.test(msg))return '요청이 많아 잠시 제한되었습니다. 조금 뒤 다시 시도해 주세요.';
    if(code==='email_address_not_authorized')return '현재 인증 메일을 보낼 수 없는 주소입니다. 사이트 운영자의 메일 발송 설정이 필요합니다.';
    if(code==='user_already_exists')return '이미 가입한 이메일입니다. 로그인해 주세요.';
    if(code==='weak_password')return '더 긴 비밀번호를 사용해 주세요. 영문, 숫자, 기호를 섞으면 좋습니다.';
    if(/fetch|network|timeout|load/i.test(msg))return '연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
    return '요청을 완료하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
  }
  function renderStatus() {
    $('#bc-storage-status').textContent = saving ? '저장 중…' : user ? (cloudLoaded?'계정에 저장':'계정 기록 불러오는 중') : '이 기기에 저장';
    $$('[data-bc-auth]').forEach(b=>b.textContent=user?'내 계정':(b.closest('.bc-float')?'회원가입':'회원가입 · 로그인'));
    $('#bc-storage-note').textContent=user?'내 기록은 내 계정에서만 볼 수 있습니다.':'로그인하면 내 기록을 다른 기기에서도 이어볼 수 있어요.';
  }
  async function save(next, message='저장했습니다.') {
    if(saving){toast('저장 중입니다. 잠시 기다려 주세요.');return false;}
    if(user&&!cloudLoaded){toast('계정 기록을 먼저 불러와야 합니다. 내 계정에서 다시 불러오기를 눌러주세요.');return false;}
    saving=true;renderStatus();const epoch=sessionEpoch;
    try {
      const clean=normalize(next);
      if(new TextEncoder().encode(JSON.stringify(clean)).length>60000)throw new Error('Data limit');
      if(user){
        const payload={user_id:user.id,site_id:site,data_key:'workspace',value:clean,updated_at:new Date().toISOString(),revision:revision===null?0:revision+1};
        const request=revision===null?client.from('bootcamp_user_data').insert(payload):client.from('bootcamp_user_data').update(payload).eq('user_id',user.id).eq('site_id',site).eq('data_key','workspace').eq('revision',revision);
        const {data,error}=await request.select('revision');
        if(error?.code==='23505'||(!error&&!data?.length)){cloudLoaded=false;throw new Error('Conflict');}
        if(error)throw error;if(epoch===sessionEpoch)revision=data[0].revision;
      }
      else localStorage.setItem(guestKey,JSON.stringify(clean));
      if(epoch!==sessionEpoch)return false;
      state=clean;renderDynamic();toast(user?message:`${message} (이 기기)`);return true;
    }catch(e){toast(e?.message==='Conflict'?'다른 탭의 기록이 변경되어 저장하지 못했습니다. 내 계정에서 최신 기록을 다시 불러와 주세요.':e?.message==='Data limit'?'저장 공간이 가득 찼습니다. 메모 일부를 줄여주세요.':'저장하지 못했습니다. 기록을 유지한 채 다시 시도해 주세요.');return false;}
    finally{saving=false;renderStatus();}
  }
  async function toggle(kind,id){const arr=state[kind];await save({...state,[kind]:arr.includes(id)?arr.filter(x=>x!==id):[...arr,id]},arr.includes(id)?'보관함에서 해제했습니다.':'보관함에 담았습니다.');}
  function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function openAuth(mode){authMode=mode||(authMode==='reset'?'reset':'signup');renderAuth();if(!dialog.open)dialog.showModal();}
  function authMessage(s){const e=$('#bc-auth-message');if(e)e.textContent=s;}
  function renderAuth(){
    if(user&&authMode!=='reset'){dialog.innerHTML=`<div class="bc-head"><h2 id="bc-auth-title">내 계정</h2><button class="bc-close" data-close aria-label="닫기">×</button></div><p class="bc-note">${esc(user.email)}</p><p class="bc-auth-message" id="bc-auth-message" role="status"></p><div class="bc-stack" style="margin-top:22px"><button class="bc-btn" id="bc-reload">계정 기록 다시 불러오기</button><button class="bc-btn" id="bc-import">이 기기의 방문자 기록 가져오기</button><button class="bc-btn" id="bc-export">내 기록 내려받기</button><button class="bc-btn" id="bc-signout">로그아웃</button></div><p class="bc-note bc-modal-foot">네 사이트에서 같은 이메일과 비밀번호를 사용할 수 있습니다. 사이트 주소가 다르면 각각 로그인해 주세요.</p>`;
      $('#bc-reload').onclick=()=>{if(saving)return authMessage('저장이 끝난 뒤 다시 시도해 주세요.');loadAccount(user);};$('#bc-export').onclick=()=>download(`${site}-my-data.json`,JSON.stringify(state,null,2));
      $('#bc-import').onclick=async()=>{const local=guest();const merged={...state,bookmarks:[...new Set([...state.bookmarks,...local.bookmarks])],read:[...new Set([...state.read,...local.read])],checklist:[...new Set([...state.checklist,...local.checklist])],notes:{...local.notes,...state.notes},preset:state.preset||local.preset,rsvp:state.rsvp||local.rsvp};if(await save(merged,'방문자 기록을 계정에 합쳤습니다.'))authMessage('가져왔습니다. 기존 계정 기록을 우선 보존했습니다.');};
      $('#bc-signout').onclick=async()=>{if(saving)return authMessage('저장이 끝난 뒤 다시 시도해 주세요.');const {error}=await client.auth.signOut({scope:'local'});if(error)authMessage(safeError(error));else {dialog.close();toast('로그아웃했습니다.');}};
    }else{
      const isSignup=authMode==='signup',forgot=authMode==='forgot',reset=authMode==='reset';
      dialog.innerHTML=`<div class="bc-head"><div><p class="bc-eyebrow">Your own space</p><h2 id="bc-auth-title">${reset?'새 비밀번호':forgot?'비밀번호 찾기':'좋은 발견을, 내 공간에.'}</h2></div><button class="bc-close" data-close aria-label="닫기">×</button></div>${!forgot&&!reset?`<div class="bc-tabs"><button class="bc-btn" data-mode="signup" aria-pressed="${isSignup}">회원가입</button><button class="bc-btn" data-mode="login" aria-pressed="${!isSignup}">로그인</button></div>`:''}<form class="bc-auth-form" id="bc-auth-form">${!reset?'<label class="bc-field">이메일<input name="email" type="email" required autocomplete="email" maxlength="254" placeholder="you@example.com"></label>':''}${!forgot?`<label class="bc-field">비밀번호<span class="bc-password"><input name="password" type="password" required minlength="${isSignup||reset?8:1}" maxlength="128" autocomplete="${isSignup||reset?'new-password':'current-password'}" placeholder="${isSignup||reset?'8자 이상 입력':'비밀번호 입력'}"><button class="bc-btn" type="button" id="bc-show-password" aria-label="비밀번호 표시">보기</button></span></label>${isSignup||reset?'<progress id="bc-password-strength" max="4" value="0" aria-label="비밀번호 강도"></progress>':''}`:''}${isSignup?'<p class="bc-note">이메일은 로그인과 인증에 사용합니다. 저장한 기록은 본인만 볼 수 있습니다.</p>':''}<button class="bc-btn bc-btn-primary" type="submit">${reset?'비밀번호 변경':forgot?'재설정 메일 받기':isSignup?'계정 만들기':'로그인'}</button><p class="bc-auth-message" id="bc-auth-message" role="status" aria-live="polite"></p></form><div class="bc-row bc-modal-foot"><button class="bc-btn" data-mode="${forgot||reset?'login':'forgot'}">${forgot||reset?'로그인으로 돌아가기':'비밀번호를 잊으셨나요?'}</button></div>`;
      $$('[data-mode]',dialog).forEach(b=>b.onclick=()=>{authMode=b.dataset.mode;renderAuth();});
      const pwd=$('input[name=password]',dialog);
      if(pwd){$('#bc-show-password').onclick=e=>{pwd.type=pwd.type==='password'?'text':'password';e.currentTarget.textContent=pwd.type==='password'?'보기':'숨김';};pwd.oninput=()=>{const strength=$('#bc-password-strength');if(strength)strength.value=Number(pwd.value.length>=8)+Number(pwd.value.length>=12)+Number(/[a-z]/i.test(pwd.value)&&/\d/.test(pwd.value))+Number(/[^a-z0-9]/i.test(pwd.value));};}
      $('#bc-auth-form').onsubmit=submitAuth;
    }
    $('[data-close]',dialog).onclick=()=>dialog.close();
  }
  function redirectUrl(){const u=new URL(config.home||'./',location.href);u.search='';u.hash='';return u.href;}
  async function submitAuth(event){
    event.preventDefault();const actionMode=authMode;if(!client||!authReady){authMessage('로그인 연결을 준비하지 못했습니다. 페이지를 새로고침하고 다시 시도해 주세요.');return;}
    const form=event.currentTarget,button=$('button[type=submit]',form),fd=new FormData(form);button.disabled=true;authMessage('연결 중…');
    try{const email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');let result;
      if(actionMode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirectUrl()}});
      else if(actionMode==='forgot')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});
      else if(actionMode==='reset')result=await client.auth.updateUser({password});
      else result=await client.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      if(actionMode==='forgot')authMessage('등록된 주소라면 재설정 메일이 발송됩니다. 받은 편지함을 확인해 주세요.');
      else if(actionMode==='reset'){authMode='login';dialog.close();loadAccount(result.data.user);toast('비밀번호를 변경했습니다.');}
      else if(actionMode==='signup'&&!result.data.session)authMessage('인증 메일을 확인해 주세요. 메일 인증을 완료한 뒤 로그인할 수 있습니다.');
      else{dialog.close();celebrate();toast('로그인했습니다. 내 기록을 불러옵니다.');}
    }catch(error){authMessage(safeError(error));}finally{button.disabled=false;}
  }
  dialog.addEventListener('close',()=>{$$('input[type=password]',dialog).forEach(input=>input.value='');});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-bc-auth]'))openAuth();});
  $('#bc-open-studio').onclick=()=>{studio.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};

  let renderFeature=()=>{};
  function renderDynamic(){renderFeature();renderStatus();}
  function inputPreset(ids,values){ids.forEach((id,i)=>{const input=document.getElementById(id);if(input&&Number.isFinite(Number(values[i]))){const n=Math.min(Number(input.max||Infinity),Math.max(Number(input.min||-Infinity),Number(values[i])));input.value=String(n);input.dispatchEvent(new Event('input',{bubbles:true}));}});}
  function getPreset(ids){return ids.map(id=>Number(document.getElementById(id)?.value||0));}
  function fluid(){
    panel.innerHTML=`<div class="bc-grid"><div class="bc-card"><h3>움직임의 성격을 고르세요</h3><div class="bc-row" id="bc-presets"><button class="bc-btn bc-chip" data-preset="0" aria-pressed="false">차분하게</button><button class="bc-btn bc-chip" data-preset="1" aria-pressed="false">경쾌하게</button><button class="bc-btn bc-chip" data-preset="2" aria-pressed="false">탄력 있게</button></div><svg class="bc-wave" viewBox="0 0 560 148" role="img" aria-label="세 가지 스프링의 정규화된 위치 응답 비교"><path d="M0 110H560 M0 40H560" stroke="#ffffff20" stroke-dasharray="4 5"/><g id="bc-curves"></g></svg><div class="bc-legend"><span>차분함</span><span>경쾌함</span><span>탄력</span></div><p class="bc-note" style="margin-top:12px">동일한 목표에 대한 모델의 응답 곡선입니다.</p><div class="bc-row" style="margin-top:18px"><button class="bc-btn bc-btn-primary" id="bc-save-preset">현재 실험값 저장</button><button class="bc-btn" id="bc-load-preset">내 설정 불러오기</button><a class="bc-btn" href="#instrument">실험실로 이동</a></div><p class="bc-note" id="bc-preset-info" style="margin-top:12px"></p></div><div class="bc-card"><p class="bc-eyebrow">Experiment journey</p><p class="bc-stat"><span id="bc-check-count">0</span><small> / 4 경험</small></p><div class="bc-meter"><span id="bc-check-progress"></span></div><div id="bc-checklist"></div></div></div>`;
    const presets=[[1.05,.55,0],[.85,.35,400],[.58,.55,650]],ids=['damping','response','initial-velocity'];
    const colors=['#d9e5ff','#9daeff','#81d7d6'];
    $('#bc-curves').innerHTML=presets.map((p,j)=>{let x=0,v=0,coords=[];const dt=.005,w=2*Math.PI/p[1];for(let i=0;i<=320;i++){v+=(-w*w*(x-1)-2*p[0]*w*v)*dt;x+=v*dt;if(i%2===0)coords.push(`${i/320*560},${110-x*70}`);}return `<polyline points="${coords.join(' ')}" fill="none" stroke="${colors[j]}" stroke-width="2" opacity=".9"/>`;}).join('');
    $$('[data-preset]',panel).forEach(b=>b.onclick=()=>{inputPreset(ids,presets[Number(b.dataset.preset)]);$$('[data-preset]',panel).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));toast(`${b.textContent} 설정을 실험실에 적용했습니다.`);});
    $('#bc-save-preset').onclick=()=>save({...state,preset:{values:getPreset(ids)}},'현재 모션 설정을 저장했습니다.');
    $('#bc-load-preset').onclick=()=>{if(!Array.isArray(state.preset?.values))return toast('아직 저장한 설정이 없습니다.');inputPreset(ids,state.preset.values);toast('저장한 모션을 불러왔습니다.');};
    const checks=['카드를 드래그하고 다시 잡아보기','움직이는 도중 방향 바꿔보기','세 가지 프리셋 비교하기','나만의 실험값 저장하기'];
    $('#bc-checklist').innerHTML=checks.map((c,i)=>`<label class="bc-check"><input type="checkbox" value="${i}">${c}</label>`).join('');
    $$('#bc-checklist input').forEach(b=>b.onchange=()=>{const next=b.checked?[...state.checklist,b.value]:state.checklist.filter(x=>x!==b.value);b.checked=!b.checked;save({...state,checklist:[...new Set(next)]});});
    renderFeature=()=>{$$('#bc-checklist input').forEach(b=>b.checked=state.checklist.includes(b.value));const n=checks.filter((_,i)=>state.checklist.includes(String(i))).length;$('#bc-check-count').textContent=n;$('#bc-check-progress').style.width=`${n/4*100}%`;$('#bc-preset-info').textContent=Array.isArray(state.preset?.values)?`저장된 설정 · 감쇠 ${state.preset.values[0]} / 반응 ${state.preset.values[1]}초`:'원래 실험실의 슬라이더를 조절한 뒤 저장할 수 있어요.';};
  }
  function gangwon(){
    const regions=$$('#regions .index-list li').map((el,i)=>({el,id:`region-${i}`,name:$('b',el)?.textContent||'',description:$('span',el)?.textContent||'',lenses:el.dataset.lenses||''}));
    panel.innerHTML=`<div class="bc-grid"><div class="bc-card"><h3>오늘 끌리는 풍경은?</h3><div class="bc-row" id="bc-region-filters">${[['all','모든 풍경'],['water','물'],['terrain','산과 지형'],['rhythm','리듬'],['material','재료'],['boundary','경계']].map(([v,n])=>`<button class="bc-btn bc-chip" data-lens="${v}" aria-pressed="${v==='all'}">${n}</button>`).join('')}</div><label class="bc-field" style="margin-top:16px">지역 찾기<input id="bc-region-search" type="search" placeholder="춘천, 횡성, 바다…"></label><ul class="bc-list" id="bc-region-results"></ul><p class="bc-note" id="bc-region-count" role="status"></p></div><div class="bc-card"><p class="bc-eyebrow">My collection</p><p class="bc-stat"><span id="bc-region-saved-count">0</span><small> / 18 지역</small></p><ul class="bc-list" id="bc-region-saved"></ul><h3 style="margin-top:22px">풍경을 닮은 인터페이스</h3><p class="bc-note" style="margin:12px 0">번역 실험의 안개·간격·선·색 설정을 저장하세요.</p><div class="bc-row"><a class="bc-btn" href="#lab">번역 실험</a><button class="bc-btn" id="bc-save-design">실험값 저장</button><button class="bc-btn" id="bc-load-design">불러오기</button></div></div></div>`;
    let lens='all';
    function list(){const q=$('#bc-region-search').value.trim().toLowerCase();const found=regions.filter(r=>(lens==='all'||r.lenses.split(' ').includes(lens))&&(r.name+' '+r.description).toLowerCase().includes(q));$('#bc-region-results').innerHTML=found.slice(0,6).map(r=>`<li><div><strong>${esc(r.name)}</strong><p class="bc-note">${esc(r.description)}</p></div><button class="bc-btn bc-chip" data-bookmark="${r.id}" aria-label="${esc(r.name)} 즐겨찾기" aria-pressed="${state.bookmarks.includes(r.id)}">${state.bookmarks.includes(r.id)?'담음':'담기'}</button></li>`).join('');$('#bc-region-count').textContent=found.length?`${found.length}곳 중 ${Math.min(found.length,6)}곳 표시 · 전체 지역은 아래에서 볼 수 있어요.`:'검색 조건에 맞는 지역이 없습니다.';}
    $$('#bc-region-filters button').forEach(b=>b.onclick=()=>{lens=b.dataset.lens;$$('#bc-region-filters button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));list();});$('#bc-region-search').oninput=list;
    const ids=['lab-fog','lab-spacing','lab-rule','lab-accent'];$('#bc-save-design').onclick=()=>save({...state,preset:{values:getPreset(ids)}},'디자인 실험값을 저장했습니다.');$('#bc-load-design').onclick=()=>{if(!Array.isArray(state.preset?.values))return toast('저장된 실험값이 없습니다.');inputPreset(ids,state.preset.values);toast('디자인 실험값을 불러왔습니다.');};
    regions.forEach(r=>{const b=document.createElement('button');b.className='bc-inline-save';b.dataset.bookmark=r.id;b.setAttribute('aria-label',r.name+' 즐겨찾기');b.textContent='담기';r.el.append(b);});
    document.addEventListener('click',e=>{const b=e.target.closest('[data-bookmark]');if(b)toggle('bookmarks',b.dataset.bookmark);});
    renderFeature=()=>{list();const selected=regions.filter(r=>state.bookmarks.includes(r.id));$('#bc-region-saved-count').textContent=selected.length;$('#bc-region-saved').innerHTML=selected.length?selected.map(r=>`<li><span>${esc(r.name)}</span><button class="bc-btn bc-chip" data-bookmark="${r.id}" aria-label="${esc(r.name)} 즐겨찾기 해제">해제</button></li>`).join(''):'<li class="bc-note">마음에 드는 지역의 담기를 눌러보세요.</li>';regions.forEach(r=>{const b=$('[data-bookmark]',r.el);b.textContent=state.bookmarks.includes(r.id)?'담음 ✓':'담기';b.setAttribute('aria-pressed',String(state.bookmarks.includes(r.id)));});};
  }
  function blog(){
    const postPage=document.body.classList.contains('page-post');
    if(postPage){
      const id=location.pathname.split('/').pop().replace(/\.html$/,'');const heading=$('.post-page h1');const content=$('.post-content');
      panel.innerHTML=`<div class="bc-grid"><div class="bc-card"><h3>이 글을 내 서재에</h3><p class="bc-note" style="margin:12px 0">${esc(heading?.textContent)}</p><div class="bc-row"><button class="bc-btn" id="bc-bookmark-post">북마크</button><button class="bc-btn" id="bc-mark-read">읽기 완료</button><button class="bc-btn" id="bc-focus" aria-pressed="false">집중해서 읽기</button></div><ol class="bc-toc" id="bc-toc"></ol></div><form class="bc-card bc-stack" id="bc-note-form"><label class="bc-field">나만의 읽기 메모<textarea id="bc-note" rows="4" maxlength="1000" placeholder="기억하고 싶은 문장을 내 말로 남겨보세요."></textarea></label><button class="bc-btn bc-btn-primary" type="submit">메모 저장</button><p class="bc-note">메모는 나에게만 보입니다.</p></form></div>`;
      $('#bc-bookmark-post').onclick=()=>toggle('bookmarks',id);$('#bc-mark-read').onclick=()=>toggle('read',id);$('#bc-focus').onclick=e=>{const on=document.documentElement.classList.toggle('bc-reading-focus');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'기본 보기':'집중해서 읽기';};
      $('#bc-note-form').onsubmit=e=>{e.preventDefault();const notes={...state.notes};notes[id]=$('#bc-note').value;save({...state,notes},'읽기 메모를 저장했습니다.');};
      const headings=$$('h2,h3',content);$('#bc-toc').innerHTML=headings.map((h,i)=>{if(!h.id)h.id=`reading-section-${i}`;return `<li><a href="#${esc(h.id)}">${esc(h.textContent)}</a></li>`;}).join('');
      renderFeature=()=>{$('#bc-bookmark-post').textContent=state.bookmarks.includes(id)?'북마크됨 ✓':'북마크';$('#bc-bookmark-post').setAttribute('aria-pressed',String(state.bookmarks.includes(id)));$('#bc-mark-read').textContent=state.read.includes(id)?'읽기 완료 ✓':'읽기 완료';$('#bc-mark-read').setAttribute('aria-pressed',String(state.read.includes(id)));if(document.activeElement!==$('#bc-note'))$('#bc-note').value=own(state.notes,id)?String(state.notes[id]):'';};
      return;
    }
    const posts=$$('.post-list-item').map(el=>{const a=$('a',el);return {el,href:a.getAttribute('href'),id:a.getAttribute('href').split('/').pop().replace(/\.html$/,''),title:$('.post-title',el)?.textContent||a.textContent.trim(),topics:$('.post-topics',el)?.textContent||''};});
    panel.innerHTML=`<div class="bc-grid"><div class="bc-card"><h3>지금 읽고 싶은 이야기</h3><label class="bc-field" style="margin:16px 0">제목·주제 검색<input type="search" id="bc-post-search" placeholder="디자인, JavaScript, 감각…"></label><div class="bc-row"><button class="bc-btn bc-chip" id="bc-only-saved" aria-pressed="false">북마크만 보기</button><button class="bc-btn bc-chip" id="bc-unread" aria-pressed="false">아직 안 읽은 글</button><button class="bc-btn" id="bc-pick-post">오늘의 발견</button></div><p class="bc-result" id="bc-post-result" role="status"></p></div><div class="bc-card"><p class="bc-eyebrow">Reading collection</p><p class="bc-stat"><span id="bc-read-count">0</span><small> / ${posts.length}편 읽음</small></p><div class="bc-meter"><span id="bc-read-progress"></span></div><p class="bc-note" id="bc-bookmark-count"></p><ul class="bc-list" id="bc-reading-list"></ul></div></div>`;
    let onlySaved=false,unread=false;
    posts.forEach(p=>{const row=document.createElement('div');row.className='bc-bookmark-row';row.innerHTML=`<button class="bc-inline-save" data-blog-save="${esc(p.id)}" aria-label="${esc(p.title)} 북마크">북마크</button>`;p.el.append(row);});
    document.addEventListener('click',e=>{const b=e.target.closest('[data-blog-save]');if(b)toggle('bookmarks',b.dataset.blogSave);});
    function filter(){const q=$('#bc-post-search').value.toLowerCase().trim();const filtered=posts.filter(p=>(p.title+' '+p.topics).toLowerCase().includes(q)&&(!onlySaved||state.bookmarks.includes(p.id))&&(!unread||!state.read.includes(p.id)));posts.forEach(p=>p.el.hidden=!filtered.includes(p));$('#bc-post-result').textContent=filtered.length?`${filtered.length}편을 찾았어요. 아래 글 목록에서 읽어보세요.`:'조건에 맞는 글이 없어요. 검색어나 필터를 바꿔보세요.';return filtered;}
    $('#bc-post-search').oninput=filter;$('#bc-only-saved').onclick=e=>{onlySaved=!onlySaved;e.currentTarget.setAttribute('aria-pressed',String(onlySaved));filter();};$('#bc-unread').onclick=e=>{unread=!unread;e.currentTarget.setAttribute('aria-pressed',String(unread));filter();};
    $('#bc-pick-post').onclick=()=>{const pool=filter().filter(p=>!state.read.includes(p.id));if(!pool.length)return toast('새로 추천할 글이 없습니다. 필터를 바꿔보세요.');const p=pool[Math.floor(Math.random()*pool.length)];location.href=p.href;};
    renderFeature=()=>{filter();const read=posts.filter(p=>state.read.includes(p.id)),bookmarks=posts.filter(p=>state.bookmarks.includes(p.id));$('#bc-read-count').textContent=read.length;$('#bc-read-progress').style.width=`${posts.length?read.length/posts.length*100:0}%`;$('#bc-bookmark-count').textContent=`북마크 ${bookmarks.length}편 · 메모 ${Object.keys(state.notes).length}개`;$('#bc-reading-list').innerHTML=bookmarks.slice(0,3).map(p=>`<li><a href="${esc(p.href)}">${esc(p.title)} ↗</a></li>`).join('')||'<li class="bc-note">글 옆의 북마크로 서재를 채워보세요.</li>';$$('[data-blog-save]').forEach(b=>{const on=state.bookmarks.includes(b.dataset.blogSave);b.textContent=on?'북마크됨 ✓':'북마크';b.setAttribute('aria-pressed',String(on));});};
  }
  function invitation(){
    panel.innerHTML=`<div class="bc-grid"><form class="bc-card bc-stack" id="bc-rsvp"><h3>참석 응답</h3><p class="bc-note">샘플 초대장입니다. 응답은 본인 계정에만 저장되며 실제 주최자에게 전달되지 않습니다.</p><label class="bc-field">이름<input name="name" autocomplete="name" required maxlength="40" placeholder="성함을 적어주세요"></label><label class="bc-field">참석 여부<select name="attending"><option value="yes">기쁜 마음으로 참석합니다</option><option value="no">마음으로 축하합니다</option></select></label><label class="bc-field" id="bc-guests-field">본인 포함 인원<select name="guests">${[1,2,3,4,5].map(n=>`<option value="${n}">${n}명</option>`).join('')}</select></label><label class="bc-field">축하 한마디<textarea name="message" rows="2" maxlength="300" placeholder="따뜻한 마음을 남겨주세요."></textarea></label><button class="bc-btn bc-btn-primary" type="submit">내 응답 저장</button></form><div class="bc-card"><p class="bc-eyebrow">Save the date</p><h3>2026년 10월 17일</h3><p class="bc-note" style="margin:8px 0 22px">토요일 오후 1시 · 샘플 일정</p><div class="bc-stack"><button class="bc-btn bc-btn-primary" id="bc-calendar">캘린더에 담기</button><button class="bc-btn" id="bc-share">초대장 공유</button></div><div class="bc-result"><p class="bc-note">나의 응답</p><p class="bc-rsvp-summary" id="bc-rsvp-summary">아직 응답하지 않았어요</p><p class="bc-note" id="bc-rsvp-message"></p></div></div></div>`;
    const form=$('#bc-rsvp');function attendance(){const no=form.elements.attending.value==='no';$('#bc-guests-field').hidden=no;form.elements.guests.disabled=no;}form.elements.attending.onchange=attendance;
    form.onsubmit=async e=>{e.preventDefault();if(!user){openAuth('signup');authMessage('참석 응답은 로그인 후 저장할 수 있습니다. 작성한 내용은 창을 닫아도 유지됩니다.');return;}const fd=new FormData(form);const rsvp={name:String(fd.get('name')).trim(),attending:fd.get('attending')==='yes',guests:fd.get('attending')==='yes'?Number(fd.get('guests')):0,message:String(fd.get('message')||'').trim()};if(!rsvp.name)return toast('성함을 적어주세요.');if(await save({...state,rsvp},'참석 응답을 저장했습니다.'))celebrate();};
    $('#bc-calendar').onclick=()=>{const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const cal=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Invitation Demo//KO','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:invitation-demo-20261017@jcy0908.github.io',`DTSTAMP:${stamp}`,'DTSTART:20261017T040000Z','DTEND:20261017T060000Z','SUMMARY:민준과 서연의 결혼식 (샘플 일정)','LOCATION:더채플앳청담 (샘플 장소)','DESCRIPTION:부트캠프 샘플 초대장의 일정입니다. 실제 행사 정보가 아닙니다.','END:VEVENT','END:VCALENDAR',''].join('\r\n');download('wedding-demo.ics',cal,'text/calendar;charset=utf-8');toast('샘플 일정 파일을 내려받습니다.');};
    $('#bc-share').onclick=async()=>{const url=redirectUrl();try{if(navigator.share)await navigator.share({title:'민준 & 서연 · 샘플 초대장',url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);toast('초대장 링크를 복사했습니다.');}else toast('주소창의 링크를 복사해 공유해 주세요.');}catch(e){if(e.name!=='AbortError')toast('공유하지 못했습니다. 주소창의 링크를 복사해 주세요.');}};
    renderFeature=()=>{const r=state.rsvp;$('#bc-rsvp-summary').textContent=r?(r.attending?`${r.name} 님 · ${Number(r.guests)}명 참석`:`${r.name} 님 · 마음으로 축하`):'아직 응답하지 않았어요';$('#bc-rsvp-message').textContent=r?.message||'';if(r&&!form.contains(document.activeElement)){form.elements.name.value=r.name||'';form.elements.attending.value=r.attending?'yes':'no';form.elements.guests.value=String(r.guests||1);form.elements.message.value=r.message||'';attendance();}};
  }
  ({'fluid-landing':fluid,'ma-admissions':gangwon,'my-blog':blog,'invitation':invitation}[site])();renderDynamic();
  async function loadAccount(nextUser){
    const previousId=user?.id;const epoch=++sessionEpoch;user=nextUser;cloudLoaded=false;revision=null;state=user?empty():guest();if(previousId&&previousId!==user?.id){const rsvpForm=$('#bc-rsvp');if(rsvpForm)rsvpForm.reset();const note=$('#bc-note');if(note)note.value='';}renderDynamic();
    if(!user)return;
    try{const {data,error}=await client.from('bootcamp_user_data').select('value,revision').eq('user_id',user.id).eq('site_id',site).eq('data_key','workspace').maybeSingle();if(error)throw error;if(epoch!==sessionEpoch)return;state=normalize(data?.value);revision=data?.revision??null;cloudLoaded=true;renderDynamic();if(dialog.open&&authMode!=='reset')renderAuth();}
    catch(e){if(epoch===sessionEpoch){toast('계정 기록을 불러오지 못했습니다. 내 계정에서 다시 시도해 주세요.');renderStatus();}}
  }
  function loadSdk(){return new Promise((resolve,reject)=>{if(window.supabase?.createClient)return resolve();const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.js';script.crossOrigin='anonymous';const timer=setTimeout(()=>reject(new Error('SDK timeout')),15000);script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(new Error('SDK load failed'));};document.head.append(script);});}
  async function connect(){
    try{await loadSdk();client=window.MA_SUPABASE_CLIENT || window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      client.auth.onAuthStateChange((event,session)=>{authReady=true;if(event==='PASSWORD_RECOVERY'){if(window.MA_SUPABASE_CLIENT){setTimeout(()=>loadAccount(session?.user||null),0);return;}authMode='reset';setTimeout(()=>loadAccount(session?.user||null),0);openAuth('reset');return;}const next=session?.user||null;if(event==='SIGNED_OUT'){authMode='login';setTimeout(()=>{loadAccount(null);if(dialog.open)renderAuth();},0);return;}if(next?.id!==user?.id||event==='INITIAL_SESSION')setTimeout(()=>loadAccount(next),0);});
      const {error}=await client.auth.getSession();if(error)throw error;authReady=true;
      const hash=new URLSearchParams(location.hash.slice(1));if(hash.has('error_description')){openAuth('login');authMessage('인증 링크가 만료되었거나 사용할 수 없습니다. 다시 로그인하거나 비밀번호 찾기를 이용해 주세요.');history.replaceState(null,'',location.pathname+location.search);}
    }catch(e){authReady=false;$('#bc-storage-note').textContent='현재 계정 연결이 원활하지 않습니다. 로그인 없이 쓰는 기능은 이 기기에 저장됩니다.';}
  }
  connect();
})();
