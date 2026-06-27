# Sprint 5 — Réunions et assemblées générales

Ce sprint ajoute la gestion des réunions et AG : planification, convocation
15 jours avant, confirmation de présence par les habitants, pointage le jour J
par le syndic, et PV obligatoire en pièce jointe pour clôturer une AG.

Il corrige aussi un point du Sprint 4 : dans le formulaire « Proposer un
devis », l'intitulé est désormais **pré-rempli avec le nom du projet et
non modifiable**.

---

## Étape 1 — Remplacer les fichiers

Décompressez l'archive dans `C:\Users\brahi\Desktop\Syndic`, en écrasant.
Votre `.env.local` reste intact.

Nouveaux fichiers :
- `src/components/MeetingDetail.jsx` — détail d'une réunion (présence, PV…)
- `src/pages/Meetings.jsx` — liste et création des réunions

Fichiers modifiés :
- `src/App.jsx` — branche la page Réunions
- `src/components/QuoteForm.jsx` — intitulé pré-rempli et verrouillé
- `src/components/ProjectDetail.jsx` — passe l'intitulé au formulaire de devis
- `src/i18n/fr.json` et `src/i18n/ar.json` — traductions

Aucune nouvelle dépendance : pas besoin de `npm install`.

## Étape 2 — Lancer l'app

```powershell
cd C:\Users\brahi\Desktop\Syndic
npm run dev
```

Pas de script SQL : vous créez les réunions dans l'interface.

---

## Comment fonctionne le module

1. Le syndic crée une réunion (type, titre, date, lieu, ordre du jour).
2. Il **envoie la convocation** (statut → convocation envoyée). Pour une AG,
   un rappel s'affiche si on est à moins de 15 jours de la date (Art. 16quinquies).
3. Chaque habitant **confirme sa présence** (Je viens / Absent).
4. Le jour J, le syndic fait le **pointage** (présent / absent par personne).
5. À la clôture :
   - **AG** : le syndic doit **téléverser le PV** ; l'upload clôture la réunion
     (la base refuse de clôturer une AG sans PV — règle déjà en place).
   - **Réunion simple** : bouton « Clôturer » sans PV obligatoire.
6. Le **PV devient téléchargeable par tous** les habitants.

---

## Tests de fin de Sprint 5 — checklist

### Création et convocation
- [ ] En tant que syndic, créer une AG ordinaire (date dans quelques jours)
- [ ] L'ouvrir : envoyer la convocation → statut « Convocation envoyée »
- [ ] Si la date est à moins de 15 jours, un bandeau orange d'avertissement s'affiche

### Présence
- [ ] Confirmer votre présence (« Je viens ») : le compteur de confirmés augmente
- [ ] Changer pour « Absent » : le statut se met à jour
- [ ] La liste « Présence des habitants » montre votre statut

### Pointage et clôture (PV obligatoire)
- [ ] En tant que syndic, faire le pointage (présent/absent)
- [ ] Tenter de clôturer l'AG : il faut téléverser un PV (PDF ou image)
- [ ] Après upload du PV, l'AG passe en « Tenue » et le PV est téléchargeable
- [ ] Vérifier que sans PV, impossible de clôturer une AG (c'est garanti par la base)

### Réunion simple (sans PV)
- [ ] Créer une « Réunion de travail » : le bouton « Clôturer » fonctionne
      directement, sans exiger de PV

### Tableau de bord
- [ ] Après avoir tenu une AG avec PV, le compteur AG du tableau de bord
      se met à jour et le bouton « Télécharger le PV » fonctionne avec ce vrai PV

### Correction devis (Sprint 4)
- [ ] Sur un projet en collecte de devis, ouvrir « Proposer un devis » :
      l'intitulé est pré-rempli avec le nom du projet et grisé (non modifiable)

### Bilingue et thème
- [ ] En arabe, l'interface des réunions passe en RTL
- [ ] Le dark mode reste lisible

Quand la checklist est complète, le Sprint 5 est validé. On passe au
**Sprint 6** : annonces, réclamations et notifications en temps réel.

---

## En cas de souci

- **« Le PV est obligatoire… »** au moment de clôturer une AG : c'est le
  comportement attendu. Téléversez un PV pour clôturer.
- **Erreur à l'upload du PV** : vérifiez que le bucket `pv` existe
  (Supabase → Storage) et que le fichier fait moins de 5 Mo.
- **Le bouton « Nouvelle réunion » n'apparaît pas** : seuls le syndic et le
  vice-syndic peuvent créer des réunions.
- **La confirmation de présence ne s'enregistre pas** : rechargez et
  vérifiez la console (F12). Cela ne devrait pas arriver, signalez-le sinon.
