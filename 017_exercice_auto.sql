-- =====================================================================
-- 017_exercice_auto.sql
-- Création automatique de l'exercice de l'année courante.
--
-- Principe : une fonction SECURITY DEFINER que l'app appelle au
-- chargement via supabase.rpc(). Si aucun exercice ne couvre l'année
-- en cours pour l'immeuble, elle en crée un :
--   - libellé "Exercice AAAA"
--   - du 1er janvier au 31 décembre de l'année courante
--   - budget prévisionnel = montant_cotisation_defaut x 12 x nb logements
--   - statut "en_cours"
-- L'ancien exercice est LAISSÉ OUVERT (le syndic le clôture en AG).
--
-- IMPORTANT : la fonction est dans le schéma PUBLIC pour être
-- appelable par l'API REST (PostgREST n'expose que public par défaut).
-- SECURITY DEFINER : s'exécute avec les privilèges du propriétaire,
-- donc la création n'est pas bloquée par la RLS, mais la fonction
-- vérifie d'abord que l'appelant est membre de l'immeuble.
-- À exécuter dans le SQL Editor de Supabase.
-- =====================================================================

create or replace function public.ensure_exercice_courant(p_immeuble uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_annee        int := extract(year from current_date)::int;
  v_debut        date := make_date(v_annee, 1, 1);
  v_fin          date := make_date(v_annee, 12, 31);
  v_exercice_id  uuid;
  v_montant      numeric(10,2);
  v_nb_logements int;
  v_budget       numeric(12,2);
begin
  -- L'appelant doit être membre de l'immeuble (sécurité minimale)
  if not exists (
    select 1 from public.user_roles ur
    where ur.immeuble_id = p_immeuble
      and ur.user_id = auth.uid()
      and ur.date_fin is null
  ) then
    return null;
  end if;

  -- Un exercice couvre-t-il déjà l'année courante ?
  select id into v_exercice_id
  from public.exercices
  where immeuble_id = p_immeuble
    and date_debut <= v_fin
    and date_fin   >= v_debut
  order by date_debut desc
  limit 1;

  if v_exercice_id is not null then
    return v_exercice_id;  -- déjà présent, rien à faire
  end if;

  -- Calcul du budget prévisionnel = cotisation x 12 x nb logements
  select coalesce(montant_cotisation_defaut, 0) into v_montant
  from public.immeubles where id = p_immeuble;

  select count(*) into v_nb_logements
  from public.logements where immeuble_id = p_immeuble;

  v_budget := coalesce(v_montant, 0) * 12 * coalesce(v_nb_logements, 0);

  -- Créer le nouvel exercice (l'ancien reste "en_cours")
  insert into public.exercices (immeuble_id, libelle, date_debut, date_fin, budget_previsionnel, statut)
  values (p_immeuble, 'Exercice ' || v_annee, v_debut, v_fin, v_budget, 'en_cours')
  returning id into v_exercice_id;

  return v_exercice_id;
end;
$$;

grant execute on function public.ensure_exercice_courant(uuid) to authenticated;
