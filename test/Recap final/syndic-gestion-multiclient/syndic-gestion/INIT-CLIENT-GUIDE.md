# Installer Syndic chez un nouveau client — procédure complète

Modèle : **un environnement par client** (Supabase + Vercel dédiés, gratuits).
GitHub reste **partagé** (un seul dépôt pour tous les clients). La gestion
des comptes se fait via le script `gestion.mjs`, sans rien exposer dans l'app.

---

## Vue d'ensemble (≈ 25 min par client)

1. Créer un projet Supabase neuf
2. Exécuter les migrations (structure de la base)
3. Initialiser les données du client (immeuble, logements, admin/syndic)
4. Déployer le front sur Vercel
5. Remettre les accès au client

---

## 1. Nouveau projet Supabase

- supabase.com → New project → nommez-le (ex. « syndic-client-X »)
- Plan Free. Notez le mot de passe de la base.
- Récupérez : Project URL, clé publishable, clé secrète, Reference ID.
- Authentication → Providers → Email : décochez « Confirm email » (pour
  pouvoir créer des comptes sans confirmation par e-mail).

## 2. Migrations (structure de la base)

Dans le SQL Editor, exécutez **dans l'ordre** :
`001` → … → `013_notifications_function.sql` → `014_role_admin.sql`

La base est alors prête, mais vide.

## 3. Initialiser les données du client

Deux façons, au choix :

### Option A — Script init-client (rapide, tout d'un coup)
Ouvrez `scripts/init-client.mjs`, personnalisez la section `CONFIG`
(nom immeuble, nombre de logements, e-mail/mot de passe admin et syndic),
puis :
```powershell
cd C:\Users\brahi\Desktop\Syndic
$env:SUPABASE_URL = "https://NOUVELLE-REF.supabase.co"
$env:SUPABASE_SERVICE_KEY = "sb_secret_CLE_DU_NOUVEAU_PROJET"
node scripts/init-client.mjs
```

### Option B — Console de gestion (interactif, pas à pas)
```powershell
$env:SUPABASE_URL = "https://NOUVELLE-REF.supabase.co"
$env:SUPABASE_SERVICE_KEY = "sb_secret_CLE_DU_NOUVEAU_PROJET"
node scripts/gestion.mjs
```
Puis : action 2 (ajouter l'immeuble), action 4 (ajouter les comptes).

Dans les deux cas, fermez le terminal après (la clé secrète ne doit pas
rester en mémoire).

## 4. Déployer le front sur Vercel

- Vercel → Add New → Project → importez le dépôt GitHub `Syndic` (le même
  pour tous les clients).
- Environment Variables → mettez les clés du **nouveau** Supabase :
  - `VITE_SUPABASE_URL` = URL du nouveau projet
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = clé publishable du nouveau projet
- Deploy → vous obtenez une URL dédiée (ex. `syndic-client-x.vercel.app`).
- Dans Supabase (nouveau projet) → Authentication → URL Configuration,
  ajoutez cette URL Vercel (Site URL + Redirect URLs).

> Le code est identique pour tous les clients : seules les variables
> d'environnement Vercel changent et « branchent » chaque déploiement sur
> le bon Supabase.

## 5. Remettre au client

Donnez au syndic :
- l'URL de son app (Vercel),
- son e-mail + mot de passe initial,
- l'invitation à changer son mot de passe au 1er accès (page « Mon profil »).

Pour ajouter/modifier des comptes ensuite, **vous** utilisez `gestion.mjs`
sur ce client (le syndic vous sollicite, ou vous gérez en amont).

---

## Tableau récapitulatif : partagé vs dédié

| Élément | Partagé / Dédié |
|---------|-----------------|
| Code (dépôt GitHub) | **Partagé** — un seul pour tous les clients |
| Scripts (gestion, init-client) | **Partagés** — les mêmes, on change les variables |
| Projet Supabase | **Dédié** — un par client |
| Déploiement Vercel | **Dédié** — un par client |
| Variables d'env Vercel | **Dédiées** — pointent sur le bon Supabase |
| Données (immeuble, comptes) | **Dédiées** — isolées par client |
| Compte admin/syndic | **Dédié** — e-mail que vous gérez |

---

## Coût et limites

- **Gratuit** tant que vous ne dépassez pas les quotas Supabase/Vercel.
- Supabase Free autorise **2 projets actifs** simultanés. Au 3ᵉ client :
  soit passer un projet en payant (~25 $/mois), soit envisager plus tard
  le modèle « multi-immeubles dans un seul Supabase » (moins cher, plus de
  développement).
- Pas de carte bancaire requise pour rester sur les plans gratuits.

---

## Checklist express (à cocher par client)

- [ ] Projet Supabase créé, « Confirm email » décoché
- [ ] Migrations 001 → 014 exécutées
- [ ] Données initialisées (init-client ou gestion)
- [ ] Front déployé sur Vercel avec les bonnes variables
- [ ] URL Vercel ajoutée dans Supabase (Authentication → URL Configuration)
- [ ] Identifiants remis au client
