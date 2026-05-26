// src/pages/AuditLog.jsx
// -----------------------
// Displays a full chronological timeline of every system action.
// WHY THIS PAGE? Auditors and compliance officers need a complete,
// tamper-evident log of all data decisions.

import { useEffect, useState } from 'react'
import { Link }                from 'react-router-dom'
import { fetchAuditLogs }      from '../api/esgApi'
import LoadingSpinner          from '../components/LoadingSpinner'

const ACTION_STYLE = {
  uploaded: { dot: 'bg-blue-500',    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    icon: '📤' },
  approved: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✅' },
  rejected: { dot: 'bg-red-500',     badge: 'bg-red-500/20 text-red-400 border-red-500/30',       icon: '❌' },
}

export default function AuditLog() {
  const [logs, setLogs]       = useState([])
  const [count, setCount]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState('')   // 'uploaded' | 'approved' | 'rejected' | ''

  useEffect(() => {
    fetchAuditLogs()
      .then(res => { setLogs(res.data); setCount(res.count) })
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [])

  const displayed = filter ? logs.filter(l => l.action === filter) : logs

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Log</h1>
          <p className="text-slate-400 mt-1">{count} total events recorded</p>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {['', 'uploaded', 'approved', 'rejected'].map(f => (
            <button
              key={f || 'all'}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {f || 'All'} {f ? `(${logs.filter(l => l.action === f).length})` : `(${count})`}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loading ? (
        <LoadingSpinner message="Loading audit log…" />
      ) : displayed.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-lg">No audit events yet.</p>
          <p className="text-slate-500 text-sm mt-2">Upload a CSV to generate your first events.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <div className="relative pl-6">
            {/* Vertical timeline line */}
            <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-700" />

            {displayed.map((log, i) => {
              const style = ACTION_STYLE[log.action] || ACTION_STYLE.uploaded
              return (
                <div key={log.id} className={`relative mb-5 ${i === displayed.length - 1 ? 'mb-0' : ''}`}>
                  {/* Timeline dot */}
                  <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-slate-900 mt-1 ${style.dot}`} />

                  <div className="ml-2 glass rounded-xl p-4 hover:bg-slate-800/60 transition-colors">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{style.icon}</span>
                        <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                          {log.action}
                        </span>
                        <Link
                          to={`/records/${log.record}`}
                          className="text-slate-200 font-medium text-sm hover:text-emerald-400 transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          {log.record_company} ({log.record_year})
                        </Link>
                      </div>
                      <span className="text-slate-500 text-xs whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-400 text-sm mt-2">
                      By <span className="text-slate-300 font-medium">{log.performed_by}</span>
                    </p>
                    {log.details && (
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{log.details}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
