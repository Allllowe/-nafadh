/* =============================================
   نَفاذ Nafadh — Frontend Logic
   Extracted from the original single-file build.
   UI/UX behavior preserved. Inbox, username
   generator, and fake-data generator now talk
   to the Express backend API (see apiBase below),
   with safe local fallbacks if the backend is
   unreachable. Password tools, image tools, QR,
   Base64, and PDF merge remain fully client-side
   on purpose — the UI explicitly promises the user
   those never touch a server.
   ============================================= */

(function(){
 'use strict';

 // ---------- BACKEND API CONNECTION ----------
 // Point this at your running Express backend (see /backend).
 // Override at runtime without editing this file by adding, before
 // this script tag in index.html:
 //   <script>window.NAFADH_API_BASE = 'https://api.example.com/api';</script>
 const API_BASE = (window.NAFADH_API_BASE || 'http://localhost:5000/api').replace(/\/$/, '');

 async function apiFetch(path, options){
   options = options || {};
   const res = await fetch(API_BASE + path, {
     headers: { 'Content-Type': 'application/json' },
     ...options
   });
   if(!res.ok){
     let detail = '';
     try { detail = (await res.json()).message || ''; } catch(e){}
     const err = new Error(detail || ('API error ' + res.status));
     err.status = res.status; // marks that the backend responded (it IS reachable)
     throw err;
   }
   if(res.status === 204) return null;
   return res.json();
 }

 /* =====================================================
    SECURITY NOTE:
    All dynamic, user-influenced, or randomly generated text
    in this file is inserted via textContent / createElement,
    never via innerHTML string-concatenation. This prevents
    any possibility of HTML/script injection (XSS) from
    generator inputs (e.g. the username keyword field).
 ===================================================== */
 
 // ---------- THEME (dark / light) ----------
 const THEME_KEY_FALLBACK = (function(){
   // In-memory fallback since artifacts disallow localStorage;
   // here we DO have a real document (standalone file), so
   // localStorage works when opened directly in a browser.
   try {
     const test = '__nafadh_theme_test__';
     window.localStorage.setItem(test, '1');
     window.localStorage.removeItem(test);
     return true;
   } catch(e){ return false; }
 })();
 
 let memoryTheme = 'dark';
 function getStoredTheme(){
   if(THEME_KEY_FALLBACK){
     return window.localStorage.getItem('nafadh-theme') || 'dark';
   }
   return memoryTheme;
 }
 function setStoredTheme(val){
   if(THEME_KEY_FALLBACK){
     window.localStorage.setItem('nafadh-theme', val);
   } else {
     memoryTheme = val;
   }
 }
 
 function applyTheme(theme){
   document.documentElement.setAttribute('data-theme', theme);
   setStoredTheme(theme);
 }
 applyTheme(getStoredTheme());
 
 const themeBtn = document.getElementById('themeBtn');
 themeBtn.addEventListener('click', function(){
   const current = document.documentElement.getAttribute('data-theme') || 'dark';
   const next = current === 'dark' ? 'light' : 'dark';
   applyTheme(next);
   showToast(next === 'light' ? '☀️ تم تفعيل الوضع النهاري' : '🌙 تم تفعيل الوضع الليلي');
 });
 
 // ---------- TOAST ----------
 const toastEl = document.getElementById('toast');
 let toastTimer = null;
 function showToast(message){
   toastEl.textContent = message;
   toastEl.classList.add('show');
   clearTimeout(toastTimer);
   toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
 }
 
 // ---------- SHARE BUTTON (real Web Share API, with fallback) ----------
 const shareBtn = document.getElementById('shareBtn');
 shareBtn.addEventListener('click', async function(){
   const shareData = {
     title: 'نَفاذ Nafadh — بريد مؤقت وأدوات ذكية',
     text: 'جرّب نَفاذ: بريد مؤقت وأدوات ذكية لحماية خصوصيتك',
     url: window.location.href
   };
   if(navigator.share){
     try{
       await navigator.share(shareData);
     } catch(err){
       // User cancelled the share sheet — no error needed
       if(err && err.name !== 'AbortError'){
         fallbackCopyLink();
       }
     }
   } else {
     fallbackCopyLink();
   }
 });
 function fallbackCopyLink(){
   const url = window.location.href;
   if(navigator.clipboard && navigator.clipboard.writeText){
     navigator.clipboard.writeText(url)
       .then(() => showToast('🔗 تم نسخ رابط الموقع'))
       .catch(() => showToast('تعذّر نسخ الرابط'));
   } else {
     // Last-resort fallback for very old browsers
     const tmp = document.createElement('textarea');
     tmp.value = url;
     tmp.style.position = 'fixed';
     tmp.style.opacity = '0';
     document.body.appendChild(tmp);
     tmp.select();
     try { document.execCommand('copy'); showToast('🔗 تم نسخ رابط الموقع'); }
     catch(e){ showToast('تعذّر نسخ الرابط'); }
     document.body.removeChild(tmp);
   }
 }
 
 // ---------- PAGE NAVIGATION ----------
 function refreshNavLinks(){
   return document.querySelectorAll('.nav-link');
 }
 function showPage(name){
   const target = document.getElementById('page-' + name);
   if(!target) return;
   document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
   target.classList.add('active');
   refreshNavLinks().forEach(l => l.classList.toggle('active', l.dataset.page === name));
   window.scrollTo({top:0, behavior:'smooth'});
 }
 document.addEventListener('click', function(e){
   const link = e.target.closest('.nav-link');
   if(link){
     e.preventDefault();
     showPage(link.dataset.page);
     return;
   }
   const plain = e.target.closest('a[href="#"]');
   if(plain){
     e.preventDefault();
   }
 });
 
 // ---------- COPY HELPERS ----------
 function copyText(text){
   if(navigator.clipboard && navigator.clipboard.writeText){
     return navigator.clipboard.writeText(text);
   }
   return new Promise((resolve, reject) => {
     const tmp = document.createElement('textarea');
     tmp.value = text;
     tmp.style.position = 'fixed';
     tmp.style.opacity = '0';
     document.body.appendChild(tmp);
     tmp.select();
     try { document.execCommand('copy'); resolve(); }
     catch(e){ reject(e); }
     document.body.removeChild(tmp);
   });
 }
 function flashCopy(btn){
   const original = btn.innerHTML;
   btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
   setTimeout(()=> { btn.innerHTML = original; }, 1100);
 }
 
 // ---------- DOWNLOAD HELPER (cross-platform, including iOS Safari) ----------
 // iOS Safari ignores the `download` attribute on <a> tags for blob: URLs —
 // clicking such a link just opens the file instead of saving it, with no
 // visible error. There is no JS API on iOS that triggers a real silent
 // download. The standard, working approach is to open the blob in a new
 // tab; iOS then shows its native share/save sheet (long-press → "حفظ
 // الصورة" or "Save to Files") which is how saving actually works on iOS.
 // On every other browser the normal `download` attribute still works and
 // triggers an automatic save, so we only change behavior for iOS Safari.
 function isIosSafari(){
   const ua = navigator.userAgent || '';
   const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
   const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
   return isIOS && isSafari;
 }
 
 function downloadBlob(blob, filename){
   const url = URL.createObjectURL(blob);
   if(isIosSafari()){
     // Opening in a new tab lets the user long-press the image/file and
     // choose "Save to Photos" / "Save to Files" — the only reliable way
     // to save a generated file on iOS Safari.
     const opened = window.open(url, '_blank');
     if(!opened){
       // Popup blocked — fall back to navigating the current tab.
       window.location.href = url;
     }
     showToast('📲 افتح الصورة بالضغط مطولاً ثم اختر "حفظ الصورة"');
   } else {
     const link = document.createElement('a');
     link.download = filename;
     link.href = url;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   }
   // Revoke after a delay so the new tab / save sheet has time to load the data.
   setTimeout(() => URL.revokeObjectURL(url), 30000);
 }
 
 // ---------- INBOX: copy email ----------
 const emailAddrEl = document.getElementById('emailAddr');
 document.getElementById('copyBtn').addEventListener('click', function(){
   copyText(emailAddrEl.textContent.trim())
     .then(() => { flashCopy(this); showToast('📋 تم نسخ البريد المؤقت'); })
     .catch(() => showToast('تعذّر نسخ البريد'));
 });
 
 // ---------- INBOX: countdown timer (driven by the backend's real expiry) ----------
 // The timer reflects the inbox's actual expiresAt returned by the API, so the
 // UI and the server agree on when the inbox dies. The progress bar is measured
 // against the initial full window (timerBaselineMs) so it reads 100% on a fresh
 // inbox and shrinks toward 0 as it expires. Remaining time is recomputed from
 // the wall clock each tick, so it stays accurate even if the tab was throttled.
 const DEFAULT_TTL_MS = 20 * 60 * 1000; // matches backend INBOX_TTL_MINUTES default
 const MAX_LIFETIME_MS = 60 * 60 * 1000; // hard cap: mirrors backend MAX_LIFETIME_MS
 let expiresAtMs = Date.now() + DEFAULT_TTL_MS;
 let timerBaselineMs = DEFAULT_TTL_MS;
 // Local extend guard (used only when the backend is unreachable): track when
 // the local inbox was created and whether its single extension was used, so
 // the offline path obeys the same "one extension, 60-minute cap" rule.
 let localCreatedAtMs = Date.now();
 let localExtended = false;
 const timerDisplay = document.getElementById('timerDisplay');
 const progressFill = document.getElementById('progressFill');
 function renderTimer(){
   const remainingMs = Math.max(0, expiresAtMs - Date.now());
   const totalSeconds = Math.round(remainingMs / 1000);
   const m = Math.floor(totalSeconds/60).toString().padStart(2,'0');
   const s = (totalSeconds%60).toString().padStart(2,'0');
   timerDisplay.textContent = m + ':' + s;
   const pct = Math.max(0, Math.min(100, (remainingMs/timerBaselineMs)*100));
   progressFill.style.width = pct + '%';
 }
 // Point the timer at a server-provided ISO expiry. `reset` rebases the progress
 // bar to the new window (used for a fresh inbox); otherwise the baseline only
 // grows (used for an extension) so the bar never overflows past 100%.
 function setExpiry(isoString, reset){
   const t = Date.parse(isoString);
   if(!isNaN(t)){
     expiresAtMs = t;
     const windowMs = Math.max(expiresAtMs - Date.now(), 1);
     timerBaselineMs = reset ? windowMs : Math.max(timerBaselineMs, windowMs);
   }
   renderTimer();
 }
 // Local fallback expiry used when the backend is unreachable.
 function setLocalExpiry(ttlMs){
   expiresAtMs = Date.now() + ttlMs;
   timerBaselineMs = Math.max(ttlMs, 1);
   // Fresh local inbox: reset the offline extend guard.
   localCreatedAtMs = Date.now();
   localExtended = false;
   renderTimer();
 }
 renderTimer();
 setInterval(renderTimer, 1000);
 document.getElementById('extendBtn').addEventListener('click', async function(){
   if(!usingLocalFallback && currentAddress){
     try{
       const data = await apiFetch('/inbox/' + encodeURIComponent(currentAddress) + '/extend', {
         method:'POST',
         body: JSON.stringify({ minutes: 10 })
       });
       setExpiry(data.expiresAt, false);
       showToast('⏱️ تم تمديد الوقت 10 دقائق');
       return;
     } catch(err){
       // A 4xx/5xx response means the backend IS reachable and deliberately
       // refused (already extended / at the 60-min cap) — respect that and
       // stop, instead of silently extending locally. Only a genuine network
       // failure (no err.status) falls through to the offline path below.
       if(err && err.status){
         showToast(err.message || 'تعذّر تمديد صلاحية الصندوق');
         return;
       }
     }
   }
   // Offline path: obey the same rule as the backend — only one extension,
   // and never beyond the 60-minute hard cap from creation.
   if(localExtended){
     showToast('لا يمكن تمديد صلاحية الصندوق أكثر من مرة واحدة');
     return;
   }
   const maxExpiry = localCreatedAtMs + MAX_LIFETIME_MS;
   const newExpiry = Math.min(expiresAtMs + 10*60*1000, maxExpiry);
   if(newExpiry <= expiresAtMs){
     showToast('وصل الصندوق للحد الأقصى للوقت (60 دقيقة)');
     return;
   }
   expiresAtMs = newExpiry;
   timerBaselineMs = Math.max(timerBaselineMs, expiresAtMs - Date.now(), 1);
   localExtended = true;
   renderTimer();
   showToast('⏱️ تم تمديد الوقت 10 دقائق');
 });
 
 // ---------- INBOX: address + messages, backed by the Express API ----------
 // If the backend (see /backend) isn't running, every call below falls
 // back to local demo data so the page still works standalone.
 function randomAddrSegment(len){
   const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
   let s = '';
   for(let i=0;i<len;i++) s += chars[Math.floor(Math.random()*chars.length)];
   return s;
 }
 function localDemoMessages(){
   return [
     { id:'demo-1', time:'منذ دقيقتين', subject:'تأكيد إنشاء حسابك', preview:'مرحباً بك! يرجى مراجعة بيانات حسابك الجديد من خلال لوحة التحكم.', sender:'team@example-app.com', color:'#8b5cf6', initial:'A', read:false },
     { id:'demo-2', time:'منذ 6 دقائق', subject:'رمز تحقق تجريبي', preview:'هذا رمز تحقق تجريبي لأغراض الاختبار فقط. صالح لمدة 10 دقائق.', sender:'verify@demo-service.com', color:'#34d399', initial:'V', read:false },
     { id:'demo-3', time:'منذ 14 دقيقة', subject:'فاتورتك الشهرية جاهزة', preview:'يمكنك الاطلاع على تفاصيل الفاتورة والدفع من خلال الرابط المرفق.', sender:'billing@sample-co.com', color:'#60a5fa', initial:'B', read:true },
     { id:'demo-4', time:'منذ 28 دقيقة', subject:'تحديث في سياسة الاستخدام', preview:'قمنا بتحديث شروط الاستخدام الخاصة بنا، يرجى الاطلاع عليها.', sender:'updates@notify-test.com', color:'#fbbf24', initial:'N', read:true },
     { id:'demo-5', time:'منذ ساعة', subject:'نشرة الأخبار الأسبوعية', preview:'إليك أهم الأخبار والتحديثات لهذا الأسبوع من فريقنا.', sender:'news@weekly-demo.com', color:'#f472b6', initial:'W', read:true },
   ];
 }
 
 let messages = [];
 let currentAddress = null;
 let usingLocalFallback = false;
 
 async function createInboxOnServer(){
   let serverExpiry = null;
   try{
     const data = await apiFetch('/inbox', { method:'POST' });
     currentAddress = data.address;
     messages = data.messages || [];
     serverExpiry = data.expiresAt;
     usingLocalFallback = false;
   } catch(err){
     currentAddress = randomAddrSegment(7) + '@nafadh.com';
     messages = localDemoMessages();
     usingLocalFallback = true;
   }
   emailAddrEl.textContent = currentAddress;
   // Sync the countdown to the inbox's real expiry (or a local 20-min window
   // when running standalone without the backend).
   if(serverExpiry){
     setExpiry(serverExpiry, true);
   } else {
     setLocalExpiry(DEFAULT_TTL_MS);
   }
   renderMessages('all');
 }
 
 async function refreshInboxFromServer(){
   if(usingLocalFallback || !currentAddress){
     renderMessages(document.querySelector('.filter-tabs button.active').dataset.filter);
     return;
   }
   try{
     const data = await apiFetch('/inbox/' + encodeURIComponent(currentAddress) + '/messages');
     messages = data.messages || [];
   } catch(err){
     // Backend became unreachable mid-session — keep showing what we have.
   }
   renderMessages(document.querySelector('.filter-tabs button.active').dataset.filter);
 }
 
 document.getElementById('newEmailBtn').addEventListener('click', async function(){
   await createInboxOnServer();
   showToast('✉️ تم إنشاء بريد مؤقت جديد');
 });
 document.getElementById('refreshBtn').addEventListener('click', async function(){
   await refreshInboxFromServer();
   showToast('🔄 تم تحديث صندوق الوارد');
 });
 document.getElementById('deleteAllBtn').addEventListener('click', async function(){
   if(!usingLocalFallback && currentAddress){
     try{ await apiFetch('/inbox/' + encodeURIComponent(currentAddress) + '/messages', { method:'DELETE' }); }
     catch(err){ /* fall through and clear the local view anyway */ }
   }
   messages.length = 0;
   renderMessages('all');
   showToast('🗑️ تم حذف جميع الرسائل');
 });
 
 const msgList = document.getElementById('msgList');
 function renderMessages(filter){
   filter = filter || 'all';
   msgList.innerHTML = '';
   document.getElementById('msgCount').textContent = messages.length + ' رسائل';
 
   if(messages.length === 0){
     const empty = document.createElement('div');
     empty.className = 'msg-empty';
     empty.textContent = 'لا توجد رسائل في صندوق الوارد';
     msgList.appendChild(empty);
     return;
   }
 
   const filtered = messages.filter(m => filter === 'all' ? true : filter === 'unread' ? !m.read : m.read);
 
   if(filtered.length === 0){
     const empty = document.createElement('div');
     empty.className = 'msg-empty';
     empty.textContent = 'لا توجد رسائل ضمن هذا الفلتر';
     msgList.appendChild(empty);
     return;
   }
 
   filtered.forEach(m => {
     const row = document.createElement('div');
     row.className = 'msg-row';
 
     const dot = document.createElement('span');
     dot.className = 'unread-dot' + (m.read ? ' read' : '');
 
     const time = document.createElement('span');
     time.className = 'msg-time';
     time.textContent = m.time;
 
     const avatar = document.createElement('div');
     avatar.className = 'msg-avatar';
     avatar.style.background = m.color + '33';
     avatar.style.color = m.color;
     avatar.textContent = m.initial;
 
     const body = document.createElement('div');
     body.className = 'msg-body';
     const subject = document.createElement('div');
     subject.className = 'msg-subject';
     subject.textContent = m.subject;
     const preview = document.createElement('div');
     preview.className = 'msg-preview';
     preview.textContent = m.preview;
     body.appendChild(subject);
     body.appendChild(preview);
 
     const sender = document.createElement('div');
     sender.className = 'msg-sender';
     sender.textContent = m.sender;
 
     row.appendChild(dot);
     row.appendChild(time);
     row.appendChild(avatar);
     row.appendChild(body);
     row.appendChild(sender);
 
     row.addEventListener('click', () => {
       m.read = true;
       renderMessages(document.querySelector('.filter-tabs button.active').dataset.filter);
       if(!usingLocalFallback && currentAddress && !String(m.id).startsWith('demo-')){
         apiFetch('/inbox/' + encodeURIComponent(currentAddress) + '/messages/' + encodeURIComponent(m.id) + '/read', { method:'PATCH' })
           .catch(() => { /* non-critical, UI already reflects read state */ });
       }
     });
     msgList.appendChild(row);
   });
 }
 // Create a real inbox via the backend on first load (falls back to local
 // demo data automatically if the API isn't running yet).
 createInboxOnServer();
 
 document.querySelectorAll('.filter-tabs button').forEach(btn => {
   btn.addEventListener('click', () => {
     document.querySelectorAll('.filter-tabs button').forEach(b => b.classList.remove('active'));
     btn.classList.add('active');
     renderMessages(btn.dataset.filter);
   });
 });
 
 // ---------- Generic: build a copyable data row safely (no innerHTML for dynamic value) ----------
 function buildDataRow(label, value){
   const row = document.createElement('div');
   row.className = 'data-row';
 
   const k = document.createElement('span');
   k.className = 'dk';
   k.textContent = label;
 
   const wrap = document.createElement('span');
   wrap.className = 'dv-wrap';
 
   const btn = document.createElement('button');
   btn.type = 'button';
   btn.className = 'mini-copy';
   btn.title = 'نسخ';
   btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
   btn.addEventListener('click', function(){
     copyText(value)
       .then(() => { flashCopy(this); showToast('📋 تم النسخ'); })
       .catch(() => showToast('تعذّر النسخ'));
   });
 
   const v = document.createElement('span');
   v.className = 'dv';
   v.textContent = value;
   v.title = value;
 
   wrap.appendChild(btn);
   wrap.appendChild(v);
   row.appendChild(k);
   row.appendChild(wrap);
   return row;
 }
 
 // ---------- PASSWORD GENERATOR ----------
 const passLen = document.getElementById('passLen');
 const lenVal = document.getElementById('lenVal');
 const passOutput = document.getElementById('passOutput');
 const strengthLabel = document.getElementById('strengthLabel');
 const optUpper = document.getElementById('optUpper');
 const optLower = document.getElementById('optLower');
 const optNum = document.getElementById('optNum');
 const optSym = document.getElementById('optSym');
 
 [optUpper, optLower, optNum, optSym].forEach(opt => {
   opt.addEventListener('change', () => {
     opt.closest('.toggle-chip').classList.toggle('on', opt.checked);
   });
 });
 passLen.addEventListener('input', () => { lenVal.textContent = passLen.value; });
 
 function secureRandomInt(maxExclusive){
   if(window.crypto && window.crypto.getRandomValues){
     const arr = new Uint32Array(1);
     window.crypto.getRandomValues(arr);
     return arr[0] % maxExclusive;
   }
   return Math.floor(Math.random()*maxExclusive);
 }
 
 function generatePassword(){
   const sets = [];
   if(optUpper.checked) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
   if(optLower.checked) sets.push('abcdefghijkmnpqrstuvwxyz');
   if(optNum.checked) sets.push('23456789');
   if(optSym.checked) sets.push('!@#$%^&*-_=+');
   if(sets.length === 0){
     sets.push('abcdefghijkmnpqrstuvwxyz');
     optLower.checked = true;
     optLower.closest('.toggle-chip').classList.add('on');
   }
   const all = sets.join('');
   const len = Math.max(parseInt(passLen.value, 10), sets.length);
   let resultChars = [];
   sets.forEach(set => { resultChars.push(set[secureRandomInt(set.length)]); });
   for(let i = resultChars.length; i < len; i++){
     resultChars.push(all[secureRandomInt(all.length)]);
   }
   // Fisher-Yates shuffle for unbiased order
   for(let i = resultChars.length - 1; i > 0; i--){
     const j = secureRandomInt(i+1);
     [resultChars[i], resultChars[j]] = [resultChars[j], resultChars[i]];
   }
   const result = resultChars.join('');
   passOutput.textContent = result;
 
   const score = sets.length + (len >= 12 ? 1 : 0) + (len >= 18 ? 1 : 0);
   const labels = ['ضعيفة','ضعيفة','متوسطة','جيدة','قوية','ممتازة'];
   const segs = document.querySelectorAll('.strength-seg');
   const filled = Math.min(4, Math.max(1, Math.ceil(score/1.5)));
   segs.forEach((seg, i) => seg.classList.toggle('fill', i < filled));
   strengthLabel.textContent = 'قوة كلمة المرور: ' + labels[Math.min(filled, labels.length-1)];
 }
 document.getElementById('genPassBtn').addEventListener('click', generatePassword);
 document.getElementById('copyPassBtn').addEventListener('click', function(){
   copyText(passOutput.textContent)
     .then(() => { flashCopy(this); showToast('📋 تم نسخ كلمة المرور'); })
     .catch(() => showToast('تعذّر النسخ'));
 });
 
 // ---------- USERNAME GENERATOR (short, real random generation) ----------
 // Short word banks (3-6 letters) to guarantee compact usernames
 const shortWords = ['fox','wolf','nova','zed','raven','kai','luna','rex','axe','jet','iris','ash','neo','vex','sky','onyx','blitz','echo','pix','rune'];
 const numCount = document.getElementById('numCount');
 const numCountVal = document.getElementById('numCountVal');
 numCount.addEventListener('input', () => { numCountVal.textContent = numCount.value; });
 
 function randomDigits(n){
   let s = '';
   for(let i=0;i<n;i++) s += secureRandomInt(10);
   return s;
 }
 
 // sanitize keyword: letters/numbers only, max 8 chars — prevents any injection via this field
 function sanitizeKeyword(raw){
   return raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
 }
 
 function generateUsernamesLocal(keyword, digits){
   const used = new Set();
   let attempts = 0;
   while(used.size < 6 && attempts < 60){
     attempts++;
     const word = shortWords[secureRandomInt(shortWords.length)];
     let base = keyword ? keyword + word : word;
     // keep usernames short: cap base at 10 chars total
     base = base.slice(0, 10);
     const username = base + (digits > 0 ? randomDigits(digits) : '');
     if(!used.has(username)){
       used.add(username);
     }
   }
   return Array.from(used);
 }
 
 async function generateUsernames(){
   const rawKeyword = document.getElementById('userKeyword').value;
   const keyword = sanitizeKeyword(rawKeyword).toLowerCase();
   const digits = parseInt(numCount.value, 10);
   const container = document.getElementById('userResult');
 
   let usernames;
   try{
     const data = await apiFetch('/tools/username', {
       method: 'POST',
       body: JSON.stringify({ keyword, digits })
     });
     usernames = data.usernames;
   } catch(err){
     usernames = generateUsernamesLocal(keyword, digits);
   }
 
   container.innerHTML = '';
   usernames.forEach((username, i) => {
     container.appendChild(buildDataRow('يوزر ' + (i+1), username));
   });
 }
 document.getElementById('genUserBtn').addEventListener('click', generateUsernames);
 
 // ---------- FAKE DATA GENERATOR (generic demo identity, not impersonating real services) ----------
 const arFirst = ['عبدالله','سارة','خالد','نورة','فهد','ريم','يوسف','هند','ماجد','لمى'];
 const arLast = ['الحربي','القحطاني','العتيبي','الدوسري','الزهراني','الشمري','المطيري'];
 const enFirst = ['James','Emma','Liam','Olivia','Noah','Ava','Lucas','Mia','Ethan','Sophia'];
 const enLast = ['Smith','Johnson','Brown','Davis','Miller','Wilson','Moore','Taylor'];
 const cities = ['الرياض','جدة','الدمام','مكة','المدينة','أبها','تبوك'];
 const citiesEn = ['New York','London','Toronto','Sydney','Berlin','Chicago'];
 
 function generateFakeDataLocal(locale){
   const firstArr = locale === 'ar' ? arFirst : enFirst;
   const lastArr = locale === 'ar' ? arLast : enLast;
   const cityArr = locale === 'ar' ? cities : citiesEn;
   const first = firstArr[secureRandomInt(firstArr.length)];
   const last = lastArr[secureRandomInt(lastArr.length)];
   const city = cityArr[secureRandomInt(cityArr.length)];
   const fullName = first + ' ' + last;
   const emailUser = (locale === 'ar' ? 'user' : first.toLowerCase()) + randomDigits(3);
   const phonePrefix = locale === 'ar' ? '966 5' : '1 ';
   return [
     { k:'الاسم الكامل', v: fullName },
     { k:'البريد الإلكتروني', v: emailUser + '@example-demo.com' },
     { k:'اسم المستخدم', v: (first + randomDigits(3)).toLowerCase() },
     { k:'كلمة المرور', v: 'Demo' + randomDigits(4) + '!x' },
     { k:'رقم الهاتف', v: '+' + phonePrefix + randomDigits(8) },
     { k:'المدينة', v: city },
     { k:'تاريخ الميلاد', v: (1990 + secureRandomInt(15)) + '-' + String(1+secureRandomInt(12)).padStart(2,'0') + '-' + String(1+secureRandomInt(28)).padStart(2,'0') },
   ];
 }
 
 async function generateFakeData(){
   const locale = document.getElementById('dataLocale').value;
   const container = document.getElementById('dataResult');
 
   let data;
   try{
     const res = await apiFetch('/tools/fake-data', {
       method: 'POST',
       body: JSON.stringify({ locale })
     });
     data = res.data;
   } catch(err){
     data = generateFakeDataLocal(locale);
   }
 
   container.innerHTML = '';
   data.forEach(item => container.appendChild(buildDataRow(item.k, item.v)));
 }
 document.getElementById('genDataBtn').addEventListener('click', generateFakeData);
 
 // =====================================================
 // PASSWORD STRENGTH CHECKER — real client-side analysis
 // Nothing is sent anywhere; all checks run in-browser.
 // =====================================================
 const pwInput = document.getElementById('pwCheckInput');
 const pwToggle = document.getElementById('pwToggleVisibility');
 const pwEyeIcon = document.getElementById('pwEyeIcon');
 const pwStrengthLabel = document.getElementById('pwStrengthLabel');
 const pwEta = document.getElementById('pwEta');
 const pwWarnings = document.getElementById('pwWarnings');
 const pwSegs = [0,1,2,3,4].map(i => document.getElementById('pwSeg'+i));
 
 const EYE_OPEN = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
 const EYE_CLOSED = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.62 21.62 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
 
 pwToggle.addEventListener('click', function(){
   const showing = pwInput.type === 'text';
   pwInput.type = showing ? 'password' : 'text';
   pwEyeIcon.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
 });
 
 // Common weak passwords (small representative sample — pattern detection covers the rest)
 const COMMON_PASSWORDS = new Set([
   'password','123456','12345678','123456789','qwerty','abc123','password1',
   'admin','letmein','welcome','monkey','iloveyou','1234567','111111','000000',
   '123123','football','dragon','master','login','princess','qwertyuiop',
   'passw0rd','starwars','solo','superman','trustno1'
 ]);
 
 function hasSequential(str){
   const s = str.toLowerCase();
   const seqs = ['abcdefghijklmnopqrstuvwxyz','0123456789','qwertyuiop','asdfghjkl','zxcvbnm'];
   for(const seq of seqs){
     for(let i=0;i<=seq.length-3;i++){
       const fwd = seq.slice(i,i+3);
       const rev = fwd.split('').reverse().join('');
       if(s.includes(fwd) || s.includes(rev)) return true;
     }
   }
   return false;
 }
 function hasRepeatedChar(str){
   return /(.)\1\1/.test(str); // same char 3+ times in a row
 }
 function charsetSize(str){
   let size = 0;
   if(/[a-z]/.test(str)) size += 26;
   if(/[A-Z]/.test(str)) size += 26;
   if(/[0-9]/.test(str)) size += 10;
   if(/[^a-zA-Z0-9]/.test(str)) size += 32;
   return size || 1;
 }
 function estimateCrackTime(str){
   const charset = charsetSize(str);
   const combinations = Math.pow(charset, str.length);
   // Assume 10 billion guesses/sec (modern offline GPU attack baseline)
   const seconds = combinations / 1e10;
   if(seconds < 1) return 'أقل من ثانية';
   const units = [
     [60, 'ثانية'], [60, 'دقيقة'], [24, 'ساعة'], [365, 'يوم'], [100, 'سنة']
   ];
   let value = seconds, label = 'ثانية';
   const thresholds = [
     { max: 60, div: 1, label: 'ثانية' },
     { max: 3600, div: 60, label: 'دقيقة' },
     { max: 86400, div: 3600, label: 'ساعة' },
     { max: 31536000, div: 86400, label: 'يوم' },
     { max: 31536000*100, div: 31536000, label: 'سنة' },
     { max: Infinity, div: 31536000*1000, label: 'ألف سنة' }
   ];
   for(const t of thresholds){
     if(seconds < t.max){
       const v = seconds / t.div;
       return (v < 1 ? '<1' : Math.round(v).toLocaleString('ar')) + ' ' + t.label;
     }
   }
   return 'قرون طويلة جداً';
 }
 
 function evaluatePassword(){
   const val = pwInput.value;
   const rules = {
     len: val.length >= 8,
     upper: /[A-Z]/.test(val),
     lower: /[a-z]/.test(val),
     num: /[0-9]/.test(val),
     sym: /[^a-zA-Z0-9]/.test(val)
   };
   document.querySelectorAll('.rule-row').forEach(row => {
     const key = row.dataset.rule;
     row.classList.toggle('ok', !!rules[key]);
   });
 
   pwWarnings.innerHTML = '';
   const warnings = [];
   if(val.length > 0){
     if(COMMON_PASSWORDS.has(val.toLowerCase())) warnings.push('⚠️ هذه من أكثر كلمات المرور شيوعاً واختراقاً في العالم');
     if(hasSequential(val)) warnings.push('⚠️ تحتوي على تسلسل متوقّع (مثل abc أو 123)');
     if(hasRepeatedChar(val)) warnings.push('⚠️ تحتوي على نفس الحرف مكرر 3 مرات أو أكثر');
     if(val.length > 0 && val.length < 8) warnings.push('⚠️ قصيرة جداً — يُفضّل 12 حرفاً فأكثر');
     if(/^[a-zA-Z]+$/.test(val) && val.length > 0) warnings.push('⚠️ أحرف فقط بدون أرقام أو رموز يسهّل تخمينها');
   }
   warnings.forEach(w => {
     const chip = document.createElement('div');
     chip.className = 'warn-chip';
     chip.textContent = w;
     pwWarnings.appendChild(chip);
   });
 
   if(val.length === 0){
     pwSegs.forEach(seg => { seg.style.background = ''; });
     pwStrengthLabel.textContent = 'أدخل كلمة مرور للفحص';
     pwStrengthLabel.style.color = '';
     pwEta.textContent = '';
     return;
   }
 
   // Score: rules met + length bonus, penalized by warnings
   let score = Object.values(rules).filter(Boolean).length; // 0-5
   if(val.length >= 12) score += 1;
   if(val.length >= 16) score += 1;
   score -= warnings.length;
   score = Math.max(0, Math.min(5, score));
 
   const colors = ['#f87171','#f87171','#fbbf24','#fbbf24','#34d399','#34d399'];
   const labels = ['ضعيفة جداً','ضعيفة','متوسطة','جيدة','قوية','قوية جداً'];
 
   pwSegs.forEach((seg, i) => {
     seg.style.background = i < score ? colors[score] : '';
   });
   pwStrengthLabel.textContent = 'القوة: ' + labels[score];
   pwStrengthLabel.style.color = colors[score];
   pwEta.textContent = 'وقت الاختراق التقديري: ' + estimateCrackTime(val);
 }
 pwInput.addEventListener('input', evaluatePassword);
 evaluatePassword();
 
 // =====================================================
 // QR CODE GENERATOR — real QR via qrcodejs library (CDN)
 // Generates an actual scannable QR rendered to canvas,
 // with PNG download support.
 // =====================================================
 let qrInstance = null;
 let currentQrType = 'url';
 
 const qrCanvasBox = document.getElementById('qrCanvasBox');
 const qrFgColor = document.getElementById('qrFgColor');
 const qrBgColor = document.getElementById('qrBgColor');
 
 document.querySelectorAll('.qr-tabs button').forEach(btn => {
   btn.addEventListener('click', () => {
     document.querySelectorAll('.qr-tabs button').forEach(b => b.classList.remove('active'));
     btn.classList.add('active');
     currentQrType = btn.dataset.qrtype;
     document.getElementById('qrFieldsUrl').style.display = currentQrType === 'url' ? '' : 'none';
     document.getElementById('qrFieldsText').style.display = currentQrType === 'text' ? '' : 'none';
     document.getElementById('qrFieldsWifi').style.display = currentQrType === 'wifi' ? '' : 'none';
     buildQrContent();
   });
 });
 
 function escapeWifiField(str){
   // Escape characters that are special in the WIFI: QR payload spec
   return str.replace(/([\\;,:"])/g, '\\$1');
 }
 
 function buildQrContent(){
   if(currentQrType === 'url'){
     let v = document.getElementById('qrUrlInput').value.trim();
     if(v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
     return v;
   }
   if(currentQrType === 'text'){
     return document.getElementById('qrTextInput').value.trim();
   }
   if(currentQrType === 'wifi'){
     const ssid = document.getElementById('qrWifiSsid').value.trim();
     const pass = document.getElementById('qrWifiPass').value.trim();
     const enc = document.getElementById('qrWifiEnc').value;
     if(!ssid) return '';
     if(enc === 'nopass'){
       return 'WIFI:T:nopass;S:' + escapeWifiField(ssid) + ';;';
     }
     return 'WIFI:T:' + enc + ';S:' + escapeWifiField(ssid) + ';P:' + escapeWifiField(pass) + ';;';
   }
   return '';
 }
 
 function renderQr(){
   const content = buildQrContent();
   qrCanvasBox.innerHTML = '';
   if(!content){
     const empty = document.createElement('span');
     empty.className = 'qr-empty-state';
     empty.textContent = 'أدخل بيانات وستظهر معاينة الرمز هنا تلقائياً';
     qrCanvasBox.appendChild(empty);
     qrInstance = null;
     return;
   }
   // The QRCode library loads from a CDN. If it's blocked (ad-blocker,
   // corporate firewall, offline, slow network) this must NOT throw —
   // otherwise it kills the single shared script and breaks every other
   // tool on the site (inbox, generators, etc), since they all run in
   // the same script block.
   if(typeof QRCode === 'undefined'){
     const errEl = document.createElement('span');
     errEl.className = 'qr-empty-state';
     errEl.textContent = '⚠️ تعذّر تحميل مكتبة QR من الإنترنت. تأكد من اتصالك بالشبكة وأن أي أداة حظر إعلانات لا تمنع الموقع، ثم أعد تحميل الصفحة';
     qrCanvasBox.appendChild(errEl);
     qrInstance = null;
     return;
   }
   try{
     qrInstance = new QRCode(qrCanvasBox, {
       text: content,
       width: 200,
       height: 200,
       colorDark: qrFgColor.value,
       colorLight: qrBgColor.value,
       correctLevel: QRCode.CorrectLevel.M
     });
   } catch(err){
     qrCanvasBox.innerHTML = '';
     const errEl = document.createElement('span');
     errEl.className = 'qr-empty-state';
     errEl.textContent = 'تعذّر إنشاء رمز QR. جرّب نصاً أقصر أو حاول مرة أخرى';
     qrCanvasBox.appendChild(errEl);
     qrInstance = null;
   }
 }
 
 ['qrUrlInput','qrTextInput','qrWifiSsid','qrWifiPass'].forEach(id => {
   document.getElementById(id).addEventListener('input', renderQr);
 });
 document.getElementById('qrWifiEnc').addEventListener('change', renderQr);
 qrFgColor.addEventListener('input', renderQr);
 qrBgColor.addEventListener('input', renderQr);
 
 document.getElementById('qrDownloadBtn').addEventListener('click', function(){
   const canvas = qrCanvasBox.querySelector('canvas');
   if(!canvas){
     showToast('أدخل بيانات أولاً لإنشاء الرمز');
     return;
   }
   canvas.toBlob(function(blob){
     if(!blob){
       showToast('تعذّر إنشاء ملف الصورة');
       return;
     }
     downloadBlob(blob, 'nafadh-qrcode.png');
     if(!isIosSafari()) showToast('⬇️ تم تحميل رمز QR');
   }, 'image/png');
 });
 
 // initial QR render with the default URL value
 renderQr();
 
 // =====================================================
 // SHARED FILE HELPERS
 // =====================================================
 function formatBytes(bytes){
   if(bytes < 1024) return bytes + ' بايت';
   if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' كيلوبايت';
   return (bytes/(1024*1024)).toFixed(2) + ' ميجابايت';
 }
 function setupDropzone(zoneId, inputId, onFile, opts){
   opts = opts || {};
   const zone = document.getElementById(zoneId);
   const input = document.getElementById(inputId);
   zone.addEventListener('click', () => input.click());
   zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
   zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
   zone.addEventListener('drop', e => {
     e.preventDefault();
     zone.classList.remove('drag-over');
     const files = opts.multiple ? Array.from(e.dataTransfer.files) : [e.dataTransfer.files[0]];
     if(files[0]) onFile(opts.multiple ? files : files[0]);
   });
   input.addEventListener('change', () => {
     if(opts.multiple){
       const files = Array.from(input.files);
       if(files.length) onFile(files);
     } else if(input.files[0]){
       onFile(input.files[0]);
     }
     input.value = '';
   });
 }
 function showError(elId, msg){
   const el = document.getElementById(elId);
   el.textContent = msg;
   el.classList.add('show');
 }
 function clearError(elId){
   const el = document.getElementById(elId);
   el.textContent = '';
   el.classList.remove('show');
 }
 const MAX_IMAGE_MB = 15;
 
 // Robust, cross-device image-file check.
 // Some pickers (iPad Files app, some Android galleries) leave file.type
 // empty even for valid JPG/PNG, so we also check the file extension.
 // HEIC/HEIF (the default iPhone camera format) is explicitly detected
 // and rejected with a clear message, because no browser's <img>/Canvas
 // can decode HEIC — this is a real browser limitation, not a bug here.
 const SUPPORTED_IMAGE_EXT = ['jpg','jpeg','png','webp','gif','bmp'];
 const HEIC_EXT = ['heic','heif'];
 
 function getFileExt(filename){
   const parts = (filename || '').split('.');
   return parts.length > 1 ? parts.pop().toLowerCase() : '';
 }
 
 function validateImageFile(file, errorElId){
   const ext = getFileExt(file.name);
   const typeIsImage = file.type && file.type.startsWith('image/');
   const typeIsHeic = file.type === 'image/heic' || file.type === 'image/heif';
 
   if(typeIsHeic || HEIC_EXT.includes(ext)){
     showError(errorElId, 'صيغة HEIC/HEIF (صيغة كاميرا آيفون الافتراضية) غير مدعومة من المتصفح مباشرة. غيّر إعداد آيفون إلى "الأكثر توافقاً" (Settings → Camera → Formats)، أو حوّل الصورة إلى JPG أولاً ثم ارفعها');
     return false;
   }
   if(!typeIsImage && !SUPPORTED_IMAGE_EXT.includes(ext)){
     showError(errorElId, 'الملف المختار ليس صورة مدعومة. الصيغ المدعومة: JPG, PNG, WebP, GIF, BMP');
     return false;
   }
   if(file.size === 0){
     showError(errorElId, 'الملف فارغ أو تالف، جرّب ملفاً آخر');
     return false;
   }
   if(file.size > MAX_IMAGE_MB*1024*1024){
     showError(errorElId, 'حجم الصورة أكبر من ' + MAX_IMAGE_MB + ' ميجابايت (الحجم الحالي: ' + formatBytes(file.size) + ')');
     return false;
   }
   return true;
 }
 const MAX_PDF_MB = 20;
 
 // Resilient image loader for the compressor/converter tools.
 // Plain <img>/Image() decoding can fail in some browsers for JPEGs
 // with unusual color profiles (CMYK, wide-gamut/Display P3 — common
 // from the iPhone Photos app) even though the file is perfectly valid.
 // createImageBitmap() uses the browser's native, more permissive image
 // decoder and handles these cases correctly, so we try it first and
 // only fall back to the basic <img> tag if it's unavailable or fails.
 // The result is always normalized to a <canvas> so both compressor
 // and converter can read pixel data identically either way.
 function loadImageRobust(file){
   return new Promise(function(resolve, reject){
     function viaImageTag(){
       const url = URL.createObjectURL(file);
       const img = new Image();
       img.onload = function(){
         resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
       };
       img.onerror = function(){
         URL.revokeObjectURL(url);
         reject(new Error('decode-failed'));
       };
       img.src = url;
     }
 
     if(window.createImageBitmap){
       createImageBitmap(file).then(function(bitmap){
         resolve({ source: bitmap, width: bitmap.width, height: bitmap.height });
       }).catch(function(){
         // Native bitmap decoder failed too — try the classic <img> path
         // as a last resort before giving up.
         viaImageTag();
       });
     } else {
       viaImageTag();
     }
   });
 }
 
 // =====================================================
 // IMAGE COMPRESSOR — real Canvas-based recompression
 // =====================================================
 let compressOriginalFile = null;
 let compressOriginalImg = null;
 let compressOriginalDims = null;
 let compressedBlob = null;
 
 setupDropzone('compressDropzone', 'compressFileInput', function(file){
   clearError('compressError');
   if(!validateImageFile(file, 'compressError')) return;
   compressOriginalFile = file;
   const previewUrl = URL.createObjectURL(file);
 
   loadImageRobust(file).then(function(result){
     compressOriginalImg = result.source;
     compressOriginalDims = { width: result.width, height: result.height };
     document.getElementById('compressWorkArea').style.display = '';
     document.getElementById('compressBeforeImg').src = previewUrl;
     document.getElementById('compressBeforeSize').textContent = formatBytes(file.size);
     document.getElementById('compressAfterImg').src = '';
     document.getElementById('compressAfterSize').textContent = '—';
     document.getElementById('compressSavings').style.display = 'none';
     document.getElementById('compressDownloadBtn').style.display = 'none';
     compressedBlob = null;
   }).catch(function(){
     URL.revokeObjectURL(previewUrl);
     showError('compressError', 'تعذّر فك تشفير هذه الصورة في المتصفح. قد يكون الملف تالفاً فعلياً، أو محفوظاً بترميز نادر غير مدعوم. جرّب فتحه وحفظه مجدداً من تطبيق الصور ثم إعادة الرفع');
   });
 });
 
 document.getElementById('compressQuality').addEventListener('input', function(){
   document.getElementById('compressQualityVal').textContent = this.value + '%';
 });
 
 document.getElementById('compressRunBtn').addEventListener('click', function(){
   if(!compressOriginalImg) return;
   clearError('compressError');
   const quality = parseInt(document.getElementById('compressQuality').value, 10) / 100;
   const canvas = document.createElement('canvas');
   canvas.width = compressOriginalDims.width;
   canvas.height = compressOriginalDims.height;
   const ctx = canvas.getContext('2d');
   ctx.drawImage(compressOriginalImg, 0, 0);
   // JPEG output gives true lossy compression; PNG ignores quality, so force JPEG for compression
   canvas.toBlob(function(blob){
     if(!blob){
       showError('compressError', 'فشلت عملية الضغط، جرّب مرة أخرى');
       return;
     }
     // On very simple/flat images, JPEG's fixed header overhead can exceed
     // the original (especially tiny/simple PNGs). Never hand the user a
     // bigger file than they started with — use the original instead.
     const finalBlob = blob.size < compressOriginalFile.size ? blob : compressOriginalFile;
     const usedOriginal = finalBlob === compressOriginalFile;
     compressedBlob = finalBlob;
     const url = URL.createObjectURL(finalBlob);
     document.getElementById('compressAfterImg').src = url;
     document.getElementById('compressAfterSize').textContent = formatBytes(finalBlob.size);
     const savingsPct = Math.max(0, Math.round((1 - finalBlob.size/compressOriginalFile.size)*100));
     const savingsEl = document.getElementById('compressSavings');
     savingsEl.style.display = '';
     savingsEl.textContent = usedOriginal
       ? 'ℹ️ الصورة الأصلية مضغوطة بالفعل بكفاءة عالية — لا حاجة لمزيد من الضغط'
       : '✅ تم تقليل الحجم بنسبة ' + savingsPct + '%';
     document.getElementById('compressDownloadBtn').style.display = '';
     showToast('🗜️ تم ضغط الصورة');
   }, 'image/jpeg', quality);
 });
 
 document.getElementById('compressDownloadBtn').addEventListener('click', function(){
   if(!compressedBlob) return;
   const ext = compressedBlob.type === 'image/jpeg' ? 'jpg' : (getFileExt(compressOriginalFile.name) || 'jpg');
   downloadBlob(compressedBlob, 'nafadh-compressed.' + ext);
   if(!isIosSafari()) showToast('⬇️ تم تحميل الصورة');
 });
 
 // =====================================================
 // IMAGE FORMAT CONVERTER — real Canvas-based re-encoding
 // =====================================================
 let convertOriginalFile = null;
 let convertOriginalImg = null;
 let convertOriginalDims = null;
 let convertedBlob = null;
 
 setupDropzone('convertDropzone', 'convertFileInput', function(file){
   clearError('convertError');
   if(!validateImageFile(file, 'convertError')) return;
   convertOriginalFile = file;
   const previewUrl = URL.createObjectURL(file);
 
   loadImageRobust(file).then(function(result){
     convertOriginalImg = result.source;
     convertOriginalDims = { width: result.width, height: result.height };
     document.getElementById('convertWorkArea').style.display = '';
     document.getElementById('convertBeforeImg').src = previewUrl;
     document.getElementById('convertBeforeSize').textContent = formatBytes(file.size) + ' • ' + (file.type.split('/')[1] || getFileExt(file.name)).toUpperCase();
     document.getElementById('convertAfterImg').src = '';
     document.getElementById('convertAfterSize').textContent = '—';
     document.getElementById('convertDownloadBtn').style.display = 'none';
     convertedBlob = null;
   }).catch(function(){
     URL.revokeObjectURL(previewUrl);
     showError('convertError', 'تعذّر فك تشفير هذه الصورة في المتصفح. قد يكون الملف تالفاً فعلياً، أو محفوظاً بترميز نادر غير مدعوم. جرّب فتحه وحفظه مجدداً من تطبيق الصور ثم إعادة الرفع');
   });
 });
 
 document.getElementById('convertRunBtn').addEventListener('click', function(){
   if(!convertOriginalImg) return;
   clearError('convertError');
   const targetType = document.getElementById('convertTargetFormat').value;
   const canvas = document.createElement('canvas');
   canvas.width = convertOriginalDims.width;
   canvas.height = convertOriginalDims.height;
   const ctx = canvas.getContext('2d');
   // Fill white background for formats without alpha (JPG) to avoid black backgrounds on transparent PNGs
   if(targetType === 'image/jpeg'){
     ctx.fillStyle = '#ffffff';
     ctx.fillRect(0,0,canvas.width,canvas.height);
   }
   ctx.drawImage(convertOriginalImg, 0, 0);
   canvas.toBlob(function(blob){
     if(!blob){
       showError('convertError', 'هذه الصيغة غير مدعومة في متصفحك، جرّب صيغة أخرى');
       return;
     }
     convertedBlob = blob;
     const url = URL.createObjectURL(blob);
     document.getElementById('convertAfterImg').src = url;
     document.getElementById('convertAfterSize').textContent = formatBytes(blob.size) + ' • ' + targetType.split('/')[1].toUpperCase();
     document.getElementById('convertDownloadBtn').style.display = '';
     showToast('🔄 تم تحويل الصيغة');
   }, targetType, 0.92);
 });
 
 document.getElementById('convertDownloadBtn').addEventListener('click', function(){
   if(!convertedBlob) return;
   const ext = document.getElementById('convertTargetFormat').value.split('/')[1].replace('jpeg','jpg');
   downloadBlob(convertedBlob, 'nafadh-converted.' + ext);
   if(!isIosSafari()) showToast('⬇️ تم تحميل الصورة المحوّلة');
 });
 
 // =====================================================
 // BASE64 / URL ENCODER-DECODER — real, runs entirely client-side
 // =====================================================
 let b64Mode = 'base64'; // 'base64' | 'url'
 let b64Direction = 'encode'; // 'encode' | 'decode'
 
 document.querySelectorAll('[data-b64mode]').forEach(btn => {
   btn.addEventListener('click', () => {
     document.querySelectorAll('[data-b64mode]').forEach(b => b.classList.remove('active'));
     btn.classList.add('active');
     b64Mode = btn.dataset.b64mode;
     runB64();
   });
 });
 
 document.getElementById('b64SwapBtn').addEventListener('click', function(){
   b64Direction = b64Direction === 'encode' ? 'decode' : 'encode';
   // swap textarea contents for convenience
   const inEl = document.getElementById('b64Input');
   const outEl = document.getElementById('b64Output');
   const tmp = inEl.value;
   inEl.value = outEl.value;
   outEl.value = tmp;
   runB64();
   showToast(b64Direction === 'encode' ? '↔️ وضع التشفير' : '↔️ وضع فك التشفير');
 });
 
 function utf8ToBase64(str){
   return btoa(unescape(encodeURIComponent(str)));
 }
 function base64ToUtf8(str){
   return decodeURIComponent(escape(atob(str)));
 }
 
 function runB64(){
   const input = document.getElementById('b64Input').value;
   const outEl = document.getElementById('b64Output');
   clearError('b64Error');
   if(!input){ outEl.value = ''; return; }
   try{
     if(b64Mode === 'base64'){
       outEl.value = b64Direction === 'encode' ? utf8ToBase64(input) : base64ToUtf8(input);
     } else {
       outEl.value = b64Direction === 'encode' ? encodeURIComponent(input) : decodeURIComponent(input);
     }
   } catch(err){
     outEl.value = '';
     showError('b64Error', b64Direction === 'decode'
       ? 'تعذّر فك التشفير — تأكد أن النص بالصيغة الصحيحة'
       : 'تعذّر تشفير النص المُدخل');
   }
 }
 document.getElementById('b64Input').addEventListener('input', runB64);
 document.getElementById('b64CopyBtn').addEventListener('click', function(){
   const val = document.getElementById('b64Output').value;
   if(!val){ showToast('لا يوجد نص للنسخ بعد'); return; }
   copyText(val).then(() => showToast('📋 تم نسخ النتيجة')).catch(() => showToast('تعذّر النسخ'));
 });
 
 // =====================================================
 // PDF MERGE — real merging via pdf-lib (client-side only)
 // =====================================================
 let pdfFiles = []; // { id, file, name, sizeLabel }
 let pdfIdCounter = 0;
 
 function renderPdfList(){
   const list = document.getElementById('pdfList');
   list.innerHTML = '';
   pdfFiles.forEach((entry, index) => {
     const row = document.createElement('div');
     row.className = 'pdf-item';
 
     const num = document.createElement('div');
     num.className = 'pdf-num';
     num.textContent = String(index + 1);
 
     const name = document.createElement('div');
     name.className = 'pdf-name';
     name.textContent = entry.name + ' • ' + entry.sizeLabel;
     name.title = entry.name;
 
     const actions = document.createElement('div');
     actions.className = 'pdf-actions';
 
     const upBtn = document.createElement('button');
     upBtn.type = 'button';
     upBtn.title = 'تحريك للأعلى';
     upBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>';
     upBtn.disabled = index === 0;
     upBtn.style.opacity = index === 0 ? '0.3' : '1';
     upBtn.addEventListener('click', () => {
       if(index === 0) return;
       [pdfFiles[index-1], pdfFiles[index]] = [pdfFiles[index], pdfFiles[index-1]];
       renderPdfList();
     });
 
     const downBtn = document.createElement('button');
     downBtn.type = 'button';
     downBtn.title = 'تحريك للأسفل';
     downBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
     downBtn.disabled = index === pdfFiles.length - 1;
     downBtn.style.opacity = index === pdfFiles.length - 1 ? '0.3' : '1';
     downBtn.addEventListener('click', () => {
       if(index === pdfFiles.length - 1) return;
       [pdfFiles[index+1], pdfFiles[index]] = [pdfFiles[index], pdfFiles[index+1]];
       renderPdfList();
     });
 
     const removeBtn = document.createElement('button');
     removeBtn.type = 'button';
     removeBtn.title = 'إزالة';
     removeBtn.style.color = 'var(--red)';
     removeBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
     removeBtn.addEventListener('click', () => {
       pdfFiles = pdfFiles.filter(f => f.id !== entry.id);
       renderPdfList();
     });
 
     actions.appendChild(upBtn);
     actions.appendChild(downBtn);
     actions.appendChild(removeBtn);
     row.appendChild(num);
     row.appendChild(name);
     row.appendChild(actions);
     list.appendChild(row);
   });
   document.getElementById('pdfMergeBtn').style.display = pdfFiles.length >= 2 ? '' : 'none';
   if(pdfFiles.length === 1){
     showError('pdfError', 'أضف ملفاً ثانياً على الأقل لدمج الملفات');
   } else if(pdfFiles.length >= 2){
     clearError('pdfError');
   }
   // Note: when pdfFiles.length === 0 we deliberately do nothing here,
   // so a rejection message set by the upload handler (wrong file type,
   // too large, etc) stays visible instead of being wiped immediately.
 }
 
 setupDropzone('pdfDropzone', 'pdfFileInput', function(files){
   clearError('pdfError');
   files.forEach(file => {
     if(file.type !== 'application/pdf'){
       showError('pdfError', 'تم تجاهل "' + file.name + '" — ليس ملف PDF');
       return;
     }
     if(file.size > MAX_PDF_MB*1024*1024){
       showError('pdfError', 'الملف "' + file.name + '" أكبر من ' + MAX_PDF_MB + ' ميجابايت');
       return;
     }
     pdfFiles.push({ id: ++pdfIdCounter, file: file, name: file.name, sizeLabel: formatBytes(file.size) });
   });
   renderPdfList();
 }, { multiple: true });
 
 document.getElementById('pdfMergeBtn').addEventListener('click', async function(){
   if(pdfFiles.length < 2) return;
   clearError('pdfError');
   const progressWrap = document.getElementById('pdfProgressWrap');
   const progressFill = document.getElementById('pdfProgressFill');
   const progressText = document.getElementById('pdfProgressText');
   progressWrap.classList.add('active');
   progressFill.style.width = '0%';
 
   try{
     if(typeof PDFLib === 'undefined'){
       throw new Error('PDFLib-not-loaded');
     }
     const { PDFDocument } = PDFLib;
     const mergedPdf = await PDFDocument.create();
 
     for(let i=0; i<pdfFiles.length; i++){
       progressText.textContent = 'جارٍ معالجة ' + pdfFiles[i].name + ' (' + (i+1) + '/' + pdfFiles.length + ')';
       const bytes = await pdfFiles[i].file.arrayBuffer();
       const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
       const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
       pages.forEach(p => mergedPdf.addPage(p));
       progressFill.style.width = Math.round(((i+1)/pdfFiles.length)*100) + '%';
     }
 
     progressText.textContent = 'جارٍ إنشاء الملف النهائي...';
     const mergedBytes = await mergedPdf.save();
     const blob = new Blob([mergedBytes], { type: 'application/pdf' });
     downloadBlob(blob, 'nafadh-merged.pdf');
 
     progressText.textContent = 'تم الدمج بنجاح ✅';
     showToast(isIosSafari() ? '📎 تم الدمج — افتح الملف واختر "حفظ في الملفات"' : '📎 تم دمج ' + pdfFiles.length + ' ملفات وتحميل PDF واحد');
     setTimeout(() => { progressWrap.classList.remove('active'); }, 1600);
   } catch(err){
     progressWrap.classList.remove('active');
     if(err && err.message === 'PDFLib-not-loaded'){
       showError('pdfError', '⚠️ تعذّر تحميل مكتبة معالجة PDF من الإنترنت. تأكد من اتصالك بالشبكة وأن أي أداة حظر إعلانات لا تمنع الموقع، ثم أعد تحميل الصفحة');
     } else {
       showError('pdfError', 'تعذّر دمج الملفات — تأكد أن جميعها ملفات PDF صالحة وغير محمية بكلمة مرور');
     }
   }
 });
 
 // ---------- Initial generation on load ----------
 generatePassword();
 generateUsernames();
 generateFakeData();
 
 // ---------- "All Tools" page: populate grid by cloning home tool cards ----------
 const toolsGridFull = document.getElementById('toolsGridFull');
 document.querySelectorAll('#tools .tool-card').forEach(card => {
   toolsGridFull.appendChild(card.cloneNode(true));
 });
 
})();
