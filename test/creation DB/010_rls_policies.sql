-- =====================================================================
-- 010_rls_policies.sql
-- Row Level Security : deny par défaut, puis policies explicites.
-- Principe OWASP A01 : contrôle d'accès au plus près de la donnée.
--
-- Conventions :
--   - Lecture (SELECT) : tout membre de l'immeuble (transparence Art. 32)
--     sauf données personnelles d'autrui (téléphone).
--   - Écriture : restreinte par rôle via app.has_role().
--   - audit_log et votes : immuables (pas d'UPDATE/DELETE).
-- =====================================================================

-- Activer RLS partout
alter table public.immeubles            enable row level security;
alter table public.logements            enable row level security;
alter table public.utilisateurs         enable row level security;
alter table public.user_roles           enable row level security;
alter table public.occupations          enable row level security;
alter table public.exercices            enable row level security;
alter table public.cotisations          enable row level security;
alter table public.categories_depenses  enable row level security;
alter table public.depenses             enable row level security;
alter table public.projets              enable row level security;
alter table public.devis                enable row level security;
alter table public.votes                enable row level security;
alter table public.commentaires         enable row level security;
alter table public.reunions             enable row level security;
alter table public.reunion_participations enable row level security;
alter table public.mandats_syndic       enable row level security;
alter table public.annonces             enable row level security;
alter table public.reclamations         enable row level security;
alter table public.sondages             enable row level security;
alter table public.sondage_reponses     enable row level security;
alter table public.notifications        enable row level security;
alter table public.audit_log            enable row level security;

-- Forcer la RLS même pour le propriétaire des tables (défense en profondeur)
alter table public.depenses     force row level security;
alter table public.cotisations  force row level security;
alter table public.votes        force row level security;
alter table public.audit_log    force row level security;

-- =====================================================================
-- IMMEUBLES
-- =====================================================================
create policy immeubles_select on public.immeubles
  for select using (app.is_member(id));

create policy immeubles_update on public.immeubles
  for update using (app.has_role(id, array['syndic','vice_syndic']))
  with check    (app.has_role(id, array['syndic','vice_syndic']));
-- INSERT/DELETE d'un immeuble : réservé au service_role (console), pas d'utilisateur final.

-- =====================================================================
-- LOGEMENTS
-- =====================================================================
create policy logements_select on public.logements
  for select using (app.is_member(immeuble_id));

create policy logements_write on public.logements
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- =====================================================================
-- UTILISATEURS
--   - chacun lit son propre profil complet ;
--   - les membres lisent les profils via une vue filtrée (sans téléphone)
--     exposée en 011 ; ici on autorise la lecture de base de la ligne,
--     le masquage du téléphone se fait par une vue + révocation colonne.
--   - le syndic gère les profils.
-- =====================================================================
create policy utilisateurs_select_self on public.utilisateurs
  for select using (id = auth.uid());

create policy utilisateurs_select_members on public.utilisateurs
  for select using (
    exists (
      select 1
      from public.user_roles ur_me
      join public.user_roles ur_them on ur_them.immeuble_id = ur_me.immeuble_id
      where ur_me.user_id = auth.uid() and ur_me.date_fin is null
        and ur_them.user_id = public.utilisateurs.id
    )
    or exists (
      select 1
      from public.occupations o_me
      join public.logements   l_me on l_me.id = o_me.logement_id
      join public.occupations o_them on o_them.user_id = public.utilisateurs.id
      join public.logements   l_them on l_them.id = o_them.logement_id
      where o_me.user_id = auth.uid() and o_me.date_fin is null
        and l_them.immeuble_id = l_me.immeuble_id
    )
  );

create policy utilisateurs_update_self on public.utilisateurs
  for update using (id = auth.uid())
  with check (id = auth.uid() and statut = 'actif');  -- l'utilisateur ne se désactive pas lui-même

create policy utilisateurs_write_syndic on public.utilisateurs
  for all using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.date_fin is null
        and ur.role in ('syndic','vice_syndic')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.date_fin is null
        and ur.role in ('syndic','vice_syndic')
    )
  );

-- =====================================================================
-- USER_ROLES (gérés par le syndic)
-- =====================================================================
create policy user_roles_select on public.user_roles
  for select using (app.is_member(immeuble_id) or user_id = auth.uid());

create policy user_roles_write on public.user_roles
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- =====================================================================
-- OCCUPATIONS (gérées par le syndic)
-- =====================================================================
create policy occupations_select on public.occupations
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.logements l
      where l.id = occupations.logement_id and app.is_member(l.immeuble_id)
    )
  );

create policy occupations_write on public.occupations
  for all using (
    exists (
      select 1 from public.logements l
      where l.id = occupations.logement_id
        and app.has_role(l.immeuble_id, array['syndic','vice_syndic'])
    )
  )
  with check (
    exists (
      select 1 from public.logements l
      where l.id = occupations.logement_id
        and app.has_role(l.immeuble_id, array['syndic','vice_syndic'])
    )
  );

-- =====================================================================
-- EXERCICES
-- =====================================================================
create policy exercices_select on public.exercices
  for select using (app.is_member(immeuble_id));

create policy exercices_write on public.exercices
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- =====================================================================
-- COTISATIONS (lecture tous ; écriture syndic/vice/trésorier)
-- =====================================================================
create policy cotisations_select on public.cotisations
  for select using (
    app.is_member(app.immeuble_of_exercice(exercice_id))
  );

create policy cotisations_write on public.cotisations
  for all using (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier'])
  )
  with check (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier'])
  );

-- =====================================================================
-- CATEGORIES_DEPENSES
-- =====================================================================
create policy categories_select on public.categories_depenses
  for select using (app.is_member(immeuble_id));

create policy categories_write on public.categories_depenses
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic','tresorier']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic','tresorier']));

-- =====================================================================
-- DEPENSES
--   - lecture : tous les membres (transparence) ;
--   - insert/update : syndic, vice, trésorier ;
--   - jamais de DELETE physique (soft delete via statut).
-- =====================================================================
create policy depenses_select on public.depenses
  for select using (app.is_member(app.immeuble_of_exercice(exercice_id)));

create policy depenses_insert on public.depenses
  for insert with check (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier'])
  );

create policy depenses_update on public.depenses
  for update using (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier'])
  )
  with check (
    app.has_role(app.immeuble_of_exercice(exercice_id), array['syndic','vice_syndic','tresorier'])
  );

-- pas de policy DELETE -> DELETE interdit par défaut (deny)

-- =====================================================================
-- PROJETS
--   - lecture : tous ; création/gestion : syndic/vice.
-- =====================================================================
create policy projets_select on public.projets
  for select using (app.is_member(immeuble_id));

create policy projets_write on public.projets
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- =====================================================================
-- DEVIS
--   - lecture : tous ;
--   - insert : tout membre (proprio ou locataire) pendant collecte_devis ;
--   - update/delete : l'auteur (retrait) ou syndic/vice.
-- =====================================================================
create policy devis_select on public.devis
  for select using (
    exists (select 1 from public.projets p where p.id = devis.projet_id and app.is_member(p.immeuble_id))
  );

create policy devis_insert on public.devis
  for insert with check (
    propose_par = auth.uid()
    and exists (
      select 1 from public.projets p
      where p.id = devis.projet_id
        and app.is_member(p.immeuble_id)
        and p.phase = 'collecte_devis'
    )
  );

create policy devis_update on public.devis
  for update using (
    propose_par = auth.uid()
    or exists (select 1 from public.projets p where p.id = devis.projet_id and app.has_role(p.immeuble_id, array['syndic','vice_syndic']))
  )
  with check (
    propose_par = auth.uid()
    or exists (select 1 from public.projets p where p.id = devis.projet_id and app.has_role(p.immeuble_id, array['syndic','vice_syndic']))
  );

-- =====================================================================
-- VOTES (immuables : insert seulement, par propriétaire, scrutin ouvert)
-- =====================================================================
create policy votes_select on public.votes
  for select using (
    exists (select 1 from public.logements l where l.id = votes.logement_id and app.is_member(l.immeuble_id))
  );

create policy votes_insert on public.votes
  for insert with check (
    user_id = auth.uid()
    and app.is_proprietaire_of(logement_id)
    and app.scrutin_est_ouvert(scrutin_type, scrutin_id)
  );

-- pas de policy UPDATE/DELETE -> un vote est définitif

-- =====================================================================
-- COMMENTAIRES
--   - lecture : tous (selon entité rattachée à l'immeuble) ;
--   - insert : tout membre ;
--   - update/delete : auteur ; masquage : syndic/vice.
-- =====================================================================
create policy commentaires_select on public.commentaires
  for select using (
    exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.date_fin is null)
    or exists (select 1 from public.occupations o where o.user_id = auth.uid() and o.date_fin is null)
  );

create policy commentaires_insert on public.commentaires
  for insert with check (user_id = auth.uid());

create policy commentaires_update on public.commentaires
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.date_fin is null and ur.role in ('syndic','vice_syndic'))
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.date_fin is null and ur.role in ('syndic','vice_syndic'))
  );

-- =====================================================================
-- REUNIONS
-- =====================================================================
create policy reunions_select on public.reunions
  for select using (app.is_member(immeuble_id));

create policy reunions_write on public.reunions
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- =====================================================================
-- REUNION_PARTICIPATIONS
--   - lecture : membres ; chacun gère sa propre participation ;
--     le syndic gère toutes les participations.
-- =====================================================================
create policy participations_select on public.reunion_participations
  for select using (
    exists (select 1 from public.reunions r where r.id = reunion_participations.reunion_id and app.is_member(r.immeuble_id))
  );

create policy participations_self on public.reunion_participations
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy participations_syndic on public.reunion_participations
  for all using (
    exists (select 1 from public.reunions r where r.id = reunion_participations.reunion_id and app.has_role(r.immeuble_id, array['syndic','vice_syndic']))
  )
  with check (
    exists (select 1 from public.reunions r where r.id = reunion_participations.reunion_id and app.has_role(r.immeuble_id, array['syndic','vice_syndic']))
  );

-- =====================================================================
-- MANDATS_SYNDIC
-- =====================================================================
create policy mandats_select on public.mandats_syndic
  for select using (app.is_member(immeuble_id));

create policy mandats_write on public.mandats_syndic
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- =====================================================================
-- ANNONCES
-- =====================================================================
create policy annonces_select on public.annonces
  for select using (app.is_member(immeuble_id));

create policy annonces_write on public.annonces
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

-- =====================================================================
-- RECLAMATIONS
--   - lecture : tous les membres ;
--   - insert : tout membre (sa propre réclamation) ;
--   - update : l'auteur (tant qu'ouverte) ou syndic/vice (traitement).
-- =====================================================================
create policy reclamations_select on public.reclamations
  for select using (app.is_member(immeuble_id));

create policy reclamations_insert on public.reclamations
  for insert with check (user_id = auth.uid() and app.is_member(immeuble_id));

create policy reclamations_update on public.reclamations
  for update using (
    (user_id = auth.uid() and statut = 'ouverte')
    or app.has_role(immeuble_id, array['syndic','vice_syndic'])
  )
  with check (
    (user_id = auth.uid())
    or app.has_role(immeuble_id, array['syndic','vice_syndic'])
  );

-- =====================================================================
-- SONDAGES + REPONSES
-- =====================================================================
create policy sondages_select on public.sondages
  for select using (app.is_member(immeuble_id));

create policy sondages_write on public.sondages
  for all using (app.has_role(immeuble_id, array['syndic','vice_syndic']))
  with check    (app.has_role(immeuble_id, array['syndic','vice_syndic']));

create policy sondage_reponses_select on public.sondage_reponses
  for select using (
    exists (select 1 from public.sondages s where s.id = sondage_reponses.sondage_id and app.is_member(s.immeuble_id))
  );

create policy sondage_reponses_self on public.sondage_reponses
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.sondages s where s.id = sondage_reponses.sondage_id and s.statut = 'ouvert')
  );

-- =====================================================================
-- NOTIFICATIONS (chacun ne voit que les siennes)
-- =====================================================================
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_update on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- INSERT par les fonctions serveur (SECURITY DEFINER) / service_role.

-- =====================================================================
-- AUDIT_LOG (lecture pour tous les membres ; écriture interdite)
-- =====================================================================
create policy audit_select on public.audit_log
  for select using (
    exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.date_fin is null)
    or exists (select 1 from public.occupations o where o.user_id = auth.uid() and o.date_fin is null)
  );

-- aucune policy insert/update/delete -> écriture interdite à tous les rôles.
-- (les triggers d'audit écrivent en SECURITY DEFINER, hors RLS)
