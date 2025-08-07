// socialLogic.js - Lógica para las funcionalidades sociales (amigos, solicitudes, mensajes)

// Importaciones necesarias para este módulo: Supabase
import { supabase } from '/supabaseConfig.js'; // Importa la instancia de Supabase configurada

// Referencias a elementos del DOM que este script gestiona
let friendRequestsBadge;
let messagesBadge;
let friendsListContainer;
let friendRequestsBtn; // Referencia al botón de solicitudes de amistad
let messagesBtn; // Referencia al botón de mensajes

// Variable para almacenar la suscripción a Realtime para la lista de amigos
let friendsSubscription = null;
// Variable para almacenar la suscripción a Realtime para el chat activo
let chatSubscription = null;

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
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    if (!friendRequestsBadge) {
        console.warn('Elemento #friend-requests-badge no encontrado. No se puede actualizar el conteo de solicitudes.');
        return;
    }
    if (!currentUserId) {
        console.warn('loadPendingFriendRequestsCount: currentUserId es nulo. No se puede cargar el conteo.');
        friendRequestsBadge.classList.add('hidden');
        return;
    }
    try {
        const { count, error } = await supabase
            .from('friend_requests')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('status', 'pending');

        if (error) throw error;

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

export async function showFriendRequestsModal() {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver las solicitudes de amistad.');
        return;
    }

    try {
        const { data: requests, error } = await supabase
            .from('friend_requests')
            .select('id, sender_id, sender_profile:profiles!friend_requests_sender_id_fkey(username, avatar_url)')
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) throw error;

        let requestsHtml = requests && requests.length > 0 
            ? requests.map(req => `
                <div class="friend-request-card">
                    <div class="request-header">
                        <img src="${req.sender_profile?.avatar_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'}" 
                             alt="${req.sender_profile?.username || 'Usuario'}" 
                             class="request-avatar">
                        <div class="request-user-info">
                            <h3>${req.sender_profile?.username || 'Usuario Desconocido'}</h3>
                            <p class="request-text">Quiere ser tu amigo/a</p>
                        </div>
                    </div>
                    <div class="request-actions">
                        <button class="accept-btn" data-request-id="${req.id}" data-sender-id="${req.sender_id}" data-sender-username="${req.sender_profile?.username || 'Usuario Desconocido'}">
                            <i class="fas fa-check-circle"></i> Aceptar
                        </button>
                        <button class="reject-btn" data-request-id="${req.id}" data-sender-username="${req.sender_profile?.username || 'Usuario Desconocido'}">
                            <i class="fas fa-times-circle"></i> Rechazar
                        </button>
                    </div>
                </div>
            `).join('')
            : `<div class="no-requests">
                  <i class="fas fa-user-friends no-requests-icon"></i>
                  <p>No tienes solicitudes pendientes</p>
                  <small>Cuando alguien te envíe una solicitud, aparecerá aquí</small>
               </div>`;

        Swal.fire({
            title: '<strong>Solicitudes de <span class="text-gradient">Amistad</span></strong>',
            html: `<div class="friend-requests-container">${requestsHtml}</div>`,
            showConfirmButton: false,
            showCloseButton: true,
            closeButtonHtml: `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 6L18 18" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `,
            background: 'transparent',
            width: '500px',
            padding: '0',
            customClass: {
                popup: 'friend-requests-popup',
                title: 'friend-requests-title',
                htmlContainer: 'friend-requests-content',
                closeButton: 'friend-requests-close-btn'
            },
            didOpen: (popup) => {
                popup.querySelectorAll('.accept-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const requestId = event.currentTarget.dataset.requestId;
                        const senderId = event.currentTarget.dataset.senderId;
                        const senderUsername = event.currentTarget.dataset.senderUsername;
                        await handleAcceptFriendRequest(requestId, senderId, senderUsername, user.id);
                        Swal.close();
                    });
                });
                popup.querySelectorAll('.reject-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const requestId = event.currentTarget.dataset.requestId;
                        const senderUsername = event.currentTarget.dataset.senderUsername;
                        await handleRejectFriendRequest(requestId, senderUsername, user.id);
                        Swal.close();
                    });
                });
            }
        }).then(() => {
            loadPendingFriendRequestsCount(user.id);
        });

    } catch (error) {
        console.error('Error al cargar solicitudes de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar las solicitudes: ${error.message}`);
    }
}
/**
 * Acepta una solicitud de amistad y actualiza el estado en la base de datos.
 */
export async function handleAcceptFriendRequest(requestId, senderId, senderUsername, receiverId) {
    try {
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('sender_id', senderId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending');

        if (updateError) throw updateError;

        const [id1, id2] = [receiverId, senderId].sort();
        const { error: insertError } = await supabase.from('friends').insert([
            { user1_id: id1, user2_id: id2 }
        ]);

        if (insertError && insertError.code !== '23505') throw insertError;

        // Notificación de amistad aceptada
        const { data: receiverProfile, error: receiverProfileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', receiverId)
            .single();

        if (!receiverProfileError) {
            const receiverUsername = receiverProfile?.username || 'Un usuario';
            const notificationMessage = `¡${receiverUsername} ha aceptado tu solicitud de amistad! Ahora son amigos.`;

            await supabase
                .from('chat_messages')
                .insert([{
                    sender_id: receiverId,
                    receiver_id: senderId,
                    message: notificationMessage,
                    is_read: false
                }]);
        }

        showCustomSwal('success', '¡Amistad Aceptada!', `¡Ahora eres amigo de <strong>${senderUsername}</strong>!`);
        await loadPendingFriendRequestsCount(receiverId);
    } catch (error) {
        console.error('Error al aceptar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo aceptar la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Rechaza una solicitud de amistad y actualiza el estado en la base de datos.
 */
export async function handleRejectFriendRequest(requestId, senderUsername, receiverId) {
    try {
        const { error: deleteError } = await supabase
            .from('friend_requests')
            .delete()
            .eq('id', requestId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending');

        if (deleteError) throw deleteError;

        showCustomSwal('info', 'Solicitud Rechazada', `Has rechazado la solicitud de amistad de <strong>${senderUsername}</strong>. ¡La solicitud ha sido eliminada!`);
        await loadPendingFriendRequestsCount(receiverId);
    } catch (error) {
        console.error('Error al rechazar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo rechazar la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Carga y muestra la lista de amigos del usuario actual en una tabla.
 */
export async function loadFriendsList(currentUserId) {
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

    friendsListContainer.innerHTML = `
        <div class="loading-spinner"></div>
        <p class="loading-text">Cargando lista de amigos...</p>
    `;

    try {
        const { data: friendsData, error: friendsError } = await supabase
            .from('friends')
            .select(`
                user1_id,
                user2_id,
                user1_profile:profiles!friends_user1_id_fkey(id, username, gold, diamonds, perla),
                user2_profile:profiles!friends_user2_id_fkey(id, username, gold, diamonds, perla)
            `)
            .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

        if (friendsError) throw friendsError;

        const uniqueFriends = new Map();
        friendsData.forEach(friendship => {
            let friendProfile = null;
            let friendId = null;
            if (friendship.user1_id === currentUserId) {
                friendProfile = friendship.user2_profile;
                friendId = friendship.user2_id;
            } else if (friendship.user2_id === currentUserId) {
                friendProfile = friendship.user1_profile;
                friendId = friendship.user1_id;
            }

            if (friendProfile?.username) {
                uniqueFriends.set(friendId, { id: friendId, ...friendProfile });
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
                        <th>Perlas</th>
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
                    <td>${friend.perla || 0} <div class="pearl-icon"></div></td>
                </tr>
            `;
        });
        tableHtml += `
                </tbody>
            </table>
        `;
        friendsListContainer.innerHTML = tableHtml;

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
    }
}

/**
 * Configura la suscripción a Supabase Realtime para la tabla 'friends'.
 */
export function setupFriendsRealtimeSubscription() {
    if (friendsSubscription) {
        friendsSubscription.unsubscribe();
        console.log('Suscripción a amigos existente cancelada.');
    }

    friendsSubscription = supabase
        .channel('public:friends')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'friends' },
            (payload) => {
                console.log('Cambio Realtime detectado en tabla friends:', payload);
                const user = supabase.auth.user();
                if (user) {
                    loadFriendsList(user.id);
                }
            }
        )
        .subscribe();
}

/**
 * Muestra un modal con el perfil de un amigo y opciones para chatear.
 */
export async function showFriendProfileModal(currentUserId, friendId, friendUsername) {
    try {
        const { data: friendProfile, error } = await supabase
            .from('profiles')
            .select('username, gold, diamonds, country')
            .eq('id', friendId)
            .single();

        if (error) throw error;

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
                        Swal.close();
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

// ====================================================================================
// LÓGICA DE MENSAJES (Exportadas)
// ====================================================================================

/**
 * Carga y actualiza el badge de mensajes no leídos.
 */
export async function loadUnreadMessagesCount(currentUserId) {
    messagesBadge = document.getElementById('messages-badge');
    if (!messagesBadge) {
        console.warn('Elemento #messages-badge no encontrado. No se puede actualizar el conteo de mensajes no leídos.');
        return;
    }
    if (!currentUserId) {
        console.warn('loadUnreadMessagesCount: currentUserId es nulo. No se puede cargar el conteo.');
        messagesBadge.classList.add('hidden');
        return;
    }
    try {
        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('is_read', false);

        if (error) throw error;

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
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver tus mensajes.');
        return;
    }

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
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const conversations = {};
        messages.forEach(msg => {
            const participant1 = msg.sender_id;
            const participant2 = msg.receiver_id;
            const convoKey = [participant1, participant2].sort().join('-');
            
            if (!conversations[convoKey]) {
                conversations[convoKey] = {
                    otherUserId: participant1 === user.id ? participant2 : participant1,
                    otherUsername: participant1 === user.id 
                        ? (msg.receiver?.username || 'Desconocido') 
                        : (msg.sender?.username || 'Desconocido'),
                    messages: []
                };
            }
            conversations[convoKey].messages.push(msg);
        });

        let conversationsHtml = Object.keys(conversations).length > 0
            ? Object.values(conversations).map(convo => `
                <div class="conversation-item" data-other-user-id="${convo.otherUserId}" data-other-username="${convo.otherUsername}">
                    <i class="fas fa-comment"></i> <strong>${convo.otherUsername}</strong>
                    <span class="last-message-preview">${convo.messages[convo.messages.length - 1].message.substring(0, 30)}...</span>
                </div>
            `).join('')
            : '<p>No tienes conversaciones. ¡Envía un mensaje a un amigo!</p>';

        Swal.fire({
            icon: 'info',
            title: 'Tus Mensajes',
            html: `<div class="conversations-list">${conversationsHtml}</div>`,
            confirmButtonText: 'Cerrar',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
            showCancelButton: false,
            didOpen: (popup) => {
                popup.querySelectorAll('.conversation-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const otherUserId = item.dataset.otherUserId;
                        const otherUsername = item.dataset.otherUsername;
                        Swal.close();
                        showChatWindow(user.id, otherUserId, otherUsername);
                    });
                });
            }
        }).then(() => {
            loadUnreadMessagesCount(user.id);
        });

    } catch (error) {
        console.error('Error al cargar mensajes:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar los mensajes: ${error.message}`);
    }
}

/**
 * Muestra una ventana de chat para una conversación específica.
 */
export async function showChatWindow(currentUserId, otherUserId, otherUsername) {
    const renderChatMessages = async (msgs) => { 
        const chatDisplay = Swal.getPopup()?.querySelector('.chat-messages-display');
        if (!chatDisplay) return;

        chatDisplay.innerHTML = msgs.map(msg => `
            <div class="chat-message ${msg.sender_id === currentUserId ? 'sent' : 'received'}">
                <span class="message-sender">${msg.sender_id === currentUserId ? 'Tú' : (msg.sender?.username || 'Desconocido')}:</span>
                <span class="message-text">${msg.message}</span>
                <span class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</span>
            </div>
        `).join('');
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

        // Marcar mensajes como leídos
        const unreadMessagesToMark = msgs.filter(msg => 
            msg.receiver_id === currentUserId && msg.is_read === false
        );

        if (unreadMessagesToMark.length > 0) {
            const messageIdsToMark = unreadMessagesToMark.map(msg => msg.id);
            const { error: readError } = await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .in('id', messageIdsToMark);

            if (!readError) {
                loadUnreadMessagesCount(currentUserId);
            }
        }
    };

    try {
        const { data: initialMessages, error } = await supabase
            .from('chat_messages')
            .select(`
                id,
                message,
                created_at,
                sender_id,
                receiver_id,
                is_read,
                sender:profiles!chat_messages_sender_id_fkey(username),
                receiver:profiles!chat_messages_receiver_id_fkey(username)
            `)
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (chatSubscription) {
            chatSubscription.unsubscribe();
            console.log('Suscripción de chat anterior cancelada.');
        }

        chatSubscription = supabase
            .channel(`chat_messages_channel_${currentUserId}_${otherUserId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'chat_messages' },
                async (payload) => {
                    const isRelevant = 
                        (payload.new.sender_id === currentUserId && payload.new.receiver_id === otherUserId) ||
                        (payload.new.sender_id === otherUserId && payload.new.receiver_id === currentUserId);

                    if (!isRelevant) return;

                    const { data: updatedMessages, error: fetchError } = await supabase
                        .from('chat_messages')
                        .select(`
                            id,
                            message,
                            created_at,
                            sender_id,
                            receiver_id,
                            is_read,
                            sender:profiles!chat_messages_sender_id_fkey(username),
                            receiver:profiles!chat_messages_receiver_id_fkey(username)
                        `)
                        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
                        .order('created_at', { ascending: true });

                    if (!fetchError) {
                        await renderChatMessages(updatedMessages);
                    }
                }
            )
            .subscribe();

        Swal.fire({
            title: `Chat con <strong>${otherUsername}</strong>`,
            html: `
                <div class="chat-window">
                    <div class="chat-messages-display"></div>
                    <textarea id="chat-input" class="swal2-input chat-input" placeholder="Escribe tu mensaje..."></textarea>
                    <button id="send-chat-message-btn" class="swal-custom-btn swal-btn-message mt-2"><i class="fas fa-paper-plane"></i> Enviar</button>
                </div>
            `,
            showCancelButton: true,
            cancelButtonText: 'Regresar a Mensajes',
            showConfirmButton: false,
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                cancelButton: 'swal2-profile-cancel-button'
            },
            buttonsStyling: false,
            didOpen: async (popup) => {
                await renderChatMessages(initialMessages);
                const messageInput = popup.querySelector('#chat-input');
                const sendButton = popup.querySelector('#send-chat-message-btn');

                if (messageInput) {
                    messageInput.focus();
                    messageInput.addEventListener('keydown', async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const messageText = messageInput.value.trim();
                            if (messageText) {
                                await handleSendMessage(currentUserId, otherUserId, messageText);
                                messageInput.value = '';
                            }
                        }
                    });
                }

                if (sendButton) {
                    sendButton.addEventListener('click', async () => {
                        const messageText = messageInput.value.trim();
                        if (messageText) {
                            await handleSendMessage(currentUserId, otherUserId, messageText);
                            messageInput.value = '';
                        }
                    });
                }
            }
        }).then((result) => {
            if (chatSubscription) {
                chatSubscription.unsubscribe();
                chatSubscription = null;
            }

            if (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.backdrop) {
                showMessagesModal();
            }
        });

    } catch (error) {
        console.error('Error al cargar la ventana de chat:', error.message);
        showCustomSwal('error', 'Error', `No se pudo cargar la conversación: ${error.message}`);
    }
}

/**
 * Envía un mensaje y lo guarda en la base de datos.
 */
export async function handleSendMessage(senderId, receiverId, messageText) {
    try {
        // Mensaje optimista
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            sender_id: senderId,
            receiver_id: receiverId,
            message: messageText,
            created_at: new Date().toISOString(),
            is_read: false,
            sender: { username: 'Tú' }
        };

        const chatDisplay = Swal.getPopup()?.querySelector('.chat-messages-display');
        if (chatDisplay) {
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message sent';
            messageElement.innerHTML = `
                <span class="message-sender">Tú:</span>
                <span class="message-text">${messageText}</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            `;
            chatDisplay.appendChild(messageElement);
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }

        const { error: insertError } = await supabase
            .from('chat_messages')
            .insert([{ 
                sender_id: senderId, 
                receiver_id: receiverId, 
                message: messageText, 
                is_read: false 
            }]);

        if (insertError) throw insertError;

    } catch (error) {
        console.error('Error al enviar mensaje:', error.message);
        const toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        
        toast.fire({
            icon: 'error',
            title: 'Error al enviar mensaje'
        });
    }
}

// ====================================================================================
// INICIALIZACIÓN DE socialLogic.js AL CARGAR EL DOM
// ====================================================================================
document.addEventListener('DOMContentLoaded', () => {
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    messagesBadge = document.getElementById('messages-badge');
    friendsListContainer = document.getElementById('friends-list-container');
    friendRequestsBtn = document.getElementById('friend-requests-btn');
    messagesBtn = document.getElementById('messages-btn');

    if (friendRequestsBtn) {
        friendRequestsBtn.addEventListener('click', showFriendRequestsModal);
    }
    if (messagesBtn) {
        messagesBtn.addEventListener('click', showMessagesModal);
    }
});