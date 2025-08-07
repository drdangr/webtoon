// Временный файл для отладки переменных окружения
console.log('🔍 Environment Debug:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL || 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');
console.log('MODE:', import.meta.env.MODE);
console.log('PROD:', import.meta.env.PROD);
console.log('All env vars:', Object.keys(import.meta.env));

export {};
