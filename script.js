// script.js - Lógica de Autenticación y Perfil (para index.html, dashboard.html, profile.html)

// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Importa las funciones sociales desde socialLogic.js
import { 
    loadPendingFriendRequestsCount, 
    loadUnreadMessagesCount, 
    loadFriendsList, 
    setupFriendsRealtimeSubscription 
} from './socialLogic.js';


// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- 2. Referencias a Elementos HTML ---
// Se declaran aquí para que sean accesibles en todo el script, pero se asignan cuando el DOM está listo.
let initialOptionsDiv, signupFormDiv, loginFormDiv;
let signupEmail, signupPassword, registerBtn;
let loginEmail, loginPassword, loginSubmitBtn;
let showSignupBtn, showLoginBtn;
let backToOptionsFromSignup, backToOptionsFromLogin;
let forgotPasswordLink;

// Elementos de la nueva estructura del dashboard
let dashboardDiv;
let userEmailDashboardSpan, goldDisplayDashboard, diamondsDisplayDashboard, pearlsDisplayDashboard;
let profileBtnDashboard, logoutBtnDashboard;
let shopBtn;
let loaderDiv, loaderText;

// Elementos del perfil (se asumen que no han cambiado)
let profileCard;
let userEmailProfileSpan, usernameInputProfile, countryInputProfile;
let saveProfileBtn, backToDashboardBtn, configureBtn;
let goldDisplayProfile, diamondsDisplayProfile, pearlsDisplayProfile;

// Elementos de la lógica del avatar (si es que existe)
let avatarImg;
let avatarUploadInput;
let changeAvatarBtn;

// --- 3. Funciones de Utilidad (Ajustadas para SweetAlert2 y Loader) ---

/**
 * Muestra el cargador con un mensaje opcional.
 * @param {string} message - El mensaje a mostrar en el cargador.
 */
function showLoader(message = 'Cargando...') {
    if (loaderDiv) {
        if (loaderText) {
            loaderText.textContent = message;
        }
        loaderDiv.classList.remove('loader-hidden');
    }
}

/**
 * Oculta el cargador.
 */
function hideLoader() {
    if (loaderDiv) {
        loaderDiv.classList.add('loader-hidden');
    }
}

/**
 * Muestra un SweetAlert2 con un ícono, título y texto.
 * @param {string} icon - El ícono a mostrar ('success', 'error', 'warning', 'info', 'question').
 * @param {string} title - El título de la alerta.
 * @param {string} text - El texto del cuerpo de la alerta.
 */
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
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });

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
    } catch (e) {
        console.error("Error inesperado en signUp:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al registrarse.');
    } finally {
        hideLoader();
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
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
    } catch (e) {
        console.error("Error inesperado en signIn:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al iniciar sesión.');
    } finally {
        hideLoader();
    }
}

async function signOut() {
    showLoader('Cerrando sesión...');
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            showSwal('error', 'Error al cerrar sesión', 'No se pudo cerrar la sesión correctamente: ' + error.message);
        } else {
            showSwal('info', 'Sesión Cerrada', 'Has cerrado sesión. ¡Hasta pronto!');
            window.location.href = 'index.html';
        }
    } catch (e) {
        console.error("Error inesperado en signOut:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al cerrar sesión.');
    } finally {
        hideLoader();
    }
}

// --- 5. Funciones de Gestión de Perfil (usadas en dashboard.html y profile.html) ---
/**
 * Carga los datos del perfil del usuario, o crea uno si no existe.
 * @param {string} userId - El ID del usuario actual.
 */
async function loadUserProfile(userId) {
    showLoader('Cargando perfil...');
    let profileData = null;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, country, gold, diamonds, perla')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log('Perfil no encontrado, intentando crear uno básico.');
            const uniqueUsername = `jugador-${userId.slice(0, 8)}`;
            const newProfile = { 
                id: userId, 
                username: uniqueUsername, 
                country: 'Desconocido', 
                gold: 0, 
                diamonds: 0, 
                perla: 0 
            };
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([newProfile]);
            
            if (insertError) {
                console.error('Error al crear perfil básico:', insertError);
                showSwal('error', 'Error Crítico', 'No se pudo crear el perfil inicial: ' + insertError.message);
            } else {
                showSwal('info', 'Perfil Creado', 'Se ha generado un perfil básico. ¡Rellena tus datos en la sección de Perfil!');
                profileData = newProfile;
            }
        } else if (error) {
            console.error('Error al cargar perfil:', error);
            showSwal('error', 'Error de Perfil', 'No se pudo cargar la información de tu perfil: ' + error.message);
        } else {
            profileData = data;
        }

        if (profileData) {
            const user = (await supabase.auth.getUser()).data.user;
            
            // Actualizar datos en el dashboard
            if (userEmailDashboardSpan) userEmailDashboardSpan.textContent = user.email;
            if (goldDisplayDashboard) goldDisplayDashboard.textContent = profileData.gold;
            if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = profileData.diamonds;
            if (pearlsDisplayDashboard) pearlsDisplayDashboard.textContent = profileData.perla;

            // Actualizar datos en la página de perfil (si es la página actual)
            if (userEmailProfileSpan) userEmailProfileSpan.textContent = user.email;
            if (usernameInputProfile) usernameInputProfile.value = profileData.username || '';
            if (countryInputProfile) countryInputProfile.value = profileData.country || '';
            if (goldDisplayProfile) goldDisplayProfile.textContent = profileData.gold;
            if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = profileData.diamonds;
            if (pearlsDisplayProfile) pearlsDisplayProfile.textContent = profileData.perla;

            // Habilitar botón de la tienda (siempre habilitado)
            if (shopBtn) {
                shopBtn.disabled = false;
            }
        }
    
    } catch (e) {
        console.error("Error inesperado en loadUserProfile:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al cargar tu perfil.');
    } finally {
        hideLoader();
        // Mostrar el dashboard si está presente
        if (dashboardDiv) {
            dashboardDiv.classList.remove('dashboard-hidden');
        }
        // Mostrar la tarjeta de perfil si está presente
        if (profileCard) {
            profileCard.classList.remove('dashboard-hidden');
        }
    }
}

async function saveProfile() {
    try {
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
        
        if (error) {
            showSwal('error', 'Error al guardar', 'No se pudo guardar tu perfil: ' + error.message);
        } else {
            showSwal('success', '¡Perfil Guardado!', 'Tu información de perfil ha sido actualizada.');
            await loadUserProfile(user.id);
        }
    } catch (e) {
        console.error("Error inesperado en saveProfile:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al guardar el perfil.');
    } finally {
        hideLoader();
    }
}

async function giveGold() {
    try {
        showLoader('Dando oro...');
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            showSwal('error', 'Error', 'No hay sesión activa.');
            return;
        }

        const { data: currentProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('gold')
            .eq('id', user.id)
            .single();

        if (fetchError) {
            showSwal('error', 'Error', 'No se pudo obtener el oro actual.');
            return;
        }

        const newGold = (currentProfile.gold || 0) + 10;

        const { error } = await supabase
            .from('profiles')
            .update({ gold: newGold })
            .eq('id', user.id);

        if (error) {
            showSwal('error', 'Error al dar oro', 'No se pudo actualizar el oro: ' + error.message);
        } else {
            if (goldDisplayProfile) goldDisplayProfile.textContent = newGold;
            if (goldDisplayDashboard) goldDisplayDashboard.textContent = newGold;
            showSwal('success', '¡Oro Obtenido!', `Has recibido 10 de oro. Total: ${newGold}`);
        }
    } catch (e) {
        console.error("Error inesperado en giveGold:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al dar oro.');
    } finally {
        hideLoader();
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
            return;
        } else {
            showInitialOptions();

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
                        try {
                            const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
                                redirectTo: window.location.origin + '/reset-password.html'
                            });
                            if (error) {
                                showSwal('error', 'Error', 'No se pudo enviar el correo de recuperación: ' + error.message);
                            } else {
                                showSwal('success', 'Enlace enviado', 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.');
                            }
                        } catch (e) {
                               console.error("Error inesperado al restablecer contraseña:", e);
                               showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al enviar el enlace.');
                        } finally {
                            hideLoader();
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

        // Asignar referencias a elementos del dashboard/perfil según la nueva estructura
        dashboardDiv = document.getElementById('dashboard');
        userEmailDashboardSpan = document.getElementById('user-email');
        goldDisplayDashboard = document.getElementById('gold-display');
        diamondsDisplayDashboard = document.getElementById('diamonds-display');
        pearlsDisplayDashboard = document.getElementById('pearl-display');
        profileBtnDashboard = document.getElementById('profile-btn');
        logoutBtnDashboard = document.getElementById('logout-btn');
        shopBtn = document.getElementById('shop-btn');
        loaderDiv = document.getElementById('loader');
        loaderText = loaderDiv ? loaderDiv.querySelector('p') : null;


        // Siempre verifica la sesión al cargar estas páginas
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Usuario autenticado: Cargar perfil y mostrar contenido
            await loadUserProfile(user.id);
            await loadPendingFriendRequestsCount(user.id);
            await loadUnreadMessagesCount(user.id);
            await loadFriendsList(user.id);
            setupFriendsRealtimeSubscription();

            if (currentPage === 'dashboard.html') {
                if (profileBtnDashboard) {
                    profileBtnDashboard.addEventListener('click', () => {
                        window.location.href = 'profile.html';
                    });
                }
                if (logoutBtnDashboard) logoutBtnDashboard.addEventListener('click', signOut);

                // Listener para el botón de la tienda
                if (shopBtn) {
                    shopBtn.addEventListener('click', () => {
                        window.location.href = 'tienda.html';
                    });
                }
            } else if (currentPage === 'profile.html') {
                // Aquí deberías tener las referencias a los elementos del perfil
                profileCard = document.getElementById('profile-card');
                userEmailProfileSpan = document.getElementById('user-email-profile');
                usernameInputProfile = document.getElementById('edit-username');
                countryInputProfile = document.getElementById('edit-country');
                saveProfileBtn = document.getElementById('save-profile-btn');
                backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
                configureBtn = document.getElementById('configure-btn');
                goldDisplayProfile = document.getElementById('gold-display-profile');
                diamondsDisplayProfile = document.getElementById('diamonds-display-profile');
                pearlsDisplayProfile = document.getElementById('pearl-display-profile');
                
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
});

// Este listener se activa cuando la página se carga desde la caché (por ejemplo, al usar el botón "Atrás")
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('Regresando de otra página, el evento pageshow se ha activado.');
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    loadUserProfile(user.id);
                }
            });
        }
    }
});
