import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'
import { Badge, Spinner } from '../components/ui'

const actionTone = { insert: 'green', update: 'amber', delete: 'red' }
const actionIcon = {
  insert: 'M12 5v14M5 12h14',
  update: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z',
  delete: 'M6 7h12M9 7V5h6v2m-1 0v12H10V7',
}

export default function History() {
  const { t, i18n } = useTranslation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const lang = i18n.language

  useEffect(() => {
    supabase.from('audit_log')
      .select('id, table_name, action, changed_fields, user_role, created_at, new_values, old_values')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{t('history.title')}</h1>
      <p className="text-sm opacity-60 mb-6">{t('history.subtitle')}</p>

      {logs.length === 0 ? (
        <p className="text-sm opacity-60 py-8 text-center">{t('history.empty')}</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const label = (n) => (n?.intitule || n?.titre || n?.periode || n?.nom_complet || '')
            const subject = label(log.new_values) || label(log.old_values)
            const tableName = t(`history.tables.${log.table_name}`, log.table_name)
            return (
              <div key={log.id} className="flex items-start gap-3 card py-3">
                <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center
                  ${log.action === 'insert' ? 'bg-emerald-100 dark:bg-emerald-900/40' : log.action === 'update' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 fill-none stroke-current
                    ${log.action === 'insert' ? 'text-emerald-600' : log.action === 'update' ? 'text-amber-600' : 'text-red-600'}`}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={actionIcon[log.action]} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{tableName}</span>
                    {subject && <span className={log.action === 'delete' ? 'line-through opacity-70' : ''}> — {subject}</span>}
                  </p>
                  <p className="text-xs opacity-60 mt-0.5">
                    {t(`history.actions.${log.action}`)} {t('history.by')} {t(`roles.${log.user_role}`, log.user_role)} · {formatDateTime(log.created_at, lang)}
                  </p>
                  {log.action === 'update' && log.changed_fields?.length > 0 && (
                    <p className="text-xs opacity-50 mt-1">
                      {t('history.changed')} : {log.changed_fields.filter((f) => !['updated_at','updated_by'].includes(f)).join(', ')}
                    </p>
                  )}
                </div>
                <Badge tone={actionTone[log.action]}>{t(`history.actions.${log.action}`)}</Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
