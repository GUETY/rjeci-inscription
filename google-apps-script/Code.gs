/**
 * RJECI — réception des inscriptions dans Google Sheets.
 * Dans Google Apps Script, collez ce code dans Code.gs.
 */
const SHEET_NAME = "Inscriptions";

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Date d'inscription", "Nom et prénoms", "Téléphone", "E-mail", "Ville", "Participation", "Consentement"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#651e2a").setFontColor("#ffffff");
    sheet.autoResizeColumns(1, 7);
  }
  return sheet;
}
function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : "";
  if (action === "count") {
    const sheet = getSheet_();
    const count = Math.max(0, sheet.getLastRow() - 1);
    return json_({ success: true, count: count });
  }
  return json_({ success: true, message: "Service RJECI actif." });
}
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const nom = clean_(data.nom, 120);
    const telephone = clean_(data.telephone, 30);
    const email = clean_(data.email, 160);
    const ville = clean_(data.ville, 80);
    const participation = clean_(data.participation, 10);
    const consentement = clean_(data.consentement, 5);
    if (!nom || !telephone || !ville || !["Oui", "Non"].includes(participation) || consentement !== "Oui") {
      return json_({ success: false, message: "Veuillez vérifier les champs obligatoires." });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ success: false, message: "L'adresse e-mail semble incorrecte." });
    }
    const sheet = getSheet_();
    // Évite les doublons évidents sur le numéro de téléphone.
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const phones = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues().flat()
        .map(v => v.replace(/\s+/g, "").replace(/[()-]/g, ""));
      const normalizedPhone = telephone.replace(/\s+/g, "").replace(/[()-]/g, "");
      if (phones.includes(normalizedPhone)) {
        return json_({ success: false, message: "Ce numéro est déjà inscrit. Contactez l'organisation si vous devez modifier vos informations." });
      }
    }
    sheet.appendRow([new Date(), nom, telephone, email, ville, participation, consentement]);
    return json_({ success: true, message: "Inscription enregistrée.", count: Math.max(0, sheet.getLastRow() - 1) });
  } catch (err) {
    return json_({ success: false, message: "Erreur lors de l'enregistrement. Réessayez plus tard." });
  }
}
function clean_(value, maxLength) {
  return String(value == null ? "" : value).trim().replace(/[<>]/g, "").slice(0, maxLength);
}
function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
