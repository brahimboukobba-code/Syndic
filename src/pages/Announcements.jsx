import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatDateTime } from '../lib/format'
import { notifyBuilding } from '../lib/notify'
import { Badge, Spinner, Modal } from '../components/ui'

const levelTone = { info: 'blue', important: 'amber', urgent: 'red' }

export default function Announcements() {
  const { t, i18n } = useTranslation()
  const { building, isManager, session } = useAuth()
  const uid = session?.user?.id
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: '', contenu: '', niveau: 'info', epingle: false })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [searchParams] = useSearchParams()

  const load = useCallback(async () => {
    if (!building?.id) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('annonces')
      .select('id, titre, contenu, niveau, epingle, created_at, statut')
      .eq('immeuble_id', building.id)
      .eq('statut', 'publie')
      .order('epingle', { ascending: false })
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [building?.id])

  useEffect(() => { load() }, [load])

  // Ouvrir/surligner l'annonce ciblée par une notification (?focus=<id>)
  useEffect(() => {
    const fid = searchParams.get('focus')
    if (fid && items.length > 0) {
      setExpanded(fid)
      setFocusId(fid)
      // Scroller vers l'annonce
      setTimeout(() => {
        document.getElementById(`annonce-${fid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      // Retirer le surlignage après 3s
      const tm = setTimeout(() => setFocusId(null), 3000)
      return () => clearTimeout(tm)
    }
  }, [searchParams, items])

  async function publish(e) {
    e.preventDefault()
    setError('')
    if (!form.titre || !form.contenu) { setError(t('announcements.required')); return }
    setSaving(true)
    try {
      const { data, error: e1 } = await supabase.from('annonces').insert({
        immeuble_id: building.id,
        titre: form.titre, contenu: form.contenu,
        niveau: form.niveau, epingle: form.epingle,
        created_by: uid,
      }).select('id').single()
      if (e1) throw e1
      // Notifier tous les habitants. On n'exclut PAS l'auteur : le syndic
      // reçoit ainsi un accusé de publication dans sa cloche, et le test
      // fonctionne même avec un seul compte.
      const { error: nerr } = await notifyBuilding(building.id, {
        type: 'nouvelle_annonce', titre: t('announcements.title') + ' : ' + form.titre,
        message: form.contenu.slice(0, 120), entiteType: 'annonce', entiteId: data.id,
      })
      if (nerr) {
        // Ne bloque pas la publication, mais informe l'utilisateur
        setError("Annonce publiée, mais la notification n'a pas pu être envoyée : " + nerr.message)
      } else {
        // Signale à la cloche de se rafraîchir (utile dans le même onglet)
        window.dispatchEvent(new CustomEvent('notif-refresh'))
      }
      if (nerr) { setSaving(false); load(); return }
      setShowForm(false)
      setForm({ titre: '', contenu: '', niveau: 'info', epingle: false })
      load()
    } catch (err) {
      setError(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!confirm(t('announcements.confirmRemove'))) return
    await supabase.from('annonces').update({ statut: 'retire' }).eq('id', id)
    load()
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('announcements.title')}</h1>
        {isManager && (
          <button onClick={() => setShowForm(true)} className="btn-primary py-2 px-3 text-sm">+ {t('announcements.newAnnouncement')}</button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm opacity-60 py-8 text-center">{t('announcements.noAnnouncements')}</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const isOpen = expanded === a.id
            const isLong = (a.contenu || '').length > 140
            return (
            <div
              key={a.id}
              id={`annonce-${a.id}`}
              className={`card transition-shadow ${a.niveau === 'urgent' ? 'ring-2 ring-red-200 dark:ring-red-900' : ''} ${focusId === a.id ? 'ring-2 ring-brand-400' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="min-w-0 flex-1 text-start"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold break-words">{a.titre}</p>
                    {a.epingle && <Badge tone="gray">📌 {t('announcements.pinned')}</Badge>}
                    <Badge tone={levelTone[a.niveau]}>{t(`announcements.levels.${a.niveau}`)}</Badge>
                  </div>
                  <p className={`text-sm opacity-80 whitespace-pre-wrap break-words ${isOpen ? '' : 'line-clamp-2'}`}>{a.contenu}</p>
                  {isLong && (
                    <span className="text-xs text-brand-500 mt-1 inline-block">
                      {isOpen ? t('announcements.showLess') : t('announcements.showMore')}
                    </span>
                  )}
                  <p className="text-xs opacity-40 mt-2">{formatDateTime(a.created_at, i18n.language)}</p>
                </button>
                {isManager && (
                  <button onClick={() => remove(a.id)} className="text-xs text-red-600 hover:underline shrink-0">{t('announcements.remove')}</button>
                )}
              </div>
            </div>
            )
          })}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('announcements.newAnnouncement')}>
        <form onSubmit={publish} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('announcements.annTitle')}</label>
            <input className="input" value={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('announcements.content')}</label>
            <textarea className="input" rows="4" value={form.contenu} onChange={(e) => setForm((f) => ({ ...f, contenu: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('announcements.level')}</label>
              <select className="input" value={form.niveau} onChange={(e) => setForm((f) => ({ ...f, niveau: e.target.value }))}>
                <option value="info">{t('announcements.levels.info')}</option>
                <option value="important">{t('announcements.levels.important')}</option>
                <option value="urgent">{t('announcements.levels.urgent')}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm pb-3 cursor-pointer">
              <input type="checkbox" checked={form.epingle} onChange={(e) => setForm((f) => ({ ...f, epingle: e.target.checked }))} className="h-4 w-4" />
              {t('announcements.pin')}
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? t('announcements.publishing') : t('announcements.publish')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">{t('announcements.cancel')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
