// js/index.js

import { supabase, showLoader, hideLoader, showSwal, signOut } from './main.js';

// --- Referencias a Elementos HTML de index.html ---
const initialOptionsDiv = document.getElementById('initial-options');
const signupFormDiv = document.getElementById('signup-form');
const loginFormDiv = document.getElementById('login-form');

const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const registerBtn = document.getElementById('register-btn');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('login-submit-btn');

const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const backToOptionsFromSignup = document.getElementById('back-to-options-from-signup');
const backToOptionsFromLogin = document.getElementById('back-to-options-from-login');
const forgotPasswordLink = document.getElementById('forgot-password');

// --- Funciones de Utilidad Específicas de index.html ---
function hideAllForms() {
    if (initialOptionsDiv) initialOptionsDiv.classList.add('form-hidden');
    if (signupFormDiv) signupFormDiv.classList.add('form-hidden');
    if (loginFormDiv) loginFormDiv.classList.add('form-hidden');
    // dashboardDiv y authMessage no existen en index.html, no se necesitan aquí
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

// --- Funciones de Autenticación Específicas de index.html ---
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

// --- Lógica de inicialización para index.html ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cargando script en index.html');

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

    // Observador de estado de autenticación: redirigir si ya está logueado
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth event in index.html:', event, 'Session:', session);
        if (session && session.user) {
            console.log('Usuario autenticado. Redirigiendo a dashboard.html');
            window.location.href = 'dashboard.html';
        } else {
            showInitialOptions();
        }
    });

    // Al cargar index.html, comprobar si hay sesión para redirigir
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        console.log('Usuario ya logueado al cargar index.html. Redirigiendo...');
        window.location.href = 'dashboard.html';
    } else {
        showInitialOptions();
    }
});