# Projet d'inscription RJECI

Formulaire HTML/CSS/JavaScript avec Google Sheets comme stockage, via Google Apps Script.

## Fichiers
- `index.html` : page d'inscription.
- `css/style.css` : design responsive bordeaux/crème.
- `js/config.js` : URL du backend à renseigner.
- `js/script.js` : validation, envoi et compteur.
- `google-apps-script/Code.gs` : backend Google Sheets.

## Étape 1 — Créer la feuille de réponses
1. Connectez-vous au compte Google qui gérera les inscriptions.
2. Ouvrez https://sheets.google.com et créez une feuille nommée `Inscriptions RJECI`.
3. Dans cette feuille, ouvrez **Extensions > Apps Script**.
4. Remplacez le contenu de `Code.gs` par le contenu du fichier `google-apps-script/Code.gs`.
5. Enregistrez le projet.

Le script crée automatiquement l'onglet `Inscriptions` et ses colonnes à la première requête.

## Étape 2 — Déployer Apps Script
1. Dans Apps Script, cliquez **Déployer > Nouveau déploiement**.
2. Cliquez sur la roue/choisissez **Application Web**.
3. Exécuter en tant que : **Moi**.
4. Qui a accès : **Tout le monde** (nécessaire pour permettre aux visiteurs d'envoyer le formulaire).
5. Cliquez **Déployer**, autorisez les accès demandés et copiez l'URL se terminant par `/exec`.

Attention : le script sera accessible publiquement comme endpoint. Ne mettez aucune donnée confidentielle dans le code. Les inscriptions sont publiques à travers le formulaire; l'accès au tableau Google Sheets doit rester limité aux organisateurs. Testez avec quelques fausses données avant de diffuser le lien. Selon les paramètres de sécurité du compte Google, l'option « Tout le monde » peut être indisponible.

## Étape 3 — Connecter le formulaire
Ouvrez `js/config.js` et remplacez :
`COLLER_ICI_URL_APPLICATION_WEB_APPS_SCRIPT`
par l'URL `/exec` copiée. Exemple de format (ceci n'est pas une URL réelle) :
`https://script.google.com/macros/s/IDENTIFIANT_DU_DEPLOIEMENT/exec`

## Étape 4 — Tester en local
Ne double-cliquez pas nécessairement sur `index.html` si votre navigateur bloque les requêtes locales. Lancez un serveur local :
- Avec Python installé : ouvrez un terminal dans le dossier du projet et exécutez `python -m http.server 8000`
- Ouvrez ensuite http://localhost:8000
- Remplissez le formulaire avec un numéro de test.
- Vérifiez que la ligne apparaît dans Google Sheets et que le compteur augmente.
- Vérifiez qu'un second envoi avec le même numéro est refusé.

Le navigateur peut afficher un message de confirmation générique même si le réseau a un comportement inattendu. Vérifiez toujours que la ligne est bien dans la feuille avant d'annoncer que le test fonctionne.

## Étape 5 — Mise en ligne
Publiez le dossier du site sur un hébergement statique (par exemple GitHub Pages, Netlify ou votre hébergement web). Conservez l'URL Apps Script dans `js/config.js`. Testez à nouveau depuis le site en ligne.

## Données collectées
Nom et prénoms, téléphone/WhatsApp, e-mail facultatif, ville, réponse de participation et consentement. Collectez uniquement les informations utiles. Informez les inscrits de l'usage de leurs coordonnées et ne partagez pas la feuille avec le public.

## Limites à connaître
- Le compteur affiche le nombre de réponses enregistrées, pas le nombre de personnes ayant confirmé « Oui ». On pourra ajouter deux compteurs (tous les formulaires et participations confirmées) si nécessaire.
- Le script bloque les doublons évidents sur le téléphone, mais ce n'est pas un mécanisme anti-fraude avancé.
- Le formulaire ne garantit pas l'envoi d'un e-mail de confirmation. La confirmation actuelle est affichée sur la page. Un e-mail automatique nécessiterait une configuration supplémentaire et une adresse valide.
- La date de la formation n'est pas affichée, car celle de l'affiche fournie (24 octobre 2025) est passée. Mettez la nouvelle date une fois confirmée.
