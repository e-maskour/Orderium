import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@orderium/ui/styles.css';
import '@orderium/ui/notifications.css';
import './theme.css';
import './client.css';

createRoot(document.getElementById('root')!).render(<App />);
