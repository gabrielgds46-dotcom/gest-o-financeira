import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// O registro do service worker vive em <Avisos/>, para poder avisar da
// nova versão em vez de recarregar por conta própria.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
