import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Bootstrap primero: el tema propio se carga después para poder sobrescribirlo.
import 'bootstrap/dist/css/bootstrap.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import './styles/theme.css'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { AvisosProvider } from './context/AvisosContext'

// BrowserRouter por fuera de AuthProvider: así el contexto puede usar hooks
// del router si llega a necesitarlos; al revés no sería posible.
//
// AvisosProvider envuelve a AuthProvider porque el login y el registro —que
// viven por fuera de cualquier sesión— también confirman con un aviso.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AvisosProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AvisosProvider>
    </BrowserRouter>
  </StrictMode>
)
