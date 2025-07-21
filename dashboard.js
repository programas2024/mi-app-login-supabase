// js/dashboard.js

import { supabase, showLoader, hideLoader, showSwal, signOut } from './main.js';

// --- Referencias a Elementos HTML de dashboard.html ---
const dashboardDiv = document.getElementById('dashboard');
const userEmailSpan = document.getElementById('user-email');
const goldDisplayDashboard = document.getElementById('gold-display');
const diamondsDisplayDashboard = document.getElementById('diamonds-display');
const profileBtnDashboard = document.getElementById('profile-btn');
const logoutBtnDashboard = document.getElementById('logout-btn');

// --- Función para cargar y mostrar los datos del perfil ---
export async function loadUserProfile(userId) { // Exportar para posible reuso en profile.js si se quiere unificar
    showLoader('Cargando perfil...');
    const { data, error } = await supabase
        .from('profiles')
        .select('username, country, gold, diamonds')
        .eq('id', userId)
        .single();

    hideLoader();

    if (error) {
        console.error('Error al cargar perfil:', error);
        showSwal('error', 'Error de Perfil', 'No se pudo cargar la información de tu perfil. Inténtalo de nuevo.');
        if (error.code === 'PGRST116') { // Código para "no rows found" (perfil no existe)
            console.log('Perfil no encontrado, intentando crear uno básico.');
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: userId, username: 'Nuevo Jugador', country: 'Desconocido', gold: 0, diamonds: 0 }]);
            if (insertError) {
                console.error('Error al crear perfil básico:', insertError);
                showSwal('error', 'Error Crítico', 'No se pudo crear el perfil inicial para tu cuenta.');
            } else {
                showSwal('info', 'Perfil Creado', 'Se ha generado un perfil básico para ti. ¡Rellena tus datos en la sección de Perfil!');
                // Recargar para mostrar los datos recién creados
                loadUserProfile(userId);
            }
        }
    } else if (data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (userEmailSpan && user) userEmailSpan.textContent = user.email;

        if (goldDisplayDashboard) goldDisplayDashboard.textContent = data.gold;
        if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = data.diamonds;
    }
}


// --- Lógica de inicialización para dashboard.html ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cargando script en dashboard.html');

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        if (dashboardDiv) dashboardDiv.classList.remove('dashboard-hidden');
        await loadUserProfile(user.id);

        if (profileBtnDashboard) {
            profileBtnDashboard.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
        if (logoutBtnDashboard) logoutBtnDashboard.addEventListener('click', signOut);
    } else {
        console.log('No hay usuario autenticado en dashboard.html. Redirigiendo a index.html');
        window.location.href = 'index.html';
    }

    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event in dashboard.html:', event, 'Session:', session);
        if (event === 'SIGNED_OUT' || !session) {
            console.log('Sesión terminada en dashboard.html. Redirigiendo a index.html.');
            window.location.href = 'index.html';
        }
    });
});