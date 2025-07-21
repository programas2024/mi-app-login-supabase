// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML (CONDICIONALES y ajustadas) ---
// Intentar obtener elementos, sabiendo que no todos existirán en todas las páginas
const initialOptionsDiv = document.getElementById('initial-options');
const signupFormDiv = document.getElementById('signup-form');
const loginFormDiv = document.getElementById('login-form');
const dashboardDiv = document.getElementById('dashboard'); // Podría existir o no (en dashboard.html)

const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const registerBtn = document.getElementById('register-btn');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('login-submit-btn');

// authMessage ya no se usa directamente para mostrar mensajes, sino para limpiar
const authMessage = document.getElementById('auth-message');

const userEmailSpan = document.getElementById('user-email'); // Solo en dashboard.html
const logoutBtn = document.getElementById('logout-btn');     // Solo en dashboard.html

const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const backToOptionsFromSignup = document.getElementById('back-to-options-from-signup');
const backToOptionsFromLogin = document.getElementById('back-to-options-from-login');
const forgotPasswordLink = document.getElementById('forgot-password');

const loaderDiv = document.getElementById('loader'); // Referencia al loader


// --- 3. Funciones de Utilidad (Ajustadas para SweetAlert2 y Loader) ---

function showLoader(message = 'Cargando...') {
    if (loaderDiv) {
        loaderDiv.querySelector('p').textContent = message;
        loaderDiv.classList.remove('loader-hidden');
    }
}

function hideLoader() {
    if (loaderDiv) {
        loaderDiv.classList.add('loader-hidden');
    }
}

// Función para mostrar mensajes con SweetAlert2// Función para mostrar mensajes con SweetAlert2
function showSwal(icon, title, text) {
    const isAutoClose = (icon === 'success' || icon === 'info'); // Determina si se cierra automáticamente

    Swal.fire({
        icon: icon, // 'success', 'error', 'info', 'warning', 'question'
        title: title,
        text: text,
        showConfirmButton: !isAutoClose, // Mostrar botón SOLO si NO se cierra automáticamente
        timer: isAutoClose ? 3000 : undefined, // Auto-cerrar después de 3 segundos si es éxito/info
        timerProgressBar: isAutoClose, // Mostrar barra de progreso solo si se auto-cierra
        didOpen: () => {
            // Opcional: si quieres hacer algo cuando se abre el SweetAlert
        },
        willClose: () => {
            // Opcional: si quieres hacer algo cuando se cierra el SweetAlert
        }
    });
}

function hideAllForms() {
    if (initialOptionsDiv) initialOptionsDiv.classList.add('form-hidden');
    if (signupFormDiv) signupFormDiv.classList.add('form-hidden');
    if (loginFormDiv) loginFormDiv.classList.add('form-hidden');
    if (dashboardDiv) dashboardDiv.classList.add('dashboard-hidden');
    if (authMessage) authMessage.style.display = 'none'; // Asegurar que el fallback de mensaje esté oculto
}

function showSignupForm() {
    hideAllForms();
    if (signupFormDiv) signupFormDiv.classList.remove('form-hidden');
}

function showLoginForm() {
    hideAllForms();
    if (loginFormDiv) loginFormDiv.classList.remove('form-hidden');
}

function showInitialOptions() {
    hideAllForms();
    if (initialOptionsDiv) initialOptionsDiv.classList.remove('form-hidden');
}


// --- 4. Funciones de Autenticación (con redirección y SweetAlert2) ---

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
        showLoginForm(); // Después de registrar, mostramos el formulario de login.
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
        // Redirigir siempre al dashboard
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
        // Redirigir a la página de inicio después de cerrar sesión
        window.location.href = 'index.html';
    }
}


// --- 5. Lógica de inicialización al cargar el DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    // Comprobar la URL actual para determinar el comportamiento
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        // Lógica para index.html (Autenticación y Redirección)
        console.log('Cargando script en index.html');

        // Asignar event listeners solo si los elementos existen en esta página
        if (registerBtn) registerBtn.addEventListener('click', signUp);
        if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', signIn);
        if (showSignupBtn) showSignupBtn.addEventListener('click', showSignupForm);
        if (showLoginBtn) showLoginBtn.addEventListener('click', showLoginForm);
        if (backToOptionsFromSignup) backToOptionsFromSignup.addEventListener('click', showInitialOptions);
        if (backToOptionsFromLogin) backToOptionsFromLogin.addEventListener('click', showInitialOptions);
        // Botones de social login REMOVIDOS
        // if (googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);
        // if (facebookLoginBtn) facebookLoginBtn.addEventListener('click', signInWithFacebook);

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
                        return null; // Válido
                    }
                });

                if (emailToReset) {
                    showLoader('Enviando enlace de recuperación...');
                    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
                        redirectTo: window.location.origin + '/reset-password.html' // O tu página de reset si la tienes
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


        // Observador de estado de autenticación para index.html: redirigir si ya está logueado
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event in index.html:', event, 'Session:', session);
            if (session && session.user) {
                console.log('Usuario autenticado. Redirigiendo a dashboard.html');
                window.location.href = 'dashboard.html';
            } else {
                showInitialOptions(); // Asegurarse de mostrar las opciones si no hay sesión
            }
        });

        // Al cargar index.html, comprobar si hay sesión para redirigir
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            console.log('Usuario ya logueado al cargar index.html. Redirigiendo...');
            window.location.href = 'dashboard.html';
        } else {
            showInitialOptions(); // Mostrar opciones de login/registro por defecto
        }

    } else if (currentPage === 'dashboard.html') {
        // Lógica para dashboard.html (Mostrar info de usuario y cerrar sesión)
        console.log('Cargando script en dashboard.html');

        // Asegurarse de que el usuario esté logueado para ver el dashboard
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            if (dashboardDiv && userEmailSpan) {
                dashboardDiv.classList.remove('dashboard-hidden');
                userEmailSpan.textContent = user.email || user.user_metadata?.full_name || 'Usuario';
            }
            if (logoutBtn) logoutBtn.addEventListener('click', signOut);
        } else {
            // Si no hay usuario, redirigir a index.html
            console.log('No hay usuario autenticado en dashboard.html. Redirigiendo a index.html');
            window.location.href = 'index.html';
        }

        // Observador de estado de autenticación para dashboard.html: redirigir si la sesión termina
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event in dashboard.html:', event, 'Session:', session);
            if (event === 'SIGNED_OUT' || !session) {
                console.log('Sesión terminada en dashboard.html. Redirigiendo a index.html.');
                window.location.href = 'index.html';
            }
        });
    }
});