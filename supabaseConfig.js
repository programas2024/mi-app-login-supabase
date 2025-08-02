// supabaseConfig.js
// Este archivo centraliza la configuración y la inicialización del cliente Supabase.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- Configuración de Supabase ---
// ¡IMPORTANTE! Reemplaza estos valores con la URL y la clave anon de tu proyecto Supabase
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co'; // Tu URL de proyecto Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvCArR5nLo'; // Tu clave anon (pública) de Supabase

// Inicializa el cliente Supabase y lo exporta
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);