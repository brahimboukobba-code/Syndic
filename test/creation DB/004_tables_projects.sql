-- =====================================================================
-- 004_tables_projects.sql
-- Domaine Projets : projets, devis, votes, commentaires
-- =====================================================================

-- ---------------------------------------------------------------------
-- projets (rénovation, avec cycle de vie en phases)
-- ---------------------------------------------------------------------
create table public.projets (
  id                         uuid primary key default gen_random_uuid(),
  immeuble_id                uuid not null references public.immeubles(id) on delete restrict,
  intitule                   text not null,
  details_travaux            text not null,
  phase                      text not null default 'brouillon'
                               check (phase in ('brouillon','vote_principe','collecte_devis',
                                                'vote_devis','accepte','refuse','realise','annule')),
  seuil_acceptation          numeric(3,2) not null default 0.75 check (seuil_acceptation > 0 and seuil_acceptation <= 1),
  date_ouverture_vote        timestamptz,
  date_cloture_vote          timestamptz,
  date_ouverture_vote_devis  timestamptz,
  date_cloture_vote_devis    timestamptz,
  devis_gagnant_id           uuid,  -- FK ajoutée plus bas (après devis)
  statut                     text not null default 'actif' check (statut in ('actif','archive')),
  created_at                 timestamptz not null default now(),
  created_by                 uuid references public.utilisateurs(id) on delete set null,
  check (date_cloture_vote is null or date_ouverture_vote is null or date_cloture_vote > date_ouverture_vote)
);

comment on table public.projets is 'Projet de rénovation. Vote de principe (3/4) puis vote sur devis. Chaque transition notifie tous les habitants';
create index idx_projets_immeuble on public.projets(immeuble_id);
create index idx_projets_phase    on public.projets(phase);

-- FK différée depenses -> projets (la table depenses existait avant projets)
alter table public.depenses
  add constraint fk_depenses_projet
  foreign key (projet_id) references public.projets(id) on delete set null;

-- ---------------------------------------------------------------------
-- devis (proposés par tout habitant pendant la phase collecte_devis)
-- ---------------------------------------------------------------------
create table public.devis (
  id                  uuid primary key default gen_random_uuid(),
  projet_id           uuid not null references public.projets(id) on delete cascade,
  intitule            text not null,
  prestataire         text not null,
  montant             numeric(10,2) not null check (montant >= 0),
  delai_estime_jours  int check (delai_estime_jours is null or delai_estime_jours > 0),
  details             text,
  document_url        text not null,
  propose_par         uuid references public.utilisateurs(id) on delete set null,
  statut              text not null default 'en_attente'
                        check (statut in ('en_attente','accepte','rejete','retire')),
  created_at          timestamptz not null default now(),
  check (length(document_url) > 0)
);

comment on table public.devis is 'Devis proposé pour un projet. Document PDF obligatoire';
create index idx_devis_projet on public.devis(projet_id);

-- FK différée projets -> devis (devis gagnant)
alter table public.projets
  add constraint fk_projets_devis_gagnant
  foreign key (devis_gagnant_id) references public.devis(id) on delete set null;

-- ---------------------------------------------------------------------
-- votes (table unique pour tous les scrutins ; 1 logement = 1 voix)
-- ---------------------------------------------------------------------
create table public.votes (
  id            uuid primary key default gen_random_uuid(),
  scrutin_type  text not null
                  check (scrutin_type in ('projet_principe','projet_devis','election_syndic','ag_decision')),
  scrutin_id    uuid not null,
  projet_id     uuid references public.projets(id) on delete cascade,
  user_id       uuid not null references public.utilisateurs(id) on delete restrict,
  logement_id   uuid not null references public.logements(id)    on delete restrict,
  choix         text not null check (choix in ('oui','non','abstention','devis_choisi')),
  devis_id      uuid references public.devis(id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- 1 logement = 1 voix par scrutin
  unique (scrutin_type, scrutin_id, logement_id),
  -- si on choisit un devis, l'id du devis est requis (et inversement)
  check ((choix = 'devis_choisi') = (devis_id is not null))
);

comment on table public.votes is 'Vote immuable. Anti-double-vote au niveau logement via contrainte UNIQUE';
create index idx_votes_scrutin on public.votes(scrutin_type, scrutin_id);
create index idx_votes_projet  on public.votes(projet_id);

-- ---------------------------------------------------------------------
-- commentaires (polymorphes : projet, devis, depense, annonce, reunion)
-- ---------------------------------------------------------------------
create table public.commentaires (
  id          uuid primary key default gen_random_uuid(),
  entite_type text not null check (entite_type in ('projet','devis','depense','annonce','reunion')),
  entite_id   uuid not null,
  user_id     uuid not null references public.utilisateurs(id) on delete restrict,
  contenu     text not null check (length(trim(contenu)) > 0),
  parent_id   uuid references public.commentaires(id) on delete cascade,
  statut      text not null default 'actif' check (statut in ('actif','masque','supprime')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

comment on table public.commentaires is 'Commentaire polymorphe. Le syndic peut masquer sans supprimer (transparence)';
create index idx_commentaires_entite on public.commentaires(entite_type, entite_id);
