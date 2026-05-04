// pdf-generator.js
// Génère un PDF identique aux vrais documents d'autorisation ANAC.
// Basé sur les modèles SAT-0303-26 et SUR-1014-26.
//
// Structure du document (de haut en bas) :
//   [42mm] espace vide pour l'entête papier ANAC (logo, armoiries, textes bilingues)
//   [bordure] tout le reste dans un rectangle
//   - Titre "Autorisation / Authorization" + case Date à droite
//   - Numéro (SAT-0303-26 / SUR-1014-26)
//   - Type (Survol et Atterrissage / Survol)
//   - Bloc 5 lignes : ANAC à gauche | A/To + dates à droite
//   - Ligne Visa SRT | Visa DTA
//   - Texte d'accord (différent SAT vs SUR)
//   - Tableau Aéronef | Immatriculation
//   - Motif, Opérateur, Itinéraire/Route
//   - Dates début/fin + extension
//   - Conditions (italique)
//   - "Salutations distinguées Stop..." (SUR uniquement)
//   - Distribution (liste) | Signature

import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

const PAGE_W   = 210;
const M_L      = 15;
const M_R      = PAGE_W - 15;
const CW       = M_R - M_L;       // content width = 180mm
const MID      = M_L + CW / 2;    // colonne du milieu = 105mm
const H_TOP    = 42;               // espace entête papier
const H_BOT    = 282;              // bas de page utile


export function generateAuthorizationPDF(data) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // bordure extérieure du document
    doc.setLineWidth(0.5);
    doc.rect(M_L, H_TOP, CW, H_BOT - H_TOP);

    let y = H_TOP;
    doc.setLineWidth(0.3);

    // ══════════════════════════════════════════
    // TITRE + CASE DATE
    // ══════════════════════════════════════════
    const TH = 22; // hauteur du bloc titre

    // case date (en haut à droite)
    const DW = 48;
    const DX = M_R - DW;
    doc.rect(DX, y, DW, TH);
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('Date/ Dated', DX + 3, y + 5);
    doc.setFont('helvetica', 'normal').setFontSize(11);
    doc.text(data.dateEmission || '', DX + DW/2, y + 14, { align: 'center' });

    // titre principal
    doc.setFont('helvetica', 'bold').setFontSize(20);
    doc.text('Autorisation / Authorization', M_L + 3, y + 10);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Aurorisation numéro / authorization number:', M_L + 3, y + 16);

    doc.line(M_L, y + TH, M_R, y + TH);
    y += TH;

    // ══════════════════════════════════════════
    // NUMÉRO
    // ══════════════════════════════════════════
    const NH = 10;
    doc.setFont('helvetica', 'bold').setFontSize(16);
    doc.text(data.numero || '', M_L + CW/2, y + 7.5, { align: 'center' });
    doc.line(M_L, y + NH, M_R, y + NH);
    y += NH;

    // ══════════════════════════════════════════
    // TYPE D'AUTORISATION
    // ══════════════════════════════════════════
    const TYPH = 9;
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text('Autorisation type / Authorization', M_L + 3, y + 6);
    doc.setFont('helvetica', 'bold').setFontSize(14);
    doc.text(data.type || '', M_L + 72, y + 6.5);
    doc.line(M_L, y + TYPH, M_R, y + TYPH);
    y += TYPH;

    // ══════════════════════════════════════════
    // BLOC INFO : ANAC gauche | A/To droite
    // ══════════════════════════════════════════
    const RH = 6;   // hauteur d'une ligne
    const BH = 6 * RH; // 6 lignes

    // séparateur vertical au milieu
    doc.line(MID, y, MID, y + BH);

    // lignes horizontales (5 séparateurs = 6 zones)
    for (let i = 1; i <= 5; i++) {
        doc.line(M_L, y + i * RH, M_R, y + i * RH);
    }

    // colonne gauche (ANAC)
    doc.setFont('helvetica', 'normal').setFontSize(7.5);
    const leftLines = [
        "Délivrée par: Agence Nationale de l'Aviation Civile:",
        "Delivered by: National Civil Aviation Autority:",
        "Tél/Tel: 00 222 45 24  40 05",
        "Télécopie/Fax:00 222 45 25 35 78",
        "Référence/Reference: " + (data.reference || ''),
        '',
    ];
    leftLines.forEach((txt, i) => {
        if (txt) doc.text(txt, M_L + 2, y + i * RH + 4.2);
    });

    // colonne droite (destinataire)
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('A/To:', MID + 3, y + 4);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    // tronquer si trop long
    const dest = data.destinataire || '';
    doc.text(dest, MID + 14, y + 4);

    doc.setFont('helvetica', 'normal').setFontSize(7.5);
    doc.text('Tél/Tel:', MID + 3, y + RH + 4);
    doc.text('Télécopie/Fax:', MID + 3, y + 2*RH + 4);
    doc.text('Date de recéption de la demande/Date of', MID + 3, y + 3*RH + 3);
    doc.text('receipt of request:', MID + 3, y + 3*RH + 7);
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text(data.dateReception || data.dateEmission || '', MID + 50, y + 3*RH + 5.5);

    y += BH;

    // ══════════════════════════════════════════
    // LIGNE VISA SRT | VISA DTA
    // ══════════════════════════════════════════
    const VH = 8;
    doc.line(MID, y, MID, y + VH);
    doc.line(M_L, y + VH, M_R, y + VH);

    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Visa/SRT ' + (data.visaSRT || 'A'), M_L + 3, y + 5.5);
    doc.text('Visa DTA', MID + 3, y + 5.5);
    y += VH;

    // ══════════════════════════════════════════
    // TEXTE D'ACCORD (différent SAT vs SUR)
    // ══════════════════════════════════════════
    y += 3;
    doc.setFont('helvetica', 'normal').setFontSize(8.5);

    if (data.typeCode === 'SUR') {
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien en faveur de l'avion selon les informations ci-après #",
            M_L + 3, y
        );
        y += 6;
    } else {
        // SAT ou ATT
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien et l'atterrissage sur le(s)",
            M_L + 3, y
        );
        y += 4.5;
        doc.text(
            "aéroport(s) International de Nouakchott OUM TOUNSY en faveur de(s) avion(s) selon les",
            M_L + 3, y
        );
        y += 6;
    }

    // ══════════════════════════════════════════
    // TABLEAU AÉRONEF | IMMATRICULATION
    // ══════════════════════════════════════════
    const ACH = 24;
    doc.rect(M_L, y, CW, ACH);
    doc.line(MID, y, MID, y + ACH);
    doc.line(M_L, y + 7, M_R, y + 7);

    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('Aéronef type / aircraft type', M_L + 3, y + 5);
    doc.text('Immatriculation/ Registration', MID + 3, y + 5);

    doc.setFont('helvetica', 'bold').setFontSize(16);
    doc.text(data.aeronefType || '', M_L + CW/4, y + 18, { align: 'center' });
    doc.text(data.immatriculation || '', M_L + 3*CW/4, y + 18, { align: 'center' });
    y += ACH + 4;

    // ══════════════════════════════════════════
    // MOTIF / OPÉRATEUR / ITINÉRAIRE / DATES
    // ══════════════════════════════════════════
    doc.setFont('helvetica', 'bold').setFontSize(9);
    const fields = [
        ['Motif/Motif:', data.motif || ''],
        ['Opérateur/Operator:', data.operateur || ''],
        [data.typeCode === 'SUR' ? 'itinéraire/Itinerary' : 'Route/Route:', data.route || ''],
    ];
    for (const [label, val] of fields) {
        doc.setFont('helvetica', 'bold').setFontSize(8.5);
        doc.text(label, M_L + 3, y);
        doc.setFont('helvetica', 'normal').setFontSize(8.5);
        doc.text(val, M_L + 52, y);
        y += 6;
    }

    y += 1;
    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('Date début de validité/Validity Start Date :', M_L + 3, y);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(data.dateDebutValidite || '', M_L + 95, y);
    y += 6;

    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('Date fin vlidité/Validity End Date', M_L + 3, y);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(data.dateFinValidite || '', M_L + 95, y);
    if (data.validiteExtension) {
        doc.setFont('helvetica', 'bold').setFontSize(9);
        doc.text(data.validiteExtension, M_L + 130, y);
    }
    y += 5;

    // ══════════════════════════════════════════
    // CONDITIONS
    // ══════════════════════════════════════════
    doc.setFont('helvetica', 'italic').setFontSize(7);
    const conds = [
        "Cette autorisation est délivrée sous réserve que/ This permit is issued subject to :",
        "1) Tous les docuemnts de bord de l'aéronef soient en cours de validité pendant l'opération du vol ci-dessus autorisé/ All aircraft 's onboard docuemnts be",
        "valid for the operation of authorized above flight;",
        "2) La réglementation aérienne mauritanienne soit scrupuleusement respectée/ Mauritanian Aviation Regulation is scrupulously respected ;",
    ];
    for (const line of conds) {
        doc.text(line, M_L + 3, y);
        y += 3.2;
    }
    y += 1;

    // NB (paiement) — uniquement SAT (visible dans SAT-0303-26, absent dans SUR-1014-26)
    if (data.typeCode !== 'SUR') {
        doc.text("NB: Le paiement des frais et taxes relatifs à la délivrance de la présente autorisation sont dus dès la signature de celle-ci par l'ANAC.", M_L + 3, y);
        y += 3.2;
        doc.text("NB: The payment of the fees and taxes relating to the issue of this authorization are due as soon as it is signed by the ANAC.", M_L + 3, y);
        y += 3.2;
    }

    // "Salutations distinguées..." — uniquement SUR (visible dans SUR-1014-26)
    if (data.typeCode === 'SUR') {
        y += 1;
        doc.setFont('helvetica', 'italic').setFontSize(7.5);
        doc.text('Salutations distinguées Stop', M_L + 3, y);
        y += 3.5;
        doc.text('Nouakchott Mauritanie Stop et Fin', M_L + 3, y);
        y += 4;
    } else {
        y += 2;
    }

    // ══════════════════════════════════════════
    // DISTRIBUTION + SIGNATURE
    // ══════════════════════════════════════════
    const sigY = y;
    const distItems = [
        '•  MDN/MET',
        '•  E.M.A.A',
        '•  Asecna NKC',
        '•  Bureau piste aéroport NKC',
        '•  CDT Aéroport NKC',
        '•  GEND-RIM, Police, Douane / Aéroport NKC',
        '•  DNAM /AP /C3I',
        '•  DTA/DAF/DSV/ANAC',
    ];
    doc.setFont('helvetica', 'normal').setFontSize(8);
    distItems.forEach((item, i) => {
        doc.text(item, M_L + 3, sigY + i * 4);
    });

    // signature à droite
    const SX = MID + 5;
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Nom du signataire:', SX, sigY);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.signataire || 'AHMED BABA AHMED', SX + 38, sigY);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Titre:', SX, sigY + 8);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.titreSignataire || 'Directeur Général', SX + 12, sigY + 8);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Signature et cachet:', SX, sigY + 18);

    return doc;
}


function safeName(s) {
    return (s || '').replace(/[^a-zA-Z0-9-]/g, '_');
}

export function downloadGeneratedPDF(data, existingDoc = null) {
    const doc = existingDoc || generateAuthorizationPDF(data);
    const name = `${safeName(data.numero) || 'autorisation'}_${safeName(data.operateur)}.pdf`;
    doc.save(name);
}

export function getPDFBlob(data, existingDoc = null) {
    const doc = existingDoc || generateAuthorizationPDF(data);
    return doc.output('blob');
}

export function getPDFDataURI(data, existingDoc = null) {
    const doc = existingDoc || generateAuthorizationPDF(data);
    return doc.output('datauristring');
}
