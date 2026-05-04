// pdf-generator.js
// Structure finale validée par M. DADY le 04/05/2026
// 6 rectangles, aucun trait interne dans chaque rectangle

import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

const PAGE_W = 210;
const M_L    = 15;
const M_R    = PAGE_W - 15;
const CW     = M_R - M_L;    // 180mm
const MID    = M_L + CW / 2; // 105mm


export function generateAuthorizationPDF(data) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setLineWidth(0.4);

    let y = 5; // on commence tout en haut

    // ══════════════════════════════════════════
    // RECTANGLE 1 — Vide (espace entête papier ANAC)
    // ══════════════════════════════════════════
    const R1H = 42;
    doc.rect(M_L, y, CW, R1H);
    y += R1H;

    // ══════════════════════════════════════════
    // RECTANGLE 2 — Titre + Numéro + Type
    // ══════════════════════════════════════════
    const R2H = 40;
    doc.rect(M_L, y, CW, R2H);

    // case Date en haut à droite (juste une bordure interne, pas un trait séparateur)
    const DW = 48;
    const DX = M_R - DW;
    doc.rect(DX, y, DW, 20); // mini rectangle pour la date

    // titre
    doc.setFont('helvetica', 'bold').setFontSize(22);
    doc.text('Autorisation / Authorization', M_L + 3, y + 10);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Aurorisation numéro / authorization number:', M_L + 3, y + 16);

    // date
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('Date/ Dated', DX + 3, y + 5);
    doc.setFont('helvetica', 'normal').setFontSize(11);
    doc.text(data.dateEmission || '', DX + DW / 2, y + 14, { align: 'center' });

    // numéro (aligné à gauche, gros)
    doc.setFont('helvetica', 'bold').setFontSize(17);
    doc.text(data.numero || '', M_L + 5, y + 27);

    // type
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text('Autorisation type / Authorization', M_L + 3, y + 36);
    doc.setFont('helvetica', 'bold').setFontSize(15);
    doc.text(data.type || '', M_L + 72, y + 36.5);

    y += R2H;

    // ══════════════════════════════════════════
    // RECTANGLE 3 — Info ANAC / Destinataire
    // PAS de traits internes
    // ══════════════════════════════════════════
    const R3H = 38;
    doc.rect(M_L, y, CW, R3H);

    // colonne gauche
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text("Délivrée par: Agence Nationale de l'Aviation Civile:", M_L + 3, y + 7);
    doc.text("Delivered by: National Civil Aviation Autority:", M_L + 3, y + 13);
    doc.text("Tél/Tel: 00 222 45 24  40 05", M_L + 3, y + 19);
    doc.text("Télécopie/Fax:00 222 45 25 35 78", M_L + 3, y + 25);
    doc.text("Référence/Reference: " + (data.reference || ''), M_L + 3, y + 31);

    // colonne droite
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('A/To:', MID + 3, y + 7);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.destinataire || '', MID + 14, y + 7);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Tél/Tel:', MID + 3, y + 14);
    doc.text('Télécopie/Fax:', MID + 3, y + 20);
    doc.text('Date de recéption de la demande/Date of', MID + 3, y + 26);
    doc.text('receipt of request:', MID + 3, y + 31);
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text(data.dateReception || data.dateEmission || '', MID + 46, y + 31);

    y += R3H;

    // ══════════════════════════════════════════
    // RECTANGLE 4 — Visa + Texte accord + Aéronef
    // PAS de traits internes
    // ══════════════════════════════════════════
    const R4H = data.typeCode === 'SUR' ? 62 : 65;
    doc.rect(M_L, y, CW, R4H);

    // visa SRT et DTA (côte à côte, pas de traits)
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Visa/SRT ' + (data.visaSRT || 'A'), M_L + 3, y + 7);
    doc.text('Visa DTA', MID + 3, y + 7);

    // texte d'accord
    doc.setFont('helvetica', 'normal').setFontSize(8.5);
    if (data.typeCode === 'SUR') {
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien en faveur de l'avion selon les informations ci-après #",
            M_L + 3, y + 16
        );
    } else {
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien et l'atterrissage sur le(s)",
            M_L + 3, y + 16
        );
        doc.text(
            "aéroport(s) International de Nouakchott OUM TOUNSY en faveur de(s) avion(s) selon les",
            M_L + 3, y + 21
        );
    }

    // tableau aéronef / immatriculation (labels + valeurs, pas de rectangle interne)
    const acLabelY = y + 28;
    const acValY   = y + 48;

    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('Aéronef type / aircraft type', M_L + 3, acLabelY);
    doc.text('Immatriculation/ Registration', MID + 3, acLabelY);

    doc.setFont('helvetica', 'bold').setFontSize(16);
    doc.text(data.aeronefType || '', M_L + CW / 4, acValY, { align: 'center' });
    doc.text(data.immatriculation || '', M_L + 3 * CW / 4, acValY, { align: 'center' });

    y += R4H;

    // ══════════════════════════════════════════
    // RECTANGLE 5 — Motif + Opérateur + Route + Dates + Conditions + Salutations
    // PAS de traits internes
    // ══════════════════════════════════════════
    // on calcule la hauteur selon le type (SUR a les salutations, SAT a le NB paiement)
    const R5H = data.typeCode === 'SUR' ? 72 : 75;
    doc.rect(M_L, y, CW, R5H);

    let iy = y + 7;

    // motif / opérateur / route
    const fields = [
        ['Motif/Motif:', data.motif || ''],
        ['Opérateur/Operator:', data.operateur || ''],
        [data.typeCode === 'SUR' ? 'itinéraire/Itinerary' : 'Route/Route:', data.route || ''],
    ];
    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    for (const [label, val] of fields) {
        doc.setFont('helvetica', 'bold').setFontSize(8.5);
        doc.text(label, M_L + 3, iy);
        doc.setFont('helvetica', 'normal').setFontSize(8.5);
        doc.text(val, M_L + 52, iy);
        iy += 7;
    }

    iy += 1;
    // dates
    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('Date début de validité/Validity Start Date :', M_L + 3, iy);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(data.dateDebutValidite || '', M_L + 95, iy);
    iy += 6;

    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('Date fin vlidité/Validity End Date', M_L + 3, iy);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text(data.dateFinValidite || '', M_L + 95, iy);
    if (data.validiteExtension) {
        doc.setFont('helvetica', 'bold').setFontSize(9);
        doc.text(data.validiteExtension, M_L + 140, iy);
    }
    iy += 5;

    // conditions
    doc.setFont('helvetica', 'italic').setFontSize(7);
    const conds = [
        "Cette autorisation est délivrée sous réserve que/ This permit is issued subject to :",
        "1) Tous les docuemnts de bord de l'aéronef soient en cours de validité pendant l'opération du vol ci-dessus autorisé/ All aircraft 's onboard docuemnts be",
        "valid for the operation of authorized above flight;",
        "2) La réglementation aérienne mauritanienne soit scrupuleusement respectée/ Mauritanian Aviation Regulation is scrupulously respected ;",
    ];
    for (const line of conds) {
        doc.text(line, M_L + 3, iy);
        iy += 3.3;
    }

    // NB paiement (SAT seulement)
    if (data.typeCode !== 'SUR') {
        iy += 1;
        doc.text("NB: Le paiement des frais et taxes relatifs à la délivrance de la présente autorisation sont dus dès la signature de celle-ci par l'ANAC.", M_L + 3, iy);
        iy += 3.3;
        doc.text("NB: The payment of the fees and taxes relating to the issue of this authorization are due as soon as it is signed by the ANAC.", M_L + 3, iy);
    }

    // Salutations (SUR seulement)
    if (data.typeCode === 'SUR') {
        iy += 3;
        doc.setFont('helvetica', 'italic').setFontSize(8);
        doc.text('Salutations distinguées Stop', M_L + 3, iy);
        iy += 4;
        doc.text('Nouakchott Mauritanie Stop et Fin', M_L + 3, iy);
    }

    y += R5H;

    // ══════════════════════════════════════════
    // RECTANGLE 6 — Distribution + Signature
    // PAS de traits internes
    // ══════════════════════════════════════════
    const R6H = 48;
    doc.rect(M_L, y, CW, R6H);

    const dist = [
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
    dist.forEach((item, i) => {
        doc.text(item, M_L + 3, y + 7 + i * 4.5);
    });

    // signature
    const SX = MID + 5;
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Nom du signataire:', SX, y + 7);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.signataire || 'AHMED BABA AHMED', SX + 38, y + 7);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Titre:', SX, y + 16);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.titreSignataire || 'Directeur Général', SX + 12, y + 16);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Signature et cachet:', SX, y + 28);

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
