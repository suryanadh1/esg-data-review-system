// src/pages/RecordDetail.jsx — UPGRADED
// Added: Flag button, scope/activity display, normalized_emissions, raw_data panel

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchRecord, approveRecord, rejectRecord, flagRecord } from '../api/esgApi'
import StatusBadge    from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

const SCOPE_COLORS = {
  scope_1: 'text-red-400 bg-red-500/10 border-red-500/30',
  scope_2: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  scope_3: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
}

const SOURCE_ICONS = {
  sap_fuel: '🏭', utility_electricity: '⚡', corporate_travel: '✈️', generic: '📋',
}

const Field = ({ label, value, highlight }) => (
  <div className={`glass rounded-xl p-4 ${highlight ? 'border border-orange-500/30' : ''}`}>
    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
    <p className={`font-semibold text-lg ${highlight ? 'text-orange-400' : 'text-white'}`}>
      {value ?? '—'}
    </p>
  </div>
)

const fmt = (v, unit = '') =>
  v == null ? '—' : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 })}${unit}`

export default function RecordDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [record, setRecord]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [reviewer, setReviewer]     = useState('')
  const [notes, setNotes]           = useState('')
  const [flagReason, setFlagReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionMsg, setActionMsg]   = useState('')
  const [activeTab, setActiveTab]   = useState('review')  // 'review' | 'raw'

  const load = () => {
    setLoading(true)
    fetchRecord(id)
      .then(setRecord)
      .catch(() => setError('Record not found.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleAction = async (action) => {
    if (!reviewer.trim()) { setActionMsg('Please enter your name first.'); return }
    if (action === 'flag' && !flagReason.trim()) {
      setActionMsg('Please enter a reason for flagging.'); return
    }
    setSubmitting(true); setActionMsg('')
    try {
      if (action === 'approve') await approveRecord(id, reviewer.trim(), notes.trim())
      else if (action === 'reject') await rejectRecord(id, reviewer.trim(), notes.trim())
      else if (action === 'flag')   await flagRecord(id, reviewer.trim(), flagReason.trim())
      setActionMsg(`✅ Record ${action}d successfully!`)
      load()
    } catch (err) {
      setActionMsg(err.response?.data?.message || `Failed to ${action} record.`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading record…" />
  if (error)   return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <p className="text-red-400 mb-4">{error}</p>
      <Link to="/records" className="btn-secondary">← Back</Link>
    </div>
  )

  const isPending = record.status === 'pending'
  const isFlagged = record.status === 'flagged'
  const canReview = isPending || isFlagged
  const scopeColor = SCOPE_COLORS[record.scope_category] || 'text-slate-400 bg-slate-700 border-slate-600'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      <Link to="/records" className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 mb-6">
        ← Back to Records
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{SOURCE_ICONS[record.source_type] || '📋'}</span>
            <h1 className="text-3xl font-bold text-white">{record.company_name}</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <span className="text-slate-400 text-sm">{record.source_type_display}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 text-sm">{record.activity_type}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 text-sm">Year: {record.year ?? '—'}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={record.status} suspicious={record.is_suspicious} />
          <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${scopeColor}`}>
            {record.scope_category_display}
          </span>
        </div>
      </div>

      {/* Suspicious banner */}
      {record.is_suspicious && (
        <div className="mb-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
          <p className="text-orange-400 font-semibold text-sm mb-1">⚠ System-Flagged as Suspicious</p>
          <p className="text-orange-300/80 text-sm">{record.suspicious_reason}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Normalised Emissions & Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="CO₂e (metric tons)"
                 value={fmt(record.normalized_emissions, ' t')}
                 highlight={record.normalized_emissions != null && record.normalized_emissions > 10000} />
          <Field label="Carbon Emissions"
                 value={fmt(record.carbon_emissions, ' t')} />
          <Field label="Energy (MWh)"
                 value={fmt(record.energy_consumption)} />
          <Field label="Water (m³)"
                 value={fmt(record.water_usage)}
                 highlight={record.water_usage != null && record.water_usage < 0} />
        </div>
      </div>

      {/* Tabs for Review / Raw Data */}
      <div className="flex gap-2 mb-4">
        {['review', 'raw', 'audit'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}>
            {tab === 'review' ? '📝 Review' : tab === 'raw' ? '🔍 Raw Data' : '📋 Audit Trail'}
          </button>
        ))}
      </div>

      {/* Review Tab */}
      {activeTab === 'review' && (
        <>
          {/* Already reviewed info */}
          {!canReview && (
            <div className="glass rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">Review Decision</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Reviewed By</p>
                  <p className="text-white font-medium mt-1">{record.reviewed_by || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Reviewed At</p>
                  <p className="text-white font-medium mt-1">
                    {record.reviewed_at ? new Date(record.reviewed_at).toLocaleString() : '—'}
                  </p>
                </div>
                {record.notes && (
                  <div className="col-span-2">
                    <p className="text-slate-400 text-xs uppercase tracking-wider">Notes</p>
                    <p className="text-slate-200 mt-1">{record.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review form */}
          {canReview && (
            <div className="glass rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Review This Record</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Your Name *</label>
                  <input id="reviewer-name" type="text" placeholder="e.g. Alice Johnson"
                    value={reviewer} onChange={e => setReviewer(e.target.value)}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Notes (for Approve / Reject)</label>
                  <textarea id="review-notes" placeholder="Observations or decision rationale…"
                    value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} className="input-field resize-none" />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Flag Reason (for Flag only) *</label>
                  <textarea id="flag-reason" placeholder="Why are you flagging this record for further attention?"
                    value={flagReason} onChange={e => setFlagReason(e.target.value)}
                    rows={2} className="input-field resize-none" />
                </div>
                {actionMsg && (
                  <p className={`text-sm ${actionMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {actionMsg}
                  </p>
                )}
                <div className="flex gap-3 pt-2 flex-wrap">
                  <button id="approve-btn" onClick={() => handleAction('approve')}
                    disabled={submitting} className="btn-primary flex-1 py-3 min-w-24">
                    {submitting ? '…' : '✅ Approve'}
                  </button>
                  <button id="reject-btn" onClick={() => handleAction('reject')}
                    disabled={submitting} className="btn-danger flex-1 py-3 min-w-24">
                    {submitting ? '…' : '❌ Reject'}
                  </button>
                  <button id="flag-btn" onClick={() => handleAction('flag')}
                    disabled={submitting}
                    className="flex-1 py-3 min-w-24 rounded-xl font-semibold text-sm transition-all
                               bg-orange-500/20 text-orange-400 border border-orange-500/30
                               hover:bg-orange-500/30 disabled:opacity-50">
                    {submitting ? '…' : '🚩 Flag'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Raw Data Tab */}
      {activeTab === 'raw' && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Raw Source Data</h2>
          {Object.keys(record.raw_data || {}).length === 0 ? (
            <p className="text-slate-500">No raw data stored for this record (generic CSV).</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(record.raw_data).map(([k, v]) => (
                <div key={k} className="bg-slate-800/60 rounded-lg p-3">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">{k.replace(/_/g, ' ')}</p>
                  <p className="text-white text-sm mt-0.5 font-mono">{v ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
          {record.original_source_file && (
            <p className="text-slate-500 text-xs mt-4">Source file: {record.original_source_file} · Uploaded by: {record.created_by}</p>
          )}
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Audit Trail</h2>
          {(record.audit_logs || []).length === 0 ? (
            <p className="text-slate-500 text-sm">No audit events yet.</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />
              {record.audit_logs.map((log, i) => (
                <div key={log.id} className={`relative mb-5 ${i === record.audit_logs.length - 1 ? 'mb-0' : ''}`}>
                  <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-slate-900 mt-1 ${
                    log.action === 'approved' ? 'bg-emerald-500'
                    : log.action === 'rejected' ? 'bg-red-500'
                    : log.action === 'flagged' ? 'bg-orange-500'
                    : 'bg-blue-500'
                  }`} />
                  <div className="glass rounded-xl p-4 ml-2">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        log.action === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : log.action === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : log.action === 'flagged' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>{log.action}</span>
                      <span className="text-slate-500 text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 text-sm">By <span className="text-white font-medium">{log.performed_by}</span></p>
                    {log.details && <p className="text-slate-400 text-xs mt-1">{log.details}</p>}
                    {(log.old_value || log.new_value) && (
                      <p className="text-slate-500 text-xs mt-1">
                        {log.old_value} → {log.new_value}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
