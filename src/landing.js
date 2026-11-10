import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export function initLandingPage({ onOpenMap, onLogin }) {
  const base = import.meta.env.BASE_URL || '/';
  const logoUrl = `${base}logo.svg`.replace(/\/{2,}/g, '/');

  const landingEl = document.createElement('div');
  landingEl.id = 'landing-page';

  landingEl.innerHTML = `
    <!-- Efecte de fundal luminoase (glows) -->
    <div class="landing-glow-1"></div>
    <div class="landing-glow-2"></div>
    <div class="landing-glow-3"></div>

    <!-- NAVBAR -->
    <header class="landing-nav">
      <div class="landing-container">
        <div class="landing-nav-inner">
          <div class="landing-brand" id="brand-logo-btn">
            <div class="landing-brand-logo">
              <img src="${logoUrl}" alt="Our-Map Logo" width="40" height="40" />
            </div>
            <span class="landing-brand-name">Our-Map</span>
          </div>

          <nav class="landing-nav-links">
            <a href="#features" class="landing-nav-link">Funcționalități</a>
            <a href="#how-it-works" class="landing-nav-link">Cum funcționează</a>
            <a href="#about" class="landing-nav-link">Despre aplicație</a>
          </nav>

          <div class="landing-nav-actions" id="landing-nav-auth-actions">
            <button class="btn-landing-secondary" id="nav-login-btn">
              Autentificare
            </button>
            <button class="btn-landing-primary" id="nav-open-map-btn">
              Deschide Harta
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- HERO SECTION -->
    <section class="landing-hero">
      <div class="landing-container">
        <div class="hero-pill">
          <span class="hero-pill-dot"></span>
          <span>Harta amintirilor și călătoriilor voastre</span>
        </div>

        <h1 class="hero-title">
          Toate călătoriile tale.<br />
          <span class="gradient-text">O singură hartă cu amintiri.</span>
        </h1>

        <p class="hero-subtitle">
          Marchează destinațiile preferate, încarcă poze de vacanță cu localizare automată și creează grupuri private cu partenerul sau prietenii.
        </p>

        <div class="hero-cta-group">
          <button class="btn-landing-primary btn-landing-hero-lg" id="hero-open-map-btn">
            📍 Deschide Harta Interactivă
          </button>
          <button class="btn-landing-secondary btn-landing-hero-lg" id="hero-auth-btn">
            Creează Cont Gratuit
          </button>
        </div>

        <div class="hero-tags">
          <div class="hero-tag-item"><span>✓</span> Pinuri nelimitate</div>
          <div class="hero-tag-item"><span>✓</span> Grupuri private pe cod</div>
          <div class="hero-tag-item"><span>✓</span> GPS extras direct din poze</div>
          <div class="hero-tag-item"><span>✓</span> 100% Gratuit</div>
        </div>

        <!-- MOCKUP SHOWCASE INTERACTIV -->
        <div class="hero-mockup-wrapper">
          <div class="hero-mockup-card">
            <div class="mockup-browser-header">
              <span class="mockup-dot red"></span>
              <span class="mockup-dot yellow"></span>
              <span class="mockup-dot green"></span>
              <span class="mockup-address">our-map.app/map</span>
            </div>

            <div class="mockup-map-preview">
              <div class="mockup-map-overlay"></div>

              <!-- Badge Grup -->
              <div class="mockup-group-pill">
                <span>🏖️</span>
                <span>Vacanță Zakynthos (4 membri)</span>
              </div>

              <!-- Badge EXIF -->
              <div class="mockup-exif-pill">
                <span>📸</span>
                <span>GPS extras automat din poză</span>
              </div>

              <!-- Pin plutitor stilizat -->
              <div class="mockup-floating-pin">
                <div class="mockup-pin-popup">
                  <div class="mockup-pin-header">
                    <span>📍 Plaja Navagio</span>
                    <span>★ Amintire</span>
                  </div>
                  <div class="mockup-pin-body">
                    <img 
                      src="https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=400&q=80" 
                      alt="Navagio Beach" 
                      class="mockup-pin-img" 
                    />
                    <div>Cea mai frumoasă apă pe care am văzut-o vreodată! ❤️</div>
                  </div>
                </div>

                <img src="${logoUrl}" alt="Pin Marker" class="mockup-pin-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURES SECTION -->
    <section class="landing-section" id="features">
      <div class="landing-container">
        <div class="section-head">
          <div class="section-tag">Funcționalități</div>
          <h2 class="section-title">Construit special pentru amintirile voastre</h2>
          <p class="section-subtitle">
            Tot ce ai nevoie pentru a ține minte fiecare loc explorat, într-un format vizual prietenos și intuitiv.
          </p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon-wrapper">📍</div>
            <h3 class="feature-title">Pinuri Personalizate</h3>
            <p class="feature-desc">
              Alege culori tematice, titluri, pictograme și note detaliate pentru fiecare punct de pe hartă (cafenele, plaje, cazări sau obiective turistice).
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-wrapper">📸</div>
            <h3 class="feature-title">Localizare Automată din Poze</h3>
            <p class="feature-desc">
              Încarcă fotografiile direct de pe telefon sau PC! Aplicația extrage coordonatele GPS din metadatele EXIF și plasează pinul instant pe hartă.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-wrapper">👥</div>
            <h3 class="feature-title">Grupuri & Colaborare</h3>
            <p class="feature-desc">
              Creează spații comune pentru familie, cuplu sau gașca de prieteni. Invită-i printr-un simplu cod unic sau link generat automat.
            </p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-wrapper">🔒</div>
            <h3 class="feature-title">Spațiu Privat & Curat</h3>
            <p class="feature-desc">
              Fără reclame enervante și fără feed-uri algoritmice. Harta voastră rămâne strict a voastră, accesibilă oricând din browser.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="landing-section" id="how-it-works">
      <div class="landing-container">
        <div class="section-head">
          <div class="section-tag">Ghid Rapid</div>
          <h2 class="section-title">Cum funcționează Our-Map?</h2>
          <p class="section-subtitle">
            Doar 3 pași simpli pentru a începe să-ți creezi atlasul călătoriilor.
          </p>
        </div>

        <div class="steps-grid">
          <div class="step-card">
            <span class="step-number">01</span>
            <span class="step-badge">Pasul 1</span>
            <h3 class="step-title">Creează sau alătură-te unui grup</h3>
            <p class="step-desc">
              Deschide harta și fă-ți propriul grup sau introdu codul de invitație primit de la un prieten.
            </p>
          </div>

          <div class="step-card">
            <span class="step-number">02</span>
            <span class="step-badge">Pasul 2</span>
            <h3 class="step-title">Adaugă locuri și fotografii</h3>
            <p class="step-desc">
              Folosește butonul rapid „+” sau dă click direct pe hartă pentru a salva o locație cu fotografii și notițe de suflet.
            </p>
          </div>

          <div class="step-card">
            <span class="step-number">03</span>
            <span class="step-badge">Pasul 3</span>
            <h3 class="step-title">Retrăiește fiecare aventură</h3>
            <p class="step-desc">
              Navighează pe glob, dă zoom pe orașele vizitate și derulează caruselul de poze oricând vrei să simți atmosfera vacanțelor.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- BOTTOM CTA BANNER -->
    <section class="landing-section" id="about">
      <div class="landing-container">
        <div class="landing-cta-banner">
          <h2 class="cta-banner-title">Ești pregătit să începi să-ți cartografiezi călătoriile?</h2>
          <p class="cta-banner-desc">
            Alătură-te acum și creează prima ta hartă de vacanță în mai puțin de un minut.
          </p>
          <button class="btn-landing-primary btn-landing-hero-lg" id="bottom-open-map-btn">
            🚀 Deschide Harta Acum
          </button>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="landing-footer">
      <div class="landing-container">
        <div class="footer-inner">
          <div class="footer-brand">
            <img src="${logoUrl}" alt="Our-Map" />
            <span>Our-Map</span>
          </div>
          <div>Făcut pentru călătorii, aventuri și amintiri de neuitat.</div>
          <div>&copy; ${new Date().getFullYear()} Our-Map. Toate drepturile rezervate.</div>
        </div>
      </div>
    </footer>

    <!-- DEV LOG (?) WIDGET — DOAR PE LANDING PAGE -->
    <div class="devlog-widget" id="devlog-widget">
      <div class="devlog-popover" id="devlog-popover">
        <div class="devlog-header">
          <span class="devlog-title">🛠️ Dev Log — Ultimele noutăți</span>
          <button class="devlog-close" id="devlog-close-btn" aria-label="Închide">&times;</button>
        </div>

        <div class="devlog-entry">
          <div class="devlog-entry-head">
            <span class="devlog-version">v1.3 — Securitate & Conturi</span>
            <span class="devlog-date">Nou</span>
          </div>
          <ul class="devlog-list">
            <li>🔑 Resetare parolă direct pe email</li>
            <li>🛡️ Protecție anti-XSS & filtre de securitate CSP</li>
            <li>🔐 Coduri de grup criptografic sigure</li>
            <li>✅ Validare automată poze la upload (max 10MB)</li>
          </ul>
        </div>

        <div class="devlog-entry">
          <div class="devlog-entry-head">
            <span class="devlog-version">v1.2 — Landing Page & Logo</span>
            <span class="devlog-date">Recent</span>
          </div>
          <ul class="devlog-list">
            <li>✨ Pagină principală nouă de prezentare</li>
            <li>📍 Logo nou cu pin și polaroid de vacanță</li>
            <li>🏠 Comutare rapidă între prezentare și hartă</li>
          </ul>
        </div>

        <div class="devlog-entry">
          <div class="devlog-entry-head">
            <span class="devlog-version">v1.1 — Quick Add & Grupuri</span>
            <span class="devlog-date">Anterior</span>
          </div>
          <ul class="devlog-list">
            <li>📸 Plasare automată pinuri din GPS-ul pozelor</li>
            <li>👥 Partajare grupuri prin coduri unice</li>
          </ul>
        </div>
      </div>

      <button class="devlog-btn" id="devlog-toggle-btn" title="Ultimele actualizări (Dev Log)" aria-label="Dev Log">
        ?
        <span class="devlog-badge-dot" id="devlog-badge-dot"></span>
      </button>
    </div>
  `;

  document.body.prepend(landingEl);

  // Interacțiune Dev Log (?)
  const devlogToggleBtn = landingEl.querySelector('#devlog-toggle-btn');
  const devlogPopover = landingEl.querySelector('#devlog-popover');
  const devlogCloseBtn = landingEl.querySelector('#devlog-close-btn');
  const devlogBadgeDot = landingEl.querySelector('#devlog-badge-dot');
  const devlogWidget = landingEl.querySelector('#devlog-widget');

  if (devlogToggleBtn && devlogPopover) {
    devlogToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      devlogPopover.classList.toggle('open');
      if (devlogBadgeDot) {
        devlogBadgeDot.style.display = 'none';
      }
    });
  }

  if (devlogCloseBtn && devlogPopover) {
    devlogCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      devlogPopover.classList.remove('open');
    });
  }

  document.addEventListener('click', (e) => {
    if (devlogPopover && devlogPopover.classList.contains('open')) {
      if (devlogWidget && !devlogWidget.contains(e.target)) {
        devlogPopover.classList.remove('open');
      }
    }
  });

  // Butoane de navigare către hartă
  const mapButtons = [
    landingEl.querySelector('#nav-open-map-btn'),
    landingEl.querySelector('#hero-open-map-btn'),
    landingEl.querySelector('#bottom-open-map-btn'),
    landingEl.querySelector('#brand-logo-btn')
  ];

  mapButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (onOpenMap) onOpenMap();
      });
    }
  });

  // Butoane autentificare
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

  // Smooth scroll la ancore din landing
  landingEl.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = anchor.getAttribute('href');
      const targetEl = landingEl.querySelector(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Adaptare dinamică stare autentificare
  const authActionsContainer = landingEl.querySelector('#landing-nav-auth-actions');

  onAuthStateChanged(auth, (user) => {
    if (!authActionsContainer) return;

    if (user) {
      const emailDisplay = user.email ? (user.email.split('@')[0]) : 'Utilizator';
      authActionsContainer.innerHTML = `
        <span style="font-size: 13px; color: var(--landing-text-muted);">
          Salut, <strong style="color: #fff;">${emailDisplay}</strong>
        </span>
        <button class="btn-landing-secondary" id="nav-logout-btn" style="padding: 7px 14px; font-size: 13px;">
          Deconectare
        </button>
        <button class="btn-landing-primary" id="nav-open-map-btn-logged" style="padding: 7px 16px; font-size: 13px;">
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
        <button class="btn-landing-secondary" id="nav-login-btn">
          Autentificare
        </button>
        <button class="btn-landing-primary" id="nav-open-map-btn">
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
