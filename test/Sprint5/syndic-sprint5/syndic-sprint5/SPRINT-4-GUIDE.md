# Sprint 4 — Projets de rénovation et système de vote

Ce sprint ajoute le module le plus riche : création de projets, vote de
principe (seuil 3/4 paramétrable), collecte de devis par les habitants,
vote sur les devis, sélection automatique du gagnant, et commentaires.

---

## Étape 1 — Remplacer les fichiers

Décompressez l'archive dans `C:\Users\brahi\Desktop\Syndic`, en écrasant.
Votre `.env.local` reste intact.

Nouveaux fichiers :
- `src/lib/voteEngine.js` — dépouillement, clôture, transitions de phase
- `src/components/Comments.jsx` — commentaires sur les projets
- `src/components/QuoteForm.jsx` — proposition de devis
- `src/components/VoteResults.jsx` — barre de résultats avec jauge de seuil
- `src/components/ProjectDetail.jsx` — détail d'un projet (toutes phases)
- `src/pages/Projects.jsx` — liste et création de projets

Fichiers modifiés :
- `src/App.jsx` — branche la page Projets
- `src/i18n/fr.json` et `src/i18n/ar.json` — traductions

Aucune nouvelle dépendance : pas besoin de `npm install`.

## Étape 2 — Lancer l'app

```powershell
cd C:\Users\brahi\Desktop\Syndic
npm run dev
```

Pas de données de test SQL cette fois : vous allez créer un projet
directement dans l'interface.

---

## Comment fonctionne le cycle de vote

1. **Brouillon** : le syndic crée le projet (intitulé + détails).
2. **Vote de principe** : le syndic ouvre le vote (clôture auto dans 7 jours).
   Les propriétaires votent Pour / Contre / Abstention. 1 logement = 1 voix.
3. À la clôture (manuelle ou auto), si OUI ≥ 75 % des votants → **collecte
   de devis**. Sinon → **refusé**.
4. **Collecte de devis** : tous les habitants peuvent proposer un devis (PDF).
5. **Vote sur devis** : le syndic ouvre le vote, les propriétaires choisissent
   un devis. À la clôture, le devis le plus voté est **accepté** (gagnant).
6. **Commentaires** : possibles à toutes les phases.

> **Clôture automatique sans serveur** : il n'y a pas de tâche planifiée
> (qui coûterait de l'argent). À la place, quand quelqu'un ouvre un projet
> dont la date limite est passée, l'app clôture le vote automatiquement.
> C'est transparent pour l'utilisateur.

> **Seuil paramétrable** : par défaut 75 % des votants. Pour changer le seuil
> d'un projet, ajustez `seuil_acceptation` dans la table `projets` (ex. 0.5
> pour 50 %). Pour passer au calcul « 3/4 des logements totaux » (Art. 21
> strict), voir le commentaire `[SEUIL-STRICT]` dans `src/lib/voteEngine.js`.

---

## Tests de fin de Sprint 4 — checklist

### Création et vote de principe
- [ ] En tant que syndic, créer un projet (bouton « + Nouveau projet »)
- [ ] Ouvrir le projet : il est en phase « Brouillon » avec un bouton
      « Ouvrir le vote de principe »
- [ ] Ouvrir le vote : la phase passe à « Vote de principe » avec une date
      de clôture affichée
- [ ] Voter Pour : votre vote est enregistré, les résultats se mettent à jour
- [ ] Tenter de revoter : impossible (vous avez déjà voté)
- [ ] La jauge de seuil montre le % de OUI par rapport au seuil de 75 %

### Transition
- [ ] Cliquer « Clôturer le vote maintenant » : si OUI ≥ 75 %, le projet
      passe en « Collecte de devis » ; sinon « Refusé »

### Devis
- [ ] En phase collecte, ajouter un devis avec un document PDF
- [ ] Le devis apparaît avec son montant et le nom du proposant
- [ ] Le syndic ouvre le vote sur les devis (bouton dédié)
- [ ] Voter pour un devis ; le compteur de voix s'incrémente
- [ ] Le syndic clôture : le devis le plus voté est marqué « Devis retenu »

### Commentaires
- [ ] Ajouter un commentaire sur un projet ; il s'affiche avec votre nom

### Bilingue et thème
- [ ] En arabe, l'interface des projets passe en RTL
- [ ] Le dark mode reste lisible

> **Note pour bien tester les votes** : avec un seul compte (vous), vous ne
> pouvez émettre qu'une voix (un logement). Pour voir une vraie élection à
> plusieurs voix, il faudrait créer d'autres comptes propriétaires. Ce n'est
> pas nécessaire pour valider le sprint : l'essentiel est que votre vote
> compte, que le double vote soit bloqué, et que les transitions marchent.
> Si vous voulez simuler plusieurs votants, dites-le-moi et je vous donnerai
> un script.

Quand la checklist est complète, le Sprint 4 est validé. On passe au
**Sprint 5** : les réunions et assemblées générales (planification,
convocation, PV obligatoire en pièce jointe).

---

## En cas de souci

- **« Seuls les propriétaires peuvent voter »** : votre compte doit avoir
  le rôle `proprietaire` ET une occupation active. Le compte syndic créé au
  Sprint 1 a bien les deux.
- **Le bouton de vote n'apparaît pas** : soit vous avez déjà voté, soit le
  vote est clôturé, soit vous n'êtes pas propriétaire.
- **Erreur à l'envoi d'un devis** : vérifiez que le bucket `devis` existe
  (Supabase → Storage) et que le fichier fait moins de 5 Mo.
- **Le projet ne change pas de phase à la clôture** : rechargez la page
  (l'auto-clôture se déclenche au chargement du détail du projet).
