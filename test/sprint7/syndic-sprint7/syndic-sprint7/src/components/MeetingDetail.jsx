import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatDateTime, daysUntil } from '../lib/format'
import { uploadFile } from '../lib/storage'
import { Badge, Spinner, AlertBanner } from './ui'
import ProofLink from './ProofLink'

const statusTone = { planifiee: 'gray', convocation_envoyee: 'blue', tenue: 'green', annulee: 'red' }
const isAG = (type) => type === 'ag_ordinaire' || type === 'ag_extraordinaire'

export default function MeetingDetail({ meetingId, onBack, onChanged }) {
  const { t, i18n } = useTranslation()
  const { isManager, session } = useAuth()
  const lang = i18n.language
  // On récupère l'uid depuis la session déjà chargée par AuthContext :
  // plus besoin d'appeler getUser() à chaque clic (source de blocage).
  const uid = session?.user?.id

  const [meeting, setMeeting] = useState(null)
  const [participations, setParticipations] = useState([])
  const [myPart, setMyPart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)      // action en cours (anti double-clic)
  const [error, setError] = useState('')        // erreurs visibles à l'écran

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: m, error: mErr } = await supabase
      .from('reunions').select('*').eq('id', meetingId).maybeSingle()
    if (mErr) { setError(mErr.message); setLoading(false); return }
    setMeeting(m)

    const { data: parts, error: pErr } = await supabase
      .from('reunion_participations')
      .select('id, user_id, statut, habitant:utilisateurs!reunion_participations_user_id_fkey(nom_complet)')
      .eq('reunion_id', meetingId)
    if (pErr) { setError(pErr.message); setLoading(false); return }
    setParticipations(parts || [])
    setMyPart((parts || []).find((p) => p.user_id === uid) || null)
    setLoading(false)
  }, [meetingId, uid])

  useEffect(() => { load() }, [load])

  // Confirmer / décliner sa présence. On vérifie TOUJOURS l'erreur Supabase.
  async function setAttendance(statut) {
    if (busy || !uid) return
    setBusy(true); setError('')
    try {
      let res
      if (myPart) {
        res = await supabase.from('reunion_participations')
          .update({ statut }).eq('id', myPart.id)
      } else {
        res = await supabase.from('reunion_participations')
          .insert({ reunion_id: meetingId, user_id: uid, statut })
      }
      if (res.error) throw res.error
      await load()
    } catch (e) {
      setError(e.message || 'Erreur lors de l’enregistrement de la présence.')
    } finally {
      setBusy(false)
    }
  }

  async function checkIn(part, statut) {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { error: e } = await supabase.from('reunion_participations')
        .update({ statut }).eq('id', part.id)
      if (e) throw e
      await load()
    } catch (e) {
      setError(e.message || 'Erreur lors du pointage.')
    } finally {
      setBusy(false)
    }
  }

  async function sendConvocation() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { error: e } = await supabase.from('reunions').update({
        statut: 'convocation_envoyee',
        date_convocation_envoyee: new Date().toISOString(),
      }).eq('id', meetingId)
      if (e) throw e
      await load(); onChanged?.()
    } catch (e) {
      setError(e.message || 'Erreur lors de l’envoi de la convocation.')
    } finally {
      setBusy(false)
    }
  }

  async function cancelMeeting() {
    if (busy) return
    if (!confirm(t('meetings.confirmCancel'))) return
    setBusy(true); setError('')
    try {
      const { error: e } = await supabase.from('reunions')
        .update({ statut: 'annulee' }).eq('id', meetingId)
      if (e) throw e
      await load(); onChanged?.()
    } catch (e) {
      setError(e.message || 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  // Téléverser le PV puis clôturer (la base refuse une AG 'tenue' sans pv_url)
  async function uploadPVAndClose(file) {
    if (!file || busy) return
    setBusy(true); setError('')
    try {
      const pv_url = await uploadFile('pv', file)
      const { error: e } = await supabase.from('reunions').update({
        pv_url, pv_uploaded_by: uid, statut: 'tenue',
      }).eq('id', meetingId)
      if (e) throw e
      await load(); onChanged?.()
    } catch (e) {
      setError(e.message || 'Erreur lors du téléversement du PV.')
    } finally {
      setBusy(false)
    }
  }

  async function markHeld() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const { error: e } = await supabase.from('reunions')
        .update({ statut: 'tenue' }).eq('id', meetingId)
      if (e) throw e
      await load(); onChanged?.()
    } catch (e) {
      setError(e.message || 'Erreur.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!meeting) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="btn-ghost text-sm -ms-2">← {t('meetings.title')}</button>
        {error && <AlertBanner tone="red">{error}</AlertBanner>}
      </div>
    )
  }

  const days = daysUntil(meeting.date_prevue)
  const isPast = days !== null && days < 0
  const ag = isAG(meeting.type)
  const notClosed = ['planifiee', 'convocation_envoyee'].includes(meeting.statut)
  const confirmedCount = participations.filter((p) => ['confirme', 'present'].includes(p.statut)).length

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="btn-ghost text-sm -ms-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current rtl:rotate-180" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        {t('meetings.title')}
      </button>

      {/* Erreur visible (au lieu d'un échec silencieux) */}
      {error && <AlertBanner tone="red">{error}</AlertBanner>}

      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold">{meeting.titre}</h1>
          <Badge tone={statusTone[meeting.statut]}>{t(`meetings.status.${meeting.statut}`)}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge tone="blue">{t(`meetings.types.${meeting.type}`)}</Badge>
          <span className="text-sm opacity-60">{formatDateTime(meeting.date_prevue, lang)} · {meeting.lieu}</span>
        </div>
        <div className="card">
          <p className="text-sm font-medium mb-1">{t('meetings.agenda')}</p>
          <p className="text-sm opacity-80 whitespace-pre-wrap">{meeting.ordre_du_jour}</p>
        </div>
      </div>

      {/* Alerte délai de convocation : AG à venir, à moins de 15 jours,
          tant qu'elle n'est pas tenue/annulée (planifiée OU convoquée) */}
      {ag && notClosed && days !== null && days >= 0 && days < 15 && (
        <AlertBanner tone="amber">{t('meetings.tooLate')}</AlertBanner>
      )}

      {/* Confirmation de présence (réunion à venir, non clôturée) */}
      {!isPast && notClosed && (
        <div className="card">
          <p className="font-semibold mb-3">{t('meetings.yourAttendance')}</p>
          <div className="flex gap-2">
            <button onClick={() => setAttendance('confirme')} disabled={busy}
              className={`btn flex-1 ${myPart?.statut === 'confirme' ? 'bg-emerald-500 text-white' : 'btn-ghost border border-black/10 dark:border-white/10'}`}>
              {t('meetings.willAttend')}
            </button>
            <button onClick={() => setAttendance('decline')} disabled={busy}
              className={`btn flex-1 ${myPart?.statut === 'decline' ? 'bg-red-500 text-white' : 'btn-ghost border border-black/10 dark:border-white/10'}`}>
              {t('meetings.willNotAttend')}
            </button>
          </div>
          <p className="text-sm opacity-60 mt-3">{t('meetings.confirmedCount', { count: confirmedCount })}</p>
        </div>
      )}

      {/* Actions syndic */}
      {isManager && notClosed && (
        <div className="card space-y-3">
          {meeting.statut === 'planifiee' && (
            <>
              {ag && <p className="text-xs opacity-60">{t('meetings.convocationNotice')}</p>}
              <button onClick={sendConvocation} disabled={busy} className="btn-primary w-full">{t('meetings.sendConvocation')}</button>
            </>
          )}

          {participations.length > 0 && (
            <div>
              <p className="font-semibold mb-2">{t('meetings.checkIn')}</p>
              <div className="space-y-2">
                {participations.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{p.habitant?.nom_complet || '—'}</span>
                    <button onClick={() => checkIn(p, 'present')} disabled={busy} className={`px-2 py-1 rounded-lg text-xs ${p.statut === 'present' ? 'bg-emerald-500 text-white' : 'bg-sand-100 dark:bg-brand-600'}`}>{t('meetings.present')}</button>
                    <button onClick={() => checkIn(p, 'absent')} disabled={busy} className={`px-2 py-1 rounded-lg text-xs ${p.statut === 'absent' ? 'bg-red-500 text-white' : 'bg-sand-100 dark:bg-brand-600'}`}>{t('meetings.absent')}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ag ? (
            <div>
              <label className="mb-1 block text-sm font-medium">{t('meetings.uploadPV')}</label>
              <p className="text-xs opacity-60 mb-2">{t('meetings.pvUploadHint')}</p>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => uploadPVAndClose(e.target.files?.[0])}
                className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-600 dark:file:bg-brand-600 dark:file:text-sand-100" />
              {busy && <p className="text-sm opacity-60 mt-2">{t('finances.saving')}</p>}
            </div>
          ) : (
            <button onClick={markHeld} disabled={busy} className="btn-primary w-full">{t('meetings.markHeld')}</button>
          )}

          <button onClick={cancelMeeting} disabled={busy} className="btn-ghost w-full text-sm text-red-600">{t('meetings.cancelMeeting')}</button>
        </div>
      )}

      {/* PV disponible (réunion tenue) */}
      {meeting.statut === 'tenue' && (
        <div className="card">
          {meeting.pv_url ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-600">{t('meetings.pvAttached')}</span>
              <ProofLink path={meeting.pv_url} />
            </div>
          ) : (
            <p className="text-sm opacity-60">{t('meetings.noPV')}</p>
          )}
        </div>
      )}

      {/* Liste des participants (visible par tous) */}
      {participations.length > 0 && (
        <div className="card">
          <p className="font-semibold mb-3">{t('meetings.attendeesTitle')}</p>
          <div className="space-y-1.5">
            {participations.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.habitant?.nom_complet || '—'}</span>
                <Badge tone={['confirme', 'present'].includes(p.statut) ? 'green' : (p.statut === 'decline' || p.statut === 'absent') ? 'red' : 'gray'}>
                  {t(`meetings.${p.statut === 'present' ? 'present' : p.statut === 'absent' ? 'absent' : p.statut === 'confirme' ? 'willAttend' : p.statut === 'decline' ? 'willNotAttend' : 'attendance'}`)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
