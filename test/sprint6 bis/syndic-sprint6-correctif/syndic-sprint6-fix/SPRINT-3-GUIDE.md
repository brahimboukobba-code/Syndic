# Sprint 3 — Tableau de bord enrichi

Ce sprint transforme la page d'accueil en véritable tableau de bord :
compteurs légaux (mandat syndic, prochaine AG), synthèse financière,
graphique des dépenses par catégorie, et aperçu des dernières opérations.

---

## Étape 1 — Remplacer les fichiers

Décompressez l'archive et copiez son contenu dans
`C:\Users\brahi\Desktop\Syndic`, **en écrasant** les fichiers existants.
Votre `.env.local` n'est pas dans l'archive : il reste intact.

Nouveaux fichiers :
- `src/components/DonutChart.jsx` — graphique en anneau (SVG, sans librairie)
- `src/lib/useDashboard.js` — charge mandat, AG, finances en une fois

Fichiers modifiés :
- `src/pages/Dashboard.jsx` — le nouveau tableau de bord complet
- `src/lib/format.js` — ajout du calcul des jours restants
- `src/components/ui.jsx` — ajout du composant AlertBanner
- `src/i18n/fr.json` et `src/i18n/ar.json` — nouvelles traductions

Aucune nouvelle dépendance : pas besoin de relancer `npm install`.

## Étape 2 — Charger les données de test

Dans le SQL Editor de Supabase, exécutez `SPRINT-3-DONNEES-TEST.sql`.
Il crée une AG déjà tenue (avec PV de démo) pour alimenter le compteur AG.
Le mandat du syndic existe déjà depuis le Sprint 1.

## Étape 3 — Lancer l'app

```powershell
cd C:\Users\brahi\Desktop\Syndic
npm run dev
```

Connectez-vous : la page d'accueil affiche maintenant le tableau de bord complet.

---

## Tests de fin de Sprint 3 — checklist

### Compteurs légaux
- [ ] Le bloc **Mandat du syndic** affiche la date du dernier vote et le
      temps restant, avec une barre de progression
- [ ] Le bloc **Prochaine AG** affiche la date de la dernière AG et le
      bouton « Télécharger le PV »
- [ ] (Test alerte) En exécutant la requête commentée du script qui met
      la fin de mandat à +45 jours, un **bandeau orange** apparaît en haut.
      Pensez à remettre la valeur normale ensuite.

### Synthèse financière
- [ ] Les 4 indicateurs s'affichent : solde, cotisations payées/total,
      impayés, dépenses du mois
- [ ] Les chiffres correspondent à ce que vous avez saisi au Sprint 2

### Graphique
- [ ] Le **donut des dépenses par catégorie** s'affiche avec les couleurs
      des catégories, les pourcentages et les montants
- [ ] Si aucune dépense validée : un message « Aucune dépense à afficher »

### Activité
- [ ] Le bloc **Dernières opérations** liste les 5 dernières actions
- [ ] Le lien « Tout voir » mène à la page Historique

### Bilingue et thème
- [ ] En arabe (ع), le tableau de bord passe en RTL et les libellés sont traduits
- [ ] Le dark mode reste lisible (cartes, donut, bandeaux)

Quand la checklist est complète, le Sprint 3 est validé. On passe au
**Sprint 4** : les projets de rénovation et le système de vote
(vote de principe aux 3/4, collecte de devis, vote sur devis).

---

## En cas de souci

- **Le compteur Mandat affiche « Aucun mandat »** : le mandat n'a pas été
  créé au Sprint 1 (étape 6b). Vérifiez la table `mandats_syndic`.
- **Le bouton « Télécharger le PV » donne une erreur** : c'est normal avec
  les données de test — le PV est fictif. Un vrai PV sera uploadé au Sprint 5.
- **Le donut est vide** : il faut au moins une dépense au statut « validée ».
  Ajoutez-en une au besoin (module Finances).
- **Page blanche après mise à jour** : vérifiez la console du navigateur (F12).
  Le plus souvent, un fichier n'a pas été copié — recopiez tout le dossier `src`.
