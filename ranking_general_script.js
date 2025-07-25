// ranking_general_script.js - Lógica para la página de Ranking de Sopa de Letras General

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// CONFIGURACIÓN SUPABASE
// ====================================================================================
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
// ¡CLAVE PROPORCIONADA POR EL USUARIO - ASEGÚRATE DE QUE SEA EXACTAMENTE LA DE TU PROYECTO!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====================================================================================
// REFERENCIAS A ELEMENTOS DEL DOM
// ====================================================================================
let loaderWrapper;
let rankingTableBody;
let helpButton; // Nueva referencia al botón de ayuda

// ====================================================================================
// FUNCIONES DE UTILIDAD
// ====================================================================================

/**
 * Muestra el loader de la página.
 * @param {string} message - Mensaje a mostrar en el loader.
 */
function showLoader(message = 'Cargando...') {
    if (loaderWrapper) {
        const loaderText = loaderWrapper.querySelector('h1');
        if (loaderText) {
            loaderText.textContent = message;
        }
        loaderWrapper.classList.remove('hidden');
    }
}

/**
 * Oculta el loader de la página.
 */
function hideLoader() {
    if (loaderWrapper) {
        loaderWrapper.classList.add('hidden');
    }
}

/**
 * Formatea segundos a formato MM:SS.
 * @param {number} totalSeconds - Segundos totales.
 * @returns {string} Tiempo formateado.
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// ====================================================================================
// LÓGICA DEL RANKING
// ====================================================================================

/**
 * Carga y muestra el ranking de la Sopa de Letras General.
 */
async function fetchAndDisplayRanking() {
    showLoader('Cargando Ranking...');
    
    // Obtener el ID del usuario actual para resaltar su fila en el ranking
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || null;

    // CONSULTA A LA TABLA 'sopa_rankings_general' PARA EL RANKING
    const { data, error } = await supabase
        .from('sopa_rankings_general')
        .select('*') // Selecciona todas las columnas, ya que esta tabla es específica para el ranking
        // ORDENACIÓN: Primero por oro (desc), luego por diamantes (desc), luego por tiempo (asc)
        .order('gold_earned', { ascending: false })      // Mayor oro primero
        .order('diamonds_earned', { ascending: false }) // Luego mayor diamantes
        .order('time_taken_seconds', { ascending: true }) // Finalmente menor tiempo (para desempate)
        .limit(10); // Mostrar el top 10

    hideLoader();

    if (error) {
        console.error("Error fetching ranking:", error);
        rankingTableBody.innerHTML = `<tr><td colspan="6">Error al cargar el ranking. Por favor, intenta de nuevo.</td></tr>`;
        return;
    }

    rankingTableBody.innerHTML = ''; // Limpiar tabla existente

    if (data.length === 0) {
        rankingTableBody.innerHTML = `<tr><td colspan="6">No hay resultados aún. ¡Sé el primero en jugar!</td></tr>`;
    } else {
        data.forEach((entry, index) => {
            // Comprobar si esta entrada pertenece al usuario actual
            const isCurrentUser = currentUserId && entry.user_id === currentUserId; // Usar entry.user_id para esta tabla
            const rowClass = isCurrentUser ? 'current-player-rank' : '';

            // Asegurarse de que los valores no sean nulos antes de mostrarlos
            // Aunque las columnas están NOT NULL, es buena práctica para evitar 'null' en la UI si algo falla
            const time = entry.time_taken_seconds !== null ? formatTime(entry.time_taken_seconds) : 'N/A';
            const words = entry.words_found_count !== null ? entry.words_found_count : 'N/A';
            const gold = entry.gold_earned !== null ? entry.gold_earned : 'N/A';
            const diamonds = entry.diamonds_earned !== null ? entry.diamonds_earned : 'N/A';

            const row = rankingTableBody.insertRow();
            row.className = rowClass; // Añadir la clase a la fila
            row.innerHTML = `
                <td class="rank-number" data-label="#">${index + 1}</td>
                <td data-label="Jugador">${entry.username || 'Anónimo'}</td>
                <td class="time-taken" data-label="Tiempo">${time}</td>
                <td data-label="Palabras">${words}</td>
                <td data-label="Oro">${gold} <i class="fas fa-coins"></i></td>
                <td data-label="Diamantes">${diamonds} <i class="fas fa-gem"></i></td>
            `;
        });
    }
}

// ====================================================================================
// LÓGICA DEL BOTÓN DE AYUDA
// ====================================================================================

/**
 * Muestra el modal de ayuda con información sobre el ranking.
 */
function showHelpModal() {
    Swal.fire({
        title: '¡Bienvenido al Ranking General!',
        html: `
            <p>Descubre qué tanta agilidad tienes para encontrar todas las palabras en el menor tiempo.</p>
            <p>Aquí encontrarás a los mejores jugadores.</p>
            <p>Cada paso hoy, mañana es tu éxito.</p>
        `,
        icon: 'info', // Puedes cambiar el icono a 'question' si lo prefieres
        confirmButtonText: '¡Entendido!',
        customClass: {
            popup: 'swal2-custom-help-modal', // Clase CSS personalizada
            title: 'swal2-title',
            htmlContainer: 'swal2-html-container',
            confirmButton: 'swal2-confirm'
        }
    });
}

// ====================================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ====================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    loaderWrapper = document.getElementById('loader-wrapper');
    rankingTableBody = document.getElementById('ranking-table-body');
    helpButton = document.getElementById('help-button'); // Obtener referencia al botón de ayuda

    // Añadir event listener al botón de ayuda
    if (helpButton) {
        helpButton.addEventListener('click', showHelpModal);
    }

    // Cargar y mostrar el ranking al cargar la página
    fetchAndDisplayRanking();
});
