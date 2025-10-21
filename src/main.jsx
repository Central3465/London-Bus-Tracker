// main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWithRouter from './App.jsx'; // <-- Import the wrapped component
import { UserProvider } from "../src/contexts/UserContexts.jsx";
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
    <AppWithRouter /> {/* <-- Render the wrapped component */}
    </UserProvider>
  </React.StrictMode>,
);