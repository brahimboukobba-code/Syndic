import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)   // ligne utilisateurs
  const [roles, setRoles] = useState([])          // rôles actifs
  const [building, setBuilding] = useState(null)  // immeuble courant
  const [loading, setLoading] = useState(true)

  // Charge le profil, les rôles et l'immeuble de l'utilisateur connecté
  const loadProfile = useCallback(async (uid) => {
    if (!uid) { setProfile(null); setRoles([]); setBuilding(null); return }

    const { data: prof } = await supabase
      .from('utilisateurs')
      .select('id, nom_complet, langue_preferee, statut')
      .eq('id', uid)
      .maybeSingle()
    setProfile(prof || null)

    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role, immeuble_id')
      .is('date_fin', null)
    const activeRoles = roleRows || []
    setRoles(activeRoles)

    // Immeuble : on prend le premier rattachement trouvé
    const immeubleId = activeRoles[0]?.immeuble_id
    if (immeubleId) {
      const { data: imm } = await supabase
        .from('immeubles')
        .select('id, nom, adresse')
        .eq('id', immeubleId)
        .maybeSingle()
      setBuilding(imm || null)
    } else {
      setBuilding(null)
    }
  }, [])

  useEffect(() => {
    // Session initiale
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    // Écoute les changements (connexion / déconnexion / refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess)
      await loadProfile(sess?.user?.id)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signOut = () => supabase.auth.signOut()

  // Helpers de rôle
  const roleNames = roles.map((r) => r.role)
  const hasRole = (...wanted) => wanted.some((w) => roleNames.includes(w))
  const isManager = hasRole('syndic', 'vice_syndic')
  const canEditExpenses = hasRole('syndic', 'vice_syndic', 'tresorier')
  const canVote = hasRole('proprietaire')

  const value = {
    session, profile, roles, roleNames, building, loading,
    hasRole, isManager, canEditExpenses, canVote,
    signOut, reload: () => loadProfile(session?.user?.id),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
