const app = require('./src/app');
const config = require('./src/config');

// المنفذ يأتي من الإعدادات التي تقرأ process.env.PORT — وهذا ما تحقنه Render
// تلقائياً عند النشر، فلا حاجة لكتابته يدوياً.
const PORT = config.port;

// الرابط العام لأغراض السجلّات فقط — لا نكتب localhost ثابتاً للإنتاج.
// Render توفّر RENDER_EXTERNAL_URL تلقائياً؛ وإلا نستخدم PUBLIC_URL / API_BASE_URL
// من متغيرات البيئة، وأخيراً نسقط على localhost للتطوير المحلي فقط.
const publicUrl = (
  process.env.RENDER_EXTERNAL_URL ||
  process.env.PUBLIC_URL ||
  process.env.API_BASE_URL ||
  `http://localhost:${PORT}`
).replace(/\/$/, '');

// تشغيل تطبيق Express الحقيقي من src/app.js (مع كل مسارات /api والـ
// controllers والـ services ومنطق البريد كما هي — بدون أي تغيير).
const server = app.listen(PORT, () => {
  console.log(`نَفاذ backend running on port ${PORT}`);
  console.log(`Health check: ${publicUrl}/api/health`);
});

// إغلاق نظيف: Render ترسل SIGTERM عند النشر/الإيقاف، و Ctrl+C يرسل SIGINT.
function shutdown(signal){
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
