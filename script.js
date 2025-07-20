// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
// *** ¡IMPORTANTE: Usar la versión 'esm' de la librería! ***
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/dist/esm/supabase.min.js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

// Inicializa el cliente de Supabase usando la función importada
// Ahora NO usamos 'Supabase.createClient', sino 'createClient' directamente
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML ---
// Declaración de variables (se inicializarán cuando el DOM esté listo)
let signupEmail, signupPassword, signupBtn;
let loginEmail, loginPassword, loginBtn;
let logoutBtn, authMessage, authFormsDiv, dashboardDiv, userEmailSpan;

// --- 3. Funciones de Autenticación ---

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
        authFormsDiv.style.display = 'none';
        dashboardDiv.style.display = 'block';
        userEmailSpan.textContent = user.email;
    } else {
        authFormsDiv.style.display = 'block';
        dashboardDiv.style.display = 'none';
        userEmailSpan.textContent = '';
    }
}

// --- 4. Event Listener para esperar que el DOM esté completamente cargado ---
// Como el script se carga como 'type="module"', ya se ejecuta de forma diferida.
// Aún así, es buena práctica esperar por DOMContentLoaded para asegurar que todos los elementos HTML existen.
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referencias a los elementos HTML
    signupEmail = document.getElementById('signup-email');
    signupPassword = document.getElementById('signup-password');
    signupBtn = document.getElementById('signup-btn');

    loginEmail = document.getElementById('login-email');
    loginPassword = document.getElementById('login-password');
    loginBtn = document.getElementById('login-btn');

    logoutBtn = document.getElementById('logout-btn');
    authMessage = document.getElementById('auth-message');
    authFormsDiv = document.getElementById('auth-forms');
    dashboardDiv = document.getElementById('dashboard');
    userEmailSpan = document.getElementById('user-email');

    // --- 5. Event Listeners ---
    signupBtn.addEventListener('click', signUp);
    loginBtn.addEventListener('click', signIn);
    logoutBtn.addEventListener('click', signOut);

    // --- 6. Ejecutar al cargar la página ---
    checkUserSession();
});