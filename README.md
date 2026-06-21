# نَفاذ Nafadh — مشروع كامل منظم (Frontend + Backend)

هذا المشروع تم استخراجه وتنظيمه من ملف واحد (HTML/CSS/JS مدمج) إلى **مشروع حقيقي
مقسّم إلى Frontend و Backend**، بدون أي تغيير في التصميم أو الألوان أو الواجهة.

```
nafadh-project/
├── frontend/              ← الواجهة (نفس التصميم 100%)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── backend/                ← خادم Node.js / Express
    ├── server.js
    ├── package.json
    ├── .env.example
    └── src/
        ├── app.js
        ├── config/
        ├── routes/
        ├── controllers/
        ├── services/
        ├── middleware/
        └── utils/
```

## ما الذي تغيّر فعلياً؟

- **لا شيء في التصميم.** نفس الـ HTML، نفس الـ CSS، نفس الألوان، نفس سلوك الواجهة.
- تم فصل الكود من ملف واحد إلى ثلاثة ملفات frontend نظيفة.
- تم بناء **API حقيقي بـ Express** يدير:
  - **البريد المؤقت (Inbox):** إنشاء عنوان، عرض الرسائل، حذفها، تمديد الصلاحية —
    هذا الجزء كان "وهمياً" بالكامل في الملف الأصلي (بيانات ثابتة في الـ JS)، والآن
    أصبح يُدار من خادم حقيقي بحالة (state) محفوظة في الذاكرة، وجاهز لربطه بخدمة
    بريد إلكتروني واردة حقيقية (راجع قسم "تفعيل استقبال بريد حقيقي" أدناه).
  - **مولّد اليوزرات** و **مولّد البيانات التجريبية**: أصبحت تُطلب من الـ API،
    مع **fallback محلي تلقائي** إذا كان الخادم غير شغّال، حتى لا تتعطل الواجهة.
- أدوات **مولّد/فاحص كلمة المرور**، **ضغط/تحويل الصور**، **Base64**، و **دمج PDF**
  بقيت تعمل بالكامل من المتصفح (Client-side) **عمداً** — لأن واجهة الموقع نفسها
  تَعِد المستخدم صراحةً أن هذه العمليات "لا تُرسل لأي خادم" / "بدون رفع لأي خادم".
  تغيير هذا كان سيُغيّر سلوك الواجهة المعلن للمستخدم، وهو ما طُلب عدم تغييره.
  ومع ذلك أضفنا نسخة Backend اختيارية من QR و Base64 ضمن `/api/tools` لمن يريد
  استخدامها من تطبيقات أو عملاء API آخرين خارج هذه الواجهة.

## التشغيل السريع

### 1) شغّل الـ Backend
```bash
cd backend
cp .env.example .env     # عدّل القيم إذا أردت
npm install
npm run dev               # أو: npm start
```
سيعمل على: `http://localhost:5000` — جرّبه بفتح `http://localhost:5000/api/health`

### 2) شغّل الـ Frontend
الواجهة ملفات ثابتة (static)، يمكن تشغيلها بأي سيرفر بسيط — **تجنّب فتح
`index.html` مباشرة بنقرتين (file://)** لأن بعض المتصفحات تتعامل مع طلبات
`fetch` بشكل مختلف من بروتوكول `file://`. مثال سريع:

```bash
cd frontend
npx serve .
# أو: python3 -m http.server 5500
```

ثم افتح الرابط الذي يظهر لك (مثلاً `http://localhost:5500`).

إذا كان الـ Backend يعمل على عنوان مختلف عن `http://localhost:5000/api`، أضف
هذا السطر في `index.html` **قبل** سطر `<script src="script.js">`:
```html
<script>window.NAFADH_API_BASE = 'https://your-api-domain.com/api';</script>
```

## مرجع الـ API

| Method | Path | الوصف |
|---|---|---|
| GET | `/api/health` | فحص حالة الخادم |
| POST | `/api/inbox` | إنشاء بريد مؤقت جديد |
| GET | `/api/inbox/:address/messages` | عرض رسائل صندوق معيّن |
| GET | `/api/inbox/:address/messages/:id` | عرض رسالة واحدة |
| PATCH | `/api/inbox/:address/messages/:id/read` | تعليم رسالة كمقروءة |
| DELETE | `/api/inbox/:address/messages` | حذف كل الرسائل |
| DELETE | `/api/inbox/:address` | حذف الصندوق بالكامل |
| POST | `/api/inbox/:address/extend` | تمديد صلاحية الصندوق `{ minutes }` |
| POST | `/api/inbox/:address/messages` | **Webhook** لاستقبال بريد حقيقي (يتطلب الهيدر `X-Webhook-Secret`) |
| POST | `/api/tools/username` | توليد يوزرات `{ keyword, digits }` |
| POST | `/api/tools/fake-data` | توليد بيانات تجريبية `{ locale: "ar"\|"en" }` |
| POST | `/api/tools/qrcode` | توليد QR (PNG كـ data URL) `{ content, fgColor, bgColor }` |
| POST | `/api/tools/base64` | تشفير/فك تشفير `{ text, mode: "base64"\|"url", direction: "encode"\|"decode" }` |

## تفعيل استقبال بريد حقيقي

حالياً صندوق الوارد يُنشأ بصندوق فارغ تقريباً (مع بضع رسائل تجريبية واضحة
المصدر) لأن المشروع الأصلي لم يكن متصلاً بأي خدمة بريد حقيقية. لتحويله إلى
بريد مؤقت حقيقي 100%، تحتاج طبقة استقبال بريد فعلية، مثل:

1. **مزوّد جاهز** (الأسهل): Mailgun Routes أو SendGrid Inbound Parse أو
   Postmark Inbound — كلها ترسل الرسالة الواردة كـ HTTP POST إلى رابط تحدده
   أنت. اجعل هذا الرابط هو: `POST https://your-api.com/api/inbox/:address/messages`
   مع هيدر `X-Webhook-Secret` يطابق `INBOUND_WEBHOOK_SECRET` في `.env`،
   وحوّل الحقول (subject, sender, preview...) من شكل المزوّد إلى الشكل
   المتوقع في `inbox.service.js → receiveInboundMessage`.
2. **خادم SMTP خاص بك**: باستخدام مكتبة مثل `smtp-server` على Node.js،
   تستقبل البريد مباشرة على دومينك (يتطلب ضبط سجلات MX)، ثم تستدعي
   `receiveInboundMessage(address, {...})` من `inbox.service.js` داخلياً
   بدل المرور بالـ HTTP webhook.

أي من الخيارين لا يتطلب تعديل أي شيء في الـ Frontend أو بقية الـ Backend —
فقط تغذية `inbox.service.js` ببيانات حقيقية بدل الـ Demo.

## ملاحظة حول التخزين

التخزين الحالي **في الذاكرة (in-memory)** عبر `Map` داخل `inbox.service.js` —
مناسب للتطوير والتجربة، لكنه يُفرّغ عند إعادة تشغيل السيرفر ولا يصلح لتشغيل
أكثر من نسخة (instance) من الخادم في نفس الوقت. قبل النشر الفعلي (production)
استبدل هذا الملف بتطبيق مشابه يستخدم Redis أو قاعدة بيانات — بقية المشروع
(controllers/routes) لا تعرف شيئاً عن طريقة التخزين، فلن تحتاج لتعديلها.
