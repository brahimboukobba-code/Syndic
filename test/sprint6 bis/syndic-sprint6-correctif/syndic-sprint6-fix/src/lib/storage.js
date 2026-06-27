import { supabase } from './supabase'

// Types et taille autorisés (sécurité : on limite ce qui peut être téléversé)
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

// Nettoie un nom de fichier (évite caractères problématiques)
function safeName(name) {
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 40)
  return `${base || 'fichier'}${ext}`
}

// Téléverse un fichier dans un bucket donné, retourne le chemin de stockage
export async function uploadFile(bucket, file) {
  if (!file) throw new Error('Aucun fichier sélectionné.')
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Format non autorisé. Utilisez un PDF, JPG ou PNG.')
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Fichier trop volumineux (5 Mo maximum).')
  }
  const path = `${Date.now()}_${safeName(file.name)}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return `${bucket}/${path}`
}

// Génère une URL signée (temporaire) pour consulter un fichier privé
export async function getSignedUrl(storagePath, expiresIn = 3600) {
  if (!storagePath) return null
  const slash = storagePath.indexOf('/')
  const bucket = storagePath.slice(0, slash)
  const path = storagePath.slice(slash + 1)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}
