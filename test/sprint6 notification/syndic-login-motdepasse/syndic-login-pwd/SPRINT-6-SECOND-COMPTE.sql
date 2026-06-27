-- =====================================================================
-- Créer un SECOND compte de test (un voisin propriétaire)
-- Permet de tester les notifications de bout en bout : vous publiez
-- depuis le syndic, et la cloche du voisin s'allume.
-- =====================================================================
--
-- ÉTAPE 1 (dans l'interface Supabase, PAS ici) :
--   Authentication → Users → Add user → Create new user
--   - Email : une 2e adresse à vous (ex. un alias, ou un autre e-mail)
--   - Cochez "Auto Confirm User"
--   Copiez l'UUID du nouvel utilisateur.
--
-- ÉTAPE 2 : collez l'UUID ci-dessous (remplacez VOISIN_UUID partout),
--           puis exécutez ce script dans le SQL Editor.
-- =====================================================================

-- Profil du voisin
insert into public.utilisateurs (id, nom_complet, telephone, langue_preferee)
values ('VOISIN_UUID', 'Voisin Apt 2', '+212600000001', 'fr')
on conflict (id) do nothing;

-- Rôle : propriétaire (il pourra voter et recevoir les notifications)
insert into public.user_roles (user_id, immeuble_id, role)
values ('VOISIN_UUID', '11111111-1111-1111-1111-111111111111', 'proprietaire')
on conflict do nothing;

-- Rattachement à l'appartement 2
insert into public.occupations (logement_id, user_id, type)
values ('22222222-0000-0000-0000-000000000002', 'VOISIN_UUID', 'proprietaire')
on conflict do nothing;

-- Vérification
select u.nom_complet, ur.role, l.numero
from public.utilisateurs u
join public.user_roles ur on ur.user_id = u.id
join public.occupations o on o.user_id = u.id
join public.logements l on l.id = o.logement_id
where u.id = 'VOISIN_UUID';

-- =====================================================================
-- POUR TESTER :
--   1. Connectez-vous comme syndic dans un onglet (votre 1er compte).
--   2. Connectez-vous comme voisin dans un autre navigateur (ou fenêtre
--      privée) avec le 2e e-mail.
--   3. Publiez une annonce depuis le syndic.
--   4. La cloche du voisin s'incrémente en temps réel, sans recharger.
-- =====================================================================
