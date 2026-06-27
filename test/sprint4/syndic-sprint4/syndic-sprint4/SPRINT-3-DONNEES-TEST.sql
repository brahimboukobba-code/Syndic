-- =====================================================================
-- Données de test pour le Sprint 3 (Tableau de bord)
-- À exécuter dans le SQL Editor de Supabase.
--
-- Ce script crée une assemblée générale "tenue" avec un PV, pour que
-- le compteur AG du tableau de bord ait quelque chose à afficher.
-- Le mandat du syndic existe déjà (créé au Sprint 1).
-- =====================================================================

-- 1. Une AG ordinaire déjà tenue, il y a 8 mois, AVEC un PV.
--    (On met une URL de PV fictive ; le bouton de téléchargement
--     s'affichera mais le fichier n'existe pas réellement. Pour un vrai
--     PV, vous l'uploaderez via l'app au Sprint 5.)
insert into public.reunions
  (id, immeuble_id, type, titre, ordre_du_jour, date_prevue, lieu,
   statut, pv_url, pv_uploaded_at, created_by)
select
  '77777777-0000-0000-0000-0000000000a1',
  '11111111-1111-1111-1111-111111111111',
  'ag_ordinaire',
  'Assemblée générale ordinaire 2025',
  'Approbation des comptes 2025, budget 2026, questions diverses',
  (current_date - interval '8 months'),
  'Hall de la résidence',
  'tenue',
  'pv/ag-2025-demo.pdf',
  (current_date - interval '8 months'),
  syndic_id
from public.mandats_syndic
where immeuble_id = '11111111-1111-1111-1111-111111111111'
  and statut = 'en_cours'
limit 1
on conflict (id) do nothing;

-- 2. Vérification : voir le mandat et l'AG
select 'MANDAT' as type, to_char(date_election,'YYYY-MM-DD') as date_debut,
       to_char(date_fin_mandat,'YYYY-MM-DD') as date_fin,
       (date_fin_mandat - current_date) as jours_restants
from public.mandats_syndic
where immeuble_id = '11111111-1111-1111-1111-111111111111' and statut = 'en_cours'
union all
select 'AG', to_char(date_prevue,'YYYY-MM-DD'), pv_url, null
from public.reunions
where immeuble_id = '11111111-1111-1111-1111-111111111111' and type = 'ag_ordinaire';

-- ---------------------------------------------------------------------
-- POUR TESTER LES ALERTES (optionnel) :
--
-- Tester l'alerte "mandat bientôt terminé" (bandeau orange) :
--   update public.mandats_syndic
--   set date_fin_mandat = current_date + interval '45 days'
--   where statut = 'en_cours';
--
-- Revenir à la normale :
--   update public.mandats_syndic
--   set date_fin_mandat = date_election + interval '2 years'
--   where statut = 'en_cours';
-- ---------------------------------------------------------------------
