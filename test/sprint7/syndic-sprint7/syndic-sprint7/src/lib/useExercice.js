import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'

// Charge l'exercice comptable "en_cours" de l'immeuble de l'utilisateur
export function useExercice() {
  const { building } = useAuth()
  const [exercice, setExercice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!building?.id) { setLoading(false); return }
      const { data } = await supabase
        .from('exercices')
        .select('id, libelle, date_debut, date_fin, budget_previsionnel, statut')
        .eq('immeuble_id', building.id)
        .eq('statut', 'en_cours')
        .order('date_debut', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (active) { setExercice(data || null); setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [building?.id])

  return { exercice, loading }
}
