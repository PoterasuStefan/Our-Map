import './css/map.css';
import { initLandingPage } from './landing.js';
import { initMap } from './map.js';
import { initSidepanel } from './sidepanel.js';
import { initQuickAdd } from './quickadd.js';
import { openLoginModal } from './auth-ui.js';

document.querySelector('#app').innerHTML = `
  <div id="map" style="height: 100vh; width: 100%;"></div>
`;

let map = null;
let isMapInitialized = false;

function ensureMap() {
  if (!isMapInitialized) {
    map = initMap();
    initSidepanel(map);
    initQuickAdd(map);

    const base = import.meta.env.BASE_URL || '/';
    const logoUrl = `${base}logo.svg`.replace(/\/{2,}/g, '/');

    // Buton flotant pe hartă pentru a reveni la pagina de prezentare
    const homeBtn = document.createElement('button');
    homeBtn.className = 'map-home-btn';
    homeBtn.innerHTML = `
      <img src="${logoUrl}" alt="Our-Map" width="18" height="18" />
      <span>Acasă</span>
    `;
    homeBtn.title = 'Înapoi la pagina de prezentare';
    homeBtn.addEventListener('click', () => {
      showView('landing');
    });
    document.body.appendChild(homeBtn);

    isMapInitialized = true;
  }
}

export function showView(view) {
  if (view === 'map') {
    ensureMap();
    document.body.classList.remove('view-landing');
    document.body.classList.add('view-map');
    window.location.hash = '#map';
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 120);
  } else {
    document.body.classList.remove('view-map');
    document.body.classList.add('view-landing');
    if (window.location.hash === '#map') {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Ascultăm eveniment global pentru navigare la landing page
window.addEventListener('navigate-landing', () => {
  showView('landing');
});

// Inițializare Landing Page
initLandingPage({
  onOpenMap: () => showView('map'),
  onLogin: () => openLoginModal()
});

// Verificare URL la încărcare
const params = new URLSearchParams(window.location.search);
if (params.get('joinCode') || window.location.hash === '#map') {
  showView('map');
} else {
  showView('landing');
}

// Suport istoric browser (Back / Forward)
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#map') {
    showView('map');
  } else {
    showView('landing');
  }
});