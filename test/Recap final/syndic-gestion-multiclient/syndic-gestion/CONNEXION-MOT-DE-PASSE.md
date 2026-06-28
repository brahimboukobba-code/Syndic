# Connexion par e-mail + mot de passe

La page de connexion utilise désormais un **e-mail et un mot de passe**
(plus de lien magique par e-mail). Plus simple et plus rapide pour les
habitants.

---

## Étape 1 — Remplacer les fichiers

Décompressez l'archive dans `C:\Users\brahi\Desktop\Syndic`, en écrasant.
Votre `.env.local` reste intact.

Fichiers modifiés :
- `src/pages/Login.jsx` — connexion e-mail + mot de passe (avec œil
  pour afficher/masquer le mot de passe)
- `src/i18n/fr.json` et `src/i18n/ar.json` — textes de connexion

Aucune nouvelle dépendance, aucun SQL. Relancez simplement `npm run dev`.

---

## Étape 2 — Définir un mot de passe pour VOTRE compte syndic

Votre compte syndic a été créé en mode « lien magique » et n'a peut-être
pas encore de mot de passe. Pour lui en donner un :

**Option A — depuis Supabase (recommandé) :**
1. Supabase → **Authentication → Users**
2. Cliquez sur votre utilisateur (le syndic)
3. Bouton **« Reset password »** ou menu **… → Send password recovery**,
   OU plus direct : **… → Update user** et définissez un mot de passe.

   Selon la version de l'interface, vous verrez soit un champ mot de passe
   directement, soit un bouton qui envoie un e-mail de définition. Le plus
   simple est le champ « Password » dans l'édition de l'utilisateur.

**Option B — vérifier/activer la connexion par mot de passe :**
Dans Supabase → **Authentication → Providers → Email**, assurez-vous que :
- **« Enable Email provider »** est activé
- **« Confirm email »** peut être désactivé pour simplifier (sinon chaque
  nouveau compte doit confirmer son e-mail avant de pouvoir se connecter)

---

## Étape 3 — Créer les comptes des habitants (avec mot de passe)

C'est le syndic qui crée chaque compte. Pour chaque habitant :

1. Supabase → **Authentication → Users → Add user → Create new user**
   - **Email** : l'e-mail de l'habitant
   - **Password** : définissez un mot de passe initial (ex. un mot simple
     que vous lui communiquerez)
   - Cochez **« Auto Confirm User »** (pour qu'il puisse se connecter tout de suite)
   - **Create user**, puis copiez l'**UUID**.

2. Dans **SQL Editor**, créez son profil/rôle/logement (comme pour le
   second compte de test, fichier `SPRINT-6-SECOND-COMPTE.sql`, en adaptant
   le rôle et l'appartement).

3. Communiquez à l'habitant son **e-mail + mot de passe initial**
   (WhatsApp, en personne…). Il pourra le changer ensuite.

---

## Test

- [ ] Définir un mot de passe pour le compte syndic (étape 2)
- [ ] Sur l'app, la page de connexion affiche **E-mail** + **Mot de passe**
- [ ] Se connecter avec l'e-mail et le mot de passe → on entre dans l'app
- [ ] Un mauvais mot de passe affiche « E-mail ou mot de passe incorrect »
- [ ] L'œil affiche / masque le mot de passe
- [ ] En arabe (ع), la page passe en RTL

---

## Notes

- **Sécurité** : le message d'erreur ne précise jamais si c'est l'e-mail
  ou le mot de passe qui est faux — c'est volontaire (on n'aide pas un
  attaquant à deviner quels e-mails existent).
- **Mot de passe oublié** : pas de lien pour l'instant. En cas d'oubli, le
  syndic réinitialise le mot de passe depuis Supabase (Authentication →
  Users → l'utilisateur → Update/Reset password). On pourra ajouter un
  lien « Mot de passe oublié » plus tard si besoin.
- **« Confirm email »** : si vous le laissez activé dans Supabase, pensez à
  cocher « Auto Confirm User » à chaque création, sinon l'habitant devra
  confirmer son e-mail avant de pouvoir se connecter.
