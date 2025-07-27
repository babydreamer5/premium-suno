import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// StrictMode를 제거하거나 주석 처리
root.render(
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);