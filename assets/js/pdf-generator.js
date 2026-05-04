// pdf-generator.js
// Génère un PDF d'autorisation au format ANAC avec jsPDF.
//
// IMPORTANT : on laisse 42mm vide en haut pour l'entête imprimé physiquement
// (papier a en-tête ANAC). C'est ce qu'on a convenu avec M. AHMED, sinon
// les couleurs et le logo ne sortent pas correctement à l'impression.

import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

// dimensions en mm (A4)
const PAGE_W = 210;
const M_LEFT = 15;
const M_RIGHT = PAGE_W - 15;
const CONTENT_W = M_RIGHT - M_LEFT;
const HEADER_SPACE = 42;  // espace réservé entête papier
const BOTTOM = 282;


export function generateAuthorizationPDF(data) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // bordure exterieure
    doc.setLineWidth(0.5);
    doc.rect(M_LEFT, HEADER_SPACE, CONTENT_W, BOTTOM - HEADER_SPACE);

    let y = HEADER_SPACE;

    // --- titre + case date a droite ---
    const titleH = 20;
    doc.setLineWidth(0.4);
    doc.line(M_LEFT, y + titleH, M_RIGHT, y + titleH);

    doc.setFont('helvetica', 'bold').setFontSize(18);
    doc.text('Autorisation / Authorization', M_LEFT + 4, y + 11);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Autorisation numéro / authorization number:', M_LEFT + 4, y + 16);

    // case date
    const dateW = 45;
    const dateX = M_RIGHT - dateW;
    doc.rect(dateX, y, dateW, titleH);
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('Date/Date', dateX + 2, y + 5);
    doc.setFontSize(12);
    doc.text(data.dateEmission || '', dateX + dateW/2, y + 13, { align: 'center' });

    y += titleH;

    // --- numero d'autorisation ---
    const numH = 11;
    doc.line(M_LEFT, y + numH, M_RIGHT, y + numH);
    doc.setFont('helvetica', 'bold').setFontSize(15);
    doc.text(data.numero || '', M_LEFT + 35, y + 8);
    y += numH;

    // --- type d'autorisation ---
    const typeH = 8;
    doc.line(M_LEFT, y + typeH, M_RIGHT, y + typeH);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text('Autorisation type / Authorization', M_LEFT + 4, y + 5);
    doc.setFont('helvetica', 'bold').setFontSize(13);
    doc.text(data.type || '', M_LEFT + 65, y + 5.5);
    y += typeH;

    // --- bloc info: ANAC à gauche, destinataire a droite ---
    const rowH = 6.5;
    const blockH = 5 * rowH;
    const midX = M_LEFT + CONTENT_W / 2;

    // lignes horizontales internes
    for (let i = 1; i < 5; i++) {
        doc.line(M_LEFT, y + i * rowH, M_RIGHT, y + i * rowH);
    }
    doc.line(M_LEFT, y + blockH, M_RIGHT, y + blockH);
    doc.line(midX, y, midX, y + blockH);

    // colonne gauche (ANAC)
    const leftRows = [
        "Délivrée par: Agence Nationale de l'Aviation Civile:",
        "Delivered by: National Civil Aviation Autority:",
        "Tél/Tel: 00 222 45 24 40 05",
        "Télécopie/Fax: 00 222 45 25 35 78",
        "Référence/Reference: " + (data.reference || ''),
    ];
    doc.setFont('helvetica', 'normal').setFontSize(8);
    leftRows.forEach((txt, i) => {
        doc.text(txt, M_LEFT + 3, y + (i + 0.65) * rowH);
    });

    // colonne droite (destinataire)
    doc.text('A/To:', midX + 3, y + 0.65 * rowH);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.destinataire || '', midX + 16, y + 0.65 * rowH);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Tél/Tel:', midX + 3, y + 1.65 * rowH);
    doc.text('Télécopie/Fax:', midX + 3, y + 2.65 * rowH);
    doc.text('Date de réception de la', midX + 3, y + 3.5 * rowH);
    doc.text('demande/Date of receipt of request:', midX + 3, y + 3.95 * rowH);
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text(data.dateReception || data.dateEmission || '', midX + 55, y + 3.7 * rowH);

    y += blockH;

    // --- ligne visa ---
    const visaH = 7;
    doc.line(M_LEFT, y + visaH, M_RIGHT, y + visaH);
    doc.line(midX, y, midX, y + visaH);
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Visa/SRT ' + (data.visaSRT || ''), M_LEFT + 3, y + 4.5);
    doc.text('Visa DTA', midX + 3, y + 4.5);
    y += visaH + 4;

    // --- texte d'accord ---
    doc.setFont('helvetica', 'normal').setFontSize(8.5);
    if (data.typeCode === 'SUR') {
        doc.text("Honneur vous notifier notre accord de survol du territoire mauritanien en faveur de l'avion selon les informations ci-après #", M_LEFT + 3, y);
    } else {
        // SAT et ATT - on mentionne l'atterrissage
        doc.text("Honneur vous notifier notre accord de survol du territoire mauritanien et l'atterrissage sur le(s)", M_LEFT + 3, y);
        doc.text("aéroport(s) International de Nouakchott OUM TOUNSY en faveur de(s) avion(s) selon les", M_LEFT + 3, y + 4);
        y += 4;
    }
    y += 6;

    // --- tableau aéronef + immatriculation ---
    const acH = 22;
    const acMid = M_LEFT + CONTENT_W / 2;
    doc.rect(M_LEFT, y, CONTENT_W, acH);
    doc.line(acMid, y, acMid, y + acH);
    doc.line(M_LEFT, y + 6, M_RIGHT, y + 6);

    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text('Aéronef type / aircraft', M_LEFT + 3, y + 4);
    doc.text('Immatriculation/', acMid + 3, y + 4);
    doc.setFontSize(15);
    doc.text(data.aeronefType || '', M_LEFT + CONTENT_W/4, y + 16, { align: 'center' });
    doc.text(data.immatriculation || '', M_LEFT + 3*CONTENT_W/4, y + 16, { align: 'center' });
    y += acH + 6;

    // --- détails (motif, opérateur, route) ---
    const details = [
        ['Motif/Motif:',     data.motif     || ''],
        ['Opérateur/Oper',   data.operateur || ''],
        ['Route/Route:',     data.route     || ''],
    ];
    doc.setFont('helvetica', 'bold').setFontSize(9);
    for (const [label, val] of details) {
        doc.text(label, M_LEFT + 3, y);
        doc.text(val, M_LEFT + 45, y);
        y += 6;
    }

    y += 1;
    doc.text('Date début de validité/Validity', M_LEFT + 3, y);
    doc.text(data.dateDebutValidite || '', M_LEFT + 80, y);
    y += 6;
    doc.text('Date fin validité/Validity End', M_LEFT + 3, y);
    doc.text(data.dateFinValidite || '', M_LEFT + 80, y);
    if (data.validiteExtension) {
        doc.text(data.validiteExtension, M_LEFT + 110, y);
    }
    y += 6;

    // --- conditions (italique petit) ---
    doc.setFont('helvetica', 'italic').setFontSize(7.5);
    const conditions = [
        "Cette autorisation est délivrée sous réserve que/ This permit is issued subject to :",
        "1) Tous les documents de bord de l'aéronef soient en cours de validité pendant l'opération de vol ci-dessus autorisé/ All",
        "aircraft's onboard documents be valid for the operation of authorized above flight;",
        "2) La réglementation aérienne mauritanienne soit scrupuleusement respectée/Mauritanian Aviation Regulation is scrupulously respected.",
        "",
        "NB: Le paiement des frais et taxes relatifs à la délivrance de la présente autorisation sont dus dès la signature de celle-ci par l'ANAC.",
        "NB: The payment of the fees and taxes relating to the issue of this authorization are due as soon as it is signed by the ANAC.",
    ];
    for (const line of conditions) {
        doc.text(line, M_LEFT + 3, y);
        y += 3.5;
    }
    y += 4;

    // --- distribution + signature ---
    const sigY = y;
    const distItems = [
        '• MDN/MET', '• E.M.A.A', '• Asecna NKC',
        '• Bureau piste aéroport NKC', '• CDT Aéroport NKC',
        '• GEND-RIM, Police, Douane / Aéroport NKC',
        '• DNAM /AP /C3I', '• DTA/DAF/DSV/ANAC'
    ];
    doc.setFont('helvetica', 'normal').setFontSize(8);
    distItems.forEach((item, i) => {
        doc.text(item, M_LEFT + 3, sigY + i * 3.8);
    });

    // bloc signature a droite
    const sigX = midX + 3;
    doc.text('Nom du signataire:', sigX, sigY);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.signataire || 'AHMED BABA AHMED', sigX + 35, sigY);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Titre:', sigX, sigY + 8);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.titreSignataire || 'Directeur Général', sigX + 15, sigY + 8);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Signature et cachet:', sigX, sigY + 16);

    return doc;
}


// nettoie les caracteres bizarres dans le nom de fichier
function safeName(s) {
    return (s || '').replace(/[^a-zA-Z0-9-]/g, '_');
}

// télécharge le PDF (= demande au navigateur de le sauvegarder)
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
