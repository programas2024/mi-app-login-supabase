// leaderboard.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';
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

/**
 * Helper para mostrar SweetAlert2 con estilos personalizados.
 * @param {string} icon - 'success', 'error', 'info', 'warning', 'question'
 * @param {string} title - Título del modal.
 * @param {string} text - Contenido del modal.
 * @param {string} [confirmButtonText='Entendido'] - Texto del botón de confirmación.
 */
function showCustomSwal(icon, title, text, confirmButtonText = 'Entendido') {
    Swal.fire({
        icon: icon,
        title: title,
        html: text, // Usamos html para permitir tags como <strong>
        confirmButtonText: confirmButtonText,
        customClass: {
            popup: 'swal2-profile-popup', // Reutilizamos la clase de estilo existente
            title: 'swal2-profile-title',
            htmlContainer: 'swal2-profile-html',
            confirmButton: 'swal2-profile-confirm-button'
        },
        buttonsStyling: false,
    });
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
        // Consultar la tabla 'profiles'
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
                    const targetUserId = event.target.dataset.userId;
                    // Obtener el ID del usuario logueado en el momento del click
                    const { data: { user } } = await supabase.auth.getUser();
                    const loggedInUserId = user ? user.id : null;

                    if (targetUserId) {
                        await showPlayerDetails(supabase, targetUserId, loggedInUserId);
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
 * Función para mostrar los detalles de un jugador en un SweetAlert2 modal,
 * incluyendo opciones para agregar amigo y chatear.
 * @param {object} supabase - La instancia de cliente Supabase inicializada.
 * @param {string} targetUserId - El ID del usuario cuyo perfil se va a mostrar.
 * @param {string} currentUserId - El ID del usuario actualmente logueado.
 */
async function showPlayerDetails(supabase, targetUserId, currentUserId) {
    Swal.fire({
        title: 'Cargando detalles...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('username, country, diamonds, gold') // Estas columnas están en 'profiles'
            .eq('id', targetUserId)
            .single();

        if (profileError) {
            throw profileError;
        }

        if (!userProfile) {
            showCustomSwal('error', 'Error', 'No se encontraron los detalles de este jugador.');
            return;
        }

        const countryIcon = getCountryFlagEmoji(userProfile.country);

        // Determinar el estado de amistad
        let friendshipStatus = 'unknown'; // 'unknown', 'self', 'friends', 'pending_sent', 'pending_received', 'not_friends'
        if (currentUserId === targetUserId) {
            friendshipStatus = 'self';
        } else if (currentUserId) { // Solo si hay un usuario logueado para verificar amistad
            const { data: friendsData, error: friendsError } = await supabase
                .from('friend_requests')
                .select('status, sender_id, receiver_id')
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`);

            if (friendsError) {
                console.error('Error al verificar amistad:', friendsError);
                // Continuar sin estado de amistad específico si hay error
            } else if (friendsData && friendsData.length > 0) {
                const request = friendsData[0];
                if (request.status === 'accepted') {
                    friendshipStatus = 'friends';
                } else if (request.status === 'pending') {
                    if (request.sender_id === currentUserId) {
                        friendshipStatus = 'pending_sent'; // Solicitud enviada por el usuario actual
                    } else {
                        friendshipStatus = 'pending_received'; // Solicitud recibida por el usuario actual
                    }
                }
            } else {
                friendshipStatus = 'not_friends';
            }
        }


        let friendButtonHtml = '';
        if (friendshipStatus === 'self') {
            friendButtonHtml = '<button class="swal2-profile-button" disabled><i class="fas fa-user-check"></i> Es tu perfil</button>';
        } else if (friendshipStatus === 'friends') {
            friendButtonHtml = '<button class="swal2-profile-button" disabled><i class="fas fa-user-friends"></i> Amigos</button>';
            // Podrías añadir un botón para "Eliminar Amigo" aquí
        } else if (friendshipStatus === 'pending_sent') {
            friendButtonHtml = '<button class="swal2-profile-button" disabled><i class="fas fa-hourglass-half"></i> Solicitud Pendiente</button>';
        } else if (friendshipStatus === 'pending_received') {
            friendButtonHtml = '<button id="accept-friend-btn" class="swal2-profile-button swal2-profile-confirm-button"><i class="fas fa-user-plus"></i> Aceptar Solicitud</button>';
            // Podrías añadir un botón para "Rechazar Solicitud" aquí
        } else if (friendshipStatus === 'not_friends' && currentUserId) { // Solo si hay un usuario logueado para enviar solicitud
            friendButtonHtml = '<button id="add-friend-btn" class="swal2-profile-button swal2-profile-confirm-button"><i class="fas fa-user-plus"></i> Añadir Amigo</button>';
        } else if (!currentUserId) { // No logueado
            friendButtonHtml = '<button class="swal2-profile-button" disabled><i class="fas fa-user-plus"></i> Inicia sesión para añadir</button>';
        }


        Swal.fire({
            title: `<strong>${userProfile.username || 'Jugador Desconocido'}</strong>`,
            html: `
                <div style="text-align: left; padding: 10px; font-size: 1.1em;">
                    <p style="margin-bottom: 8px;"><i class="fas fa-globe-americas" style="color: #6a5acd;"></i> <strong>País:</strong> ${countryIcon} ${userProfile.country || 'No especificado'}</p>
                    <p style="margin-bottom: 8px;"><i class="fas fa-gem" style="color: #00bcd4;"></i> <strong>Diamantes:</strong> <span style="font-weight: bold; color: #00bcd4;">${userProfile.diamonds || 0}</span></p>
                    <p style="margin-bottom: 20px;"><i class="fas fa-coins" style="color: #ffd700;"></i> <strong>Oro:</strong> <span style="font-weight: bold; color: #ffd700;">${userProfile.gold || 0}</span></p>
                    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                        ${friendButtonHtml}
                        <button id="chat-btn" class="swal2-profile-button swal2-profile-confirm-button" ${!currentUserId || friendshipStatus === 'self' ? 'disabled' : ''}>
                            <i class="fas fa-comment-dots"></i> Chatear
                        </button>
                    </div>
                </div>
            `,
            icon: 'info',
            iconHtml: '<i class="fas fa-user" style="color: var(--primary-color);"></i>',
            showCloseButton: true,
            confirmButtonText: '¡Cerrar!',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
        }).then((result) => {
            // Manejar la acción de aceptar solicitud si el botón existe y fue clicado
            if (result.isConfirmed && friendshipStatus === 'pending_received' && result.value === 'accept_friend') {
                 handleAcceptFriendRequest(currentUserId, targetUserId);
            }
        });

        // Event listener para el botón "Añadir Amigo"
        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                handleAddFriend(currentUserId, targetUserId, userProfile.username);
                Swal.close(); // Cierra el modal de detalles después de enviar la solicitud
            });
        }

        // Event listener para el botón "Aceptar Solicitud"
        const acceptFriendBtn = document.getElementById('accept-friend-btn');
        if (acceptFriendBtn) {
            acceptFriendBtn.addEventListener('click', () => {
                handleAcceptFriendRequest(currentUserId, targetUserId, userProfile.username);
                Swal.close(); // Cierra el modal de detalles
            });
        }

        // Event listener para el botón "Chatear"
        const chatBtn = document.getElementById('chat-btn');
        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                handleChat(currentUserId, targetUserId, userProfile.username);
                Swal.close(); // Cierra el modal de detalles
            });
        }

    } catch (error) {
        showCustomSwal('error', 'Error', `No se pudo cargar la información: ${error.message}`);
        console.error('Error al cargar detalles del jugador:', error.message);
    }
}

/**
 * Envía una solicitud de amistad.
 * @param {string} senderId - ID del usuario que envía la solicitud.
 * @param {string} receiverId - ID del usuario que recibe la solicitud.
 * @param {string} receiverUsername - Nombre de usuario del receptor.
 */
async function handleAddFriend(senderId, receiverId, receiverUsername) {
    if (!senderId) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para enviar solicitudes de amistad.');
        return;
    }
    if (senderId === receiverId) {
        showCustomSwal('info', 'Error', 'No puedes enviarte una solicitud de amistad a ti mismo.');
        return;
    }

    // Verificar si ya existe una solicitud o si ya son amigos
    const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('id, status, sender_id, receiver_id')
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);

    if (checkError) {
        console.error('Error al verificar solicitud existente:', checkError);
        showCustomSwal('error', 'Error', 'No se pudo verificar el estado de la amistad.');
        return;
    }

    if (existingRequest && existingRequest.length > 0) {
        const req = existingRequest[0];
        if (req.status === 'pending') {
            if (req.sender_id === senderId) {
                showCustomSwal('info', 'Solicitud Pendiente', `Ya has enviado una solicitud de amistad a ${receiverUsername}.`);
            } else { // req.sender_id === receiverId (el otro usuario te envió a ti)
                showCustomSwal('info', 'Solicitud Recibida', `${receiverUsername} ya te ha enviado una solicitud de amistad. ¡Acéptala!`);
                // Opcional: Abrir modal para aceptar/rechazar aquí
            }
        } else if (req.status === 'accepted') {
            showCustomSwal('info', 'Ya son Amigos', `Ya eres amigo de ${receiverUsername}.`);
        }
        return;
    }

    // Si no hay solicitud existente, enviar una nueva
    const { error: insertError } = await supabase
        .from('friend_requests')
        .insert([{ sender_id: senderId, receiver_id: receiverId, status: 'pending' }]);

    if (insertError) {
        console.error('Error al enviar solicitud de amistad:', insertError);
        showCustomSwal('error', 'Error', 'No se pudo enviar la solicitud de amistad.');
    } else {
        showCustomSwal('success', 'Solicitud Enviada', `¡Solicitud de amistad enviada a <strong>${receiverUsername}</strong>!`);
    }
}

/**
 * Acepta una solicitud de amistad.
 * @param {string} currentUserId - ID del usuario que acepta la solicitud.
 * @param {string} senderId - ID del usuario que envió la solicitud (ahora el amigo).
 * @param {string} senderUsername - Nombre de usuario del remitente.
 */
async function handleAcceptFriendRequest(currentUserId, senderId, senderUsername) {
    if (!currentUserId) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para aceptar solicitudes.');
        return;
    }

    const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('sender_id', senderId)
        .eq('receiver_id', currentUserId)
        .eq('status', 'pending'); // Asegurarse de que solo se actualicen las pendientes

    if (updateError) {
        console.error('Error al aceptar solicitud de amistad:', updateError);
        showCustomSwal('error', 'Error', 'No se pudo aceptar la solicitud de amistad.');
    } else {
        showCustomSwal('success', '¡Amistad Aceptada!', `¡Ahora eres amigo de <strong>${senderUsername}</strong>!`);
    }
}

/**
 * Abre un modal para chatear con otro usuario.
 * @param {string} senderId - ID del usuario que envía el mensaje.
 * @param {string} receiverId - ID del usuario que recibe el mensaje.
 * @param {string} receiverUsername - Nombre de usuario del receptor.
 */
async function handleChat(senderId, receiverId, receiverUsername) {
    if (!senderId) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para chatear.');
        return;
    }
    if (senderId === receiverId) {
        showCustomSwal('info', 'Error', 'No puedes chatear contigo mismo.');
        return;
    }

    // Puedes añadir una verificación de amistad aquí si el chat es solo para amigos
    // const { data: friendsData } = await supabase.from('friend_requests').select().or(...);
    // if (!friendsData || friendsData[0].status !== 'accepted') {
    //     showCustomSwal('warning', 'Acción no permitida', 'Solo puedes chatear con amigos.');
    //     return;
    // }

    Swal.fire({
        title: `Chatear con <strong>${receiverUsername}</strong>`,
        input: 'textarea',
        inputPlaceholder: 'Escribe tu mensaje aquí...',
        inputAttributes: {
            'aria-label': 'Escribe tu mensaje aquí'
        },
        showCancelButton: true,
        confirmButtonText: 'Enviar',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'swal2-profile-popup',
            title: 'swal2-profile-title',
            input: 'swal2-profile-input', // Necesitarás añadir estilos para esta clase
            confirmButton: 'swal2-profile-confirm-button',
            cancelButton: 'swal2-profile-cancel-button' // Necesitarás añadir estilos para esta clase
        },
        buttonsStyling: false,
    }).then(async (result) => {
        if (result.isConfirmed) {
            const messageText = result.value;
            if (messageText && messageText.trim() !== '') {
                const { error: insertError } = await supabase
                    .from('chat_messages')
                    .insert([{ sender_id: senderId, receiver_id: receiverId, message: messageText }]);

                if (insertError) {
                    console.error('Error al enviar mensaje:', insertError);
                    showCustomSwal('error', 'Error', 'No se pudo enviar el mensaje.');
                } else {
                    showCustomSwal('success', 'Mensaje Enviado', `Mensaje enviado a <strong>${receiverUsername}</strong>.`);
                }
            } else {
                showCustomSwal('info', 'Mensaje Vacío', 'No puedes enviar un mensaje vacío.');
            }
        }
    });
}


function getCountryFlagEmoji(countryName) {
    if (!countryName) return '';
    const flags = {
        'Colombia': '🇨🇴',
        'España': '🇪🇸',
        'Mexico': '🇲🇽',
        'Argentina': '🇦🇷',
        'USA': '🇺🇸',
        'Canada': '🇨🇦'
        // Añade más países según necesites
    };
    return flags[countryName] || '';
}

// ====================================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ====================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Asignar referencias a elementos DOM
    loaderLeaderboard = document.getElementById('loader-leaderboard');
    leaderboardTableBody = document.querySelector('#leaderboard-table-body'); // Usar querySelector con ID
    backToDashboardButton = document.getElementById('back-to-dashboard-from-leaderboard');

    // Obtener el ID del usuario logueado al cargar la página
    const { data: { user } } = await supabase.auth.getUser();
    const loggedInUserId = user ? user.id : null;

    // Cargar y mostrar la clasificación, pasando el ID del usuario logueado
    await loadLeaderboard(supabase, loaderLeaderboard, loggedInUserId);

    // Añadir listener al botón de volver
    if (backToDashboardButton) {
        backToDashboardButton.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
});
