import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { formatMAD, formatDate, formatDateTime } from '../lib/format'
import { tallyPrinciple, tallyQuotes, closePrincipleVote, closeQuoteVote, autoCloseIfDue } from '../lib/voteEngine'
import { Badge, Spinner, Modal } from './ui'
import VoteResults from './VoteResults'
import QuoteForm from './QuoteForm'
import ProofLink from './ProofLink'
import Comments from './Comments'

const phaseTone = {
  brouillon: 'gray', vote_principe: 'blue', collecte_devis: 'amber',
  vote_devis: 'blue', accepte: 'green', refuse: 'red', realise: 'green', annule: 'gray',
}

export default function ProjectDetail({ projetId, onBack, onChanged }) {
  const { t, i18n } = useTranslation()
  const { isManager, canVote } = useAuth()
  const lang = i18n.language
  const [projet, setProjet] = useState(null)
  const [tally, setTally] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [quoteCounts, setQuoteCounts] = useState({})
  const [myVote, setMyVote] = useState(null)
  const [myLogement, setMyLogement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showQuoteForm, setShowQuoteForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    // Charger le projet
    let { data: p } = await supabase.from('projets').select('*').eq('id', projetId).maybeSingle()
    if (!p) { setLoading(false); return }

    // Auto-clôture si échéance dépassée, puis recharger
    const closed = await autoCloseIfDue(p)
    if (closed) {
      const { data: p2 } = await supabase.from('projets').select('*').eq('id', projetId).maybeSingle()
      p = p2 || p
    }
    setProjet(p)

    // Mon logement (pour voter)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: occ } = await supabase
      .from('occupations')
      .select('logement_id, type')
      .eq('user_id', user.id)
      .eq('type', 'proprietaire')
      .is('date_fin', null)
      .maybeSingle()
    setMyLogement(occ?.logement_id || null)

    // Dépouillement principe
    setTally(await tallyPrinciple(projetId))

    // Mon vote actuel
    const scrutinType = p.phase === 'vote_devis' ? 'projet_devis' : 'projet_principe'
    const { data: mv } = await supabase
      .from('votes')
      .select('choix, devis_id')
      .eq('scrutin_type', scrutinType)
      .eq('scrutin_id', projetId)
      .eq('user_id', user.id)
      .maybeSingle()
    setMyVote(mv || null)

    // Devis + comptage
    const { data: dv } = await supabase
      .from('devis')
      .select('*, auteur:utilisateurs(nom_complet)')
      .eq('projet_id', projetId)
      .order('created_at', { ascending: true })
    setQuotes(dv || [])
    setQuoteCounts(await tallyQuotes(projetId))

    setLoading(false)
  }, [projetId])

  useEffect(() => { load() }, [load])

  // --- Actions syndic ---
  async function openPrincipleVote() {
    const days = 7
    const close = new Date(); close.setDate(close.getDate() + days)
    await supabase.from('projets').update({
      phase: 'vote_principe',
      date_ouverture_vote: new Date().toISOString(),
      date_cloture_vote: close.toISOString(),
    }).eq('id', projetId)
    load(); onChanged?.()
  }

  async function doClosePrinciple() {
    if (!confirm(t('projects.confirmClose'))) return
    await closePrincipleVote(projet)
    load(); onChanged?.()
  }

  async function openQuoteVote() {
    const days = 7
    const close = new Date(); close.setDate(close.getDate() + days)
    await supabase.from('projets').update({
      phase: 'vote_devis',
      date_ouverture_vote_devis: new Date().toISOString(),
      date_cloture_vote_devis: close.toISOString(),
    }).eq('id', projetId)
    load(); onChanged?.()
  }

  async function doCloseQuoteVote() {
    if (!confirm(t('projects.confirmClose'))) return
    await closeQuoteVote(projet)
    load(); onChanged?.()
  }

  // --- Actions votant ---
  async function vote(choix) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('votes').insert({
      scrutin_type: 'projet_principe',
      scrutin_id: projetId,
      projet_id: projetId,
      user_id: user.id,
      logement_id: myLogement,
      choix,
    })
    if (error) alert(error.message)
    else load()
  }

  async function voteQuote(devisId) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('votes').insert({
      scrutin_type: 'projet_devis',
      scrutin_id: projetId,
      projet_id: projetId,
      user_id: user.id,
      logement_id: myLogement,
      choix: 'devis_choisi',
      devis_id: devisId,
    })
    if (error) alert(error.message)
    else load()
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!projet) return null

  const canVotePrinciple = canVote && myLogement && projet.phase === 'vote_principe' && !myVote
  const canVoteQuote = canVote && myLogement && projet.phase === 'vote_devis' && !myVote

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="btn-ghost text-sm -ms-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current rtl:rotate-180" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        {t('projects.title')}
      </button>

      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-bold">{projet.intitule}</h1>
          <Badge tone={phaseTone[projet.phase]}>{t(`projects.phases.${projet.phase}`)}</Badge>
        </div>
        <p className="text-sm opacity-80 whitespace-pre-wrap">{projet.details_travaux}</p>
      </div>

      {/* Phase brouillon : le syndic ouvre le vote */}
      {projet.phase === 'brouillon' && isManager && (
        <div className="card">
          <button onClick={openPrincipleVote} className="btn-primary w-full">{t('projects.openVote')}</button>
        </div>
      )}

      {/* Phase vote de principe */}
      {projet.phase === 'vote_principe' && (
        <div className="card space-y-4">
          {projet.date_cloture_vote && (
            <p className="text-sm opacity-60">
              {t('projects.voteCloses')} {formatDateTime(projet.date_cloture_vote, lang)}
            </p>
          )}
          {tally && <VoteResults {...tally} seuil={projet.seuil_acceptation ?? 0.75} />}

          {/* Boutons de vote */}
          {canVotePrinciple ? (
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button onClick={() => vote('oui')} className="btn bg-emerald-500 text-white hover:bg-emerald-600">{t('projects.voteYes')}</button>
              <button onClick={() => vote('non')} className="btn bg-red-500 text-white hover:bg-red-600">{t('projects.voteNo')}</button>
              <button onClick={() => vote('abstention')} className="btn-ghost">{t('projects.voteAbstain')}</button>
            </div>
          ) : myVote ? (
            <p className="text-sm text-center pt-2 opacity-70">
              {t('projects.voted')} : <span className="font-medium">{t(`projects.${myVote.choix === 'oui' ? 'yes' : myVote.choix === 'non' ? 'no' : 'abstain'}`)}</span>
            </p>
          ) : !canVote ? (
            <p className="text-xs text-center opacity-50 pt-2">{t('projects.onlyOwnersVote')}</p>
          ) : null}

          {isManager && (
            <button onClick={doClosePrinciple} className="btn-ghost w-full text-sm border border-black/10 dark:border-white/10">
              {t('projects.closeVote')}
            </button>
          )}
        </div>
      )}

      {/* Phase refusé */}
      {projet.phase === 'refuse' && (
        <div className="card">
          <p className="text-sm text-red-600">{t('projects.principleRejected')}</p>
          {tally && <div className="mt-3"><VoteResults {...tally} seuil={projet.seuil_acceptation ?? 0.75} /></div>}
        </div>
      )}

      {/* Phases avec devis : collecte, vote, accepté */}
      {['collecte_devis', 'vote_devis', 'accepte', 'realise'].includes(projet.phase) && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{t('projects.submitQuote')}</p>
            {projet.phase === 'collecte_devis' && (
              <button onClick={() => setShowQuoteForm(true)} className="btn-primary py-1.5 px-3 text-sm">+ {t('projects.submitQuote')}</button>
            )}
          </div>

          {quotes.length === 0 ? (
            <p className="text-sm opacity-60">{t('projects.noQuotes')}</p>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => {
                const isWinner = projet.devis_gagnant_id === q.id
                const votes = quoteCounts[q.id] || 0
                return (
                  <div key={q.id} className={`rounded-xl border p-3 ${isWinner ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-black/10 dark:border-white/10'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{q.intitule}</p>
                        <p className="text-sm opacity-60">{q.prestataire}{q.delai_estime_jours ? ` · ${q.delai_estime_jours} j` : ''}</p>
                      </div>
                      <p className="font-semibold whitespace-nowrap">{formatMAD(q.montant)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {isWinner && <Badge tone="green">{t('projects.winningQuote')}</Badge>}
                      {projet.phase === 'vote_devis' && <Badge tone="blue">{t('projects.participation', { count: votes })}</Badge>}
                      <span className="text-xs opacity-50">{t('projects.proposedBy')} {q.auteur?.nom_complet || '—'}</span>
                      <ProofLink path={q.document_url} className="ms-auto" />
                    </div>
                    {projet.phase === 'vote_devis' && canVote && myLogement && (
                      myVote?.devis_id === q.id ? (
                        <p className="text-sm text-emerald-600 mt-2 text-center">✓ {t('projects.votedForThis')}</p>
                      ) : !myVote ? (
                        <button onClick={() => voteQuote(q.id)} className="btn-primary w-full mt-2 py-1.5 text-sm">{t('projects.voteForQuote')}</button>
                      ) : null
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Transitions syndic */}
          {isManager && projet.phase === 'collecte_devis' && quotes.length > 0 && (
            <button onClick={openQuoteVote} className="btn-primary w-full">{t('projects.openQuoteVote')}</button>
          )}
          {isManager && projet.phase === 'vote_devis' && (
            <button onClick={doCloseQuoteVote} className="btn-ghost w-full text-sm border border-black/10 dark:border-white/10">{t('projects.closeQuoteVote')}</button>
          )}
        </div>
      )}

      {/* Commentaires (toutes phases) */}
      <div className="card">
        <Comments entityType="projet" entityId={projetId} />
      </div>

      <Modal open={showQuoteForm} onClose={() => setShowQuoteForm(false)} title={t('projects.submitQuote')}>
        <QuoteForm projetId={projetId} onSaved={() => { setShowQuoteForm(false); load() }} onCancel={() => setShowQuoteForm(false)} />
      </Modal>
    </div>
  )
}
