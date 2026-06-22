const { secureRandomInt, randomDigits } = require('../utils/randomId');

// Same short word bank as the original front-end generator (3-6 letters,
// guarantees compact usernames).
const SHORT_WORDS = ['fox','wolf','nova','zed','raven','kai','luna','rex','axe','jet','iris','ash','neo','vex','sky','onyx','blitz','echo','pix','rune'];

/**
 * letters/numbers only, max 8 chars — prevents any injection via this field
 */
function sanitizeKeyword(raw){
  return String(raw || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
}

function generateUsernames({ keyword, digits }){
  const cleanKeyword = sanitizeKeyword(keyword);
  const safeDigits = Math.min(Math.max(parseInt(digits, 10) || 0, 0), 3);

  const used = new Set();
  let attempts = 0;
  while(used.size < 6 && attempts < 60){
    attempts++;
    const word = SHORT_WORDS[secureRandomInt(SHORT_WORDS.length)];
    let base = cleanKeyword ? cleanKeyword + word : word;
    base = base.slice(0, 10); // keep usernames short
    const username = base + (safeDigits > 0 ? randomDigits(safeDigits) : '');
    used.add(username);
  }
  return Array.from(used);
}

module.exports = { generateUsernames, sanitizeKeyword };
