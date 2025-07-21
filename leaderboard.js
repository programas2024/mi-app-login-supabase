// leaderboard.js

/**
 * Función para cargar y mostrar la tabla de clasificación desde Supabase.
 * @param {object} supabase - La instancia de cliente Supabase inicializada.
 * @param {HTMLElement} [loaderElement=null] - Opcional: El elemento loader específico de la página.
 */
export async function loadLeaderboard(supabase, loaderElement = null) {
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
            .select('username, gold')
            .order('gold', { ascending: false }); // No se limita aquí para mostrar la tabla completa

        if (error) {
            throw error;
        }

        leaderboardTableBody.innerHTML = ''; // Limpia cualquier fila existente

        if (users && users.length > 0) {
            users.forEach((user, index) => {
                const row = leaderboardTableBody.insertRow();
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${user.username || 'Desconocido'}</td>
                    <td>${user.gold || 0}</td>
                `;
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
        // Oculta el loader una vez que los datos se han cargado (o si hubo un error)
        if (loaderElement) {
            loaderElement.classList.add('loader-hidden');
        }
    }
}