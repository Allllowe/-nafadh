const QRCode = require('qrcode');

/**
 * Generates a QR code as a PNG data URL. This mirrors the client-side
 * QR tool (which uses the qrcodejs CDN library and stays client-side
 * by default); this endpoint exists so external clients/integrations
 * can request a QR code directly from the API.
 */
async function generateQrCodeDataUrl({ content, fgColor, bgColor }){
  if(!content || !String(content).trim()){
    const err = new Error('content is required');
    err.status = 400;
    throw err;
  }
  return QRCode.toDataURL(String(content), {
    width: 300,
    margin: 2,
    color: {
      dark: fgColor || '#0b0a12',
      light: bgColor || '#ffffff'
    }
  });
}

module.exports = { generateQrCodeDataUrl };
