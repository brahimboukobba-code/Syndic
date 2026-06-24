-- =====================================================================
-- 012_seed.sql
-- Données de démonstration : 1 immeuble, 5 logements, 1 exercice.
--
-- IMPORTANT : les utilisateurs réels doivent d'abord exister dans
-- auth.users (créés via la console Supabase ou l'invitation magic-link).
-- Ce seed crée la structure (immeuble, logements, catégories, exercice)
-- et, si des UUID d'utilisateurs sont fournis, les rattache.
--
-- Pour un seed SANS utilisateurs (structure seule), laisser les blocs
-- "utilisateurs" commentés. Pour un seed complet de DEV, créer d'abord
-- les comptes dans Auth puis remplacer les UUID ci-dessous.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Immeuble
-- ---------------------------------------------------------------------
insert into public.immeubles (id, nom, adresse, nombre_logements, devise, banque, seuil_validation_depense, date_creation_syndicat)
values (
  '11111111-1111-1111-1111-111111111111',
  'Résidence Al Andalous',
  '12 Avenue Mohammed V, Rabat',
  5,
  'MAD',
  'Attijariwafa Bank',
  5000.00,
  '2020-01-15'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Logements
-- ---------------------------------------------------------------------
insert into public.logements (id, immeuble_id, numero, etage, superficie_m2, tantiemes) values
  ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Apt 1', 0, 85.0, 1),
  ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Apt 2', 1, 90.0, 1),
  ('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Apt 3', 1, 90.0, 1),
  ('22222222-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Apt 4', 2, 110.0, 1),
  ('22222222-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Apt 5', 2, 110.0, 1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Catégories de dépenses
-- ---------------------------------------------------------------------
insert into public.categories_depenses (immeuble_id, nom_fr, nom_ar, couleur) values
  ('11111111-1111-1111-1111-111111111111', 'Eau',          'الماء',      '#2E86C1'),
  ('11111111-1111-1111-1111-111111111111', 'Électricité',  'الكهرباء',   '#F1C40F'),
  ('11111111-1111-1111-1111-111111111111', 'Gardiennage',  'الحراسة',    '#7D3C98'),
  ('11111111-1111-1111-1111-111111111111', 'Ascenseur',    'المصعد',     '#E67E22'),
  ('11111111-1111-1111-1111-111111111111', 'Nettoyage',    'النظافة',    '#27AE60'),
  ('11111111-1111-1111-1111-111111111111', 'Sécurité',     'الأمن',      '#C0392B'),
  ('11111111-1111-1111-1111-111111111111', 'Réparations',  'الإصلاحات',  '#16A085'),
  ('11111111-1111-1111-1111-111111111111', 'Espaces verts','المساحات الخضراء', '#229954')
on conflict (immeuble_id, nom_fr) do nothing;

-- ---------------------------------------------------------------------
-- Exercice en cours
-- ---------------------------------------------------------------------
insert into public.exercices (id, immeuble_id, libelle, date_debut, date_fin, budget_previsionnel, statut)
values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Exercice 2026',
  '2026-01-01',
  '2026-12-31',
  120000.00,
  'en_cours'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- BLOC UTILISATEURS (à dé-commenter après création dans auth.users)
-- ---------------------------------------------------------------------
-- Exemple : si le compte syndic a l'UUID 'aaaa...', exécuter :
--
-- insert into public.utilisateurs (id, nom_complet, telephone, langue_preferee)
-- values ('7c0f6495-387b-4945-8878-2be1832aec65', 'Youssef Syndic', '+212600000000', 'fr')
-- on conflict (id) do nothing;
--
-- insert into public.user_roles (user_id, immeuble_id, role)
-- values ('7c0f6495-387b-4945-8878-2be1832aec65', '11111111-1111-1111-1111-111111111111', 'syndic'),
--        ('7c0f6495-387b-4945-8878-2be1832aec65', '11111111-1111-1111-1111-111111111111', 'proprietaire');
--
-- insert into public.occupations (logement_id, user_id, type)
-- values ('22222222-0000-0000-0000-000000000001', '7c0f6495-387b-4945-8878-2be1832aec65', 'proprietaire');
--
-- insert into public.mandats_syndic (immeuble_id, syndic_id, date_election, date_fin_mandat, pourcentage_obtenu, statut)
-- values ('11111111-1111-1111-1111-111111111111', '7c0f6495-387b-4945-8878-2be1832aec65',
--         current_date - interval '6 months', current_date + interval '18 months', 80.00, 'en_cours');
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Cotisations de démo (trimestrielles, par logement)
-- ---------------------------------------------------------------------
insert into public.cotisations (exercice_id, logement_id, periode, montant, date_echeance, statut, date_paiement)
select
  '33333333-3333-3333-3333-333333333333',
  l.id,
  '2026-Q1',
  1500.00,
  '2026-03-31',
  case when l.numero in ('Apt 1','Apt 2','Apt 4') then 'paye' else 'a_payer' end,
  case when l.numero in ('Apt 1','Apt 2','Apt 4') then date '2026-03-15' else null end
from public.logements l
where l.immeuble_id = '11111111-1111-1111-1111-111111111111'
on conflict (exercice_id, logement_id, periode) do nothing;

-- Note : les dépenses de démo nécessitent un created_by valide (utilisateur).
-- Elles sont donc à insérer après le bloc utilisateurs, via l'application.
