# ANAC Archives DTA

Système d'archivage numérique des autorisations de vol et de survol — Direction du Transport Aérien (ANAC Mauritanie).

## Fonctionnalités

- **Tableau de bord** avec statistiques en temps réel et graphiques (évolution mensuelle, répartition par type, top opérateurs)
- **Saisie automatique par IA** : upload du PDF scanné, extraction automatique de tous les champs avec Claude Sonnet
- **Archive consultable** : recherche full-text, filtres par type/année/statut, modal de détail
- **Génération de PDF officiels** : formulaire qui produit un PDF prêt à imprimer (espace réservé pour entête ANAC)
- **Import en masse** depuis Excel ou CSV avec aperçu
- **Export** en Excel ou en ZIP organisé (année/mois/type)
- **Multi-utilisateurs** avec deux rôles : Administrateur et Agent
- **Stockage cloud** des PDF avec auto-classification par année/mois/type

## Pile technique

- **Frontend** : HTML / CSS / JavaScript modulaire (pas de framework)
- **Backend** : Firebase (Firestore + Authentication + Storage)
- **IA** : API Anthropic (Claude Sonnet 4)
- **Génération PDF** : jsPDF
- **Lecture Excel** : SheetJS (xlsx)
- **Compression** : JSZip
- **Graphiques** : Chart.js
- **Hébergement** : GitHub Pages (gratuit)

---

## Installation — Étape par étape

### 1. Créer le projet Firebase

1. Va sur https://console.firebase.google.com et crée un nouveau projet (ex: `anac-archives-dta`)
2. **Active Authentication** : menu latéral → Authentication → Get Started → onglet **Sign-in method** → active **Email/Password**
3. **Active Firestore** : menu latéral → Firestore Database → Create database → mode **Production** → choisir région `eur3` ou `nam5`
4. **Active Storage** : menu latéral → Storage → Get Started → mode **Production**

### 2. Récupérer la configuration

1. Console Firebase → icône engrenage en haut à gauche → Project settings
2. Onglet **General** → en bas, dans "Your apps", clique sur **Web** (`</>`)
3. Donne un nom à l'app (ex: `anac-archives-web`) et clique Register
4. Copie l'objet `firebaseConfig` qui apparaît

### 3. Configurer le code

Ouvre le fichier `assets/js/firebase-config.js` et remplace les valeurs :

```javascript
const firebaseConfig = {
    apiKey: "ta-vraie-clé",
    authDomain: "anac-archives-dta.firebaseapp.com",
    projectId: "anac-archives-dta",
    storageBucket: "anac-archives-dta.appspot.com",
    messagingSenderId: "ton-vrai-sender-id",
    appId: "ton-vrai-app-id"
};
```

### 4. Obtenir une clé API Anthropic

1. Va sur https://console.anthropic.com
2. Crée un compte (paiement par carte requis)
3. Dans **API Keys**, génère une nouvelle clé
4. Recharge ton compte (~10 USD pour démarrer, suffisant pour des milliers de documents)
5. Dans le fichier `assets/js/firebase-config.js`, remplace `VOTRE_CLE_ANTHROPIC_ICI` par ta vraie clé

> **⚠️ Sécurité** : la clé API est exposée côté client. C'est acceptable pour un usage interne sur GitHub Pages privé, mais pour un usage en production exposé publiquement il faudrait passer par une Firebase Cloud Function. Pour ANAC en interne, c'est OK.

### 5. Configurer les règles Firestore

Console Firebase → Firestore Database → **Rules** — remplace par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /authorizations/{doc} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

Clique **Publish**.

### 6. Configurer les règles Storage

Console Firebase → Storage → **Rules** — remplace par :

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Clique **Publish**.

### 7. Créer le premier compte administrateur

1. Console Firebase → Authentication → onglet **Users** → **Add user**
2. Saisis l'email (ex: `dady@anac.mr`) et un mot de passe
3. Copie l'**UID** généré
4. Console Firebase → Firestore Database → **Start collection**
5. ID de la collection : `users`
6. Document ID : colle l'UID copié
7. Ajoute les champs :
   - `name` (string) : ton nom
   - `email` (string) : ton email
   - `role` (string) : **`admin`**
   - `createdAt` (timestamp) : actuel
8. Sauvegarde

### 8. Déployer sur GitHub Pages

1. Crée un nouveau repo GitHub (ex: `anac-archives-dta`) — peut être **privé**
2. Push tous les fichiers du dossier
3. Settings du repo → **Pages** → Source : **Deploy from a branch** → branche `main` → folder `/ (root)` → Save
4. Attends 1-2 minutes
5. Le site sera disponible à `https://<ton-username>.github.io/anac-archives-dta/`

### 9. Première connexion

1. Ouvre l'URL GitHub Pages
2. Connecte-toi avec l'email + mot de passe créés à l'étape 7
3. Tu arrives sur le tableau de bord — c'est parti

### 10. Ajouter d'autres utilisateurs

1. Console Firebase → Authentication → Add user (email + mot de passe)
2. Dans l'app : page **Utilisateurs** (admin only) → Nouvel utilisateur → colle l'UID + saisis nom/email/rôle
3. L'utilisateur peut maintenant se connecter

---

## Architecture des données

### Collection `authorizations`

Chaque document contient :
- `numero`, `type`, `typeCode` (SAT/SUR/ATT/AUTRE)
- `dateEmission`, `dateReception`, `dateDebutValidite`, `dateFinValidite`
- `validiteExtension` (ex: +72H)
- `operateur`, `destinataire`
- `aeronefType`, `immatriculation`
- `motif`, `route`
- `visaSRT`, `reference`, `signataire`, `titreSignataire`
- `pdfUrl`, `pdfPath` (Storage)
- `createdAt`, `createdBy`, `createdByUid`
- `year`, `month` (index pour requêtes)
- `searchIndex` (texte concaténé pour recherche)

### Collection `users`

- ID = UID Firebase Auth
- Champs : `name`, `email`, `role` (`admin` | `agent`), `createdAt`

### Storage

Les PDF sont organisés ainsi :
```
archives/
  2026/
    04/
      SAT/
        SAT-0303-26.pdf
      SUR/
        SUR-1014-26.pdf
```

---

## Coûts estimés

### Firebase (gratuit jusqu'à) :
- 50 000 lectures Firestore par jour
- 20 000 écritures par jour
- 1 Go de stockage Firestore
- 5 Go de stockage Storage
- 1 Go de transfert/jour

**→ Suffisant pour ~16 000 documents archivés sans rien payer**

### API Anthropic Claude Sonnet :
- ~0,003 USD par PDF (1 page scannée)
- 1 000 documents = 3 USD
- 10 000 documents = 30 USD

**→ Compter ~50-100 USD par an pour un usage normal**

---

## Structure des fichiers

```
anac-archives-dta/
├── README.md
├── index.html              ← Redirection
├── pages/
│   ├── login.html         ← Connexion
│   ├── dashboard.html     ← Statistiques
│   ├── add.html           ← Saisie + IA
│   ├── archive.html       ← Recherche
│   ├── generator.html     ← Génération PDF
│   ├── import.html        ← Import Excel (admin)
│   ├── export.html        ← Export
│   ├── users.html         ← Gestion users (admin)
│   └── settings.html      ← Paramètres
└── assets/
    ├── css/
    │   └── style.css
    └── js/
        ├── firebase-config.js   ← À CONFIGURER
        ├── layout.js            ← Sidebar + auth
        ├── helpers.js           ← Toast, dates...
        ├── anthropic.js         ← Extraction IA
        ├── database.js          ← CRUD Firestore
        └── pdf-generator.js     ← jsPDF
```

---

## Sécurité — checklist avant production

- [ ] Règles Firestore configurées (étape 5)
- [ ] Règles Storage configurées (étape 6)
- [ ] Repository GitHub en privé (recommandé)
- [ ] Premier admin créé (étape 7)
- [ ] Mots de passe forts pour tous les comptes
- [ ] Surveillance de l'usage Firebase (alertes de quota)
- [ ] Surveillance des dépenses API Anthropic

---

## Support

Pour toute question, consulter la page **Paramètres** dans l'application ou contacter l'administrateur.

---

*Développé pour la Direction du Transport Aérien — ANAC Mauritanie*
