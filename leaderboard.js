// leaderboard.js

// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
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

    if (loaderElement) {
        loaderElement.classList.remove('loader-hidden');
        const loaderText = loaderElement.querySelector('p');
        if (loaderText) loaderText.textContent = 'Cargando clasificación global...';
    }

    try {
        // --- 1. Consulta los 100 mejores ---
        const { data: topProfiles, error: topError } = await supabase
            .from('profiles')
            .select('id, username, gold, diamonds, perla')
            .order('gold', { ascending: false })
            .order('diamonds', { ascending: false })
            .order('perla', { ascending: false })
            .limit(100);

        if (topError) throw topError;

        leaderboardTableBody.innerHTML = ''; // Limpia la tabla

        const userIsInTop100 = topProfiles.some(profile => profile.id === currentUserId);
        
        // --- 2. Renderiza los 100 mejores ---
        if (topProfiles && topProfiles.length > 0) {
            topProfiles.forEach((profile, index) => {
                const row = leaderboardTableBody.insertRow();
                const isCurrentUser = currentUserId && profile.id === currentUserId;
                if (isCurrentUser) {
                    row.classList.add('current-user-row');
                }

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="player-name-cell" data-user-id="${profile.id}" data-rank="${index + 1}">${profile.username || 'Desconocido'}</td>
                    <td>${profile.gold || 0} <i class="fas fa-coins"></i></td>
                    <td>${profile.diamonds || 0} <i class="fas fa-gem"></i></td>
                    <td>${profile.perla || 0} <i class="fas fa-certificate pearl-icon"></i></td>
                `;
            });
        }

        // --- 3. Si el usuario no está en el Top 100, añade su fila al final ---
        if (currentUserId && !userIsInTop100) {
            // Consulta la posición exacta y los datos del usuario actual
            const { data: userProfile, error: userError } = await supabase
                .from('profiles')
                .select('id, username, gold, diamonds, perla')
                .eq('id', currentUserId)
                .single();
            
            if (userError) {
                console.error('Error al obtener perfil del usuario actual:', userError.message);
            } else if (userProfile) {
                // Consulta el ranking exacto del usuario
                const { count: userRank, error: rankError } = await supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .or(`gold.gt.${userProfile.gold}, and(gold.eq.${userProfile.gold},diamonds.gt.${userProfile.diamonds}), and(gold.eq.${userProfile.gold},diamonds.eq.${userProfile.diamonds},perla.gt.${userProfile.perla})`);

                if (rankError) {
                    console.error('Error al obtener ranking exacto:', rankError.message);
                    // Si hay un error, mostraremos un ranking aproximado
                    userProfile.rank = 'N/A';
                } else {
                    userProfile.rank = userRank + 1; // El conteo es 0-indexado, así que sumamos 1
                }
                
                const rankText = userProfile.rank === 'N/A' ? 'N/A' : `#${userProfile.rank}`;

                // Agrega una fila separadora
                const separatorRow = leaderboardTableBody.insertRow();
                separatorRow.innerHTML = `<td colspan="5" class="separator-row">...</td>`;
                
                // Agrega la fila del usuario actual con su ranking exacto
                const userRow = leaderboardTableBody.insertRow();
                userRow.classList.add('current-user-row', 'out-of-top-100');
                userRow.innerHTML = `
                    <td>${rankText}</td>
                    <td class="player-name-cell" data-user-id="${userProfile.id}" data-rank="${userProfile.rank}">${userProfile.username || 'Desconocido'}</td>
                    <td>${userProfile.gold || 0} <i class="fas fa-coins"></i></td>
                    <td>${userProfile.diamonds || 0} <i class="fas fa-gem"></i></td>
                    <td>${userProfile.perla || 0} <i class="fas fa-certificate pearl-icon"></i></td>
                `;
            }
        }
        
        // --- 4. Añadir evento click (sin cambios) ---
        document.querySelectorAll('.player-name-cell').forEach(cell => {
            cell.style.cursor = 'pointer';
            cell.style.fontWeight = 'bold';
            if (!cell.parentElement.classList.contains('current-user-row')) {
                cell.style.color = 'var(--primary-color)';
            } else {
                cell.style.color = 'inherit';
            }
            cell.addEventListener('click', async (event) => {
                const targetUserId = event.target.dataset.userId;
                const playerRank = event.target.dataset.rank;
                const { data: { user } } = await supabase.auth.getUser();
                const loggedInUserId = user ? user.id : null;
                if (targetUserId) {
                    await showPlayerDetails(supabase, targetUserId, loggedInUserId, playerRank);
                }
            });
        });

    } catch (error) {
        console.error('Error al cargar la tabla de clasificación global:', error.message);
        const row = leaderboardTableBody.insertRow();
        row.innerHTML = `<td colspan="5">Error al cargar la clasificación: ${error.message}</td>`;
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
 * @param {string} playerRank - La posición del jugador en el ranking.
 */
async function showPlayerDetails(supabase, targetUserId, currentUserId, playerRank) {
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
            .select('username, country, diamonds, gold, perla,vip_points,stars,current_achievement_category,emotion,tiktok,facebook,youtube,likes')
            .eq('id', targetUserId)
            .single();

        if (profileError) {
            throw profileError;
        }

        if (!userProfile) {
            showCustomSwal('error', 'Error', 'No se encontraron los detalles de este jugador.');
            return;
        }
        // Verificar si el usuario actual ya dio like a este perfil
        let userAlreadyLiked = false;
        if (currentUserId !== targetUserId) {
            const { data: likeData, error: likeError } = await supabase
                .from('profile_likes')
                .select('id')
                .eq('profile_id', targetUserId)
                .eq('user_id', currentUserId)
                .maybeSingle();

            if (!likeError && likeData) {
                userAlreadyLiked = true;
            }
        }
        const countryIcon = getCountryFlagEmoji(userProfile.country);

         // Obtener el ícono y texto de la emoción - AQUÍ SE UTILIZA getEmotionInfo
        const emotionInfo = getEmotionInfo(userProfile.emotion);

        // Determinar el estado de amistad (código sin cambios)
        let friendshipStatus = 'unknown';
        if (currentUserId === targetUserId) {
            friendshipStatus = 'self';
        } else if (currentUserId) {
            const { data: friendsData, error: friendsError } = await supabase
                .from('friend_requests')
                .select('status, sender_id, receiver_id')
                .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`);

            if (friendsError) {
                console.error('Error al verificar amistad:', friendsError);
            } else if (friendsData && friendsData.length > 0) {
                const request = friendsData[0];
                if (request.status === 'accepted') {
                    friendshipStatus = 'friends';
                } else if (request.status === 'pending') {
                    if (request.sender_id === currentUserId) {
                        friendshipStatus = 'pending_sent';
                    } else {
                        friendshipStatus = 'pending_received';
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
        } else if (friendshipStatus === 'pending_sent') {
            friendButtonHtml = '<button class="swal2-profile-button" disabled><i class="fas fa-hourglass-half"></i> Solicitud Pendiente</button>';
        } else if (friendshipStatus === 'pending_received') {
            friendButtonHtml = '<button id="accept-friend-btn" class="swal2-profile-button swal2-profile-confirm-button"><i class="fas fa-user-plus"></i> Aceptar Solicitud</button>';
        } else if (friendshipStatus === 'not_friends' && currentUserId) {
            friendButtonHtml = '<button id="add-friend-btn" class="swal2-profile-button swal2-profile-confirm-button"><i class="fas fa-user-plus"></i> Añadir Amigo</button>';
        } else if (!currentUserId) {
            friendButtonHtml = '<button class="swal2-profile-button" disabled><i class="fas fa-user-plus"></i> Inicia sesión para añadir</button>';
        }

        // --- Lógica para determinar el ícono de ranking según la posición ---
        let rankIconHtml;
        const rank = parseInt(playerRank);

        if (!isNaN(rank)) {
            if (rank === 1) {
                rankIconHtml = '<img src="https://cdn-icons-png.flaticon.com/128/3784/3784941.png" alt="Top 1" style="height: 24px; vertical-align: middle; margin-right: 5px;">';
            } else if (rank >= 2 && rank <= 15) {
                rankIconHtml = '<img src="https://cdn-icons-png.flaticon.com/128/15544/15544779.png" alt="Top 2-15" style="height: 24px; vertical-align: middle; margin-right: 5px;">';
            } else if (rank >= 16 && rank <= 50) {
                rankIconHtml = '<img src="https://cdn-icons-png.flaticon.com/128/17267/17267195.png" alt="Top 16-50" style="height: 24px; vertical-align: middle; margin-right: 5px;">';
            } else if (rank >= 51 && rank <= 100) {
                rankIconHtml = '<img src="https://cdn-user-icons.flaticon.com/171937/171937425/1754692625511.svg?token=exp=1754693908~hmac=a27f3e96393d6429c07e97b5ea02850e" alt="Top 51-100" style="height: 24px; vertical-align: middle; margin-right: 5px;">';
            } else {
                rankIconHtml = '<i class="fas fa-medal" style="color: #6c757d;"></i>'; // Medalla por defecto
            }
        } else {
            rankIconHtml = '<i class="fas fa-medal" style="color: #6c757d;"></i>'; // Si no se puede parsear
        }

        // --- Lógica para añadir la poción junto al nombre (tamaño ajustado) ---
        let specialTitleIconHtml = '';
        if (targetUserId === 'd7ec375b-94b2-40fe-a1bb-af92bcc167b5') {
            specialTitleIconHtml = '<img src="https://cdn-icons-png.flaticon.com/128/3410/3410273.png" alt="Poción especial" style="height: 32px; vertical-align: middle; margin-left: 5px;">';
        }
        // ---------------------------------------------------

          // Verificar si el usuario tiene redes sociales
        const hasSocialMedia = userProfile.tiktok || userProfile.facebook || userProfile.youtube;
        
       // Botón de redes sociales (solo visible si tiene al menos una red social)
let socialMediaButtonHtml = '';
if (hasSocialMedia) {
    socialMediaButtonHtml = `
        <button class="social-media-btn" style="position: absolute; top: 5px; right: 15px; background: linear-gradient(to right, #376de2ff, #e94057, #ff9351ff); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 1000;">
            <i class="fas fa-icons"></i>
        </button>
    `;
}

// Botón de like y contador
let likeButtonHtml = '';
const likesCount = userProfile.likes || 0;

if (currentUserId !== targetUserId) {
    // Botón de like + contador (para otros usuarios)
    const likeBtnStyle = userAlreadyLiked 
        ? 'background: linear-gradient(to right, #8b0000, #cc0000);' // Rojo oscuro
        : 'background: linear-gradient(to right, #ff6b6b, #ff4b4b);'; // Rojo normal
        
    const likeIconStyle = userAlreadyLiked 
        ? 'color: #ffffff;' // Blanco para contrastar con fondo oscuro
        : 'color: white;';
        
    likeButtonHtml = `
        <button class="like-btn" style="position: absolute; top: 5px; right: ${hasSocialMedia ? '65px' : '15px'}; ${likeBtnStyle} color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 1000;" ${userAlreadyLiked ? 'disabled' : ''}>
            <i class="fas fa-heart" style="${likeIconStyle}"></i>
        </button>
        <div style="position: absolute; top: 50px; right: ${hasSocialMedia ? '65px' : '15px'}; text-align: center; width: 40px; font-size: 12px; color: #ff6b6b; font-weight: bold;">
            ${likesCount}
        </div>
    `;
} else {
    // Solo contador de likes (para el propio perfil)
    likeButtonHtml = `
        <div style="position: absolute; top: 5px; right: ${hasSocialMedia ? '65px' : '15px'}; text-align: center; width: 40px; font-size: 12px; color: #ff6b6b; font-weight: bold;">
            <i class="fas fa-heart" style="font-size: 20px; margin-bottom: 5px;"></i>
            <div>${likesCount}</div>
        </div>
    `;
}
       // Mostrar los detalles del jugador
Swal.fire({
    title: `<strong>${userProfile.username || 'Jugador Desconocido'}${specialTitleIconHtml}</strong>`,
   html: `
                <div style="position: relative;">
                    ${socialMediaButtonHtml}
                    ${likeButtonHtml}
                    <div style="text-align: left; padding: 10px; font-size: 1.1em; margin-top: ${hasSocialMedia || likeButtonHtml ? '20px' : '0'};">
                        <p style="margin-bottom: 8px;">${rankIconHtml} <strong>Posición:</strong> <span style="font-weight: bold;">#${playerRank}</span></p>
                        <p style="margin-bottom: 8px;"><i class="fas fa-globe-americas" style="color: #6a5acd;"></i> <strong>País:</strong> ${countryIcon} ${userProfile.country || 'No especificado'}</p>
                        <p style="margin-bottom: 8px;"><i class="fas fa-gem" style="color: #00bcd4;"></i> <strong>Diamantes:</strong> <span style="font-weight: bold; color: #00bcd4;">${userProfile.diamonds || 0}</span></p>
                        <p style="margin-bottom: 8px;"><i class="fas fa-coins" style="color: #ffd700;"></i> <strong>Oro:</strong> <span style="font-weight: bold; color: #ffd700;">${userProfile.gold || 0}</span></p>
                        <p style="margin-bottom: 8px;"><i class="fas fa-certificate pearl-icon" style="color: #b0c4de;"></i> <strong>Perlas:</strong> <span style="font-weight: bold; color: #b0c4de;">${userProfile.perla || 0}</span></p>
                        <p style="margin-bottom: 8px;"><i class="fas fa-crown" style="color: #ff65f7ff;"></i> <strong>Puntos VIP:</strong> <span style="font-weight: bold; color: #ffd700;">${userProfile.vip_points || 0}</span></p>
                        <p style="margin-bottom: 8px;"><i class="fas fa-star" style="color: #ffd700;"></i> <strong>Estrellas:</strong> <span style="font-weight: bold; color: #ffd700;">${userProfile.stars || 0}</span></p>
                        <p style="margin-bottom: 20px;">${emotionInfo.icon} <strong>Ánimo:</strong> <span style="font-weight: bold;">${emotionInfo.text}</span></p>
                        
                        <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                            ${friendButtonHtml}
                        </div>
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
            if (result.isConfirmed && friendshipStatus === 'pending_received' && result.value === 'accept_friend') {
                handleAcceptFriendRequest(currentUserId, targetUserId);
            }
        });

        const addFriendBtn = document.getElementById('add-friend-btn');
        if (addFriendBtn) {
            addFriendBtn.addEventListener('click', () => {
                handleAddFriend(currentUserId, targetUserId, userProfile.username);
                Swal.close();
            });
        }

        const acceptFriendBtn = document.getElementById('accept-friend-btn');
        if (acceptFriendBtn) {
            acceptFriendBtn.addEventListener('click', () => {
                handleAcceptFriendRequest(currentUserId, targetUserId, userProfile.username);
                Swal.close();
            });
        }
         // Agregar evento al botón de redes sociales
                if (hasSocialMedia) {
                    const socialMediaBtn = document.querySelector('.social-media-btn');
                    if (socialMediaBtn) {
                        socialMediaBtn.addEventListener('click', () => {
                            showSocialMediaLinks(userProfile);
                        });
                    }
                }

          // Agregar evento al botón de redes sociales
                if (hasSocialMedia) {
                    const socialMediaBtn = document.querySelector('.social-media-btn');
                    if (socialMediaBtn) {
                        socialMediaBtn.addEventListener('click', () => {
                            showSocialMediaLinks(userProfile);
                        });
                    }
                }
                
              
              // Agregar evento al botón de like (versión simplificada)
if (currentUserId !== targetUserId && !userAlreadyLiked) {
    const likeBtn = document.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', async () => {
            try {
                console.log('Intentando dar like (versión simplificada)...');
                
                // Solo actualizar el contador en profiles
                const newLikes = (userProfile.likes || 0) + 1;
                
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ likes: newLikes })
                    .eq('id', targetUserId);
                    
                if (updateError) {
                    console.error('Error al actualizar:', updateError);
                    showCustomSwal('error', 'Error', 'No se pudo dar like: ' + updateError.message);
                    return;
                }
                
                console.log('Like actualizado correctamente');
                
                // Actualizar interfaz
                const likeCountElement = document.querySelector('.like-btn + div');
                if (likeCountElement) {
                    likeCountElement.textContent = newLikes;
                }
                
                likeBtn.innerHTML = '<i class="fas fa-heart" style="color: #ffffff;"></i>';
                likeBtn.style.background = 'linear-gradient(to right, #8b0000, #cc0000)';
                likeBtn.disabled = true;
                
                userProfile.likes = newLikes;
                
                showCustomSwal('success', '¡Like!', 'Has dado like a este jugador.');
                
            } catch (error) {
                console.error('Error:', error);
                showCustomSwal('error', 'Error', 'No se pudo completar la acción.');
            }
        });
    }
}  

    } catch (error) {
        showCustomSwal('error', 'Error', `No se pudo cargar la información: ${error.message}`);
        console.error('Error al cargar detalles del jugador:', error.message);
    }
}


// Función para mostrar los enlaces de redes sociales
function showSocialMediaLinks(userProfile) {
    let socialMediaHtml = '';
    
    if (userProfile.tiktok) {
        socialMediaHtml += `
            <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                <a href="${userProfile.tiktok}" target="_blank" class="social-btn tiktok-btn" style="display: flex; align-items: center; justify-content: center; text-decoration: none; background: linear-gradient(135deg, #69c9d0, #000000); color: white; padding: 12px 25px; border-radius: 30px; font-weight: bold; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(105, 201, 208, 0.4);">
                    <i class="fab fa-tiktok" style="font-size: 24px; margin-right: 10px;"></i>
                    TikTok
                </a>
            </div>
        `;
    }
    
    if (userProfile.facebook) {
        socialMediaHtml += `
            <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                <a href="${userProfile.facebook}" target="_blank" class="social-btn facebook-btn" style="display: flex; align-items: center; justify-content: center; text-decoration: none; background: linear-gradient(135deg, #1877f2, #0e5a9d); color: white; padding: 12px 25px; border-radius: 30px; font-weight: bold; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(24, 119, 242, 0.4);">
                    <i class="fab fa-facebook" style="font-size: 24px; margin-right: 10px;"></i>
                    Facebook
                </a>
            </div>
        `;
    }
    
    if (userProfile.youtube) {
        socialMediaHtml += `
            <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                <a href="${userProfile.youtube}" target="_blank" class="social-btn youtube-btn" style="display: flex; align-items: center; justify-content: center; text-decoration: none; background: linear-gradient(135deg, #ff0000, #cc0000); color: white; padding: 12px 25px; border-radius: 30px; font-weight: bold; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(255, 0, 0, 0.4);">
                    <i class="fab fa-youtube" style="font-size: 24px; margin-right: 10px;"></i>
                    YouTube
                </a>
            </div>
        `;
    }
    
    Swal.fire({
        title: '<i class="fas fa-share-alt" style="margin-right: 10px;"></i> Redes Sociales',
        html: `
            <div style="text-align: center; padding: 15px;">
                ${socialMediaHtml || `
                    <div style="text-align: center; padding: 30px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #6c757d; margin-bottom: 15px;"></i>
                        <p style="color: #a0a0a0; font-size: 16px;">No hay redes sociales disponibles</p>
                    </div>
                `}
            </div>
        `,
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        color: '#e0e0e0',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#4ecdc4',
        width: '400px',
        customClass: {
            popup: 'social-media-popup'
        },
        didOpen: () => {
            // Agregar efectos hover a los botones
            const socialButtons = document.querySelectorAll('.social-btn');
            socialButtons.forEach(btn => {
                btn.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-3px)';
                    this.style.boxShadow = '0 7px 20px rgba(0, 0, 0, 0.5)';
                });
                btn.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                    if (this.classList.contains('tiktok-btn')) {
                        this.style.boxShadow = '0 4px 15px rgba(105, 201, 208, 0.4)';
                    } else if (this.classList.contains('facebook-btn')) {
                        this.style.boxShadow = '0 4px 15px rgba(24, 119, 242, 0.4)';
                    } else if (this.classList.contains('youtube-btn')) {
                        this.style.boxShadow = '0 4px 15px rgba(255, 0, 0, 0.4)';
                    }
                });
            });
        }
    });
}


    function getEmotionInfo(emotion) {
        const emotions = {
            'feliz': { icon: '😊', text: 'Feliz' },
            'triste': { icon: '😢', text: 'Triste' },
            'enojado': { icon: '😠', text: 'Enojado' },
            'sorprendido': { icon: '😲', text: 'Sorprendido' },
            'emocionado': { icon: '🤩', text: 'Emocionado' },
            'cansado': { icon: '😴', text: 'Cansado' },
            'relajado': { icon: '😌', text: 'Relajado' },
            'confundido': { icon: '😕', text: 'Confundido' }
        };
        
        return emotions[emotion] || { icon: '😐', text: 'Neutral' };
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
