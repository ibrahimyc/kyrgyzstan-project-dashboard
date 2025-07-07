// build.js
const fs = require('fs');

// Environment variables'ları oku
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('🔧 Building with configuration...');
console.log('📊 Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
console.log('🔑 Supabase Key:', supabaseAnonKey ? 'SET' : 'NOT SET');

// index.html'i oku
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Placeholder'ları değiştir
indexHtml = indexHtml.replace('YOUR_SUPABASE_URL', supabaseUrl);
indexHtml = indexHtml.replace('YOUR_SUPABASE_ANON_KEY', supabaseAnonKey);

// Güncellenmiş dosyayı yaz
fs.writeFileSync('index.html', indexHtml);

console.log('✅ API keys injected successfully!');
