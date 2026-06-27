import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import { currentMonthPrefix } from './format'

// Charge toutes les données du tableau de bord : mandat, AG, finances, catégories
export function useDashboard() {
  const { building } = useAuth()
  const [data, setData] = useState({
    mandate: null,
    lastAG: null,
    exercice: null,
    expenses: [],
    contributions: [],
    categories: [],
    recentLogs: [],
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!building?.id) { setLoading(false); return }
    setLoading(true)

    // Mandat en cours
    const { data: mandate } = await supabase
      .from('mandats_syndic')
      .select('id, date_election, date_fin_mandat, pourcentage_obtenu, statut, syndic:utilisateurs!mandats_syndic_syndic_id_fkey(nom_complet)')
      .eq('immeuble_id', building.id)
      .eq('statut', 'en_cours')
      .order('date_election', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Dernière AG tenue (avec PV)
    const { data: lastAG } = await supabase
      .from('reunions')
      .select('id, titre, date_prevue, pv_url, type')
      .eq('immeuble_id', building.id)
      .in('type', ['ag_ordinaire', 'ag_extraordinaire'])
      .eq('statut', 'tenue')
      .order('date_prevue', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Exercice en cours
    const { data: exercice } = await supabase
      .from('exercices')
      .select('id, libelle, date_debut, date_fin')
      .eq('immeuble_id', building.id)
      .eq('statut', 'en_cours')
      .order('date_debut', { ascending: false })
      .limit(1)
      .maybeSingle()

    let expenses = [], contributions = []
    if (exercice?.id) {
      const { data: exp } = await supabase
        .from('depenses')
        .select('id, montant, statut, date_depense, categorie_id, categorie:categories_depenses(nom_fr, nom_ar, couleur)')
        .eq('exercice_id', exercice.id)
      expenses = exp || []

      const { data: cot } = await supabase
        .from('cotisations')
        .select('id, montant, statut')
        .eq('exercice_id', exercice.id)
      contributions = cot || []
    }

    // Dernières opérations (audit)
    const { data: recentLogs } = await supabase
      .from('audit_log')
      .select('id, table_name, action, user_role, created_at, new_values, old_values')
      .order('created_at', { ascending: false })
      .limit(5)

    setData({
      mandate: mandate || null,
      lastAG: lastAG || null,
      exercice: exercice || null,
      expenses,
      contributions,
      recentLogs: recentLogs || [],
    })
    setLoading(false)
  }, [building?.id])

  useEffect(() => { load() }, [load])

  return { ...data, loading, reload: load, monthPrefix: currentMonthPrefix() }
}
