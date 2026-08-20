const rot13 = (str: string) => str.split('').map(char => {
  const code = char.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return String.fromCharCode(((code - 65 + 13) % 26) + 65);
  }
  if (code >= 97 && code <= 122) {
    return String.fromCharCode(((code - 97 + 13) % 26) + 97);
  }
  return char;
}).join('');

export const obfuscateUid = (uid: string): string => {
  if (!uid) return '';
  const rotated = rot13(uid);
  return Buffer.from(rotated).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const deobfuscateUid = (obfuscated: string): string => {
  if (!obfuscated) return '';
  try {
    let base64 = obfuscated.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const rotated = rot13(decoded);
    
    // Standard Firebase UIDs are 28 characters long and alphanumeric.
    const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(rotated);
    if (rotated.length === 28 && isAlphanumeric) {
      return rotated;
    }
    return obfuscated;
  } catch (err) {
    console.error('Failed to deobfuscate UID:', err);
    return obfuscated;
  }
};
