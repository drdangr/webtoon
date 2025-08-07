import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App'; // Старая версия с localStorage
// import AppSupabase from './AppSupabase'; // Версия с гибридным хранением
import AppSupabaseDB from './AppSupabaseDB'; // Полная версия с БД Supabase
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppSupabaseDB />
  </React.StrictMode>,
);