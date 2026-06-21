const crypto = require('crypto');

const ADDR_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Secure random integer in [0, maxExclusive)
 */
function secureRandomInt(maxExclusive){
  return crypto.randomInt(0, maxExclusive);
}

/**
 * Random lowercase alphanumeric segment, used for inbox addresses.
 */
function randomAddrSegment(len){
  let s = '';
  for(let i = 0; i < len; i++){
    s += ADDR_CHARS[secureRandomInt(ADDR_CHARS.length)];
  }
  return s;
}

/**
 * Random id for messages, etc. (UUID v4)
 */
function randomId(){
  return crypto.randomUUID();
}

function randomDigits(n){
  let s = '';
  for(let i = 0; i < n; i++) s += secureRandomInt(10);
  return s;
}

module.exports = { secureRandomInt, randomAddrSegment, randomId, randomDigits };
