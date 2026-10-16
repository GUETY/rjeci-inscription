
/**
 * RJECI — Gestion des inscriptions, suivi des clics,
 * présence des participants et tableau de bord.
 *
 * IMPORTANT :
 * 1. Conserver le nom de l'onglet Inscriptions.
 * 2. Renseigner FORM_URL avec le lien public du formulaire.
 * 3. Déployer Apps Script en application Web.
 */

const SHEET_NAME = "Inscriptions";
const CLICKS_SHEET_NAME = "SuiviClics";
const FORM_URL = "COLLER_ICI_LE_LIEN_PUBLIC_DU_FORMULAIRE";

const HEADERS = [
  "Date d'inscription",
  "Nom et prénoms",
  "Téléphone",
  "E-mail",
  "Ville",
  "Participation",
  "Consentement",
  "Présence",
  "ID inscription"
];

const COLORS = {
  orange: "#C96F3D",
  orangeLight: "#F8E8DC",
  ivory: "#FFFAF5",
  dark: "#302A27",
  grey: "#817873",
  green: "#DCEFE2",
  red: "#F8DEDB"
};

/* =========================
   INITIALISATION
========================= */

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Conserve les données existantes dans A:G.
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  if (sheet.getLastRow() === 1) {
    sheet.setFrozenRows(1);
  }

  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground(COLORS.orange)
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setWrap(true);

  return sheet;
}

function getClicksSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CLICKS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CLICKS_SHEET_NAME);
    sheet.appendRow(["Date et heure", "Type d'événement"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 2)
      .setBackground(COLORS.orange)
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");
  }

  return sheet;
}

/**
 * À exécuter manuellement une seule fois pour initialiser
 * les colonnes et créer le tableau de bord.
 */
function initialiserRJECI() {
  getSheet_();
  getClicksSheet_();
  refreshDashboard_();
  SpreadsheetApp.getUi().alert(
    "Initialisation terminée. Le tableau de bord RJECI est prêt."
  );
}

/* =========================
   MENU ADMINISTRATEUR
========================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Gestion RJECI")
    .addItem("Actualiser le tableau de bord", "refreshDashboard_")
    .addSeparator()
    .addItem("Marquer comme présent", "marquerPresent")
    .addItem("Marquer comme absent", "marquerAbsent")
    .addItem("Réinitialiser le statut de présence", "reinitialiserPresence")
    .addSeparator()
    .addItem("Supprimer l'inscription sélectionnée", "supprimerInscription")
    .addToUi();
}

function getSelectedParticipant_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  if (sheet.getName() !== SHEET_NAME) {
    throw new Error(
      "Sélectionnez d'abord une ligne dans l'onglet Inscriptions."
    );
  }

  const row = sheet.getActiveRange().getRow();

  if (row < 2 || !sheet.getRange(row, 2).getValue()) {
    throw new Error("Sélectionnez une ligne contenant un participant.");
  }

  return { sheet, row };
}

function marquerPresent() {
  setPresence_("Présent");
}

function marquerAbsent() {
  setPresence_("Absent");
}

function reinitialiserPresence() {
  setPresence_("À vérifier");
}

function setPresence_(status) {
  const ui = SpreadsheetApp.getUi();

  try {
    const selected = getSelectedParticipant_();

    selected.sheet.getRange(selected.row, 8).setValue(status);

    if (status === "Présent") {
      selected.sheet.getRange(selected.row, 8)
        .setBackground(COLORS.green);
    } else if (status === "Absent") {
      selected.sheet.getRange(selected.row, 8)
        .setBackground(COLORS.red);
    } else {
      selected.sheet.getRange(selected.row, 8)
        .setBackground(COLORS.ivory);
    }

    refreshDashboard_();
    ui.alert("Statut de présence mis à jour : " + status);

  } catch (err) {
    ui.alert(err.message);
  }
}

function supprimerInscription() {
  const ui = SpreadsheetApp.getUi();

  try {
    const selected = getSelectedParticipant_();
    const nom = selected.sheet.getRange(selected.row, 2).getDisplayValue();

    const answer = ui.alert(
      "Confirmer la suppression",
      "Voulez-vous vraiment supprimer l'inscription de " + nom +
      " ? Cette opération est définitive.",
      ui.ButtonSet.YES_NO
    );

    if (answer !== ui.Button.YES) return;

    selected.sheet.deleteRow(selected.row);
    refreshDashboard_();

    ui.alert("Inscription supprimée.");

  } catch (err) {
    ui.alert(err.message);
  }
}

/* =========================
   API PUBLIQUE
========================= */

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : "";
  const sheet = getSheet_();

  if (action === "count") {
    return json_({
      success: true,
      count: countRegistrations_()
    });
  }

  if (action === "click") {
    return registerClickAndRedirect_();
  }

  if (action === "stats") {
    return json_({
      success: true,
      registrations: countRegistrations_(),
      confirmed: countParticipation_("Oui"),
      toInform: countParticipation_("Non"),
      present: countPresence_("Présent"),
      absent: countPresence_("Absent"),
      clicks: countClicks_()
    });
  }

  return json_({
    success: true,
    message: "Service d'inscription RJECI actif."
  });
}

function doPost(e) {
  try {
    const data = JSON.parse(
      (e && e.postData && e.postData.contents) || "{}"
    );

    const nom = clean_(data.nom, 120);
    const telephone = clean_(data.telephone, 30);
    const email = clean_(data.email, 160);
    const ville = clean_(data.ville, 80);
    const participation = clean_(data.participation, 10);
    const consentement = clean_(data.consentement, 5);

    if (
      !nom ||
      !telephone ||
      !ville ||
      !["Oui", "Non"].includes(participation) ||
      consentement !== "Oui"
    ) {
      return json_({
        success: false,
        message: "Veuillez vérifier les champs obligatoires."
      });
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return json_({
        success: false,
        message: "L'adresse e-mail semble incorrecte."
      });
    }

    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();

    // Évite les doublons évidents par numéro de téléphone.
    const normaliserTelephone = value =>
      String(value).replace(/[\s()-]/g, "");

    const telephoneNormalise = normaliserTelephone(telephone);

    if (lastRow > 1) {
      const phones = sheet
        .getRange(2, 3, lastRow - 1, 1)
        .getDisplayValues()
        .flat()
        .map(normaliserTelephone);

      if (phones.includes(telephoneNormalise)) {
        return json_({
          success: false,
          message:
            "Ce numéro est déjà inscrit. Contactez l'organisation si nécessaire."
        });
      }
    }

    const id = Utilities.getUuid();

    sheet.appendRow([
      new Date(),
      nom,
      telephone,
      email,
      ville,
      participation,
      consentement,
      "À vérifier",
      id
    ]);

    refreshDashboard_();

    return json_({
      success: true,
      message: "Inscription enregistrée.",
      count: countRegistrations_()
    });

  } catch (err) {
    console.error(err);

    return json_({
      success: false,
      message: "Erreur lors de l'enregistrement. Réessayez plus tard."
    });
  }
}

/* =========================
   SUIVI DES CLICS
========================= */

/**
 * Compte une ouverture du lien de suivi puis redirige
 * vers le formulaire public.
 *
 * FORM_URL doit être renseigné avant utilisation.
 */
function registerClickAndRedirect_() {
  if (
    !FORM_URL ||
    FORM_URL.indexOf("https://") !== 0 ||
    FORM_URL.indexOf("COLLER_ICI") !== -1
  ) {
    return HtmlService.createHtmlOutput(
      "Le lien public du formulaire n'a pas encore été configuré."
    );
  }

  getClicksSheet_().appendRow([new Date(), "Ouverture du lien"]);

  const safeUrl = JSON.stringify(FORM_URL);

  const html = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>RJECI — Redirection</title>
      </head>
      <body style="font-family:Arial,sans-serif;text-align:center;padding:50px 20px">
        <p>Vous allez être redirigé vers le formulaire RJECI…</p>
        <script>
          window.location.replace(${safeUrl});
        </script>
        <p><a href="${FORM_URL}">Continuer vers le formulaire</a></p>
      </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html);
}

/* =========================
   TABLEAU DE BORD
========================= */

function refreshDashboard_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  let total = 0;
  let confirmed = 0;
  let toInform = 0;
  let consents = 0;
  let present = 0;
  let absent = 0;
  let waiting = 0;

  const cities = {};
  const days = {};

  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

    rows.forEach(row => {
      if (!row[1]) return;

      total++;

      const participation = String(row[5]).trim().toLowerCase();
      const consent = String(row[6]).trim().toLowerCase();
      const presence = String(row[7] || "À vérifier").trim();
      const city = String(row[4] || "Non précisée").trim();

      if (participation === "oui") confirmed++;
      if (participation === "non") toInform++;
      if (consent === "oui") consents++;

      if (presence === "Présent") present++;
      else if (presence === "Absent") absent++;
      else waiting++;

      cities[city] = (cities[city] || 0) + 1;

      if (row[0] instanceof Date && !isNaN(row[0].getTime())) {
        const date = Utilities.formatDate(
          row[0],
          ss.getSpreadsheetTimeZone(),
          "yyyy-MM-dd"
        );

        days[date] = (days[date] || 0) + 1;
      }
    });
  }

  const clicks = countClicks_();

  // Le tableau de bord occupe K:R.
  // Les colonnes A:I sont réservées aux inscriptions.
  sheet.getRange("K1:R30").breakApart();
  sheet.getRange("K1:R30").clearContent().clearFormat();

  sheet.getCharts().forEach(chart => sheet.removeChart(chart));

  sheet.setColumnWidths(11, 8, 115);
  sheet.setRowHeight(1, 38);

  sheet.getRange("K1:R1").merge()
    .setValue("RJECI | TABLEAU DE BORD DES INSCRIPTIONS")
    .setBackground(COLORS.orange)
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setFontSize(14)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  const cards = [
    { title: "INSCRIPTIONS", value: total, start: 11 },
    { title: "PARTICIPATION OUI", value: confirmed, start: 13 },
    { title: "À INFORMER", value: toInform, start: 15 },
    { title: "CLICS ENREGISTRÉS", value: clicks, start: 17 },
    { title: "PRÉSENTS", value: present, start: 11, row: 6 },
    { title: "ABSENTS", value: absent, start: 13, row: 6 },
    { title: "À VÉRIFIER", value: waiting, start: 15, row: 6 },
    { title: "CONSENTEMENTS", value: consents, start: 17, row: 6 }
  ];

  cards.forEach(card => {
    const row = card.row || 3;
    const titleRange = sheet.getRange(row, card.start, 1, 2);
    const valueRange = sheet.getRange(row + 1, card.start, 1, 2);

    titleRange.merge()
      .setValue(card.title)
      .setBackground(COLORS.orangeLight)
      .setFontColor(COLORS.dark)
      .setFontWeight("bold")
      .setFontSize(9)
      .setHorizontalAlignment("center")
      .setWrap(true);

    valueRange.merge()
      .setValue(card.value)
      .setBackground(COLORS.ivory)
      .setFontColor(COLORS.orange)
      .setFontWeight("bold")
      .setFontSize(22)
      .setHorizontalAlignment("center");
  });

  // Tables sources pour les graphiques.
  sheet.getRange("K22:L22").setValues([["Date", "Inscriptions"]]);
  sheet.getRange("N22:O22").setValues([["Ville", "Inscrits"]]);

  const dailyRows = Object.keys(days)
    .sort()
    .map(date => [date, days[date]]);

  const cityRows = Object.keys(cities)
    .sort((a, b) => cities[b] - cities[a])
    .map(city => [city, cities[city]]);

  if (dailyRows.length) {
    sheet.getRange(23, 11, dailyRows.length, 2).setValues(dailyRows);
    sheet.getRange(23, 11, dailyRows.length, 1).setNumberFormat("dd/mm/yyyy");
  } else {
    sheet.getRange("K23:L23").setValues([["Aucune donnée", 0]]);
  }

  if (cityRows.length) {
    sheet.getRange(23, 14, cityRows.length, 2).setValues(cityRows);
  } else {
    sheet.getRange("N23:O23").setValues([["Aucune donnée", 0]]);
  }

  sheet.getRange("K22:L22")
    .setBackground(COLORS.orangeLight)
    .setFontWeight("bold");

  sheet.getRange("N22:O22")
    .setBackground(COLORS.orangeLight)
    .setFontWeight("bold");

  const dailyRange = sheet.getRange(
    22, 11, Math.max(2, dailyRows.length + 1), 2
  );

  sheet.insertChart(
    sheet.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(dailyRange)
      .setNumHeaders(1)
      .setPosition(10, 11, 0, 0)
      .setOption("title", "Évolution des inscriptions")
      .setOption("legend", { position: "none" })
      .setOption("colors", [COLORS.orange])
      .setOption("backgroundColor", COLORS.ivory)
      .setOption("width", 470)
      .setOption("height", 280)
      .build()
  );

  const cityRange = sheet.getRange(
    22, 14, Math.max(2, cityRows.length + 1), 2
  );

  sheet.insertChart(
    sheet.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(cityRange)
      .setNumHeaders(1)
      .setPosition(10, 15, 0, 0)
      .setOption("title", "Inscriptions par ville")
      .setOption("legend", { position: "none" })
      .setOption("colors", [COLORS.orange])
      .setOption("backgroundColor", COLORS.ivory)
      .setOption("width", 470)
      .setOption("height", 280)
      .build()
  );

  sheet.getRange("K1:R30").setVerticalAlignment("middle");
  SpreadsheetApp.flush();
}

/* =========================
   COMPTEURS
========================= */

function countRegistrations_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();

  if (last < 2) return 0;

  return sheet.getRange(2, 2, last - 1, 1)
    .getDisplayValues()
    .flat()
    .filter(value => value.trim() !== "")
    .length;
}

function countParticipation_(answer) {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return 0;

  return sheet.getRange(2, 6, last - 1, 1)
    .getDisplayValues()
    .flat()
    .filter(value => value.trim().toLowerCase() === answer.toLowerCase())
    .length;
}

function countPresence_(status) {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return 0;

  return sheet.getRange(2, 8, last - 1, 1)
    .getDisplayValues()
    .flat()
    .filter(value => value.trim() === status)
    .length;
}

function countClicks_() {
  const sheet = getClicksSheet_();
  return Math.max(0, sheet.getLastRow() - 1);
}

/* =========================
   UTILITAIRES
========================= */

function clean_(value, maxLength) {
  return String(value == null ? "" : value)
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

function json_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
