# Migrations SQL — Application Syndic

Schéma PostgreSQL complet pour l'application de gestion de syndic, conforme
à la loi 18-00 et au document fondateur (v1.1). Conçu pour **Supabase**.

## Contenu

| Fichier | Rôle |
|---------|------|
| `001_extensions.sql` | Extensions (pgcrypto, citext) + schéma `app` |
| `002_tables_identity.sql` | immeubles, logements, utilisateurs, user_roles, occupations |
| `003_tables_finance.sql` | exercices, cotisations, categories_depenses, depenses |
| `004_tables_projects.sql` | projets, devis, votes, commentaires |
| `005_tables_meetings.sql` | reunions, participations, mandats_syndic, annonces, reclamations, sondages |
| `006_tables_notif_audit.sql` | notifications, audit_log |
| `007_functions.sql` | Fonctions helpers de sécurité (is_member, has_role, scrutin_est_ouvert…) |
| `008_triggers_audit.sql` | Audit automatique de toutes les tables sensibles |
| `009_triggers_business.sql` | Règles métier (PV obligatoire, double validation, reçus auto) |
| `010_rls_policies.sql` | Row Level Security : contrôle d'accès par rôle (OWASP A01) |
| `011_storage_policies.sql` | Buckets de fichiers + policies + vue annuaire |
| `012_seed.sql` | Données de démonstration (1 immeuble, 5 logements) |

## Installation sur Supabase

### Option A — via l'éditeur SQL (le plus simple)

1. Créez un projet sur https://supabase.com (plan gratuit).
2. Ouvrez **SQL Editor**.
3. Copiez-collez le contenu de chaque fichier **dans l'ordre 001 → 012** et exécutez.
   (Un fichier à la fois, en respectant l'ordre des numéros.)

### Option B — via la CLI Supabase

```bash
# Placez les fichiers dans supabase/migrations/ en gardant leur préfixe numérique
supabase db push
```

## Après l'installation : créer le premier syndic

Les utilisateurs vivent dans `auth.users` (géré par Supabase Auth). Le tout
premier compte syndic se crée à la main :

1. **Authentication → Users → Add user** : saisissez l'e-mail du syndic.
   Copiez l'UUID généré.
2. Dans **SQL Editor**, exécutez (en remplaçant l'UUID) :

```sql
insert into public.utilisateurs (id, nom_complet, telephone, langue_preferee)
values ('UUID_DU_SYNDIC', 'Nom du syndic', '+212600000000', 'fr');

insert into public.user_roles (user_id, immeuble_id, role) values
  ('UUID_DU_SYNDIC', '11111111-1111-1111-1111-111111111111', 'syndic'),
  ('UUID_DU_SYNDIC', '11111111-1111-1111-1111-111111111111', 'proprietaire');

insert into public.mandats_syndic
  (immeuble_id, syndic_id, date_election, date_fin_mandat, pourcentage_obtenu, statut)
values
  ('11111111-1111-1111-1111-111111111111', 'UUID_DU_SYNDIC',
   current_date, current_date + interval '2 years', 80.00, 'en_cours');
```

Ensuite, tous les autres comptes (propriétaires, locataires, vice-syndic,
trésorier) se créent **depuis l'application** par le syndic.

## Sécurité — ce qui est garanti par la base

Ces règles sont testées et appliquées au niveau PostgreSQL, pas seulement
dans l'interface :

- Un **locataire ne peut pas voter** ni créer de dépense.
- Un **vote est immuable** une fois posé (pas de modification ni suppression).
- Le **journal d'audit est inviolable** : même le syndic ne peut ni le
  modifier ni le supprimer.
- Une **dépense au-dessus du seuil** exige la double signature syndic +
  vice-syndic (deux personnes distinctes) avant d'être validée.
- Une **AG ne peut être clôturée sans son PV** en pièce jointe.
- Tous les habitants **voient toutes les dépenses** (transparence Art. 32).

## Buckets de stockage

Six buckets privés sont créés : `pv`, `devis`, `factures`, `recus`,
`reclamations`, `reglement`. L'accès aux fichiers se fait par URLs signées
générées côté application. Limitez les types MIME (PDF/JPG/PNG) et la taille
(5 Mo) dans la configuration du bucket côté Supabase.

## Validé sur

PostgreSQL 16. Les 12 migrations s'exécutent sans erreur sur une base neuve,
et la logique métier + RLS a été testée fonctionnellement (14 tests).
