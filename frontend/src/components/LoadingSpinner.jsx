// src/components/LoadingSpinner.jsx
// ----------------------------------
// Simple centered spinner for loading states.

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  )
}
