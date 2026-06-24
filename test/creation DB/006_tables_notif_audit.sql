-- =====================================================================
-- 006_tables_notif_audit.sql
-- Domaine Transverse : notifications, audit_log
-- =====================================================================

-- ---------------------------------------------------------------------
-- notifications (in-app, poussées via Realtime)
-- ---------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.utilisateurs(id) on delete cascade,
  type        text not null check (type in (
                'nouveau_projet','vote_ouvert','vote_ferme','etape_projet',
                'nouvelle_reunion','rappel_reunion','convocation_ag','pv_disponible',
                'nouvelle_annonce','cotisation_due','cotisation_retard','recu_disponible',
                'depense_ajoutee','depense_a_valider','reclamation_maj',
                'mandat_bientot_termine','ag_bientot_due')),
  titre       text not null,
  message     text not null,
  entite_type text,
  entite_id   uuid,
  lue         boolean not null default false,
  lue_le      timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is 'Une notification par utilisateur et par événement. Realtime pousse vers le client connecté';
create index idx_notifications_user   on public.notifications(user_id, lue);
create index idx_notifications_create on public.notifications(created_at);

-- ---------------------------------------------------------------------
-- audit_log (append-only : cœur de la transparence Art. 32)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  table_name     text not null,
  row_id         uuid not null,
  action         text not null check (action in ('insert','update','delete')),
  old_values     jsonb,
  new_values     jsonb,
  changed_fields text[],
  user_id        uuid references public.utilisateurs(id) on delete set null,
  user_role      text,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);

comment on table public.audit_log is 'Journal immuable de toutes les opérations sensibles. Aucun rôle ne peut le modifier (RLS deny)';
create index idx_audit_table  on public.audit_log(table_name, row_id);
create index idx_audit_user   on public.audit_log(user_id);
create index idx_audit_create on public.audit_log(created_at);
