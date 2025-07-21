// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML (CONDICIONALES) ---
// Intentar obtener elementos, sabiendo que no todos existirán en todas las páginas
const initialOptionsDiv = document.getElementById('initial-options');
const signupFormDiv = document.getElementById('signup-form');
const loginFormDiv = document.getElementById('login-form');
const dashboardDiv = document.getElementById('dashboard'); // Podría existir o no

const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const registerBtn = document.getElementById('register-btn');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('login-submit-btn');

const authMessage = document.getElementById('auth-message'); // Puede existir en ambas, pero se usa más en index

const userEmailSpan = document.getElementById('user-email'); // Solo en dashboard.html
const logoutBtn = document.getElementById('logout-btn');     // Solo en dashboard.html

const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const backToOptionsFromSignup = document.getElementById('back-to-options-from-signup');
const backToOptionsFromLogin = document.getElementById('back-to-options-from-login');
const forgotPasswordLink = document.getElementById('forgot-password');

const googleLoginBtn = document.getElementById('btn-google-login');
const facebookLoginBtn = document.getElementById('btn-facebook-login');


// --- 3. Funciones de Utilidad (Ajustadas para la única página) ---
function showMessage(msg, type = 'info') {
    if (authMessage) { // Solo si el elemento de mensaje existe
        authMessage.textContent = msg;
        authMessage.style.display = 'block';
        authMessage.style.color = ''; // Reset
        authMessage.style.backgroundColor = ''; // Reset

        if (type === 'success') {
            authMessage.style.color = 'green';
        } else if (type === 'error') {
            authMessage.style.color = 'red';
        } else { // info
            authMessage.style.color = 'blue';
        }

        setTimeout(() => {
            if (authMessage) {
                authMessage.style.display = 'none';
                authMessage.textContent = '';
            }
        }, 4000);
    } else {
        console.log(`Mensaje (${type}): ${msg}`); // Fallback para consolas si no hay elemento
    }
}

function hideAllForms() {
    // Es crucial chequear si los elementos existen antes de manipularlos
    if (initialOptionsDiv) initialOptionsDiv.classList.add('form-hidden');
    if (signupFormDiv) signupFormDiv.classList.add('form-hidden');
    if (loginFormDiv) loginFormDiv.classList.add('form-hidden');
    if (dashboardDiv) dashboardDiv.classList.add('dashboard-hidden'); // Para el caso de dashboard.html
}

function showSignupForm() {
    hideAllForms();
    if (signupFormDiv) signupFormDiv.classList.remove('form-hidden');
    showMessage(''); // Limpiar mensaje al cambiar de form
}

function showLoginForm() {
    hideAllForms();
    if (loginFormDiv) loginFormDiv.classList.remove('form-hidden');
    showMessage(''); // Limpiar mensaje al cambiar de form
}

function showInitialOptions() {
    hideAllForms();
    if (initialOptionsDiv) initialOptionsDiv.classList.remove('form-hidden');
    showMessage(''); // Limpiar mensaje al volver
}


// --- 4. Funciones de Autenticación (con redirección condicional) ---

async function signUp() {
    const email = signupEmail.value;
    const password = signupPassword.value;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        showMessage('Error al registrarse: ' + error.message, 'error');
    } else {
        showMessage('¡Registro exitoso! Por favor, verifica tu correo.', 'success');
        if (loginFormDiv) { // Si estamos en index.html, mostramos el login
            showLoginForm();
        } else { // Si estamos en otra página (un improbable dashboard.html sin login), redirigimos
            window.location.href = 'index.html';
        }
    }
}

async function signIn() {
    const email = loginEmail.value;
    const password = loginPassword.value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showMessage('Error al iniciar sesión: ' + error.message, 'error');
    } else {
        showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
        // Redirigir siempre al dashboard
        window.location.href = 'dashboard.html';
    }
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showMessage('Error al cerrar sesión: ' + error.message, 'error');
    } else {
        showMessage('Sesión cerrada. ¡Hasta pronto!', 'blue');
        // Redirigir a la página de inicio después de cerrar sesión
        window.location.href = 'index.html';
    }
}

async function signInWithGoogle() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html',
            }
        });
        if (error) throw error;
        showMessage('Redirigiendo a Google para iniciar sesión...', 'info');
    } catch (error) {
        console.error('Error al iniciar sesión con Google:', error);
        showMessage('Error al iniciar sesión con Google: ' + error.message, 'error');
    }
}

async function signInWithFacebook() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: window.location.origin + '/dashboard.html',
            }
        });
        if (error) throw error;
        showMessage('Redirigiendo a Facebook para iniciar sesión...', 'info');
    } catch (error) {
        console.error('Error al iniciar sesión con Facebook:', error);
        showMessage('Error al iniciar sesión con Facebook: ' + error.message, 'error');
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
        if (googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);
        if (facebookLoginBtn) facebookLoginBtn.addEventListener('click', signInWithFacebook);
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Funcionalidad de recuperación de contraseña aún no implementada.');
                // supabase.auth.resetPasswordForEmail(...)
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