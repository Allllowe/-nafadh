'use strict';
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const crypto   = require('crypto');
const QRCode   = require('qrcode');

// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const PORT                 = parseInt(process.env.PORT, 10)          || 5000;
const INBOX_DOMAIN         = process.env.INBOX_DOMAIN                || 'nafadh.local';
const INBOX_TTL_MINUTES    = parseInt(process.env.INBOX_TTL_MINUTES, 10) || 20;
const INBOUND_WEBHOOK_SECRET = process.env.INBOUND_WEBHOOK_SECRET    || '';

function parseOrigins(raw){
  if(!raw || raw.trim() === '*') return '*';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
const CORS_ORIGIN = parseOrigins(process.env.CORS_ORIGIN);

// ─────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────
function secureRandomInt(max){ return crypto.randomInt(0, max); }
function randomId(){ return crypto.randomUUID(); }
function randomDigits(n){ let s=''; for(let i=0;i<n;i++) s+=secureRandomInt(10); return s; }

function randomAddrSegment(len){
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for(let i=0;i<len;i++) s += chars[secureRandomInt(chars.length)];
  return s;
}

function timeAgoArabic(date){
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff/60000);
  if(m<=0) return 'الآن';
  if(m===1) return 'منذ دقيقة';
  if(m===2) return 'منذ دقيقتين';
  if(m<=10) return 'منذ '+m+' دقائق';
  if(m<60) return 'منذ '+m+' دقيقة';
  const h = Math.floor(m/60);
  if(h===1) return 'منذ ساعة';
  if(h===2) return 'منذ ساعتين';
  if(h<=10) return 'منذ '+h+' ساعات';
  if(h<24) return 'منذ '+h+' ساعة';
  const d = Math.floor(h/24);
  if(d===1) return 'منذ يوم';
  if(d===2) return 'منذ يومين';
  return 'منذ '+d+' أيام';
}

// ─────────────────────────────────────────────
//  INBOX SERVICE  (in-memory)
// ─────────────────────────────────────────────
const AVATAR_COLORS = ['#8b5cf6','#34d399','#60a5fa','#fbbf24','#f472b6'];
const inboxes = new Map();   // address → inbox object

function ttlMs(){ return INBOX_TTL_MINUTES * 60 * 1000; }
function isExpired(inbox){ return Date.now() > inbox.expiresAt; }

setInterval(()=>{
  for(const [addr, inbox] of inboxes){
    if(isExpired(inbox)) inboxes.delete(addr);
  }
}, 60*1000).unref();

function seedMessages(){
  const now = Date.now();
  return [
    { offsetMin:2,  subject:'تأكيد إنشاء حسابك',      preview:'مرحباً بك! يرجى مراجعة بيانات حسابك الجديد من خلال لوحة التحكم.', sender:'team@example-app.com',      initial:'A', read:false },
    { offsetMin:6,  subject:'رمز تحقق تجريبي',          preview:'هذا رمز تحقق تجريبي لأغراض الاختبار فقط. صالح لمدة 10 دقائق.',   sender:'verify@demo-service.test',  initial:'V', read:false },
    { offsetMin:14, subject:'فاتورتك الشهرية جاهزة',    preview:'يمكنك الاطلاع على تفاصيل الفاتورة والدفع من خلال الرابط المرفق.', sender:'billing@sample-co.io',      initial:'B', read:true  },
    { offsetMin:28, subject:'تحديث في سياسة الاستخدام', preview:'قمنا بتحديث شروط الاستخدام الخاصة بنا، يرجى الاطلاع عليها.',    sender:'updates@notify-test.net',   initial:'N', read:true  },
    { offsetMin:60, subject:'نشرة الأخبار الأسبوعية',   preview:'إليك أهم الأخبار والتحديثات لهذا الأسبوع من فريقنا.',           sender:'news@weekly-demo.com',      initial:'W', read:true  },
  ].map((m,i)=>({
    id: randomId(),
    subject: m.subject,
    preview: m.preview,
    sender:  m.sender,
    color:   AVATAR_COLORS[i % AVATAR_COLORS.length],
    initial: m.initial,
    read:    m.read,
    receivedAt: new Date(now - m.offsetMin*60000).toISOString()
  }));
}

function serializeMsg(m){
  return { id:m.id, time:timeAgoArabic(m.receivedAt), subject:m.subject,
           preview:m.preview, sender:m.sender, color:m.color, initial:m.initial, read:m.read };
}

function createInbox(){
  const address = randomAddrSegment(7) + '@' + INBOX_DOMAIN;
  const msgs    = new Map();
  seedMessages().forEach(m => msgs.set(m.id, m));
  const inbox = { address, createdAt:Date.now(), expiresAt:Date.now()+ttlMs(), messages:msgs };
  inboxes.set(address, inbox);
  return inbox;
}

function getInbox(address){
  const i = inboxes.get(address);
  if(!i || isExpired(i)){ inboxes.delete(address); return null; }
  return i;
}

function listMsgs(address){
  const i = getInbox(address); if(!i) return null;
  return Array.from(i.messages.values())
    .sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt))
    .map(serializeMsg);
}

// ─────────────────────────────────────────────
//  TOOLS SERVICES
// ─────────────────────────────────────────────
const SHORT_WORDS = ['fox','wolf','nova','zed','raven','kai','luna','rex','axe','jet','iris','ash','neo','vex','sky','onyx','blitz','echo','pix','rune'];

function generateUsernames({ keyword, digits }){
  const kw = String(keyword||'').replace(/[^a-zA-Z0-9]/g,'').slice(0,8).toLowerCase();
  const dg = Math.min(Math.max(parseInt(digits,10)||0,0),3);
  const used = new Set(); let attempts=0;
  while(used.size<6 && attempts<60){
    attempts++;
    const word = SHORT_WORDS[secureRandomInt(SHORT_WORDS.length)];
    const base = (kw ? kw+word : word).slice(0,10);
    used.add(base + (dg>0 ? randomDigits(dg) : ''));
  }
  return Array.from(used);
}

const AR_FIRST=['عبدالله','سارة','خالد','نورة','فهد','ريم','يوسف','هند','ماجد','لمى'];
const AR_LAST =['الحربي','القحطاني','العتيبي','الدوسري','الزهراني','الشمري','المطيري'];
const EN_FIRST=['James','Emma','Liam','Olivia','Noah','Ava','Lucas','Mia','Ethan','Sophia'];
const EN_LAST =['Smith','Johnson','Brown','Davis','Miller','Wilson','Moore','Taylor'];
const CITIES_AR=['الرياض','جدة','الدمام','مكة','المدينة','أبها','تبوك'];
const CITIES_EN=['New York','London','Toronto','Sydney','Berlin','Chicago'];

function generateFakeData({ locale }){
  const ar = locale !== 'en';
  const first = (ar?AR_FIRST:EN_FIRST)[secureRandomInt((ar?AR_FIRST:EN_FIRST).length)];
  const last  = (ar?AR_LAST:EN_LAST)[secureRandomInt((ar?AR_LAST:EN_LAST).length)];
  const city  = (ar?CITIES_AR:CITIES_EN)[secureRandomInt((ar?CITIES_AR:CITIES_EN).length)];
  const emailUser = (ar?'user':first.toLowerCase()) + randomDigits(3);
  return [
    { k:'الاسم الكامل',       v: first+' '+last },
    { k:'البريد الإلكتروني', v: emailUser+'@example-demo.com' },
    { k:'اسم المستخدم',      v: (first+randomDigits(3)).toLowerCase() },
    { k:'كلمة المرور',       v: 'Demo'+randomDigits(4)+'!x' },
    { k:'رقم الهاتف',        v: '+'+(ar?'966 5':'1 ')+randomDigits(8) },
    { k:'المدينة',           v: city },
    { k:'تاريخ الميلاد',     v: (1990+secureRandomInt(15))+'-'+String(1+secureRandomInt(12)).padStart(2,'0')+'-'+String(1+secureRandomInt(28)).padStart(2,'0') },
  ];
}

// ─────────────────────────────────────────────
//  EXPRESS APP
// ─────────────────────────────────────────────
const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit:'1mb' }));

// ── تقديم ملفات الـ Frontend ──
// المسار يفترض أن server.js موجود في مجلد backend
// وملفات الواجهة في المجلد الأخ frontend
// إذا وضعت كل الملفات في نفس المجلد، غيّر المسار إلى:
// path.join(__dirname, 'frontend')
app.use(express.static(path.join(__dirname, '../frontend')));

// ── HEALTH CHECK ──
app.get('/api/health', (req,res)=>{
  res.json({ status:'ok', service:'nafadh', time:new Date().toISOString() });
});

// ─────────────────── INBOX ROUTES ───────────────────

// إنشاء صندوق بريد مؤقت جديد
app.post('/api/inbox', (req,res)=>{
  const inbox = createInbox();
  res.status(201).json({
    address: inbox.address,
    expiresAt: new Date(inbox.expiresAt).toISOString(),
    messages: listMsgs(inbox.address)
  });
});

// عرض رسائل صندوق
app.get('/api/inbox/:address/messages', (req,res)=>{
  const msgs = listMsgs(req.params.address);
  if(msgs===null) return res.status(404).json({ message:'الصندوق غير موجود أو انتهت صلاحيته' });
  res.json({ address:req.params.address, messages:msgs });
});

// تعليم رسالة كمقروءة
app.patch('/api/inbox/:address/messages/:id/read', (req,res)=>{
  const inbox = getInbox(req.params.address);
  if(!inbox) return res.status(404).json({ message:'الصندوق غير موجود' });
  const m = inbox.messages.get(req.params.id);
  if(!m) return res.status(404).json({ message:'الرسالة غير موجودة' });
  m.read = true;
  res.json({ message: serializeMsg(m) });
});

// حذف كل الرسائل
app.delete('/api/inbox/:address/messages', (req,res)=>{
  const inbox = getInbox(req.params.address);
  if(!inbox) return res.status(404).json({ message:'الصندوق غير موجود' });
  inbox.messages.clear();
  res.status(204).end();
});

// حذف الصندوق بالكامل
app.delete('/api/inbox/:address', (req,res)=>{
  const ok = inboxes.delete(req.params.address);
  if(!ok) return res.status(404).json({ message:'الصندوق غير موجود' });
  res.status(204).end();
});

// تمديد صلاحية الصندوق
app.post('/api/inbox/:address/extend', (req,res)=>{
  const inbox = getInbox(req.params.address);
  if(!inbox) return res.status(404).json({ message:'الصندوق غير موجود' });
  const minutes = Math.min(Math.max(parseInt((req.body||{}).minutes,10)||10,1),60);
  inbox.expiresAt += minutes * 60 * 1000;
  res.json({ expiresAt: new Date(inbox.expiresAt).toISOString() });
});

// استقبال بريد حقيقي (Webhook من Mailgun/SendGrid وما شابه)
app.post('/api/inbox/:address/messages', (req,res)=>{
  const provided = req.get('X-Webhook-Secret');
  if(!INBOUND_WEBHOOK_SECRET || provided !== INBOUND_WEBHOOK_SECRET)
    return res.status(401).json({ message:'Unauthorized' });
  const inbox = getInbox(req.params.address);
  if(!inbox) return res.status(404).json({ message:'الصندوق غير موجود' });
  const { subject, preview, sender, initial, color } = req.body||{};
  const msg = {
    id: randomId(),
    subject: subject||'(بدون عنوان)',
    preview: preview||'',
    sender:  sender||'unknown@unknown.com',
    color:   color||AVATAR_COLORS[secureRandomInt(AVATAR_COLORS.length)],
    initial: initial||(sender?sender[0].toUpperCase():'?'),
    read:    false,
    receivedAt: new Date().toISOString()
  };
  inbox.messages.set(msg.id, msg);
  res.status(201).json({ message: serializeMsg(msg) });
});

// ─────────────────── TOOLS ROUTES ───────────────────

// مولّد اليوزرات
app.post('/api/tools/username', (req,res)=>{
  const { keyword, digits } = req.body||{};
  res.json({ usernames: generateUsernames({ keyword, digits }) });
});

// مولّد البيانات التجريبية
app.post('/api/tools/fake-data', (req,res)=>{
  const { locale } = req.body||{};
  res.json({ data: generateFakeData({ locale }) });
});

// مولّد QR Code
app.post('/api/tools/qrcode', async (req,res)=>{
  const { content, fgColor, bgColor } = req.body||{};
  if(!content||!String(content).trim())
    return res.status(400).json({ message:'content مطلوب' });
  try{
    const dataUrl = await QRCode.toDataURL(String(content),{
      width:300, margin:2,
      color:{ dark:fgColor||'#0b0a12', light:bgColor||'#ffffff' }
    });
    res.json({ dataUrl });
  } catch(e){
    res.status(500).json({ message:'فشل توليد QR' });
  }
});

// Base64 / URL تشفير وفك تشفير
app.post('/api/tools/base64', (req,res)=>{
  const { text, mode, direction } = req.body||{};
  if(typeof text !== 'string') return res.status(400).json({ message:'text مطلوب' });
  try{
    let result;
    if(mode==='url'){
      result = direction==='decode' ? decodeURIComponent(text) : encodeURIComponent(text);
    } else {
      result = direction==='decode'
        ? Buffer.from(text,'base64').toString('utf8')
        : Buffer.from(text,'utf8').toString('base64');
    }
    res.json({ result });
  } catch(e){
    res.status(400).json({ message:'تعذّر معالجة النص' });
  }
});

// ─────────────────────────────────────────────
//  404 API + SPA fallback
// ─────────────────────────────────────────────
app.use('/api', (req,res)=>{
  res.status(404).json({ message:'Route not found: '+req.method+' '+req.originalUrl });
});

// أي رابط آخر يُوجَّه لـ index.html (Single Page App)
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// ─────────────────────────────────────────────
//  ERROR HANDLER
// ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next)=>{
  console.error(err);
  res.status(err.status||500).json({ message: err.message||'خطأ في الخادم' });
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
app.listen(PORT, ()=>{
  console.log('');
  console.log('✅  Nafadh backend — شغّال!');
  console.log('   Local:  http://localhost:'+PORT);
  console.log('   API:    http://localhost:'+PORT+'/api/health');
  console.log('');
});
