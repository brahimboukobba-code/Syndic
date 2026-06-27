import { supabase } from './supabase'

// Notifie tous les membres de l'immeuble (sauf l'auteur si 'exclure' fourni).
// S'appuie sur la fonction SQL public.notifier_immeuble.
// Retourne { error } : supabase.rpc ne lève PAS d'exception, il faut lire .error.
export async function notifyBuilding(immeubleId, { type, titre, message, entiteType = null, entiteId = null, exclure = null }) {
  const { error } = await supabase.rpc('notifier_immeuble', {
    p_immeuble_id: immeubleId,
    p_type: type,
    p_titre: titre,
    p_message: message,
    p_entite_type: entiteType,
    p_entite_id: entiteId,
    p_exclure: exclure,
  })
  if (error) console.warn('Notification non envoyée :', error.message)
  return { error }
}

// Notifie un seul habitant
export async function notifyUser(userId, { type, titre, message, entiteType = null, entiteId = null }) {
  const { error } = await supabase.rpc('notifier_user', {
    p_user_id: userId,
    p_type: type,
    p_titre: titre,
    p_message: message,
    p_entite_type: entiteType,
    p_entite_id: entiteId,
  })
  if (error) console.warn('Notification non envoyée :', error.message)
  return { error }
}
