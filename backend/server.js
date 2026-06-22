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