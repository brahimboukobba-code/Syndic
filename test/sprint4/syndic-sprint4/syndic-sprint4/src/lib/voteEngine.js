import { supabase } from './supabase'

// =====================================================================
// Moteur de vote : dépouillement, clôture et transitions de phase.
//
// Choix retenu : seuil calculé sur les VOTANTS (oui / (oui+non)),
// paramétrable par projet via projets.seuil_acceptation (défaut 0.75).
//
// >>> POUR PASSER À "3/4 DES LOGEMENTS TOTAUX" (Art. 21 strict) :
//     dans tallyPrinciple(), remplacer le dénominateur (oui+non)
//     par le nombre total de logements de l'immeuble. Voir le commentaire
//     marqué [SEUIL-STRICT] plus bas.
// =====================================================================

// Dépouille le vote de principe d'un projet
export async function tallyPrinciple(projetId) {
  const { data: votes } = await supabase
    .from('votes')
    .select('choix')
    .eq('scrutin_type', 'projet_principe')
    .eq('scrutin_id', projetId)

  const oui = (votes || []).filter((v) => v.choix === 'oui').length
  const non = (votes || []).filter((v) => v.choix === 'non').length
  const abstention = (votes || []).filter((v) => v.choix === 'abstention').length
  const exprimes = oui + non

  // [SEUIL-STRICT] : pour le calcul "3/4 des logements totaux", remplacer
  // la ligne suivante par : const base = nombreTotalDeLogements
  const base = exprimes

  const pctOui = base === 0 ? 0 : oui / base
  return { oui, non, abstention, exprimes, pctOui }
}

// Dépouille le vote sur les devis : compte les voix par devis
export async function tallyQuotes(projetId) {
  const { data: votes } = await supabase
    .from('votes')
    .select('devis_id')
    .eq('scrutin_type', 'projet_devis')
    .eq('scrutin_id', projetId)
    .not('devis_id', 'is', null)

  const counts = {}
  for (const v of votes || []) {
    counts[v.devis_id] = (counts[v.devis_id] || 0) + 1
  }
  return counts
}

// Clôture le vote de principe et fait la transition de phase
export async function closePrincipleVote(projet) {
  const { pctOui } = await tallyPrinciple(projet.id)
  const seuil = projet.seuil_acceptation ?? 0.75
  const accepte = pctOui >= seuil

  const nextPhase = accepte ? 'collecte_devis' : 'refuse'
  const { error } = await supabase
    .from('projets')
    .update({ phase: nextPhase })
    .eq('id', projet.id)
  if (error) throw error
  return { accepte, pctOui }
}

// Clôture le vote sur devis : sélectionne le gagnant et passe à 'accepte'
export async function closeQuoteVote(projet) {
  const counts = await tallyQuotes(projet.id)
  let winnerId = null
  let max = -1
  for (const [devisId, n] of Object.entries(counts)) {
    if (n > max) { max = n; winnerId = devisId }
  }

  const patch = { phase: 'accepte' }
  if (winnerId) patch.devis_gagnant_id = winnerId

  const { error } = await supabase.from('projets').update(patch).eq('id', projet.id)
  if (error) throw error

  // Marquer le devis gagnant
  if (winnerId) {
    await supabase.from('devis').update({ statut: 'accepte' }).eq('id', winnerId)
  }
  return { winnerId }
}

// Auto-clôture si la date limite est dépassée (appelée au chargement).
// C'est l'astuce "cron-less" : pas de serveur planifié, la clôture se
// déclenche quand quelqu'un consulte le projet après l'échéance.
export async function autoCloseIfDue(projet) {
  const now = new Date()
  if (projet.phase === 'vote_principe' && projet.date_cloture_vote
      && new Date(projet.date_cloture_vote) <= now) {
    await closePrincipleVote(projet)
    return true
  }
  if (projet.phase === 'vote_devis' && projet.date_cloture_vote_devis
      && new Date(projet.date_cloture_vote_devis) <= now) {
    await closeQuoteVote(projet)
    return true
  }
  return false
}
