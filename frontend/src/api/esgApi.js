// src/api/esgApi.js — UPGRADED
// Added: flagRecord(), uploadCSV now accepts sourceType + uploadedBy

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000,
})

// ── Upload CSV ──────────────────────────────────────────────────────────────
export const uploadCSV = (file, sourceType = 'generic', uploadedBy = 'System') => {
  const form = new FormData()
  form.append('file', file)
  form.append('source_type', sourceType)
  form.append('uploaded_by', uploadedBy)
  return api.post('/upload/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ── Records ─────────────────────────────────────────────────────────────────
export const fetchRecords = (params = {}) =>
  api.get('/records/', { params }).then(r => r.data)

export const fetchRecord = (id) =>
  api.get(`/records/${id}/`).then(r => r.data.data)

// ── Review actions ───────────────────────────────────────────────────────────
export const approveRecord = (id, reviewerName, notes = '') =>
  api.post(`/records/${id}/approve/`, { reviewer_name: reviewerName, notes })

export const rejectRecord = (id, reviewerName, notes = '') =>
  api.post(`/records/${id}/reject/`, { reviewer_name: reviewerName, notes })

// Flag — analyst-initiated (different from system suspicious flag)
export const flagRecord = (id, reviewerName, flagReason) =>
  api.post(`/records/${id}/flag/`, { reviewer_name: reviewerName, flag_reason: flagReason })

// ── Audit log ────────────────────────────────────────────────────────────────
export const fetchAuditLogs = (params = {}) =>
  api.get('/audit-logs/', { params }).then(r => r.data)

// ── Dashboard ────────────────────────────────────────────────────────────────
export const fetchDashboard = () =>
  api.get('/dashboard/').then(r => r.data.data)

export default api
