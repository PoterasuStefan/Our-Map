import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

export function openLoginModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Login</h3>
      <input id="auth-email" placeholder="Email" />
      <input id="auth-pass" type="password" placeholder="Parola" />
      <p id="auth-status" class="auth-status"></p>
      <div class="modal-buttons">
        <button id="auth-signup">Creeaza cont</button>
        <button id="auth-login">Login</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const status = overlay.querySelector('#auth-status');

  overlay.querySelector('#auth-signup').addEventListener('click', async () => {
    try {
      await createUserWithEmailAndPassword(
        auth,
        overlay.querySelector('#auth-email').value,
        overlay.querySelector('#auth-pass').value
      );
      overlay.remove();
    } catch (e) {
      status.textContent = e.message;
    }
  });

  overlay.querySelector('#auth-login').addEventListener('click', async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        overlay.querySelector('#auth-email').value,
        overlay.querySelector('#auth-pass').value
      );
      overlay.remove();
    } catch (e) {
      status.textContent = e.message;
    }
  });
}