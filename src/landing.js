import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Inițializează interactivitatea paginii de prezentare (HTML-ul este deja în index.html)
export function initLandingPage({ onOpenMap, onLogin }) {
  const landingEl = document.getElementById('landing-page');
  if (!landingEl) return null;

  // Butoane care deschid harta interactivă
  const mapButtons = [
    landingEl.querySelector('#nav-open-map-btn'),
    landingEl.querySelector('#hero-open-map-btn'),
    landingEl.querySelector('#bottom-open-map-btn'),
    landingEl.querySelector('#brand-logo-btn')
  ];

  mapButtons.forEach((btn) => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (onOpenMap) onOpenMap();
      });
    }
  });

  // Butoane de autentificare
  const navLoginBtn = landingEl.querySelector('#nav-login-btn');
  const heroAuthBtn = landingEl.querySelector('#hero-auth-btn');

  if (navLoginBtn) {
    navLoginBtn.addEventListener('click', () => {
      if (onLogin) onLogin();
    });
  }

  if (heroAuthBtn) {
    heroAuthBtn.addEventListener('click', () => {
      if (onLogin) onLogin();
    });
  }

  // Derulare lină (smooth scroll) pentru linkurile către secțiunile paginii
  landingEl.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetEl = landingEl.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Actualizare dinamică a butoanelor din navbar în funcție de starea contului
  const authActionsContainer = landingEl.querySelector('#landing-nav-auth-actions');

  onAuthStateChanged(auth, (user) => {
    if (!authActionsContainer) return;

    if (user) {
      const emailDisplay = user.email ? user.email.split('@')[0] : 'Utilizator';
      authActionsContainer.innerHTML = `
        <span class="nav-user-text">Salut, <strong>${emailDisplay}</strong></span>
        <button type="button" class="btn btn-secondary btn-sm" id="nav-logout-btn">
          Deconectare
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="nav-open-map-btn-logged">
          Mergi la Hartă →
        </button>
      `;

      const logoutBtn = authActionsContainer.querySelector('#nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await signOut(auth);
          } catch (err) {
            console.error('Logout error:', err);
          }
        });
      }

      const openMapLoggedBtn = authActionsContainer.querySelector('#nav-open-map-btn-logged');
      if (openMapLoggedBtn) {
        openMapLoggedBtn.addEventListener('click', () => {
          if (onOpenMap) onOpenMap();
        });
      }

      if (heroAuthBtn) {
        heroAuthBtn.textContent = 'Intră în Contul Tău';
        heroAuthBtn.onclick = () => {
          if (onOpenMap) onOpenMap();
        };
      }
    } else {
      authActionsContainer.innerHTML = `
        <button type="button" class="btn btn-secondary" id="nav-login-btn">
          Autentificare
        </button>
        <button type="button" class="btn btn-primary" id="nav-open-map-btn">
          Deschide Harta
        </button>
      `;

      const newLoginBtn = authActionsContainer.querySelector('#nav-login-btn');
      if (newLoginBtn) {
        newLoginBtn.addEventListener('click', () => {
          if (onLogin) onLogin();
        });
      }

      const newMapBtn = authActionsContainer.querySelector('#nav-open-map-btn');
      if (newMapBtn) {
        newMapBtn.addEventListener('click', () => {
          if (onOpenMap) onOpenMap();
        });
      }

      if (heroAuthBtn) {
        heroAuthBtn.textContent = 'Creează Cont Gratuit';
        heroAuthBtn.onclick = () => {
          if (onLogin) onLogin();
        };
      }
    }
  });

  return landingEl;
}
