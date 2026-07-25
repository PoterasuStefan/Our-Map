import './style.css';
import { initMap } from './map.js';
import { initSidepanel } from './sidepanel.js';
import { initQuickAdd } from './quickadd.js';

document.querySelector('#app').innerHTML = `
  <div id="map" style="height: 100vh; width: 100%;"></div>
`;

const map = initMap();
initSidepanel(map);
initQuickAdd(map);