import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Genre } from '../lib/database.types';

export function TestSupabase() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Тест 1: Проверяем подключение через запрос жанров
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .order('order_index');

      if (error) {
        setError(`Ошибка подключения: ${error.message}`);
        setConnectionStatus('error');
      } else {
        setGenres(data || []);
        setConnectionStatus('connected');
        console.log('✅ Supabase подключен успешно!');
        console.log(`📚 Загружено жанров: ${data?.length || 0}`);
      }
    } catch (err) {
      setError(`Критическая ошибка: ${err}`);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔌 Тест подключения к Supabase</h2>
      
      <div style={{ 
        padding: '15px', 
        marginBottom: '20px',
        borderRadius: '8px',
        backgroundColor: connectionStatus === 'connected' ? '#d4edda' : 
                        connectionStatus === 'error' ? '#f8d7da' : '#fff3cd',
        border: `1px solid ${
          connectionStatus === 'connected' ? '#c3e6cb' : 
          connectionStatus === 'error' ? '#f5c6cb' : '#ffeeba'
        }`
      }}>
        <strong>Статус подключения: </strong>
        {connectionStatus === 'checking' && '⏳ Проверка...'}
        {connectionStatus === 'connected' && '✅ Подключено'}
        {connectionStatus === 'error' && '❌ Ошибка подключения'}
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {loading ? (
        <p>Загрузка данных...</p>
      ) : (
        <>
          {genres.length > 0 && (
            <>
              <h3>📚 Жанры из базы данных ({genres.length}):</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {genres.map(genre => (
                  <div key={genre.id} style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: genre.color + '20',
                    border: `2px solid ${genre.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>{genre.icon}</span>
                    <span style={{ fontWeight: 'bold' }}>{genre.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ 
        marginTop: '30px', 
        padding: '15px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px'
      }}>
        <h4>📋 Информация о подключении:</h4>
        <ul style={{ margin: '10px 0' }}>
          <li>URL проекта: {import.meta.env.VITE_SUPABASE_URL || 'Не установлен'}</li>
          <li>Anon Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Установлен' : '❌ Не установлен'}</li>
          <li>База данных: {connectionStatus === 'connected' ? '✅ Доступна' : '❌ Недоступна'}</li>
        </ul>
      </div>
    </div>
  );
}
