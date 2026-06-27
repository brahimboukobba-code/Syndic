-- =====================================================================
-- 013_notifications_function.sql
-- Fonction qui crée une notification pour tous les habitants d'un immeuble
-- (ou pour un habitant précis). SECURITY DEFINER : elle peut écrire dans
-- notifications malgré la RLS, mais elle ne fait QUE créer des notifications.
--
-- À exécuter dans le SQL Editor de Supabase (Sprint 6).
-- =====================================================================

-- Notifier tous les membres actifs d'un immeuble
create or replace function app.notifier_immeuble(
  p_immeuble_id uuid,
  p_type        text,
  p_titre       text,
  p_message     text,
  p_entite_type text default null,
  p_entite_id   uuid default null,
  p_exclure     uuid default null   -- ne pas notifier cet utilisateur (l'auteur)
)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
begin
  insert into public.notifications (user_id, type, titre, message, entite_type, entite_id)
  select distinct m.user_id, p_type, p_titre, p_message, p_entite_type, p_entite_id
  from (
    -- membres via un rôle actif
    select ur.user_id from public.user_roles ur
    where ur.immeuble_id = p_immeuble_id and ur.date_fin is null
    union
    -- membres via une occupation active
    select o.user_id
    from public.occupations o
    join public.logements l on l.id = o.logement_id
    where l.immeuble_id = p_immeuble_id and o.date_fin is null
  ) m
  where p_exclure is null or m.user_id <> p_exclure;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function app.notifier_immeuble is 'Crée une notification pour tous les membres actifs d''un immeuble (sauf l''auteur exclu)';

-- Notifier un seul habitant (ex. l'auteur d'une réclamation quand elle évolue)
create or replace function app.notifier_user(
  p_user_id     uuid,
  p_type        text,
  p_titre       text,
  p_message     text,
  p_entite_type text default null,
  p_entite_id   uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (user_id, type, titre, message, entite_type, entite_id)
  values (p_user_id, p_type, p_titre, p_message, p_entite_type, p_entite_id);
end;
$$;

comment on function app.notifier_user is 'Crée une notification pour un habitant précis';

-- Donner le droit d'exécuter ces fonctions aux utilisateurs authentifiés.
-- (Protégé : ne casse pas si le rôle 'authenticated' n'existe pas dans
--  un environnement de test.)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function app.notifier_immeuble(uuid,text,text,text,text,uuid,uuid) to authenticated;
    grant execute on function app.notifier_user(uuid,text,text,text,text,uuid) to authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Wrappers dans le schéma public : l'API REST de Supabase (RPC) n'expose
-- par défaut que le schéma public. Ces wrappers permettent d'appeler
-- les fonctions depuis le front via supabase.rpc('notifier_immeuble', ...).
-- ---------------------------------------------------------------------
create or replace function public.notifier_immeuble(
  p_immeuble_id uuid, p_type text, p_titre text, p_message text,
  p_entite_type text default null, p_entite_id uuid default null, p_exclure uuid default null
)
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  select app.notifier_immeuble(p_immeuble_id, p_type, p_titre, p_message, p_entite_type, p_entite_id, p_exclure);
$$;

create or replace function public.notifier_user(
  p_user_id uuid, p_type text, p_titre text, p_message text,
  p_entite_type text default null, p_entite_id uuid default null
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  select app.notifier_user(p_user_id, p_type, p_titre, p_message, p_entite_type, p_entite_id);
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.notifier_immeuble(uuid,text,text,text,text,uuid,uuid) to authenticated;
    grant execute on function public.notifier_user(uuid,text,text,text,text,uuid) to authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Activer le temps réel (Realtime) sur la table notifications, pour que
-- la cloche se mette à jour instantanément. Idempotent.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when undefined_object then
  -- la publication supabase_realtime n'existe pas dans un env de test : on ignore
  null;
end $$;
