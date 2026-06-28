# Correctif de sécurité — rôles et permissions

Un test a révélé deux bugs liés qui donnaient trop de droits aux habitants.
Ce correctif les referme. **À appliquer en priorité.**

## Les bugs trouvés

1. **L'app attribuait le mauvais rôle.** Connecté en tant que simple
   propriétaire, l'utilisateur héritait des rôles de TOUS les habitants
   (dont « syndic »), et voyait donc les boutons « Ajouter une dépense » et
   « Valider ». Cause : la requête des rôles ne filtrait pas sur
   l'utilisateur courant.

2. **La base laissait écrire un propriétaire.** Plus grave : même via accès
   direct, un propriétaire pouvait modifier une dépense. Les règles de
   sécurité (RLS) sur les tables sensibles n'étaient pas au bon niveau sur
   la base en ligne.

## Ce que corrige ce livrable

### Côté application (déjà dans le code)
`src/lib/AuthContext.jsx` : la requête des rôles filtre désormais sur
l'utilisateur connecté (`user_id = utilisateur courant`). Chacun ne voit
plus que SES propres rôles.

### Côté base (migration à exécuter)
`015_securite_rls.sql` remet les bonnes règles de sécurité sur toutes les
tables sensibles : dépenses, cotisations, projets, votes, réunions,
annonces. Après ce script :
- seuls **syndic / vice-syndic / trésorier** peuvent créer/modifier des
  dépenses et cotisations ;
- seuls **syndic / vice-syndic** peuvent créer des projets, réunions,
  annonces ;
- seuls les **propriétaires** peuvent voter, uniquement pour leur logement,
  et seulement si le scrutin est ouvert ;
- tout le monde garde la **lecture** (transparence).

Le script est **idempotent** (rejouable sans risque).

## Installation

1. **Base** : dans le SQL Editor de Supabase, exécutez `015_securite_rls.sql`.

2. **App** : remplacez le dossier par l'archive, puis :
   ```powershell
   git add .
   git commit -m "Correctif securite roles et permissions"
   git push
   ```

3. Videz le cache de l'app (fermez/rouvrez l'app installée).

## Vérification (ces tests ont été validés sur une base de test)

- [ ] Connecté en `proprio1@test.ma` : le rôle affiché est « Propriétaire »
      (plus « Syndic »)
- [ ] En propriétaire : PAS de bouton « Ajouter une dépense » ni « Valider »
- [ ] En `vicesyndic@test.ma` ou syndic : les boutons réapparaissent
- [ ] Un propriétaire peut voter sur un projet ; un locataire ne le peut pas
- [ ] La double validation (syndic + vice-syndic) fonctionne sur une grosse
      dépense

## Note importante

Cette protection au niveau de la base est la vraie barrière de sécurité.
L'interface (boutons masqués) n'est qu'un confort : même quelqu'un qui
contournerait l'app ne pourra plus écrire sans le bon rôle. C'est ainsi
qu'une application sérieuse protège les données.
