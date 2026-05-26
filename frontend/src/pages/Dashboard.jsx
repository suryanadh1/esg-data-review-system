// src/pages/Dashboard.jsx — UPGRADED
// Added: Scope breakdown chart, emissions by scope, source_type distribution, approval/flagged rates

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fetchDashboard } from '../api/esgApi'
import StatCard       from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'

const SCOPE_COLORS = { scope_1: '#ef4444', scope_2: '#eab308', scope_3: '#3b82f6' }
const SOURCE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
const SCOPE_LABELS  = { scope_1: 'Scope 1', scope_2: 'Scope 2', scope_3: 'Scope 3' }

const SOURCE_TYPE_LABELS = {
  sap_fuel: '🏭 SAP Fuel',
  utility_electricity: '⚡ Utility',
  corporate_travel: '✈️ Travel',
  generic: '📋 Generic',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 text-sm border border-slate-700">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner message="Loading dashboard…" />
  if (error)   return <p className="text-red-400 p-8">{error}</p>

  const { summary, by_scope, by_source_type, by_year, recent_activity, emissions_by_scope } = data

  // Prepare scope chart data
  const scopeChartData = (by_scope || []).map(s => ({
    name: SCOPE_LABELS[s.scope_category] || s.scope_category,
    records: s.count,
    fill: SCOPE_COLORS[s.scope_category] || '#64748b',
  }))

  // Prepare emissions by scope
  const emissionsData = (emissions_by_scope || [])
    .filter(s => s.total_emissions != null)
    .map(s => ({
      name: SCOPE_LABELS[s.scope_category] || s.scope_category,
      emissions: parseFloat((s.total_emissions || 0).toFixed(1)),
      fill: SCOPE_COLORS[s.scope_category] || '#64748b',
    }))

  // Source type pie
  const sourceTypePie = (by_source_type || []).map((s, i) => ({
    name: SOURCE_TYPE_LABELS[s.source_type] || s.source_type,
    value: s.count,
    fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }))

  // Year bar
  const yearData = (by_year || []).map(s => ({
    year: String(s.year ?? 'N/A'),
    count: s.count,
  }))

  const ACTION_COLORS = {
    uploaded: '#3b82f6', approved: '#10b981', rejected: '#ef4444', flagged: '#f59e0b',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">ESG Dashboard</h1>
        <p className="text-slate-400 mt-1">Multi-source emissions overview — Scopes 1, 2 & 3</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Records"  value={summary.total}    icon="📊" color="blue" />
        <StatCard label="Pending Review" value={summary.pending}  icon="⏳" color="amber" />
        <StatCard label="Approved"       value={summary.approved} icon="✅" color="green" />
        <StatCard label="Rejected"       value={summary.rejected} icon="❌" color="red" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Flagged (Analyst)" value={summary.flagged_status} icon="🚩" color="orange" />
        <StatCard label="Suspicious (System)" value={summary.suspicious} icon="⚠" color="orange" />
        <StatCard label="Approval Rate" value={`${summary.approval_rate}%`} icon="📈" color="green" />
        <StatCard label="Suspicious Rate" value={`${summary.flagged_rate}%`} icon="🔍" color="amber" />
      </div>

      {/* Charts row 1 — Scope breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Records by Scope */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Records by GHG Scope</h2>
          {scopeChartData.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet — upload a CSV to see scope distribution.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scopeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="records" name="Records" radius={[4, 4, 0, 0]}>
                  {scopeChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CO₂e Emissions by Scope */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Total CO₂e by Scope (metric tons)</h2>
          {emissionsData.length === 0 ? (
            <p className="text-slate-500 text-sm">No emissions data — upload source-specific CSVs.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={emissionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="emissions" name="CO₂e (t)" radius={[4, 4, 0, 0]}>
                  {emissionsData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 — Source type pie + Year bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Source Type Pie */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Records by Source Type</h2>
          {sourceTypePie.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceTypePie} dataKey="value" nameKey="name"
                     cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) =>
                       `${name} ${(percent * 100).toFixed(0)}%`
                     } labelLine={false}>
                  {sourceTypePie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Records by Year */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Records by Year</h2>
          {yearData.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Records" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <Link to="/audit-log" className="text-emerald-400 hover:text-emerald-300 text-sm">View All →</Link>
        </div>
        {(recent_activity || []).length === 0 ? (
          <p className="text-slate-500 text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {recent_activity.map(log => (
              <div key={log.id} className="flex items-center justify-between flex-wrap gap-2
                                            p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ACTION_COLORS[log.action] || '#64748b' }} />
                  <div>
                    <span className="text-white text-sm font-medium">{log.record_company}</span>
                    <span className="text-slate-500 text-xs mx-2">·</span>
                    <span className="text-slate-400 text-xs capitalize">{log.action}</span>
                    {log.record_source_type && (
                      <span className="ml-2 text-slate-500 text-xs">
                        {SOURCE_TYPE_LABELS[log.record_source_type] || log.record_source_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs">{log.performed_by}</span>
                  <span className="text-slate-600 text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
