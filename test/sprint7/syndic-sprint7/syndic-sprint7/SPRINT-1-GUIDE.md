# Sprint 1 — Ossature de l'application Syndic

Ce dossier contient l'ossature complète de l'application : connexion par
magic-link, navigation adaptée au rôle, bilingue FR/AR, dark mode et PWA.

## Ce que fait l'app à ce stade

- Écran de connexion : l'habitant saisit son e-mail, reçoit un lien, clique, il est connecté (aucun mot de passe).
- Une fois connecté, l'app charge son profil, ses rôles et son immeuble depuis Supabase.
- La navigation s'affiche selon le rôle. Le tableau de bord montre le nom et le(s) rôle(s).
- Les autres pages (Finances, Projets, Réunions…) sont des écrans « à venir » qu'on remplira aux sprints suivants.
- Bouton de langue (FR / ع) et bouton de thème (clair / sombre).

---

## Étape 1 — Placer les fichiers

Copiez **tout le contenu** de ce dossier dans `C:\Users\brahi\Desktop\Syndic`.
Vous devez retrouver à la racine : `package.json`, `index.html`, le dossier `src`, etc.

## Étape 2 — Installer les dépendances

Ouvrez PowerShell **dans le dossier du projet** :

```powershell
cd C:\Users\brahi\Desktop\Syndic
npm install
```

Cela crée le dossier `node_modules` (peut prendre 1-2 minutes).

## Étape 3 — Configurer vos clés Supabase

Copiez le modèle en fichier réel :

```powershell
Copy-Item .env.local.example .env.local
```

Ouvrez `.env.local` dans VS Code et remplissez avec **vos** valeurs
(récupérées dans Supabase) :

```
VITE_SUPABASE_URL=https://VOTRE-REFERENCE-ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VOTRE_CLE
```

Le fichier `.env.local` ne sera jamais envoyé sur GitHub (il est dans `.gitignore`).

## Étape 4 — Lancer en local

```powershell
npm run dev
```

Ouvrez l'adresse affichée (http://localhost:5173). Vous devez voir
l'écran de connexion. Pour l'instant, **ne vous connectez pas encore** :
il faut d'abord créer le compte syndic (étape 6).

## Étape 5 — Premier envoi vers GitHub

Toujours dans PowerShell, dans le dossier du projet :

```powershell
git init
git add .
git commit -m "Sprint 1 : ossature de l'application"
git branch -M main
git remote add origin https://github.com/brahimboukobba-code/Syndic.git
git push -u origin main
```

Rafraîchissez la page GitHub de votre dépôt : le code doit apparaître.

## Étape 6 — Créer votre compte syndic de test

### 6a. Créer l'identité de connexion

Dans Supabase : **Authentication → Users → Add user → Create new user**.
- Email : votre adresse perso (pour le test)
- Cochez **Auto Confirm User**
- Cliquez **Create user**

Puis cliquez sur l'utilisateur créé et **copiez son UUID** (User UID).

### 6b. Lui donner le rôle, le logement et le mandat

Dans **SQL Editor**, collez ce script en remplaçant `VOTRE_UUID` par
l'UUID copié (gardez les guillemets), puis cliquez **Run** :

```sql
-- Profil
insert into public.utilisateurs (id, nom_complet, telephone, langue_preferee)
values ('VOTRE_UUID', 'Votre Nom', '+212600000000', 'fr')
on conflict (id) do nothing;

-- Rôles : syndic + propriétaire (pour pouvoir voter)
insert into public.user_roles (user_id, immeuble_id, role) values
  ('VOTRE_UUID', '11111111-1111-1111-1111-111111111111', 'syndic'),
  ('VOTRE_UUID', '11111111-1111-1111-1111-111111111111', 'proprietaire')
on conflict do nothing;

-- Rattachement à un logement (Apt 1 du jeu de démo)
insert into public.occupations (logement_id, user_id, type)
values ('22222222-0000-0000-0000-000000000001', 'VOTRE_UUID', 'proprietaire')
on conflict do nothing;

-- Mandat de 2 ans en cours
insert into public.mandats_syndic
  (immeuble_id, syndic_id, date_election, date_fin_mandat, pourcentage_obtenu, statut)
values
  ('11111111-1111-1111-1111-111111111111', 'VOTRE_UUID',
   current_date - interval '6 months', current_date + interval '18 months', 80.00, 'en_cours')
on conflict do nothing;
```

## Étape 7 — Tester la connexion

1. Sur http://localhost:5173, saisissez l'adresse e-mail du compte créé.
2. Cliquez **Recevoir le lien**.
3. Ouvrez l'e-mail de Supabase et cliquez sur le lien.
4. Vous êtes redirigé vers l'app, connecté, avec le tableau de bord
   affichant votre nom et le rôle « Syndic » (+ « Propriétaire »).

> Si l'e-mail n'arrive pas : Supabase limite les e-mails en mode gratuit.
> Vérifiez les indésirables. Au besoin, dans Authentication → Users,
> vous pouvez aussi générer un lien manuellement (bouton « ... » → Send magic link).

---

## Test de fin de Sprint 1 — checklist

- [ ] `npm run dev` démarre sans erreur
- [ ] L'écran de connexion s'affiche en français
- [ ] Le bouton « ع » bascule l'interface en arabe (de droite à gauche)
- [ ] Le bouton thème bascule clair / sombre
- [ ] Après connexion, le tableau de bord affiche votre nom et votre rôle
- [ ] La navigation latérale (ou la barre du bas sur mobile) est visible
- [ ] Le code est bien sur GitHub

Quand tout est coché, le Sprint 1 est validé et on passe au Sprint 2
(transparence financière : dépenses, cotisations, historique).

## En cas de souci

- **Page blanche / erreur Supabase dans la console** : vérifiez `.env.local`
  (URL et clé correctes, pas d'espace, clé qui commence par `sb_publishable_`).
- **« Aucune copropriété associée »** : le compte est connecté mais l'étape 6b
  n'a pas été faite ou l'UUID est incorrect.
- **L'e-mail magic-link n'arrive pas** : voir la note de l'étape 7.
