-- =====================================================================
-- 002_tables_identity.sql
-- Domaine Identité : immeubles, logements, utilisateurs, rôles, occupations
-- =====================================================================

-- ---------------------------------------------------------------------
-- immeubles
-- ---------------------------------------------------------------------
create table public.immeubles (
  id                        uuid primary key default gen_random_uuid(),
  nom                       text not null,
  adresse                   text not null,
  nombre_logements          int  not null check (nombre_logements > 0),
  devise                    text not null default 'MAD',
  compte_bancaire           text,
  banque                    text,
  seuil_validation_depense  numeric(10,2) check (seuil_validation_depense is null or seuil_validation_depense >= 0),
  date_creation_syndicat    date not null,
  reglement_copropriete_url text,
  created_at                timestamptz not null default now()
);

comment on table public.immeubles is 'Immeuble(s) géré(s) par le syndicat des copropriétaires';
comment on column public.immeubles.seuil_validation_depense is 'Au-delà de ce montant, une dépense exige la double validation syndic + vice-syndic';

-- ---------------------------------------------------------------------
-- logements
-- ---------------------------------------------------------------------
create table public.logements (
  id            uuid primary key default gen_random_uuid(),
  immeuble_id   uuid not null references public.immeubles(id) on delete restrict,
  numero        text not null,
  etage         int,
  superficie_m2 numeric(7,2) check (superficie_m2 is null or superficie_m2 > 0),
  tantiemes     int  not null default 1 check (tantiemes > 0),
  statut        text not null default 'actif' check (statut in ('actif','archive')),
  created_at    timestamptz not null default now(),
  unique (immeuble_id, numero)
);

comment on column public.logements.tantiemes is 'Quote-part. Défaut 1 pour le modèle 1 logement = 1 voix ; permet l''évolution vers un vote pondéré';

create index idx_logements_immeuble on public.logements(immeuble_id);

-- ---------------------------------------------------------------------
-- utilisateurs (profils étendant auth.users de Supabase)
-- ---------------------------------------------------------------------
create table public.utilisateurs (
  id              uuid primary key references auth.users(id) on delete restrict,
  nom_complet     text not null,
  telephone       text,
  langue_preferee text not null default 'fr' check (langue_preferee in ('fr','ar')),
  statut          text not null default 'actif' check (statut in ('actif','desactive')),
  date_creation   timestamptz not null default now(),
  created_by      uuid references public.utilisateurs(id) on delete set null
);

comment on table public.utilisateurs is 'Profil applicatif lié 1-1 à auth.users. Créé par le syndic ; jamais supprimé (audit Art. 32)';

-- ---------------------------------------------------------------------
-- user_roles (N-N : un utilisateur peut cumuler des rôles)
-- ---------------------------------------------------------------------
create table public.user_roles (
  user_id     uuid not null references public.utilisateurs(id) on delete restrict,
  immeuble_id uuid not null references public.immeubles(id)    on delete restrict,
  role        text not null check (role in ('syndic','vice_syndic','tresorier','proprietaire','locataire')),
  date_debut  date not null default current_date,
  date_fin    date,
  primary key (user_id, immeuble_id, role, date_debut),
  check (date_fin is null or date_fin >= date_debut)
);

comment on table public.user_roles is 'Attribution historisée des rôles. date_fin NULL = rôle en cours';

create index idx_user_roles_user on public.user_roles(user_id) where date_fin is null;

-- ---------------------------------------------------------------------
-- occupations (lien utilisateur <-> logement : propriétaire / locataire)
-- ---------------------------------------------------------------------
create table public.occupations (
  id           uuid primary key default gen_random_uuid(),
  logement_id  uuid not null references public.logements(id)    on delete restrict,
  user_id      uuid not null references public.utilisateurs(id) on delete restrict,
  type         text not null check (type in ('proprietaire','locataire')),
  date_debut   date not null default current_date,
  date_fin     date,
  est_resident boolean not null default true,
  check (date_fin is null or date_fin >= date_debut)
);

comment on table public.occupations is 'Qui occupe/possède quel logement. Seuls les propriétaires actifs votent';

create index idx_occupations_user     on public.occupations(user_id)     where date_fin is null;
create index idx_occupations_logement on public.occupations(logement_id) where date_fin is null;
-- Un logement ne peut avoir qu'un seul propriétaire actif à la fois
create unique index uniq_proprietaire_actif
  on public.occupations(logement_id)
  where type = 'proprietaire' and date_fin is null;
