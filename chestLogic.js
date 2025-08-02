// chestLogic.js

// Importaciones necesarias para este módulo: Supabase y Confetti
import { supabase } from './supabaseConfig.js'; // Importa la instancia de Supabase configurada
import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm';

// --- Elementos del DOM específicos para el cofre ---
let chestBtn;
let goldDisplay;
let diamondsDisplay;
let loaderDiv; // Necesario para showLoader/hideLoader local

// ====================================================================================
// FUNCIONES DE UTILIDAD LOCALES PARA chestLogic.js
// ====================================================================================

/**
 * Muestra el loader de la página (local a chestLogic.js).
 * @param {string} message - Mensaje a mostrar en el loader.
 */
function showLoader(message = 'Cargando...') {
    if (loaderDiv) {
        const loaderText = loaderDiv.querySelector('p');
        if (loaderText) {
            loaderText.textContent = message;
        }
        loaderDiv.classList.remove('loader-hidden');
    }
}

/**
 * Oculta el loader de la página (local a chestLogic.js).
 */
function hideLoader() {
    if (loaderDiv) {
        loaderDiv.classList.add('loader-hidden');
    }
}

/**
 * Helper para mostrar SweetAlert2 con estilos personalizados (local a chestLogic.js).
 * @param {string} icon - 'success', 'error', 'info', 'warning', 'question'
 * @param {string} title - Título del modal.
 * @param {string} text - Contenido del modal.
 * @param {string} [confirmButtonText='Entendido'] - Texto del botón de confirmación.
 */
function showCustomSwal(icon, title, text, confirmButtonText = 'Entendido') {
    Swal.fire({
        icon: icon,
        title: title,
        html: text,
        confirmButtonText: confirmButtonText,
        customClass: {
            popup: 'swal2-chest-popup', // Usamos la clase específica del cofre
            title: 'swal2-chest-title',
            htmlContainer: 'swal2-chest-html',
            confirmButton: 'swal2-confirm-button'
        },
        buttonsStyling: false,
    });
}

// ====================================================================================
// FUNCIONES DE LÓGICA DEL COFRE (Exportadas)
// ====================================================================================

/**
 * Actualiza los displays de Oro y Diamantes en el dashboard.
 * Esta función es exportada para ser llamada desde script.js si es necesario.
 */
export async function updateCurrencyDisplay() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn('No hay usuario autenticado para actualizar la moneda.');
        return;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('gold, diamonds')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error al actualizar la vista de moneda:', error.message);
    } else if (profile) {
        if (goldDisplay) goldDisplay.textContent = profile.gold || 0;
        if (diamondsDisplay) diamondsDisplay.textContent = profile.diamonds || 0;
    }
}

/**
 * Abre un cofre y otorga recompensas al usuario.
 */
export async function openChest() {
    const { data: { user } = {} } = await supabase.auth.getUser(); // Añadir valor por defecto para user
    if (!user) {
        showCustomSwal('error', 'Error', 'Debes iniciar sesión para abrir cofres.');
        return;
    }

    // Deshabilitar el botón mientras se procesa
    if (chestBtn) {
        chestBtn.disabled = true;
        chestBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Abriendo...`;
    }
    showLoader('Abriendo cofre...');

    try {
        // Generar recompensas aleatorias
        const goldReward = Math.floor(Math.random() * (40 - 10 + 1)) + 10; // entre 10 y 40 de oro
        const diamondReward = Math.floor(Math.random() * (40 - 10 + 1)) + 10; // entre 10 y 40 diamantes

        // Obtener el perfil actual para actualizar las monedas
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('gold, diamonds')
            .eq('id', user.id)
            .single();

        if (profileError) {
            throw profileError;
        }

        const currentGold = profile.gold || 0;
        const currentDiamonds = profile.diamonds || 0;

        // Actualizar el perfil del usuario con las nuevas recompensas
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                gold: currentGold + goldReward,
                diamonds: currentDiamonds + diamondReward
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        // Mostrar SweetAlert con las recompensas y efectos
        Swal.fire({
            title: '¡Cofre Abierto!',
            html: `
                <div class="swal2-chest-content">
                    <i class="fas fa-box-open swal2-chest-icon"></i>
                    <p style="font-size: 1.2em; margin-bottom: 15px; color: #dcdcdc;">Has encontrado:</p>
                    <div class="swal2-reward-item">
                        <i class="fas fa-coins currency-icon"></i> <span>${goldReward} Oro</span>
                    </div>
                    <div class="swal2-reward-item">
                        <i class="fas fa-gem currency-icon"></i> <span>${diamondReward} Diamantes</span>
                    </div>
                </div>
            `,
            confirmButtonText: '¡Genial!',
            customClass: {
                popup: 'swal2-chest-popup',
                confirmButton: 'swal2-confirm-button'
            },
            willOpen: () => {
                // Efecto de confeti al abrir el cofre
                confetti({
                    particleCount: 200,
                    spread: 180,
                    origin: { y: 0.6, x: 0.5 },
                    colors: ['#FFD700', '#62c3e8', '#ffffff', '#8B4513'], // Oro, Diamante, Blanco, Marrón
                    shapes: ['circle', 'square', 'star'],
                    scalar: 1.5,
                    disableForReducedMotion: true
                });
            }
        });

        // Actualizar los displays de oro y diamantes en el dashboard
        await updateCurrencyDisplay();

    } catch (error) {
        console.error('Error al abrir el cofre:', error.message);
        showCustomSwal('error', 'Error al abrir cofre', 'No se pudo abrir el cofre. Intenta de nuevo. Detalles: ' + error.message);
    } finally {
        // Habilitar el botón de nuevo
        if (chestBtn) {
            chestBtn.disabled = false;
            chestBtn.innerHTML = `<i class="fas fa-box-open"></i> Cofre Gratis`;
        }
        hideLoader();
    }
}

// ====================================================================================
// INICIALIZACIÓN DE chestLogic.js AL CARGAR EL DOM
// ====================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Asignar referencias a elementos DOM específicos de este script
    chestBtn = document.getElementById('chest-btn');
    goldDisplay = document.getElementById('gold-display');
    diamondsDisplay = document.getElementById('diamonds-display');
    loaderDiv = document.getElementById('loader'); // Obtener referencia al loader global

    // Añadir event listener para el botón del cofre
    if (chestBtn) {
        chestBtn.addEventListener('click', openChest);
    }
});