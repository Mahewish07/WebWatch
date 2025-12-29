import React from 'react';
import ReactDOM from 'react-dom/client';

// 1. SARE IMPORTS SABSE UPAR RAKHO
import * as process from 'process';
import { Buffer } from 'buffer';
import './index.css';
import App from './App';
import { SocketProvider } from './SocketContext';

// 2. POLYFILLS (Imports ke baad, lekin Render se pehle)
window.global = window;
window.process = process;
window.Buffer = Buffer;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <SocketProvider>
    <App />
  </SocketProvider>
);