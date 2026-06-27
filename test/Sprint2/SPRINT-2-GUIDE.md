# Sprint 2 — Transparence financière

Ce sprint ajoute le cœur de l'application : le module **Dépenses** (avec
double validation des grosses dépenses), le module **Cotisations** (suivi
payé/impayé avec bandeau d'alerte pour les retards), le téléversement des
**justificatifs**, et la page **Historique** (le journal d'audit visible
par tous).

---

## Étape 1 — Remplacer les fichiers

Décompressez cette archive et copiez son contenu dans
`C:\Users\brahi\Desktop\Syndic`, **en écrasant** les fichiers existants.

Nouveaux fichiers ajoutés :
- `src/lib/format.js` — formatage des montants en MAD et des dates
- `src/lib/storage.js` — téléversement sécurisé des justificatifs
- `src/lib/useExercice.js` — récupère l'exercice comptable en cours
- `src/components/ui.jsx` — Badge, Modal, Spinner
- `src/components/ProofLink.jsx` — lien sécurisé vers un justificatif
- `src/components/ExpenseForm.jsx` — formulaire d'ajout de dépense
- `src/components/ExpenseList.jsx` — liste des dépenses (cartes) + validation
- `src/components/ContributionList.jsx` — liste des cotisations
- `src/pages/Finances.jsx` — page Finances (onglets dépenses/cotisations)
- `src/pages/History.jsx` — page Historique (audit)

Fichiers modifiés :
- `src/App.jsx` — branche les pages Finances et Historique
- `src/i18n/fr.json` et `src/i18n/ar.json` — nouvelles traductions

> Astuce : votre `.env.local` n'est pas dans l'archive (il reste chez vous).
> Ne le supprimez pas en copiant les fichiers.

## Étape 2 — Vérifier les buckets de stockage

Dans Supabase, cliquez sur **Storage** (barre de gauche). Vous devez voir
les buckets : `factures`, `recus`, `devis`, `pv`, `reclamations`, `reglement`.

- **Si vous les voyez** : parfait, rien à faire.
- **S'ils manquent** : réexécutez le fichier `011_storage_policies.sql`
  dans le SQL Editor.

## Étape 3 — Charger les données de test

Dans le SQL Editor, exécutez le fichier `SPRINT-2-DONNEES-TEST.sql` fourni.
Il crée des cotisations (dont une en retard, pour voir le bandeau rouge) et
fixe le seuil de validation à 5000 MAD.

## Étape 4 — Lancer l'app

```powershell
cd C:\Users\brahi\Desktop\Syndic
npm run dev
```

Connectez-vous avec votre compte syndic, puis ouvrez l'onglet **Finances**.

---

## Tests de fin de Sprint 2 — checklist

### Module Dépenses
- [ ] L'onglet Finances s'ouvre et affiche les KPIs (solde, total dépenses)
- [ ] Le bouton « + Ajouter une dépense » est visible (vous êtes syndic)
- [ ] Ajouter une **petite dépense** (< 5000 MAD) avec un justificatif PDF/image :
      elle apparaît directement avec le statut **Validée** (vert)
- [ ] Ajouter une **grosse dépense** (> 5000 MAD, ex. 12000) :
      elle apparaît avec le statut **En attente de validation** (orange)
      et deux badges « Attente syndic » / « Attente vice-syndic »
- [ ] Cliquer **Valider** sur la grosse dépense (en tant que syndic) :
      le badge « Attente syndic » passe au vert ✓
- [ ] Le justificatif s'ouvre quand on clique sur « Voir le justificatif »
- [ ] Tenter d'ajouter une dépense **sans justificatif** est refusé

> Pour tester la **double** validation complète (syndic ET vice-syndic),
> il faut un second compte avec le rôle vice_syndic. On pourra le faire,
> mais ce n'est pas obligatoire pour valider le sprint : l'essentiel est
> que la première signature fonctionne et que le statut reste « en attente »
> tant que la seconde manque.

### Module Cotisations
- [ ] L'onglet Cotisations affiche la liste par logement
- [ ] Le **bandeau rouge d'alerte** s'affiche en haut (grâce à la cotisation
      en retard du script de test) avec le nombre et le montant impayé
- [ ] Le bouton « Marquer payée » fonctionne et la cotisation passe au vert

### Historique
- [ ] La page Historique liste toutes les opérations récentes
- [ ] Chaque ajout de dépense/paiement apparaît avec qui, quoi, quand
- [ ] Une dépense supprimée (si vous en supprimez une) apparaît barrée

### Bilingue et thème
- [ ] En arabe (bouton ع), toute l'interface Finances passe en RTL
- [ ] Le dark mode reste lisible sur toutes les cartes

Quand la checklist est complète, le Sprint 2 est validé. On passe au
**Sprint 3** : le tableau de bord enrichi avec les compteurs légaux
(mandat syndic, prochaine AG) et les graphiques.

---

## En cas de souci

- **« Aucune dépense enregistrée »** alors que vous venez d'en ajouter :
  vérifiez que vous êtes bien sur le bon exercice (2026) et rechargez.
- **Erreur à l'upload du justificatif** : vérifiez que le bucket `factures`
  existe (étape 2) et que le fichier fait moins de 5 Mo.
- **Le bouton Ajouter n'apparaît pas** : votre compte doit avoir le rôle
  syndic, vice_syndic ou tresorier. Vérifiez `user_roles` dans Supabase.
- **La grosse dépense passe directement en « validée »** : le seuil n'est
  pas configuré. Réexécutez l'étape 3 (script de test).
