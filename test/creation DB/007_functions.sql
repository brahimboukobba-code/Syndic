-- =====================================================================
-- 007_functions.sql
-- Fonctions helpers de sécurité et métier
-- Toutes en SECURITY DEFINER quand elles doivent contourner la RLS
-- de façon contrôlée, avec search_path verrouillé (OWASP A01/A03)
-- =====================================================================

-- ---------------------------------------------------------------------
-- app.current_uid() : uid de l'utilisateur courant (alias lisible)
-- ---------------------------------------------------------------------
create or replace function app.current_uid()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- ---------------------------------------------------------------------
-- app.is_member(immeuble) : l'utilisateur courant est-il rattaché
-- à cet immeuble (via une occupation active OU un rôle actif) ?
-- ---------------------------------------------------------------------
create or replace function app.is_member(p_immeuble_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.occupations o
    join public.logements l on l.id = o.logement_id
    where o.user_id = auth.uid()
      and l.immeuble_id = p_immeuble_id
      and o.date_fin is null
  )
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.immeuble_id = p_immeuble_id
      and ur.date_fin is null
  );
$$;

comment on function app.is_member is 'Vrai si l''utilisateur courant est rattaché à l''immeuble (lecture seule de base)';

-- ---------------------------------------------------------------------
-- app.has_role(immeuble, roles[]) : l'utilisateur courant détient-il
-- l'un des rôles demandés sur cet immeuble ?
-- ---------------------------------------------------------------------
create or replace function app.has_role(p_immeuble_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
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

comment on function app.has_role is 'Vrai si l''utilisateur courant a l''un des rôles demandés sur l''immeuble';

-- ---------------------------------------------------------------------
-- app.immeuble_of_exercice() : retrouve l'immeuble d'un exercice
-- ---------------------------------------------------------------------
create or replace function app.immeuble_of_exercice(p_exercice_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select immeuble_id from public.exercices where id = p_exercice_id;
$$;

-- ---------------------------------------------------------------------
-- app.is_proprietaire_of(logement) : l'utilisateur courant est-il
-- propriétaire actif du logement ? (droit de vote)
-- ---------------------------------------------------------------------
create or replace function app.is_proprietaire_of(p_logement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.occupations o
    where o.user_id = auth.uid()
      and o.logement_id = p_logement_id
      and o.type = 'proprietaire'
      and o.date_fin is null
  );
$$;

comment on function app.is_proprietaire_of is 'Vrai si l''utilisateur courant est propriétaire actif du logement (Art. 14 : seul le copropriétaire vote)';

-- ---------------------------------------------------------------------
-- app.scrutin_est_ouvert(type, scrutin_id) : le scrutin accepte-t-il
-- encore des votes maintenant ?
-- ---------------------------------------------------------------------
create or replace function app.scrutin_est_ouvert(p_type text, p_scrutin_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_open boolean := false;
  v_projet public.projets%rowtype;
begin
  if p_type = 'projet_principe' then
    select * into v_projet from public.projets where id = p_scrutin_id;
    v_open := found
      and v_projet.phase = 'vote_principe'
      and now() >= coalesce(v_projet.date_ouverture_vote, now())
      and now() <= coalesce(v_projet.date_cloture_vote, now());
  elsif p_type = 'projet_devis' then
    select * into v_projet from public.projets where id = p_scrutin_id;
    v_open := found
      and v_projet.phase = 'vote_devis'
      and now() >= coalesce(v_projet.date_ouverture_vote_devis, now())
      and now() <= coalesce(v_projet.date_cloture_vote_devis, now());
  else
    -- election_syndic / ag_decision : gérés manuellement par le syndic en séance
    v_open := true;
  end if;
  return v_open;
end;
$$;

comment on function app.scrutin_est_ouvert is 'Vrai si le scrutin accepte encore des votes (phase + fenêtre temporelle)';

-- ---------------------------------------------------------------------
-- app.resultat_vote_principe(projet) : % de OUI sur les logements
-- ayant voté, et atteinte du seuil. Utilisé par la clôture (job).
-- ---------------------------------------------------------------------
create or replace function app.resultat_vote_principe(p_projet_id uuid)
returns table (oui int, non int, abstention int, total_votants int, pct_oui numeric, seuil_atteint boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_seuil numeric;
begin
  select seuil_acceptation into v_seuil from public.projets where id = p_projet_id;

  return query
  with v as (
    select choix from public.votes
    where scrutin_type = 'projet_principe' and scrutin_id = p_projet_id
  ),
  agg as (
    select
      count(*) filter (where choix = 'oui')        as oui,
      count(*) filter (where choix = 'non')        as non,
      count(*) filter (where choix = 'abstention') as abstention,
      count(*)                                     as total
    from v
  )
  select
    agg.oui::int,
    agg.non::int,
    agg.abstention::int,
    agg.total::int,
    case when agg.total = 0 then 0
         else round(agg.oui::numeric / agg.total, 4) end as pct_oui,
    case when agg.total = 0 then false
         else (agg.oui::numeric / agg.total) >= v_seuil end as seuil_atteint
  from agg;
end;
$$;

comment on function app.resultat_vote_principe is 'Dépouillement du vote de principe (% OUI vs seuil 3/4)';
