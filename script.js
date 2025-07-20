// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
// *** ¡IMPORTANTE: Usar la versión 'esm' de la librería! ***
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co'; // Asegúrate de que esta URL sea correcta para tu proyecto
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo'; // Asegúrate de que esta clave sea correcta y ANÓNIMA

// Inicializa el cliente de Supabase usando la función importada
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML ---
let signupEmail, signupPassword, registerBtn;
let loginEmail, loginPassword, loginSubmitBtn;
let logoutBtn, authMessage, userEmailSpan;
let initialOptionsDiv, signupFormDiv, loginFormDiv, dashboardDiv;
let showSignupBtn, showLoginBtn, backToOptionsFromSignup, backToOptionsFromLogin;
let forgotPasswordLink; // Nueva referencia

// --- 3. Funciones de Autenticación (se mantienen igual) ---

async function signUp() {
    const email = signupEmail.value;
    const password = signupPassword.value;
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        authMessage.textContent = 'Error al registrarse: ' + error.message;
        authMessage.style.color = 'red';
    } else {
        authMessage.textContent = '¡Registro exitoso! Por favor, verifica tu correo.';
        authMessage.style.color = 'green';
        signupEmail.value = '';
        signupPassword.value = '';
        hideAllFormsAndShowInitialOptions();
    }
}

async function signIn() {
    const email = loginEmail.value;
    const password = loginPassword.value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        authMessage.textContent = 'Error al iniciar sesión: ' + error.message;
        authMessage.style.color = 'red';
    } else {
        authMessage.textContent = '¡Inicio de sesión exitoso!';
        authMessage.style.color = 'green';
        loginEmail.value = '';
        loginPassword.value = '';
        checkUserSession();
    }
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        authMessage.textContent = 'Error al cerrar sesión: ' + error.message;
        authMessage.style.color = 'red';
    } else {
        authMessage.textContent = 'Sesión cerrada. ¡Hasta pronto!';
        authMessage.style.color = 'blue';
        checkUserSession();
    }
}

async function checkUserSession() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        initialOptionsDiv.classList.add('form-hidden');
        signupFormDiv.classList.add('form-hidden');
        loginFormDiv.classList.add('form-hidden');
        dashboardDiv.classList.remove('dashboard-hidden');
        userEmailSpan.textContent = user.email;
        authMessage.textContent = '';
    } else {
        hideAllFormsAndShowInitialOptions();
        authMessage.textContent = '';
    }
}

// --- Nuevas funciones para controlar la visibilidad ---
function hideAllForms() {
    initialOptionsDiv.classList.add('form-hidden');
    signupFormDiv.classList.add('form-hidden');
    loginFormDiv.classList.add('form-hidden');
    dashboardDiv.classList.add('dashboard-hidden');
}

function showSignupForm() {
    hideAllForms();
    signupFormDiv.classList.remove('form-hidden');
    authMessage.textContent = '';
}

function showLoginForm() {
    hideAllForms();
    loginFormDiv.classList.remove('form-hidden');
    authMessage.textContent = '';
}

function hideAllFormsAndShowInitialOptions() {
    hideAllForms();
    initialOptionsDiv.classList.remove('form-hidden');
}

// --- 4. Event Listener para esperar que el DOM esté completamente cargado ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referencias a los elementos HTML
    signupEmail = document.getElementById('signup-email');
    signupPassword = document.getElementById('signup-password');
    registerBtn = document.getElementById('register-btn');

    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    loginSubmitBtn = document.getElementById('login-submit-btn');

    logoutBtn = document.getElementById('logout-btn');
    authMessage = document.getElementById('auth-message');
    userEmailSpan = document.getElementById('user-email');

    initialOptionsDiv = document.getElementById('initial-options');
    signupFormDiv = document.getElementById('signup-form');
    loginFormDiv = document.getElementById('login-form');
    dashboardDiv = document.getElementById('dashboard');

    showSignupBtn = document.getElementById('show-signup-btn');
    showLoginBtn = document.getElementById('show-login-btn');
    backToOptionsFromSignup = document.getElementById('back-to-options-from-signup');
    backToOptionsFromLogin = document.getElementById('back-to-options-from-login');
    forgotPasswordLink = document.getElementById('forgot-password'); // Nueva referencia

    // --- 5. Event Listeners ---
    registerBtn.addEventListener('click', signUp);
    loginSubmitBtn.addEventListener('click', signIn);
    logoutBtn.addEventListener('click', signOut);

    showSignupBtn.addEventListener('click', showSignupForm);
    showLoginBtn.addEventListener('click', showLoginForm);
    backToOptionsFromSignup.addEventListener('click', hideAllFormsAndShowInitialOptions);
    backToOptionsFromLogin.addEventListener('click', hideAllFormsAndShowInitialOptions);

    // Opcional: Event listener para "Olvidaste tu contraseña?"
    // forgotPasswordLink.addEventListener('click', () => {
    //     alert('Funcionalidad de recuperación de contraseña aún no implementada.');
    //     // Aquí podrías llamar a una función de Supabase para enviar un email de reseteo:
    //     // supabase.auth.resetPasswordForEmail(loginEmail.value, { redirectTo: 'URL_DE_RESETEO_EN_TU_APP' });
    // });

    // --- 6. Ejecutar al cargar la página ---
    checkUserSession();
});