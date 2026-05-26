// src/pages/Upload.jsx — UPGRADED
// Added: source type selector, uploaded_by input, column guide per source type

import { useState, useRef } from 'react'
import { uploadCSV } from '../api/esgApi'

const SOURCE_TYPES = [
  {
    value: 'sap_fuel',
    label: 'SAP Fuel & Procurement',
    scope: 'Scope 1',
    scopeColor: 'text-red-400',
    icon: '🏭',
    columns: 'plant_code, fuel_type, fuel_liters, procurement_cost, posting_date',
    sample: 'sap_fuel_clean.csv / sap_fuel_dirty.csv',
  },
  {
    value: 'utility_electricity',
    label: 'Utility Electricity',
    scope: 'Scope 2',
    scopeColor: 'text-yellow-400',
    icon: '⚡',
    columns: 'meter_id, facility_name, kwh_usage, billing_period, tariff_type',
    sample: 'utility_electricity_clean.csv / utility_electricity_dirty.csv',
  },
  {
    value: 'corporate_travel',
    label: 'Corporate Travel',
    scope: 'Scope 3',
    scopeColor: 'text-blue-400',
    icon: '✈️',
    columns: 'employee_id, from_airport, to_airport, travel_mode, distance_km, hotel_nights, travel_date',
    sample: 'corporate_travel_clean.csv / corporate_travel_dirty.csv',
  },
  {
    value: 'generic',
    label: 'Generic ESG (Legacy)',
    scope: 'Scope 1',
    scopeColor: 'text-slate-400',
    icon: '📋',
    columns: 'company_name, source, year, carbon_emissions, energy_consumption, water_usage, employee_count',
    sample: 'esg_sample_clean.csv / esg_sample_dirty.csv',
  },
]

export default function Upload() {
  const [sourceType, setSourceType]   = useState('sap_fuel')
  const [uploadedBy, setUploadedBy]   = useState('')
  const [dragging, setDragging]       = useState(false)
  const [file, setFile]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)
  const [error, setError]             = useState('')
  const fileRef = useRef()

  const selectedSource = SOURCE_TYPES.find(s => s.value === sourceType)

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.endsWith('.csv')) { setError('Only .csv files accepted.'); return }
    setFile(f)
    setResult(null)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    if (!file)       { setError('Please select a CSV file first.'); return }
    if (!uploadedBy.trim()) { setError('Please enter your name.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await uploadCSV(file, sourceType, uploadedBy.trim())
      setResult(res.data)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Check the file format.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload ESG Data</h1>
        <p className="text-slate-400 mt-1">Select the data source type, then upload your CSV file.</p>
      </div>

      {/* Source Type Selector */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">1. Select Data Source</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOURCE_TYPES.map(s => (
            <button
              key={s.value}
              onClick={() => setSourceType(s.value)}
              className={`p-4 rounded-xl border text-left transition-all ${
                sourceType === s.value
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{s.icon}</span>
                <span className="text-white font-medium text-sm">{s.label}</span>
              </div>
              <span className={`text-xs font-bold ${s.scopeColor}`}>{s.scope}</span>
            </button>
          ))}
        </div>

        {/* Column guide */}
        {selectedSource && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Required CSV Columns</p>
            <p className="text-slate-300 text-sm font-mono">{selectedSource.columns}</p>
            <p className="text-slate-500 text-xs mt-2">Sample file: {selectedSource.sample}</p>
          </div>
        )}
      </div>

      {/* Uploader name */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">2. Your Name</h2>
        <input
          id="uploader-name"
          type="text"
          placeholder="e.g. Alice Johnson"
          value={uploadedBy}
          onChange={e => setUploadedBy(e.target.value)}
          className="input-field"
        />
        <p className="text-slate-500 text-xs mt-2">Recorded in the audit trail for compliance.</p>
      </div>

      {/* File drop zone */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">3. Upload CSV</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-emerald-400 bg-emerald-500/10'
              : file
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-slate-600 hover:border-slate-500'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
          {file ? (
            <>
              <p className="text-4xl mb-3">📄</p>
              <p className="text-emerald-400 font-semibold">{file.name}</p>
              <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">☁️</p>
              <p className="text-slate-300 font-medium">Drop CSV here or click to browse</p>
              <p className="text-slate-500 text-sm mt-1">Only .csv files accepted</p>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 text-sm">⚠ {error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-emerald-400 font-semibold text-lg mb-2">✅ Upload Successful</p>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{result.total_imported}</p>
              <p className="text-slate-400 text-xs">Records Imported</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-400">{result.suspicious_count}</p>
              <p className="text-slate-400 text-xs">Suspicious</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-emerald-300 mt-2">{result.source_type}</p>
              <p className="text-slate-400 text-xs">Source Type</p>
            </div>
          </div>
        </div>
      )}

      <button
        id="upload-btn"
        onClick={handleSubmit}
        disabled={loading || !file}
        className="btn-primary w-full py-4 text-lg"
      >
        {loading ? '⏳ Processing...' : `Upload ${selectedSource?.icon || ''} ${selectedSource?.label || 'CSV'}`}
      </button>
    </div>
  )
}
