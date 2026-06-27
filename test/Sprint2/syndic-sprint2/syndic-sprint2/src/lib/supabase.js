import { createClient } from '@supabase/supabase-js'

// Les valeurs viennent du fichier .env.local (jamais commité sur GitHub).
// VITE_SUPABASE_URL          = https://xxxx.supabase.co
// VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_xxxxx
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  // Message clair en développement si la config manque
  console.error(
    "Configuration Supabase manquante. Vérifiez votre fichier .env.local " +
    "(VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY)."
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // nécessaire pour le magic link
  },
})
