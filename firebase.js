// Menggunakan URL CDN resmi dari Google yang dipahami langsung oleh browser
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// GANTI DENGAN KODE CONFIG DARI FIREBASE CONSOLE ANDA
const firebaseConfig = {
  apiKey: "AIzaSyBtbYKS9imMxWy6i1wI9Yakvg_SyqsA2fs",
  authDomain: "kost-tracker-2.firebaseapp.com",
  projectId: "kost-tracker-2",
  storageBucket: "kost-tracker-2.firebasestorage.app",
  messagingSenderId: "898232844222",
  appId: "1:898232844222:web:cd637d8e49835e38b0c3ef",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Ekspor fungsi agar bisa dibaca oleh script.js
export {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  serverTimestamp,
};
