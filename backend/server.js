const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();


// =======================
// حماية أساسية
// =======================

app.use(helmet());

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 100
}));


// =======================
// إعدادات السيرفر
// =======================

app.use(express.json({ limit: "50kb" }));

app.use(express.static(
    path.join(__dirname, '../frontend')
));


// =======================
// تخزين مؤقت للإيميلات
// =======================

let emails = [];


// =======================
// إنشاء إيميل مؤقت
// =======================

app.post('/api/email/create', (req, res) => {

    const id = Date.now().toString();

    const newEmail = {
        id: id,
        address: ${id}@nafadh.temp,
        messages: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000)
    };


    emails.push(newEmail);

    res.json({
        email: newEmail.address,
        id: newEmail.id,
        expiresAt: newEmail.expiresAt
    });

});


// =======================
// إضافة رسالة للإيميل
// =======================

app.post('/api/email/message', (req, res) => {

    const { id, message } = req.body;


    if (!id || !message) {
        return res.status(400)
        .json({ error: "Missing data" });
    }


    const email = emails.find(
        e => e.id === id
    );


    if (!email) {
        return res.status(404)
        .json({ error: "Email not found" });
    }


    email.messages.push({
        text: message,
        time: Date.now()
    });


    res.json({
        success: true
    });

});


// =======================
// عرض الرسائل
// =======================

app.get('/api/email/:id', (req, res)=>{


    const email = emails.find(
        e => e.id === req.params.id
    );


    if(!email){
        return res.status(404)
        .json({error:"Not found"});
    }



    if(Date.now() > email.expiresAt){

        emails = emails.filter(
            e => e.id !== email.id
        );


        return res.status(410)
        .json({error:"Expired"});

    }



    res.json(email);

});



// =======================
// تنظيف تلقائي كل دقيقة
// =======================

setInterval(()=>{

    const now = Date.now();

    emails = emails.filter(
        e => e.expiresAt > now
    );


},60000);



// =======================
// مكان الأدوات المستقبلية
// =======================

app.get('/api/status',(req,res)=>{

    res.json({
        status:"online",
        service:"nafadh"
    });

});



// =======================
// فتح الموقع
// =======================

app.get('*',(req,res)=>{

    res.sendFile(
        path.join(__dirname,'../frontend/index.html')
    );

});



// =======================
// تشغيل السيرفر
// =======================

const PORT = process.env.PORT || 5000;


app.listen(PORT,()=>{

    console.log(
        Server running on port ${PORT}
    );

});
