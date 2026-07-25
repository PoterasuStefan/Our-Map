import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAEKi_K8W2yj0mtv4BfoQVtUbVNLq6FiUA",
  authDomain: "our-map-a1111.firebaseapp.com",
  projectId: "our-map-a1111",
  storageBucket: "our-map-a1111.firebasestorage.app",
  messagingSenderId: "959967326002",
  appId: "1:959967326002:web:288b6246e1cf4459f4312b"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);