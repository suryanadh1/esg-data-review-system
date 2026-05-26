// src/pages/Dashboard.jsx
// ------------------------
// Main dashboard page — shows summary stats and charts.
// Uses Recharts (a React chart library built on D3).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { fetchDashboard } from '../api/esgApi'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const ACTION_COLORS = { uploaded: '#3b82f6', approved: '#22c55e', rejected: '#ef4444' }

export default function Dashboard() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner message="Loading dashboard..." />
  if (error)   return <div className="max-w-7xl mx-auto px-6 py-12 text-red-400">{error}</div>

  const { summary, by_source, by_year, recent_activity } = data

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">ESG Data Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of all ingested ESG records and review status.</p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Records" value={summary.total}    icon="📊" color="blue" />
        <StatCard label="Pending"       value={summary.pending}  icon="⏳" color="amber" />
        <StatCard label="Approved"      value={summary.approved} icon="✅" color="emerald" />
        <StatCard label="Rejected"      value={summary.rejected} icon="❌" color="red" />
        <StatCard label="Flagged"       value={summary.flagged}  icon="⚠️" color="orange" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* Bar chart — records by year */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Records by Year</h2>
          {by_year.length === 0
            ? <p className="text-slate-500 text-sm">No data yet. Upload a CSV to get started.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={by_year} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#22c55e' }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Pie chart — records by source */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Records by Source</h2>
          {by_source.length === 0
            ? <p className="text-slate-500 text-sm">No data yet. Upload a CSV to get started.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={by_source}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ source, percent }) =>
                      `${source} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {by_source.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <Link to="/audit" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
            View all →
          </Link>
        </div>

        {recent_activity.length === 0 ? (
          <p className="text-slate-500 text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {recent_activity.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-3 border-b border-slate-700/50 last:border-0">
                <span className="text-lg mt-0.5">
                  {log.action === 'uploaded' ? '📤' : log.action === 'approved' ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200">
                    <span className="font-semibold">{log.record_company}</span>{' '}
                    <span style={{ color: ACTION_COLORS[log.action] }}>
                      {log.action}
                    </span>
                    {' '}by <span className="text-slate-300">{log.performed_by}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-4">
        <Link to="/upload"  className="btn-primary">+ Upload CSV</Link>
        <Link to="/records" className="btn-secondary">View All Records</Link>
      </div>
    </div>
  )
}
