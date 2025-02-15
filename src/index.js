import React from 'react';
import { createRoot } from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';
import App from './components/App';
import './styles/index.css';

// Configure Amplify
Amplify.configure(awsconfig);

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);