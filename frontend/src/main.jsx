// src/main.jsx
// Entry point — mounts React app into the #root div.
// WHY StrictMode? It warns about common mistakes during development.
// It has no effect on the production build.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
