import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDK4LJefBNtm11FHtQjYm_uc9YUb8d1q2k",
    authDomain: "anac-archives-dta.firebaseapp.com",
    projectId: "anac-archives-dta",
    storageBucket: "anac-archives-dta.firebasestorage.app",
    messagingSenderId: "310179353185",
    appId: "1:310179353185:web:14c4945aa025f75ec05020"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ANTHROPIC_API_KEY = "VOTRE_CLE_ANTHROPIC_ICI";
