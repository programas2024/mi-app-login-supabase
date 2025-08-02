// supabaseConfig.js
// Este archivo centraliza la configuración y la inicialización del cliente Supabase.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// CONFIGURACIÓN SUPABASE
// ====================================================================================
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
// ¡CLAVE PROPORCIONADA POR EL USUARIO - ASEGÚRATE DE QUE SEA EXACTAMENTE LA DE TU PROYECTO!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);