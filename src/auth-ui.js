import { auth } from './firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { escapeHTML, translateAuthError } from './security.js';

/**
 * Deschide modalul complet de autentificare:
 * - Login (Autentificare)
 * - Sign Up (Creează cont cu validare parolă)
 * - Resetare Parolă (Trimite email oficial Firebase de resetare)
 */
export function openLoginModal(initialMode = 'login') {
  // Evităm duplicate dacă este deja deschis
  const existing = document.querySelector('.auth-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay auth-modal-overlay';

  let currentMode = initialMode; // 'login' | 'signup' | 'reset'

  function renderContent() {
    overlay.innerHTML = `
      <div class="modal auth-modal-box" style="width: 340px; position: relative;">
        <button class="auth-close-btn" aria-label="Închide" style="position: absolute; top: 12px; right: 14px; background: none; border: none; font-size: 20px; cursor: pointer; color: #888;">&times;</button>
        
        <div style="text-align: center; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 20px; color: #1e293b;">
            ${currentMode === 'login' ? 'Autentificare' : currentMode === 'signup' ? 'Creează Cont' : 'Resetare Parolă'}
          </h3>
          <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
            ${currentMode === 'login' 
              ? 'Introdu datele pentru a-ți accesa hărțile' 
              : currentMode === 'signup' 
              ? 'Alătură-te gratuit pe Our-Map' 
              : 'Îți vom trimite un link pentru o nouă parolă'}
          </p>
        </div>

        <form id="auth-form" style="display: flex; flex-direction: column; gap: 10px;" onsubmit="return false;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Email</label>
            <input id="auth-email" type="email" placeholder="nume@exemplu.com" required autocomplete="email" style="width: 100%; box-sizing: border-box;" />
          </div>

          ${currentMode !== 'reset' ? `
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <label style="font-size: 12px; font-weight: 600; color: #475569;">Parolă</label>
                ${currentMode === 'login' ? `
                  <a href="#" id="auth-switch-reset" style="font-size: 11px; color: #f43f5e; text-decoration: none;">Ai uitat parola?</a>
                ` : ''}
              </div>
              <input id="auth-pass" type="password" placeholder="••••••••" required autocomplete="${currentMode === 'login' ? 'current-password' : 'new-password'}" style="width: 100%; box-sizing: border-box;" />
            </div>
          ` : ''}

          ${currentMode === 'signup' ? `
            <div>
              <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 4px;">Confirmă parola</label>
              <input id="auth-pass-confirm" type="password" placeholder="••••••••" required autocomplete="new-password" style="width: 100%; box-sizing: border-box;" />
            </div>
          ` : ''}

          <div id="auth-status" class="auth-status" style="font-size: 13px; margin: 2px 0; min-height: 18px; text-align: center;"></div>

          <button id="auth-submit-btn" type="submit" style="background: #f43f5e; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;">
            ${currentMode === 'login' ? 'Conectează-te' : currentMode === 'signup' ? 'Înregistrează-te' : 'Trimite linkul pe email'}
          </button>
        </form>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px; text-align: center; font-size: 13px; color: #64748b;">
          ${currentMode === 'login' ? `
            Nu ai un cont? <a href="#" id="auth-switch-signup" style="color: #f43f5e; font-weight: 600; text-decoration: none;">Creează cont</a>
          ` : currentMode === 'signup' ? `
            Ai deja un cont? <a href="#" id="auth-switch-login" style="color: #f43f5e; font-weight: 600; text-decoration: none;">Autentifică-te</a>
          ` : `
            <a href="#" id="auth-switch-login" style="color: #f43f5e; font-weight: 600; text-decoration: none;">← Înapoi la Autentificare</a>
          `}
        </div>
      </div>
    `;

    bindEvents();
  }

  function setStatus(msg, isSuccess = false) {
    const status = overlay.querySelector('#auth-status');
    if (!status) return;
    status.style.color = isSuccess ? '#16a34a' : '#e11d48';
    status.textContent = msg;
  }

  function bindEvents() {
    const closeBtn = overlay.querySelector('.auth-close-btn');
    if (closeBtn) closeBtn.onclick = () => overlay.remove();

    // Comutare moduri
    const switchReset = overlay.querySelector('#auth-switch-reset');
    if (switchReset) {
      switchReset.onclick = (e) => {
        e.preventDefault();
        currentMode = 'reset';
        renderContent();
      };
    }

    const switchSignup = overlay.querySelector('#auth-switch-signup');
    if (switchSignup) {
      switchSignup.onclick = (e) => {
        e.preventDefault();
        currentMode = 'signup';
        renderContent();
      };
    }

    const switchLogin = overlay.querySelector('#auth-switch-login');
    if (switchLogin) {
      switchLogin.onclick = (e) => {
        e.preventDefault();
        currentMode = 'login';
        renderContent();
      };
    }

    // Submit formular
    const form = overlay.querySelector('#auth-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const email = (overlay.querySelector('#auth-email')?.value || '').trim();
        const pass = overlay.querySelector('#auth-pass')?.value || '';
        const submitBtn = overlay.querySelector('#auth-submit-btn');

        if (!email) {
          setStatus('Te rugăm să introduci adresa de email.');
          return;
        }

        // Validare simplă format email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setStatus('Adresa de email este invalidă.');
          return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Se procesează...';

        try {
          if (currentMode === 'login') {
            if (!pass) {
              setStatus('Te rugăm să introduci parola.');
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              return;
            }
            await signInWithEmailAndPassword(auth, email, pass);
            overlay.remove();
          } else if (currentMode === 'signup') {
            const passConfirm = overlay.querySelector('#auth-pass-confirm')?.value || '';
            if (pass.length < 6) {
              setStatus('Parola trebuie să aibă minim 6 caractere.');
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              return;
            }
            if (pass !== passConfirm) {
              setStatus('Parolele introduse nu coincid.');
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              return;
            }
            await createUserWithEmailAndPassword(auth, email, pass);
            overlay.remove();
          } else if (currentMode === 'reset') {
            // Trimite email oficial de resetare parolă
            await sendPasswordResetEmail(auth, email);
            setStatus('Emailul de resetare a fost trimis! Verifică inboxul și folderul Spam.', true);
            submitBtn.textContent = 'Trimis!';
            setTimeout(() => {
              currentMode = 'login';
              renderContent();
            }, 3500);
            return;
          }
        } catch (err) {
          setStatus(translateAuthError(err));
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            if (currentMode !== 'reset' || submitBtn.textContent !== 'Trimis!') {
              submitBtn.textContent = originalText;
            }
          }
        }
      };
    }
  }

  // Închidere la click pe fundal
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Închidere cu tasta Escape
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && document.body.contains(overlay)) {
      overlay.remove();
      window.removeEventListener('keydown', onKeyDown);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  renderContent();
  document.body.appendChild(overlay);
}