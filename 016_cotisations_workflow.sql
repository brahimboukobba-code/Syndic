-- =====================================================================
-- 016_cotisations_workflow.sql
-- Workflow de déclaration / validation des cotisations.
--
-- Nouveau circuit :
--   a_payer  → (syndic ou trésorier coche)   → declaree
--   declaree → (trésorier valide + justif)   → paye
--   Le trésorier peut passer directement de a_payer à paye.
--
-- Ajoute les colonnes de traçabilité (qui a déclaré, qui a validé).
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

-- 1. Nouvelles colonnes de traçabilité
alter table public.cotisations
  add column if not exists declaree_par   uuid references public.utilisateurs(id) on delete set null,
  add column if not exists declaree_le    timestamptz,
  add column if not exists validee_par    uuid references public.utilisateurs(id) on delete set null,
  add column if not exists validee_le     timestamptz;

-- 2. Élargir la contrainte de statut pour inclure 'declaree'
alter table public.cotisations drop constraint if exists cotisations_statut_check;
alter table public.cotisations add constraint cotisations_statut_check
  check (statut = any (array['a_payer'::text, 'declaree'::text, 'paye'::text, 'retard'::text]));

-- 3. Le montant par défaut d'une cotisation est stocké sur l'immeuble
--    (montant fixe, modifiable au besoin)
alter table public.immeubles
  add column if not exists montant_cotisation_defaut numeric(10,2) default 0;

-- 4. Mettre à jour la contrainte qui exige une date_paiement quand payé
--    (on garde : payé => date_paiement non nulle)
-- (déjà en place via cotisations_check, on ne touche pas)

-- 5. Les policies INSERT/UPDATE existantes autorisent déjà syndic /
--    vice_syndic / tresorier — elles couvrent le nouveau workflow.
--    On s'assure juste qu'elles sont bien en place (idempotent).
drop policy if exists cotisations_insert on public.cotisations;
create policy cotisations_insert on public.cotisations
  for insert with check (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier'])
  );

drop policy if exists cotisations_update on public.cotisations;
create policy cotisations_update on public.cotisations
  for update
  using (app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier']))
  with check (app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier']));
