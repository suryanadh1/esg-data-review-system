// src/api/esgApi.js
// ------------------
// Centralises all HTTP calls to the Django backend.
//
// WHY A SEPARATE API FILE?
//   If the backend URL changes (e.g., from localhost to Render),
//   we update ONE line here — not dozens of fetch() calls across components.
//
// WHY AXIOS over fetch()?
//   Axios automatically parses JSON, handles errors better, and
//   makes it easy to set a base URL once.

import axios from 'axios'

// Base URL from Vite env variable.
// In dev: Vite proxy forwards /api → http://localhost:8000
// In prod: set VITE_API_BASE_URL=https://your-app.onrender.com in Vercel env vars
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// ── Dashboard ──────────────────────────────────────────────────────────────
export const fetchDashboard = () =>
  api.get('/api/dashboard/').then(r => r.data.data)

// ── Records ────────────────────────────────────────────────────────────────
export const fetchRecords = (params = {}) =>
  api.get('/api/records/', { params }).then(r => r.data)

export const fetchRecord = (id) =>
  api.get(`/api/records/${id}/`).then(r => r.data.data)

// ── Review Actions ─────────────────────────────────────────────────────────
export const approveRecord = (id, reviewerName, notes = '') =>
  api.post(`/api/records/${id}/approve/`, { reviewer_name: reviewerName, notes })
     .then(r => r.data)

export const rejectRecord = (id, reviewerName, notes = '') =>
  api.post(`/api/records/${id}/reject/`, { reviewer_name: reviewerName, notes })
     .then(r => r.data)

// ── CSV Upload ─────────────────────────────────────────────────────────────
// WHY FormData? File uploads must use multipart/form-data encoding.
// Axios sets the correct Content-Type header automatically when FormData is used.
export const uploadCSV = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/api/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

// ── Audit Logs ─────────────────────────────────────────────────────────────
export const fetchAuditLogs = () =>
  api.get('/api/audit-logs/').then(r => r.data)

export default api
