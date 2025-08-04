// afinidadLogic.js - Lógica para el modo de afinidad entre amigos

import { supabase } from './supabaseConfig.js';
import { loadUnreadMessagesCount, loadPendingFriendRequestsCount } from './socialLogic.js'; // Necesario para actualizar badges

// Referencias a elementos del DOM en afinidad.html (que serán parte del modal de SweetAlert2)
let friendUsernameAffinityDisplay;
let friendAvatarImgAffinity;
let affinityPointsDisplay;
let affinityRankDisplay;
let sharedTitleDisplay;
let userDiamondsDisplay;
let diamondContributionInput;
let contributeDiamondsBtn;
let inviteInfinidadBtn;
let infinidadUnlockInfo;
let backToFriendProfileBtn;

// Variables globales para la conversación actual de afinidad
let currentAffinityFriendId = null;
let currentAffinityFriendUsername = null;
let currentUserId = null; // Para almacenar el ID del usuario actual

// ====================================================================================
// FUNCIONES DE UTILIDAD LOCALES
// ====================================================================================

/**
 * Helper para mostrar SweetAlert2 con estilos personalizados (local a afinidadLogic.js).
 * @param {string} icon - 'success', 'error', 'info', 'warning', 'question'
 * @param {string} title - Título del modal.
 * @param {string} text - Contenido del modal.
 * @param {string} [confirmButtonText='Entendido'] - Texto del botón de confirmación.
 * @returns {Promise<any>} Una promesa que resuelve cuando el modal se cierra.
 */
function showCustomSwal(icon, title, text, confirmButtonText = 'Entendido') {
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 (Swal) no está definido. Asegúrate de que SweetAlert2 se cargue antes de afinidadLogic.js.');
        alert(`${title}: ${text}`); // Fallback simple si Swal no está disponible
        return Promise.resolve({ isConfirmed: true }); // Devuelve una promesa resuelta para evitar el error .then()
    }
    return Swal.fire({
        icon: icon,
        title: title,
        html: text,
        confirmButtonText: confirmButtonText,
        customClass: {
            popup: 'swal2-profile-popup', // Reutiliza clases CSS de perfil/dashboard
            title: 'swal2-profile-title',
            htmlContainer: 'swal2-profile-html',
            confirmButton: 'swal2-profile-confirm-button'
        },
        buttonsStyling: false,
    });
}

/**
 * Determina el rango de afinidad y su icono basado en los puntos.
 * @param {number} points - Puntos de afinidad.
 * @returns {{rank: string, icon: string}} Objeto con el nombre del rango y su icono HTML.
 */
function getAffinityRank(points) {
    if (points >= 500) {
        return { rank: 'Confidentes', icon: '<i class="fas fa-handshake text-purple-500"></i>' };
    } else if (points >= 100) {
        return { rank: 'Amigos', icon: '<i class="fas fa-heart text-red-500"></i>' };
    } else {
        return { rank: 'Conocidos', icon: '<i class="fas fa-user-group text-gray-500"></i>' };
    }
}

/**
 * Determina el título compartido basado en los puntos de afinidad.
 * @param {number} points - Puntos de afinidad.
 * @returns {string} El título compartido.
 */
function getSharedTitle(points) {
    if (points >= 1000) {
        return 'Maestros de la Afinidad';
    } else if (points >= 500) {
        return 'Leyendas Unidas';
    } else if (points >= 250) {
        return 'Almas Gemelas';
    } else if (points >= 100) {
        return 'Dúo Dinámico';
    } else {
        return 'Compañeros Novatos';
    }
}

// ====================================================================================
// LÓGICA PRINCIPAL DE AFINIDAD
// ====================================================================================

/**
 * Carga y muestra los datos de afinidad entre el usuario actual y un amigo.
 * También carga los diamantes del usuario actual.
 * @param {string} userId - ID del usuario actual.
 * @param {string} friendId - ID del amigo.
 */
async function loadAffinityData(userId, friendId) {
    currentUserId = userId; // Almacenar el ID del usuario actual
    const [id1, id2] = [userId, friendId].sort(); // Asegurar orden para la consulta

    try {
        // 1. Obtener datos de afinidad
        const { data: affinity, error: affinityError } = await supabase
            .from('friend_affinities')
            .select('affinity_points')
            .eq('user1_id', id1)
            .eq('user2_id', id2)
            .single();

        if (affinityError && affinityError.code !== 'PGRST116') { // PGRST116 = No rows found
            throw affinityError;
        }

        const points = affinity ? affinity.affinity_points : 0;
        const { rank, icon } = getAffinityRank(points);
        const title = getSharedTitle(points);

        // 2. Obtener diamantes del usuario actual
        const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('diamonds')
            .eq('id', userId)
            .single();

        if (userProfileError) {
            throw userProfileError;
        }

        // 3. Obtener avatar del amigo
        const { data: friendProfile, error: friendProfileError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', friendId)
            .single();

        if (friendProfileError) {
            console.warn('No se pudo cargar el avatar del amigo:', friendProfileError.message);
            // No lanzar error, solo usar placeholder
        }
        const friendAvatarUrl = friendProfile?.avatar_url || 'https://placehold.co/150x150/cccccc/000000?text=Amigo';


        // Actualizar la interfaz
        friendAvatarImgAffinity.src = friendAvatarUrl;
        affinityPointsDisplay.textContent = points;
        affinityRankDisplay.innerHTML = `${icon} ${rank}`; // Mostrar icono y texto
        sharedTitleDisplay.textContent = title;
        userDiamondsDisplay.textContent = userProfile.diamonds || 0;

        // Habilitar/deshabilitar botón de "Invitar a Infinidad"
        if (points >= 100) { // Rango "Amigos" o superior
            inviteInfinidadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            inviteInfinidadBtn.disabled = false;
            infinidadUnlockInfo.classList.add('hidden');
        } else {
            inviteInfinidadBtn.classList.add('opacity-50', 'cursor-not-allowed');
            inviteInfinidadBtn.disabled = true;
            infinidadUnlockInfo.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error al cargar datos de afinidad:', error.message);
        showCustomSwal('error', 'Error de Afinidad', `No se pudieron cargar los datos de afinidad: ${error.message}`);
    }
}

/**
 * Maneja la contribución de diamantes a la afinidad.
 */
async function handleDiamondContribution() {
    const amount = parseInt(diamondContributionInput.value, 10);
    if (isNaN(amount) || amount <= 0) {
        showCustomSwal('warning', 'Entrada Inválida', 'Por favor, introduce una cantidad válida de diamantes (número positivo).');
        return;
    }

    if (!currentUserId || !currentAffinityFriendId) {
        showCustomSwal('error', 'Error', 'No se ha podido identificar la relación de afinidad.');
        return;
    }

    Swal.fire({
        title: 'Contribuyendo Diamantes...',
        text: 'Por favor, espera.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // 1. Obtener diamantes actuales del usuario
        const { data: userProfile, error: userProfileError } = await supabase
            .from('profiles')
            .select('diamonds')
            .eq('id', currentUserId)
            .single();

        if (userProfileError) {
            throw userProfileError;
        }

        const currentDiamonds = userProfile.diamonds || 0;
        if (currentDiamonds < amount) {
            Swal.close();
            showCustomSwal('error', 'Diamantes Insuficientes', `No tienes suficientes diamantes. Tienes ${currentDiamonds}, necesitas ${amount}.`);
            return;
        }

        // 2. Actualizar los diamantes del usuario (restar)
        const { error: updateDiamondsError } = await supabase
            .from('profiles')
            .update({ diamonds: currentDiamonds - amount })
            .eq('id', currentUserId);

        if (updateDiamondsError) {
            throw updateDiamondsError;
        }

        // 3. Obtener y actualizar los puntos de afinidad
        const [id1, id2] = [currentUserId, currentAffinityFriendId].sort();
        
        const { data: existingAffinity, error: fetchAffinityError } = await supabase
            .from('friend_affinities')
            .select('id, affinity_points')
            .eq('user1_id', id1)
            .eq('user2_id', id2)
            .single();

        if (fetchAffinityError && fetchAffinityError.code !== 'PGRST116') { // No rows found
            throw fetchAffinityError;
        }

        const newAffinityPoints = (existingAffinity ? existingAffinity.affinity_points : 0) + amount;

        if (existingAffinity) {
            // Actualizar afinidad existente
            const { error: updateAffinityError } = await supabase
                .from('friend_affinities')
                .update({ affinity_points: newAffinityPoints, last_contribution_at: new Date().toISOString() })
                .eq('id', existingAffinity.id);
            if (updateAffinityError) throw updateAffinityError;
        } else {
            // Crear nueva afinidad si no existe
            const { error: insertAffinityError } = await supabase
                .from('friend_affinities')
                .insert([{ user1_id: id1, user2_id: id2, affinity_points: newAffinityPoints, last_contribution_at: new Date().toISOString() }]);
            if (insertAffinityError) throw insertAffinityError;
        }

        Swal.close();
        showCustomSwal('success', '¡Contribución Exitosa!', `Has contribuido ${amount} diamantes a la afinidad con ${currentAffinityFriendUsername}.`);
        diamondContributionInput.value = ''; // Limpiar el input

        // Recargar los datos para actualizar la UI
        await loadAffinityData(currentUserId, currentAffinityFriendId);

    } catch (error) {
        Swal.close();
        console.error('Error al contribuir diamantes:', error.message);
        showCustomSwal('error', 'Error', `No se pudo contribuir diamantes: ${error.message}`);
    }
}

/**
 * Maneja la invitación a Infinidad (placeholder).
 */
async function handleInviteToInfinidad() {
    if (!currentUserId || !currentAffinityFriendId || !currentAffinityFriendUsername) {
        showCustomSwal('error', 'Error', 'No se ha podido identificar la relación de afinidad.');
        return;
    }

    // Aquí iría la lógica real para invitar a Infinidad
    // Por ahora, es un placeholder
    showCustomSwal('info', 'Invitar a Infinidad', `Has invitado a ${currentAffinityFriendUsername} a Infinidad. ¡Lógica de juego por implementar!`);
}

/**
 * Muestra el modal de afinidad cargando el contenido de afinidad.html.
 * @param {string} userId - ID del usuario actual.
 * @param {string} friendId - ID del amigo.
 * @param {string} friendUsername - Nombre de usuario del amigo.
 */
export async function showAffinityModal(userId, friendId, friendUsername) {
    currentAffinityFriendId = friendId;
    currentAffinityFriendUsername = friendUsername;
    currentUserId = userId; // Asegurarse de que currentUserId esté actualizado

    Swal.fire({
        title: `Cargando Afinidad con ${friendUsername}...`,
        html: '<div class="loader-hidden" id="affinity-loader"><div class="spinner"></div><p>Cargando...</p></div>',
        showConfirmButton: false,
        showCancelButton: false,
        allowOutsideClick: false,
        didOpen: async (popup) => {
            // Cargar el contenido de afinidad.html dinámicamente
            const response = await fetch('afinidad.html');
            const htmlContent = await response.text();

            // Extraer solo el contenido dentro del div #affinity-card
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            const affinityCardContent = doc.getElementById('affinity-card')?.innerHTML || '<p>Error al cargar la interfaz de afinidad.</p>';

            Swal.update({
                title: `Afinidad con <strong>${friendUsername}</strong>`,
                html: `<div id="affinity-card-container">${affinityCardContent}</div>`,
                allowOutsideClick: true, // Permitir cerrar haciendo clic fuera
                showCancelButton: false, // No mostrar botón de cancelar por defecto de SweetAlert
                showConfirmButton: false, // No mostrar botón de confirmar por defecto de SweetAlert
                didRender: async () => { // didRender se llama después de que el HTML está en el DOM
                    // Asignar referencias a los elementos del DOM dentro del SweetAlert
                    friendUsernameAffinityDisplay = document.getElementById('friend-username-affinity');
                    friendAvatarImgAffinity = document.getElementById('friend-avatar-img-affinity');
                    affinityPointsDisplay = document.getElementById('affinity-points-display');
                    affinityRankDisplay = document.getElementById('affinity-rank-display');
                    sharedTitleDisplay = document.getElementById('shared-title-display');
                    userDiamondsDisplay = document.getElementById('user-diamonds-display');
                    diamondContributionInput = document.getElementById('diamond-contribution-input');
                    contributeDiamondsBtn = document.getElementById('contribute-diamonds-btn');
                    inviteInfinidadBtn = document.getElementById('invite-infinidad-btn');
                    infinidadUnlockInfo = document.getElementById('infinidad-unlock-info');
                    backToFriendProfileBtn = document.getElementById('back-to-friend-profile-btn');

                    // Asegurarse de que los elementos existan antes de usarlos
                    if (friendUsernameAffinityDisplay) friendUsernameAffinityDisplay.textContent = friendUsername;

                    // Añadir event listeners
                    if (contributeDiamondsBtn) {
                        contributeDiamondsBtn.addEventListener('click', handleDiamondContribution);
                    }
                    if (inviteInfinidadBtn) {
                        inviteInfinidadBtn.addEventListener('click', handleInviteToInfinidad);
                    }
                    if (backToFriendProfileBtn) {
                        backToFriendProfileBtn.addEventListener('click', () => {
                            Swal.close(); // Cierra el modal de afinidad
                            // Necesitamos una forma de volver al perfil del amigo
                            // Esto podría ser un problema si showFriendProfileModal no es global
                            // Por ahora, simplemente cerramos.
                            // Idealmente, socialLogic.js debería tener una función para reabrir el perfil
                            // o showAffinityModal debería ser llamada desde el didOpen de showFriendProfileModal
                            // y manejar el regreso.
                        });
                    }

                    // Cargar los datos de afinidad
                    await loadAffinityData(userId, friendId);
                }
            });
        }
    }).then(result => {
        // Este .then() se ejecuta cuando el modal se cierra.
        // Aquí no hacemos nada, ya que el botón "Regresar" maneja el cierre.
    });
}
