// src/pages/Upload.jsx
// ---------------------
// CSV upload page with drag-and-drop, file preview, and upload feedback.

import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { uploadCSV } from '../api/esgApi'

export default function Upload() {
  const [file, setFile]         = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)   // success response
  const [error, setError]       = useState('')
  const inputRef                = useRef()

  // ── File selection handlers ───────────────────────────────────────────
  const handleFile = (f) => {
    setError('')
    setResult(null)
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      setError('Only .csv files are supported.')
      return
    }
    setFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  // ── Upload ────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await uploadCSV(file)
      setResult(res)
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 fade-in">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload ESG Data</h1>
        <p className="text-slate-400 mt-1">
          Upload a CSV file to ingest ESG records. The system will normalise
          the data and flag suspicious entries automatically.
        </p>
      </div>

      {/* CSV format guide */}
      <div className="glass rounded-2xl p-5 mb-6 border-l-4 border-emerald-500">
        <p className="text-sm font-semibold text-emerald-400 mb-2">Required CSV Columns</p>
        <div className="font-mono text-xs text-slate-300 bg-slate-900/50 rounded-lg p-3 overflow-x-auto">
          company_name, source, year, carbon_emissions,<br />
          energy_consumption, water_usage, employee_count
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Optional columns are allowed and will be ignored. Missing numeric values are accepted (treated as null).
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`glass rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer
                    border-2 border-dashed transition-colors mb-6
                    ${dragging
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-slate-600 hover:border-slate-400 hover:bg-slate-800/30'
                    }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        <span className="text-5xl mb-4">{file ? '📄' : '☁️'}</span>
        {file ? (
          <>
            <p className="text-emerald-400 font-semibold">{file.name}</p>
            <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
          </>
        ) : (
          <>
            <p className="text-slate-300 font-medium">Drag & drop your CSV here</p>
            <p className="text-slate-500 text-sm mt-1">or click to browse files</p>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Success result */}
      {result && (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 fade-in">
          <p className="text-emerald-400 font-semibold mb-3">✅ Upload Successful!</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{result.total_imported}</p>
              <p className="text-slate-400 text-xs">Records Imported</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-400">{result.suspicious_count}</p>
              <p className="text-slate-400 text-xs">Flagged Suspicious</p>
            </div>
          </div>
          <Link
            to="/records"
            className="btn-primary mt-4 w-full text-center block"
          >
            View Records →
          </Link>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Uploading & Processing…
          </span>
        ) : 'Upload CSV'}
      </button>

      {/* Sample data links */}
      <div className="mt-6 glass rounded-xl p-4">
        <p className="text-slate-400 text-sm font-medium mb-2">📁 Sample CSV files (in /sample_data/)</p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• <span className="text-slate-300">esg_sample_clean.csv</span> — 15 clean records (no suspicious flags)</li>
          <li>• <span className="text-slate-300">esg_sample_dirty.csv</span> — 15 records with intentional errors (triggers flags)</li>
        </ul>
      </div>
    </div>
  )
}
