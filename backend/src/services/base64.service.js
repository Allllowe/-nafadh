/**
 * Mirrors the client-side Base64/URL tool (which runs entirely in the
 * browser by default). Provided here for external API consumers.
 */
function transformText({ text, mode, direction }){
  if(typeof text !== 'string'){
    const err = new Error('text is required');
    err.status = 400;
    throw err;
  }
  try{
    if(mode === 'url'){
      return direction === 'decode' ? decodeURIComponent(text) : encodeURIComponent(text);
    }
    // default: base64
    return direction === 'decode'
      ? Buffer.from(text, 'base64').toString('utf8')
      : Buffer.from(text, 'utf8').toString('base64');
  } catch(e){
    const err = new Error(direction === 'decode' ? 'تعذّر فك التشفير — تأكد أن النص بالصيغة الصحيحة' : 'تعذّر تشفير النص المُدخل');
    err.status = 400;
    throw err;
  }
}

module.exports = { transformText };
