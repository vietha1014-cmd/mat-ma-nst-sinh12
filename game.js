'use strict';
const $=id=>document.getElementById(id), LEVELS={D:{title:'Dễ',n:8,seconds:300},M:{title:'Trung bình',n:12,seconds:420},K:{title:'Khó',n:15,seconds:600}};
const STAGES=['Giải mã DNA','Khám phá nucleosome','Đóng xoắn NST','Bí mật NST','Chinh phục mật mã'];
const STAGE_ICONS=['🧬','🔬','🧵','🔎','🏆'];
let soundOn=localStorage.getItem('mmnst_sound')!=='off',audioCtx=null;
function playSound(kind='click'){
 if(!soundOn)return;
 try{
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
  audioCtx=audioCtx||new Ctx();if(audioCtx.state==='suspended')audioCtx.resume();
  const notes=kind==='correct'?[659.25,783.99,987.77]:kind==='wrong'?[370,294]:kind==='win'?[523,659,784,1047]:[720];
  const duration=kind==='click'?.045:.15,volume=kind==='click'?.027:.075;
  const now=audioCtx.currentTime;
  notes.forEach((hz,i)=>{const t=now+i*(kind==='click'?0:.115),osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
   osc.type=kind==='wrong'?'triangle':'sine';osc.frequency.setValueAtTime(hz,t);
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   osc.connect(gain);gain.connect(audioCtx.destination);osc.start(t);osc.stop(t+duration+.01);
  });
 }catch(e){console.warn('Không phát được âm thanh',e)}
}
// Âm click cho các nút và ô chọn, kể cả điều khiển được tạo động.
document.addEventListener('click',e=>{
 if(e.target.closest('button') && !e.target.closest('#soundBtn'))playSound('click');
},true);
document.addEventListener('change',e=>{
 if(e.target.matches('#interaction select'))playSound('click');
},true);
function toggleSound(){soundOn=!soundOn;localStorage.setItem('mmnst_sound',soundOn?'on':'off');$('soundBtn').textContent=soundOn?'🔊':'🔇';$('soundBtn').setAttribute('aria-label',soundOn?'Tắt âm thanh':'Bật âm thanh')}
function confirmHome(){if(!session){showHome();return}if(confirm('Bạn muốn về trang chính? Tiến độ của lượt chơi đang diễn ra sẽ không được ghi nhận.')){session=null;showHome()}}
function renderStageTrack(){if(!session)return;const current=Math.min(4,Math.floor(session.index/session.questions.length*5));$('stageTrack').innerHTML=STAGES.map((name,i)=>`<div class="stage-item ${i<=current?'active':''}"><span class="stage-symbol">${STAGE_ICONS[i]}</span><span class="stage-label">${esc(name)}</span></div>`).join('')}

let session=null,timer=null,chosen=null,answerState=null,locked=false;
const shuffle=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim();
const identity=()=>norm($('student').value)+'|'+norm($('className').value.replace(/^lớp\s*/i,''));
const key=()=>`mmnst:${identity()}`;
function saved(){try{return JSON.parse(localStorage.getItem(key()))||{}}catch{return {}}}
function persist(o){localStorage.setItem(key(),JSON.stringify(o))}
function showHome(){session=null;locked=false;clearInterval(timer);$('home').classList.remove('hidden');$('game').classList.add('hidden');$('end').classList.add('hidden');renderLevels()}
const REQUIRED_DNA={D:3,M:2,K:1};
function legacyRemaining(v){return v?.bestRemaining??(v?.stars===3?4:v?.stars===2?3:v?.stars===1?2:0)}
function isUnlocked(l,data=saved()){return l==='D'||(l==='M'&&legacyRemaining(data.D)>=3&&data.D?.passed)||(l==='K'&&legacyRemaining(data.M)>=2&&data.M?.passed)}
function renderLevels(){let s=saved();$('levels').innerHTML=Object.entries(LEVELS).map(([l,v])=>{let unlocked=isUnlocked(l,s),record=s[l];return `<button ${unlocked?'':'disabled'} onclick="start('${l}')">${unlocked?'🔓':'🔒'} ${v.title}<br><span class="small">${v.n} câu · ${v.seconds/60} phút<br>${record?.best!==undefined?'Tốt nhất: '+record.best+' câu đúng · '+legacyRemaining(record)+' DNA':'Chưa hoàn thành'}</span></button>`}).join('')}
function start(level){let name=$('student').value.trim().replace(/\s+/g,' '),cls=$('className').value.trim().replace(/\s+/g,' ');if(!name||!cls){alert('Vui lòng nhập tên và lớp.');return}if(!isUnlocked(level)){alert('Cần hoàn thành cấp trước và còn ít nhất '+(level==='M'?3:2)+' DNA sinh mệnh để mở khóa.');return}
let q=shuffle(QUESTIONS.filter(x=>x.level===level)).slice(0,LEVELS[level].n);session={level,name,cls,questions:q,index:0,lives:5,attempts:0,correct:0,remaining:LEVELS[level].seconds,seen:[],wrong:[],started:Date.now()};$('home').classList.add('hidden');$('end').classList.add('hidden');$('game').classList.remove('hidden');clearInterval(timer);timer=setInterval(()=>{if(!session||locked)return;session.remaining--;updateHUD();if(session.remaining<=0)finish(false,'Hết thời gian')},1000);renderQuestion()}
function updateHUD(){let s=session;$('levelTitle').textContent=LEVELS[s.level].title;$('clock').textContent=`${String(Math.floor(s.remaining/60)).padStart(2,'0')}:${String(s.remaining%60).padStart(2,'0')}`;$('lives').textContent='🧬'.repeat(s.lives)+'·'.repeat(5-s.lives);$('count').textContent=`Nhiệm vụ ${s.index+1}/${s.questions.length} · Lượt trả lời ${Math.min(2,s.attempts+1)}/2`;$('bar').style.width=(s.index/s.questions.length*100)+'%';$('stage').textContent=STAGES[Math.min(4,Math.floor(s.index/s.questions.length*5))];renderStageTrack()}
function setSelected(el){document.querySelectorAll('.option').forEach(e=>e.classList.remove('selected'));el.classList.add('selected')}
function diagramSVG(two=false){return `<svg viewBox="0 0 400 300" role="img" aria-label="Sơ đồ minh họa nhiễm sắc thể"><defs><linearGradient id="chr" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#78e1eb"/><stop offset="1" stop-color="#3189b4"/></linearGradient></defs>${two?'<g transform="translate(-65 0)">':''}<path d="M112 35 Q127 12 150 43 L220 128 L280 42 Q300 20 313 40 Q330 61 305 88 L239 151 L306 240 Q330 269 304 282 Q285 289 267 260 L215 181 L163 260 Q145 287 122 275 Q99 261 118 238 L187 151 L120 88 Q96 61 112 35Z" fill="url(#chr)" stroke="#c5faff" stroke-width="3"/><path d="M301 35 Q280 20 263 46 L213 125 L159 46 Q139 20 120 42" fill="none" stroke="#164f80" stroke-width="8" opacity=".6"/><ellipse cx="215" cy="151" rx="32" ry="17" fill="#e9ad61" stroke="#fff1b7" stroke-width="3"/>${two?'</g><g transform="translate(115 0) scale(.7 1)"><path d="M112 35 L215 145 L300 35 M112 265 L215 155 L300 265" stroke="#a5e9ff" stroke-width="27" stroke-linecap="round" fill="none"/><circle cx="215" cy="150" r="18" fill="#e9ad61"/></g>':''}</svg>`}
function renderQuestion(){locked=false;let s=session,q=s.questions[s.index];s.attempts=0;s.seen.push(q.id);chosen=null;answerState=null;$('feedback').innerHTML='';$('check').classList.remove('hidden');$('next').classList.add('hidden');$('qText').textContent=q.prompt;$('source').textContent=q.source;updateHUD();let box=$('interaction');box.innerHTML='';
if(q.type==='mc'||q.type==='visualchoice'){let ix=shuffle(q.options.map((_,i)=>i));if(q.type==='visualchoice')box.innerHTML='<div class="notice small">Các phương án mô tả sơ đồ; chọn mô tả chính xác.</div>';ix.forEach(i=>{let b=document.createElement('button');b.className='option';b.dataset.letter='ABCD'[ix.indexOf(i)]||'';b.dataset.answerIndex=String(i);b.textContent=q.options[i];b.onclick=()=>{chosen=i;setSelected(b)};box.appendChild(b)})}
if(q.type==='short'){box.innerHTML='<p class="muted">Nhập câu trả lời dạng số:</p><input id="shortAnswer" inputmode="numeric" placeholder="Nhập đáp án">'}
if(q.type==='tf'){answerState=Array(q.statements.length).fill(null);q.statements.forEach((t,i)=>{let r=document.createElement('div');r.className='matchrow';r.innerHTML=`<span>${esc('abcd'[i]+') '+t)}</span><select aria-label="Nhận định ${i+1}"><option value="">Chọn đúng/sai</option><option value="1">Đúng</option><option value="0">Sai</option></select>`;r.querySelector('select').onchange=e=>answerState[i]=e.target.value===''?null:Number(e.target.value);box.appendChild(r)})}
if(q.type==='match'){answerState=Array(q.pairs.length).fill(null);let opts=shuffle(q.pairs.map((p,i)=>({text:p[1],i})));q.pairs.forEach((p,i)=>{let r=document.createElement('div');r.className='matchrow';r.innerHTML=`<strong>${esc(p[0])}</strong><select aria-label="Ghép ${esc(p[0])}"><option value="">Chọn nội dung ghép</option>${opts.map(o=>`<option value="${o.i}">${esc(o.text)}</option>`).join('')}</select>`;r.querySelector('select').onchange=e=>answerState[i]=e.target.value===''?null:Number(e.target.value);box.appendChild(r)})}
if(q.type==='classify'){answerState=Array(q.items.length).fill(null);box.innerHTML=`<p class="muted">Chọn nhóm phù hợp cho từng thẻ:</p>`;shuffle(q.items.map((x,i)=>({x,i}))).forEach(({x,i})=>{let r=document.createElement('div');r.className='matchrow';r.innerHTML=`<span class="token" draggable="true">${esc(x[0])}</span><select><option value="">Chọn nhóm</option>${q.groups.map((g,j)=>`<option value="${j}">${esc(g)}</option>`).join('')}</select>`;r.querySelector('select').onchange=e=>answerState[i]=e.target.value===''?null:Number(e.target.value);box.appendChild(r)})}
if(q.type==='order'){answerState=shuffle(q.items.map((_,i)=>i));if(answerState.every((x,i)=>x===i))answerState.reverse();const draw=()=>{box.innerHTML='';answerState.forEach((id,i)=>{let r=document.createElement('div');r.className='orderrow';r.innerHTML=`<span>${i+1}. ${esc(q.items[id])}</span><span><button ${i===0?'disabled':''}>↑</button> <button ${i===answerState.length-1?'disabled':''}>↓</button></span>`;let b=r.querySelectorAll('button');b[0].onclick=()=>{[answerState[i-1],answerState[i]]=[answerState[i],answerState[i-1]];draw()};b[1].onclick=()=>{[answerState[i+1],answerState[i]]=[answerState[i],answerState[i+1]];draw()};box.appendChild(r)})};draw()}
if(q.type==='diagram'){answerState=Array(q.targets.length).fill(null);let names=shuffle(q.targets.map(x=>x.name));let selectedLabel=null;box.innerHTML=`<p class="muted">Chọn một nhãn, sau đó chọn vòng tròn trên hình để đặt nhãn. Có thể chọn lại để sửa.</p><div class="labels"></div><div class="diagram">${diagramSVG(q.id==='M10')}</div>`;let labels=box.querySelector('.labels'),d=box.querySelector('.diagram');names.forEach(n=>{let b=document.createElement('button');b.className='labelchip';b.textContent=n;b.onclick=()=>{selectedLabel=n;labels.querySelectorAll('button').forEach(z=>z.classList.toggle('selected',z===b))};labels.appendChild(b)});q.targets.forEach((t,i)=>{let z=document.createElement('button');z.className='dropzone';z.style.left=t.x+'%';z.style.top=t.y+'%';z.title='Vị trí '+(i+1);z.onclick=()=>{if(selectedLabel===null)return;answerState[i]=selectedLabel;z.textContent=selectedLabel;z.classList.add('filled')};d.appendChild(z)})}
}
function responseValid(q){if(q.type==='mc'||q.type==='visualchoice')return chosen!==null;if(q.type==='short')return $('shortAnswer').value.trim()!=='';return answerState&&answerState.every(x=>x!==null)}
function isCorrect(q){if(q.type==='mc'||q.type==='visualchoice')return chosen===q.answer;if(q.type==='short')return $('shortAnswer').value.trim().replace(/\s/g,'')===q.answer;if(q.type==='tf')return answerState.every((x,i)=>x===q.answer[i]);if(q.type==='match')return answerState.every((x,i)=>x===i)&&new Set(answerState).size===q.pairs.length;if(q.type==='classify')return answerState.every((x,i)=>x===q.items[i][1]);if(q.type==='order')return answerState.every((x,i)=>x===i);if(q.type==='diagram')return answerState.every((x,i)=>x===q.targets[i].name)&&new Set(answerState).size===q.targets.length;return false}
function showCorrect(q){if(q.type==='mc'||q.type==='visualchoice')return q.options[q.answer];if(q.type==='short')return q.answer;if(q.type==='tf')return q.answer.map((x,i)=>`${'abcd'[i]}) ${x?'Đ':'S'}`).join(' · ');if(q.type==='match')return q.pairs.map(x=>x.join(' → ')).join('; ');if(q.type==='classify')return q.items.map(x=>x[0]+' → '+q.groups[x[1]]).join('; ');if(q.type==='order')return q.items.join(' → ');if(q.type==='diagram')return q.targets.map(x=>x.name).join(', ');return ''}
function markOptions(q,finished){
 if(q.type!=='mc'&&q.type!=='visualchoice')return;
 document.querySelectorAll('#interaction .option').forEach(b=>{
  const i=Number(b.dataset.answerIndex);
  b.classList.remove('answer-correct','answer-wrong');
  if(finished&&i===q.answer)b.classList.add('answer-correct');
  else if(i===chosen&&i!==q.answer)b.classList.add('answer-wrong');
  if(finished)b.disabled=true;
 });
}
function setResponseFeedback(html,warning){
 $('feedback').innerHTML=`<div class="feedback ${warning?'warning':''}" role="status" aria-live="polite">${html}</div>`;
}
$('check').onclick=()=>{
 if(!session||locked)return;
 const s=session,q=s.questions[s.index];
 if(!responseValid(q)){alert('Hãy hoàn thành câu trả lời trước khi kiểm tra.');return}
 const correct=isCorrect(q);s.attempts++;
 if(correct){
  playSound('correct');s.correct++;locked=true;markOptions(q,true);
  setResponseFeedback(`<strong>✓ Chính xác!</strong><p>${esc(q.explain)}</p>`,false);
 }else{
  playSound('wrong');s.lives=Math.max(0,s.lives-1);
  const finished=s.attempts>=2||s.lives===0;
  markOptions(q,finished);
  if(finished){
   locked=true;s.wrong.push(q.id);
   setResponseFeedback(`<strong>Chưa đúng. ${s.lives===0?'Bạn đã hết DNA sinh mệnh.':'Bạn đã dùng hết 2 lượt trả lời.'}</strong><p><b>Đáp án đúng:</b> ${esc(showCorrect(q))}</p><p>${esc(q.explain)}</p>`,true);
  }else{
   setResponseFeedback('<strong>Chưa đúng, bạn mất 1 DNA sinh mệnh.</strong><p>Hãy thử chọn lại (còn 1 lần).</p>',true);
   // Không giữ đáp án sai được chọn khi thử lại.
   if(q.type==='mc'||q.type==='visualchoice'){
    document.querySelectorAll('#interaction .option').forEach(b=>{b.classList.remove('selected');if(Number(b.dataset.answerIndex)===chosen)b.disabled=true});
    chosen=null;
   }else if(q.type==='short'){$('shortAnswer').value='';}
   else if(q.type==='tf'||q.type==='match'||q.type==='classify'){
    answerState=Array(answerState.length).fill(null);
    document.querySelectorAll('#interaction select').forEach(sel=>sel.value='');
   }
  }
 }
 if(locked){$('check').classList.add('hidden');$('next').classList.remove('hidden')}
 updateHUD();
 $('next').textContent=s.lives===0?'Xem kết quả →':s.index===s.questions.length-1?'Hoàn thành →':'Tiếp tục →';
};
$('next').onclick=()=>{if(!session)return;if(session.lives===0)return finish(false,'Hết DNA sinh mệnh');session.index++;if(session.index>=session.questions.length){let passed=session.lives>=REQUIRED_DNA[session.level];return finish(passed,passed?'Hoàn thành cấp độ!':'Chưa đạt điều kiện mở khóa')}renderQuestion()};
function points(s){return s.correct}
function finish(passed,reason){if(!session)return;if(passed)playSound('win');clearInterval(timer);locked=true;let s=session;let score=points(s),data=saved(),old=data[s.level]||{};let bestRemaining=Math.max(legacyRemaining(old),passed?s.lives:0);data[s.level]={best:Math.max(old.best||0,score),passed:!!old.passed||passed,bestRemaining};persist(data);$('game').classList.add('hidden');$('end').classList.remove('hidden');$('endTitle').textContent=reason;let next=s.level==='D'?'Trung bình':s.level==='M'?'Khó':null;let message=passed?(next?'Đã mở khóa cấp '+next+'.':'Chúc mừng! Bạn đã chinh phục cấp Khó.'):'Bạn cần hoàn thành tất cả câu hỏi và còn ít nhất '+REQUIRED_DNA[s.level]+' DNA sinh mệnh.';$('endBody').innerHTML=`<p style="font-size:30px">${'🧬'.repeat(s.lives)}${s.lives?'':'🔒'}</p><p>${esc(s.name)} · ${esc(s.cls)}</p><p>Đúng ${s.correct}/${s.questions.length} · Còn ${s.lives}/5 DNA sinh mệnh · Điểm ${score}</p><p class="muted">${message}</p><div id="syncStatus" class="notice small">Đang kiểm tra kết nối Google Sheets…</div>`;$('retry').onclick=()=>start(s.level);syncScore({nonce:(globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2)),name:s.name,cls:s.cls,level:s.level,score,stars:0,passed,correct:s.correct,total:s.questions.length,remaining:s.lives,finishedAt:new Date().toISOString()})}
function jsonp(url,timeout=9000){return new Promise((resolve,reject)=>{let cb='mmcb_'+Math.random().toString(36).slice(2),script=document.createElement('script'),t=setTimeout(()=>{cleanup();reject(Error('Hết thời gian xác minh'))},timeout);function cleanup(){clearTimeout(t);delete window[cb];script.remove()}window[cb]=v=>{cleanup();resolve(v)};script.onerror=()=>{cleanup();reject(Error('Không thể xác minh'))};script.src=url+(url.includes('?')?'&':'?')+'callback='+cb;document.head.appendChild(script)})}
async function syncScore(payload){let status=$('syncStatus'),url=window.GAME_CONFIG?.scriptUrl?.trim();if(!url){status.textContent='Đã lưu trên thiết bị. Chưa kết nối Google Sheets; xem file HƯỚNG DẪN để cấu hình.';return}let queue=JSON.parse(localStorage.getItem('mmnst_pending')||'[]');queue.push(payload);localStorage.setItem('mmnst_pending',JSON.stringify(queue));await flushQueue(status)}
async function flushQueue(status){let url=window.GAME_CONFIG?.scriptUrl?.trim();if(!url)return;let queue=JSON.parse(localStorage.getItem('mmnst_pending')||'[]'),remaining=[];for(let p of queue){try{await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(p)});let ok=false;for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,1000+i*1200));let res=await jsonp(url+'?action=status&nonce='+encodeURIComponent(p.nonce));if(res?.saved){ok=true;break}}if(!ok)throw Error('Chưa xác minh được dữ liệu trên Sheets')}catch(e){remaining.push(p)}}localStorage.setItem('mmnst_pending',JSON.stringify(remaining));if(status)status.textContent=remaining.length?'Đã lưu trên thiết bị; chưa xác minh được một số kết quả trên Google Sheets. Sẽ thử lại lần sau.':'✓ Google Sheets đã xác nhận lưu kết quả.'}
window.addEventListener('online',()=>flushQueue());$('student').addEventListener('change',renderLevels);$('className').addEventListener('change',renderLevels);$('homeBtn').onclick=confirmHome;$('soundBtn').onclick=toggleSound;$('soundBtn').textContent=soundOn?'🔊':'🔇';renderLevels();flushQueue();
