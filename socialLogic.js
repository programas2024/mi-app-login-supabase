// socialLogic.js - Lógica para las funcionalidades sociales (amigos, solicitudes, mensajes)

// Importaciones necesarias para este módulo: Supabase
import { supabase } from '/supabaseConfig.js'; // Importa la instancia de Supabase configurada

// Referencias a elementos del DOM que este script gestiona
// loaderDiv ya no es necesario aquí
let friendRequestsBadge;
let messagesBadge;
let friendsListContainer;

// ====================================================================================
// FUNCIONES DE UTILIDAD LOCALES PARA socialLogic.js
// ====================================================================================


/**
 * Helper para mostrar SweetAlert2 con estilos personalizados (local a socialLogic.js).
 * @param {string} icon - 'success', 'error', 'info', 'warning', 'question'
 * @param {string} title - Título del modal.
 * @param {string} text - Contenido del modal.
 * @param {string} [confirmButtonText='Entendido'] - Texto del botón de confirmación.
 */
function showCustomSwal(icon, title, text, confirmButtonText = 'Entendido') {
    // Asegurarse de que Swal esté disponible antes de usarlo
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 (Swal) no está definido. Asegúrate de que SweetAlert2 se cargue antes de socialLogic.js.');
        alert(`${title}: ${text}`); // Fallback simple si Swal no está disponible
        return;
    }
    Swal.fire({
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
        'USA': '🇺🇸',
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
        const { data: requests, error } = await supabase
            .from('friend_requests')
            .select('id, sender_id, profiles(username)') // Selecciona el username del remitente
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) {
            throw error;
        }

        let requestsHtml = '';
        if (requests && requests.length > 0) {
            requestsHtml = requests.map(req => `
                <div class="friend-request-item">
                    <p><i class="fas fa-user-plus"></i> <strong>${req.profiles ? req.profiles.username : 'Usuario Desconocido'}</strong> te ha enviado una solicitud.</p>
                    <div class="request-actions">
                        <button class="accept-btn" data-request-id="${req.id}" data-sender-id="${req.sender_id}" data-sender-username="${req.profiles ? req.profiles.username : 'Usuario Desconocido'}">
                            <i class="fas fa-check"></i> Aceptar
                        </button>
                        <button class="reject-btn" data-request-id="${req.id}" data-sender-username="${req.profiles ? req.profiles.username : 'Usuario Desconocido'}">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            requestsHtml = '<p>No tienes solicitudes de amistad pendientes.</p>';
        }

        showCustomSwal('info', 'Solicitudes de Amistad', `<div class="friend-requests-list">${requestsHtml}</div>`).then(() => {
            // Después de cerrar el modal, asegúrate de recargar los contadores
            loadPendingFriendRequestsCount(user.id);
            loadFriendsList(user.id);
        });

        // Añadir event listeners a los botones de aceptar y rechazar dentro del modal de SweetAlert
        // Esto debe hacerse después de que el modal se haya renderizado
        setTimeout(() => { // Pequeño retraso para asegurar que el DOM del modal esté listo
            document.querySelectorAll('.accept-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const requestId = event.target.dataset.requestId;
                    const senderId = event.target.dataset.senderId;
                    const senderUsername = event.target.dataset.senderUsername;
                    await handleAcceptFriendRequest(requestId, senderId, senderUsername, user.id);
                    Swal.close(); // Cierra el modal después de aceptar
                });
            });
            document.querySelectorAll('.reject-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const requestId = event.target.dataset.requestId;
                    const senderUsername = event.target.dataset.senderUsername;
                    await handleRejectFriendRequest(requestId, senderUsername, user.id);
                    Swal.close(); // Cierra el modal después de rechazar
                });
            });
        }, 100); // Un pequeño retraso puede ser útil para asegurar que el DOM del modal esté listo

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
        const { error: insertError } = await supabase.from('friends').insert([
            { user1_id: receiverId, user2_id: senderId },
            { user1_id: senderId, user2_id: receiverId }
        ]);

        if (insertError) {
            // Si el error es por duplicado (ya son amigos por alguna razón), no es crítico
            if (insertError.code === '23505') { // Código de error para violación de unique constraint
                console.warn('Intento de insertar amistad duplicada, ignorado.');
            } else {
                throw insertError;
            }
        }

        showCustomSwal('success', '¡Amistad Aceptada!', `¡Ahora eres amigo de <strong>${senderUsername}</strong>!`);
        await loadPendingFriendRequestsCount(receiverId); // Recargar conteo del badge
        await loadFriendsList(receiverId); // Recargar lista de amigos en el dashboard
    } catch (error) {
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
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending');

        if (updateError) {
            throw updateError;
        }

        showCustomSwal('info', 'Solicitud Rechazada', `Has rechazado la solicitud de amistad de <strong>${senderUsername}</strong>.`);
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

    friendsListContainer.innerHTML = '<p>Cargando lista de amigos...</p>'; // Mensaje de carga

    try {
        // Obtener IDs de amigos de la tabla 'friends'
        // Esto asume que la tabla 'friends' tiene entradas bidireccionales
        // o que una consulta OR es suficiente para encontrar a todos los amigos.
        const { data: friendsData, error: friendsError } = await supabase
            .from('friends')
            .select(`
                user1_id,
                user2_id,
                profiles_user1_id:profiles!friends_user1_id_fkey(username, gold, diamonds, country),
                profiles_user2_id:profiles!friends_user2_id_fkey(username, gold, diamonds, country)
            `)
            .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

        if (friendsError) {
            throw friendsError;
        }

        const uniqueFriends = new Map(); // Usar un Map para evitar duplicados y almacenar el perfil completo
        friendsData.forEach(friendship => {
            let friendProfile = null;
            if (friendship.user1_id === currentUserId) {
                // El amigo es user2_id
                friendProfile = friendship.profiles_user2_id;
            } else if (friendship.user2_id === currentUserId) {
                // El amigo es user1_id
                friendProfile = friendship.profiles_user1_id;
            }

            if (friendProfile && friendProfile.username) {
                uniqueFriends.set(friendProfile.username, friendProfile);
            }
        });

        const friends = Array.from(uniqueFriends.values());

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
                <tr>
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

    } catch (error) {
        console.error('Error al cargar la lista de amigos:', error.message);
        friendsListContainer.innerHTML = `<p>Error al cargar la lista de amigos: ${error.message}</p>`;
    }
}


// ====================================================================================
// LÓGICA DE MENSAJES (Exportadas)
// ====================================================================================

/**
 * Carga y actualiza el badge de mensajes no leídos.
 * (Esta es una implementación básica, necesitarías un campo 'read' en la tabla chat_messages)
 * @param {string} currentUserId - ID del usuario actual.
 */
export async function loadUnreadMessagesCount(currentUserId) {
    // Asegurarse de que el badge exista antes de intentar manipularlo
    messagesBadge = document.getElementById('messages-badge');
    if (!messagesBadge) {
        console.warn('Elemento #messages-badge no encontrado. No se puede actualizar el conteo de mensajes no leídos.');
        return;
    }
    try {
        // Asumiendo que tienes una columna 'is_read' en tu tabla 'chat_messages'
        // Si no la tienes, esta función solo contará todos los mensajes recibidos.
        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('is_read', false); // Necesitarías añadir esta columna y gestionarla

        if (error) {
            throw error;
        }

        if (count > 0) {
            messagesBadge.textContent = count;
            messagesBadge.classList.remove('hidden');
        } else {
            messagesBadge.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error al cargar conteo de mensajes no leídos:', error.message);
    }
}

/**
 * Muestra un modal con las conversaciones de chat del usuario.
 */
export async function showMessagesModal() {
    const { data: { user } = {} } = await supabase.auth.getUser(); // Añadir valor por defecto para user
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver tus mensajes.');
        return;
    }

    try {
        // Obtener todos los mensajes donde el usuario es remitente o receptor
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
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: true }); // Ordenar por fecha para ver la conversación

        if (error) {
            throw error;
        }

        // Agrupar mensajes por conversación (entre dos usuarios)
        const conversations = {};
        messages.forEach(msg => {
            const participant1 = msg.sender_id;
            const participant2 = msg.receiver_id;
            // Crear una clave de conversación consistente
            const convoKey = [participant1, participant2].sort().join('-');
            
            if (!conversations[convoKey]) {
                conversations[convoKey] = {
                    otherUserId: participant1 === user.id ? participant2 : participant1,
                    otherUsername: participant1 === user.id ? (msg.receiver ? msg.receiver.username : 'Desconocido') : (msg.sender ? msg.sender.username : 'Desconocido'),
                    messages: []
                };
            }
            conversations[convoKey].messages.push(msg);
        });

        let conversationsHtml = '';
        if (Object.keys(conversations).length > 0) {
            conversationsHtml = Object.values(conversations).map(convo => `
                <div class="conversation-item" data-other-user-id="${convo.otherUserId}" data-other-username="${convo.otherUsername}">
                    <i class="fas fa-comment"></i> <strong>${convo.otherUsername}</strong>
                    <span class="last-message-preview">${convo.messages[convo.messages.length - 1].message.substring(0, 30)}...</span>
                </div>
            `).join('');
        } else {
            conversationsHtml = '<p>No tienes conversaciones. ¡Envía un mensaje a un amigo!</p>';
        }

        showCustomSwal('info', 'Tus Mensajes', `<div class="conversations-list">${conversationsHtml}</div>`).then(() => {
            // Después de cerrar el modal, asegúrate de recargar los contadores
            loadUnreadMessagesCount(user.id);
        });

        // Añadir event listeners a los elementos de conversación dentro del modal de SweetAlert
        setTimeout(() => { // Pequeño retraso para asegurar que el DOM del modal esté listo
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.addEventListener('click', () => {
                    const otherUserId = item.dataset.otherUserId;
                    const otherUsername = item.dataset.otherUsername;
                    Swal.close(); // Cierra el modal de conversaciones
                    showChatWindow(user.id, otherUserId, otherUsername, conversations[
                        [user.id, otherUserId].sort().join('-')
                    ].messages);
                });
            });
        }, 100); // Un pequeño retraso puede ser útil para asegurar que el DOM del modal esté listo

    } catch (error) {
        console.error('Error al cargar mensajes:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar los mensajes: ${error.message}`);
    }
}

/**
 * Muestra una ventana de chat para una conversación específica.
 * @param {string} currentUserId - ID del usuario actual.
 * @param {string} otherUserId - ID del otro participante en la conversación.
 * @param {string} otherUsername - Nombre de usuario del otro participante.
 * @param {Array} messages - Array de mensajes de esta conversación.
 */
export async function showChatWindow(currentUserId, otherUserId, otherUsername, messages) {
    let chatMessagesHtml = messages.map(msg => `
        <div class="chat-message ${msg.sender_id === currentUserId ? 'sent' : 'received'}">
            <span class="message-sender">${msg.sender_id === currentUserId ? 'Tú' : (msg.sender ? msg.sender.username : 'Desconocido')}:</span>
            <span class="message-text">${msg.message}</span>
            <span class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</span>
        </div>
    `).join('');

    showCustomSwal('info', `Chat con <strong>${otherUsername}</strong>`, `
        <div class="chat-window">
            <div class="chat-messages-display">${chatMessagesHtml}</div>
            <textarea id="chat-input" class="swal2-input chat-input" placeholder="Escribe tu mensaje..."></textarea>
        </div>
    `, 'Enviar').then(async (result) => {
        if (result.isConfirmed) {
            const messageInput = Swal.getPopup().querySelector('#chat-input');
            const messageText = messageInput ? messageInput.value : '';
            if (!messageText || messageText.trim() === '') {
                showCustomSwal('warning', 'Atención', 'El mensaje no puede estar vacío.');
                // Reabrir el chat si el mensaje está vacío
                showChatWindow(currentUserId, otherUserId, otherUsername, messages);
                return;
            }
            await handleSendMessage(currentUserId, otherUserId, messageText);
            // Después de enviar, recargar la ventana de chat para ver el nuevo mensaje
            const newMessage = {
                sender_id: currentUserId,
                receiver_id: otherUserId,
                message: messageText,
                created_at: new Date().toISOString(),
                sender: { username: 'Tú' }, // Simular para display inmediato
                receiver: { username: otherUsername }
            };
            showChatWindow(currentUserId, otherUserId, otherUsername, messages.concat([newMessage]));
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Si el usuario cierra el chat, puede que quiera volver a la lista de conversaciones
            showMessagesModal();
        }
    });

    // Scroll al final del chat después de que el modal se abra
    setTimeout(() => {
        const chatDisplay = Swal.getPopup()?.querySelector('.chat-messages-display');
        if (chatDisplay) {
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }
    }, 150); // Un pequeño retraso para asegurar que el DOM del modal esté listo
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
    // loaderDiv ya no se inicializa aquí
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    messagesBadge = document.getElementById('messages-badge');
    friendsListContainer = document.getElementById('friends-list-container');

    // Aquí no hay listeners directos para botones, ya que script.js los manejará
    // y llamará a las funciones exportadas de este módulo.
});
