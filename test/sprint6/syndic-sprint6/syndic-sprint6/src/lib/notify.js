import { supabase } from './supabase'

// Notifie tous les membres de l'immeuble (sauf l'auteur, optionnel).
// S'appuie sur la fonction SQL app.notifier_immeuble (SECURITY DEFINER).
export async function notifyBuilding(immeubleId, { type, titre, message, entiteType = null, entiteId = null, exclure = null }) {
  try {
    await supabase.rpc('notifier_immeuble', {
      p_immeuble_id: immeubleId,
      p_type: type,
      p_titre: titre,
      p_message: message,
      p_entite_type: entiteType,
      p_entite_id: entiteId,
      p_exclure: exclure,
    })
  } catch (e) {
    // On n'interrompt jamais l'action principale si la notif échoue
    console.warn('Notification non envoyée :', e?.message)
  }
}

// Notifie un seul habitant
export async function notifyUser(userId, { type, titre, message, entiteType = null, entiteId = null }) {
  try {
    await supabase.rpc('notifier_user', {
      p_user_id: userId,
      p_type: type,
      p_titre: titre,
      p_message: message,
      p_entite_type: entiteType,
      p_entite_id: entiteId,
    })
  } catch (e) {
    console.warn('Notification non envoyée :', e?.message)
  }
}
