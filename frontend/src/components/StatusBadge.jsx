// src/components/StatusBadge.jsx
// --------------------------------
// Reusable pill badge for record status and suspicious flag.

export default function StatusBadge({ status, suspicious }) {
  const statusMap = {
    pending:  'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusMap[status] || 'badge-pending'}`}>
        {status}
      </span>
      {suspicious && (
        <span className="badge-flagged px-2.5 py-0.5 rounded-full text-xs font-semibold">
          ⚠ Suspicious
        </span>
      )}
    </div>
  )
}
