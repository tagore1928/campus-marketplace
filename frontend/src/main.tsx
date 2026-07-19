import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import axios from 'axios';
import App from './App.tsx'

// Set global axios base URL
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
