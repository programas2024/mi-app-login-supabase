// js/main.js

// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Referencia y Funciones del Loader Global ---
export const loader = document.getElementById('loader'); // Asegúrate de que el ID 'loader' exista en todos los HTML

export function showLoader(message = 'Cargando...') {
    if (loader) {
        loader.querySelector('p').textContent = message;
        loader.classList.remove('loader-hidden');
    }
}

export function hideLoader() {
    if (loader) {
        loader.classList.add('loader-hidden');
    }
}

// --- Función para mostrar mensajes con SweetAlert2 ---
export function showSwal(icon, title, text) {
    const isAutoClose = (icon === 'success' || icon === 'info');

    Swal.fire({
        icon: icon,
        title: title,
        text: text,
        showConfirmButton: !isAutoClose,
        timer: isAutoClose ? 3000 : undefined,
        timerProgressBar: isAutoClose,
    });
}

// --- Función para cerrar sesión (Global) ---
export async function signOut() {
    showLoader('Cerrando sesión...');
    const { error } = await supabase.auth.signOut();
    hideLoader();

    if (error) {
        showSwal('error', 'Error al cerrar sesión', 'No se pudo cerrar la sesión correctamente: ' + error.message);
    } else {
        showSwal('info', 'Sesión Cerrada', 'Has cerrado sesión. ¡Hasta pronto!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}