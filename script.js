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




// --- 2. Referencias a Elementos HTML (Declaradas, asignadas dentro de DOMContentLoaded) ---
// Se declaran aquí para que sean accesibles en todo el script, pero se asignan cuando el DOM está listo.
let initialOptionsDiv, signupFormDiv, loginFormDiv;
let signupEmail, signupPassword, registerBtn;
let loginEmail, loginPassword, loginSubmitBtn;
let showSignupBtn, showLoginBtn;
let backToOptionsFromSignup, backToOptionsFromLogin;
let forgotPasswordLink;

let dashboardDiv;
let userEmailDashboardSpan, goldDisplayDashboard, diamondsDisplayDashboard, pearlsDisplayDashboard; // Referencia para las perlas en el dashboard
let profileBtnDashboard, logoutBtnDashboard;
let shopBtn; // Nueva referencia para el botón de la tienda


let profileCard;
let userEmailProfileSpan, usernameInputProfile, countryInputProfile;
let saveProfileBtn, backToDashboardBtn, configureBtn;
let goldDisplayProfile, diamondsDisplayProfile, pearlsDisplayProfile; // Referencia para las perlas en el perfil

let loaderDiv, loaderText;

let avatarImg; // Nueva referencia para la imagen del avatar
let avatarUploadInput; // Nueva referencia para el input de archivo
let changeAvatarBtn; // Nueva referencia para el botón de cambiar avatar


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

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, country, gold, diamonds, perla')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error al cargar perfil:', error);

            // Si el perfil no se encuentra (PGRST116), intenta crearlo
            if (error.code === 'PGRST116') {
                console.log('Perfil no encontrado, intentando crear uno básico.');
                
                // Genera un nombre de usuario único usando una porción del ID del usuario.
                const uniqueUsername = `jugador-${userId.slice(0, 8)}`;

                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ 
                        id: userId, 
                        username: uniqueUsername, // Usar el nombre de usuario único
                        country: 'Desconocido', 
                        gold: 0, 
                        diamonds: 0, 
                        perla: 0 
                    }]);
                
                if (insertError) {
                    console.error('Error al crear perfil básico:', insertError);
                    showSwal('error', 'Error Crítico', 'No se pudo crear el perfil inicial: ' + insertError.message);
                } else {
                    showSwal('info', 'Perfil Creado', 'Se ha generado un perfil básico. ¡Rellena tus datos en la sección de Perfil!');
                    await loadUserProfile(userId); // Se recarga para mostrar el perfil recién creado
                    return;
                }
            } else {
                showSwal('error', 'Error de Perfil', 'No se pudo cargar la información de tu perfil: ' + error.message);
            }
        } 
        
        if (data) {
            const user = (await supabase.auth.getUser()).data.user;

            // Actualizar datos en el dashboard
            if (userEmailDashboardSpan) userEmailDashboardSpan.textContent = user.email;
            if (goldDisplayDashboard) goldDisplayDashboard.textContent = data.gold;
            if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = data.diamonds;
            if (pearlsDisplayDashboard) pearlsDisplayDashboard.textContent = data.perla;

            // Actualizar datos en la página de perfil (si es la página actual)
            if (userEmailProfileSpan) userEmailProfileSpan.textContent = user.email;
            if (usernameInputProfile) usernameInputProfile.value = data.username || '';
            if (countryInputProfile) countryInputProfile.value = data.country || '';
            if (goldDisplayProfile) goldDisplayProfile.textContent = data.gold;
            if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = data.diamonds;
            if (pearlsDisplayProfile) pearlsDisplayDisplayProfile.textContent = data.perla;

            // Lógica para habilitar/deshabilitar el botón de la tienda
            if (shopBtn) {
                const perlas = parseInt(data.perla, 10);
                shopBtn.disabled = perlas <= 20;
            }
        }
    
    } catch (e) {
        console.error("Error inesperado en loadUserProfile:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al cargar tu perfil.');
    } finally {
        hideLoader();
        if (profileCard) {
            profileCard.classList.remove('dashboard-hidden');
        }
        if (dashboardDiv) {
            dashboardDiv.classList.remove('dashboard-hidden');
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
            await loadUserProfile(user.id); // Recargar el perfil para actualizar los spans mostrados
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
            if (goldDisplayProfile) goldDisplayProfile.textContent = newGold; // Actualiza solo en la página de perfil
            if (goldDisplayDashboard) goldDisplayDashboard.textContent = newGold; // Actualiza también en el dashboard si está visible
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

            // Este listener se dispara cuando el usuario verifica su correo y regresa a la página
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
        pearlsDisplayDashboard = document.getElementById('pearl-display');
        profileBtnDashboard = document.getElementById('profile-btn');
        logoutBtnDashboard = document.getElementById('logout-btn');
        shopBtn = document.getElementById('shop-btn'); // Asignación de la nueva variable

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


        // Siempre verifica la sesión al cargar estas páginas
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Usuario autenticado: Cargar perfil y mostrar contenido
            await loadUserProfile(user.id);

            // Cargar conteos y listas iniciales de socialLogic.js
            await loadPendingFriendRequestsCount(user.id);
            await loadUnreadMessagesCount(user.id);
            
            // ¡IMPORTANTE! Cargar la lista de amigos inicialmente
            await loadFriendsList(user.id); 
            
            // Luego, configura la suscripción Realtime para futuras actualizaciones
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
                        // Este código se ejecuta solo si el botón no está deshabilitado
                        window.location.href = 'tienda.html';
                    });
                }
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
});

function cargarPerfil() {
    console.log("Cargando el perfil...");
    // Aquí iría tu lógica actual, como una llamada a fetch() o a una función de la base de datos
    // para obtener los datos del usuario y mostrarlos en el dashboard.
    
    // Ejemplo de cómo podrías actualizar el DOM:
    const perfilDiv = document.getElementById('perfil-info');
    if (perfilDiv) {
        perfilDiv.innerHTML = '<h2>¡Perfil cargado!</h2><p>Bienvenido de nuevo, [Nombre de Usuario]</p>';
    }
}

// --- Nuevo código para solucionar el problema ---
// Este es el evento clave: 'pageshow'
window.addEventListener('pageshow', function(event) {
    // La propiedad 'persisted' es 'true' si la página se está mostrando desde la caché.
    // Esto significa que el usuario ha usado el botón de "atrás".
    if (event.persisted) {
        console.log('Regresando de otra página, el evento pageshow se ha activado.');
        cargarPerfil();
    } else {
        // Esto se ejecutará en la carga inicial de la página.
        console.log('Página cargada por primera vez.');
        // Puedes llamar a cargarPerfil() aquí también si no lo haces en otro sitio
        // para asegurarte de que siempre se carga.
        // cargarPerfil();
    }
});

// También puedes llamar a la función en el evento de carga inicial por si acaso,
// para cubrir todos los casos.
window.addEventListener('DOMContentLoaded', cargarPerfil);
