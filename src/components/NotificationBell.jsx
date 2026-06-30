import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatDateTime } from '../lib/format'

// Vers quelle page mène chaque type d'entité référencée par une notification
const ENTITY_ROUTE = {
  annonce: '/announcements',
  reclamation: '/complaints',
  projet: '/projects',
  reunion: '/meetings',
  cotisation: '/finances',
  depense: '/finances',
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const uid = session?.user?.id
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const load = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, titre, message, lue, created_at, entite_type, entite_id')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems(data || [])
  }, [uid])

  useEffect(() => { load() }, [load])

  // Rafraîchissement manuel déclenché après une action (même onglet),
  // en complément du temps réel.
  useEffect(() => {
    function onRefresh() { load() }
    window.addEventListener('notif-refresh', onRefresh)
    return () => window.removeEventListener('notif-refresh', onRefresh)
  }, [load])

  // Temps réel : écoute les nouvelles notifications de cet utilisateur
  useEffect(() => {
    if (!uid) return
    const channel = supabase
      .channel('notif-' + uid)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => setItems((prev) => {
          // Éviter le doublon : si la notification est déjà présente
          // (ajoutée par un load() concurrent), ne pas la ré-ajouter.
          if (prev.some((n) => n.id === payload.new.id)) return prev
          return [payload.new, ...prev].slice(0, 20)
        })
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [uid])

  // Fermer au clic extérieur
  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((n) => !n.lue).length

  async function markAllRead() {
    const ids = items.filter((n) => !n.lue).map((n) => n.id)
    if (ids.length === 0) return
    await supabase.from('notifications').update({ lue: true, lue_le: new Date().toISOString() }).in('id', ids)
    setItems((prev) => prev.map((n) => ({ ...n, lue: true })))
  }

  // Clic sur une notification : la marquer lue, fermer le panneau,
  // et naviguer vers la page concernée par l'entité référencée.
  async function openNotification(n) {
    setOpen(false)
    if (!n.lue) {
      await supabase.from('notifications').update({ lue: true, lue_le: new Date().toISOString() }).eq('id', n.id)
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, lue: true } : x))
    }
    const route = ENTITY_ROUTE[n.entite_type]
    if (route) {
      // Passer l'id de l'entité pour ouvrir/surligner l'élément précis
      const url = n.entite_id ? `${route}?focus=${n.entite_id}` : route
      navigate(url)
    }
  }

  async function openAndRead() {
    setOpen((o) => !o)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={openAndRead} className="btn-ghost px-2.5 py-1.5 relative" aria-label={t('notifications.title')}>
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Fond semi-transparent sur mobile pour fermer au tap */}
          <div className="md:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setOpen(false)} />

          <div className="
            z-50 bg-white dark:bg-brand-700 overflow-y-auto
            fixed inset-x-2 top-16 max-h-[75vh] rounded-2xl shadow-xl ring-1 ring-black/10 dark:ring-white/10
            md:absolute md:inset-x-auto md:end-0 md:top-auto md:mt-2 md:w-80 md:max-h-[70vh]
          ">
            <div className="flex items-center justify-between p-3 border-b border-black/5 dark:border-white/10 sticky top-0 bg-white dark:bg-brand-700">
              <p className="font-semibold text-sm">{t('notifications.title')}</p>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-500 hover:underline">{t('notifications.markAllRead')}</button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-sm opacity-60 p-6 text-center">{t('notifications.empty')}</p>
            ) : (
              <div>
                {items.map((n) => {
                  const clickable = !!ENTITY_ROUTE[n.entite_type]
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={`w-full text-start p-3 border-b border-black/5 dark:border-white/10 transition-colors ${!n.lue ? 'bg-brand-50/60 dark:bg-brand-900/40' : ''} ${clickable ? 'hover:bg-sand-100 dark:hover:bg-brand-600 cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.lue && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                        <div className={`min-w-0 flex-1 ${n.lue ? 'ps-4' : ''}`}>
                          <p className="text-sm font-medium break-words line-clamp-1">{n.titre}</p>
                          <p className="text-sm opacity-70 break-words line-clamp-2">{n.message}</p>
                          <p className="text-xs opacity-40 mt-0.5">{formatDateTime(n.created_at, i18n.language)}</p>
                        </div>
                        {clickable && (
                          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current opacity-30 shrink-0 mt-0.5 rtl:rotate-180" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
