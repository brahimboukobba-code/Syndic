-- =====================================================================
-- 005_tables_meetings.sql
-- Domaine Vie collective : reunions, participations, mandats_syndic,
--                          annonces, reclamations, sondages
-- =====================================================================

-- ---------------------------------------------------------------------
-- reunions (AG ordinaires/extraordinaires + réunions de travail)
-- ---------------------------------------------------------------------
create table public.reunions (
  id                       uuid primary key default gen_random_uuid(),
  immeuble_id              uuid not null references public.immeubles(id) on delete restrict,
  type                     text not null
                             check (type in ('ag_ordinaire','ag_extraordinaire','reunion_syndic','reunion_travail')),
  titre                    text not null,
  ordre_du_jour            text not null,
  date_prevue              timestamptz not null,
  lieu                     text not null,
  statut                   text not null default 'planifiee'
                             check (statut in ('planifiee','convocation_envoyee','tenue','annulee')),
  date_convocation_envoyee timestamptz,
  pv_url                   text,
  pv_hash_sha256           text,
  pv_uploaded_at           timestamptz,
  pv_uploaded_by           uuid references public.utilisateurs(id) on delete set null,
  exercice_id              uuid references public.exercices(id) on delete set null,
  created_at               timestamptz not null default now(),
  created_by               uuid references public.utilisateurs(id) on delete set null
);

comment on table public.reunions is 'AG (>= 1/an, Art. 16ter) et réunions. PV obligatoire pour clôturer une AG (trigger en 009)';
comment on column public.reunions.pv_hash_sha256 is 'Empreinte du PV calculée à l''upload (intégrité, OWASP A08)';
create index idx_reunions_immeuble on public.reunions(immeuble_id);
create index idx_reunions_type     on public.reunions(type);

-- ---------------------------------------------------------------------
-- reunion_participations (présence + procurations Art. 14)
-- ---------------------------------------------------------------------
create table public.reunion_participations (
  id             uuid primary key default gen_random_uuid(),
  reunion_id     uuid not null references public.reunions(id)     on delete cascade,
  user_id        uuid not null references public.utilisateurs(id) on delete restrict,
  statut         text not null default 'invite'
                   check (statut in ('invite','confirme','decline','present','absent','represente')),
  represente_par uuid references public.utilisateurs(id) on delete set null,
  unique (reunion_id, user_id),
  -- un mandataire ne peut être soi-même
  check (represente_par is null or represente_par <> user_id)
);

comment on table public.reunion_participations is 'Présence et procurations. Un mandataire ne représente qu''un seul copropriétaire (Art. 14)';

-- ---------------------------------------------------------------------
-- mandats_syndic (historique des mandats de 2 ans, Art. 19)
-- ---------------------------------------------------------------------
create table public.mandats_syndic (
  id                  uuid primary key default gen_random_uuid(),
  immeuble_id         uuid not null references public.immeubles(id)    on delete restrict,
  syndic_id           uuid not null references public.utilisateurs(id) on delete restrict,
  vice_syndic_id      uuid references public.utilisateurs(id) on delete set null,
  date_election       date not null,
  date_fin_mandat     date not null,
  reunion_id          uuid references public.reunions(id) on delete set null,
  pourcentage_obtenu  numeric(5,2) not null check (pourcentage_obtenu >= 75 and pourcentage_obtenu <= 100),
  statut              text not null default 'en_cours'
                        check (statut in ('en_cours','termine','revoque','demissionne')),
  created_at          timestamptz not null default now(),
  check (date_fin_mandat > date_election)
);

comment on table public.mandats_syndic is 'Mandat de 2 ans (Art. 19). Élu à >= 75%. Alimente les compteurs du tableau de bord';
create index idx_mandats_immeuble on public.mandats_syndic(immeuble_id);
-- un seul mandat en cours par immeuble
create unique index uniq_mandat_en_cours
  on public.mandats_syndic(immeuble_id)
  where statut = 'en_cours';

-- ---------------------------------------------------------------------
-- annonces (avis du syndic / vice-syndic)
-- ---------------------------------------------------------------------
create table public.annonces (
  id          uuid primary key default gen_random_uuid(),
  immeuble_id uuid not null references public.immeubles(id) on delete restrict,
  titre       text not null,
  contenu     text not null,
  niveau      text not null default 'info' check (niveau in ('info','important','urgent')),
  epingle     boolean not null default false,
  statut      text not null default 'publie' check (statut in ('publie','retire')),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.utilisateurs(id) on delete set null
);

comment on table public.annonces is 'Avis et communications du syndic à l''ensemble des habitants';
create index idx_annonces_immeuble on public.annonces(immeuble_id);

-- ---------------------------------------------------------------------
-- reclamations (ticket résident -> syndic)
-- ---------------------------------------------------------------------
create table public.reclamations (
  id             uuid primary key default gen_random_uuid(),
  immeuble_id    uuid not null references public.immeubles(id)    on delete restrict,
  user_id        uuid not null references public.utilisateurs(id) on delete restrict,
  categorie      text not null
                   check (categorie in ('plomberie','electricite','ascenseur','proprete','securite','nuisance','autre')),
  titre          text not null,
  description    text not null,
  photo_url      text,
  priorite       text not null default 'normale' check (priorite in ('basse','normale','haute','urgente')),
  statut         text not null default 'ouverte' check (statut in ('ouverte','en_cours','resolue','rejetee')),
  traitee_par    uuid references public.utilisateurs(id) on delete set null,
  reponse_syndic text,
  depense_id     uuid references public.depenses(id) on delete set null,
  created_at     timestamptz not null default now(),
  resolue_le     timestamptz
);

comment on table public.reclamations is 'Réclamation résident avec cycle ouverte->en_cours->resolue. Lien optionnel vers la dépense de réparation';
create index idx_reclamations_immeuble on public.reclamations(immeuble_id);
create index idx_reclamations_statut   on public.reclamations(statut);
create index idx_reclamations_user     on public.reclamations(user_id);

-- ---------------------------------------------------------------------
-- sondages (consultations non engageantes) + réponses
-- ---------------------------------------------------------------------
create table public.sondages (
  id           uuid primary key default gen_random_uuid(),
  immeuble_id  uuid not null references public.immeubles(id) on delete restrict,
  question     text not null,
  options      jsonb not null,
  date_cloture timestamptz not null,
  statut       text not null default 'ouvert' check (statut in ('ouvert','clos')),
  created_at   timestamptz not null default now(),
  created_by   uuid references public.utilisateurs(id) on delete set null,
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2)
);

comment on table public.sondages is 'Sondage non engageant pour prendre la température (distinct du vote formel)';

create table public.sondage_reponses (
  id         uuid primary key default gen_random_uuid(),
  sondage_id uuid not null references public.sondages(id)     on delete cascade,
  user_id    uuid not null references public.utilisateurs(id) on delete restrict,
  choix      text not null,
  created_at timestamptz not null default now(),
  unique (sondage_id, user_id)
);

comment on table public.sondage_reponses is 'Une réponse par utilisateur et par sondage';
