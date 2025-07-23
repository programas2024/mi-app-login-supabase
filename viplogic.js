// vipLogic.js

// Importaciones necesarias para este módulo: Supabase y Confetti
// Es crucial que la URL de Confetti incluya '+esm' para la importación en módulos ES.
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm';

// --- Configuración de Supabase ---
// Estas credenciales deben ser las mismas que usas en tu script.js principal
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Elementos del DOM ---
const currentDiamondsSpan = document.getElementById('current-diamonds');
const currentGoldSpan = document.getElementById('current-gold');
const tbody = document.querySelector('.vip-rewards-table tbody');
const loadMoreBtn = document.getElementById('load-more-levels');

// --- Variables de Estado del Usuario ---
let currentUser = null;
let userProfile = {
    gold: 0,
    diamonds: 0,
    unlocked_levels: [], // Almacena los niveles que el usuario ha desbloqueado
    claimed_levels: []   // Almacena los niveles cuyas recompensas ya ha reclamado
};

// --- Configuración de Niveles y Recompensas ---
const levelsToShowInitially = 5; // Mostrar 5 niveles inicialmente
const levelsPerLoad = 3;         // Cargar 3 niveles adicionales cada vez
let currentLoadedLevels = 0;     // Contador de niveles actualmente cargados en la tabla

const allRewardsData = []; // Almacenará todos los datos de recompensas generados

// Generar TODOS los datos de las recompensas una sola vez
// Esto asegura que la lógica de recompensas sea consistente
for (let i = 1; i <= 20; i++) { // Por ejemplo, hasta 20 niveles VIP
    let reward1 = {};
    let reward2Gold = 0;
    let reward2Emerald = 0;
    const unlockCost = 100 * i; // Costo de desbloqueo: Nivel 1 = 100, Nivel 2 = 200, etc.

    // Definir Recompensa 1 (alternando entre oro y diamante)
    if (i % 2 !== 0) { // Niveles impares: Oro
        reward1 = { type: 'gold', amount: 100 + (i * 15) };
    } else { // Niveles pares: Diamante
        reward1 = { type: 'diamond', amount: 10 + (i * 3) };
    }

    // Definir Recompensa 2 (Oro y Esmeralda juntos)
    reward2Gold = 50 + (i * 10);
    reward2Emerald = 2 + Math.floor(i / 3);

    // Añadir bonificaciones en ciertos hitos
    if (i % 5 === 0) {
        reward1.amount += 25;
        reward2Gold += 50;
    }
    if (i % 10 === 0) {
        reward1.amount += 60;
        reward2Gold += 100;
        reward2Emerald += 3;
    }
    allRewardsData.push({
        level: i,
        unlockCost: unlockCost,
        reward1: reward1,
        reward2Gold: reward2Gold,
        reward2Emerald: reward2Emerald
    });
}

// --- Funciones de Supabase ---

/**
 * Obtiene el perfil del usuario actual desde Supabase.
 * Si no existe, crea uno nuevo con valores por defecto.
 * @param {string} userId - El ID del usuario.
 * @returns {Object|null} El perfil del usuario o null si hay un error irrecuperable.
 */
async function fetchUserProfile(userId) {
    let { data: profile, error } = await supabase
        .from('profiles')
        .select('gold, diamonds, unlocked_levels, claimed_levels')
        .eq('id', userId)
        .single();

    if (error) {
        console.error("Error fetching user profile:", error.message);
        // Si el perfil no existe (código PGRST116), crearlo con valores por defecto
        if (error.code === 'PGRST116' || error.message.includes('rows returned for query')) {
            console.log("Profile not found, creating new one.");
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([
                    { id: userId, gold: 0, diamonds: 0, unlocked_levels: [], claimed_levels: [] }
                ])
                .select()
                .single();
            if (createError) {
                console.error("Error creating user profile:", createError.message);
                Swal.fire({
                    icon: 'error',
                    title: 'Error Crítico',
                    text: 'No pudimos crear tu perfil de jugador. Por favor, contacta soporte.',
                    customClass: { popup: 'swal2-custom-game-over' }
                });
                return null;
            }
            profile = newProfile;
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error de Perfil',
                text: 'No pudimos cargar tu perfil. Intenta recargar la página.',
                customClass: { popup: 'swal2-custom-game-over' }
            });
            return null;
        }
    }
    // Asegurarse de que los arrays no sean nulos si Supabase los devuelve así (aunque JSONB debería manejarlos)
    profile.unlocked_levels = profile.unlocked_levels || [];
    profile.claimed_levels = profile.claimed_levels || [];
    return profile;
}

/**
 * Actualiza el perfil del usuario en Supabase.
 * @param {Object} updatedData - Un objeto con los campos a actualizar (ej. { gold: 100, diamonds: 50 }).
 * @returns {boolean} True si la actualización fue exitosa, false en caso contrario.
 */
async function updateProfileInSupabase(updatedData) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', currentUser.id);

    if (error) {
        console.error("Error updating user profile:", error.message);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar',
            text: 'No pudimos guardar los cambios en tu perfil. Intenta de nuevo.',
            customClass: { popup: 'swal2-custom-game-over' }
        });
        return false;
    }
    return true;
}

// --- Funciones de Lógica del Juego ---

/**
 * Actualiza el display de oro y diamantes en la UI.
 */
function updateBalanceDisplay() {
    currentDiamondsSpan.textContent = userProfile.diamonds;
    currentGoldSpan.textContent = userProfile.gold;
}

/**
 * Renderiza un grupo de niveles en la tabla.
 * @param {number} startIndex - Índice inicial en allRewardsData.
 * @param {number} count - Número de niveles a renderizar.
 */
function renderLevels(startIndex, count) {
    const endIndex = Math.min(startIndex + count, allRewardsData.length);
    for (let j = startIndex; j < endIndex; j++) {
        const item = allRewardsData[j];
        const level = item.level;
        const unlockCost = item.unlockCost;

        const isUnlocked = userProfile.unlocked_levels.includes(level);
        const isClaimed = userProfile.claimed_levels.includes(level);
        const canAfford = userProfile.diamonds >= unlockCost;

        const row = tbody.insertRow();
        row.dataset.level = level; // Guarda el nivel en el dataset de la fila
        row.classList.toggle('level-locked', !isUnlocked && !isClaimed); // Marca como bloqueado si no está desbloqueado ni reclamado

        row.insertCell().textContent = level; // Columna Nivel VIP

        // --- Columna "Recompensa Exclusiva" ---
        const cell1 = row.insertCell();
        cell1.classList.add('reward-item-cell');
        const iconClass1 = item.reward1.type === 'gold' ? 'fas fa-coins gold-icon' : 'fas fa-diamond diamond-icon';
        cell1.innerHTML = `<i class="${iconClass1}"></i> <span class="reward-amount-text">${item.reward1.amount}</span>`;

        // --- Columna "Tesoro Doble (Oro + Esmeralda)" ---
        const cell2 = row.insertCell();
        cell2.classList.add('reward-item-cell', 'reward-pair');
        cell2.innerHTML = `
            <div class="reward-pair-item">
                <i class="fas fa-coins gold-icon"></i>
                <span class="reward-amount-text">${item.reward2Gold}</span>
            </div>
            <span class="separator-text">y</span>
            <div class="reward-pair-item">
                <i class="fas fa-gem emerald-icon"></i>
                <span class="reward-amount-text">${item.reward2Emerald}</span>
            </div>
        `;

        // --- Columna "Desbloquear / Reclamar" ---
        const actionCell = row.insertCell();
        actionCell.classList.add('reward-item-cell'); // Reutiliza estilos de centrado

        if (isClaimed) {
            actionCell.innerHTML = `<button class="claimed-btn"><i class="fas fa-check-circle"></i> Reclamado</button>`;
        } else if (isUnlocked) {
            actionCell.innerHTML = `
                <button class="claim-btn" data-level="${level}">
                    <i class="fas fa-gift"></i> Reclamar
                </button>
            `;
        } else {
            actionCell.innerHTML = `
                <div class="action-buttons-container">
                    <button class="unlock-btn" data-level="${level}" ${!canAfford ? 'disabled' : ''}>
                        <i class="fas fa-lock-open"></i> Desbloquear
                    </button>
                    <span class="unlock-cost-text">
                        Costo: ${unlockCost} <i class="fas fa-diamond diamond-icon"></i>
                    </span>
                </div>
            `;
        }
    }
    currentLoadedLevels = endIndex;

    // Ocultar botón "Cargar Más" si ya se cargaron todos los niveles
    if (currentLoadedLevels >= allRewardsData.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'flex'; // Asegurarse de que sea visible si hay más niveles
    }

    // Adjuntar event listeners a los botones recién creados
    attachButtonListeners();
}

/**
 * Adjunta event listeners a los botones de desbloqueo y reclamo.
 * Se llama después de cada renderizado de niveles.
 */
function attachButtonListeners() {
    // Eliminar listeners antiguos para evitar duplicados
    tbody.querySelectorAll('.unlock-btn').forEach(button => {
        button.onclick = null; // Eliminar el handler anterior
        button.onclick = async (event) => {
            const level = parseInt(event.currentTarget.dataset.level);
            await handleUnlockLevel(level);
        };
    });

    tbody.querySelectorAll('.claim-btn').forEach(button => {
        button.onclick = null; // Eliminar el handler anterior
        button.onclick = async (event) => {
            const level = parseInt(event.currentTarget.dataset.level);
            await handleClaimReward(level);
        };
    });
}

/**
 * Maneja la lógica para desbloquear un nivel.
 * @param {number} level - El nivel a desbloquear.
 */
async function handleUnlockLevel(level) {
    if (!currentUser) {
        Swal.fire({
            icon: 'info',
            title: 'Necesitas Iniciar Sesión',
            text: 'Por favor, inicia sesión para desbloquear niveles VIP.',
            customClass: { popup: 'swal2-custom-warning' }
        });
        return;
    }

    const levelData = allRewardsData.find(item => item.level === level);
    if (!levelData) return;

    const unlockCost = levelData.unlockCost;

    if (userProfile.diamonds < unlockCost) {
        Swal.fire({
            icon: 'error',
            title: 'Diamantes Insuficientes',
            text: `Necesitas ${unlockCost} diamantes para desbloquear el Nivel ${level}.`,
            customClass: { popup: 'swal2-custom-game-over' }
        });
        return;
    }

    // Deduce diamantes y marca el nivel como desbloqueado
    userProfile.diamonds -= unlockCost;
    userProfile.unlocked_levels.push(level);
    userProfile.unlocked_levels.sort((a, b) => a - b); // Mantener ordenado

    const success = await updateProfileInSupabase({
        diamonds: userProfile.diamonds,
        unlocked_levels: userProfile.unlocked_levels
    });

    if (success) {
        updateBalanceDisplay();
        Swal.fire({
            icon: 'success',
            title: '¡Nivel Desbloqueado!',
            text: `¡Has desbloqueado el Nivel ${level} VIP! Ahora puedes reclamar sus recompensas.`,
            customClass: { popup: 'swal2-custom-final-success' }
        });
        // Re-renderiza solo la fila afectada para actualizar el botón
        updateRowStatus(level);
    }
}

/**
 * Maneja la lógica para reclamar las recompensas de un nivel desbloqueado.
 * @param {number} level - El nivel cuyas recompensas se van a reclamar.
 */
async function handleClaimReward(level) {
    if (!currentUser) {
        Swal.fire({
            icon: 'info',
            title: 'Necesitas Iniciar Sesión',
            text: 'Por favor, inicia sesión para reclamar recompensas VIP.',
            customClass: { popup: 'swal2-custom-warning' }
        });
        return;
    }

    const levelData = allRewardsData.find(item => item.level === level);
    if (!levelData) return;

    if (userProfile.claimed_levels.includes(level)) {
        Swal.fire({
            icon: 'info',
            title: 'Recompensa Ya Reclamada',
            text: `Ya has reclamado las recompensas del Nivel ${level}.`,
            customClass: { popup: 'swal2-custom-warning' }
        });
        return;
    }

    // Añade recompensas al perfil del usuario
    userProfile.gold += levelData.reward1.type === 'gold' ? levelData.reward1.amount : 0;
    userProfile.diamonds += levelData.reward1.type === 'diamond' ? levelData.reward1.amount : 0;
    userProfile.gold += levelData.reward2Gold;
    userProfile.diamonds += levelData.reward2Emerald; // Asumiendo que la esmeralda se convierte en diamantes

    userProfile.claimed_levels.push(level);
    userProfile.claimed_levels.sort((a, b) => a - b); // Mantener ordenado

    const success = await updateProfileInSupabase({
        gold: userProfile.gold,
        diamonds: userProfile.diamonds,
        claimed_levels: userProfile.claimed_levels
    });

    if (success) {
        updateBalanceDisplay();
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        Swal.fire({
            icon: 'success',
            title: '¡Recompensa Reclamada!',
            html: `¡Has reclamado las recompensas del Nivel ${level}!<br>Disfruta de tu nuevo oro y diamantes.`,
            customClass: { popup: 'swal2-custom-final-success' }
        });
        // Re-renderiza solo la fila afectada para actualizar el botón
        updateRowStatus(level);
    }
}

/**
 * Actualiza el estado de una fila de nivel específica en la tabla.
 * Esto evita re-renderizar toda la tabla.
 * @param {number} level - El nivel de la fila a actualizar.
 */
function updateRowStatus(level) {
    const row = tbody.querySelector(`tr[data-level="${level}"]`);
    if (!row) return;

    const levelData = allRewardsData.find(item => item.level === level);
    if (!levelData) return;

    const isUnlocked = userProfile.unlocked_levels.includes(level);
    const isClaimed = userProfile.claimed_levels.includes(level);
    const canAfford = userProfile.diamonds >= levelData.unlockCost;

    row.classList.toggle('level-locked', !isUnlocked && !isClaimed);

    const actionCell = row.querySelector('.reward-item-cell:last-child'); // Última celda es la de acción
    if (actionCell) {
        actionCell.innerHTML = ''; // Limpia el contenido actual

        if (isClaimed) {
            actionCell.innerHTML = `<button class="claimed-btn"><i class="fas fa-check-circle"></i> Reclamado</button>`;
        } else if (isUnlocked) {
            actionCell.innerHTML = `
                <button class="claim-btn" data-level="${level}">
                    <i class="fas fa-gift"></i> Reclamar
                </button>
            `;
        } else {
            actionCell.innerHTML = `
                <div class="action-buttons-container">
                    <button class="unlock-btn" data-level="${level}" ${!canAfford ? 'disabled' : ''}>
                        <i class="fas fa-lock-open"></i> Desbloquear
                    </button>
                    <span class="unlock-cost-text">
                        Costo: ${levelData.unlockCost} <i class="fas fa-diamond diamond-icon"></i>
                    </span>
                </div>
            `;
        }
        // Re-adjuntar listeners a los botones recién creados en esta fila
        const newButton = actionCell.querySelector('.unlock-btn') || actionCell.querySelector('.claim-btn');
        if (newButton) {
            if (newButton.classList.contains('unlock-btn')) {
                newButton.onclick = async (event) => {
                    const lvl = parseInt(event.currentTarget.dataset.level);
                    await handleUnlockLevel(lvl);
                };
            } else if (newButton.classList.contains('claim-btn')) {
                newButton.onclick = async (event) => {
                    const lvl = parseInt(event.currentTarget.dataset.level);
                    await handleClaimReward(lvl);
                };
            }
        }
    }
}


// --- Inicialización y Event Listeners Globales ---
document.addEventListener('DOMContentLoaded', () => {
    // Listener de autenticación de Supabase
    // Esto se ejecutará cada vez que el estado de autenticación cambie
    // y al cargar la página si ya hay una sesión activa.
    supabase.auth.onAuthStateChanged(async (event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            console.log("Usuario autenticado:", currentUser.id);
            userProfile = await fetchUserProfile(currentUser.id);
            if (userProfile) {
                updateBalanceDisplay();
                // Limpiar tabla y renderizar niveles con el perfil actualizado
                tbody.innerHTML = ''; // Limpiar para re-renderizar
                currentLoadedLevels = 0; // Resetear contador de niveles cargados
                renderLevels(0, levelsToShowInitially);
            }
        } else {
            // Usuario no autenticado o sesión cerrada
            currentUser = null;
            // Restablecer perfil a valores por defecto si no hay usuario
            userProfile = { gold: 0, diamonds: 0, unlocked_levels: [], claimed_levels: [] };
            updateBalanceDisplay();
            Swal.fire({
                icon: 'info',
                title: 'No Autenticado',
                text: 'Inicia sesión para ver y reclamar tus recompensas VIP. Se mostrarán los niveles, pero no podrás interactuar con ellos.',
                customClass: { popup: 'swal2-custom-warning' }
            });
            // Limpiar tabla y mostrar solo niveles bloqueados o un mensaje
            tbody.innerHTML = '';
            currentLoadedLevels = 0;
            renderLevels(0, levelsToShowInitially); // Mostrar niveles, pero estarán bloqueados
        }
    });

    // Event listener para el botón "Cargar Más Niveles"
    loadMoreBtn.addEventListener('click', () => {
        renderLevels(currentLoadedLevels, levelsPerLoad);
    });
});