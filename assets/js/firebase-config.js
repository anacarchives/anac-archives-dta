// firebase-config.js
// /!\ a remplir avec les vraies clés du projet Firebase
// (voir README.md pour la procedure)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "VOTRE_API_KEY_ICI",
    authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_PROJECT_ID.appspot.com",
    messagingSenderId: "VOTRE_SENDER_ID",
    appId: "VOTRE_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { firebaseConfig };  // exporté pour créer une 2e instance dans users.html

// Clé API Anthropic (Claude) - utilisée pour l'extraction des PDF.
// Note : la clé est exposée côté client. C'est OK pour usage interne,
// mais si on rend le repo public il faudra passer par une Cloud Function.
export const ANTHROPIC_API_KEY = "VOTRE_CLE_ANTHROPIC_ICI";
