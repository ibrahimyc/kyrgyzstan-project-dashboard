// build.js
const fs = require('fs');

// Environment variables'ları oku
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// index.html'i oku
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Placeholder'ları değiştir
indexHtml = indexHtml.replace('YOUR_SUPABASE_URL', supabaseUrl);
indexHtml = indexHtml.replace('YOUR_SUPABASE_ANON_KEY', supabaseAnonKey);

// Güncellenmiş dosyayı yaz
fs.writeFileSync('index.html', indexHtml);

// supabase-client.js'i de güncelle
let clientJs = fs.readFileSync('js/supabase-client.js', 'utf8');
clientJs = clientJs.replace('https://your-project-ref.supabase.co', supabaseUrl);
clientJs = clientJs.replace('your-anon-key', supabaseAnonKey);
fs.writeFileSync('js/supabase-client.js', clientJs);

console.log('API keys injected successfully!');
