import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CLIENT_ID } from './config.js';

console.log('%c⚠️ Hold On!', 'color: #1e90ff; font-size: 20px; font-weight: bold;');
console.log(
  '%cThis browser feature is intended for developers. If someone told you to copy-paste something here, it may be a scam and could compromise your account.',
  'color: #1e90ff; font-size: 14px;'
);
console.log(
  '%cPasting code here could allow attackers to act on your behalf (CSRF), steal your data, or take over your session.',
  'color: #1e90ff; font-size: 14px;'
);
console.log(
  "%cIf you don't understand what this is, close this tab immediately.",
  'color: #ffd700; font-size: 14px; font-style: italic;'
);

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <GoogleOAuthProvider clientId={CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
  // </StrictMode>
);
