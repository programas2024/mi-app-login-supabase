// leaderboard.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// ====================================================================================
// CONFIGURACIÓN SUPABASE
// ====================================================================================
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
// ¡CLAVE PROPORCIONADA POR EL USUARIO - ASEGÚRATE DE QUE SEA EXACTAMENTE LA DE TU PROYECTO!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBojyWvYCrR5nLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====================================================================================
// REFERENCIAS A ELEMENTOS DEL DOM
// ====================================================================================
let loaderLeaderboard;
let leaderboardTableBody;
let backToDashboardButton;

// ====================================================================================
// FUNCIONES DE UTILIDAD
// ====================================================================================

/**
 * Muestra el loader de la página.
 * @param {string} message - Mensaje a mostrar en el loader.
 */
function showLoader(message = 'Cargando clasificación...') {
    if (loaderLeaderboard) {
        const loaderText = loaderLeaderboard.querySelector('p'); // Asumiendo que el texto está en un <p>
        if (loaderText) {
            loaderText.textContent = message;
        }
        loaderLeaderboard.classList.remove('loader-hidden');
    }
}

/**
 * Oculta el loader de la página.
 */
function hideLoader() {
    if (loaderLeaderboard) {
        loaderLeaderboard.classList.add('loader-hidden');
    }
}

// ====================================================================================
// LÓGICA DE CLASIFICACIÓN
// ====================================================================================

/**
 * Función para cargar y mostrar la tabla de clasificación global desde la tabla 'profiles'.
 * Muestra el oro y los diamantes acumulados por cada jugador.
 * @param {object} supabase - La instancia de cliente Supabase inicializada.
 * @param {HTMLElement} [loaderElement=null] - Opcional: El elemento loader específico de la página.
 * @param {string} [currentUserId=null] - Opcional: El ID del usuario actualmente logueado para resaltarlo.
 */
export async function loadLeaderboard(supabase, loaderElement = null, currentUserId = null) {
    const leaderboardTableBody = document.querySelector('.leaderboard-table tbody');
    if (!leaderboardTableBody) {
        console.error("No se encontró el cuerpo de la tabla de clasificación (.leaderboard-table tbody).");
        return;
    }

    // Muestra el loader si se proporcionó uno
    if (loaderElement) {
        loaderElement.classList.remove('loader-hidden');
        const loaderText = loaderElement.querySelector('p');
        if (loaderText) loaderText.textContent = 'Cargando clasificación global...'; // Mensaje específico
    }

    try {
        // CAMBIO CLAVE: Consultar la tabla 'profiles'
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, username, gold, diamonds') // Seleccionar id, username, gold, diamonds directamente de profiles
            // Ordenar por 'gold' (descendente) y luego por 'diamonds' (descendente) para el ranking global
            .order('gold', { ascending: false })
            .order('diamonds', { ascending: false })
            .limit(100); // Puedes ajustar el límite si quieres mostrar más o menos jugadores

        if (error) {
            throw error;
        }

        leaderboardTableBody.innerHTML = ''; // Limpia cualquier fila existente

        if (profiles && profiles.length > 0) {
            profiles.forEach((profile, index) => { // Cambiado 'entry' a 'profile' para mayor claridad
                const row = leaderboardTableBody.insertRow();
                // Determina si esta fila es la del usuario actual
                const isCurrentUser = currentUserId && profile.id === currentUserId; // Usar profile.id
                if (isCurrentUser) {
                    row.classList.add('current-user-row'); // Añade la clase de resaltado
                }

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="player-name-cell" data-user-id="${profile.id}">${profile.username || 'Desconocido'}</td>
                    <td>${profile.gold || 0} <i class="fas fa-coins"></i></td>
                    <td>${profile.diamonds || 0} <i class="fas fa-gem"></i></td>
                `;
            });

            // Añadir evento click a cada nombre de jugador
            document.querySelectorAll('.player-name-cell').forEach(cell => {
                cell.style.cursor = 'pointer';
                cell.style.fontWeight = 'bold';
                // Solo aplicar primary-color si no es la fila del usuario actual,
                // ya que el current-user-row ya define su propio color de texto
                if (!cell.parentElement.classList.contains('current-user-row')) {
                    cell.style.color = 'var(--primary-color)';
                } else {
                    cell.style.color = 'inherit'; // Deja que el color de la fila prevalezca
                }

                cell.addEventListener('click', async (event) => {
                    const userId = event.target.dataset.userId;
                    if (userId) {
                        await showPlayerDetails(supabase, userId);
                    }
                });
            });

        } else {
            const row = leaderboardTableBody.insertRow();
            // Colspan ajustado a 4 columnas
            row.innerHTML = `<td colspan="4">No hay datos en la clasificación. ¡Sé el primero en jugar!</td>`;
        }

    } catch (error) {
        console.error('Error al cargar la tabla de clasificación global:', error.message);
        const row = leaderboardTableBody.insertRow();
        // Colspan ajustado a 4 columnas
        row.innerHTML = `<td colspan="4">Error al cargar la clasificación: ${error.message}</td>`;
    } finally {
        if (loaderElement) {
            loaderElement.classList.add('loader-hidden');
        }
    }
}

/**
 * Función para mostrar los detalles de un jugador en un SweetAlert2 modal.
 * Esta función sigue consultando la tabla 'profiles' para los detalles generales del usuario.
 * @param {object} supabase - La instancia de cliente Supabase inicializada.
 * @param {string} userId - El ID del usuario cuyo perfil se va a mostrar.
 */
async function showPlayerDetails(supabase, userId) {
    Swal.fire({
        title: 'Cargando detalles...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('username, country, diamonds, gold') // Estas columnas están en 'profiles'
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        if (!userProfile) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se encontraron los detalles de este jugador.',
                confirmButtonText: 'Ok'
            });
            return;
        }

        const countryIcon = getCountryFlagEmoji(userProfile.country);

        Swal.fire({
            title: `<strong>${userProfile.username || 'Jugador Desconocido'}</strong>`,
            html: `
                <div style="text-align: left; padding: 10px; font-size: 1.1em;">
                    <p style="margin-bottom: 8px;"><i class="fas fa-globe-americas" style="color: #6a5acd;"></i> <strong>País:</strong> ${countryIcon} ${userProfile.country || 'No especificado'}</p>
                    <p style="margin-bottom: 8px;"><i class="fas fa-gem" style="color: #00bcd4;"></i> <strong>Diamantes:</strong> <span style="font-weight: bold; color: #00bcd4;">${userProfile.diamonds || 0}</span></p>
                    <p><i class="fas fa-coins" style="color: #ffd700;"></i> <strong>Oro:</strong> <span style="font-weight: bold; color: #ffd700;">${userProfile.gold || 0}</span></p>
                </div>
            `,
            icon: 'info',
            iconHtml: '<i class="fas fa-user" style="color: var(--primary-color);"></i>',
            showCloseButton: true,
            confirmButtonText: '¡Entendido!',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
        });

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `No se pudo cargar la información: ${error.message}`,
            confirmButtonText: 'Cerrar'
        });
        console.error('Error al cargar detalles del jugador:', error.message);
    }
}

function getCountryFlagEmoji(countryName) {
    if (!countryName) return '';
    const flags = {
        'Colombia': '🇨🇴',
        'España': '🇪🇸',
        'Mexico': '🇲🇽',
        'Argentina': '🇦�',
        'USA': '🇺🇸',
        'Canada': '🇨🇦'
        // Añade más países según necesites
    };
    return flags[countryName] || '';
}
