// socialLogic.js - Lógica para funcionalidades sociales (amigos, solicitudes, mensajes)

// Importa la instancia de Supabase configurada
import { supabase } from './supabaseConfig.js';

// ====================================================================================
// REFERENCIAS A ELEMENTOS DEL DOM (Declaradas globalmente para accesibilidad)
// ====================================================================================

// Elementos para solicitudes de amistad
let friendRequestsModal;
let friendRequestsListContainer;
let addFriendInput;
let sendFriendRequestBtn;
let closeFriendRequestsModalBtn;
let friendRequestsBadge; // Para el contador en el dashboard

// Elementos para mensajes
let messagesModal;
let messagesListContainer;
let messageInput;
let sendMessageBtn;
let closeMessagesModalBtn;
let messagesBadge; // Para el contador en el dashboard

// Elementos para la lista de amigos en el dashboard
let friendsListContainer;

// ====================================================================================
// FUNCIONES DE UTILIDAD LOCALES
// ====================================================================================

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
        html: text,
        confirmButtonText: confirmButtonText,
        customClass: {
            popup: 'swal2-profile-popup', // Clases CSS para personalizar
            title: 'swal2-profile-title',
            htmlContainer: 'swal2-profile-html',
            confirmButton: 'swal2-profile-confirm-button'
        },
        buttonsStyling: false,
    });
}

// ====================================================================================
// LÓGICA DE SOLICITUDES DE AMISTAD
// ====================================================================================

/**
 * Carga el conteo de solicitudes de amistad pendientes y actualiza el badge.
 * @param {string} userId - ID del usuario actual.
 */
export async function loadPendingFriendRequestsCount(userId) {
    // === ELIMINADA LÓGICA DE LOADER ===
    if (!userId) {
        console.error('loadPendingFriendRequestsCount: userId es nulo o indefinido. No se puede cargar el conteo de solicitudes.');
        return;
    }
    try {
        const { count, error } = await supabase
            .from('friend_requests')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('status', 'pending');

        if (error) throw error;

        friendRequestsBadge = document.getElementById('friend-requests-badge');
        if (friendRequestsBadge) {
            if (count > 0) {
                friendRequestsBadge.textContent = count;
                friendRequestsBadge.classList.remove('hidden');
            } else {
                friendRequestsBadge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error al cargar conteo de solicitudes de amistad:', error.message);
    }
}

/**
 * Muestra el modal de solicitudes de amistad y carga las solicitudes.
 */
export async function showFriendRequestsModal() {
    friendRequestsModal = document.getElementById('friend-requests-modal');
    friendRequestsListContainer = document.getElementById('friend-requests-list');
    addFriendInput = document.getElementById('add-friend-input');
    sendFriendRequestBtn = document.getElementById('send-friend-request-btn');
    closeFriendRequestsModalBtn = document.getElementById('close-friend-requests-modal');

    if (!friendRequestsModal || !friendRequestsListContainer) {
        console.error('Elementos del modal de solicitudes de amistad no encontrados.');
        return;
    }

    // Limpiar lista antes de cargar
    friendRequestsListContainer.innerHTML = '<p>Cargando solicitudes...</p>';

    // Mostrar modal
    friendRequestsModal.classList.remove('hidden');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver las solicitudes de amistad.');
        friendRequestsListContainer.innerHTML = '<p>No estás autenticado.</p>';
        return;
    }

    try {
        const { data: requests, error } = await supabase
            .from('friend_requests')
            .select(`
                id,
                sender_id,
                status,
                profiles!friend_requests_sender_id_fkey(username)
            `)
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) throw error;

        friendRequestsListContainer.innerHTML = ''; // Limpiar de nuevo
        if (requests.length === 0) {
            friendRequestsListContainer.innerHTML = '<p>No tienes solicitudes de amistad pendientes.</p>';
        } else {
            requests.forEach(request => {
                const senderUsername = request.profiles ? request.profiles.username : 'Usuario Desconocido';
                const requestItem = document.createElement('div');
                requestItem.classList.add('friend-request-item');
                requestItem.innerHTML = `
                    <p>${senderUsername} te ha enviado una solicitud.</p>
                    <div class="request-actions">
                        <button class="accept-btn" data-request-id="${request.id}" data-sender-id="${request.sender_id}">Aceptar</button>
                        <button class="reject-btn" data-request-id="${request.id}">Rechazar</button>
                    </div>
                `;
                friendRequestsListContainer.appendChild(requestItem);
            });

            // Añadir listeners a los botones de aceptar/rechazar
            friendRequestsListContainer.querySelectorAll('.accept-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const requestId = e.target.dataset.requestId;
                    const senderId = e.target.dataset.senderId;
                    await handleFriendRequest(requestId, senderId, 'accepted', user.id);
                });
            });

            friendRequestsListContainer.querySelectorAll('.reject-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const requestId = e.target.dataset.requestId;
                    await handleFriendRequest(requestId, null, 'rejected', user.id);
                });
            });
        }
    } catch (error) {
        console.error('Error al cargar solicitudes de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar las solicitudes de amistad: ${error.message}`);
    }

    // Event listeners para el modal
    if (closeFriendRequestsModalBtn) {
        closeFriendRequestsModalBtn.onclick = () => friendRequestsModal.classList.add('hidden');
    }
    if (sendFriendRequestBtn) {
        sendFriendRequestBtn.onclick = async () => {
            const receiverEmailOrUsername = addFriendInput.value.trim();
            if (receiverEmailOrUsername) {
                await sendFriendRequest(receiverEmailOrUsername, user.id);
            } else {
                showCustomSwal('warning', 'Atención', 'Por favor, ingresa un email o nombre de usuario.');
            }
        };
    }
}

/**
 * Envía una solicitud de amistad.
 * @param {string} receiverIdentifier - Email o nombre de usuario del destinatario.
 * @param {string} senderId - ID del usuario que envía la solicitud.
 */
async function sendFriendRequest(receiverIdentifier, senderId) {
    if (!receiverIdentifier || !senderId) {
        showCustomSwal('error', 'Error', 'Datos incompletos para enviar la solicitud.');
        return;
    }

    // 1. Buscar el receiver_id por email o username
    let receiverId = null;
    let { data: receiverProfile, error: searchError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`email.eq.${receiverIdentifier},username.eq.${receiverIdentifier}`)
        .single();

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error buscando destinatario:', searchError.message);
        showCustomSwal('error', 'Error', `No se pudo buscar al usuario: ${searchError.message}`);
        return;
    }
    if (!receiverProfile) {
        showCustomSwal('error', 'Usuario no encontrado', 'El usuario con ese email o nombre de usuario no existe.');
        return;
    }
    receiverId = receiverProfile.id;

    if (receiverId === senderId) {
        showCustomSwal('warning', 'Atención', 'No puedes enviarte una solicitud de amistad a ti mismo.');
        return;
    }

    // 2. Verificar si ya existe una solicitud pendiente o amistad
    const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
        .in('status', ['pending', 'accepted'])
        .maybeSingle(); // Usar maybeSingle para no lanzar error si no hay resultados

    if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error verificando solicitud existente:', checkError.message);
        showCustomSwal('error', 'Error', `Error al verificar solicitudes existentes: ${checkError.message}`);
        return;
    }

    if (existingRequest) {
        if (existingRequest.status === 'pending') {
            showCustomSwal('info', 'Solicitud Pendiente', 'Ya existe una solicitud de amistad pendiente con este usuario.');
        } else if (existingRequest.status === 'accepted') {
            showCustomSwal('info', 'Ya son Amigos', 'Ya eres amigo de este usuario.');
        }
        return;
    }

    // 3. Insertar la nueva solicitud
    try {
        const { error } = await supabase
            .from('friend_requests')
            .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' });

        if (error) throw error;

        showCustomSwal('success', 'Solicitud Enviada', `Solicitud de amistad enviada a ${receiverProfile.username || receiverProfile.email}.`);
        addFriendInput.value = ''; // Limpiar input
        await loadPendingFriendRequestsCount(senderId); // Actualizar badge del remitente
    } catch (error) {
        console.error('Error al enviar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo enviar la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Maneja la aceptación o rechazo de una solicitud de amistad.
 * @param {string} requestId - ID de la solicitud.
 * @param {string} senderId - ID del remitente (solo necesario para aceptar).
 * @param {string} status - 'accepted' o 'rejected'.
 * @param {string} currentUserId - ID del usuario actual (receptor de la solicitud).
 */
async function handleFriendRequest(requestId, senderId, status, currentUserId) {
    try {
        // Actualizar el estado de la solicitud
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: status })
            .eq('id', requestId);

        if (updateError) throw updateError;

        if (status === 'accepted') {
            // Si se acepta, crear una entrada en la tabla 'friends' para ambos lados
            const { error: insertError } = await supabase.from('friends').insert([
                { user1_id: currentUserId, user2_id: senderId },
                { user1_id: senderId, user2_id: currentUserId } // Relación bidireccional
            ]);

            if (insertError) {
                // Si el error es por duplicado (ya son amigos por alguna razón), no es crítico
                if (insertError.code === '23505') {
                    console.warn('Intento de insertar amistad duplicada, ignorado.');
                } else {
                    throw insertError;
                }
            }
            showCustomSwal('success', 'Solicitud Aceptada', '¡Ahora son amigos!');
        } else {
            showCustomSwal('info', 'Solicitud Rechazada', 'Solicitud de amistad rechazada.');
        }

        // Recargar solicitudes y lista de amigos
        await showFriendRequestsModal(); // Recarga el modal
        await loadPendingFriendRequestsCount(currentUserId); // Actualiza el badge
        await loadFriendsList(currentUserId); // Actualiza la lista de amigos en el dashboard

    } catch (error) {
        console.error(`Error al ${status} solicitud de amistad:`, error.message);
        showCustomSwal('error', 'Error', `No se pudo ${status} la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Carga la lista de amigos del usuario actual y la muestra en el dashboard.
 * @param {string} userId - ID del usuario actual.
 */
export async function loadFriendsList(userId) {
    friendsListContainer = document.getElementById('friends-list-container');
    if (!friendsListContainer) {
        console.error('Contenedor de lista de amigos no encontrado.');
        return;
    }
    if (!userId) {
        friendsListContainer.innerHTML = '<p>No estás autenticado para ver la lista de amigos.</p>';
        return;
    }

    friendsListContainer.innerHTML = '<p>Cargando lista de amigos...</p>';

    try {
        // Obtener amigos donde user1_id es el usuario actual
        const { data: friends1, error: error1 } = await supabase
            .from('friends')
            .select(`
                user2_id,
                profiles!friends_user2_id_fkey(username, country, gold, diamonds)
            `)
            .eq('user1_id', userId);

        if (error1) throw error1;

        // Obtener amigos donde user2_id es el usuario actual (para asegurar bidireccionalidad si no siempre se inserta doble)
        // Aunque la lógica de handleFriendRequest inserta bidireccionalmente, esto es una salvaguarda.
        const { data: friends2, error: error2 } = await supabase
            .from('friends')
            .select(`
                user1_id,
                profiles!friends_user1_id_fkey(username, country, gold, diamonds)
            `)
            .eq('user2_id', userId);

        if (error2) throw error2;

        // Combinar y eliminar duplicados (si los hay)
        const allFriendsMap = new Map();
        friends1.forEach(f => {
            if (f.profiles) allFriendsMap.set(f.user2_id, f.profiles);
        });
        friends2.forEach(f => {
            if (f.profiles) allFriendsMap.set(f.user1_id, f.profiles);
        });

        const friends = Array.from(allFriendsMap.values());

        friendsListContainer.innerHTML = ''; // Limpiar de nuevo

        if (friends.length === 0) {
            friendsListContainer.innerHTML = '<p>Aún no tienes amigos. ¡Envía una solicitud!</p>';
        } else {
            const table = document.createElement('table');
            table.classList.add('friends-table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>País</th>
                        <th>Oro</th>
                        <th>Diamantes</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector('tbody');

            friends.forEach(friend => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${friend.username || 'N/A'}</td>
                    <td>${friend.country || 'N/A'}</td>
                    <td><i class="fas fa-coins currency-icon"></i> ${friend.gold || 0}</td>
                    <td><i class="fas fa-gem currency-icon"></i> ${friend.diamonds || 0}</td>
                `;
                tbody.appendChild(row);
            });
            friendsListContainer.appendChild(table);
        }
    } catch (error) {
        console.error('Error al cargar la lista de amigos:', error.message);
        showCustomSwal('error', 'Error', `No se pudo cargar la lista de amigos: ${error.message}`);
    }
}

// ====================================================================================
// LÓGICA DE MENSAJES
// ====================================================================================

/**
 * Carga el conteo de mensajes no leídos y actualiza el badge.
 * @param {string} userId - ID del usuario actual.
 */
export async function loadUnreadMessagesCount(userId) {
    if (!userId) {
        console.error('loadUnreadMessagesCount: userId es nulo o indefinido. No se puede cargar el conteo de mensajes no leídos.');
        return;
    }
    try {
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('is_read', false); // Asegúrate de que 'is_read' sea un booleano en tu DB

        if (error) throw error;

        messagesBadge = document.getElementById('messages-badge');
        if (messagesBadge) {
            if (count > 0) {
                messagesBadge.textContent = count;
                messagesBadge.classList.remove('hidden');
            } else {
                messagesBadge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error al cargar conteo de mensajes no leídos:', error.message);
    }
}

/**
 * Muestra el modal de mensajes y carga los mensajes.
 */
export async function showMessagesModal() {
    messagesModal = document.getElementById('messages-modal');
    messagesListContainer = document.getElementById('messages-list');
    messageInput = document.getElementById('message-input');
    sendMessageBtn = document.getElementById('send-message-btn');
    closeMessagesModalBtn = document.getElementById('close-messages-modal');

    if (!messagesModal || !messagesListContainer) {
        console.error('Elementos del modal de mensajes no encontrados.');
        return;
    }

    // Limpiar lista antes de cargar
    messagesListContainer.innerHTML = '<p>Cargando mensajes...</p>';

    // Mostrar modal
    messagesModal.classList.remove('hidden');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver los mensajes.');
        messagesListContainer.innerHTML = '<p>No estás autenticado.</p>';
        return;
    }

    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                id,
                sender_id,
                receiver_id,
                content,
                created_at,
                is_read,
                profiles!messages_sender_id_fkey(username)
            `)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`) // Mensajes enviados o recibidos
            .order('created_at', { ascending: true }); // Ordenar por fecha

        if (error) throw error;

        messagesListContainer.innerHTML = ''; // Limpiar de nuevo

        if (messages.length === 0) {
            messagesListContainer.innerHTML = '<p>No tienes mensajes.</p>';
        } else {
            messages.forEach(message => {
                const senderUsername = message.profiles ? message.profiles.username : 'Usuario Desconocido';
                const messageItem = document.createElement('div');
                messageItem.classList.add('message-item');
                if (message.sender_id === user.id) {
                    messageItem.classList.add('sent');
                } else {
                    messageItem.classList.add('received');
                    if (!message.is_read) {
                        messageItem.classList.add('unread');
                    }
                }
                messageItem.innerHTML = `
                    <p class="message-sender">${message.sender_id === user.id ? 'Tú' : senderUsername}:</p>
                    <p class="message-content">${message.content}</p>
                    <span class="message-time">${new Date(message.created_at).toLocaleTimeString()}</span>
                `;
                messagesListContainer.appendChild(messageItem);

                // Marcar como leído si el mensaje fue recibido y no leído
                if (message.receiver_id === user.id && !message.is_read) {
                    markMessageAsRead(message.id);
                }
            });
        }
        await loadUnreadMessagesCount(user.id); // Actualizar badge después de cargar y marcar como leídos
    } catch (error) {
        console.error('Error al cargar mensajes:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar los mensajes: ${error.message}`);
    }

    // Event listeners para el modal
    if (closeMessagesModalBtn) {
        closeMessagesModalBtn.onclick = () => messagesModal.classList.add('hidden');
    }
    if (sendMessageBtn) {
        sendMessageBtn.onclick = async () => {
            const content = messageInput.value.trim();
            if (content) {
                await showSendMessageDialog(user.id, content);
            } else {
                showCustomSwal('warning', 'Atención', 'El mensaje no puede estar vacío.');
            }
        };
    }
}

/**
 * Muestra un diálogo para seleccionar a quién enviar el mensaje.
 * @param {string} senderId - ID del usuario que envía el mensaje.
 * @param {string} content - Contenido del mensaje.
 */
async function showSendMessageDialog(senderId, content) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para enviar mensajes.');
        return;
    }

    // Obtener la lista de amigos para el selector
    const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
            user2_id,
            profiles!friends_user2_id_fkey(username)
        `)
        .eq('user1_id', senderId);

    if (friendsError) {
        console.error('Error al cargar amigos para enviar mensaje:', friendsError.message);
        showCustomSwal('error', 'Error', 'No se pudo cargar tu lista de amigos.');
        return;
    }

    if (!friendsData || friendsData.length === 0) {
        showCustomSwal('info', 'Sin Amigos', 'No tienes amigos a quienes enviar mensajes. ¡Envía una solicitud de amistad primero!');
        return;
    }

    const friendOptions = {};
    friendsData.forEach(f => {
        if (f.profiles) {
            friendOptions[f.user2_id] = f.profiles.username;
        }
    });

    const { value: receiverId } = await Swal.fire({
        title: 'Enviar Mensaje a:',
        input: 'select',
        inputOptions: friendOptions,
        inputPlaceholder: 'Selecciona un amigo',
        showCancelButton: true,
        confirmButtonText: 'Enviar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            return new Promise((resolve) => {
                if (value) {
                    resolve();
                } else {
                    resolve('Necesitas seleccionar un amigo.');
                }
            });
        }
    });

    if (receiverId) {
        await sendMessage(senderId, receiverId, content);
    }
}


/**
 * Envía un mensaje a otro usuario.
 * @param {string} senderId - ID del remitente.
 * @param {string} receiverId - ID del destinatario.
 * @param {string} content - Contenido del mensaje.
 */
async function sendMessage(senderId, receiverId, content) {
    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: senderId,
                receiver_id: receiverId,
                content: content,
                is_read: false
            });

        if (error) throw error;

        showCustomSwal('success', 'Mensaje Enviado', 'Tu mensaje ha sido enviado.');
        messageInput.value = ''; // Limpiar input
        await showMessagesModal(); // Recargar el modal de mensajes para ver el nuevo mensaje
    } catch (error) {
        console.error('Error al enviar mensaje:', error.message);
        showCustomSwal('error', 'Error', `No se pudo enviar el mensaje: ${error.message}`);
    }
}

/**
 * Marca un mensaje como leído.
 * @param {string} messageId - ID del mensaje a marcar como leído.
 */
async function markMessageAsRead(messageId) {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId);

        if (error) throw error;
        // console.log(`Mensaje ${messageId} marcado como leído.`); // Solo para depuración
    } catch (error) {
        console.error('Error al marcar mensaje como leído:', error.message);
    }
}

