// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/index.css';
import './config/amplify';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);