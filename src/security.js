/**
 * Utilitare de securitate cibernetică pentru Our-Map
 * - Prevenire XSS prin entity escaping și sanitizare URL
 * - Validare fișiere (tip MIME și dimensiune maximă)
 * - Generare criptografică sigură de coduri (CSPRNG)
 * - Traducere și sanitizare erori de autentificare
 */

/**
 * Escaparea caracterelor HTML periculoase pentru a preveni atacurile XSS (Cross-Site Scripting).
 * @param {string|any} str 
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validarea și curățarea URL-urilor externe pentru a preveni atacurile bazate pe scheme periculoase (javascript:, data: etc.).
 * Permite doar protocoale sigure: https://, http://, blob:
 * @param {string} url 
 * @returns {string}
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^(https?:\/\/|blob:)/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

/**
 * Validare strictă a fișierelor încărcate de utilizator:
 * - Verificare tip MIME imagine
 * - Verificare dimensiune maximă (implicit 10 MB per fișier)
 * @param {File} file 
 * @param {number} maxMb 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file, maxMb = 10) {
  if (!file) {
    return { valid: false, error: 'Nu a fost selectat niciun fișier.' };
  }

  // Verificare tip MIME
  const allowedMimePrefix = 'image/';
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif'];
  const fileName = (file.name || '').toLowerCase();

  const hasAllowedExt = allowedExtensions.some(ext => fileName.endsWith(ext));
  if (!file.type.startsWith(allowedMimePrefix) && !hasAllowedExt) {
    return { 
      valid: false, 
      error: `Fișierul "${file.name}" nu este o imagine validă. Formate acceptate: JPG, PNG, WEBP, HEIC.` 
    };
  }

  // Verificare dimensiune
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { 
      valid: false, 
      error: `Imaginea "${file.name}" depășește limita maximă de ${maxMb}MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).` 
    };
  }

  return { valid: true };
}

/**
 * Generare cod criptografic sigur (folosind Crypto API - CSPRNG), prevenind predictibilitatea codurilor de invitație.
 * @param {number} length 
 * @returns {string}
 */
export function generateSecureCode(length = 6) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // caractere ușor de citit (fără 0, O, 1, I)
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

/**
 * Traducere prietenoasă și sigură a codurilor de eroare Firebase Auth.
 * Previne scurgerea de informații tehnice și mesaje neescapate.
 * @param {string|Error} error 
 * @returns {string}
 */
export function translateAuthError(error) {
  const code = (error && typeof error === 'object' && error.code) 
    ? error.code 
    : String(error || '');

  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return 'Emailul sau parola sunt incorecte.';
  }
  if (code.includes('user-not-found')) {
    return 'Nu a fost găsit niciun cont cu această adresă de email.';
  }
  if (code.includes('email-already-in-use')) {
    return 'Există deja un cont înregistrat cu acest email.';
  }
  if (code.includes('weak-password')) {
    return 'Parola este prea simplă. Introdu o parolă de minim 6 caractere.';
  }
  if (code.includes('invalid-email')) {
    return 'Adresa de email nu este validă.';
  }
  if (code.includes('too-many-requests')) {
    return 'Prea multe încercări eșuate din motive de securitate. Te rugăm să încerci din nou mai târziu.';
  }
  if (code.includes('missing-email')) {
    return 'Te rugăm să introduci adresa de email.';
  }
  if (code.includes('network-request-failed')) {
    return 'Problemă de conexiune la rețea. Verifică accesul la internet.';
  }

  return 'A apărut o eroare la autentificare. Te rugăm să încerci din nou.';
}
