# Créer les comptes de test — mode d'emploi

Ce script crée 5 comptes de test d'un coup (identité + profil + rôle +
logement) :

| E-mail | Rôle(s) | Logement |
|--------|---------|----------|
| vicesyndic@test.ma | vice-syndic + propriétaire | Apt 2 |
| proprio1@test.ma | propriétaire | Apt 3 |
| proprio2@test.ma | propriétaire | Apt 4 |
| proprio3@test.ma | propriétaire | Apt 5 |
| locataire@test.ma | locataire | Apt 1 |

**Mot de passe commun à tous : `Test1234!`**

---

## Étape 1 — Récupérer vos 3 informations

Il vous faut trois valeurs :

1. **SUPABASE_URL** : votre Project URL
   (ex. `https://gpytfpcmmwabgpgvxtzk.supabase.co`)

2. **SUPABASE_SERVICE_KEY** : votre clé **secrète** (service_role).
   Supabase → Settings → API Keys → onglet « Secret keys » → copiez la clé
   `sb_secret_...` (cliquez sur l'œil pour la révéler).

   ⚠️ Cette clé est puissante. On l'utilise UNE fois, en local, puis on
   ferme le terminal. Ne la commitez jamais, ne la mettez jamais dans le front.

3. **IMMEUBLE_ID** : l'identifiant de votre immeuble. Pour le trouver,
   exécutez dans le SQL Editor de Supabase :
   ```sql
   select id, nom from immeubles;
   ```
   Copiez l'`id` (un UUID type `11111111-...`).

---

## Étape 2 — Vérifier que vos logements existent

Le script rattache chaque compte à un logement par son **numéro** (Apt 1
à Apt 5). Vérifiez que ces logements existent :

```sql
select numero from logements order by numero;
```

- Si vous voyez « Apt 1 » à « Apt 5 » : parfait.
- Si vos logements ont d'autres noms (ex. « A1 », « Appartement 1 »),
  ouvrez le script `creer-comptes-test.mjs` et corrigez la valeur
  `logement:` de chaque compte pour qu'elle corresponde à vos vrais numéros.

---

## Étape 3 — Lancer le script

Ouvrez PowerShell **dans le dossier du projet**, puis définissez les trois
variables et lancez le script. Remplacez les valeurs par les vôtres :

```powershell
cd C:\Users\brahi\Desktop\Syndic
$env:SUPABASE_URL = "https://VOTRE-REF.supabase.co"
$env:SUPABASE_SERVICE_KEY = "sb_secret_VOTRE_CLE_SECRETE"
$env:IMMEUBLE_ID = "VOTRE-UUID-IMMEUBLE"
node scripts/creer-comptes-test.mjs
```

Vous verrez défiler la création de chaque compte. À la fin, un récapitulatif
liste les 5 e-mails.

> Le script est **rejouable** : si un compte existe déjà, il le réutilise
> sans planter. Vous pouvez donc le relancer sans souci.

---

## Étape 4 — Fermer proprement

Une fois fini, **fermez le terminal PowerShell** (ou videz la variable de
clé secrète) pour ne pas laisser traîner la clé en mémoire :

```powershell
$env:SUPABASE_SERVICE_KEY = ""
```

---

## Étape 5 — Tester

Connectez-vous sur l'app avec, par exemple :
- `vicesyndic@test.ma` / `Test1234!` → pour tester la **double validation**
  des dépenses (avec votre compte syndic + ce vice-syndic)
- `proprio1@test.ma`, `proprio2@test.ma`, `proprio3@test.ma` → pour tester
  un **vote de projet** à plusieurs voix
- `locataire@test.ma` → pour vérifier qu'un locataire **ne peut pas voter**
  et voit une interface adaptée

Pour les **notifications en temps réel** : connectez-vous en syndic dans un
navigateur et en proprio1 dans une fenêtre privée, publiez une annonce
depuis le syndic, et regardez la cloche de proprio1 s'allumer.

---

## En cas de souci

- **« Variables manquantes »** : une des 3 variables n'est pas définie.
  Revérifiez les 3 lignes `$env:...` avant de lancer.
- **« Logement introuvable »** : les numéros de logement du script ne
  correspondent pas aux vôtres. Corrigez les `logement:` dans le script
  (étape 2).
- **Erreur d'authentification / clé invalide** : vérifiez que vous avez
  bien copié la clé **secrète** (service_role, `sb_secret_...`), pas la clé
  publishable.
- **Erreur de permission sur une table** : la clé service_role contourne
  normalement la RLS. Si ça bloque, dites-le-moi avec le message exact.
