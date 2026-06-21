const express = require('express');
const path = require('path');
const app = express();

// إعداد السيرفر لاستقبال طلبات الـ JSON
app.use(express.json());

// هذا هو الجزء الأهم: إخبار السيرفر أين يجد ملفات الواجهة الأمامية (Frontend)
// المسار هنا يفترض أن ملف server.js داخل مجلد backend ومجلد frontend بجانبه
app.use(express.static(path.join(__dirname, '../frontend')));

// بقية مسارات الـ API الخاصة بك (مثل التي تستخدمها في تطبيقك)
// ضع مساراتك هنا، مثال:
// app.use('/api/users', require('./routes/userRoutes'));

// هذا السطر يضمن أن أي رابط لا يعرفه السيرفر سيتم توجيهه لملف index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

/* =========================
   🛡️ الحماية الأساسية
========================= */

// حماية الهيدرز
app.use(helmet());

// حماية من الضغط (DDoS خفيف)
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: "Too many requests, slow down."
});

app.use('/api', limiter);

// منع JSON كبير
app.use(express.json({ limit: "50kb" }));

// ملفات الواجهة
app.use(express.static(path.join(__dirname, '../frontend')));


/* =========================
   🧠 قاعدة البيانات المؤقتة
========================= */

let emails = [];


/* =========================
   🧹 فلترة المدخلات
========================= */

function cleanInput(input) {
    if (typeof input !== "string") return "";
    return input.replace(/</g, "")
                .replace(/>/g, "")
                .trim()
                .slice(0, 500);
}


/* =========================
   📧 إنشاء إيميل مؤقت
========================= */

app.post('/api/email/create', (req, res) => {
    const id = Date.now().toString();

    const email = {
        id,
        address: ${id}@nafadh.temp,
        messages: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000 // 60 دقيقة
    };

    emails.push(email);

    res.json(email);
});


/* =========================
   📩 إرسال رسالة للإيميل
========================= */

app.post('/api/email/send', (req, res) => {
    const emailId = cleanInput(req.body.emailId);
    const content = cleanInput(req.body.content);

    if (!emailId || !content) {
        return res.status(400).send("Invalid data");
    }

    const email = emails.find(e => e.id === emailId);

    if (!email) {
        return res.status(404).send("Email not found");
    }

    email.messages.push({
        content,
        time: Date.now()
    });

    res.json({ success: true });
});


/* =========================
   📬 جلب الإيميل + الرسائل
========================= */

app.get('/api/email/:id', (req, res) => {
    const email = emails.find(e => e.id === req.params.id);

    if (!email) {
        return res.status(404).send("Not found");
    }

    // انتهاء الصلاحية
    if (Date.now() > email.expiresAt) {
        emails = emails.filter(e => e.id !== email.id);
        return res.status(410).send("Expired");
    }

    res.json(email);
});


/* =========================
   🧹 تنظيف تلقائي (كل دقيقة)
========================= */

setInterval(() => {
    const now = Date.now();
    emails = emails.filter(e => e.expiresAt > now);
}, 60000);


/* =========================
   🧩 مكان إضافة أدوات مستقبلية
========================= */

app.post('/api/tools/ping', (req, res) => {
    res.json({ status: "ok" });
});


/* =========================
   🌐 تشغيل الموقع
========================= */

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
