import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // ← 이 줄이 중요
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);