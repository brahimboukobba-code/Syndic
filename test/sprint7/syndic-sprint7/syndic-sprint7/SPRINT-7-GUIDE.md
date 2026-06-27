# Sprint 7 — PWA, reçus PDF et déploiement (final)

Dernier sprint. Au programme : application installable (PWA), reçus PDF
automatiques, page profil avec changement de mot de passe, et surtout la
**mise en ligne sur Vercel**.

---

## Étape 1 — Remplacer les fichiers

Décompressez l'archive dans `C:\Users\brahi\Desktop\Syndic`, en écrasant.
Votre `.env.local` reste intact.

Nouveautés :
- `src/lib/receipt.js` — génération du reçu PDF
- `src/pages/Profile.jsx` — profil + changement de mot de passe
- `src/components/InstallPrompt.jsx` — bannière d'installation
- `vite.config.js` — configuration PWA (service worker)
- `src/components/ContributionList.jsx` — génère le reçu au paiement

**Cette fois, il faut réinstaller les dépendances** (on a ajouté jsPDF et
le plugin PWA) :

```powershell
cd C:\Users\brahi\Desktop\Syndic
npm install
npm run dev
```

---

## Étape 2 — Tester en local

### Reçus PDF
- [ ] Module Finances → onglet Cotisations → « Marquer payée »
- [ ] Un reçu PDF est généré ; après quelques secondes, un lien
      « Voir le justificatif » apparaît sur la cotisation payée
- [ ] Le reçu s'ouvre : en-tête bleu, n° de reçu, logement, période, montant

### Profil
- [ ] Cliquer sur votre nom (en bas de la barre latérale) ouvre « Mon profil »
- [ ] Changer le mot de passe fonctionne (au moins 6 caractères)

### PWA (installation)
- [ ] En local, l'install peut ne pas se proposer (elle marche surtout en
      HTTPS, donc une fois déployée). On la testera après le déploiement.

---

## Étape 3 — Mettre en ligne sur Vercel

### 3a. Pousser le code à jour sur GitHub

```powershell
git add .
git commit -m "Sprint 7 : PWA, recus PDF, profil"
git push
```

### 3b. Connecter Vercel à votre dépôt

1. Allez sur **https://vercel.com** et connectez-vous **avec GitHub**
   (utilisez l'adresse dédiée au syndic si vous en avez une).
2. Cliquez **Add New… → Project**.
3. Vercel liste vos dépôts GitHub : choisissez **Syndic** → **Import**.
4. Vercel détecte automatiquement **Vite**. Laissez les réglages par défaut
   (Build Command `npm run build`, Output `dist`).

### 3c. Ajouter les variables d'environnement (CRUCIAL)

Avant de déployer, dans l'écran d'import, dépliez **Environment Variables**
et ajoutez **exactement** ces deux variables (les mêmes que votre `.env.local`) :

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://VOTRE-REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_VOTRE_CLE` |

> Sans ces variables, l'app déployée ne pourra pas se connecter à Supabase.

### 3d. Déployer

Cliquez **Deploy**. Au bout d'1–2 minutes, vous obtenez une URL du type
`https://syndic-xxxx.vercel.app`. C'est votre application en ligne !

### 3e. Autoriser cette URL dans Supabase

Pour que la connexion fonctionne sur le domaine déployé :

1. Supabase → **Authentication → URL Configuration**
2. Dans **Site URL**, mettez votre URL Vercel
   (`https://syndic-xxxx.vercel.app`)
3. Dans **Redirect URLs**, ajoutez la même URL.

---

## Étape 4 — Tester l'app en ligne

- [ ] Ouvrez l'URL Vercel sur votre ordinateur : la page de connexion s'affiche
- [ ] Connectez-vous avec votre e-mail + mot de passe
- [ ] Ouvrez la **même URL sur votre téléphone** : le navigateur propose
      « Ajouter à l'écran d'accueil » (ou la bannière d'installation apparaît)
- [ ] Installez : l'icône Syndic apparaît sur votre téléphone comme une vraie app
- [ ] Lancez-la depuis l'icône : elle s'ouvre en plein écran, sans barre de navigateur

---

## Récapitulatif : votre application est en production

À ce stade, vous avez :
- une base de données sécurisée (Supabase, gratuit) ;
- une application en ligne (Vercel, gratuit) ;
- installable sur mobile comme une vraie app ;
- avec toutes les fonctionnalités : finances transparentes, votes, AG,
  réclamations, notifications temps réel, reçus PDF.

Les habitants y accèdent via l'URL Vercel ou l'icône installée. Le syndic
crée leurs comptes depuis Supabase et leur communique e-mail + mot de passe.

---

## En cas de souci

- **Page blanche en ligne** : variables d'environnement manquantes sur
  Vercel (étape 3c). Ajoutez-les puis redéployez (Deployments → … → Redeploy).
- **« Connexion impossible » en ligne mais OK en local** : ajoutez l'URL
  Vercel dans Supabase → Authentication → URL Configuration (étape 3e).
- **Le reçu PDF ne se génère pas** : vérifiez le bucket `recus`
  (Supabase → Storage) et la console (F12). Le paiement est enregistré même
  si le PDF échoue.
- **L'installation PWA ne se propose pas** : elle nécessite HTTPS (donc le
  domaine Vercel, pas localhost) et, sur iPhone, se fait via Safari →
  Partager → « Sur l'écran d'accueil ».
