-- =====================================================================
-- 003_tables_finance.sql
-- Domaine Finance : exercices, cotisations, categories_depenses, depenses
-- =====================================================================

-- ---------------------------------------------------------------------
-- exercices (périodes comptables)
-- ---------------------------------------------------------------------
create table public.exercices (
  id                   uuid primary key default gen_random_uuid(),
  immeuble_id          uuid not null references public.immeubles(id) on delete restrict,
  libelle              text not null,
  date_debut           date not null,
  date_fin             date not null,
  budget_previsionnel  numeric(12,2) check (budget_previsionnel is null or budget_previsionnel >= 0),
  statut               text not null default 'en_cours' check (statut in ('en_cours','clos','approuve')),
  date_approbation_ag  date,
  created_at           timestamptz not null default now(),
  check (date_fin > date_debut)
);

comment on table public.exercices is 'Période comptable. L''AG annuelle approuve les comptes de l''exercice clos (Art. 24)';
create index idx_exercices_immeuble on public.exercices(immeuble_id);

-- ---------------------------------------------------------------------
-- cotisations (suivi manuel payé / impayé, reçu PDF auto)
-- ---------------------------------------------------------------------
create table public.cotisations (
  id                 uuid primary key default gen_random_uuid(),
  exercice_id        uuid not null references public.exercices(id) on delete restrict,
  logement_id        uuid not null references public.logements(id) on delete restrict,
  periode            text not null,
  montant            numeric(10,2) not null check (montant >= 0),
  date_echeance      date not null,
  statut             text not null default 'a_payer' check (statut in ('a_payer','paye','retard')),
  date_paiement      date,
  moyen_paiement     text,
  reference_paiement text,
  recu_url           text,
  recu_numero        text,
  notes              text,
  created_at         timestamptz not null default now(),
  created_by         uuid references public.utilisateurs(id) on delete set null,
  unique (exercice_id, logement_id, periode),
  -- cohérence : si payé, une date de paiement est attendue
  check (statut <> 'paye' or date_paiement is not null)
);

comment on table public.cotisations is 'Cotisation rattachée au logement (pas à l''utilisateur) pour suivre les changements de propriétaire';
create index idx_cotisations_logement on public.cotisations(logement_id);
create index idx_cotisations_exercice on public.cotisations(exercice_id);
create index idx_cotisations_statut   on public.cotisations(statut);

-- ---------------------------------------------------------------------
-- categories_depenses
-- ---------------------------------------------------------------------
create table public.categories_depenses (
  id          uuid primary key default gen_random_uuid(),
  immeuble_id uuid not null references public.immeubles(id) on delete restrict,
  nom_fr      text not null,
  nom_ar      text,
  couleur     text not null default '#1F4E79',
  actif       boolean not null default true,
  unique (immeuble_id, nom_fr)
);

comment on table public.categories_depenses is 'Ascenseur, ménage, eau, électricité, gardiennage, etc.';

-- ---------------------------------------------------------------------
-- depenses (cœur de la transparence + workflow double validation)
-- ---------------------------------------------------------------------
create table public.depenses (
  id                          uuid primary key default gen_random_uuid(),
  exercice_id                 uuid not null references public.exercices(id) on delete restrict,
  categorie_id                uuid not null references public.categories_depenses(id) on delete restrict,
  projet_id                   uuid,  -- FK ajoutée en 004 (après création de projets)
  type_depense                text not null default 'charge_fixe'
                                check (type_depense in ('charge_fixe','urgente','projet')),
  intitule                    text not null,
  description                 text,
  montant                     numeric(10,2) not null check (montant >= 0),
  date_depense                date not null,
  beneficiaire                text not null,
  moyen_paiement              text not null
                                check (moyen_paiement in ('especes','cheque','virement','carte','autre')),
  justificatif_url            text not null,
  statut                      text not null default 'valide'
                                check (statut in ('en_attente_validation','valide','rejete','supprime')),
  requiert_validation         boolean not null default false,
  valide_par_syndic           uuid references public.utilisateurs(id) on delete set null,
  valide_par_syndic_le        timestamptz,
  valide_par_vice_syndic      uuid references public.utilisateurs(id) on delete set null,
  valide_par_vice_syndic_le   timestamptz,
  motif_rejet                 text,
  created_at                  timestamptz not null default now(),
  created_by                  uuid references public.utilisateurs(id) on delete set null,
  updated_at                  timestamptz,
  updated_by                  uuid references public.utilisateurs(id) on delete set null,
  deleted_at                  timestamptz,
  deleted_by                  uuid references public.utilisateurs(id) on delete set null,
  raison_suppression          text,
  -- une dépense supprimée doit porter une raison
  check (statut <> 'supprime' or raison_suppression is not null),
  -- justificatif obligatoire
  check (length(justificatif_url) > 0)
);

comment on table public.depenses is 'Dépense immuable (jamais supprimée physiquement). Justificatif obligatoire. Double validation au-delà du seuil';
create index idx_depenses_exercice  on public.depenses(exercice_id);
create index idx_depenses_categorie on public.depenses(categorie_id);
create index idx_depenses_statut    on public.depenses(statut);
create index idx_depenses_date      on public.depenses(date_depense);
