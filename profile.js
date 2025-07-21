// js/profile.js

import { supabase, showLoader, hideLoader, showSwal, signOut } from './main.js';
import { loadUserProfile as loadUserProfileForDashboard } from './dashboard.js'; // Importar si necesitas actualizar el dashboard después de editar perfil

// --- Referencias a Elementos HTML de profile.html ---
const profileCard = document.getElementById('profile-card');
const userEmailProfileSpan = document.getElementById('user-email-profile');
const usernameInputProfile = document.getElementById('edit-username');
const countryInputProfile = document.getElementById('edit-country');
const saveProfileBtn = document.getElementById('save-profile-btn');
const giveGoldBtnProfile = document.getElementById('give-gold-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const logoutBtnProfile = document.getElementById('logout-btn-profile');
const goldDisplayProfile = document.getElementById('gold-display-profile');
const diamondsDisplayProfile = document.getElementById('diamonds-display-profile');


// --- Función para cargar y mostrar los datos del perfil (en profile.html) ---
async function loadProfilePageData(userId) {
    showLoader('Cargando perfil...');
    const { data, error } = await supabase
        .from('profiles')
        .select('username, country, gold, diamonds')
        .eq('id', userId)
        .single();

    hideLoader();

    if (error) {
        console.error('Error al cargar perfil en profile.html:', error);
        showSwal('error', 'Error de Perfil', 'No se pudo cargar la información de tu perfil. Inténtalo de nuevo.');
        if (error.code === 'PGRST116') { // Perfil no existe
            console.log('Perfil no encontrado, intentando crear uno básico.');
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: userId, username: 'Nuevo Jugador', country: 'Desconocido', gold: 0, diamonds: 0 }]);
            if (insertError) {
                console.error('Error al crear perfil básico:', insertError);
                showSwal('error', 'Error Crítico', 'No se pudo crear el perfil inicial para tu cuenta.');
            } else {
                showSwal('info', 'Perfil Creado', 'Se ha generado un perfil básico para ti. ¡Rellena tus datos!');
                loadProfilePageData(userId); // Recargar para mostrar los datos recién creados
            }
        }
    } else if (data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (userEmailProfileSpan && user) userEmailProfileSpan.textContent = user.email;

        if (usernameInputProfile) usernameInputProfile.value = data.username || '';
        if (countryInputProfile) countryInputProfile.value = data.country || '';
        if (goldDisplayProfile) goldDisplayProfile.textContent = data.gold;
        if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = data.diamonds;
    }
}

// --- Función para guardar los cambios del perfil ---
async function saveProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showSwal('error', 'Error', 'No hay sesión activa para guardar el perfil.');
        return;
    }

    const newUsername = usernameInputProfile ? usernameInputProfile.value.trim() : '';
    const newCountry = countryInputProfile ? countryInputProfile.value.trim() : '';

    if (!newUsername) {
        showSwal('warning', 'Nombre de Usuario', 'Por favor, ingresa un nombre de jugador.');
        return;
    }

    showLoader('Guardando perfil...');
    const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername, country: newCountry })
        .eq('id', user.id);
    
    hideLoader();

    if (error) {
        showSwal('error', 'Error al guardar', 'No se pudo guardar tu perfil: ' + error.message);
    } else {
        showSwal('success', '¡Perfil Guardado!', 'Tu información de perfil ha sido actualizada.');
        await loadProfilePageData(user.id); // Recargar el perfil para actualizar los spans mostrados
    }
}

// --- Función de ejemplo para dar oro ---
async function giveGold() {
    showLoader('Dando oro...');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        showSwal('error', 'Error', 'No hay sesión activa.');
        hideLoader();
        return;
    }

    const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('gold')
        .eq('id', user.id)
        .single();

    if (fetchError) {
        showSwal('error', 'Error', 'No se pudo obtener el oro actual.');
        hideLoader();
        return;
    }

    const newGold = (currentProfile.gold || 0) + 10;

    const { error } = await supabase
        .from('profiles')
        .update({ gold: newGold })
        .eq('id', user.id);

    hideLoader();

    if (error) {
        showSwal('error', 'Error al dar oro', 'No se pudo actualizar el oro: ' + error.message);
    } else {
        if (goldDisplayProfile) goldDisplayProfile.textContent = newGold;
        showSwal('success', '¡Oro Obtenido!', `Has recibido 10 de oro. Total: ${newGold}`);
    }
}


// --- Lógica de inicialización para profile.html ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cargando script en profile.html');

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        if (profileCard) profileCard.classList.remove('dashboard-hidden'); // Si usas esta clase para ocultar inicialmente
        await loadProfilePageData(user.id);

        if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
        if (giveGoldBtnProfile) giveGoldBtnProfile.addEventListener('click', giveGold);
        if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
        if (logoutBtnProfile) logoutBtnProfile.addEventListener('click', signOut);

    } else {
        console.log('No hay usuario autenticado en profile.html. Redirigiendo a index.html');
        window.location.href = 'index.html';
    }

    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event in profile.html:', event, 'Session:', session);
        if (event === 'SIGNED_OUT' || !session) {
            console.log('Sesión terminada en profile.html. Redirigiendo a index.html.');
            window.location.href = 'index.html';
        }
    });
});