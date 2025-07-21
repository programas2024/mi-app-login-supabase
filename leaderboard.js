// leaderboard.js

/**
 * Función para cargar y mostrar la tabla de clasificación desde Supabase.
 * @param {object} supabase - La instancia de cliente Supabase inicializada.
 */
export async function loadLeaderboard(supabase) {
    const leaderboardTableBody = document.querySelector('.leaderboard-table tbody');
    if (!leaderboardTableBody) {
        console.error("No se encontró el cuerpo de la tabla de clasificación (.leaderboard-table tbody).");
        return;
    }

    try {
        // Muestra el loader mientras se cargan los datos
        const loader = document.getElementById('loader');
        if (loader) loader.classList.remove('loader-hidden');

        // Asegúrate de que tu tabla en Supabase tenga las columnas 'username' y 'gold'
        // Si tu tabla o columnas se llaman diferente (ej. 'name' en lugar de 'username'), ajusta aquí:
        const { data: users, error } = await supabase
            .from('profiles') // Asume que tu tabla de usuarios/perfiles se llama 'profiles'
            .select('username, gold') // Selecciona el nombre de usuario y la cantidad de oro
            .order('gold', { ascending: false }) // Ordena por oro de mayor a menor
            .limit(10); // Limita a los 10 mejores jugadores, puedes ajustar este número

        if (error) {
            throw error;
        }

        // Limpia cualquier fila existente en la tabla
        leaderboardTableBody.innerHTML = '';

        if (users && users.length > 0) {
            users.forEach((user, index) => {
                const row = leaderboardTableBody.insertRow();
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${user.username || 'Desconocido'}</td> <td>${user.gold || 0}</td>
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
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('loader-hidden');
    }
}