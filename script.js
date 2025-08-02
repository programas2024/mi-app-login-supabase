// script.js - Lógica principal del Dashboard y Páginas de Autenticación
// Este script orquesta la carga del perfil, la autenticación y la interacción
// con los módulos de lógica social y de cofre, adaptándose a la página actual.

// Importa la instancia de Supabase configurada desde el archivo central
import { supabase } from 'supabaseConfig.js';

// Importa las funciones necesarias de chestLogic.js
import { updateCurrencyDisplay, openChest } from 'chestLogic.js';

// Importa las funciones necesarias de socialLogic.js
import {
    loadPendingFriendRequestsCount,
    showFriendRequestsModal,
    loadFriendsList,
    loadUnreadMessagesCount,
    showMessagesModal
} from 'socialLogic.js';

// ====================================================================================
// REFERENCIAS A ELEMENTOS DEL DOM (Declaradas globalmente para accesibilidad en este script)
// ====================================================================================

// Elementos globales/comunes para este script
let loaderDiv;
let loaderText;

// Elementos específicos de index.html
let initialOptionsDiv;
let signupFormDiv;
let loginFormDiv;
let signupEmail;
let signupPassword;
let registerBtn;
let loginEmail;
let loginPassword;
let loginSubmitBtn;
let showSignupBtn;
let showLoginBtn;
let backToOptionsFromSignup;
let backToOptionsFromLogin;
let forgotPasswordLink;

// Elementos específicos de dashboard.html
let dashboardDiv;
let userEmailDashboardSpan;
let goldDisplayDashboard;
let diamondsDisplayDashboard;
let profileBtnDashboard;
let logoutBtnDashboard;
let friendRequestsBtn;
let messagesBtn;
let showRankingsBtn;
let showLeaderboardBtn;
let chestBtn; // También se referencia aquí para el listener

// Elementos específicos de profile.html (o usados en el modal de perfil)
let profileCard;
let userEmailProfileSpan;
let usernameInputProfile;
let countryInputProfile;
let saveProfileBtn;
let backToDashboardBtn;
let configureBtn;
let goldDisplayProfile;
let diamondsDisplayProfile;

// ====================================================================================
// FUNCIONES DE UTILIDAD LOCALES PARA script.js
// ====================================================================================

/**
 * Muestra el loader de la página (local a script.js).
 * @param {string} message - Mensaje a mostrar en el loader.
 */
function showLoader(message = 'Cargando...') {
    if (loaderDiv) {
        const loaderTextElement = loaderDiv.querySelector('p');
        if (loaderTextElement) {
            loaderTextElement.textContent = message;
        }
        loaderDiv.classList.remove('loader-hidden');
    }
}

/**
 * Oculta el loader de la página (local a script.js).
 */
function hideLoader() {
    if (loaderDiv) {
        loaderDiv.classList.add('loader-hidden');
    }
}

/**
 * Helper para mostrar SweetAlert2 con estilos personalizados (local a script.js).
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
// FUNCIONES DE AUTENTICACIÓN (para index.html)
// ====================================================================================

function showInitialOptions() {
    if (initialOptionsDiv) initialOptionsDiv.classList.remove('hidden');
    if (signupFormDiv) signupFormDiv.classList.add('hidden');
    if (loginFormDiv) loginFormDiv.classList.add('hidden');
}

function showSignupForm() {
    if (initialOptionsDiv) initialOptionsDiv.classList.add('hidden');
    if (signupFormDiv) signupFormDiv.classList.remove('hidden');
    if (loginFormDiv) loginFormDiv.classList.add('hidden');
}

function showLoginForm() {
    if (initialOptionsDiv) initialOptionsDiv.classList.add('hidden');
    if (signupFormDiv) signupFormDiv.classList.add('hidden');
    if (loginFormDiv) loginFormDiv.classList.remove('hidden');
}

async function signUp() {
    const email = signupEmail ? signupEmail.value : '';
    const password = signupPassword ? signupPassword.value : '';
    if (!email || !password) {
        showCustomSwal('error', 'Error', 'Por favor, ingresa un email y una contraseña.');
        return;
    }
    showLoader('Registrando...');
    const { error } = await supabase.auth.signUp({ email, password });
    hideLoader();
    if (error) {
        showCustomSwal('error', 'Error de Registro', error.message);
    } else {
        showCustomSwal('success', '¡Registro Exitoso!', 'Revisa tu correo para confirmar tu cuenta.');
    }
}

async function signIn() {
    const email = loginEmail ? loginEmail.value : '';
    const password = loginPassword ? loginPassword.value : '';
    if (!email || !password) {
        showCustomSwal('error', 'Error', 'Por favor, ingresa tu email y contraseña.');
        return;
    }
    showLoader('Iniciando sesión...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    hideLoader();
    if (error) {
        showCustomSwal('error', 'Error de Inicio de Sesión', error.message);
    } else {
        // La redirección se maneja en onAuthStateChange
    }
}

async function signOut() {
    showLoader('Cerrando sesión...');
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        // La redirección a index.html se maneja en onAuthStateChange
    } catch (error) {
        console.error('Error al cerrar sesión:', error.message);
        showCustomSwal('error', 'Error al Cerrar Sesión', `No se pudo cerrar la sesión: ${error.message}`);
    } finally {
        hideLoader();
    }
}

// ====================================================================================
// LÓGICA DE CARGA DE PERFIL (Para dashboard.html y profile.html)
// ====================================================================================

/**
 * Carga los datos del perfil del usuario actual y los muestra en el dashboard/perfil.
 * También carga la lista de amigos y el conteo de solicitudes pendientes.
 */
async function loadUserProfile(userId) {
    showLoader('Cargando perfil...');

    try {
        let profileData;
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, country, diamonds, gold')
            .eq('id', userId)
            .single();

        if (profileError) {
            if (profileError.code === 'PGRST116') { // Perfil no encontrado
                console.warn('Perfil no encontrado para el usuario. Creando uno nuevo...');
                const { data: { user } } = await supabase.auth.getUser();
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        username: user.email.split('@')[0],
                        email: user.email,
                        country: 'Desconocido',
                        diamonds: 0,
                        gold: 0
                    });

                if (insertError) {
                    if (insertError.code === '23505') { // Conflicto (ya existe)
                        console.warn('Conflicto al crear perfil (ya existe). Intentando cargar de nuevo.');
                        const { data: reloadedProfile, error: reloadedProfileError } = await supabase
                            .from('profiles')
                            .select('username, country, diamonds, gold')
                            .eq('id', userId)
                            .single();
                        if (reloadedProfileError) {
                            throw reloadedProfileError;
                        }
                        profileData = reloadedProfile;
                        showCustomSwal('info', 'Perfil Cargado', 'Tu perfil ya existía y se ha cargado correctamente.');
                    } else {
                        throw insertError; // Otros errores de inserción
                    }
                } else {
                    // Perfil creado exitosamente, usamos los datos por defecto
                    profileData = {
                        username: user.email.split('@')[0],
                        country: 'Desconocido',
                        diamonds: 0,
                        gold: 0
                    };
                    showCustomSwal('success', '¡Perfil Creado!', 'Se ha generado un perfil básico para ti. ¡Rellena tus datos en la sección de Perfil!');
                }
            } else {
                throw profileError; // Otros errores al cargar el perfil
            }
        } else {
            profileData = profile; // Perfil encontrado, lo usamos
        }

        // Actualizar elementos de la UI con los datos del perfil si existen
        if (profileData) {
            // Actualizar elementos del Dashboard
            if (userEmailDashboardSpan) {
                const { data: { user } } = await supabase.auth.getUser();
                userEmailDashboardSpan.textContent = profileData.username || (user ? user.email : 'Usuario');
            }
            if (goldDisplayDashboard) goldDisplayDashboard.textContent = profileData.gold || 0;
            if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = profileData.diamonds || 0;

            // Actualizar elementos de la página de Perfil (si aplica)
            if (userEmailProfileSpan) {
                const { data: { user } } = await supabase.auth.getUser();
                userEmailProfileSpan.textContent = user ? user.email : 'N/A';
            }
            if (usernameInputProfile) usernameInputProfile.value = profileData.username || '';
            if (countryInputProfile) countryInputProfile.value = profileData.country || '';
            if (goldDisplayProfile) goldDisplayProfile.textContent = profileData.gold || 0;
            if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = profileData.diamonds || 0;

            // Cargar datos sociales (amigos, solicitudes, mensajes)
            // Estas funciones ahora obtienen sus propios elementos DOM
            await loadFriendsList(userId);
            await loadPendingFriendRequestsCount(userId);
            await loadUnreadMessagesCount(userId);
        }

    } catch (error) {
        console.error('Error general en loadUserProfile:', error.message);
        showCustomSwal('error', 'Error de Carga', `No se pudo cargar tu perfil: ${error.message}`);
    } finally {
        hideLoader();
        // Aseguramos que el dashboard/perfil sea visible DESPUÉS de ocultar el loader
        if (dashboardDiv) dashboardDiv.classList.remove('dashboard-hidden');
        if (profileCard) profileCard.classList.remove('dashboard-hidden');
    }
}

/**
 * Guarda el perfil del usuario.
 */
async function saveProfile() {
    const { data: { user } = {} } = await supabase.auth.getUser(); // Añadir valor por defecto para user
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para guardar tu perfil.');
        return;
    }

    const username = usernameInputProfile ? usernameInputProfile.value : '';
    const country = countryInputProfile ? countryInputProfile.value : '';

    if (!username) {
        showCustomSwal('error', 'Error', 'El nombre de usuario no puede estar vacío.');
        return;
    }

    showLoader('Guardando perfil...');
    try {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ username: username, country: country })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }
        showCustomSwal('success', '¡Éxito!', 'Tu perfil ha sido actualizado.');
        await loadUserProfile(user.id); // Recargar para actualizar UI
    } catch (updateError) {
        console.error('Error al actualizar el perfil:', updateError.message);
        showCustomSwal('error', 'Error', `No se pudo actualizar tu perfil: ${updateError.message}`);
    } finally {
        hideLoader();
    }
}

function showConfigureOptions() {
    showCustomSwal('info', 'Configuración', 'Opciones de configuración aún no implementadas.');
}


// ====================================================================================
// --- Lógica de inicialización al cargar el DOM ---
// ====================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();

    // --- Inicializar referencias a elementos del DOM globales para script.js ---
    loaderDiv = document.getElementById('loader');
    loaderText = loaderDiv ? loaderDiv.querySelector('p') : null;

    // Listener para cambios de estado de autenticación (GLOBAL para todas las páginas)
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[Auth State Change] Event: ${event}, Session:`, session);

        if (session && session.user) {
            // Usuario autenticado
            console.log(`[Auth State Change] Usuario autenticado: ${session.user.id}`);
            if (currentPage === 'index.html' || currentPage === '') {
                // Si está en la página de inicio y se autentica, redirigir al dashboard
                console.log('[Auth State Change] Redirigiendo a dashboard.html...');
                window.location.href = 'dashboard.html';
            } else if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
                // Si ya está en dashboard/profile y la sesión es válida, cargar perfil
                console.log(`[Auth State Change] En ${currentPage}, cargando perfil...`);
                await loadUserProfile(session.user.id);
            }
        } else {
            // Usuario no autenticado o sesión cerrada
            console.log('[Auth State Change] Usuario no autenticado o sesión cerrada.');
            if (currentPage !== 'index.html' && currentPage !== '') {
                // Si no está en la página de inicio y no hay sesión, redirigir a inicio
                console.log('[Auth State Change] Redirigiendo a index.html...');
                window.location.href = 'index.html';
            } else {
                // Si ya está en la página de inicio, simplemente mostrar las opciones de autenticación
                console.log('[Auth State Change] Ya en index.html, mostrando opciones de autenticación.');
                showInitialOptions();
            }
        }
    });

    // --- Lógica para index.html ---
    if (currentPage === 'index.html' || currentPage === '') {
        console.log('Cargando lógica específica de index.html');

        // Asignar referencias a elementos de index.html
        initialOptionsDiv = document.getElementById('initial-options');
        signupFormDiv = document.getElementById('signup-form');
        loginFormDiv = document.getElementById('login-form');
        signupEmail = document.getElementById('signup-email');
        signupPassword = document.getElementById('signup-password');
        registerBtn = document.getElementById('register-btn');
        loginEmail = document.getElementById('login-email');
        loginPassword = document.getElementById('login-password');
        loginSubmitBtn = document.getElementById('login-submit-btn');
        showSignupBtn = document.getElementById('show-signup-btn');
        showLoginBtn = document.getElementById('show-login-btn');
        backToOptionsFromSignup = document.getElementById('back-to-options-from-signup');
        backToOptionsFromLogin = document.getElementById('back-to-options-from-login');
        forgotPasswordLink = document.getElementById('forgot-password');

        // Configura los event listeners solo si los elementos existen (estamos en index.html)
        if (registerBtn) registerBtn.addEventListener('click', signUp);
        if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', signIn);
        if (showSignupBtn) showSignupBtn.addEventListener('click', showSignupForm);
        if (showLoginBtn) showLoginBtn.addEventListener('click', showLoginForm);
        if (backToOptionsFromSignup) backToOptionsFromSignup.addEventListener('click', showInitialOptions);
        if (backToOptionsFromLogin) backToOptionsFromLogin.addEventListener('click', showInitialOptions);
        
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const { value: emailToReset } = await Swal.fire({
                    title: 'Restablecer Contraseña',
                    input: 'email',
                    inputLabel: 'Ingresa tu correo electrónico',
                    inputPlaceholder: 'ejemplo@correo.com',
                    showCancelButton: true,
                    confirmButtonText: 'Enviar enlace',
                    cancelButtonText: 'Cancelar',
                    inputValidator: (value) => {
                        if (!value) {
                            return '¡Necesitas ingresar un correo electrónico!';
                        }
                        return null;
                    }
                });

                if (emailToReset) {
                    showLoader('Enviando enlace de recuperación...');
                    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
                        redirectTo: window.location.origin + '/reset-password.html'
                    });
                    hideLoader();

                    if (error) {
                        showCustomSwal('error', 'Error', 'No se pudo enviar el correo de recuperación: ' + error.message);
                    } else {
                        showCustomSwal('success', 'Enlace enviado', 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.');
                    }
                }
            });
        }
    }
    // --- Lógica para dashboard.html y profile.html ---
    else if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
        console.log(`Cargando lógica específica de ${currentPage}`);

        // Asignar referencias a elementos del dashboard/perfil
        dashboardDiv = document.getElementById('dashboard');
        userEmailDashboardSpan = document.getElementById('user-email');
        goldDisplayDashboard = document.getElementById('gold-display');
        diamondsDisplayDashboard = document.getElementById('diamonds-display');
        profileBtnDashboard = document.getElementById('profile-btn');
        logoutBtnDashboard = document.getElementById('logout-btn');
        friendRequestsBtn = document.getElementById('friend-requests-btn');
        messagesBtn = document.getElementById('messages-btn');
        showRankingsBtn = document.getElementById('show-rankings-btn');
        showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
        chestBtn = document.getElementById('chest-btn');

        // Elementos específicos de profile.html
        profileCard = document.getElementById('profile-card');
        userEmailProfileSpan = document.getElementById('user-email-profile');
        usernameInputProfile = document.getElementById('edit-username');
        countryInputProfile = document.getElementById('edit-country');
        saveProfileBtn = document.getElementById('save-profile-btn');
        backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        configureBtn = document.getElementById('configure-btn');
        goldDisplayProfile = document.getElementById('gold-display-profile');
        diamondsDisplayProfile = document.getElementById('diamonds-display-profile');

        // Configurar listeners específicos de dashboard.html
        if (currentPage === 'dashboard.html') {
            if (profileBtnDashboard) {
                profileBtnDashboard.addEventListener('click', () => {
                    window.location.href = 'profile.html';
                });
            }
            if (logoutBtnDashboard) logoutBtnDashboard.addEventListener('click', signOut);
            // Listeners para botones sociales en dashboard (llaman a funciones de socialLogic.js)
            if (friendRequestsBtn) friendRequestsBtn.addEventListener('click', showFriendRequestsModal);
            if (messagesBtn) messagesBtn.addEventListener('click', showMessagesModal);
            // Listener para el botón del cofre (llama a función de chestLogic.js)
            if (chestBtn) chestBtn.addEventListener('click', openChest);
        }
        // Configurar listeners específicos de profile.html
        else if (currentPage === 'profile.html') {
            if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
            if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
            if (configureBtn) configureBtn.addEventListener('click', showConfigureOptions);
        }

        // Listeners para botones de navegación globales (si existen en la página actual)
        const playBtn = document.getElementById('play-btn');
        if (playBtn) playBtn.addEventListener('click', () => { window.location.href = 'games.html'; });
        if (showRankingsBtn) showRankingsBtn.addEventListener('click', () => { window.location.href = 'rankings.html'; });
        if (showLeaderboardBtn) showLeaderboardBtn.addEventListener('click', () => { window.location.href = 'leaderboard-full.html'; });
    }
    // NOTA: Asegúrate de que tus páginas de juego NO carguen este 'script.js'.
    // Solo deberían cargar sus respectivos scripts de lógica de juego.
});
