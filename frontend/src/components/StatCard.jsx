// src/components/StatCard.jsx
// ----------------------------
// Dashboard metric card with icon, value, label, and optional colour.

export default function StatCard({ label, value, icon, color = 'emerald', sub }) {
  const colorMap = {
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    amber:   'from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    red:     'from-red-600/20 to-red-600/5 border-red-500/20 text-red-400',
    blue:    'from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    orange:  'from-orange-600/20 to-orange-600/5 border-orange-500/20 text-orange-400',
  }

  return (
    <div className={`glass rounded-2xl p-6 bg-gradient-to-br border fade-in ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
