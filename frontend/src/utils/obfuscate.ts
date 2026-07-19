const rot13 = (str: string): string => str.split('').map(char => {
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
  return btoa(rotated)
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
    const decoded = atob(base64);
    return rot13(decoded);
  } catch (err) {
    console.error('Failed to deobfuscate UID:', err);
    return obfuscated;
  }
};
