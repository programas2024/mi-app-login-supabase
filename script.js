// script.js - Lógica de Autenticación y Perfil (para index.html, dashboard.html, profile.html)

// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';



// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);




// --- 2. Referencias a Elementos HTML (Declaradas, asignadas dentro de DOMContentLoaded) ---
// Se declaran aquí para que sean accesibles en todo el script, pero se asignan cuando el DOM está listo.
let initialOptionsDiv, signupFormDiv, loginFormDiv;
let signupEmail, signupPassword, registerBtn;
let loginEmail, loginPassword, loginSubmitBtn;
let showSignupBtn, showLoginBtn;
let backToOptionsFromSignup, backToOptionsFromLogin;
let forgotPasswordLink;

let dashboardDiv;
let userEmailDashboardSpan, goldDisplayDashboard, diamondsDisplayDashboard;
let profileBtnDashboard, logoutBtnDashboard;

let profileCard;
let userEmailProfileSpan, usernameInputProfile, countryInputProfile;
let saveProfileBtn, backToDashboardBtn, configureBtn;
let goldDisplayProfile, diamondsDisplayProfile;

let loaderDiv, loaderText;


// --- 3. Funciones de Utilidad (Ajustadas para SweetAlert2 y Loader) ---

function showLoader(message = 'Cargando...') {
    if (loaderDiv) {
        if (loaderText) {
            loaderText.textContent = message;
        }
        loaderDiv.classList.remove('loader-hidden');
    }
}

function hideLoader() {
    if (loaderDiv) {
        loaderDiv.classList.add('loader-hidden');
    }
}

function showSwal(icon, title, text) {
    const isAutoClose = (icon === 'success' || icon === 'info');

    Swal.fire({
        icon: icon,
        title: title,
        text: text,
        showConfirmButton: !isAutoClose,
        timer: isAutoClose ? 3000 : undefined,
        timerProgressBar: isAutoClose,
        customClass: {
            popup: 'swal2-modern', // Agrega una clase personalizada para estilos CSS
            confirmButton: 'swal2-confirm-btn'
        }
    });
}

// Funciones para alternar formularios en index.html
function hideAllAuthForms() {
    if (initialOptionsDiv) initialOptionsDiv.classList.add('form-hidden');
    if (signupFormDiv) signupFormDiv.classList.add('form-hidden');
    if (loginFormDiv) loginFormDiv.classList.add('form-hidden');
}

function showSignupForm() {
    hideAllAuthForms();
    if (signupFormDiv) signupFormDiv.classList.remove('form-hidden');
}

function showLoginForm() {
    hideAllAuthForms();
    if (loginFormDiv) loginFormDiv.classList.remove('form-hidden');
}

function showInitialOptions() {
    hideAllAuthForms();
    if (initialOptionsDiv) initialOptionsDiv.classList.remove('form-hidden');
}

// --- 4. Funciones de Autenticación ---

async function signUp() {
    const email = signupEmail.value;
    const password = signupPassword.value;

    if (!email || password.length < 6) {
        showSwal('warning', 'Datos incompletos', 'Por favor, ingresa un correo válido y una contraseña de al menos 6 caracteres.');
        return;
    }

    showLoader('Registrando...');
    const { data, error } = await supabase.auth.signUp({ email, password });
    hideLoader();

    if (error) {
        let errorMessage = 'Error al registrarse. Inténtalo de nuevo.';
        if (error.message.includes('User already registered')) {
            errorMessage = 'Este correo ya está registrado. Intenta iniciar sesión.';
        } else if (error.message.includes('AuthApiError: Password should be at least 6 characters')) {
            errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        }
        showSwal('error', 'Fallo en Registro', errorMessage);
    } else {
        showSwal('success', '¡Registro Exitoso!', 'Por favor, revisa tu correo electrónico para verificar tu cuenta e iniciar sesión.');
        signupEmail.value = '';
        signupPassword.value = '';
        showLoginForm();
    }
}

async function signIn() {
    const email = loginEmail.value;
    const password = loginPassword.value;

    if (!email || !password) {
        showSwal('warning', 'Datos incompletos', 'Por favor, ingresa tu correo y contraseña.');
        return;
    }

    showLoader('Iniciando sesión...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    hideLoader();

    if (error) {
        let errorMessage = 'Credenciales incorrectas o usuario no encontrado.';
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Correo o contraseña incorrectos.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Tu cuenta aún no ha sido verificada. Revisa tu correo.';
        }
        showSwal('error', 'Fallo en Inicio de Sesión', errorMessage);
    } else {
        showSwal('success', '¡Bienvenido!', 'Inicio de sesión exitoso. Redirigiendo al juego...');
        window.location.href = 'dashboard.html';
    }
}

async function signOut() {
    showLoader('Cerrando sesión...');
    const { error } = await supabase.auth.signOut();
    hideLoader();

    if (error) {
        showSwal('error', 'Error al cerrar sesión', 'No se pudo cerrar la sesión correctamente: ' + error.message);
    } else {
        showSwal('info', 'Sesión Cerrada', 'Has cerrado sesión. ¡Hasta pronto!');
        window.location.href = 'index.html';
    }
}

// --- 5. Funciones de Gestión de Perfil (usadas en dashboard.html y profile.html) ---

async function loadUserProfile(userId) {
    showLoader('Cargando perfil...');

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, country, gold, diamonds')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error al cargar perfil:', error);
            
            // Si el perfil no se encuentra (PGRST116), intenta crearlo
            if (error.code === 'PGRST116') { // Código para "no rows found" (perfil no existe)
                console.log('Perfil no encontrado, intentando crear uno básico.');
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ id: userId, username: 'Nuevo Jugador', country: 'Desconocido', gold: 0, diamonds: 0 }]);
                
                if (insertError) {
                    console.error('Error al crear perfil básico:', insertError);
                    // Si el error es un conflicto (409), significa que el perfil ya existe (ej. creado por otra sesión)
                    // En este caso, intenta cargar de nuevo el perfil en lugar de mostrar un error crítico.
                    if (insertError.code === '23505') { // PostgreSQL unique_violation (código para 409 Conflict)
                        console.warn('Conflicto al crear perfil (ya existe). Intentando cargar de nuevo.');
                        await loadUserProfile(userId); // Recargar el perfil
                        return; // Salir para evitar la ejecución del resto del bloque
                    } else {
                        showSwal('error', 'Error Crítico', 'No se pudo crear el perfil inicial para tu cuenta: ' + insertError.message);
                    }
                } else {
                    showSwal('info', 'Perfil Creado', 'Se ha generado un perfil básico para ti. ¡Rellena tus datos en la sección de Perfil!');
                    // No es necesario recargar, los datos ya se establecieron en la inserción
                    // y los campos se actualizarán en el 'finally' o con la siguiente carga.
                }
            } else { // Si es otro tipo de error al cargar el perfil
                showSwal('error', 'Error de Perfil', 'No se pudo cargar la información de tu perfil: ' + error.message);
            }
        } 
        
        // Si no hubo error en la carga inicial (data existe) O si se creó el perfil exitosamente
        // (en cuyo caso 'data' podría ser null si no se hizo un select después del insert,
        // pero se asume que si no hubo insertError, el perfil está listo para ser cargado en la siguiente iteración
        // o ya se cargó si el 409 lo disparó).
        // Para simplificar, si 'data' existe, actualizamos los displays.
        if (data) {
            // Actualizar datos en el dashboard (si es la página actual)
            if (userEmailDashboardSpan) userEmailDashboardSpan.textContent = (await supabase.auth.getUser()).data.user.email;
            if (goldDisplayDashboard) goldDisplayDashboard.textContent = data.gold;
            if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = data.diamonds;

            // Actualizar datos en la página de perfil (si es la página actual)
            if (userEmailProfileSpan) userEmailProfileSpan.textContent = (await supabase.auth.getUser()).data.user.email;
            if (usernameInputProfile) usernameInputProfile.value = data.username || '';
            if (countryInputProfile) countryInputProfile.value = data.country || '';
            if (goldDisplayProfile) goldDisplayProfile.textContent = data.gold;
            if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = data.diamonds;
        }
    } catch (e) {
        console.error("Error inesperado en loadUserProfile:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al cargar tu perfil.');
    } finally {
        hideLoader(); // Esto se ejecutará SIEMPRE.
        // Aseguramos que la tarjeta de perfil/dashboard sea visible DESPUÉS de ocultar el loader
        if (profileCard) {
            profileCard.classList.remove('dashboard-hidden');
        }
        if (dashboardDiv) { // También para el dashboard
            dashboardDiv.classList.remove('dashboard-hidden');
        }
    }
}

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
        await loadUserProfile(user.id); // Recargar el perfil para actualizar los spans mostrados
    }
}

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
        if (goldDisplayProfile) goldDisplayProfile.textContent = newGold; // Actualiza solo en la página de perfil
        if (goldDisplayDashboard) goldDisplayDashboard.textContent = newGold; // Actualiza también en el dashboard si está visible
        showSwal('success', '¡Oro Obtenido!', `Has recibido 10 de oro. Total: ${newGold}`);
    }
}

// Función para mostrar el modal de configuración
async function showConfigureOptions() {
    Swal.fire({
        title: '¿Qué deseas hacer?',
        icon: 'question',
        showCloseButton: true,
        showCancelButton: false,
        confirmButtonText: 'Ok', 
        showConfirmButton: false,
        allowOutsideClick: true,
        html: `
            <div class="swal-custom-buttons-container">
                <button id="swal-give-gold" class="swal-custom-btn swal-btn-gold"><i class="fas fa-coins"></i> Recibir 10 de Oro</button>
                <button id="swal-logout" class="swal-custom-btn swal-btn-logout"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
            </div>
        `,
        didOpen: () => {
            document.getElementById('swal-give-gold').addEventListener('click', async () => {
                Swal.close();
                await giveGold();
            });
            document.getElementById('swal-logout').addEventListener('click', async () => {
                Swal.close();
                await signOut();
            });
        },
        customClass: {
            popup: 'swal2-modern',
            htmlContainer: 'swal2-html-container-no-padding'
        },
        buttonsStyling: false
    });
}

// --- 6. Lógica de inicialización al cargar el DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();

    // --- Inicializar referencias a elementos del DOM globales ---
    loaderDiv = document.getElementById('loader');
    loaderText = loaderDiv ? loaderDiv.querySelector('p') : null;

    // --- Lógica para index.html ---
    if (currentPage === 'index.html' || currentPage === '') {
        console.log('Cargando lógica de index.html');

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

        // Primero, verifica si el usuario ya está autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            console.log('Usuario ya logueado al cargar index.html. Redirigiendo a dashboard.html...');
            window.location.href = 'dashboard.html';
            return; // Detener la ejecución del resto de la lógica de index.html
        } else {
            // Si no hay usuario, muestra las opciones de inicio/registro
            showInitialOptions();

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
                            showSwal('error', 'Error', 'No se pudo enviar el correo de recuperación: ' + error.message);
                        } else {
                            showSwal('success', 'Enlace enviado', 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.');
                        }
                    }
                });
            }

            supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth event in index.html:', event, 'Session:', session);
                if (session && session.user && currentPage === 'index.html') {
                    console.log('Usuario autenticado. Redirigiendo a dashboard.html desde onAuthStateChange...');
                    window.location.href = 'dashboard.html';
                }
            });
        }
    } 
    // --- Lógica para dashboard.html y profile.html ---
    else if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
        console.log(`Cargando lógica de ${currentPage}`);

        // Asignar referencias a elementos del dashboard/perfil
        dashboardDiv = document.getElementById('dashboard');
        userEmailDashboardSpan = document.getElementById('user-email');
        goldDisplayDashboard = document.getElementById('gold-display');
        diamondsDisplayDashboard = document.getElementById('diamonds-display');
        profileBtnDashboard = document.getElementById('profile-btn');
        logoutBtnDashboard = document.getElementById('logout-btn');

        profileCard = document.getElementById('profile-card');
        userEmailProfileSpan = document.getElementById('user-email-profile');
        usernameInputProfile = document.getElementById('edit-username');
        countryInputProfile = document.getElementById('edit-country');
        saveProfileBtn = document.getElementById('save-profile-btn');
        backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        configureBtn = document.getElementById('configure-btn');
        goldDisplayProfile = document.getElementById('gold-display-profile');
        diamondsDisplayProfile = document.getElementById('diamonds-display-profile');


        // Siempre verifica la sesión al cargar estas páginas
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Usuario autenticado: Cargar perfil y mostrar contenido
            await loadUserProfile(user.id);

            if (currentPage === 'dashboard.html') {
                if (profileBtnDashboard) {
                    profileBtnDashboard.addEventListener('click', () => {
                        window.location.href = 'profile.html';
                    });
                }
                if (logoutBtnDashboard) logoutBtnDashboard.addEventListener('click', signOut);
            } else if (currentPage === 'profile.html') {
                if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
                if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => {
                    window.location.href = 'dashboard.html';
                });
                if (configureBtn) configureBtn.addEventListener('click', showConfigureOptions);
            }

            // Listener para cerrar sesión desde cualquier página autenticada
            supabase.auth.onAuthStateChange((event, session) => {
                console.log(`Auth event in ${currentPage}:`, event, 'Session:', session);
                if (event === 'SIGNED_OUT' || !session) {
                    console.log(`Sesión terminada en ${currentPage}. Redirigiendo a index.html.`);
                    window.location.href = 'index.html';
                }
            });

        } else {
            // No hay usuario autenticado: Redirigir a la página de inicio
            console.log(`No hay usuario autenticado en ${currentPage}. Redirigiendo a index.html`);
            window.location.href = 'index.html';
        }
    }
    // --- Lógica para páginas de juego (si este script se carga allí) ---
    // NOTA: Idealmente, las páginas de juego solo cargarían sus propios scripts específicos (ej. orcado_vs_algo_game.js).
    // Si este script se carga en una página de juego, la lógica de juego que estaba aquí
    // causaría conflictos. La he ELIMINADO de este script.
    // Asegúrate de que tus páginas de juego NO carguen este 'script.js'.
    // Solo deberían cargar sus respectivos 'orcado_THEME_specific_game.js'
});

// socialLogic.js - Lógica para las funcionalidades sociales (amigos, solicitudes, mensajes)

// Importaciones necesarias para este módulo: Supabase
import { supabase } from '/supabaseConfig.js'; // Importa la instancia de Supabase configurada

// Referencias a elementos del DOM que este script gestiona
let friendRequestsBadge;
let messagesBadge;
let friendsListContainer;
let friendRequestsBtn; // Referencia al botón de solicitudes de amistad
let messagesBtn; // Referencia al botón de mensajes

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
        'Colombia': '�🇴',
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
    // Asegurarse de que el badge exista antes de intentar manipularlo
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    if (!friendRequestsBadge) {
        console.warn('Elemento #friend-requests-badge no encontrado. No se puede actualizar el conteo de solicitudes.');
        return;
    }
    if (!currentUserId) {
        console.warn('loadPendingFriendRequestsCount: currentUserId es nulo. No se puede cargar el conteo.');
        friendRequestsBadge.classList.add('hidden'); // Ocultar si no hay usuario
        return;
    }
    try {
        const { count, error } = await supabase
            .from('friend_requests')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('status', 'pending');

        if (error) {
            throw error;
        }

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

/**
 * Muestra un modal con las solicitudes de amistad pendientes para el usuario actual.
 */
export async function showFriendRequestsModal() {
    const { data: { user } = {} } = await supabase.auth.getUser(); // Añadir valor por defecto para user
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver las solicitudes de amistad.');
        return;
    }

    try {
        // ESPECIFICAR LA RELACIÓN PARA EL REMITENTE (sender_id)
        // Usamos 'profiles!friend_requests_sender_id_fkey' que definimos en el SQL
        const { data: requests, error } = await supabase
            .from('friend_requests')
            .select('id, sender_id, sender_profile:profiles!friend_requests_sender_id_fkey(username)')
            .eq('receiver_id', user.id)
            .eq('status', 'pending');

        if (error) {
            throw error;
        }

        let requestsHtml = '';
        if (requests && requests.length > 0) {
            requestsHtml = requests.map(req => `
                <div class="friend-request-item">
                    <p><i class="fas fa-user-plus"></i> <strong>${req.sender_profile ? req.sender_profile.username : 'Usuario Desconocido'}</strong> te ha enviado una solicitud.</p>
                    <div class="request-actions">
                        <button class="accept-btn" data-request-id="${req.id}" data-sender-id="${req.sender_id}" data-sender-username="${req.sender_profile ? req.sender_profile.username : 'Usuario Desconocido'}">
                            <i class="fas fa-check"></i> Aceptar
                        </button>
                        <button class="reject-btn" data-request-id="${req.id}" data-sender-username="${req.sender_profile ? req.sender_profile.username : 'Usuario Desconocido'}">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            requestsHtml = '<p>No tienes solicitudes de amistad pendientes.</p>';
        }

        // El .then() se ejecuta cuando el modal se cierra, no cuando se abre.
        // Los event listeners deben adjuntarse después de que el modal se haya renderizado.
        // SweetAlert2 tiene un hook `didOpen` para esto.
        Swal.fire({
            icon: 'info',
            title: 'Solicitudes de Amistad',
            html: `<div class="friend-requests-list">${requestsHtml}</div>`,
            confirmButtonText: 'Cerrar', // Un botón de cierre general para el modal
            customClass: {
                popup: 'swal2-profile-popup',
                title: 'swal2-profile-title',
                htmlContainer: 'swal2-profile-html',
                confirmButton: 'swal2-profile-confirm-button'
            },
            buttonsStyling: false,
            showCancelButton: false, // No mostrar botón de cancelar
            didOpen: (popup) => {
                // Añadir event listeners a los botones de aceptar y rechazar dentro del modal de SweetAlert
                popup.querySelectorAll('.accept-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const requestId = event.currentTarget.dataset.requestId;
                        const senderId = event.currentTarget.dataset.senderId;
                        const senderUsername = event.currentTarget.dataset.senderUsername;
                        await handleAcceptFriendRequest(requestId, senderId, senderUsername, user.id);
                        Swal.close(); // Cierra el modal después de aceptar
                    });
                });
                popup.querySelectorAll('.reject-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const requestId = event.currentTarget.dataset.requestId;
                        const senderUsername = event.currentTarget.dataset.senderUsername;
                        await handleRejectFriendRequest(requestId, senderUsername, user.id);
                        Swal.close(); // Cierra el modal después de rechazar
                    });
                });
            }
        }).then(() => {
            // Este .then() se ejecuta cuando el modal se cierra (por el botón "Cerrar" o por clic fuera)
            loadPendingFriendRequestsCount(user.id);
            loadFriendsList(user.id);
        });

    } catch (error) {
        console.error('Error al cargar solicitudes de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar las solicitudes: ${error.message}`);
    }
}

/**
 * Acepta una solicitud de amistad y actualiza el estado en la base de datos.
 * @param {string} requestId - El ID de la solicitud de amistad.
 * @param {string} senderId - El ID del usuario que envió la solicitud.
 * @param {string} senderUsername - El nombre de usuario del remitente.
 * @param {string} receiverId - El ID del usuario que está aceptando la solicitud.
 */
export async function handleAcceptFriendRequest(requestId, senderId, senderUsername, receiverId) {
    try {
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('sender_id', senderId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending'); // Asegurarse de que solo se actualicen las pendientes

        if (updateError) {
            throw updateError;
        }

        // Insertar la relación bidireccional en la tabla 'friends'
        // Aseguramos que user1_id sea siempre menor que user2_id para la restricción UNIQUE
        const [id1, id2] = [receiverId, senderId].sort();

        const { error: insertError } = await supabase.from('friends').insert([
            { user1_id: id1, user2_id: id2 }
        ]);

        if (insertError) {
            // Si el error es por duplicado (ya son amigos por alguna razón), no es crítico
            if (insertError.code === '23505') { // Código de error para violación de unique constraint
                console.warn('Intento de insertar amistad duplicada, ignorado.');
            } else {
                throw insertError;
            }
        }

        showCustomSwal('success', '¡Amistad Aceptada!', `¡Ahora eres amigo de <strong>${senderUsername}</strong>!`);
        await loadPendingFriendRequestsCount(receiverId); // Recargar conteo del badge
        await loadFriendsList(receiverId); // Recargar lista de amigos en el dashboard
    }
    catch (error) {
        console.error('Error al aceptar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo aceptar la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Rechaza una solicitud de amistad y actualiza el estado en la base de datos.
 * @param {string} requestId - El ID de la solicitud de amistad.
 * @param {string} senderUsername - El nombre de usuario del remitente.
 * @param {string} receiverId - El ID del usuario que está rechazando la solicitud.
 */
export async function handleRejectFriendRequest(requestId, senderUsername, receiverId) {
    try {
        // Cambiado de update a delete, según la solicitud del usuario
        const { error: deleteError } = await supabase
            .from('friend_requests')
            .delete() // Eliminar la solicitud
            .eq('id', requestId)
            .eq('receiver_id', receiverId)
            .eq('status', 'pending'); // Asegurarse de que solo se eliminen las pendientes

        if (deleteError) {
            throw deleteError;
        }

        showCustomSwal('info', 'Solicitud Rechazada', `Has rechazado la solicitud de amistad de <strong>${senderUsername}</strong>. ¡La solicitud ha sido eliminada!`);
        await loadPendingFriendRequestsCount(receiverId); // Recargar conteo
    } catch (error) {
        console.error('Error al rechazar solicitud de amistad:', error.message);
        showCustomSwal('error', 'Error', `No se pudo rechazar la solicitud de amistad: ${error.message}`);
    }
}

/**
 * Carga y muestra la lista de amigos del usuario actual en una tabla.
 * @param {string} currentUserId - ID del usuario actual.
 */
export async function loadFriendsList(currentUserId) {
    // Asegurarse de que el contenedor exista antes de intentar manipularlo
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

    friendsListContainer.innerHTML = '<p>Cargando lista de amigos...</p>'; // Mensaje de carga

    try {
        // OBTENER IDs de amigos de la tabla 'friends'
        // Usamos los nombres de las claves foráneas que definimos en el SQL:
        // 'profiles!friends_user1_id_fkey' y 'profiles!friends_user2_id_fkey'
        const { data: friendsData, error: friendsError } = await supabase
            .from('friends')
            .select(`
                user1_id,
                user2_id,
                user1_profile:profiles!friends_user1_id_fkey(username, gold, diamonds, country),
                user2_profile:profiles!friends_user2_id_fkey(username, gold, diamonds, country)
            `)
            .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

        if (friendsError) {
            throw friendsError;
        }

        const uniqueFriends = new Map(); // Usar un Map para evitar duplicados y almacenar el perfil completo
        friendsData.forEach(friendship => {
            let friendProfile = null;
            // Determinar cuál de los dos usuarios en la amistad es el "otro"
            if (friendship.user1_id === currentUserId) {
                friendProfile = friendship.user2_profile;
            } else if (friendship.user2_id === currentUserId) {
                friendProfile = friendship.user1_profile;
            }

            if (friendProfile && friendProfile.username) {
                // Usar el ID del perfil como clave para el Map para asegurar unicidad
                const friendId = friendship.user1_id === currentUserId ? friendship.user2_id : friendship.user1_id;
                uniqueFriends.set(friendId, friendProfile);
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
                        <th>País</th>
                    </tr>
                </thead>
                <tbody>
        `;
        friends.forEach(friend => {
            tableHtml += `
                <tr>
                    <td>${friend.username || 'Desconocido'}</td>
                    <td>${friend.gold || 0} <i class="fas fa-coins currency-icon gold-icon"></i></td>
                    <td>${friend.diamonds || 0} <i class="fas fa-gem currency-icon diamond-icon"></i></td>
                    <td>${getCountryFlagEmoji(friend.country)} ${friend.country || 'N/A'}</td>
                </tr>
            `;
        });
        tableHtml += `
                </tbody>
            </table>
        `;
        friendsListContainer.innerHTML = tableHtml;

    } catch (error) {
        console.error('Error al cargar la lista de amigos:', error.message);
        friendsListContainer.innerHTML = `<p>Error al cargar la lista de amigos: ${error.message}</p>`;
    }
}


// ====================================================================================
// LÓGICA DE MENSAJES (Exportadas)
// ====================================================================================

/**
 * Carga y actualiza el badge de mensajes no leídos.
 * (Esta es una implementación básica, necesitarías un campo 'read' en la tabla chat_messages)
 * @param {string} currentUserId - ID del usuario actual.
 */
export async function loadUnreadMessagesCount(currentUserId) {
    // Asegurarse de que el badge exista antes de intentar manipularlo
    messagesBadge = document.getElementById('messages-badge');
    if (!messagesBadge) {
        console.warn('Elemento #messages-badge no encontrado. No se puede actualizar el conteo de mensajes no leídos.');
        return;
    }
    if (!currentUserId) {
        console.warn('loadUnreadMessagesCount: currentUserId es nulo. No se puede cargar el conteo.');
        messagesBadge.classList.add('hidden'); // Ocultar si no hay usuario
        return;
    }
    try {
        // Asumiendo que tienes una columna 'is_read' en tu tabla 'chat_messages'
        // Si no la tienes, esta función solo contará todos los mensajes recibidos.
        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('is_read', false); // Necesitarías añadir esta columna y gestionarla

        if (error) {
            throw error;
        }

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
    const { data: { user } = {} } = await supabase.auth.getUser(); // Añadir valor por defecto para user
    if (!user) {
        showCustomSwal('warning', 'Error', 'Debes iniciar sesión para ver tus mensajes.');
        return;
    }

    try {
        // Obtener todos los mensajes donde el usuario es remitente o receptor
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
            .order('created_at', { ascending: true }); // Ordenar por fecha para ver la conversación

        if (error) {
            throw error;
        }

        // Agrupar mensajes por conversación (entre dos usuarios)
        const conversations = {};
        messages.forEach(msg => {
            const participant1 = msg.sender_id;
            const participant2 = msg.receiver_id;
            // Crear una clave de conversación consistente, ordenando los IDs
            const convoKey = [participant1, participant2].sort().join('-');
            
            if (!conversations[convoKey]) {
                conversations[convoKey] = {
                    otherUserId: participant1 === user.id ? participant2 : participant1,
                    otherUsername: participant1 === user.id ? (msg.receiver ? msg.receiver.username : 'Desconocido') : (msg.sender ? msg.sender.username : 'Desconocido'),
                    messages: []
                };
            }
            conversations[convoKey].messages.push(msg);
        });

        let conversationsHtml = '';
        if (Object.keys(conversations).length > 0) {
            conversationsHtml = Object.values(conversations).map(convo => `
                <div class="conversation-item" data-other-user-id="${convo.otherUserId}" data-other-username="${convo.otherUsername}">
                    <i class="fas fa-comment"></i> <strong>${convo.otherUsername}</strong>
                    <span class="last-message-preview">${convo.messages[convo.messages.length - 1].message.substring(0, 30)}...</span>
                </div>
            `).join('');
        } else {
            conversationsHtml = '<p>No tienes conversaciones. ¡Envía un mensaje a un amigo!</p>';
        }

        showCustomSwal('info', 'Tus Mensajes', `<div class="conversations-list">${conversationsHtml}</div>`).then(() => {
            // Después de cerrar el modal, asegúrate de recargar los contadores
            loadUnreadMessagesCount(user.id);
            // Añadir event listeners a los elementos de conversación dentro del modal de SweetAlert
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.addEventListener('click', () => {
                    const otherUserId = item.dataset.otherUserId;
                    const otherUsername = item.dataset.otherUsername;
                    Swal.close(); // Cierra el modal de conversaciones
                    // Asegurarse de pasar los mensajes correctos para esta conversación
                    const convoKeyForChat = [user.id, otherUserId].sort().join('-');
                    showChatWindow(user.id, otherUserId, otherUsername, conversations[convoKeyForChat].messages);
                });
            });
        });

    } catch (error) {
        console.error('Error al cargar mensajes:', error.message);
        showCustomSwal('error', 'Error', `No se pudieron cargar los mensajes: ${error.message}`);
    }
}

/**
 * Muestra una ventana de chat para una conversación específica.
 * @param {string} currentUserId - ID del usuario actual.
 * @param {string} otherUserId - ID del otro participante en la conversación.
 * @param {string} otherUsername - Nombre de usuario del otro participante.
 * @param {Array} messages - Array de mensajes de esta conversación.
 */
export async function showChatWindow(currentUserId, otherUserId, otherUsername, messages) {
    let chatMessagesHtml = messages.map(msg => `
        <div class="chat-message ${msg.sender_id === currentUserId ? 'sent' : 'received'}">
            <span class="message-sender">${msg.sender_id === currentUserId ? 'Tú' : (msg.sender ? msg.sender.username : 'Desconocido')}:</span>
            <span class="message-text">${msg.message}</span>
            <span class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</span>
        </div>
    `).join('');

    showCustomSwal('info', `Chat con <strong>${otherUsername}</strong>`, `
        <div class="chat-window">
            <div class="chat-messages-display">${chatMessagesHtml}</div>
            <textarea id="chat-input" class="swal2-input chat-input" placeholder="Escribe tu mensaje..."></textarea>
        </div>
    `, 'Enviar').then(async (result) => {
        if (result.isConfirmed) {
            const messageInput = Swal.getPopup().querySelector('#chat-input');
            const messageText = messageInput ? messageInput.value : '';
            if (!messageText || messageText.trim() === '') {
                showCustomSwal('warning', 'Atención', 'El mensaje no puede estar vacío.');
                // Reabrir el chat si el mensaje está vacío
                showChatWindow(currentUserId, otherUserId, otherUsername, messages);
                return;
            }
            await handleSendMessage(currentUserId, otherUserId, messageText);
            // Después de enviar, recargar la ventana de chat para ver el nuevo mensaje
            const newMessage = {
                sender_id: currentUserId,
                receiver_id: otherUserId,
                message: messageText,
                created_at: new Date().toISOString(),
                sender: { username: 'Tú' }, // Simular para display inmediato
                receiver: { username: otherUsername }
            };
            // Para asegurar que los mensajes se muestren en orden, concatena y ordena
            const updatedMessages = messages.concat([newMessage]).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            showChatWindow(currentUserId, otherUserId, otherUsername, updatedMessages);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Si el usuario cierra el chat, puede que quiera volver a la lista de conversaciones
            showMessagesModal();
        }
    });

    // Scroll al final del chat después de que el modal se abra
    setTimeout(() => {
        const chatDisplay = Swal.getPopup()?.querySelector('.chat-messages-display');
        if (chatDisplay) {
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }
    }, 150); // Un pequeño retraso para asegurar que el DOM del modal esté listo
}

/**
 * Envía un mensaje y lo guarda en la base de datos.
 * @param {string} senderId - ID del usuario que envía el mensaje.
 * @param {string} receiverId - ID del usuario que recibe el mensaje.
 * @param {string} messageText - Contenido del mensaje.
 */
export async function handleSendMessage(senderId, receiverId, messageText) {
    try {
        const { error: insertError } = await supabase
            .from('chat_messages')
            .insert([{ sender_id: senderId, receiver_id: receiverId, message: messageText, is_read: false }]); // is_read por defecto a false

        if (insertError) {
            throw insertError;
        }
        console.log('Mensaje enviado con éxito.');
        // No recargamos el badge del receptor aquí, se hará al reabrir el modal de mensajes
    } catch (error) {
        console.error('Error al enviar mensaje:', error.message);
        showCustomSwal('error', 'Error', 'No se pudo enviar el mensaje.');
    }
}

// ====================================================================================
// INICIALIZACIÓN DE socialLogic.js AL CARGAR EL DOM
// ====================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Asignar referencias a elementos DOM específicos de este script
    friendRequestsBadge = document.getElementById('friend-requests-badge');
    messagesBadge = document.getElementById('messages-badge');
    friendsListContainer = document.getElementById('friends-list-container');
    friendRequestsBtn = document.getElementById('friend-requests-btn');
    messagesBtn = document.getElementById('messages-btn');

    // Añadir event listeners a los botones si existen
    if (friendRequestsBtn) {
        friendRequestsBtn.addEventListener('click', showFriendRequestsModal);
    }
    if (messagesBtn) {
        messagesBtn.addEventListener('click', showMessagesModal);
    }

    // Cargar los conteos iniciales si el usuario ya está autenticado
    // Esto se manejará mejor a través de la función loadUserProfile en script.js
    // que se llama en el onAuthStateChange.
});
