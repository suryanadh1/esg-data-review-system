// src/App.jsx
// -----------
// Root component — sets up client-side routing with React Router.
// WHY React Router? It lets us navigate between pages without a full
// page reload (Single Page Application behaviour).

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar    from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Upload    from './pages/Upload'
import Records   from './pages/Records'
import RecordDetail from './pages/RecordDetail'
import AuditLog  from './pages/AuditLog'

export default function App() {
  return (
    <BrowserRouter>
      {/* Navbar is outside <Routes> so it renders on every page */}
      <Navbar />

      <main className="min-h-screen pt-16">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/upload"     element={<Upload />} />
          <Route path="/records"    element={<Records />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/audit"      element={<AuditLog />} />
          {/* Catch-all: redirect unknown URLs to dashboard */}
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
