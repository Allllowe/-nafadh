const usernameService = require('../services/username.service');
const fakeDataService = require('../services/fakeData.service');
const qrcodeService = require('../services/qrcode.service');
const base64Service = require('../services/base64.service');

function username(req, res){
  const { keyword, digits } = req.body || {};
  const usernames = usernameService.generateUsernames({ keyword, digits });
  res.json({ usernames });
}

function fakeData(req, res){
  const { locale } = req.body || {};
  const data = fakeDataService.generateFakeData({ locale });
  res.json({ data });
}

async function qrcode(req, res, next){
  try{
    const { content, fgColor, bgColor } = req.body || {};
    const dataUrl = await qrcodeService.generateQrCodeDataUrl({ content, fgColor, bgColor });
    res.json({ dataUrl });
  } catch(err){
    next(err);
  }
}

function base64(req, res, next){
  try{
    const { text, mode, direction } = req.body || {};
    const result = base64Service.transformText({ text, mode, direction });
    res.json({ result });
  } catch(err){
    next(err);
  }
}

module.exports = { username, fakeData, qrcode, base64 };
