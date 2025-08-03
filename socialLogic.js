// socialLogic.js - Lógica para las funcionalidades sociales (amigos, solicitudes, mensajes)

// Importaciones necesarias para este módulo: Supabase
import { supabase } from '/supabaseConfig.js'; // Importa la instancia de Supabase configurada

// Referencias a elementos del DOM que este script gestiona
let friendRequestsBadge;
let messagesBadge;
let friendsListContainer;
let friendRequestsBtn; // Referencia al botón de solicitudes de amistad
let messagesBtn; // Referencia al botón de mensajes

// Variable para almacenar la suscripción a Realtime
let friendsSubscription = null;

// ====================================================================================
// FUNCIONES DE UTILIDAD LOCALES PARA socialLogic.js
// ====================================================================================


/**
 * Helper para mostrar SweetAlert2 con estilos personalizados (local a socialLogic.js).
 * Siempre devuelve una Promesa para evitar errores .then().
 * @param {string} icon - 'success', 'error', 'info', 'warning', 'question'
 * @param {string} title - Título del modal.
 * @param {string} text - Contenido del modal.
 * @param {string} [confirmButtonText='Entendido'] - Texto del botón de confirmación.
 * @returns {Promise<any>} Una promesa que resuelve cuando el modal se cierra.
 */
function showCustomSwal(icon, title, text, confirmButtonText = 'Entendido') {
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 (Swal) no está definido. Asegúrate de que SweetAlert2 se cargue antes de socialLogic.js.');
        alert(`${title}: ${text}`); // Fallback simple si Swal no está disponible
        return Promise.resolve({ isConfirmed: true }); // Devuelve una promesa resuelta para evitar el error .then()
    }
    return Swal.fire({
        icon: icon,
        title: title,
        html: text,
        confirmButtonText: confirmButtonText,
        customClass: {
            popup: 'swal2-profile-popup', // Clases CSS para personalizar (reutilizadas del leaderboard)
            title: 'swal2-profile-title',
            htmlContainer: 'swal2-profile-html',
            confirmButton: 'swal2-profile-confirm-button'
        },
        buttonsStyling: false,
    });
}

/**
 * Obtiene el emoji de la bandera de un país (local a socialLogic.js).
 * @param {string} countryName - Nombre del país.
 * @returns {string} Emoji de la bandera o cadena vacía.
 */
function getCountryFlagEmoji(countryName) {
    if (!countryName) return '';
    const flags = {
        'Colombia': '🇨🇴',
        'España': '🇪🇸',
        'Mexico': '🇲🇽',
        'Argentina': '🇦🇷',
        'USA': '🇺�',
        'Canada': '🇨🇦'
        // Añade más países según necesites
    };
    return flags[countryName] || '';
}

// ====================================================================================
// LÓGICA DE SOLICITUDES DE AMISTAD (Exportadas)
// ====================================================================================

/**
 * Carga y actualiza el badge de solicitudes de amistad pendientes.
 * @param {string} currentUserId - ID del usuario actual.
 */
export async function loadPendingFriendRequestsCount(currentUserId) {
    // Asegurarse de que el badge exista antes de intentar manipularlo
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    if (!friendRequestsBadge) {
        console.warn('Elemento #friend-requests-badge no encontrado. No se puede actualizar el conteo de solicitudes.');
        return;
    }
    if (!currentUserId) {
        console.warn('loadPendingFriendRequestsCount: currentUserId es nulo. No se puede cargar el conteo.');
        friendRequestsBadge.classList.add('hidden'); // Ocultar si no hay usuario
        return;
    }
    try {
        const { count, error } = await supabase
            .from('friend_requests')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('status', 'pending');

        if (error) {
            throw error;
        }

        if (count > 0) {
            friendRequestsBadge.textContent = count;
            friendRequestsBadge.classList.remove('hidden');
        } else {
            friendRequestsBadge.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error al cargar conteo de solicitudes pendientes:', error.message);
    }
}

/**
 * Muestra un modal con las solicitudes de amistad pendientes para el usuario actual.
 */
export async function showFriendRequestsModal() {
    const { data: { user } = {} } = await supabase.auth.getUser(); // Añadir valor por defecto para user
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver las solicitudes de amistad.');
        return;
    }

    try {
        // ESPECIFICAR LA RELACIÓN PARA EL REMITENTE (sender_id)
        // Usamos 'profiles!friend_requests_sender_id_fkey' que definimos en el SQL
        const { data: requests, error } = await supabase
            .from('friend_requests')
            .select('id, sender_id, sender_profile:profiles!friend_requests_sender_id_fkey(username)')
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) {
            throw error;
        }

        let requestsHtml = '';
        if (requests && requests.length > 0) {
            requestsHtml = requests.map(req => `
                <div class="friend-request-item">
                    <p><i class="fas fa-user-plus"></i> <strong>${req.sender_profile ? req.sender_profile.username : 'Usuario Desconocido'}</strong> te ha enviado una solicitud.</p>
                    <div class="request-actions">
                        <button class="accept-btn" data-request-id="${req.id}" data-sender-id="${req.sender_id}" data-sender-username="${req.sender_profile ? req.sender_profile.username : 'Usuario Desconocido'}">
                            <i class="fas fa-check"></i> Aceptar
                        </button>
                        <button class="reject-btn" data-request-id="${req.id}" data-sender-username="${req.sender_profile ? req.sender_profile.username : 'Usuario Desconocido'}">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            requestsHtml = '<p>No tienes solicitudes de amistad pendientes.</p>';
        }

        // El .then() se ejecuta cuando el modal se cierra, no cuando se abre.
        // Los event listeners deben adjuntarse después de que el modal se haya renderizado.
        // SweetAlert2 tiene un hook `didOpen` para esto.
        Swal.fire({
            icon: 'info',
            title: 'Solicitudes de Amistad',
            html: `<div class="friend-requests-list">${requestsHtml}</div>`,
            confirmButtonText: 'Cerrar', // Un botón de cierre general para el modal
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
            showCancelButton: false, // No mostrar botón de cancelar
            didOpen: (popup) => {
                // Añadir event listeners a los botones de aceptar y rechazar dentro del modal de SweetAlert
                popup.querySelectorAll('.accept-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const requestId = event.currentTarget.dataset.requestId;
                        const senderId = event.currentTarget.dataset.senderId;
                        const senderUsername = event.currentTarget.dataset.senderUsername;
                        await handleAcceptFriendRequest(requestId, senderId, senderUsername, user.id);
                        Swal.close(); // Cierra el modal después de aceptar
                    });
                });
                popup.querySelectorAll('.reject-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const requestId = event.currentTarget.dataset.requestId;
                        const senderUsername = event.currentTarget.dataset.senderUsername;
                        await handleRejectFriendRequest(requestId, senderUsername, user.id);
                        Swal.close(); // Cierra el modal después de rechazar
                    });
                });
            }
        }).then(() => {
            // Este .then() se ejecuta cuando el modal se cierra (por el botón "Cerrar" o por clic fuera)
            loadPendingFriendRequestsCount(user.id);
            // loadFriendsList(user.id); // Ya no es necesario llamar aquí gracias a Realtime
        });

    } catch (error) {
        console.error('Error al cargar solicitudes de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar las solicitudes: ${error.message}`);
    }
}

/**
 * Acepta una solicitud de amistad y actualiza el estado en la base de datos.
 * @param {string} requestId - El ID de la solicitud de amistad.
 * @param {string} senderId - El ID del usuario que envió la solicitud.
 * @param {string} senderUsername - El nombre de usuario del remitente.
 * @param {string} receiverId - El ID del usuario que está aceptando la solicitud.
 */
export async function handleAcceptFriendRequest(requestId, senderId, senderUsername, receiverId) {
    try {
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('sender_id', senderId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending'); // Asegurarse de que solo se actualicen las pendientes

        if (updateError) {
            throw updateError;
        }

        // Insertar la relación bidireccional en la tabla 'friends'
        // Aseguramos que user1_id sea siempre menor que user2_id para la restricción UNIQUE
        const [id1, id2] = [receiverId, senderId].sort();

        const { error: insertError } = await supabase.from('friends').insert([
            { user1_id: id1, user2_id: id2 }
        ]);

        if (insertError) {
            // Si el error es por duplicado (ya son amigos por alguna razón), no es crítico
            if (insertError.code === '23505') { // Código de error para violación de unique constraint
                console.warn('Intento de insertar amistad duplicada, ignorado.');
            } else {
                throw insertError;
            }
        }

        // --- INICIO: LÓGICA DE NOTIFICACIÓN DE AMISTAD ACEPTADA ---
        // 1. Obtener el nombre de usuario del que acepta la solicitud (receiverId)
        const { data: receiverProfile, error: receiverProfileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', receiverId)
            .single();

        if (receiverProfileError) {
            console.error('Error al obtener el perfil del receptor para la notificación:', receiverProfileError.message);
            // No lanzamos un error aquí para no detener la aceptación de amistad
        }

        const receiverUsername = receiverProfile ? receiverProfile.username : 'Un usuario';
        const notificationMessage = `¡${receiverUsername} ha aceptado tu solicitud de amistad! Ahora son amigos.`;

        // 2. Enviar un mensaje de chat al remitente (senderId)
        const { error: messageError } = await supabase
            .from('chat_messages')
            .insert([
                {
                    sender_id: receiverId, // Quien acepta es el que envía la notificación
                    receiver_id: senderId, // Quien envió la solicitud es el que la recibe
                    message: notificationMessage,
                    is_read: false // Marcar como no leído
                }
            ]);

        if (messageError) {
            console.error('Error al enviar mensaje de notificación de amistad aceptada:', messageError.message);
            // No lanzamos un error aquí para no detener la aceptación de amistad
        }
        // --- FIN: LÓGICA DE NOTIFICACIÓN DE AMISTAD ACEPTADA ---


        showCustomSwal('success', '¡Amistad Aceptada!', `¡Ahora eres amigo de <strong>${senderUsername}</strong>!`);
        await loadPendingFriendRequestsCount(receiverId); // Recargar conteo del badge
        // await loadFriendsList(receiverId); // Ya no es necesario llamar aquí gracias a Realtime
    }
    catch (error) {
        console.error('Error al aceptar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo aceptar la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Rechaza una solicitud de amistad y actualiza el estado en la base de datos.
 * @param {string} requestId - El ID de la solicitud de amistad.
 * @param {string} senderUsername - El nombre de usuario del remitente.
 * @param {string} receiverId - El ID del usuario que está rechazando la solicitud.
 */
export async function handleRejectFriendRequest(requestId, senderUsername, receiverId) {
    try {
        // Cambiado de update a delete, según la solicitud del usuario
        const { error: deleteError } = await supabase
            .from('friend_requests')
            .delete() // Eliminar la solicitud
            .eq('id', requestId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending'); // Asegurarse de que solo se eliminen las pendientes

        if (deleteError) {
            throw deleteError;
        }

        showCustomSwal('info', 'Solicitud Rechazada', `Has rechazado la solicitud de amistad de <strong>${senderUsername}</strong>. ¡La solicitud ha sido eliminada!`);
        await loadPendingFriendRequestsCount(receiverId); // Recargar conteo
    } catch (error) {
        console.error('Error al rechazar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo rechazar la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Carga y muestra la lista de amigos del usuario actual en una tabla.
 * @param {string} currentUserId - ID del usuario actual.
 */
export async function loadFriendsList(currentUserId) {
    // Asegurarse de que el contenedor exista antes de intentar manipularlo
    friendsListContainer = document.getElementById('friends-list-container');
    if (!friendsListContainer) {
        console.warn('Elemento #friends-list-container no encontrado. No se puede cargar la lista de amigos.');
        return;
    }
    if (!currentUserId) {
        console.warn('loadFriendsList: currentUserId es nulo. No se puede cargar la lista de amigos.');
        friendsListContainer.innerHTML = '<p>No estás autenticado para ver la lista de amigos.</p>';
        return;
    }

    // Mostrar un mensaje de carga claro inmediatamente
    friendsListContainer.innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text">Cargando lista de amigos...</p>
    `;

    console.log('--- Iniciando carga de lista de amigos ---');
    console.log('ID de usuario actual:', currentUserId);
    console.time('Tiempo de consulta Supabase para amigos'); // Iniciar el temporizador para la consulta

    try {
        // OBTENER IDs de amigos de la tabla 'friends'
        // Usamos los nombres de las claves foráneas que definimos en el SQL:
        // 'profiles!friends_user1_id_fkey' y 'profiles!friends_user2_id_fkey'
        const { data: friendsData, error: friendsError } = await supabase
            .from('friends')
            .select(`
                user1_id,
                user2_id,
                user1_profile:profiles!friends_user1_id_fkey(id, username, gold, diamonds, country),
                user2_profile:profiles!friends_user2_id_fkey(id, username, gold, diamonds, country)
            `)
            .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

        console.timeEnd('Tiempo de consulta Supabase para amigos'); // Finalizar el temporizador de la consulta

        if (friendsError) {
            throw friendsError;
        }

        console.log('Datos crudos de amistad recibidos de Supabase:', friendsData);

        const uniqueFriends = new Map(); // Usar un Map para evitar duplicados y almacenar el perfil completo
        friendsData.forEach(friendship => {
            let friendProfile = null;
            let friendId = null;
            // Determinar cuál de los dos usuarios en la amistad es el "otro"
            if (friendship.user1_id === currentUserId) {
                friendProfile = friendship.user2_profile;
                friendId = friendship.user2_id;
            } else if (friendship.user2_id === currentUserId) {
                friendProfile = friendship.user1_profile;
                friendId = friendship.user1_id;
            }

            if (friendProfile && friendProfile.username) {
                // Usar el ID del perfil como clave para el Map para asegurar unicidad
                uniqueFriends.set(friendId, { id: friendId, ...friendProfile });
            }
        });

        const friends = Array.from(uniqueFriends.values());
        console.log('Lista de amigos procesada (únicos):', friends);

        if (friends.length === 0) {
            friendsListContainer.innerHTML = '<p>Aún no tienes amigos. ¡Envía algunas solicitudes!</p>';
            return;
        }

        let tableHtml = `
            <table class="friends-table">
                <thead>
                    <tr>
                        <th>Amigo</th>
                        <th>Oro</th>
                        <th>Diamantes</th>
                        <th>País</th>
                    </tr>
                </thead>
                <tbody>
        `;
        friends.forEach(friend => {
            tableHtml += `
                <tr class="friend-row" data-friend-id="${friend.id}" data-friend-username="${friend.username}">
                    <td>${friend.username || 'Desconocido'}</td>
                    <td>${friend.gold || 0} <i class="fas fa-coins currency-icon gold-icon"></i></td>
                    <td>${friend.diamonds || 0} <i class="fas fa-gem currency-icon diamond-icon"></i></td>
                    <td>${getCountryFlagEmoji(friend.country)} ${friend.country || 'N/A'}</td>
                </tr>
            `;
        });
        tableHtml += `
                </tbody>
            </table>
        `;
        friendsListContainer.innerHTML = tableHtml;

        // Add event listeners to the new rows
        document.querySelectorAll('.friends-table tbody .friend-row').forEach(row => {
            row.addEventListener('click', async (event) => {
                const friendId = event.currentTarget.dataset.friendId;
                const friendUsername = event.currentTarget.dataset.friendUsername;
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    showFriendProfileModal(user.id, friendId, friendUsername);
                } else {
                    showCustomSwal('error', 'Error', 'No hay sesión activa para ver el perfil del amigo.');
                }
            });
        });

    } catch (error) {
        console.error('Error al cargar la lista de amigos:', error.message);
        friendsListContainer.innerHTML = `<p>Error al cargar la lista de amigos: ${error.message}</p>`;
    } finally {
        console.log('--- Fin de carga de lista de amigos ---');
    }
}

/**
 * Muestra un modal con el perfil de un amigo y opciones para chatear.
 * @param {string} currentUserId - ID del usuario actual.
 * @param {string} friendId - ID del amigo cuyo perfil se va a mostrar.
 * @param {string} friendUsername - Nombre de usuario del amigo.
 */
export async function showFriendProfileModal(currentUserId, friendId, friendUsername) {
    try {
        const { data: friendProfile, error } = await supabase
            .from('profiles')
            .select('username, gold, diamonds, country')
            .eq('id', friendId)
            .single();

        if (error) {
            throw error;
        }

        const profileHtml = `
            <div class="friend-profile-card">
                <h3>${friendProfile.username || 'Desconocido'}</h3>
                <p><strong>Oro:</strong> ${friendProfile.gold || 0} <i class="fas fa-coins currency-icon gold-icon"></i></p>
                <p><strong>Diamantes:</strong> ${friendProfile.diamonds || 0} <i class="fas fa-gem currency-icon diamond-icon"></i></p>
                <p><strong>País:</strong> ${getCountryFlagEmoji(friendProfile.country)} ${friendProfile.country || 'N/A'}</p>
                <button id="message-friend-btn" class="swal-custom-btn swal-btn-message"><i class="fas fa-comment-dots"></i> Enviar Mensaje</button>
            </div>
        `;

        Swal.fire({
            icon: 'info',
            title: 'Perfil de Amigo',
            html: profileHtml,
            confirmButtonText: 'Cerrar',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
            didOpen: (popup) => {
                const messageBtn = popup.querySelector('#message-friend-btn');
                if (messageBtn) {
                    messageBtn.addEventListener('click', async () => {
                        Swal.close(); // Close profile modal
                        await showChatWindow(currentUserId, friendId, friendProfile.username);
                    });
                }
            }
        });

    } catch (error) {
        console.error('Error al cargar el perfil del amigo:', error.message);
        showCustomSwal('error', 'Error', `No se pudo cargar el perfil del amigo: ${error.message}`);
    }
}


/**
 * Muestra una ventana de chat para una conversación específica.
 * @param {string} currentUserId - ID del usuario actual.
 * @param {string} otherUserId - ID del otro participante en la conversación.
 * @param {string} otherUsername - Nombre de usuario del otro participante.
 */
export async function showChatWindow(currentUserId, otherUserId, otherUsername) {
    // Fetch messages for this specific conversation
    try {
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select(`
                id,
                message,
                created_at,
                sender_id,
                receiver_id,
                sender:profiles!chat_messages_sender_id_fkey(username),
                receiver:profiles!chat_messages_receiver_id_fkey(username)
            `)
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        let chatMessagesHtml = messages.map(msg => `
            <div class="chat-message ${msg.sender_id === currentUserId ? 'sent' : 'received'}">
                <span class="message-sender">${msg.sender_id === currentUserId ? 'Tú' : (msg.sender ? msg.sender.username : 'Desconocido')}:</span>
                <span class="message-text">${msg.message}</span>
                <span class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</span>
            </div>
        `).join('');

        Swal.fire({
            title: `Chat con <strong>${otherUsername}</strong>`,
            html: `
                <div class="chat-window">
                    <div class="chat-messages-display">${chatMessagesHtml}</div>
                    <textarea id="chat-input" class="swal2-input chat-input" placeholder="Escribe tu mensaje..."></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button',
                cancelButton: 'swal2-profile-cancel-button'
            },
            buttonsStyling: false,
            didOpen: (popup) => {
                const chatDisplay = popup.querySelector('.chat-messages-display');
                if (chatDisplay) {
                    chatDisplay.scrollTop = chatDisplay.scrollHeight;
                }
                const messageInput = popup.querySelector('#chat-input');
                if (messageInput) {
                    messageInput.focus();
                    messageInput.addEventListener('keydown', async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const messageText = messageInput.value.trim();
                            if (messageText) {
                                await handleSendMessage(currentUserId, otherUserId, messageText);
                                // Re-fetch messages and update chat window
                                await showChatWindow(currentUserId, otherUserId, otherUsername);
                            } else {
                                showCustomSwal('warning', 'Atención', 'El mensaje no puede estar vacío.');
                            }
                        }
                    });
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const messageInput = Swal.getPopup().querySelector('#chat-input');
                const messageText = messageInput ? messageInput.value.trim() : '';
                if (!messageText) {
                    showCustomSwal('warning', 'Atención', 'El mensaje no puede estar vacío.');
                    // Reabrir el chat si el mensaje está vacío
                    await showChatWindow(currentUserId, otherUserId, otherUsername);
                    return;
                }
                await handleSendMessage(currentUserId, otherUserId, messageText);
                // After sending, re-open the chat window to show the new message
                await showChatWindow(currentUserId, otherUserId, otherUsername);
            } else if (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.backdrop) {
                // If the user closes the chat, they might want to return to the conversations list
                await showMessagesModal(); // Re-open the main messages modal
            }
        });

    } catch (error) {
        console.error('Error al cargar la ventana de chat:', error.message);
        showCustomSwal('error', 'Error', `No se pudo cargar la conversación: ${error.message}`);
    }
}


/**
 * Envía un mensaje y lo guarda en la base de datos.
 * @param {string} senderId - ID del usuario que envía el mensaje.
 * @param {string} receiverId - ID del usuario que recibe el mensaje.
 * @param {string} messageText - Contenido del mensaje.
 */
export async function handleSendMessage(senderId, receiverId, messageText) {
    try {
        const { error: insertError } = await supabase
            .from('chat_messages')
            .insert([{ sender_id: senderId, receiver_id: receiverId, message: messageText, is_read: false }]); // is_read por defecto a false

        if (insertError) {
            throw insertError;
        }
        console.log('Mensaje enviado con éxito.');
        // No recargamos el badge del receptor aquí, se hará al reabrir el modal de mensajes
    } catch (error) {
        console.error('Error al enviar mensaje:', error.message);
        showCustomSwal('error', 'Error', 'No se pudo enviar el mensaje.');
    }
}

// ====================================================================================
// INICIALIZACIÓN DE socialLogic.js AL CARGAR EL DOM
// ====================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Asignar referencias a elementos DOM específicos de este script
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    messagesBadge = document.getElementById('messages-badge');
    friendsListContainer = document.getElementById('friends-list-container');
    friendRequestsBtn = document.getElementById('friend-requests-btn');
    messagesBtn = document.getElementById('messages-btn');

    // Añadir event listeners a los botones si existen
    if (friendRequestsBtn) {
        friendRequestsBtn.addEventListener('click', showFriendRequestsModal);
    }
    if (messagesBtn) {
        messagesBtn.addEventListener('click', showMessagesModal);
    }

    // Cargar los conteos iniciales si el usuario ya está autenticado
    // Esto se manejará mejor a través de la función loadUserProfile en script.js
    // que se llama en el onAuthStateChange.
});