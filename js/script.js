const form = document.querySelector("#registration-form");
const message = document.querySelector("#form-message");
const scriptUrl = window.RJECI_CONFIG?.SCRIPT_URL || "";
const steps = [...document.querySelectorAll(".form-step")];
const progress = [...document.querySelectorAll(".progress i")];
const titles = ["Faisons connaissance", "Vos coordonnées", "Dernière étape"];
let currentStep = 1;

function configured() {
  return scriptUrl.startsWith("https://script.google.com/macros/s/") && scriptUrl.endsWith("/exec");
}
function showMessage(text, type) {
  message.textContent = text;
  message.className = `form-message ${type}`;
}
function showStep(step) {
  currentStep = step;
  steps.forEach((panel) => panel.classList.toggle("active", Number(panel.dataset.step) === step));
  progress.forEach((line, index) => line.classList.toggle("active", index < step));
  document.querySelector("#step-label").textContent = `ÉTAPE ${step} SUR 3`;
  document.querySelector("#step-title").textContent = titles[step - 1];
  document.querySelector("#step-number").textContent = `0${step}`;
  message.className = "form-message";
  document.querySelector(`.form-step[data-step="${step}"] input, .form-step[data-step="${step}"] select`)?.focus();
}
function validateStep(step) {
  const fields = [...document.querySelectorAll(`.form-step[data-step="${step}"] input[required], .form-step[data-step="${step}"] select[required]`)];
  return fields.every((field) => field.reportValidity());
}

document.querySelectorAll(".next[type=button]").forEach((button) => {
  button.addEventListener("click", () => { if (validateStep(currentStep)) showStep(currentStep + 1); });
});
document.querySelectorAll(".back").forEach((button) => button.addEventListener("click", () => showStep(currentStep - 1)));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateStep(3)) return;
  if (!configured()) {
    showMessage("Le formulaire est prêt. Il manque seulement l’URL Google Apps Script pour enregistrer les inscriptions.", "error");
    return;
  }
  const submit = document.querySelector("#submit-button");
  const original = submit.innerHTML;
  submit.disabled = true;
  submit.textContent = "Envoi en cours…";
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.consentement = document.querySelector("#consent").checked ? "Oui" : "Non";
  try {
    const response = await fetch(scriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), redirect: "follow" });
    const result = await response.json();
    if (!result.success) throw new Error(result.message || "L’enregistrement a échoué.");
    form.reset();
    showStep(1);
    showMessage("Votre inscription est confirmée. Merci de rejoindre le RJECI !", "success");
  } catch (error) {
    showMessage(`Impossible de confirmer l’inscription : ${error.message}`, "error");
  } finally {
    submit.disabled = false;
    submit.innerHTML = original;
  }
});

const dialog = document.querySelector("#poster-dialog");
document.querySelectorAll(".show-poster, .poster-button").forEach((button) => button.addEventListener("click", () => dialog.showModal()));
document.querySelector(".close-poster").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
