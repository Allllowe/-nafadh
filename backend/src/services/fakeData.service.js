const { secureRandomInt, randomDigits } = require('../utils/randomId');

const AR_FIRST = ['عبدالله','سارة','خالد','نورة','فهد','ريم','يوسف','هند','ماجد','لمى'];
const AR_LAST = ['الحربي','القحطاني','العتيبي','الدوسري','الزهراني','الشمري','المطيري'];
const EN_FIRST = ['James','Emma','Liam','Olivia','Noah','Ava','Lucas','Mia','Ethan','Sophia'];
const EN_LAST = ['Smith','Johnson','Brown','Davis','Miller','Wilson','Moore','Taylor'];
const CITIES_AR = ['الرياض','جدة','الدمام','مكة','المدينة','أبها','تبوك'];
const CITIES_EN = ['New York','London','Toronto','Sydney','Berlin','Chicago'];

/**
 * Generates a clearly-fake demo identity (for filling out test/sandbox
 * forms), never real personal data. Mirrors the original client-side
 * generator one-to-one.
 */
function generateFakeData({ locale }){
  const useAr = locale !== 'en';
  const firstArr = useAr ? AR_FIRST : EN_FIRST;
  const lastArr = useAr ? AR_LAST : EN_LAST;
  const cityArr = useAr ? CITIES_AR : CITIES_EN;

  const first = firstArr[secureRandomInt(firstArr.length)];
  const last = lastArr[secureRandomInt(lastArr.length)];
  const city = cityArr[secureRandomInt(cityArr.length)];
  const fullName = first + ' ' + last;
  const emailUser = (useAr ? 'user' : first.toLowerCase()) + randomDigits(3);
  const phonePrefix = useAr ? '966 5' : '1 ';

  return [
    { k: 'الاسم الكامل', v: fullName },
    { k: 'البريد الإلكتروني', v: emailUser + '@example-demo.com' },
    { k: 'اسم المستخدم', v: (first + randomDigits(3)).toLowerCase() },
    { k: 'كلمة المرور', v: 'Demo' + randomDigits(4) + '!x' },
    { k: 'رقم الهاتف', v: '+' + phonePrefix + randomDigits(8) },
    { k: 'المدينة', v: city },
    { k: 'تاريخ الميلاد', v: (1990 + secureRandomInt(15)) + '-' + String(1 + secureRandomInt(12)).padStart(2, '0') + '-' + String(1 + secureRandomInt(28)).padStart(2, '0') }
  ];
}

module.exports = { generateFakeData };
