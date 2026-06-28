-- =====================================================================
-- 014_role_admin.sql
-- Ajoute le rôle "admin" : un gestionnaire de comptes pour l'immeuble.
-- L'admin peut créer/modifier les habitants et leurs rôles. Il n'est pas
-- forcément un habitant lui-même.
--
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

-- 1. Autoriser la valeur 'admin' dans user_roles.role
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role = any (array[
    'admin'::text, 'syndic'::text, 'vice_syndic'::text,
    'tresorier'::text, 'proprietaire'::text, 'locataire'::text
  ]));

-- 2. Helper : l'utilisateur courant est-il admin de cet immeuble ?
create or replace function app.is_admin(p_immeuble_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.immeuble_id = p_immeuble_id
      and ur.date_fin is null
      and ur.role = 'admin'
  );
$$;

-- Helper : l'utilisateur courant est-il admin d'AU MOINS un immeuble ?
-- (utile pour créer un profil avant que le rôle de la cible existe)
create or replace function app.is_any_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.date_fin is null
      and ur.role = 'admin'
  );
$$;

-- 3. Policies : l'admin peut gérer les profils, rôles et occupations
--    de son immeuble (en plus des règles existantes).

-- utilisateurs : l'admin peut voir et modifier les profils.
-- Condition basée sur "le demandeur est admin d'au moins un immeuble"
-- (et non sur le rôle de la cible, qui n'existe pas encore à la création).
drop policy if exists utilisateurs_admin_all on public.utilisateurs;
create policy utilisateurs_admin_all on public.utilisateurs
  for all
  using (app.is_any_admin())
  with check (app.is_any_admin());

-- user_roles : l'admin peut créer/clore des rôles dans son immeuble
drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all on public.user_roles
  for all
  using (app.is_admin(immeuble_id))
  with check (app.is_admin(immeuble_id));

-- occupations : l'admin peut rattacher/détacher des habitants aux logements
drop policy if exists occupations_admin_all on public.occupations;
create policy occupations_admin_all on public.occupations
  for all
  using (
    exists (
      select 1 from public.logements l
      where l.id = public.occupations.logement_id
        and app.is_admin(l.immeuble_id)
    )
  )
  with check (
    exists (
      select 1 from public.logements l
      where l.id = public.occupations.logement_id
        and app.is_admin(l.immeuble_id)
    )
  );

-- 4. Droit d'exécuter le helper
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function app.is_admin(uuid) to authenticated;
    grant execute on function app.is_any_admin() to authenticated;
  end if;
end $$;
