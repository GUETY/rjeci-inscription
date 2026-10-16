const form = document.querySelector("#registration-form");
const submitButton = document.querySelector("#submit-button");
const message = document.querySelector("#form-message");
const count = document.querySelector("#registration-count");
const scriptUrl = window.RJECI_CONFIG?.SCRIPT_URL || "";

function showMessage(text, type) {
  message.textContent = text;
  message.className = `form-message ${type}`;
}
function isConfigured() {
  return scriptUrl.startsWith("https://script.google.com/macros/s/") && scriptUrl.endsWith("/exec");
}
async function loadCount() {
  if (!isConfigured()) {
    count.textContent = "—";
    return;
  }
  try {
    const response = await fetch(`${scriptUrl}?action=count`, { method: "GET", redirect: "follow" });
    const data = await response.json();
    if (data.success) count.textContent = data.count;
  } catch (error) {
    count.textContent = "—";
    console.warn("Impossible de charger le compteur :", error);
  }
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "form-message";
  if (!form.reportValidity()) return;
  if (!isConfigured()) {
    showMessage("Le formulaire n'est pas encore connecté à Google Sheets. Suivez le guide INSTALLATION.md pour configurer l'URL Apps Script.", "error");
    return;
  }
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.consentement = document.querySelector("#consent").checked ? "Oui" : "Non";
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Envoi en cours…";
  try {
    // Apps Script reçoit le POST en texte brut pour éviter une requête CORS preflight.
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "L'enregistrement a échoué.");
    form.reset();
    showMessage("Merci ! Votre inscription a bien été enregistrée. Le RJECI vous remercie pour votre intérêt.", "success");
    await loadCount();
  } catch (error) {
    showMessage("Impossible de confirmer l'enregistrement. Vérifiez votre connexion puis réessayez. Si le problème persiste, contactez l'organisateur. Détail : " + error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Envoyer mon inscription";
  }
});
loadCount();
