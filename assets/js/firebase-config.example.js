// ════════════════════════════════════════════════════════
// EXEMPLE DE CONFIGURATION - À COPIER DANS firebase-config.js
// ════════════════════════════════════════════════════════
//
// Ce fichier est un exemple. Pour configurer le système :
// 1. Copie ce fichier sous le nom firebase-config.js
// 2. Remplace les valeurs ci-dessous par les tiennes
// 3. NE COMMIT JAMAIS firebase-config.js avec tes vraies clés
//    si le repository GitHub est public
//
// ════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "anac-archives-dta.firebaseapp.com",
    projectId: "anac-archives-dta",
    storageBucket: "anac-archives-dta.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Clé API Anthropic (commence par sk-ant-)
export const ANTHROPIC_API_KEY = "sk-ant-api03-...";
