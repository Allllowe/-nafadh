const express = require('express');
const path = require('path');

const app = express();


// استقبال JSON
app.use(express.json({ limit: "50kb" }));


// تشغيل ملفات الواجهة
app.use(express.static(path.join(__dirname, '../frontend')));


// =======================
// تخزين مؤقت
// =======================

let emails = [];


// =======================
// إنشاء إيميل مؤقت
// =======================

app.post('/api/email/create', (req, res) => {

    const id = Date.now().toString();

    const email = {
        id: id,
        address: ${id}@nafadh.com,
        messages: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000
    };


    emails.push(email);


    res.json({
        id: email.id,
        email: email.address,
        expiresAt: email.expiresAt
    });

});


// =======================
// إضافة رسالة
// =======================

app.post('/api/email/message', (req, res) => {

    const { id, message } = req.body;


    if (!id || !message) {
        return res.status(400).json({
            error: "Missing data"
        });
    }


    const email = emails.find(
        item => item.id === id
    );


    if (!email) {
        return res.status(404).json({
            error: "Email not found"
        });
    }


    email.messages.push({
        message: message,
        time: Date.now()
    });


    res.json({
        success: true
    });

});


// =======================
// عرض الرسائل
// =======================

app.get('/api/email/:id', (req, res) => {


    const email = emails.find(
        item => item.id === req.params.id
    );


    if (!email) {
        return res.status(404).json({
            error: "Not found"
        });
    }


    if (Date.now() > email.expiresAt) {

        emails = emails.filter(
            item => item.id !== email.id
        );


        return res.status(410).json({
            error: "Expired"
        });

    }


    res.json(email);

});


// =======================
// تنظيف كل دقيقة
// =======================

setInterval(() => {

    const now = Date.now();


    emails = emails.filter(
        item => item.expiresAt > now
    );


}, 60000);



// =======================
// صفحة الموقع
// =======================

app.get('*', (req, res) => {

    res.sendFile(
        path.join(__dirname, '../frontend/index.html')
    );

});



// =======================
// تشغيل السيرفر
// =======================

const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {

    console.log(
        Server running on port ${PORT}
    );

});
