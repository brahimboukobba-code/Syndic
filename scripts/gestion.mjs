/**
 * gestion.mjs — Console de gestion Syndic (menu interactif)
 * --------------------------------------------------------------------
 * Un seul script pour tout gérer sur VOTRE Supabase, depuis votre machine,
 * sans exposer aucune clé dans l'application.
 *
 * Actions disponibles :
 *   1. Lister les immeubles
 *   2. Ajouter un immeuble (+ ses logements)
 *   3. Lister les comptes d'un immeuble
 *   4. Ajouter un compte (habitant ou responsable)
 *   5. Modifier le nom d'un compte
 *   6. Modifier l'e-mail d'un compte
 *   7. Réinitialiser le mot de passe d'un compte
 *   8. Attribuer / retirer un rôle
 *   9. Rattacher un compte à un logement
 *   0. Quitter
 *
 * Lancement (voir GESTION-MODE-EMPLOI.md) :
 *   $env:SUPABASE_URL="https://....supabase.co"
 *   $env:SUPABASE_SERVICE_KEY="sb_secret_..."
 *   node scripts/gestion.mjs
 * --------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌ Définissez SUPABASE_URL et SUPABASE_SERVICE_KEY avant de lancer.\n')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const rl = readline.createInterface({ input, output })
const ask = (q) => rl.question(q)
const ROLES = ['admin', 'syndic', 'vice_syndic', 'tresorier', 'proprietaire', 'locataire']

// ---- Helpers ----
async function findUserByEmail(email) {
  const { data } = await db.auth.admin.listUsers()
  return (data?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null
}

async function chooseImmeuble() {
  const { data: imms } = await db.from('immeubles').select('id, nom').order('nom')
  if (!imms?.length) { console.log('Aucun immeuble. Créez-en un (action 2).'); return null }
  console.log('\nImmeubles :')
  imms.forEach((im, i) => console.log(`  ${i + 1}. ${im.nom}  (${im.id})`))
  const n = parseInt(await ask('Numéro de l\'immeuble : '), 10)
  return imms[n - 1] || null
}

async function chooseLogement(immeubleId, optional = true) {
  const { data: logs } = await db.from('logements').select('id, numero').eq('immeuble_id', immeubleId).order('numero')
  if (!logs?.length) { console.log('(aucun logement)'); return null }
  console.log('\nLogements :')
  logs.forEach((l, i) => console.log(`  ${i + 1}. ${l.numero}`))
  if (optional) console.log('  0. (aucun)')
  const n = parseInt(await ask('Numéro du logement : '), 10)
  if (optional && n === 0) return null
  return logs[n - 1] || null
}

// ---- Actions ----
async function listImmeubles() {
  const { data } = await db.from('immeubles').select('id, nom, adresse').order('nom')
  if (!data?.length) return console.log('\nAucun immeuble.\n')
  console.log('\n=== Immeubles ===')
  data.forEach((im) => console.log(`• ${im.nom} — ${im.adresse || ''}\n  ${im.id}`))
  console.log()
}

async function addImmeuble() {
  const nom = await ask('Nom de l\'immeuble : ')
  const adresse = await ask('Adresse : ')
  const nb = parseInt(await ask('Nombre de logements (Apt 1..N) : '), 10) || 0
  const seuil = parseInt(await ask('Seuil double validation MAD [5000] : '), 10) || 5000

  const { data: imm, error } = await db.from('immeubles')
    .insert({ nom, adresse, seuil_validation_depense: seuil }).select('id').single()
  if (error) return console.log('❌', error.message)

  if (nb > 0) {
    const logs = Array.from({ length: nb }, (_, i) => ({ immeuble_id: imm.id, numero: `Apt ${i + 1}`, type: 'appartement' }))
    await db.from('logements').insert(logs)
  }
  // exercice de l'année
  const y = new Date().getFullYear()
  await db.from('exercices').insert({ immeuble_id: imm.id, libelle: `Exercice ${y}`, date_debut: `${y}-01-01`, date_fin: `${y}-12-31`, statut: 'en_cours' })

  console.log(`\n✓ Immeuble créé : ${nom} (${imm.id}), ${nb} logements, exercice ${y}.\n`)
}

async function listComptes() {
  const im = await chooseImmeuble(); if (!im) return
  const { data: roles } = await db.from('user_roles').select('user_id, role').eq('immeuble_id', im.id).is('date_fin', null)
  const ids = [...new Set((roles || []).map((r) => r.user_id))]
  if (!ids.length) return console.log('\n(aucun compte)\n')
  const { data: profs } = await db.from('utilisateurs').select('id, nom_complet').in('id', ids)
  const { data: authList } = await db.auth.admin.listUsers()
  const emailById = Object.fromEntries((authList?.users || []).map((u) => [u.id, u.email]))
  const rolesByUser = {}
  for (const r of roles) (rolesByUser[r.user_id] = rolesByUser[r.user_id] || []).push(r.role)

  console.log(`\n=== Comptes de ${im.nom} ===`)
  for (const p of profs || []) {
    console.log(`• ${p.nom_complet}  <${emailById[p.id] || '?'}>`)
    console.log(`  rôles : ${(rolesByUser[p.id] || []).join(', ')}`)
  }
  console.log()
}

async function addCompte() {
  const im = await chooseImmeuble(); if (!im) return
  const nom = await ask('Nom complet : ')
  const email = await ask('E-mail : ')
  const password = await ask('Mot de passe initial : ')
  const tel = await ask('Téléphone (entrée pour ignorer) : ')

  console.log('Rôles disponibles :', ROLES.join(', '))
  const role = (await ask('Rôle principal : ')).trim()
  if (!ROLES.includes(role)) return console.log('❌ Rôle invalide.')

  // 1. Identité
  let uid
  const existing = await findUserByEmail(email)
  if (existing) { uid = existing.id; console.log('• identité déjà existante, réutilisée') }
  else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) return console.log('❌', error.message)
    uid = data.user.id
  }

  // 2. Profil + rôle
  await db.from('utilisateurs').upsert({ id: uid, nom_complet: nom, telephone: tel || null, langue_preferee: 'fr' }, { onConflict: 'id' })
  await db.from('user_roles').insert({ user_id: uid, immeuble_id: im.id, role }).then(({ error }) => error && console.log('  (rôle)', error.message))

  // proprietaire/locataire peut aussi voter -> ajouter proprietaire si voulu
  if (role === 'syndic' || role === 'vice_syndic' || role === 'tresorier') {
    const aussi = (await ask('Ajouter aussi le rôle "proprietaire" (pour voter) ? [o/N] : ')).toLowerCase()
    if (aussi === 'o') await db.from('user_roles').insert({ user_id: uid, immeuble_id: im.id, role: 'proprietaire' })
  }

  // 3. Logement
  const log = await chooseLogement(im.id, true)
  if (log) {
    const occType = (role === 'locataire') ? 'locataire' : 'proprietaire'
    await db.from('occupations').insert({ logement_id: log.id, user_id: uid, type: occType })
    console.log(`• rattaché à ${log.numero} (${occType})`)
  }

  console.log(`\n✓ Compte créé : ${nom} <${email}> / mot de passe : ${password}`)
  console.log('  Communiquez ces identifiants à l\'habitant.\n')
}

async function modifierNom() {
  const email = await ask('E-mail du compte : ')
  const u = await findUserByEmail(email); if (!u) return console.log('❌ Compte introuvable.')
  const nom = await ask('Nouveau nom complet : ')
  const { error } = await db.from('utilisateurs').update({ nom_complet: nom }).eq('id', u.id)
  console.log(error ? `❌ ${error.message}` : '\n✓ Nom modifié.\n')
}

async function modifierEmail() {
  const email = await ask('E-mail actuel : ')
  const u = await findUserByEmail(email); if (!u) return console.log('❌ Compte introuvable.')
  const nouveau = await ask('Nouvel e-mail : ')
  const { error } = await db.auth.admin.updateUserById(u.id, { email: nouveau })
  console.log(error ? `❌ ${error.message}` : '\n✓ E-mail modifié.\n')
}

async function resetPassword() {
  const email = await ask('E-mail du compte : ')
  const u = await findUserByEmail(email); if (!u) return console.log('❌ Compte introuvable.')
  const pwd = await ask('Nouveau mot de passe : ')
  if (pwd.length < 6) return console.log('❌ Mot de passe trop court (6 min).')
  const { error } = await db.auth.admin.updateUserById(u.id, { password: pwd })
  console.log(error ? `❌ ${error.message}` : '\n✓ Mot de passe réinitialisé.\n')
}

async function gererRole() {
  const im = await chooseImmeuble(); if (!im) return
  const email = await ask('E-mail du compte : ')
  const u = await findUserByEmail(email); if (!u) return console.log('❌ Compte introuvable.')
  const sens = (await ask('Attribuer (a) ou Retirer (r) un rôle ? : ')).toLowerCase()
  console.log('Rôles :', ROLES.join(', '))
  const role = (await ask('Rôle : ')).trim()
  if (!ROLES.includes(role)) return console.log('❌ Rôle invalide.')

  if (sens === 'a') {
    const { error } = await db.from('user_roles').insert({ user_id: u.id, immeuble_id: im.id, role })
    console.log(error ? `❌ ${error.message}` : `\n✓ Rôle "${role}" attribué.\n`)
  } else if (sens === 'r') {
    // clôturer le rôle (date_fin) plutôt que supprimer
    const { error } = await db.from('user_roles')
      .update({ date_fin: new Date().toISOString().slice(0, 10) })
      .eq('user_id', u.id).eq('immeuble_id', im.id).eq('role', role).is('date_fin', null)
    console.log(error ? `❌ ${error.message}` : `\n✓ Rôle "${role}" retiré.\n`)
  } else console.log('Action inconnue.')
}

async function rattacherLogement() {
  const im = await chooseImmeuble(); if (!im) return
  const email = await ask('E-mail du compte : ')
  const u = await findUserByEmail(email); if (!u) return console.log('❌ Compte introuvable.')
  const log = await chooseLogement(im.id, false); if (!log) return
  const type = (await ask('Type (proprietaire/locataire) [proprietaire] : ')).trim() || 'proprietaire'
  if (!['proprietaire', 'locataire'].includes(type)) return console.log('❌ Type invalide.')
  const { error } = await db.from('occupations').insert({ logement_id: log.id, user_id: u.id, type })
  console.log(error ? `❌ ${error.message}` : `\n✓ Rattaché à ${log.numero} (${type}).\n`)
}

// ---- Menu ----
async function menu() {
  console.log('\n========== Console de gestion Syndic ==========')
  console.log('Connecté à :', SUPABASE_URL)
  while (true) {
    console.log('\n--- Que voulez-vous faire ? ---')
    console.log(' 1. Lister les immeubles')
    console.log(' 2. Ajouter un immeuble (+ logements)')
    console.log(' 3. Lister les comptes d\'un immeuble')
    console.log(' 4. Ajouter un compte')
    console.log(' 5. Modifier le nom d\'un compte')
    console.log(' 6. Modifier l\'e-mail d\'un compte')
    console.log(' 7. Réinitialiser un mot de passe')
    console.log(' 8. Attribuer / retirer un rôle')
    console.log(' 9. Rattacher un compte à un logement')
    console.log(' 0. Quitter')
    const c = (await ask('\nVotre choix : ')).trim()
    try {
      if (c === '1') await listImmeubles()
      else if (c === '2') await addImmeuble()
      else if (c === '3') await listComptes()
      else if (c === '4') await addCompte()
      else if (c === '5') await modifierNom()
      else if (c === '6') await modifierEmail()
      else if (c === '7') await resetPassword()
      else if (c === '8') await gererRole()
      else if (c === '9') await rattacherLogement()
      else if (c === '0') { console.log('\nAu revoir.\n'); break }
      else console.log('Choix inconnu.')
    } catch (e) {
      console.log('❌ Erreur :', e.message)
    }
  }
  rl.close()
}

menu()
