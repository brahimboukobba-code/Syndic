/**
 * init-client.mjs
 * --------------------------------------------------------------------
 * Initialise un environnement pour un NOUVEAU CLIENT sur un Supabase
 * fraîchement créé (après avoir exécuté les migrations 001 → 014).
 *
 * Crée :
 *   - l'immeuble (nom, adresse, paramètres)
 *   - ses logements (Apt 1 … Apt N)
 *   - le compte ADMIN (identité + profil + rôle admin)
 *
 * Vous personnalisez la section CONFIG ci-dessous pour chaque client,
 * puis vous lancez le script une fois. Voir INIT-CLIENT-GUIDE.md.
 * --------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js'

// =====================================================================
// CONFIG — À PERSONNALISER POUR CHAQUE CLIENT
// =====================================================================
const CONFIG = {
  // Identité de l'immeuble
  immeuble: {
    nom: 'Résidence Exemple',
    adresse: '1 Rue Exemple, Ville',
    nombre_logements: 8,          // créera Apt 1 … Apt 8
    seuil_validation_depense: 5000,  // MAD : double validation au-delà
  },

  // Compte admin (celui qui gérera les habitants)
  admin: {
    email: 'admin@client.ma',      // l'e-mail que VOUS gérez pour ce client
    password: 'ChangezMoi123!',    // mot de passe initial de l'admin
    nom_complet: 'Administrateur',
  },

  // Optionnel : créer aussi le compte syndic tout de suite
  creer_syndic: true,
  syndic: {
    email: 'syndic@client.ma',
    password: 'ChangezMoi123!',
    nom_complet: 'Syndic',
    logement: 'Apt 1',             // le syndic occupe ce logement
  },
}
// =====================================================================

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌ Définissez SUPABASE_URL et SUPABASE_SERVICE_KEY.\n')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function creerIdentite(email, password, nom) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) {
    if (String(error.message).toLowerCase().includes('already')) {
      const { data: list } = await admin.auth.admin.listUsers()
      const ex = list?.users?.find((u) => u.email === email)
      if (ex) return ex.id
    }
    throw error
  }
  return data.user.id
}

async function main() {
  console.log('=== Initialisation client ===\n')

  // 1. Immeuble
  const { data: imm, error: immErr } = await admin
    .from('immeubles')
    .insert({
      nom: CONFIG.immeuble.nom,
      adresse: CONFIG.immeuble.adresse,
      seuil_validation_depense: CONFIG.immeuble.seuil_validation_depense,
    })
    .select('id')
    .single()
  if (immErr) { console.error('Erreur immeuble :', immErr.message); process.exit(1) }
  const immeubleId = imm.id
  console.log('✓ Immeuble créé :', CONFIG.immeuble.nom, `(${immeubleId})`)

  // 2. Logements
  const logements = []
  for (let i = 1; i <= CONFIG.immeuble.nombre_logements; i++) {
    logements.push({ immeuble_id: immeubleId, numero: `Apt ${i}`, type: 'appartement' })
  }
  const { error: logErr } = await admin.from('logements').insert(logements)
  if (logErr) { console.error('Erreur logements :', logErr.message); process.exit(1) }
  console.log(`✓ ${logements.length} logements créés (Apt 1 … Apt ${CONFIG.immeuble.nombre_logements})`)

  // 3. Exercice comptable de l'année en cours
  const year = new Date().getFullYear()
  await admin.from('exercices').insert({
    immeuble_id: immeubleId,
    libelle: `Exercice ${year}`,
    date_debut: `${year}-01-01`,
    date_fin: `${year}-12-31`,
    statut: 'en_cours',
  })
  console.log(`✓ Exercice ${year} créé`)

  // 4. Compte ADMIN
  const adminId = await creerIdentite(CONFIG.admin.email, CONFIG.admin.password, CONFIG.admin.nom_complet)
  await admin.from('utilisateurs').upsert({ id: adminId, nom_complet: CONFIG.admin.nom_complet, langue_preferee: 'fr' }, { onConflict: 'id' })
  await admin.from('user_roles').insert({ user_id: adminId, immeuble_id: immeubleId, role: 'admin' })
  console.log('✓ Compte admin créé :', CONFIG.admin.email)

  // 5. Compte SYNDIC (optionnel)
  if (CONFIG.creer_syndic) {
    const syndicId = await creerIdentite(CONFIG.syndic.email, CONFIG.syndic.password, CONFIG.syndic.nom_complet)
    await admin.from('utilisateurs').upsert({ id: syndicId, nom_complet: CONFIG.syndic.nom_complet, langue_preferee: 'fr' }, { onConflict: 'id' })
    await admin.from('user_roles').insert([
      { user_id: syndicId, immeuble_id: immeubleId, role: 'syndic' },
      { user_id: syndicId, immeuble_id: immeubleId, role: 'proprietaire' },
    ])
    // rattacher au logement
    const { data: log } = await admin.from('logements').select('id').eq('immeuble_id', immeubleId).eq('numero', CONFIG.syndic.logement).maybeSingle()
    if (log) await admin.from('occupations').insert({ logement_id: log.id, user_id: syndicId, type: 'proprietaire' })
    // mandat de 2 ans
    await admin.from('mandats_syndic').insert({
      immeuble_id: immeubleId, syndic_id: syndicId,
      date_election: new Date().toISOString().slice(0, 10),
      date_fin_mandat: new Date(Date.now() + 730 * 864e5).toISOString().slice(0, 10),
      pourcentage_obtenu: 100, statut: 'en_cours',
    })
    console.log('✓ Compte syndic créé :', CONFIG.syndic.email)
  }

  console.log('\n=== Terminé ===')
  console.log('\nIMMEUBLE_ID (à mettre dans les variables Vercel si besoin) :')
  console.log('  ', immeubleId)
  console.log('\nComptes créés :')
  console.log('  Admin  :', CONFIG.admin.email, '/', CONFIG.admin.password)
  if (CONFIG.creer_syndic) console.log('  Syndic :', CONFIG.syndic.email, '/', CONFIG.syndic.password)
  console.log('\n⚠️  Communiquez ces identifiants de façon sécurisée et faites-les changer au 1er accès.\n')
}

main().catch((e) => { console.error('\n❌ Erreur :', e.message, '\n'); process.exit(1) })
