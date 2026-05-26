// src/pages/RecordDetail.jsx
// ---------------------------
// Detailed view of a single ESG record with approve/reject workflow.
// This is the most important page — analysts spend the most time here.

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchRecord, approveRecord, rejectRecord } from '../api/esgApi'
import StatusBadge    from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

const fmt = (val, unit = '') =>
  val == null ? '—' : `${Number(val).toLocaleString()}${unit}`

const Field = ({ label, value, highlight }) => (
  <div className={`glass rounded-xl p-4 ${highlight ? 'border border-orange-500/30' : ''}`}>
    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
    <p className={`font-semibold text-lg ${highlight ? 'text-orange-400' : 'text-white'}`}>{value}</p>
  </div>
)

export default function RecordDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [record, setRecord]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Review form state
  const [reviewer, setReviewer] = useState('')
  const [notes, setNotes]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionMsg, setActionMsg]   = useState('')

  const load = () => {
    setLoading(true)
    fetchRecord(id)
      .then(setRecord)
      .catch(() => setError('Record not found.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleAction = async (action) => {
    if (!reviewer.trim()) {
      setActionMsg('Please enter your name before reviewing.')
      return
    }
    setSubmitting(true)
    setActionMsg('')
    try {
      const fn = action === 'approve' ? approveRecord : rejectRecord
      await fn(id, reviewer.trim(), notes.trim())
      setActionMsg(`✅ Record ${action}d successfully!`)
      load()   // refresh record data
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
      <Link to="/records" className="btn-secondary">← Back to Records</Link>
    </div>
  )

  const isPending = record.status === 'pending'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">

      {/* Back link */}
      <Link to="/records" className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 mb-6">
        ← Back to Records
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{record.company_name}</h1>
          <p className="text-slate-400 mt-1">{record.source} · {record.year}</p>
        </div>
        <StatusBadge status={record.status} suspicious={record.is_suspicious} />
      </div>

      {/* Suspicious reason banner */}
      {record.is_suspicious && (
        <div className="mb-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
          <p className="text-orange-400 font-semibold text-sm mb-1">⚠ Suspicious Record — Flagged by System</p>
          <p className="text-orange-300/80 text-sm">{record.suspicious_reason}</p>
        </div>
      )}

      {/* ESG Metrics grid */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">ESG Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Carbon Emissions"   value={fmt(record.carbon_emissions, ' t CO₂')}
                 highlight={record.carbon_emissions != null && record.carbon_emissions > 1000000} />
          <Field label="Energy Consumption" value={fmt(record.energy_consumption, ' MWh')}
                 highlight={record.energy_consumption != null && record.energy_consumption > 5000000} />
          <Field label="Water Usage"        value={fmt(record.water_usage, ' m³')}
                 highlight={record.water_usage != null && record.water_usage < 0} />
          <Field label="Employees"          value={fmt(record.employee_count)}
                 highlight={record.employee_count != null && record.employee_count < 1} />
        </div>
      </div>

      {/* Review info (if already reviewed) */}
      {!isPending && (
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

      {/* Approve / Reject form — only shown for pending records */}
      {isPending && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Review This Record</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Your Name *</label>
              <input
                id="reviewer-name"
                type="text"
                placeholder="e.g. Alice Johnson"
                value={reviewer}
                onChange={e => setReviewer(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Notes (optional)</label>
              <textarea
                id="review-notes"
                placeholder="Add any observations or reasons for your decision…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="input-field resize-none"
              />
            </div>

            {actionMsg && (
              <p className={`text-sm ${actionMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                {actionMsg}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                id="approve-btn"
                onClick={() => handleAction('approve')}
                disabled={submitting}
                className="btn-primary flex-1 py-3"
              >
                {submitting ? '…' : '✅ Approve'}
              </button>
              <button
                id="reject-btn"
                onClick={() => handleAction('reject')}
                disabled={submitting}
                className="btn-danger flex-1 py-3"
              >
                {submitting ? '…' : '❌ Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit log timeline */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Audit Trail</h2>
        {record.audit_logs.length === 0 ? (
          <p className="text-slate-500 text-sm">No audit events yet.</p>
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-700" />

            {record.audit_logs.map((log, i) => (
              <div key={log.id} className={`relative mb-6 ${i === record.audit_logs.length - 1 ? '' : ''}`}>
                {/* Dot */}
                <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-slate-900 ${
                  log.action === 'approved' ? 'bg-emerald-500'
                  : log.action === 'rejected' ? 'bg-red-500'
                  : 'bg-blue-500'
                }`} />

                <div className="glass rounded-xl p-4 ml-2">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      log.action === 'approved' ? 'badge-approved'
                      : log.action === 'rejected' ? 'badge-rejected'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    By <span className="text-white font-medium">{log.performed_by}</span>
                  </p>
                  {log.details && (
                    <p className="text-slate-400 text-xs mt-1">{log.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
