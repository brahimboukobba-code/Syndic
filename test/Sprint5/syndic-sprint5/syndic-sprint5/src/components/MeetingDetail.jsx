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
  const { isManager } = useAuth()
  const lang = i18n.language
  const [meeting, setMeeting] = useState(null)
  const [participations, setParticipations] = useState([])
  const [myPart, setMyPart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [pvError, setPvError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: m } = await supabase.from('reunions').select('*').eq('id', meetingId).maybeSingle()
    setMeeting(m)

    const { data: parts } = await supabase
      .from('reunion_participations')
      .select('id, user_id, statut, habitant:utilisateurs(nom_complet)')
      .eq('reunion_id', meetingId)
    setParticipations(parts || [])

    const { data: { user } } = await supabase.auth.getUser()
    setMyPart((parts || []).find((p) => p.user_id === user.id) || null)
    setLoading(false)
  }, [meetingId])

  useEffect(() => { load() }, [load])

  // Confirmer / décliner sa présence (upsert sur la participation)
  async function setAttendance(statut) {
    const { data: { user } } = await supabase.auth.getUser()
    if (myPart) {
      await supabase.from('reunion_participations').update({ statut }).eq('id', myPart.id)
    } else {
      await supabase.from('reunion_participations').insert({
        reunion_id: meetingId, user_id: user.id, statut,
      })
    }
    load()
  }

  // Pointage le jour J (syndic) : changer le statut d'un participant
  async function checkIn(part, statut) {
    await supabase.from('reunion_participations').update({ statut }).eq('id', part.id)
    load()
  }

  async function sendConvocation() {
    await supabase.from('reunions').update({
      statut: 'convocation_envoyee',
      date_convocation_envoyee: new Date().toISOString(),
    }).eq('id', meetingId)
    load(); onChanged?.()
  }

  async function cancelMeeting() {
    if (!confirm(t('meetings.confirmCancel'))) return
    await supabase.from('reunions').update({ statut: 'annulee' }).eq('id', meetingId)
    load(); onChanged?.()
  }

  // Téléverser le PV puis clôturer (marquer tenue). Le trigger DB refuse
  // de passer une AG en 'tenue' sans pv_url : on uploade donc d'abord.
  async function uploadPVAndClose(file) {
    setPvError('')
    if (!file) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const pv_url = await uploadFile('pv', file)
      const { error } = await supabase.from('reunions').update({
        pv_url, pv_uploaded_by: user.id, statut: 'tenue',
      }).eq('id', meetingId)
      if (error) throw error
      load(); onChanged?.()
    } catch (err) {
      setPvError(err.message || 'Erreur')
    } finally {
      setUploading(false)
    }
  }

  // Clôturer une réunion non-AG (pas de PV obligatoire)
  async function markHeld() {
    const { error } = await supabase.from('reunions').update({ statut: 'tenue' }).eq('id', meetingId)
    if (error) setPvError(error.message)
    else { load(); onChanged?.() }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!meeting) return null

  const days = daysUntil(meeting.date_prevue)
  const isPast = days !== null && days < 0
  const ag = isAG(meeting.type)
  const confirmedCount = participations.filter((p) => ['confirme', 'present'].includes(p.statut)).length

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="btn-ghost text-sm -ms-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current rtl:rotate-180" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        {t('meetings.title')}
      </button>

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

      {/* Alerte délai de convocation (AG, avant envoi) */}
      {ag && meeting.statut === 'planifiee' && days !== null && days < 15 && days >= 0 && (
        <AlertBanner tone="amber">{t('meetings.tooLate')}</AlertBanner>
      )}

      {/* Confirmation de présence (habitant, réunion à venir non clôturée) */}
      {!isPast && ['planifiee', 'convocation_envoyee'].includes(meeting.statut) && (
        <div className="card">
          <p className="font-semibold mb-3">{t('meetings.yourAttendance')}</p>
          <div className="flex gap-2">
            <button onClick={() => setAttendance('confirme')}
              className={`btn flex-1 ${myPart?.statut === 'confirme' ? 'bg-emerald-500 text-white' : 'btn-ghost border border-black/10 dark:border-white/10'}`}>
              {t('meetings.willAttend')}
            </button>
            <button onClick={() => setAttendance('decline')}
              className={`btn flex-1 ${myPart?.statut === 'decline' ? 'bg-red-500 text-white' : 'btn-ghost border border-black/10 dark:border-white/10'}`}>
              {t('meetings.willNotAttend')}
            </button>
          </div>
          <p className="text-sm opacity-60 mt-3">{t('meetings.confirmedCount', { count: confirmedCount })}</p>
        </div>
      )}

      {/* Actions syndic */}
      {isManager && (
        <div className="card space-y-3">
          {meeting.statut === 'planifiee' && (
            <>
              {ag && <p className="text-xs opacity-60">{t('meetings.convocationNotice')}</p>}
              <button onClick={sendConvocation} className="btn-primary w-full">{t('meetings.sendConvocation')}</button>
            </>
          )}

          {/* Pointage du jour + clôture (réunion pas encore tenue) */}
          {['planifiee', 'convocation_envoyee'].includes(meeting.statut) && (
            <>
              {participations.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">{t('meetings.checkIn')}</p>
                  <div className="space-y-2">
                    {participations.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{p.habitant?.nom_complet}</span>
                        <button onClick={() => checkIn(p, 'present')} className={`px-2 py-1 rounded-lg text-xs ${p.statut === 'present' ? 'bg-emerald-500 text-white' : 'bg-sand-100 dark:bg-brand-600'}`}>{t('meetings.present')}</button>
                        <button onClick={() => checkIn(p, 'absent')} className={`px-2 py-1 rounded-lg text-xs ${p.statut === 'absent' ? 'bg-red-500 text-white' : 'bg-sand-100 dark:bg-brand-600'}`}>{t('meetings.absent')}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clôture : PV obligatoire si AG */}
              {ag ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('meetings.uploadPV')}</label>
                  <p className="text-xs opacity-60 mb-2">{t('meetings.pvUploadHint')}</p>
                  <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(e) => uploadPVAndClose(e.target.files?.[0])}
                    className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-600 dark:file:bg-brand-600 dark:file:text-sand-100" />
                  {uploading && <p className="text-sm opacity-60 mt-2">{t('finances.saving')}</p>}
                </div>
              ) : (
                <button onClick={markHeld} className="btn-primary w-full">{t('meetings.markHeld')}</button>
              )}

              <button onClick={cancelMeeting} className="btn-ghost w-full text-sm text-red-600">{t('meetings.cancelMeeting')}</button>
            </>
          )}

          {pvError && <p className="text-sm text-red-600">{pvError}</p>}
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
                <span>{p.habitant?.nom_complet}</span>
                <Badge tone={['confirme', 'present'].includes(p.statut) ? 'green' : p.statut === 'decline' || p.statut === 'absent' ? 'red' : 'gray'}>
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
