-- =====================================================================
-- 009_triggers_business.sql
-- Règles métier appliquées par triggers (défense en profondeur)
--  1. PV obligatoire pour clôturer une AG
--  2. Dépense au-dessus du seuil -> en_attente_validation
--  3. Dépense validée seulement si double signature
--  4. Numéro de reçu + horodatage au passage "payé"
--  5. Horodatage resolue_le sur réclamation résolue
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PV obligatoire pour passer une AG au statut 'tenue'
-- ---------------------------------------------------------------------
create or replace function app.fn_reunion_pv_obligatoire()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'tenue'
     and new.type in ('ag_ordinaire','ag_extraordinaire')
     and (new.pv_url is null or length(new.pv_url) = 0) then
    raise exception 'Le PV est obligatoire pour clôturer une assemblée générale (Art. 30).';
  end if;
  -- horodatage automatique de l'upload du PV
  if new.pv_url is not null and (old.pv_url is null or new.pv_url <> old.pv_url) then
    new.pv_uploaded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reunion_pv on public.reunions;
create trigger trg_reunion_pv
  before update on public.reunions
  for each row execute function app.fn_reunion_pv_obligatoire();

-- ---------------------------------------------------------------------
-- 2 & 3. Workflow de validation des dépenses
-- ---------------------------------------------------------------------
create or replace function app.fn_depense_validation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_seuil numeric;
begin
  -- seuil de l'immeuble (via exercice)
  select i.seuil_validation_depense
    into v_seuil
  from public.exercices e
  join public.immeubles i on i.id = e.immeuble_id
  where e.id = new.exercice_id;

  if tg_op = 'INSERT' then
    -- au-dessus du seuil : exige validation
    if v_seuil is not null and new.montant > v_seuil then
      new.requiert_validation := true;
      -- ne pas écraser un statut explicitement supprimé/rejeté
      if new.statut not in ('supprime','rejete') then
        new.statut := 'en_attente_validation';
      end if;
    else
      new.requiert_validation := coalesce(new.requiert_validation, false);
    end if;
    return new;
  end if;

  -- UPDATE : si validation requise, on ne peut passer 'valide'
  -- que lorsque les DEUX signatures sont présentes.
  if new.requiert_validation then
    if new.valide_par_syndic is not null and new.valide_par_syndic_le is null then
      new.valide_par_syndic_le := now();
    end if;
    if new.valide_par_vice_syndic is not null and new.valide_par_vice_syndic_le is null then
      new.valide_par_vice_syndic_le := now();
    end if;

    if new.statut = 'valide'
       and (new.valide_par_syndic is null or new.valide_par_vice_syndic is null) then
      raise exception 'Cette dépense dépasse le seuil : double validation syndic ET vice-syndic requise avant de la valider.';
    end if;

    -- le syndic et le vice-syndic doivent être deux personnes distinctes
    if new.valide_par_syndic is not null
       and new.valide_par_syndic = new.valide_par_vice_syndic then
      raise exception 'Les deux validations doivent provenir de deux personnes distinctes.';
    end if;
  end if;

  -- traçage de la modification
  new.updated_at := now();
  new.updated_by := auth.uid();
  -- suppression logique : renseigner deleted_*
  if new.statut = 'supprime' and old.statut <> 'supprime' then
    new.deleted_at := now();
    new.deleted_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_depense_validation_ins on public.depenses;
create trigger trg_depense_validation_ins
  before insert on public.depenses
  for each row execute function app.fn_depense_validation();

drop trigger if exists trg_depense_validation_upd on public.depenses;
create trigger trg_depense_validation_upd
  before update on public.depenses
  for each row execute function app.fn_depense_validation();

-- ---------------------------------------------------------------------
-- 4. Numéro de reçu séquentiel au passage "payé"
--    Format : REC-{annee}-{compteur zero-paddé}
-- ---------------------------------------------------------------------
create sequence if not exists public.seq_recu;

create or replace function app.fn_cotisation_recu()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'paye' and (old.statut is distinct from 'paye') then
    if new.date_paiement is null then
      new.date_paiement := current_date;
    end if;
    if new.recu_numero is null then
      new.recu_numero := 'REC-' || to_char(now(),'YYYY') || '-' ||
                         lpad(nextval('public.seq_recu')::text, 6, '0');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cotisation_recu on public.cotisations;
create trigger trg_cotisation_recu
  before update on public.cotisations
  for each row execute function app.fn_cotisation_recu();

-- ---------------------------------------------------------------------
-- 5. Horodatage resolue_le sur réclamation résolue
-- ---------------------------------------------------------------------
create or replace function app.fn_reclamation_resolue()
returns trigger
language plpgsql
as $$
begin
  if new.statut = 'resolue' and (old.statut is distinct from 'resolue') then
    new.resolue_le := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reclamation_resolue on public.reclamations;
create trigger trg_reclamation_resolue
  before update on public.reclamations
  for each row execute function app.fn_reclamation_resolue();
