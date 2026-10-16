const form = document.querySelector("#registration-form");
const message = document.querySelector("#form-message");
const count = document.querySelector("#registration-count");
const scriptUrl = window.RJECI_CONFIG?.SCRIPT_URL || "";
const steps = [...document.querySelectorAll(".form-step")];
const indicators = [...document.querySelectorAll(".step")];
const connectors = [...document.querySelectorAll(".steps > i")];
const descriptions = [
  "Renseignez vos informations pour commencer.",
  "Indiquez simplement votre intention de participer.",
  "Vérifiez vos informations avant de confirmer."
];
let currentStep = 1;

function isConfigured() {
  return scriptUrl.startsWith("https://script.google.com/macros/s/") && scriptUrl.endsWith("/exec");
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `form-message ${type}`;
}

function clearMessage() {
  message.textContent = "";
  message.className = "form-message";
}

function fillSummary() {
  const values = Object.fromEntries(new FormData(form).entries());
  const labels = {
    nom: values.nom || "—",
    telephone: values.telephone || "—",
    email: values.email || "Non renseignée",
    ville: values.ville || "—",
    participation: values.participation === "Oui" ? "Participation confirmée" : values.participation === "Non" ? "Être informé(e)" : "—"
  };
  Object.entries(labels).forEach(([name, value]) => {
    document.querySelector(`[data-summary="${name}"]`).textContent = value;
  });
}

function showStep(step, shouldFocus = true) {
  currentStep = step;
  steps.forEach((panel) => {
    const active = Number(panel.dataset.step) === step;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  indicators.forEach((indicator) => indicator.classList.toggle("active", Number(indicator.dataset.indicator) === step));
  connectors.forEach((connector, index) => connector.classList.toggle("active", index < step - 1));
  document.querySelector("#step-description").textContent = descriptions[step - 1];
  if (step === 3) fillSummary();
  clearMessage();
  if (shouldFocus) document.querySelector(`.form-step[data-step="${step}"] input, .form-step[data-step="${step}"] select`)?.focus();
}

function validateStep(step) {
  const fields = [...document.querySelectorAll(`.form-step[data-step="${step}"] input[required], .form-step[data-step="${step}"] select[required]`)];
  return fields.every((field) => field.reportValidity());
}

async function loadCount() {
  if (!isConfigured()) {
    count.textContent = "—";
    return;
  }
  try {
    const response = await fetch(`${scriptUrl}?action=count`, { method: "GET", redirect: "follow" });
    const data = await response.json();
    count.textContent = data.success ? data.count : "—";
  } catch {
    count.textContent = "—";
  }
}

document.querySelectorAll(".next-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (validateStep(currentStep)) showStep(currentStep + 1);
  });
});
document.querySelectorAll(".previous-button").forEach((button) => button.addEventListener("click", () => showStep(currentStep - 1)));
document.querySelector(".edit-button").addEventListener("click", () => showStep(1));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateStep(3)) return;
  if (!isConfigured()) {
    showMessage("Le formulaire n’est pas encore connecté à la feuille d’inscriptions. Ajoutez l’URL Apps Script dans js/config.js.", "error");
    return;
  }
  const submitButton = document.querySelector("#submit-button");
  const originalLabel = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = "Envoi en cours…";
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.consentement = document.querySelector("#consent").checked ? "Oui" : "Non";
  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "L’enregistrement a échoué.");
    form.reset();
    showStep(1, false);
    showMessage("Merci ! Votre inscription a bien été enregistrée. Le RJECI vous contactera avec les informations utiles.", "success");
    await loadCount();
  } catch (error) {
    showMessage(`Impossible de confirmer l’inscription. ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalLabel;
  }
});

const dialog = document.querySelector("#poster-dialog");
document.querySelectorAll(".poster-trigger").forEach((button) => button.addEventListener("click", () => dialog.showModal()));
document.querySelector(".close-poster").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

loadCount();
