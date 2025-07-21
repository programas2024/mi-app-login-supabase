// script.js

// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImexb3DSI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML (CONDICIONALES para todas las páginas) ---
// Elementos de autenticación (index.html)
const initialOptionsDiv = document.getElementById('initial-options');
const signupFormDiv = document.getElementById('signup-form');
const loginFormDiv = document.getElementById('login-form');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const registerBtn = document.getElementById('register-btn');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmitBtn = document = document.getElementById('login-submit-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const backToOptionsFromSignup = document.getElementById('back-to-options-from-signup');
const backToOptionsFromLogin = document.getElementById('back-to-options-from-login');
const forgotPasswordLink = document.getElementById('forgot-password');

// Elementos del Dashboard (dashboard.html)
const dashboardDiv = document.getElementById('dashboard');
const userEmailDashboardSpan = document.getElementById('user-email'); // Usado en dashboard
const goldDisplayDashboard = document.getElementById('gold-display');
const diamondsDisplayDashboard = document.getElementById('diamonds-display');
const profileBtnDashboard = document.getElementById('profile-btn');
const logoutBtnDashboard = document.getElementById('logout-btn');

// Elementos del Perfil (profile.html)
const profileCard = document.getElementById('profile-card'); // Contenedor principal del perfil
const userEmailProfileSpan = document.getElementById('user-email-profile'); // Usado en profile
const usernameInputProfile = document.getElementById('edit-username');
const countryInputProfile = document.getElementById('edit-country');
const saveProfileBtn = document.getElementById('save-profile-btn');
// const giveGoldBtnProfile = document.getElementById('give-gold-btn'); // ELIMINADO: ahora en SweetAlert
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn'); // Ahora un botón de regreso fijo
// const logoutBtnProfile = document.getElementById('logout-btn-profile'); // ELIMINADO: ahora en SweetAlert
const configureBtn = document.getElementById('configure-btn'); // Nuevo botón de configuración
const goldDisplayProfile = document.getElementById('gold-display-profile');
const diamondsDisplayProfile = document.getElementById('diamonds-display-profile');


const loaderDiv = document.getElementById('loader'); // Loader global
const loaderText = loaderDiv ? loaderDiv.querySelector('p') : null; // Aseguramos que se obtenga el <p>


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
                    
                    // Actualizamos manualmente los campos con los datos por defecto para evitar otra carga
                    if (userEmailProfileSpan) userEmailProfileSpan.textContent = (await supabase.auth.getUser()).data.user.email;
                    if (usernameInputProfile) usernameInputProfile.value = 'Nuevo Jugador';
                    if (countryInputProfile) countryInputProfile.value = 'Desconocido';
                    if (goldDisplayProfile) goldDisplayProfile.textContent = '0';
                    if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = '0';
                }
            }
        } else if (data) {
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
        // Aseguramos que la tarjeta de perfil sea visible DESPUÉS de ocultar el loader
        if (profileCard) {
            profileCard.classList.remove('dashboard-hidden');
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
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        confirmButtonText: 'Ok', // Este botón será invisible, solo para la estructura
        showConfirmButton: false, // Escondemos el botón principal
        allowOutsideClick: true,
        html: `
            <div class="swal-custom-buttons-container">
                <button id="swal-give-gold" class="swal-custom-btn swal-btn-gold"><i class="fas fa-coins"></i> Recibir 10 de Oro</button>
                <button id="swal-logout" class="swal-custom-btn swal-btn-logout"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
            </div>
        `,
        didOpen: () => {
            // Añadir event listeners a los botones personalizados dentro del SweetAlert
            document.getElementById('swal-give-gold').addEventListener('click', async () => {
                Swal.close(); // Cerrar el modal antes de ejecutar la acción
                await giveGold();
            });
            document.getElementById('swal-logout').addEventListener('click', async () => {
                Swal.close(); // Cerrar el modal antes de ejecutar la acción
                await signOut();
            });
        },
        customClass: {
            popup: 'swal2-modern',
            htmlContainer: 'swal2-html-container-no-padding' // Clases para personalizar el SweetAlert
        },
        buttonsStyling: false // Deshabilita los estilos por defecto de SweetAlert2 en los botones
    });
}


// --- 6. Lógica de inicialización al cargar el DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();

    // --- Lógica para index.html ---
    if (currentPage === 'index.html' || currentPage === '') {
        console.log('Cargando lógica de index.html');

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
            if (session && session.user) {
                console.log('Usuario autenticado. Redirigiendo a dashboard.html');
                window.location.href = 'dashboard.html';
            } else {
                showInitialOptions();
            }
        });

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            console.log('Usuario ya logueado al cargar index.html. Redirigiendo...');
            window.location.href = 'dashboard.html';
        } else {
            showInitialOptions();
        }

    } 
    // --- Lógica para dashboard.html ---
    else if (currentPage === 'dashboard.html') {
        console.log('Cargando lógica de dashboard.html');

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
    } 
    // --- Lógica para profile.html ---
    else if (currentPage === 'profile.html') {
        console.log('Cargando lógica de profile.html');

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Eliminado: if (profileCard) profileCard.classList.remove('dashboard-hidden');
            // Esto ahora se hace en el `finally` de `loadUserProfile`
            await loadUserProfile(user.id);

            if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
            // ELIMINADO: if (giveGoldBtnProfile) giveGoldBtnProfile.addEventListener('click', giveGold);
            if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
            // ELIMINADO: if (logoutBtnProfile) logoutBtnProfile.addEventListener('click', signOut);
            // Añadir event listener para el nuevo botón "Configurar"
            if (configureBtn) configureBtn.addEventListener('click', showConfigureOptions);

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
    }
});