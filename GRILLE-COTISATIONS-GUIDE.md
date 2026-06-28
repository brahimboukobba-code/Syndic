# Création des cotisations — grille mensuelle

Nouvelle fonctionnalité : le syndic et le trésorier peuvent désormais
**créer et gérer les cotisations** directement depuis l'app, via une grille
mensuelle. Avant, il manquait tout moyen de créer une cotisation.

## Le principe

Une grille : **logements en lignes, 12 mois en colonnes**. Chaque case
représente la cotisation d'un logement pour un mois.

Le circuit (double validation, comme pour les grosses dépenses) :
1. **Case vide** (bordure pointillée) : pas encore déclarée. Le syndic ou
   le trésorier **clique** dessus pour déclarer la cotisation payée.
2. **Case orange** : déclarée, en attente de validation du trésorier.
3. **Case verte (✓)** : validée par le trésorier. La cotisation compte
   alors dans les recettes et le solde.

Le **trésorier** peut faire les deux étapes (déclarer ET valider). Le
**syndic / vice-syndic** peut déclarer ; c'est le trésorier qui valide.

Le **montant** est fixe (paramétrable en haut de la grille, modifiable au
besoin avant de cocher les cases).

## Installation

1. **Base** : exécutez `016_cotisations_workflow.sql` dans le SQL Editor de
   Supabase.
2. **App** : remplacez le dossier par l'archive, puis :
   ```powershell
   git add .
   git commit -m "Grille de cotisations mensuelles"
   git push
   ```

## Utilisation

- Connectez-vous en syndic ou trésorier → **Finances → onglet Cotisations**.
- La grille s'affiche. Réglez le **montant** si besoin (par défaut 1500).
- Cliquez sur une case vide pour **déclarer** la cotisation d'un logement
  pour un mois → elle devient orange.
- En trésorier, cliquez sur une case orange « Valider » → elle devient
  verte (payée).
- Pour **annuler** une déclaration, cliquez sur la case (orange ou verte).

Les habitants (propriétaires/locataires) voient toujours leurs cotisations
en lecture seule (liste classique), avec leur reçu une fois validée.

## Note

Une cotisation ne compte dans le **solde** et les **recettes** que
lorsqu'elle est **validée** (verte). Une cotisation simplement déclarée
(orange) reste en attente. C'est ce qui garantit que seul un paiement
confirmé par le trésorier entre dans les comptes.
