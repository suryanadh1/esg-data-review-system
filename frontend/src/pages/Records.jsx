// src/pages/Records.jsx — UPGRADED
// Added: source_type filter, scope filter, flagged status badge, normalized_emissions column

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchRecords } from '../api/esgApi'
import StatusBadge    from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

const SCOPE_LABELS = {
  scope_1: { label: 'Scope 1', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  scope_2: { label: 'Scope 2', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  scope_3: { label: 'Scope 3', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
}

const SOURCE_TYPE_ICONS = {
  sap_fuel:             '🏭',
  utility_electricity:  '⚡',
  corporate_travel:     '✈️',
  generic:              '📋',
}

function ScopeBadge({ scope }) {
  const s = SCOPE_LABELS[scope] || { label: scope, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  )
}

export default function Records() {
  const [records, setRecords]   = useState([])
  const [count, setCount]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const [statusFilter, setStatusFilter]         = useState('')
  const [suspiciousFilter, setSuspiciousFilter] = useState('')
  const [sourceTypeFilter, setSourceTypeFilter] = useState('')
  const [scopeFilter, setScopeFilter]           = useState('')
  const [search, setSearch]                     = useState('')
  const [searchInput, setSearchInput]           = useState('')

  const load = () => {
    setLoading(true)
    const params = {}
    if (statusFilter)     params.status       = statusFilter
    if (suspiciousFilter) params.is_suspicious = suspiciousFilter
    if (sourceTypeFilter) params.source_type  = sourceTypeFilter
    if (scopeFilter)      params.scope        = scopeFilter
    if (search)           params.search       = search

    fetchRecords(params)
      .then(res => { setRecords(res.data); setCount(res.count) })
      .catch(() => setError('Failed to load records.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter, suspiciousFilter, sourceTypeFilter, scopeFilter, search])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
  }

  const clearFilters = () => {
    setStatusFilter('')
    setSuspiciousFilter('')
    setSourceTypeFilter('')
    setScopeFilter('')
    setSearch('')
    setSearchInput('')
  }

  const hasFilters = statusFilter || suspiciousFilter || sourceTypeFilter || scopeFilter || search

  const fmt = (v) => v == null ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">ESG Records</h1>
          <p className="text-slate-400 mt-1">{count} records{hasFilters ? ' (filtered)' : ''}</p>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-secondary text-sm">
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
            <input
              type="text" placeholder="Search company / employee…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input-field flex-1 text-sm py-2"
            />
            <button type="submit" className="btn-secondary text-sm px-3">Search</button>
          </form>

          {/* Status */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input-field text-sm py-2 min-w-32">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="flagged">Flagged</option>
          </select>

          {/* Source Type */}
          <select value={sourceTypeFilter} onChange={e => setSourceTypeFilter(e.target.value)}
            className="input-field text-sm py-2 min-w-40">
            <option value="">All Sources</option>
            <option value="sap_fuel">🏭 SAP Fuel</option>
            <option value="utility_electricity">⚡ Utility</option>
            <option value="corporate_travel">✈️ Travel</option>
            <option value="generic">📋 Generic</option>
          </select>

          {/* Scope */}
          <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}
            className="input-field text-sm py-2 min-w-36">
            <option value="">All Scopes</option>
            <option value="scope_1">Scope 1</option>
            <option value="scope_2">Scope 2</option>
            <option value="scope_3">Scope 3</option>
          </select>

          {/* Suspicious */}
          <select value={suspiciousFilter} onChange={e => setSuspiciousFilter(e.target.value)}
            className="input-field text-sm py-2 min-w-36">
            <option value="">All Records</option>
            <option value="true">⚠ Suspicious Only</option>
            <option value="false">✓ Clean Only</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loading ? (
        <LoadingSpinner message="Loading records…" />
      ) : records.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-slate-300 text-xl font-medium">No records found</p>
          <p className="text-slate-500 mt-2">Upload a CSV file to get started.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Source</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Record</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Scope</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">CO₂e (t)</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Year</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Flag</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-lg" title={r.source_type_display}>
                        {SOURCE_TYPE_ICONS[r.source_type] || '📋'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{r.company_name}</p>
                      <p className="text-slate-500 text-xs">{r.activity_type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ScopeBadge scope={r.scope_category} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-slate-200 font-mono">
                        {fmt(r.normalized_emissions ?? r.carbon_emissions)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{r.year ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={r.status} suspicious={r.is_suspicious} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_suspicious && (
                        <span title={r.suspicious_reason}
                          className="text-orange-400 cursor-help" aria-label="Suspicious">⚠</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/records/${r.id}`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
