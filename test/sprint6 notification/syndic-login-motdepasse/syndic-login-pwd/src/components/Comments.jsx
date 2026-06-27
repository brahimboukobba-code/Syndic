import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'
import { Spinner } from './ui'

// Commentaires polymorphes sur une entité (ici : un projet)
export default function Comments({ entityType, entityId }) {
  const { t, i18n } = useTranslation()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('commentaires')
      .select('id, contenu, created_at, user_id, statut, auteur:utilisateurs(nom_complet)')
      .eq('entite_type', entityType)
      .eq('entite_id', entityId)
      .neq('statut', 'supprime')
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { load() }, [load])

  async function post(e) {
    e.preventDefault()
    if (!text.trim()) return
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('commentaires').insert({
      entite_type: entityType,
      entite_id: entityId,
      user_id: user.id,
      contenu: text.trim(),
    })
    setPosting(false)
    if (!error) { setText(''); load() }
    else alert(error.message)
  }

  return (
    <div>
      <p className="font-semibold mb-3">{t('projects.comments')}</p>

      {loading ? <Spinner /> : comments.length === 0 ? (
        <p className="text-sm opacity-60 mb-3">{t('projects.noComments')}</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{c.auteur?.nom_complet || '—'}</span>
                <span className="opacity-50 text-xs">{formatDateTime(c.created_at, i18n.language)}</span>
              </div>
              <p className="opacity-80 mt-0.5 whitespace-pre-wrap">{c.contenu}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={post} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={t('projects.addComment')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-primary px-4" disabled={posting || !text.trim()}>
          {t('projects.postComment')}
        </button>
      </form>
    </div>
  )
}
