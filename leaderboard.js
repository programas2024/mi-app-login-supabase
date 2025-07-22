// leaderboard.js

/**
 * Función para cargar y mostrar la tabla de clasificación desde Supabase.
 * @param {object} supabase - La instancia de cliente Supabase inicializada.
 * @param {HTMLElement} [loaderElement=null] - Opcional: El elemento loader específico de la página.
 * @param {string} [currentUserId=null] - Opcional: El ID del usuario actualmente logueado para resaltarlo.
 */
export async function loadLeaderboard(supabase, loaderElement = null, currentUserId = null) { // <-- Añadido currentUserId
    const leaderboardTableBody = document.querySelector('.leaderboard-table tbody');
    if (!leaderboardTableBody) {
        console.error("No se encontró el cuerpo de la tabla de clasificación (.leaderboard-table tbody).");
        return;
    }

    // Muestra el loader si se proporcionó uno
    if (loaderElement) {
        loaderElement.classList.remove('loader-hidden');
        const loaderText = loaderElement.querySelector('p');
        if (loaderText) loaderText.textContent = 'Cargando clasificación...'; // Mensaje específico
    }

    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, username, gold, country, diamonds')
            .order('gold', { ascending: false });

        if (error) {
            throw error;
        }

        leaderboardTableBody.innerHTML = ''; // Limpia cualquier fila existente

        if (users && users.length > 0) {
            users.forEach((user, index) => {
                const row = leaderboardTableBody.insertRow();
                // Determina si esta fila es la del usuario actual
                const isCurrentUser = currentUserId && user.id === currentUserId;
                if (isCurrentUser) {
                    row.classList.add('current-user-row'); // Añade la clase de resaltado
                }

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td class="player-name-cell" data-user-id="${user.id}">${user.username || 'Desconocido'}</td>
                    <td>${user.gold || 0}</td>
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
                    const userId = event.target.dataset.userId;
                    if (userId) {
                        await showPlayerDetails(supabase, userId);
                    }
                });
            });

        } else {
            const row = leaderboardTableBody.insertRow();
            row.innerHTML = `<td colspan="3">No hay datos en la clasificación. ¡Sé el primero en jugar!</td>`;
        }

    } catch (error) {
        console.error('Error al cargar la tabla de clasificación:', error.message);
        const row = leaderboardTableBody.insertRow();
        row.innerHTML = `<td colspan="3">Error al cargar la clasificación: ${error.message}</td>`;
    } finally {
        if (loaderElement) {
            loaderElement.classList.add('loader-hidden');
        }
    }
}

/**
 * Función para mostrar los detalles de un jugador en un SweetAlert2 modal.
 * @param {object} supabase - La instancia de cliente Supabase inicializada.
 * @param {string} userId - El ID del usuario cuyo perfil se va a mostrar.
 */
async function showPlayerDetails(supabase, userId) {
    Swal.fire({
        title: 'Cargando detalles...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('username, country, diamonds, gold')
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        if (!userProfile) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se encontraron los detalles de este jugador.',
                confirmButtonText: 'Ok'
            });
            return;
        }

        const countryIcon = getCountryFlagEmoji(userProfile.country);

        Swal.fire({
            title: `<strong>${userProfile.username || 'Jugador Desconocido'}</strong>`,
            html: `
                <div style="text-align: left; padding: 10px; font-size: 1.1em;">
                    <p style="margin-bottom: 8px;"><i class="fas fa-globe-americas" style="color: #6a5acd;"></i> <strong>País:</strong> ${countryIcon} ${userProfile.country || 'No especificado'}</p>
                    <p style="margin-bottom: 8px;"><i class="fas fa-gem" style="color: #00bcd4;"></i> <strong>Diamantes:</strong> <span style="font-weight: bold; color: #00bcd4;">${userProfile.diamonds || 0}</span></p>
                    <p><i class="fas fa-coins" style="color: #ffd700;"></i> <strong>Oro:</strong> <span style="font-weight: bold; color: #ffd700;">${userProfile.gold || 0}</span></p>
                </div>
            `,
            icon: 'info',
            iconHtml: '<i class="fas fa-user" style="color: var(--primary-color);"></i>',
            showCloseButton: true,
            confirmButtonText: '¡Entendido!',
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
        });

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `No se pudo cargar la información: ${error.message}`,
            confirmButtonText: 'Cerrar'
        });
        console.error('Error al cargar detalles del jugador:', error.message);
    }
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