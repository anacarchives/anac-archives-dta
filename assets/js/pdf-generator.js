// pdf-generator.js
// Structure du document selon les corrections de M. DADY (04/05/2026) :
//
// [espace entête papier 42mm]
// ┌─────────────────────────────────┬──────────┐
// │ Autorisation / Authorization    │Date/Dated│  ← Rectangle 1
// │ Aurorisation numéro/number:     │          │
// └─────────────────────────────────┴──────────┘
// ┌──────────────────────────────────────────────┐
// │  SAT-021-26  (aligné à gauche)               │  ← Rectangle 2
// └──────────────────────────────────────────────┘
// ┌──────────────────────────────────────────────┐
// │ Autorisation type / Authorization  [TYPE]    │  ← Rectangle 3
// └──────────────────────────────────────────────┘
// ┌──────────────────────────────┬───────────────┐
// │ Délivrée par: ANAC...        │ A/To: ...     │  ← Rectangle 4
// │ Delivered by...              │ Tél:          │    (SANS lignes internes)
// │ Tél: 00 222...               │ Fax:          │
// │ Fax: 00 222...               │ Date récep:   │
// │ Référence:                   │               │
// └──────────────────────────────┴───────────────┘
// ┌──────────────────────────────┬───────────────┐
// │ Visa/SRT A                   │ Visa DTA      │  ← Rectangle 5
// │                              │               │    (SANS lignes internes)
// │ Texte d'accord...            │               │
// │                              │               │
// │ Aéronef type | Immatricul.   │               │
// └──────────────────────────────┴───────────────┘
// ... suite (motif, route, dates, conditions, signature)

import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm";

const PAGE_W = 210;
const M_L    = 15;
const M_R    = PAGE_W - 15;
const CW     = M_R - M_L;      // 180mm
const MID    = M_L + CW / 2;   // 105mm
const H_TOP  = 42;              // espace entête papier
const H_BOT  = 282;


export function generateAuthorizationPDF(data) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setLineWidth(0.4);

    let y = H_TOP;

    // ══════════════════════════════════════════
    // RECTANGLE 1 — Titre + case Date
    // ══════════════════════════════════════════
    const R1H = 22;
    const DW  = 48;
    const DX  = M_R - DW;

    // bordure extérieure du rectangle 1
    doc.rect(M_L, y, CW, R1H);
    // ligne verticale séparant titre et date
    doc.line(DX, y, DX, y + R1H);

    // titre
    doc.setFont('helvetica', 'bold').setFontSize(20);
    doc.text('Autorisation / Authorization', M_L + 3, y + 11);
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Aurorisation numéro / authorization number:', M_L + 3, y + 17);

    // case date
    doc.setFont('helvetica', 'bold').setFontSize(8);
    doc.text('Date/ Dated', DX + 3, y + 6);
    doc.setFont('helvetica', 'normal').setFontSize(11);
    doc.text(data.dateEmission || '', DX + DW / 2, y + 15, { align: 'center' });

    y += R1H;

    // ══════════════════════════════════════════
    // RECTANGLE 2 — Numéro (aligné à gauche)
    // ══════════════════════════════════════════
    const R2H = 12;
    doc.rect(M_L, y, CW, R2H);
    doc.setFont('helvetica', 'bold').setFontSize(17);
    // aligné à gauche, avec un petit retrait
    doc.text(data.numero || '', M_L + 8, y + 8.5);
    y += R2H;

    // ══════════════════════════════════════════
    // RECTANGLE 3 — Type d'autorisation
    // ══════════════════════════════════════════
    const R3H = 10;
    doc.rect(M_L, y, CW, R3H);
    doc.setFont('helvetica', 'normal').setFontSize(9);
    doc.text('Autorisation type / Authorization', M_L + 3, y + 6.5);
    doc.setFont('helvetica', 'bold').setFontSize(14);
    doc.text(data.type || '', M_L + 72, y + 7);
    y += R3H;

    // ══════════════════════════════════════════
    // RECTANGLE 4 — Bloc info ANAC / destinataire
    // PAS de lignes horizontales internes
    // juste la ligne verticale au milieu
    // ══════════════════════════════════════════
    const R4H = 36;
    doc.rect(M_L, y, CW, R4H);
    doc.line(MID, y, MID, y + R4H); // séparateur vertical gauche/droite

    // colonne gauche (ANAC)
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text("Délivrée par: Agence Nationale de l'Aviation Civile:", M_L + 3, y + 6);
    doc.text("Delivered by: National Civil Aviation Autority:", M_L + 3, y + 11);
    doc.text("Tél/Tel: 00 222 45 24  40 05", M_L + 3, y + 16);
    doc.text("Télécopie/Fax:00 222 45 25 35 78", M_L + 3, y + 21);
    doc.text("Référence/Reference: " + (data.reference || ''), M_L + 3, y + 26);

    // colonne droite (destinataire)
    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('A/To:', MID + 3, y + 6);
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(data.destinataire || '', MID + 14, y + 6);

    doc.setFont('helvetica', 'normal').setFontSize(8);
    doc.text('Tél/Tel:', MID + 3, y + 13);
    doc.text('Télécopie/Fax:', MID + 3, y + 19);
    doc.text('Date de recéption de la demande/Date of', MID + 3, y + 25);
    doc.text('receipt of request:', MID + 3, y + 30);
    doc.setFont('helvetica', 'bold').setFontSize(9);
    doc.text(data.dateReception || data.dateEmission || '', MID + 46, y + 30);

    y += R4H;

    // ══════════════════════════════════════════
    // RECTANGLE 5 — Visa + texte accord + aéronef
    // PAS de lignes internes (tout dans un seul grand rectangle)
    // ══════════════════════════════════════════

    // calcul de la hauteur de ce rectangle selon le type
    const acY  = 46; // espace visa + texte avant le tableau aéronef
    const R5H  = acY + 26; // 26mm pour le tableau aéronef
    doc.rect(M_L, y, CW, R5H);

    // --- Visa SRT | Visa DTA (en haut du rectangle, séparés par ligne verticale)
    doc.line(MID, y, MID, y + 9);
    doc.line(M_L, y + 9, M_R, y + 9); // ligne horizontale sous visa
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Visa/SRT ' + (data.visaSRT || 'A'), M_L + 3, y + 6);
    doc.text('Visa DTA', MID + 3, y + 6);

    // --- texte d'accord
    let ty = y + 14;
    doc.setFont('helvetica', 'normal').setFontSize(8.5);
    if (data.typeCode === 'SUR') {
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien en faveur de l'avion selon les informations ci-après #",
            M_L + 3, ty
        );
        ty += 7;
    } else {
        doc.text(
            "Honneur vous notifier notre accord de survol du territoire mauritanien et l'atterrissage sur le(s)",
            M_L + 3, ty
        );
        ty += 5;
        doc.text(
            "aéroport(s) International de Nouakchott OUM TOUNSY en faveur de(s) avion(s) selon les",
            M_L + 3, ty
        );
        ty += 7;
    }

    // --- tableau aéronef | immatriculation (dans le même rectangle, juste une ligne verticale)
    const acTop = y + acY;
    doc.line(MID, acTop, MID, acTop + 26);        // ligne verticale
    doc.line(M_L, acTop + 7, M_R, acTop + 7);    // ligne sous les labels

    doc.setFont('helvetica', 'bold').setFontSize(8.5);
    doc.text('Aéronef type / aircraft type', M_L + 3, acTop + 5);
    doc.text('Immatriculation/ Registration', MID + 3, acTop + 5);

    doc.setFont('helvetica', 'bold').setFontSize(16);
    doc.text(data.aeronefType || '', M_L + CW / 4, acTop + 19, { align: 'center' });
    doc.text(data.immatriculation || '', M_L + 3 * CW / 4, acTop + 19, { align: 'center' });

    y += R5H + 4;

    // ══════════════════════════════════════════
    // MOTIF / OPÉRATEUR / ROUTE / DATES
    // ══════════════════════════════════════════
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
        doc.text(data.validiteExtension, M_L + 135, y);
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

    if (data.typeCode !== 'SUR') {
        y += 0.5;
        doc.text("NB: Le paiement des frais et taxes relatifs à la délivrance de la présente autorisation sont dus dès la signature de celle-ci par l'ANAC.", M_L + 3, y);
        y += 3.2;
        doc.text("NB: The payment of the fees and taxes relating to the issue of this authorization are due as soon as it is signed by the ANAC.", M_L + 3, y);
        y += 3.2;
    }

    if (data.typeCode === 'SUR') {
        y += 2;
        doc.setFont('helvetica', 'italic').setFontSize(7.5);
        doc.text('Salutations distinguées Stop', M_L + 3, y);
        y += 3.5;
        doc.text('Nouakchott Mauritanie Stop et Fin', M_L + 3, y);
        y += 5;
    } else {
        y += 3;
    }

    // ══════════════════════════════════════════
    // DISTRIBUTION + SIGNATURE
    // ══════════════════════════════════════════
    const sigY = y;
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
        doc.text(item, M_L + 3, sigY + i * 4);
    });

    // signature
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
