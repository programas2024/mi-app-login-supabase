// socialLogic.js - Lógica para las funcionalidades sociales (amigos, solicitudes, mensajes)

// Importaciones necesarias para este módulo: Supabase
import { supabase } from '/supabaseConfig.js';
import { showAffinityModal } from './afinidadLogic.js';

// Referencias a elementos del DOM
let friendRequestsBadge;
let messagesBadge;
let friendsListContainer;
let friendRequestsBtn;
let messagesBtn;

// Variables para suscripciones Realtime
let friendsChannel = null;
let chatSubscription = null;

// ====================================================================================
// FUNCIONES DE UTILIDAD
// ====================================================================================

function showCustomSwal(icon, title, text, confirmButtonText = 'Entendido') {
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 no está disponible');
        alert(`${title}: ${text}`);
        return Promise.resolve({ isConfirmed: true });
    }
    return Swal.fire({
        icon: icon,
        title: title,
        html: text,
        confirmButtonText: confirmButtonText,
        customClass: {
            popup: 'swal2-profile-popup',
            title: 'swal2-profile-title',
            htmlContainer: 'swal2-profile-html',
            confirmButton: 'swal2-profile-confirm-button'
        },
        buttonsStyling: false,
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
    };
    return flags[countryName] || '';
}

function getAffinityRank(points) {
    if (points >= 500) {
        return { rank: 'Confidentes', icon: '<i class="fas fa-handshake text-purple-500"></i>' };
    } else if (points >= 100) {
        return { rank: 'Amigos', icon: '<i class="fas fa-heart text-red-500"></i>' };
    } else {
        return { rank: 'Conocidos', icon: '<i class="fas fa-user-group text-gray-500"></i>' };
    }
}

// ====================================================================================
// LÓGICA DE AMIGOS Y SOLICITUDES
// ====================================================================================

export async function loadPendingFriendRequestsCount(currentUserId) {
    if (!currentUserId) return;
    
    try {
        const { count, error } = await supabase
            .from('friend_requests')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('status', 'pending');

        if (error) throw error;

        if (friendRequestsBadge) {
            if (count > 0) {
                friendRequestsBadge.textContent = count;
                friendRequestsBadge.classList.remove('hidden');
            } else {
                friendRequestsBadge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading friend requests count:', error);
    }
}

export async function showFriendRequestsModal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver las solicitudes');
        return;
    }

    try {
        const { data: requests, error } = await supabase
            .from('friend_requests')
            .select('id, sender_id, sender_profile:profiles!friend_requests_sender_id_fkey(username)')
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) throw error;

        const requestsHtml = requests.length > 0 
            ? requests.map(req => `
                <div class="friend-request-item">
                    <p><i class="fas fa-user-plus"></i> <strong>${req.sender_profile?.username || 'Usuario'}</strong> te ha enviado una solicitud.</p>
                    <div class="request-actions">
                        <button class="accept-btn" data-request-id="${req.id}" data-sender-id="${req.sender_id}">
                            <i class="fas fa-check"></i> Aceptar
                        </button>
                        <button class="reject-btn" data-request-id="${req.id}">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                </div>
            `).join('')
            : '<p>No tienes solicitudes pendientes</p>';

        Swal.fire({
            icon: 'info',
            title: 'Solicitudes de Amistad',
            html: `<div class="friend-requests-list">${requestsHtml}</div>`,
            confirmButtonText: 'Cerrar',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
            didOpen: (popup) => {
                popup.querySelectorAll('.accept-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await handleAcceptFriendRequest(
                            btn.dataset.requestId,
                            btn.dataset.senderId,
                            user.id
                        );
                        Swal.close();
                    });
                });
                popup.querySelectorAll('.reject-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await handleRejectFriendRequest(
                            btn.dataset.requestId,
                            user.id
                        );
                        Swal.close();
                    });
                });
            }
        });
    } catch (error) {
        console.error('Error loading friend requests:', error);
        showCustomSwal('error', 'Error', 'No se pudieron cargar las solicitudes');
    }
}

export async function handleAcceptFriendRequest(requestId, senderId, receiverId) {
    try {
        // 1. Actualizar solicitud
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId);

        if (updateError) throw updateError;

        // 2. Crear relación de amistad
        const [id1, id2] = [senderId, receiverId].sort();
        const { error: insertError } = await supabase
            .from('friends')
            .insert([{ user1_id: id1, user2_id: id2 }]);

        if (insertError && insertError.code !== '23505') throw insertError;

        // 3. Notificar al remitente
        const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', receiverId)
            .single();

        await supabase
            .from('chat_messages')
            .insert([{
                sender_id: receiverId,
                receiver_id: senderId,
                message: `¡${receiverProfile?.username || 'Alguien'} ha aceptado tu solicitud de amistad!`,
                is_read: false
            }]);

        showCustomSwal('success', '¡Solicitud aceptada!', 'Ahora son amigos');
        loadPendingFriendRequestsCount(receiverId);
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showCustomSwal('error', 'Error', 'No se pudo aceptar la solicitud');
    }
}

export async function handleRejectFriendRequest(requestId, receiverId) {
    try {
        const { error } = await supabase
            .from('friend_requests')
            .delete()
            .eq('id', requestId);

        if (error) throw error;

        showCustomSwal('info', 'Solicitud rechazada', 'La solicitud ha sido eliminada');
        loadPendingFriendRequestsCount(receiverId);
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showCustomSwal('error', 'Error', 'No se pudo rechazar la solicitud');
    }
}

export async function loadFriendsList(currentUserId) {
    if (!friendsListContainer) {
        friendsListContainer = document.getElementById('friends-list-container');
        if (!friendsListContainer) return;
    }

    friendsListContainer.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const { data: friendsData, error } = await supabase
            .from('friends')
            .select(`
                user1_id,
                user2_id,
                user1_profile:profiles!friends_user1_id_fkey(id, username, gold, diamonds, country),
                user2_profile:profiles!friends_user2_id_fkey(id, username, gold, diamonds, country)
            `)
            .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

        if (error) throw error;

        const friends = await Promise.all(
            friendsData.map(async friendship => {
                const isUser1 = friendship.user1_id === currentUserId;
                const friendId = isUser1 ? friendship.user2_id : friendship.user1_id;
                const friendProfile = isUser1 ? friendship.user2_profile : friendship.user1_profile;

                if (!friendProfile) return null;

                const affinityPoints = await getFriendAffinity(currentUserId, friendId);
                const { rank, icon } = getAffinityRank(affinityPoints);

                return {
                    id: friendId,
                    ...friendProfile,
                    affinityPoints,
                    affinityRank: rank,
                    affinityIcon: icon
                };
            })
        );

        const validFriends = friends.filter(f => f !== null);

        if (validFriends.length === 0) {
            friendsListContainer.innerHTML = '<p>Aún no tienes amigos</p>';
            return;
        }

        friendsListContainer.innerHTML = `
            <table class="friends-table">
                <thead>
                    <tr>
                        <th>Amigo</th>
                        <th>Oro</th>
                        <th>Diamantes</th>
                        <th>País</th>
                        <th>Afinidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${validFriends.map(friend => `
                        <tr class="friend-row" data-friend-id="${friend.id}" data-friend-username="${friend.username}">
                            <td>${friend.username}</td>
                            <td>${friend.gold || 0} <i class="fas fa-coins"></i></td>
                            <td>${friend.diamonds || 0} <i class="fas fa-gem"></i></td>
                            <td>${getCountryFlagEmoji(friend.country)} ${friend.country || 'N/A'}</td>
                            <td>${friend.affinityIcon} ${friend.affinityRank}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.querySelectorAll('.friend-row').forEach(row => {
            row.addEventListener('click', async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    showFriendProfileModal(
                        user.id, 
                        row.dataset.friendId, 
                        row.dataset.friendUsername
                    );
                }
            });
        });

    } catch (error) {
        console.error('Error loading friends list:', error);
        friendsListContainer.innerHTML = '<p>Error al cargar amigos</p>';
    }
}

export async function showFriendProfileModal(currentUserId, friendId, friendUsername) {
    try {
        const { data: friendProfile, error } = await supabase
            .from('profiles')
            .select('username, gold, diamonds, country, avatar_url')
            .eq('id', friendId)
            .single();

        if (error) throw error;

        Swal.fire({
            icon: 'info',
            title: 'Perfil de Amigo',
            html: `
                <div class="friend-profile-card">
                    <img src="${friendProfile.avatar_url || 'https://placehold.co/150x150'}" 
                         alt="Avatar" class="friend-avatar">
                    <h3>${friendProfile.username}</h3>
                    <p><strong>Oro:</strong> ${friendProfile.gold || 0} <i class="fas fa-coins"></i></p>
                    <p><strong>Diamantes:</strong> ${friendProfile.diamonds || 0} <i class="fas fa-gem"></i></p>
                    <p><strong>País:</strong> ${getCountryFlagEmoji(friendProfile.country)} ${friendProfile.country || 'N/A'}</p>
                    <button id="message-friend-btn" class="swal-custom-btn">
                        <i class="fas fa-comment-dots"></i> Enviar Mensaje
                    </button>
                    <button id="view-affinity-btn" class="swal-custom-btn">
                        <i class="fas fa-heart"></i> Ver Afinidad
                    </button>
                </div>
            `,
            confirmButtonText: 'Cerrar',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
            didOpen: (popup) => {
                popup.querySelector('#message-friend-btn')?.addEventListener('click', () => {
                    Swal.close();
                    showChatWindow(currentUserId, friendId, friendProfile.username);
                });
                popup.querySelector('#view-affinity-btn')?.addEventListener('click', () => {
                    Swal.close();
                    showAffinityModal(currentUserId, friendId, friendProfile.username);
                });
            }
        });
    } catch (error) {
        console.error('Error showing friend profile:', error);
        showCustomSwal('error', 'Error', 'No se pudo cargar el perfil');
    }
}

export async function setupFriendsRealtimeSubscription(userId) {
    if (friendsChannel) {
        supabase.removeChannel(friendsChannel);
    }

    friendsChannel = supabase
        .channel('friends-updates')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'friends',
                filter: `or(user1_id.eq.${userId},user2_id.eq.${userId})`
            },
            () => {
                loadPendingFriendRequestsCount(userId);
                loadFriendsList(userId);
            }
        )
        .subscribe();

    return () => {
        if (friendsChannel) {
            supabase.removeChannel(friendsChannel);
            friendsChannel = null;
        }
    };
}

// ====================================================================================
// LÓGICA DE MENSAJES
// ====================================================================================

export async function loadUnreadMessagesCount(currentUserId) {
    if (!currentUserId) return;
    
    try {
        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('is_read', false);

        if (error) throw error;

        if (messagesBadge) {
            if (count > 0) {
                messagesBadge.textContent = count;
                messagesBadge.classList.remove('hidden');
            } else {
                messagesBadge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Error loading unread messages:', error);
    }
}

export async function showMessagesModal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver mensajes');
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
            const convoKey = [msg.sender_id, msg.receiver_id].sort().join('-');
            if (!conversations[convoKey]) {
                const isSender = msg.sender_id === user.id;
                conversations[convoKey] = {
                    otherUserId: isSender ? msg.receiver_id : msg.sender_id,
                    otherUsername: isSender 
                        ? (msg.receiver?.username || 'Usuario') 
                        : (msg.sender?.username || 'Usuario'),
                    messages: []
                };
            }
            conversations[convoKey].messages.push(msg);
        });

        const conversationsHtml = Object.keys(conversations).length > 0
            ? Object.values(conversations).map(convo => `
                <div class="conversation-item" 
                     data-other-user-id="${convo.otherUserId}" 
                     data-other-username="${convo.otherUsername}">
                    <i class="fas fa-comment"></i> <strong>${convo.otherUsername}</strong>
                    <span class="last-message-preview">
                        ${convo.messages[convo.messages.length - 1].message.substring(0, 30)}...
                    </span>
                </div>
            `).join('')
            : '<p>No tienes conversaciones</p>';

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
            didOpen: (popup) => {
                popup.querySelectorAll('.conversation-item').forEach(item => {
                    item.addEventListener('click', () => {
                        Swal.close();
                        showChatWindow(
                            user.id,
                            item.dataset.otherUserId,
                            item.dataset.otherUsername
                        );
                    });
                });
            }
        });
    } catch (error) {
        console.error('Error loading messages:', error);
        showCustomSwal('error', 'Error', 'No se pudieron cargar los mensajes');
    }
}

export async function showChatWindow(currentUserId, otherUserId, otherUsername) {
    const renderMessages = async (messages) => {
        const chatDisplay = Swal.getPopup()?.querySelector('.chat-messages-display');
        if (!chatDisplay) return;

        chatDisplay.innerHTML = messages.map(msg => `
            <div class="chat-message ${msg.sender_id === currentUserId ? 'sent' : 'received'}">
                <span class="message-sender">
                    ${msg.sender_id === currentUserId ? 'Tú' : (msg.sender?.username || 'Usuario')}:
                </span>
                <span class="message-text">${msg.message}</span>
                <span class="message-time">
                    ${new Date(msg.created_at).toLocaleTimeString()}
                </span>
            </div>
        `).join('');
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

        // Marcar mensajes como leídos
        const unreadIds = messages
            .filter(msg => msg.receiver_id === currentUserId && !msg.is_read)
            .map(msg => msg.id);

        if (unreadIds.length > 0) {
            await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .in('id', unreadIds);
            loadUnreadMessagesCount(currentUserId);
        }
    };

    try {
        // Obtener mensajes iniciales
        const { data: initialMessages, error } = await supabase
            .from('chat_messages')
            .select(`
                id,
                message,
                created_at,
                sender_id,
                receiver_id,
                is_read,
                sender:profiles!chat_messages_sender_id_fkey(username)
            `)
            .or(
                `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),` +
                `and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
            )
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Configurar suscripción Realtime
        if (chatSubscription) {
            chatSubscription.unsubscribe();
        }

        chatSubscription = supabase
            .channel(`chat:${currentUserId}:${otherUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `or(and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
                },
                async () => {
                    const { data: updatedMessages } = await supabase
                        .from('chat_messages')
                        .select('*')
                        .or(
                            `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),` +
                            `and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
                        )
                        .order('created_at', { ascending: true });
                    
                    if (updatedMessages) {
                        await renderMessages(updatedMessages);
                    }
                }
            )
            .subscribe();

        // Mostrar ventana de chat
        Swal.fire({
            title: `Chat con <strong>${otherUsername}</strong>`,
            html: `
                <div class="chat-window">
                    <div class="chat-messages-display"></div>
                    <textarea id="chat-input" class="chat-input" placeholder="Escribe tu mensaje..."></textarea>
                    <button id="send-message-btn" class="swal-custom-btn">
                        <i class="fas fa-paper-plane"></i> Enviar
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            customClass: {
                popup: 'swal2-chat-popup',
                htmlContainer: 'swal2-chat-html',
                cancelButton: 'swal2-chat-cancel-button'
            },
            didOpen: async (popup) => {
                await renderMessages(initialMessages);
                
                const input = popup.querySelector('#chat-input');
                const sendBtn = popup.querySelector('#send-message-btn');
                
                const sendMessage = async () => {
                    const message = input.value.trim();
                    if (!message) return;
                    
                    // Actualización optimista
                    const tempMessage = {
                        id: `temp-${Date.now()}`,
                        message,
                        created_at: new Date().toISOString(),
                        sender_id: currentUserId,
                        receiver_id: otherUserId,
                        is_read: false,
                        sender: { username: 'Tú' }
                    };
                    await renderMessages([...initialMessages, tempMessage]);
                    input.value = '';
                    
                    // Enviar a la base de datos
                    await handleSendMessage(currentUserId, otherUserId, message);
                };
                
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });
                
                sendBtn.addEventListener('click', sendMessage);
            },
            willClose: () => {
                if (chatSubscription) {
                    chatSubscription.unsubscribe();
                    chatSubscription = null;
                }
            }
        });
    } catch (error) {
        console.error('Error showing chat:', error);
        showCustomSwal('error', 'Error', 'No se pudo cargar el chat');
    }
}

export async function handleSendMessage(senderId, receiverId, messageText) {
    try {
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                sender_id: senderId,
                receiver_id: receiverId,
                message: messageText,
                is_read: false
            }]);

        if (error) throw error;
    } catch (error) {
        console.error('Error sending message:', error);
        showCustomSwal('error', 'Error', 'No se pudo enviar el mensaje');
    }
}

// ====================================================================================
// INICIALIZACIÓN
// ====================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar referencias a elementos
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    messagesBadge = document.getElementById('messages-badge');
    friendsListContainer = document.getElementById('friends-list-container');
    friendRequestsBtn = document.getElementById('friend-requests-btn');
    messagesBtn = document.getElementById('messages-btn');

    // Configurar event listeners
    if (friendRequestsBtn) {
        friendRequestsBtn.addEventListener('click', showFriendRequestsModal);
    }
    if (messagesBtn) {
        messagesBtn.addEventListener('click', showMessagesModal);
    }

    // Inicializar para usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const cleanupSubscription = await setupFriendsRealtimeSubscription(user.id);
        loadPendingFriendRequestsCount(user.id);
        loadUnreadMessagesCount(user.id);
        loadFriendsList(user.id);

        window.addEventListener('beforeunload', () => {
            cleanupSubscription();
        });
    }
});