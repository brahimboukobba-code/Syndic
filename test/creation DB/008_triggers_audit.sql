-- =====================================================================
-- 008_triggers_audit.sql
-- Triggers d'audit automatique sur toutes les tables sensibles.
-- Écrit dans audit_log à chaque INSERT/UPDATE/DELETE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- app.role_courant() : meilleur rôle de l'utilisateur pour l'audit.
-- On lit le rôle le plus "fort" parmi les rôles actifs, sinon 'systeme'.
-- ---------------------------------------------------------------------
create or replace function app.role_courant()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select ur.role
      from public.user_roles ur
      where ur.user_id = auth.uid() and ur.date_fin is null
      order by case ur.role
        when 'syndic' then 1
        when 'vice_syndic' then 2
        when 'tresorier' then 3
        when 'proprietaire' then 4
        when 'locataire' then 5
        else 6 end
      limit 1
    ),
    'systeme'
  );
$$;

-- ---------------------------------------------------------------------
-- app.fn_audit() : fonction de trigger générique
-- ---------------------------------------------------------------------
create or replace function app.fn_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old      jsonb;
  v_new      jsonb;
  v_changed  text[];
  v_row_id   uuid;
  v_ip       inet;
  v_ua       text;
begin
  -- Métadonnées de requête (fournies par PostgREST via en-têtes), tolérant si absentes
  begin
    v_ip := nullif(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', '')::inet;
  exception when others then v_ip := null;
  end;
  begin
    v_ua := current_setting('request.headers', true)::jsonb ->> 'user-agent';
  exception when others then v_ua := null;
  end;

  -- Détermination de l'identifiant de ligne. La plupart des tables ont une
  -- colonne 'id' uuid. Les tables à clé composite (ex. user_roles) n'en ont
  -- pas : on retombe alors sur le user_id, sinon sur un UUID nul.
  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old);
    v_row_id := coalesce(
      nullif(v_old ->> 'id','')::uuid,
      nullif(v_old ->> 'user_id','')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    );
    insert into public.audit_log(table_name, row_id, action, old_values, new_values, changed_fields, user_id, user_role, ip_address, user_agent)
    values (tg_table_name, v_row_id, 'delete', v_old, null, null, auth.uid(), app.role_courant(), v_ip, v_ua);
    return old;

  elsif (tg_op = 'UPDATE') then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row_id := coalesce(
      nullif(v_new ->> 'id','')::uuid,
      nullif(v_new ->> 'user_id','')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    );
    select array_agg(key) into v_changed
    from jsonb_each(v_new)
    where v_new -> key is distinct from v_old -> key;
    insert into public.audit_log(table_name, row_id, action, old_values, new_values, changed_fields, user_id, user_role, ip_address, user_agent)
    values (tg_table_name, v_row_id, 'update', v_old, v_new, v_changed, auth.uid(), app.role_courant(), v_ip, v_ua);
    return new;

  else -- INSERT
    v_new := to_jsonb(new);
    v_row_id := coalesce(
      nullif(v_new ->> 'id','')::uuid,
      nullif(v_new ->> 'user_id','')::uuid,
      '00000000-0000-0000-0000-000000000000'::uuid
    );
    insert into public.audit_log(table_name, row_id, action, old_values, new_values, changed_fields, user_id, user_role, ip_address, user_agent)
    values (tg_table_name, v_row_id, 'insert', null, v_new, null, auth.uid(), app.role_courant(), v_ip, v_ua);
    return new;
  end if;
end;
$$;

comment on function app.fn_audit is 'Trigger générique d''audit : journalise chaque opération dans audit_log';

-- ---------------------------------------------------------------------
-- Attache le trigger à chaque table sensible
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  sensibles text[] := array[
    'cotisations','depenses','projets','devis','votes',
    'reunions','mandats_syndic','annonces','reclamations',
    'utilisateurs','occupations','user_roles'
  ];
begin
  foreach t in array sensibles loop
    execute format('drop trigger if exists trg_audit on public.%I;', t);
    execute format(
      'create trigger trg_audit after insert or update or delete on public.%I
         for each row execute function app.fn_audit();', t);
  end loop;
end;
$$;
