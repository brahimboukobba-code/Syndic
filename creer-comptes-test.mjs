/**
 * creer-comptes-test.mjs
 * --------------------------------------------------------------------
 * Crée 5 comptes de test sur votre Supabase, avec leur identité de
 * connexion (e-mail + mot de passe), leur profil, leur rôle et leur
 * rattachement à un logement :
 *   - 1 vice-syndic
 *   - 3 propriétaires
 *   - 1 locataire
 *
 * Utilise l'API Admin de Supabase (création propre des mots de passe).
 *
 * ⚠️ Ce script s'exécute UNE SEULE FOIS, sur VOTRE machine. Il a besoin
 *    de la clé SECRÈTE (service_role). Cette clé ne doit JAMAIS être
 *    mise dans le front ni commitée. On la passe en variable
 *    d'environnement le temps de lancer le script (voir le mode d'emploi).
 * --------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js'

// --- Configuration lue depuis les variables d'environnement ---
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const IMMEUBLE_ID = process.env.IMMEUBLE_ID

if (!SUPABASE_URL || !SERVICE_KEY || !IMMEUBLE_ID) {
  console.error('\n❌ Variables manquantes. Définissez SUPABASE_URL, SUPABASE_SERVICE_KEY et IMMEUBLE_ID.\n')
  console.error('   Voir le mode d\'emploi dans COMPTES-TEST-MODE-EMPLOI.md\n')
  process.exit(1)
}

// Client admin (service_role) : peut créer des utilisateurs et écrire partout.
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Mot de passe commun à tous les comptes de test (changez-le si vous voulez)
const MOT_DE_PASSE = 'Test1234!'

// Définition des 5 comptes. Le logement est désigné par son NUMÉRO
// (le script retrouve l'UUID réel dans votre base).
const COMPTES = [
  { email: 'vicesyndic@test.ma', nom: 'Vice Syndic Test',  roles: ['vice_syndic', 'proprietaire'], logement: 'Apt 2', occupation: 'proprietaire' },
  { email: 'proprio1@test.ma',   nom: 'Propriétaire Un',   roles: ['proprietaire'],                logement: 'Apt 3', occupation: 'proprietaire' },
  { email: 'proprio2@test.ma',   nom: 'Propriétaire Deux', roles: ['proprietaire'],                logement: 'Apt 4', occupation: 'proprietaire' },
  { email: 'proprio3@test.ma',   nom: 'Propriétaire Trois',roles: ['proprietaire'],                logement: 'Apt 5', occupation: 'proprietaire' },
  { email: 'locataire@test.ma',  nom: 'Locataire Test',    roles: ['locataire'],                   logement: 'Apt 1', occupation: 'locataire' },
]

// Récupère l'UUID d'un logement par son numéro
async function getLogementId(numero) {
  const { data, error } = await admin
    .from('logements')
    .select('id')
    .eq('immeuble_id', IMMEUBLE_ID)
    .eq('numero', numero)
    .maybeSingle()
  if (error) throw error
  return data?.id || null
}

async function creerCompte(c) {
  console.log(`\n→ ${c.email} (${c.nom})`)

  // 1. Créer (ou retrouver) l'identité de connexion
  let userId
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: c.email,
    password: MOT_DE_PASSE,
    email_confirm: true, // on confirme d'office (vous avez décoché la confirmation)
  })

  if (createErr) {
    // Si l'utilisateur existe déjà, on le retrouve
    if (String(createErr.message).toLowerCase().includes('already')) {
      const { data: list } = await admin.auth.admin.listUsers()
      const existing = list?.users?.find((u) => u.email === c.email)
      if (!existing) throw createErr
      userId = existing.id
      console.log('   • identité déjà existante, réutilisée')
    } else {
      throw createErr
    }
  } else {
    userId = created.user.id
    console.log('   • identité créée')
  }

  // 2. Profil dans utilisateurs
  await admin.from('utilisateurs').upsert({
    id: userId, nom_complet: c.nom, langue_preferee: 'fr',
  }, { onConflict: 'id' })
  console.log('   • profil enregistré')

  // 3. Rôles
  for (const role of c.roles) {
    await admin.from('user_roles').upsert({
      user_id: userId, immeuble_id: IMMEUBLE_ID, role,
    }, { onConflict: 'user_id,immeuble_id,role', ignoreDuplicates: true })
  }
  console.log('   • rôles :', c.roles.join(', '))

  // 4. Rattachement au logement
  const logementId = await getLogementId(c.logement)
  if (!logementId) {
    console.log(`   ⚠️  Logement "${c.logement}" introuvable — occupation non créée`)
  } else {
    await admin.from('occupations').upsert({
      logement_id: logementId, user_id: userId, type: c.occupation,
    }, { onConflict: 'logement_id,user_id,type', ignoreDuplicates: true })
    console.log(`   • rattaché à ${c.logement} (${c.occupation})`)
  }
}

async function main() {
  console.log('=== Création des comptes de test ===')
  console.log('Immeuble :', IMMEUBLE_ID)
  console.log('Mot de passe commun :', MOT_DE_PASSE)

  for (const c of COMPTES) {
    try {
      await creerCompte(c)
    } catch (e) {
      console.error(`   ❌ Erreur pour ${c.email} :`, e.message)
    }
  }

  console.log('\n=== Terminé ===')
  console.log('\nComptes créés (mot de passe = ' + MOT_DE_PASSE + ') :')
  for (const c of COMPTES) {
    console.log(`  ${c.email.padEnd(24)} ${c.roles.join('+').padEnd(26)} ${c.logement}`)
  }
  console.log('\nVous pouvez maintenant vous connecter avec ces e-mails.\n')
}

main()
