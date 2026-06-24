-- =====================================================================
-- 011_storage_policies.sql
-- Buckets Supabase Storage + policies d'accès aux fichiers.
-- Buckets : pv, devis, factures, recus, reclamations, reglement
-- Tous PRIVÉS : l'accès passe par des URLs signées générées côté app.
-- =====================================================================

-- Création des buckets (privés). Idempotent.
insert into storage.buckets (id, name, public)
values
  ('pv',           'pv',           false),
  ('devis',        'devis',        false),
  ('factures',     'factures',     false),
  ('recus',        'recus',        false),
  ('reclamations', 'reclamations', false),
  ('reglement',    'reglement',    false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Helper : l'utilisateur courant est-il membre d'au moins un immeuble ?
-- (suffisant pour la lecture des pièces ; le détail par immeuble est
--  porté par la ligne métier qui référence le fichier)
-- ---------------------------------------------------------------------
create or replace function app.is_any_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.date_fin is null)
      or exists (select 1 from public.occupations o   where o.user_id  = auth.uid() and o.date_fin  is null);
$$;

-- ---------------------------------------------------------------------
-- LECTURE : tout membre peut lire les pièces (transparence Art. 32).
-- ---------------------------------------------------------------------
create policy storage_read_members on storage.objects
  for select
  using (
    bucket_id in ('pv','devis','factures','recus','reclamations','reglement')
    and app.is_any_member()
  );

-- ---------------------------------------------------------------------
-- ÉCRITURE par bucket :
--   pv, factures, reglement  -> syndic / vice / trésorier
--   recus                    -> syndic / vice / trésorier
--   devis                    -> tout membre (proposition de devis)
--   reclamations             -> tout membre (photo de sa réclamation)
-- ---------------------------------------------------------------------
create policy storage_write_gestion on storage.objects
  for insert
  with check (
    bucket_id in ('pv','factures','recus','reglement')
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.date_fin is null
        and ur.role in ('syndic','vice_syndic','tresorier')
    )
  );

create policy storage_write_devis on storage.objects
  for insert
  with check (bucket_id = 'devis' and app.is_any_member());

create policy storage_write_reclamations on storage.objects
  for insert
  with check (bucket_id = 'reclamations' and app.is_any_member());

-- ---------------------------------------------------------------------
-- Mise à jour / suppression de fichiers : réservée à la gestion,
-- et jamais sur les pièces justificatives déjà liées (immuabilité).
-- On autorise uniquement le remplacement dans 'reglement' (document vivant).
-- ---------------------------------------------------------------------
create policy storage_update_reglement on storage.objects
  for update
  using (
    bucket_id = 'reglement'
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.date_fin is null
        and ur.role in ('syndic','vice_syndic')
    )
  );

-- =====================================================================
-- Vue "annuaire" : profils sans données sensibles (téléphone masqué)
-- pour l'affichage aux autres habitants.
-- =====================================================================
create or replace view public.annuaire as
  select id, nom_complet, langue_preferee, statut
  from public.utilisateurs;

comment on view public.annuaire is 'Profils publics aux membres, sans téléphone (donnée personnelle)';

-- la vue hérite de la RLS de utilisateurs via security_invoker
alter view public.annuaire set (security_invoker = true);
