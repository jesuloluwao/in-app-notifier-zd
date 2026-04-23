import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@zendeskgarden/react-theming'
import App from './App.jsx'
import { ClientProvider } from './contexts/ClientProvider.jsx'
import '@zendeskgarden/css-bedrock'
import './index.css'

console.log('=== INDEX.JSX LOADED ===');
console.log('ZAFClient available:', typeof window.ZAFClient !== 'undefined');

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <ClientProvider>
      <App />
    </ClientProvider>
  </ThemeProvider>
)