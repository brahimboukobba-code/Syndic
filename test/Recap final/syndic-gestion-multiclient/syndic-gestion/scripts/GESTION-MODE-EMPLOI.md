# Console de gestion — mode d'emploi

Le script `scripts/gestion.mjs` est votre outil unique pour gérer un
environnement Syndic, depuis votre machine, sans exposer aucune clé dans
l'application.

## Ce qu'il permet (menu interactif)

```
 1. Lister les immeubles
 2. Ajouter un immeuble (+ ses logements)
 3. Lister les comptes d'un immeuble
 4. Ajouter un compte (habitant ou responsable)
 5. Modifier le nom d'un compte
 6. Modifier l'e-mail d'un compte
 7. Réinitialiser un mot de passe
 8. Attribuer / retirer un rôle
 9. Rattacher un compte à un logement
 0. Quitter
```

## Lancement

1. Récupérez vos 2 valeurs :
   - **SUPABASE_URL** : la Project URL du client concerné
   - **SUPABASE_SERVICE_KEY** : la clé **secrète** (`sb_secret_...`) de ce projet

2. Dans PowerShell, depuis le dossier du projet :

```powershell
cd C:\Users\brahi\Desktop\Syndic
$env:SUPABASE_URL = "https://VOTRE-REF.supabase.co"
$env:SUPABASE_SERVICE_KEY = "sb_secret_VOTRE_CLE_SECRETE"
node scripts/gestion.mjs
```

3. Le menu s'affiche. Tapez le numéro de l'action, répondez aux questions.

4. Quand vous avez fini, fermez le terminal (ou videz la clé) :
```powershell
$env:SUPABASE_SERVICE_KEY = ""
```

## Notes par action

- **Ajouter un compte (4)** : crée l'identité + le profil + le rôle, et
  propose de rattacher un logement. Pour un syndic/vice-syndic/trésorier,
  il propose aussi d'ajouter le rôle « proprietaire » (pour qu'il puisse
  voter). Le script affiche l'e-mail + mot de passe à communiquer.

- **Retirer un rôle (8)** : ne supprime pas la ligne, il la **clôture**
  (date de fin) — l'historique est préservé, comme un mandat qui se termine.

- **Réinitialiser un mot de passe (7)** : définit un nouveau mot de passe
  immédiatement utilisable. Communiquez-le à l'habitant.

- Le script est **sûr à relancer** : si un compte existe déjà (même e-mail),
  il le réutilise au lieu de planter.

## Sécurité

- La clé secrète n'est utilisée que **localement**, le temps d'une session.
- Elle n'est jamais dans l'application, jamais sur GitHub, jamais sur Vercel.
- C'est exactement pour ça que cette approche par script est plus sûre qu'un
  panneau admin dans l'app.

## En cas de souci

- **« Définissez SUPABASE_URL… »** : une des 2 variables n'est pas définie.
- **Clé invalide / erreur d'auth** : vérifiez que c'est bien la clé
  **secrète** (service_role), pas la publishable.
- **« Compte introuvable »** : l'e-mail saisi ne correspond à aucun compte.
- **Erreur de contrainte** sur un rôle : les rôles valides sont admin,
  syndic, vice_syndic, tresorier, proprietaire, locataire.
