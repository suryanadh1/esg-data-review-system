// src/components/StatusBadge.jsx — UPGRADED
// Added: 'flagged' status support

export default function StatusBadge({ status, suspicious }) {
  const config = {
    pending:  { label: 'Pending',  cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    approved: { label: 'Approved', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    rejected: { label: 'Rejected', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
    flagged:  { label: 'Flagged',  cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  }

  const { label, cls } = config[status] || { label: status, cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
        {label}
      </span>
      {suspicious && (
        <span className="text-xs font-semibold px-2 py-1 rounded-full border
                         bg-orange-500/20 text-orange-400 border-orange-500/30">
          ⚠ Suspicious
        </span>
      )}
    </div>
  )
}
