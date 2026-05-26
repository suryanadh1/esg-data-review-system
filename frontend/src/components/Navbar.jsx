// src/components/Navbar.jsx
// --------------------------
// Top navigation bar — visible on every page.
// Uses React Router's NavLink so the active page link is highlighted.

import { NavLink, Link } from 'react-router-dom'

const links = [
  { to: '/',        label: 'Dashboard' },
  { to: '/upload',  label: 'Upload' },
  { to: '/records', label: 'Records' },
  { to: '/audit',   label: 'Audit Log' },
]

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center
                            group-hover:bg-emerald-500 transition-colors">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              ESG <span className="text-emerald-400">Review</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
