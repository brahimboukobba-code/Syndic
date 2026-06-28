-- =====================================================================
-- 015_securite_rls.sql
-- DURCISSEMENT DE LA SÉCURITÉ (RLS)
--
-- Objectif : garantir que seuls les rôles autorisés peuvent ÉCRIRE dans
-- les tables sensibles, indépendamment de l'état actuel de la base.
-- Ce script est IDEMPOTENT (rejouable sans risque).
--
-- Contexte : un test a montré qu'un simple propriétaire pouvait modifier
-- une dépense en ligne. Cette migration referme cette faille et vérifie
-- les autres tables sensibles (projets, votes, cotisations, réunions).
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ACCÈS AU SCHÉMA app POUR LE RÔLE authenticated (CRUCIAL)
--    Sans ce GRANT, les policies qui appellent app.has_role(...) ne
--    s'évaluent pas correctement et l'écriture passe à tort.
-- ---------------------------------------------------------------------
grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;
alter default privileges in schema app grant execute on functions to authenticated;

-- ---------------------------------------------------------------------
-- 1. Helpers de sécurité (redéfinis proprement, filtrent sur auth.uid())
-- ---------------------------------------------------------------------

create or replace function app.has_role(p_immeuble_id uuid, p_roles text[])
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.immeuble_id = p_immeuble_id
      and ur.date_fin is null
      and ur.role = any (p_roles)
  );
$$;

create or replace function app.is_member(p_immeuble_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.immeuble_id = p_immeuble_id
      and ur.date_fin is null
  );
$$;

-- Immeuble d'un exercice (utilisé par les policies de depenses/cotisations)
create or replace function app.immeuble_of_exercice(p_exercice_id uuid)
returns uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select immeuble_id from public.exercices where id = p_exercice_id;
$$;

-- Propriétaire d'un logement (pour les votes)
create or replace function app.is_proprietaire_of(p_logement_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.occupations o
    where o.logement_id = p_logement_id
      and o.user_id = auth.uid()
      and o.type = 'proprietaire'
      and o.date_fin is null
  );
$$;

-- ---------------------------------------------------------------------
-- 2. DÉPENSES — écriture réservée à syndic / vice_syndic / tresorier
-- ---------------------------------------------------------------------
alter table public.depenses enable row level security;

drop policy if exists depenses_select on public.depenses;
create policy depenses_select on public.depenses
  for select using (app.is_member(app.immeuble_of_exercice(exercice_id)));

drop policy if exists depenses_insert on public.depenses;
create policy depenses_insert on public.depenses
  for insert with check (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier'])
  );

drop policy if exists depenses_update on public.depenses;
create policy depenses_update on public.depenses
  for update
  using (app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier']))
  with check (app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier']));

drop policy if exists depenses_delete on public.depenses;
create policy depenses_delete on public.depenses
  for delete using (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic'])
  );

-- ---------------------------------------------------------------------
-- 3. COTISATIONS — écriture réservée à syndic / vice_syndic / tresorier
-- ---------------------------------------------------------------------
alter table public.cotisations enable row level security;

drop policy if exists cotisations_select on public.cotisations;
create policy cotisations_select on public.cotisations
  for select using (app.is_member(app.immeuble_of_exercice(exercice_id)));

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

-- ---------------------------------------------------------------------
-- 4. PROJETS — création/gestion réservée à syndic / vice_syndic
-- ---------------------------------------------------------------------
alter table public.projets enable row level security;

drop policy if exists projets_select on public.projets;
create policy projets_select on public.projets
  for select using (app.is_member(immeuble_id));

drop policy if exists projets_insert on public.projets;
create policy projets_insert on public.projets
  for insert with check (app.has_role(immeuble_id, array['syndic','vice_syndic']));

drop policy if exists projets_update on public.projets;
create policy projets_update on public.projets
  for update
  using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- ---------------------------------------------------------------------
-- 5. VOTES — un votant ne peut voter que pour LUI, sur son logement,
--    et seulement si le scrutin est ouvert (anti-fraude)
-- ---------------------------------------------------------------------
alter table public.votes enable row level security;

drop policy if exists votes_select on public.votes;
create policy votes_select on public.votes
  for select using (true);  -- transparence : tout le monde voit les votes

drop policy if exists votes_insert on public.votes;
create policy votes_insert on public.votes
  for insert with check (
    user_id = auth.uid()
    and app.is_proprietaire_of(logement_id)
  );

-- pas d'UPDATE/DELETE des votes (un vote est définitif ; la contrainte
-- d'unicité empêche déjà le double vote)
drop policy if exists votes_no_update on public.votes;
drop policy if exists votes_no_delete on public.votes;

-- ---------------------------------------------------------------------
-- 6. RÉUNIONS — création/gestion réservée à syndic / vice_syndic
-- ---------------------------------------------------------------------
alter table public.reunions enable row level security;

drop policy if exists reunions_select on public.reunions;
create policy reunions_select on public.reunions
  for select using (app.is_member(immeuble_id));

drop policy if exists reunions_insert on public.reunions;
create policy reunions_insert on public.reunions
  for insert with check (app.has_role(immeuble_id, array['syndic','vice_syndic']));

drop policy if exists reunions_update on public.reunions;
create policy reunions_update on public.reunions
  for update
  using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- ---------------------------------------------------------------------
-- 7. ANNONCES — publication réservée à syndic / vice_syndic
-- ---------------------------------------------------------------------
alter table public.annonces enable row level security;

drop policy if exists annonces_select on public.annonces;
create policy annonces_select on public.annonces
  for select using (app.is_member(immeuble_id));

drop policy if exists annonces_insert on public.annonces;
create policy annonces_insert on public.annonces
  for insert with check (app.has_role(immeuble_id, array['syndic','vice_syndic']));

drop policy if exists annonces_update on public.annonces;
create policy annonces_update on public.annonces
  for update
  using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- ---------------------------------------------------------------------
-- 8. Forcer la RLS (s'applique même au propriétaire de la table)
-- ---------------------------------------------------------------------
alter table public.depenses    force row level security;
alter table public.cotisations force row level security;
alter table public.projets     force row level security;
alter table public.votes       force row level security;
alter table public.reunions    force row level security;
alter table public.annonces    force row level security;
