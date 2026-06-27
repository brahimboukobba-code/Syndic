# Sprint 6 — Annonces, réclamations et notifications

Ce sprint ajoute la communication dans l'immeuble : annonces du syndic,
réclamations des résidents (transparence totale), et notifications en
temps réel via une cloche avec compteur.

---

## Étape 1 — Installer la fonction de notifications (SQL)

**Important : à faire avant de lancer l'app.**

Dans le SQL Editor de Supabase, exécutez le fichier
`013_notifications_function.sql` fourni. Il crée :
- les fonctions qui génèrent les notifications pour les habitants ;
- l'activation du temps réel sur la table `notifications`.

Vous pouvez voir un avertissement « destructive operation » à cause des
`create or replace` : cliquez **Run query**, c'est sans danger (le fichier
est rejouable).

## Étape 2 — Remplacer les fichiers de l'app

Décompressez l'archive dans `C:\Users\brahi\Desktop\Syndic`, en écrasant.
Votre `.env.local` reste intact.

Nouveaux fichiers :
- `src/lib/notify.js` — déclenche les notifications
- `src/components/NotificationBell.jsx` — cloche + compteur + temps réel
- `src/pages/Announcements.jsx` — annonces
- `src/pages/Complaints.jsx` — réclamations (liste + détail + traitement)

Fichiers modifiés :
- `src/App.jsx` — branche Annonces et Réclamations
- `src/components/AppShell.jsx` — ajoute la cloche dans la barre du haut
- `src/i18n/fr.json` et `src/i18n/ar.json` — traductions

Aucune nouvelle dépendance : pas besoin de `npm install`.

## Étape 3 — Lancer l'app

```powershell
cd C:\Users\brahi\Desktop\Syndic
npm run dev
```

---

## Comment ça marche

**Annonces** : le syndic publie un avis (info / important / urgent, avec
épinglage possible). Tous les habitants sont notifiés instantanément.

**Réclamations** : tout habitant signale un problème (catégorie, priorité,
photo facultative). Conformément à votre choix, **tout le monde voit toutes
les réclamations** (transparence totale). Le syndic répond et change le
statut (ouverte → en cours → résolue) ; l'auteur est notifié à chaque étape.

**Notifications** : la cloche en haut affiche un compteur de non-lues. Elle
se met à jour **en temps réel** (sans recharger la page) grâce à Supabase
Realtime. Cliquez dessus pour voir la liste et « tout marquer comme lu ».

---

## Tests de fin de Sprint 6 — checklist

### Annonces
- [ ] En tant que syndic, publier une annonce (niveau « urgent », épinglée)
- [ ] L'annonce s'affiche en haut de la liste avec son badge
- [ ] La retirer fonctionne (bouton « Retirer »)

### Réclamations
- [ ] Créer une réclamation avec une photo
- [ ] Elle apparaît dans la liste, visible par tous
- [ ] L'ouvrir : en tant que syndic, écrire une réponse et passer « en cours »
- [ ] Passer la réclamation à « résolue » : la date de résolution s'affiche

### Notifications (le test clé)
- [ ] Après avoir publié une annonce, la cloche montre un compteur rouge
- [ ] Cliquer la cloche : la notification de l'annonce apparaît
- [ ] « Tout marquer comme lu » : le compteur disparaît
- [ ] **Temps réel** : ouvrez l'app dans deux onglets (ou deux navigateurs)
      connectés au même compte. Publiez une annonce dans l'un ; la cloche
      de l'autre s'incrémente **sans recharger**. *(Si vous n'avez qu'un
      compte, le plus simple est deux onglets côte à côte.)*

### Bilingue et thème
- [ ] En arabe, les trois pages passent en RTL
- [ ] Le dark mode reste lisible (cloche, liste déroulante, cartes)

Quand la checklist est complète, le Sprint 6 est validé. On passe au
**Sprint 7** (le dernier) : finitions, PWA installable, reçus PDF, et
déploiement en ligne sur Vercel.

---

## En cas de souci

- **La cloche ne se met pas à jour en temps réel** : vérifiez que l'étape 1
  (SQL) a bien été exécutée, en particulier l'ajout de `notifications` au
  temps réel. Dans Supabase → Database → Replication, la table
  `notifications` doit être active. Sinon, réexécutez la fin du fichier 013.
- **« function notifier_immeuble does not exist »** : l'étape 1 n'a pas été
  faite ou a échoué. Réexécutez `013_notifications_function.sql`.
- **Erreur à l'upload de la photo** : vérifiez le bucket `reclamations`
  (Supabase → Storage) et la taille (< 5 Mo).
- **Les notifications n'apparaissent pas** : c'est normal que l'auteur d'une
  action ne se notifie pas lui-même. Testez avec deux onglets, ou regardez
  les notifications générées par les actions d'un autre rôle.
