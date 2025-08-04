// script.js - Lógica principal de la aplicación

// Importaciones necesarias
import { supabase } from './supabaseConfig.js'; // Asegúrate de que la ruta sea correcta
import { loadPendingFriendRequestsCount, loadUnreadMessagesCount, setupFriendsRealtimeSubscription } from './socialLogic.js';
import { loadChestData } from './chestLogic.js'; // Asumiendo que ya tienes este módulo

// Referencias a elementos del DOM
let usernameDisplay;
let goldDisplay;
let diamondsDisplay;
let countryDisplay;
let logoutBtn;
let friendRequestsBtn;
let messagesBtn;
let searchUserBtn;
let searchUserInput;
let userProfileSection;
let avatarImg; // Nueva referencia para la imagen del avatar
let avatarUploadInput; // Nueva referencia para el input de archivo
let changeAvatarBtn; // Nueva referencia para el botón de cambiar avatar

// ====================================================================================
// FUNCIONES DE UTILIDAD GLOBALES
// ====================================================================================

/**
 * Helper para mostrar SweetAlert2 con estilos personalizados.
 * @param {string} icon - 'success', 'error', 'info', 'warning', 'question'
 * @param {string} title - Título del modal.
 * @param {string} text - Contenido del modal.
 * @param {string} [confirmButtonText='Entendido'] - Texto del botón de confirmación.
 * @returns {Promise<any>} Una promesa que resuelve cuando el modal se cierra.
 */
function showCustomSwal(icon, title, text, confirmButtonText = 'Entendido') {
    if (typeof Swal === 'undefined') {
        console.error('SweetAlert2 (Swal) no está definido. Asegúrate de que SweetAlert2 se cargue antes de script.js.');
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
 * Obtiene el emoji de la bandera de un país.
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
// LÓGICA DE AUTENTICACIÓN Y PERFIL DE USUARIO
// ====================================================================================

/**
 * Carga y muestra los datos del perfil del usuario actual.
 * @param {object} user - El objeto de usuario de Supabase.
 */
export async function loadUserProfile(user) {
    if (!user) {
        console.warn('loadUserProfile: Usuario no proporcionado.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, gold, diamonds, country, avatar_url') // Asegúrate de seleccionar avatar_url
            .eq('id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Código para "No rows found"
                console.warn('Perfil no encontrado para el usuario. Creando un nuevo perfil...');
                await createProfileForUser(user);
                // Intenta cargar de nuevo después de crear
                await loadUserProfile(user);
                return;
            }
            throw error;
        }

        usernameDisplay.textContent = data.username || 'N/A';
        goldDisplay.textContent = data.gold || 0;
        diamondsDisplay.textContent = data.diamonds || 0;
        countryDisplay.textContent = `${getCountryFlagEmoji(data.country)} ${data.country || 'N/A'}`;
        
        // --- NUEVA LÓGICA: Mostrar el avatar ---
        if (avatarImg) {
            avatarImg.src = data.avatar_url || 'https://placehold.co/150x150/cccccc/000000?text=Avatar';
        }

    } catch (error) {
        console.error('Error al cargar el perfil del usuario:', error.message);
        showCustomSwal('error', 'Error de Perfil', `No se pudo cargar tu perfil: ${error.message}`);
    }
}

/**
 * Crea un perfil básico para un nuevo usuario.
 * @param {object} user - El objeto de usuario de Supabase.
 */
async function createProfileForUser(user) {
    try {
        // Generar un nombre de usuario predeterminado simple
        const defaultUsername = `usuario_${user.id.substring(0, 8)}`;
        const { error } = await supabase
            .from('profiles')
            .insert([
                { id: user.id, username: defaultUsername, gold: 0, diamonds: 0, country: 'N/A', avatar_url: 'https://placehold.co/150x150/cccccc/000000?text=Avatar' }
            ]);

        if (error) {
            throw error;
        }
        console.log('Perfil creado con éxito para el usuario:', user.id);
    } catch (error) {
        console.error('Error al crear el perfil para el usuario:', error.message);
        showCustomSwal('error', 'Error de Creación de Perfil', `No se pudo crear tu perfil inicial: ${error.message}`);
    }
}

/**
 * Maneja el cierre de sesión del usuario.
 */
async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        window.location.href = '/index.html'; // Redirigir a la página de inicio de sesión
    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
        showCustomSwal('error', 'Error', `No se pudo cerrar la sesión: ${error.message}`);
    }
}

// ====================================================================================
// LÓGICA DE SUBIDA DE AVATAR
// ====================================================================================

/**
 * Maneja la subida de un archivo de avatar a Supabase Storage.
 * @param {Event} event - El evento de cambio del input de archivo.
 */
async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para subir un avatar.');
        return;
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showCustomSwal('error', 'Error de Archivo', 'Solo se permiten imágenes JPG, PNG o WebP.');
        return;
    }

    // Validar tamaño de archivo (ej: 2MB)
    const maxSize = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSize) {
        showCustomSwal('error', 'Error de Archivo', 'El tamaño máximo del archivo es 2MB.');
        return;
    }

    Swal.fire({
        title: 'Subiendo Avatar...',
        text: 'Por favor, espera.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Generar una ruta única para el avatar en el bucket 'avatars'
        // Formato: avatars/{user_id}/{timestamp}_{original_filename}
        const filePath = `avatars/${user.id}/${Date.now()}_${file.name}`;

        const { data, error: uploadError } = await supabase.storage
            .from('avatars') // Asegúrate de que este bucket exista en Supabase Storage
            .upload(filePath, file, {
                cacheControl: '3600', // Cache por 1 hora
                upsert: true // Sobrescribe si ya existe un archivo con el mismo nombre
            });

        if (uploadError) {
            throw uploadError;
        }

        // Obtener la URL pública del avatar subido
        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            throw new Error('No se pudo obtener la URL pública del avatar.');
        }

        const newAvatarUrl = publicUrlData.publicUrl;

        // Actualizar la URL del avatar en la tabla 'profiles'
        await updateProfileAvatarUrl(user.id, newAvatarUrl);

        // Actualizar la imagen en el DOM
        if (avatarImg) {
            avatarImg.src = newAvatarUrl;
        }

        Swal.close();
        showCustomSwal('success', '¡Éxito!', 'Tu avatar ha sido actualizado.');

    } catch (error) {
        Swal.close();
        console.error('Error al subir o actualizar el avatar:', error.message);
        showCustomSwal('error', 'Error de Avatar', `No se pudo actualizar tu avatar: ${error.message}`);
    } finally {
        // Limpiar el input de archivo para permitir la subida del mismo archivo si se desea
        if (avatarUploadInput) {
            avatarUploadInput.value = '';
        }
    }
}

/**
 * Actualiza el campo 'avatar_url' en la tabla 'profiles' para un usuario dado.
 * @param {string} userId - El ID del usuario.
 * @param {string} newAvatarUrl - La nueva URL del avatar.
 */
async function updateProfileAvatarUrl(userId, newAvatarUrl) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', userId);

        if (error) {
            throw error;
        }
        console.log('URL del avatar actualizada en el perfil.');
    } catch (error) {
        console.error('Error al actualizar avatar_url en la tabla profiles:', error.message);
        throw error; // Relanzar para que handleAvatarUpload lo capture
    }
}


// ====================================================================================
// LÓGICA DE BÚSQUEDA DE USUARIOS (Existente)
// ====================================================================================

/**
 * Muestra un modal para buscar usuarios.
 */
async function showSearchUserModal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para buscar usuarios.');
        return;
    }

    Swal.fire({
        title: 'Buscar Usuario',
        html: `
            <input type="text" id="swal-search-input" class="swal2-input" placeholder="Nombre de usuario...">
            <div id="swal-search-results" class="text-left mt-4 max-h-60 overflow-y-auto"></div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Buscar',
        cancelButtonText: 'Cerrar',
        customClass: {
            popup: 'swal2-profile-popup',
            title: 'swal2-profile-title',
            htmlContainer: 'swal2-profile-html',
            confirmButton: 'swal2-profile-confirm-button',
            cancelButton: 'swal2-profile-cancel-button'
        },
        buttonsStyling: false,
        didOpen: (popup) => {
            const searchInput = popup.querySelector('#swal-search-input');
            const searchResultsDiv = popup.querySelector('#swal-search-results');

            // Listener para el botón "Buscar" del modal
            const searchButton = Swal.getConfirmButton();
            if (searchButton) {
                searchButton.addEventListener('click', async () => {
                    const query = searchInput.value.trim();
                    if (query.length > 0) {
                        await performUserSearch(query, user.id, searchResultsDiv);
                    } else {
                        searchResultsDiv.innerHTML = '<p class="text-red-500">Por favor, introduce un nombre de usuario.</p>';
                    }
                });
            }

            // Listener para la tecla Enter en el input de búsqueda
            searchInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevenir el envío del formulario si existe
                    const query = searchInput.value.trim();
                    if (query.length > 0) {
                        await performUserSearch(query, user.id, searchResultsDiv);
                    } else {
                        searchResultsDiv.innerHTML = '<p class="text-red-500">Por favor, introduce un nombre de usuario.</p>';
                    }
                }
            });
        }
    });
}

/**
 * Realiza la búsqueda de usuarios y muestra los resultados.
 * @param {string} query - El término de búsqueda.
 * @param {string} currentUserId - El ID del usuario actual.
 * @param {HTMLElement} resultsDiv - El div donde se mostrarán los resultados.
 */
async function performUserSearch(query, currentUserId, resultsDiv) {
    resultsDiv.innerHTML = '<p class="text-gray-500">Buscando...</p>';
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, username, country')
            .ilike('username', `%${query}%`) // Búsqueda insensible a mayúsculas/minúsculas
            .neq('id', currentUserId); // No mostrar al propio usuario en los resultados

        if (error) {
            throw error;
        }

        if (profiles.length === 0) {
            resultsDiv.innerHTML = '<p class="text-gray-500">No se encontraron usuarios.</p>';
            return;
        }

        let resultsHtml = '<ul class="list-disc pl-5">';
        for (const profile of profiles) {
            // Verificar si ya son amigos
            const { data: friendCheck, error: friendCheckError } = await supabase
                .from('friends')
                .select('id')
                .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUserId})`);

            if (friendCheckError) {
                console.error('Error al verificar amistad:', friendCheckError.message);
                continue; // Saltar a la siguiente iteración si hay un error
            }

            const isFriend = friendCheck && friendCheck.length > 0;

            // Verificar si ya hay una solicitud pendiente enviada por el usuario actual
            const { data: sentRequestCheck, error: sentRequestError } = await supabase
                .from('friend_requests')
                .select('id')
                .eq('sender_id', currentUserId)
                .eq('receiver_id', profile.id)
                .eq('status', 'pending');

            if (sentRequestError) {
                console.error('Error al verificar solicitud enviada:', sentRequestError.message);
                continue;
            }
            const hasSentRequest = sentRequestCheck && sentRequestCheck.length > 0;

            // Verificar si ya hay una solicitud pendiente recibida por el usuario actual
            const { data: receivedRequestCheck, error: receivedRequestError } = await supabase
                .from('friend_requests')
                .select('id')
                .eq('sender_id', profile.id)
                .eq('receiver_id', currentUserId)
                .eq('status', 'pending');

            if (receivedRequestError) {
                console.error('Error al verificar solicitud recibida:', receivedRequestError.message);
                continue;
            }
            const hasReceivedRequest = receivedRequestCheck && receivedRequestCheck.length > 0;


            let actionButton = '';
            if (isFriend) {
                actionButton = '<span class="text-green-500 ml-2"><i class="fas fa-check"></i> Amigos</span>';
            } else if (hasSentRequest) {
                actionButton = '<span class="text-yellow-500 ml-2"><i class="fas fa-hourglass-half"></i> Solicitud Enviada</span>';
            } else if (hasReceivedRequest) {
                actionButton = `
                    <button class="accept-request-btn ml-2 px-3 py-1 bg-green-500 text-white rounded-md text-sm" data-request-sender-id="${profile.id}" data-request-sender-username="${profile.username}">
                        Aceptar Solicitud
                    </button>
                `;
            }
            else {
                actionButton = `
                    <button class="add-friend-btn ml-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm" data-user-id="${profile.id}" data-username="${profile.username}">
                        <i class="fas fa-user-plus"></i> Añadir Amigo
                    </button>
                `;
            }

            resultsHtml += `
                <li class="mb-2 flex items-center justify-between">
                    <span>${profile.username} ${getCountryFlagEmoji(profile.country)}</span>
                    ${actionButton}
                </li>
            `;
        }
        resultsHtml += '</ul>';
        resultsDiv.innerHTML = resultsHtml;

        // Añadir event listeners a los botones "Añadir Amigo" y "Aceptar Solicitud"
        resultsDiv.querySelectorAll('.add-friend-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const targetUserId = event.target.dataset.userId;
                const targetUsername = event.target.dataset.username;
                await sendFriendRequest(currentUserId, targetUserId, targetUsername);
                // Volver a buscar para actualizar el estado del botón
                await performUserSearch(query, currentUserId, resultsDiv);
            });
        });

        resultsDiv.querySelectorAll('.accept-request-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const senderId = event.target.dataset.requestSenderId;
                const senderUsername = event.target.dataset.requestSenderUsername;

                // Primero, encuentra el ID de la solicitud pendiente
                const { data: requestData, error: requestError } = await supabase
                    .from('friend_requests')
                    .select('id')
                    .eq('sender_id', senderId)
                    .eq('receiver_id', currentUserId)
                    .eq('status', 'pending')
                    .single();

                if (requestError) {
                    console.error('Error al encontrar la solicitud para aceptar:', requestError.message);
                    showCustomSwal('error', 'Error', 'No se pudo encontrar la solicitud de amistad.');
                    return;
                }

                if (requestData) {
                    // Llama a la función de socialLogic para aceptar la solicitud
                    // Importa handleAcceptFriendRequest de socialLogic.js
                    const { handleAcceptFriendRequest } = await import('./socialLogic.js');
                    await handleAcceptFriendRequest(requestData.id, senderId, senderUsername, currentUserId);
                    // Volver a buscar para actualizar el estado del botón
                    await performUserSearch(query, currentUserId, resultsDiv);
                    // Recargar el badge de solicitudes de amistad
                    loadPendingFriendRequestsCount(currentUserId);
                }
            });
        });


    } catch (error) {
        console.error('Error al buscar usuarios:', error.message);
        resultsDiv.innerHTML = `<p class="text-red-500">Error al buscar: ${error.message}</p>`;
    }
}

/**
 * Envía una solicitud de amistad.
 * @param {string} senderId - ID del usuario que envía la solicitud.
 * @param {string} receiverId - ID del usuario que recibe la solicitud.
 * @param {string} receiverUsername - Nombre de usuario del receptor.
 */
async function sendFriendRequest(senderId, receiverId, receiverUsername) {
    try {
        // Verificar si ya existe una solicitud pendiente o si ya son amigos
        const { data: existingRequests, error: checkError } = await supabase
            .from('friend_requests')
            .select('id, status')
            .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`); // Bidireccional

        if (checkError) {
            throw checkError;
        }

        if (existingRequests && existingRequests.length > 0) {
            const pending = existingRequests.some(req => req.status === 'pending');
            const accepted = existingRequests.some(req => req.status === 'accepted');

            if (pending) {
                showCustomSwal('info', 'Solicitud Pendiente', `Ya tienes una solicitud de amistad pendiente con <strong>${receiverUsername}</strong>.`);
                return;
            }
            if (accepted) {
                showCustomSwal('info', 'Ya Son Amigos', `Ya eres amigo de <strong>${receiverUsername}</strong>.`);
                return;
            }
        }

        // Si no hay solicitudes pendientes ni amistad, enviar la nueva solicitud
        const { error: insertError } = await supabase
            .from('friend_requests')
            .insert([
                { sender_id: senderId, receiver_id: receiverId, status: 'pending' }
            ]);

        if (insertError) {
            throw insertError;
        }

        showCustomSwal('success', 'Solicitud Enviada', `¡Solicitud de amistad enviada a <strong>${receiverUsername}</strong>!`);
        // Recargar el badge de solicitudes del receptor (si es el caso)
        loadPendingFriendRequestsCount(receiverId); // Esto es para el receptor, no para el sender
    } catch (error) {
        console.error('Error al enviar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo enviar la solicitud de amistad: ${error.message}`);
    }
}

// ====================================================================================
// LÓGICA DE RANKING (Existente)
// ====================================================================================

/**
 * Carga y muestra el ranking de jugadores.
 */
async function loadLeaderboard() {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('username, gold, diamonds, country')
            .order('gold', { ascending: false }) // Ordenar por oro de mayor a menor
            .limit(10); // Limitar a los 10 mejores

        if (error) {
            throw error;
        }

        let leaderboardHtml = `
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Jugador</th>
                        <th>Oro</th>
                        <th>Diamantes</th>
                        <th>País</th>
                    </tr>
                </thead>
                <tbody>
        `;
        profiles.forEach((profile, index) => {
            leaderboardHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${profile.username || 'Desconocido'}</td>
                    <td>${profile.gold || 0} <i class="fas fa-coins currency-icon gold-icon"></i></td>
                    <td>${profile.diamonds || 0} <i class="fas fa-gem currency-icon diamond-icon"></i></td>
                    <td>${getCountryFlagEmoji(profile.country)} ${profile.country || 'N/A'}</td>
                </tr>
            `;
        });
        leaderboardHtml += `
                </tbody>
            </table>
        `;

        showCustomSwal('info', 'Ranking de Jugadores', leaderboardHtml, 'Cerrar');

    } catch (error) {
        console.error('Error al cargar el ranking:', error.message);
        showCustomSwal('error', 'Error', `No se pudo cargar el ranking: ${error.message}`);
    }
}

// ====================================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ====================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Asignar referencias a elementos DOM
    usernameDisplay = document.getElementById('username-display');
    goldDisplay = document.getElementById('gold-display');
    diamondsDisplay = document.getElementById('diamonds-display');
    countryDisplay = document.getElementById('country-display');
    logoutBtn = document.getElementById('logout-btn');
    friendRequestsBtn = document.getElementById('friend-requests-btn');
    messagesBtn = document.getElementById('messages-btn');
    searchUserBtn = document.getElementById('search-user-btn');
    searchUserInput = document.getElementById('search-user-input'); // Este podría no existir si usas el modal de búsqueda
    
    // Nuevas referencias para el avatar
    avatarImg = document.getElementById('avatar-img');
    avatarUploadInput = document.getElementById('avatar-upload-input');
    changeAvatarBtn = document.getElementById('change-avatar-btn');

    // Añadir event listeners
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (friendRequestsBtn) {
        // La función showFriendRequestsModal se importa de socialLogic.js
        const { showFriendRequestsModal } = await import('./socialLogic.js');
        friendRequestsBtn.addEventListener('click', showFriendRequestsModal);
    }
    if (messagesBtn) {
        // La función showMessagesModal se importa de socialLogic.js
        const { showMessagesModal } = await import('./socialLogic.js');
        messagesBtn.addEventListener('click', showMessagesModal);
    }
    if (searchUserBtn) {
        searchUserBtn.addEventListener('click', showSearchUserModal);
    }
    if (document.getElementById('leaderboard-btn')) {
        document.getElementById('leaderboard-btn').addEventListener('click', loadLeaderboard);
    }
    if (document.getElementById('chest-btn')) {
        // La función loadChestData se importa de chestLogic.js
        // Asegúrate de que chestLogic.js exporte loadChestData
        document.getElementById('chest-btn').addEventListener('click', async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                loadChestData(user.id);
            } else {
                showCustomSwal('warning', 'Error', 'Debes iniciar sesión para abrir el cofre.');
            }
        });
    }

    // Event listeners para el avatar
    if (changeAvatarBtn && avatarUploadInput) {
        changeAvatarBtn.addEventListener('click', () => {
            avatarUploadInput.click(); // Simula un clic en el input de archivo oculto
        });
        avatarUploadInput.addEventListener('change', handleAvatarUpload);
    }

    // Cargar perfil del usuario y datos iniciales al inicio
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await loadUserProfile(user); // Cargar el perfil del usuario
        await loadPendingFriendRequestsCount(user.id); // Cargar conteo de solicitudes
        await loadUnreadMessagesCount(user.id); // Cargar conteo de mensajes no leídos
        setupFriendsRealtimeSubscription(); // Configurar suscripción a amigos en tiempo real
        loadChestData(user.id); // Cargar datos del cofre
    } else {
        // Si no hay usuario, redirigir a la página de inicio de sesión
        window.location.href = '/index.html';
    }
});
