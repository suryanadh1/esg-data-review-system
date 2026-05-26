// src/pages/Records.jsx
// ----------------------
// Shows a filterable table of all ESG records.
// Clicking a row navigates to the RecordDetail page.

import { useEffect, useState } from 'react'
import { useNavigate }          from 'react-router-dom'
import { fetchRecords }         from '../api/esgApi'
import StatusBadge              from '../components/StatusBadge'
import LoadingSpinner           from '../components/LoadingSpinner'

const fmt = (val) => (val == null ? '—' : Number(val).toLocaleString())

export default function Records() {
  const [records, setRecords]   = useState([])
  const [count, setCount]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const navigate                = useNavigate()

  // Filter state
  const [filters, setFilters] = useState({
    status: '', is_suspicious: '', search: '', source: '', year: ''
  })

  const loadRecords = (f = filters) => {
    setLoading(true)
    const params = {}
    if (f.status)       params.status        = f.status
    if (f.is_suspicious) params.is_suspicious = f.is_suspicious
    if (f.search)       params.search        = f.search
    if (f.source)       params.source        = f.source
    if (f.year)         params.year          = f.year

    fetchRecords(params)
      .then(res => { setRecords(res.data); setCount(res.count) })
      .catch(() => setError('Failed to load records.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadRecords() }, [])

  const handleFilterChange = (key, val) => {
    const updated = { ...filters, [key]: val }
    setFilters(updated)
    loadRecords(updated)
  }

  const clearFilters = () => {
    const reset = { status: '', is_suspicious: '', search: '', source: '', year: '' }
    setFilters(reset)
    loadRecords(reset)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">ESG Records</h1>
          <p className="text-slate-400 mt-1">{count} records found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Search company…"
          value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)}
          className="input-field col-span-2 md:col-span-1"
        />
        <select
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
          className="input-field"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filters.is_suspicious}
          onChange={e => handleFilterChange('is_suspicious', e.target.value)}
          className="input-field"
        >
          <option value="">All Records</option>
          <option value="true">Suspicious Only</option>
          <option value="false">Clean Only</option>
        </select>
        <input
          type="text"
          placeholder="Source…"
          value={filters.source}
          onChange={e => handleFilterChange('source', e.target.value)}
          className="input-field"
        />
        <button onClick={clearFilters} className="btn-secondary text-sm">
          Clear Filters
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Loading records…" />
      ) : records.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <p className="text-slate-400 text-lg">No records found.</p>
          <p className="text-slate-500 text-sm mt-2">Upload a CSV file to get started.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  {['Company', 'Source', 'Year', 'CO₂ (t)', 'Energy (MWh)', 'Employees', 'Status', 'Uploaded'].map(h => (
                    <th key={h} className="px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr
                    key={rec.id}
                    onClick={() => navigate(`/records/${rec.id}`)}
                    className="border-b border-slate-700/50 table-row-hover cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white truncate max-w-[160px]">{rec.company_name}</div>
                      {rec.is_suspicious && (
                        <span className="text-orange-400 text-xs">⚠ Flagged</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{rec.source}</td>
                    <td className="px-4 py-3 text-slate-300">{rec.year}</td>
                    <td className="px-4 py-3 text-slate-300">{fmt(rec.carbon_emissions)}</td>
                    <td className="px-4 py-3 text-slate-300">{fmt(rec.energy_consumption)}</td>
                    <td className="px-4 py-3 text-slate-300">{fmt(rec.employee_count)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rec.status} suspicious={rec.is_suspicious} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(rec.uploaded_at).toLocaleDateString()}
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
