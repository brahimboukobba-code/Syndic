-- =====================================================================
-- Données de test pour le Sprint 2 (Finances)
-- À exécuter dans le SQL Editor de Supabase APRÈS avoir créé votre
-- compte syndic (Sprint 1, étape 6).
--
-- Ce script crée quelques cotisations (dont une en retard) et configure
-- le seuil de validation pour que vous puissiez tester la double
-- validation des grosses dépenses.
-- =====================================================================

-- 1. S'assurer que le seuil de validation est bien à 5000 MAD
update public.immeubles
set seuil_validation_depense = 5000
where id = '11111111-1111-1111-1111-111111111111';

-- 2. Créer des cotisations de test pour le 2e trimestre,
--    dont une explicitement EN RETARD pour voir le bandeau d'alerte.
insert into public.cotisations
  (exercice_id, logement_id, periode, montant, date_echeance, statut, date_paiement)
select
  '33333333-3333-3333-3333-333333333333',
  l.id,
  '2026-Q2',
  1500.00,
  '2026-06-30',
  case
    when l.numero = 'Apt 1' then 'paye'
    when l.numero = 'Apt 2' then 'retard'   -- <-- déclenche le bandeau rouge
    else 'a_payer'
  end,
  case when l.numero = 'Apt 1' then date '2026-06-10' else null end
from public.logements l
where l.immeuble_id = '11111111-1111-1111-1111-111111111111'
on conflict (exercice_id, logement_id, periode) do nothing;

-- 3. (Optionnel) Forcer une cotisation existante en retard si la date est passée
update public.cotisations
set statut = 'retard'
where exercice_id = '33333333-3333-3333-3333-333333333333'
  and statut = 'a_payer'
  and date_echeance < current_date;

-- Vérification : voir l'état des cotisations
select l.numero, c.periode, c.montant, c.statut, c.date_echeance
from public.cotisations c
join public.logements l on l.id = c.logement_id
where c.exercice_id = '33333333-3333-3333-3333-333333333333'
order by l.numero, c.periode;
