import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupConsoleSuppression } from './utils/console-suppressions';
import { setupDevHelpers } from './utils/dev-helpers';
import './utils/csrf'; // ← ADD THIS LINE!

// Setup console suppressions for cleaner development experience
setupConsoleSuppression();

// Setup silent development helpers
setupDevHelpers();

createRoot(document.getElementById('root')!).render(<App />);
