// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
// *** ¡IMPORTANTE: Usar la versión 'esm' de la librería! ***
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co'; // Asegúrate de que esta URL sea correcta para tu proyecto
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo'; // Asegúrate de que esta clave sea correcta y ANÓNIMA

// Inicializa el cliente de Supabase usando la función importada
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML ---
// Se inicializarán dentro de DOMContentLoaded
let signupEmail, signupPassword, registerBtn;
let loginEmail, loginPassword, loginSubmitBtn;
let logoutBtn, authMessage, userEmailSpan;
let initialOptionsDiv, signupFormDiv, loginFormDiv, dashboardDiv;
let showSignupBtn, showLoginBtn, backToOptionsFromSignup, backToOptionsFromLogin;

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
        // Opcional: limpiar los campos después de un registro exitoso
        signupEmail.value = '';
        signupPassword.value = '';
        hideAllFormsAndShowInitialOptions(); // Volver a las opciones iniciales
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
        // Opcional: limpiar los campos después de un login exitoso
        loginEmail.value = '';
        loginPassword.value = '';
        checkUserSession(); // Mostrar el dashboard
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
        checkUserSession(); // Volver a mostrar las opciones de auth
    }
}

async function checkUserSession() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Si hay un usuario logueado
        initialOptionsDiv.classList.add('form-hidden');
        signupFormDiv.classList.add('form-hidden');
        loginFormDiv.classList.add('form-hidden');
        dashboardDiv.classList.remove('dashboard-hidden'); // Mostrar dashboard
        userEmailSpan.textContent = user.email;
        authMessage.textContent = ''; // Limpiar mensaje de auth
    } else {
        // Si no hay usuario logueado
        hideAllFormsAndShowInitialOptions(); // Asegurarse de que solo se vean las opciones iniciales
        authMessage.textContent = ''; // Limpiar mensaje de auth
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
    authMessage.textContent = ''; // Limpiar mensaje al cambiar de formulario
}

function showLoginForm() {
    hideAllForms();
    loginFormDiv.classList.remove('form-hidden');
    authMessage.textContent = ''; // Limpiar mensaje al cambiar de formulario
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
    registerBtn = document.getElementById('register-btn'); // ID cambiado

    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    loginSubmitBtn = document.getElementById('login-submit-btn'); // ID cambiado

    logoutBtn = document.getElementById('logout-btn');
    authMessage = document.getElementById('auth-message');
    userEmailSpan = document.getElementById('user-email');

    // Referencias a los nuevos divs y botones
    initialOptionsDiv = document.getElementById('initial-options');
    signupFormDiv = document.getElementById('signup-form');
    loginFormDiv = document.getElementById('login-form');
    dashboardDiv = document.getElementById('dashboard');

    showSignupBtn = document.getElementById('show-signup-btn');
    showLoginBtn = document.getElementById('show-login-btn');
    backToOptionsFromSignup = document.getElementById('back-to-options-from-signup');
    backToOptionsFromLogin = document.getElementById('back-to-options-from-login');

    // --- 5. Event Listeners ---
    registerBtn.addEventListener('click', signUp); // ID cambiado
    loginSubmitBtn.addEventListener('click', signIn); // ID cambiado
    logoutBtn.addEventListener('click', signOut);

    // Nuevos Event Listeners para mostrar/ocultar formularios
    showSignupBtn.addEventListener('click', showSignupForm);
    showLoginBtn.addEventListener('click', showLoginForm);
    backToOptionsFromSignup.addEventListener('click', hideAllFormsAndShowInitialOptions);
    backToOptionsFromLogin.addEventListener('click', hideAllFormsAndShowInitialOptions);


    // --- 6. Ejecutar al cargar la página ---
    checkUserSession(); // Verifica si ya hay una sesión activa al cargar la página
});