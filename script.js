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