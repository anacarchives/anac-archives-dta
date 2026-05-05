// layout.js
// gere la sidebar (menu de gauche), l'auth, et l'affichage du user en bas

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// vérifie qu'on est connecté, sinon redirige vers login.
// le callback est appelé avec (user, userData) une fois tout chargé.
export function checkAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // on récupère les infos du user depuis Firestore (rôle, nom...)
        let userData;
        try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            userData = snap.exists() ? snap.data() : {
                // fallback si le doc Firestore n'existe pas (pas trop normal mais bon)
                role: 'agent',
                name: user.email.split('@')[0],
                email: user.email
            };
        } catch (e) {
            console.error('Erreur récup user:', e);
            userData = { role: 'agent', name: user.email, email: user.email };
        }

        applyUserData(userData);
        if (callback) callback(user, userData);
    });
}


function applyUserData(u) {
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.textContent = u.name || u.email;
    if (roleEl) roleEl.textContent = u.role === 'admin' ? 'Administrateur' : u.role === 'directeur' ? 'Directeur' : 'Agent';
    if (avatarEl) avatarEl.textContent = (u.name || u.email).charAt(0).toUpperCase();

    // cache les liens selon le rôle
    if (u.role !== 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    if (u.role !== 'directeur') {
        document.querySelectorAll('.directeur-only').forEach(el => el.style.display = 'none');
    }
    // le directeur ne voit pas les outils de saisie
    if (u.role === 'directeur') {
        document.querySelectorAll('.no-directeur').forEach(el => el.style.display = 'none');
    }
}


export async function logout() {
    if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return;
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (e) {
        console.error('Erreur déco:', e);
    }
}


export function setActiveNav(pageName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });
}


// HTML de la sidebar - injecté dans toutes les pages.
// Le mettre ici evite de devoir copier coller dans chaque page.
const SIDEBAR_HTML = `
<aside class="sidebar">
    <div class="sidebar-header">
        <div class="sidebar-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>
        </div>
        <div class="sidebar-title">
            <h2>ANAC Archives</h2>
            <p>DTA</p>
        </div>
    </div>

    <nav class="sidebar-nav">
        <div class="nav-section">
            <div class="nav-section-title">Principal</div>
            <a href="dashboard.html" class="nav-item" data-page="dashboard">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                <span>Tableau de bord</span>
            </a>
            <a href="archive.html" class="nav-item" data-page="archive">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                <span>Archive</span>
            </a>
            <a href="add.html" class="nav-item" data-page="add">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                <span>Nouvelle saisie</span>
            </a>
        </div>

        <div class="nav-section">
            <div class="nav-section-title">Outils</div>
            <a href="generator.html" class="nav-item" data-page="generator">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>Générateur</span>
            </a>
            <a href="import.html" class="nav-item admin-only" data-page="import">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span>Import Excel</span>
            </a>
            <a href="export.html" class="nav-item" data-page="export">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export</span>
            </a>
        </div>

        <div class="nav-section admin-only">
            <div class="nav-section-title">Administration</div>
            <a href="users.html" class="nav-item" data-page="users">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Utilisateurs</span>
            </a>
        </div>

        <div class="nav-section">
            <div class="nav-section-title">Compte</div>
            <a href="settings.html" class="nav-item" data-page="settings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>Paramètres</span>
            </a>
        </div>
    </nav>

    <div class="sidebar-footer">
        <div class="user-info">
            <div class="user-avatar" id="userAvatar">?</div>
            <div class="user-details">
                <div class="user-name" id="userName">Chargement...</div>
                <div class="user-role" id="userRole">—</div>
            </div>
        </div>
        <button class="btn btn-logout" id="btnLogout">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Se déconnecter</span>
        </button>
    </div>
</aside>
`;


// injecte la sidebar au début de .app-container
export function injectSidebar(activePage) {
    const c = document.querySelector('.app-container');
    if (!c) return;
    c.insertAdjacentHTML('afterbegin', SIDEBAR_HTML);
    setActiveNav(activePage);
    document.getElementById('btnLogout').addEventListener('click', logout);
}

// gardé pour compat si quelqu'un importe SIDEBAR_HTML directement
export { SIDEBAR_HTML };
