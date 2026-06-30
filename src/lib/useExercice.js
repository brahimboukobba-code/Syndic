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

      // S'assurer que l'exercice de l'année courante existe (création
      // automatique au passage à une nouvelle année). La fonction est
      // idempotente : elle ne crée rien si l'exercice existe déjà.
      try {
        await supabase.rpc('ensure_exercice_courant', { p_immeuble: building.id })
      } catch (e) {
        // Non bloquant : si l'appel échoue, on charge l'exercice existant
        console.warn('ensure_exercice_courant:', e?.message)
      }

      const today = new Date().toISOString().slice(0, 10)
      // Priorité à l'exercice qui couvre la date du jour
      let { data } = await supabase
        .from('exercices')
        .select('id, libelle, date_debut, date_fin, budget_previsionnel, statut')
        .eq('immeuble_id', building.id)
        .eq('statut', 'en_cours')
        .lte('date_debut', today)
        .gte('date_fin', today)
        .order('date_debut', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Repli : le plus récent exercice en cours (si aucun ne couvre aujourd'hui)
      if (!data) {
        const res = await supabase
          .from('exercices')
          .select('id, libelle, date_debut, date_fin, budget_previsionnel, statut')
          .eq('immeuble_id', building.id)
          .eq('statut', 'en_cours')
          .order('date_debut', { ascending: false })
          .limit(1)
          .maybeSingle()
        data = res.data
      }

      if (active) { setExercice(data || null); setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [building?.id])

  return { exercice, loading }
}
