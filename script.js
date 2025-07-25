// script.js - Lógica de Autenticación y Perfil (para index.html, dashboard.html, profile.html)

// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML (Declaradas, asignadas dentro de DOMContentLoaded) ---
// Se declaran aquí para que sean accesibles en todo el script, pero se asignan cuando el DOM está listo
// y solo si el elemento existe en la página actual.
let initialOptionsDiv, signupFormDiv, loginFormDiv;
let signupEmail, signupPassword, registerBtn;
let loginEmail, loginPassword, loginSubmitBtn;
let showSignupBtn, showLoginBtn;
let backToOptionsFromSignup, backToOptionsFromLogin;
let forgotPasswordLink;

let dashboardDiv;
let userEmailDashboardSpan, goldDisplayDashboard, diamondsDisplayDashboard;
let userRankingDashboardDisplay; // Para mostrar la posición en el ranking en el dashboard
let profileBtnDashboard, logoutBtnDashboard;

let profileCard;
let userEmailProfileSpan, usernameInputProfile, countryInputProfile;
let saveProfileBtn, backToDashboardBtn, configureBtn;
let goldDisplayProfile, diamondsDisplayProfile;
let userRankingProfileDisplay; // Para mostrar la posición en el ranking en el perfil

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
        // 1. Obtener los datos del perfil del usuario (oro, diamantes, nombre de usuario, país)
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username, country, gold, diamonds')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Error al cargar perfil básico:', profileError);
            if (profileError.code === 'PGRST116') { // No se encontraron filas (el perfil no existe)
                console.log('Perfil no encontrado, intentando crear uno básico.');
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ id: userId, username: 'Nuevo Jugador', country: 'Desconocido', gold: 0, diamonds: 0 }]);

                if (insertError) {
                    console.error('Error al crear perfil básico:', insertError);
                    if (insertError.code === '23505') { // Violación de unicidad de PostgreSQL (conflicto)
                        console.warn('Conflicto al crear perfil (ya existe). Intentando cargar de nuevo.');
                        await loadUserProfile(userId); // Recargar el perfil
                        return;
                    } else {
                        showSwal('error', 'Error Crítico', 'No se pudo crear el perfil inicial para tu cuenta: ' + insertError.message);
                    }
                } else {
                    showSwal('info', 'Perfil Creado', 'Se ha generado un perfil básico para ti. ¡Rellena tus datos en la sección de Perfil!');
                }
            } else {
                showSwal('error', 'Error de Perfil', 'No se pudo cargar la información de tu perfil: ' + profileError.message);
            }
        }

        // 2. Obtener la mejor entrada de ranking del usuario de sopa_rankings_general
        let userBestRankingEntry = null;
        const { data: userRankingData, error: userRankingError } = await supabase
            .from('sopa_rankings_general')
            .select('gold_earned, diamonds_earned, time_taken_seconds')
            .eq('user_id', userId)
            .order('gold_earned', { ascending: false })
            .order('diamonds_earned', { ascending: false })
            .order('time_taken_seconds', { ascending: true })
            .limit(1); // Solo necesitamos el mejor resultado de este usuario

        if (userRankingError) {
            console.error('Error al obtener el mejor ranking del usuario:', userRankingError);
        } else if (userRankingData && userRankingData.length > 0) {
            userBestRankingEntry = userRankingData[0];
        }

        // 3. Obtener todos los rankings para determinar la posición del usuario
        let userRank = 'N/A';
        if (userBestRankingEntry) { // Solo si el usuario tiene un registro de ranking
            const { data: allRankings, error: allRankingsError } = await supabase
                .from('sopa_rankings_general')
                .select('user_id, gold_earned, diamonds_earned, time_taken_seconds')
                .not('gold_earned', 'is', null) // Filtrar entradas sin datos de juego
                .not('diamonds_earned', 'is', null)
                .order('gold_earned', { ascending: false })
                .order('diamonds_earned', { ascending: false })
                .order('time_taken_seconds', { ascending: true });

            if (allRankingsError) {
                console.error('Error al obtener todos los rankings:', allRankingsError);
            } else if (allRankings) {
                // Iterar para encontrar la posición del mejor resultado del usuario
                for (let i = 0; i < allRankings.length; i++) {
                    const rankEntry = allRankings[i];
                    // Comparar el mejor resultado del usuario con las entradas del ranking global
                    // Se compara por todos los campos de ordenación para asegurar que la posición sea correcta
                    if (rankEntry.user_id === userId &&
                        rankEntry.gold_earned === userBestRankingEntry.gold_earned &&
                        rankEntry.diamonds_earned === userBestRankingEntry.diamonds_earned &&
                        rankEntry.time_taken_seconds === userBestRankingEntry.time_taken_seconds) {
                        userRank = i + 1; // La posición es el índice + 1 (basado en 1)
                        break;
                    }
                }
            }
        }

        // 4. Actualizar los elementos del DOM
        if (profileData) { // Si los datos del perfil fueron obtenidos o creados exitosamente
            // Actualizar datos en el dashboard (si es la página actual)
            if (userEmailDashboardSpan) userEmailDashboardSpan.textContent = (await supabase.auth.getUser()).data.user.email;
            if (usernameDisplayDashboard) usernameDisplayDashboard.textContent = profileData.username || 'N/A';
            if (countryDisplayDashboard) countryDisplayDashboard.textContent = profileData.country || 'N/A';
            if (goldDisplayDashboard) goldDisplayDashboard.textContent = profileData.gold;
            if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = profileData.diamonds;
            if (userRankingDashboardDisplay) {
                userRankingDashboardDisplay.innerHTML = `<i class="fas fa-trophy"></i> Posición: <strong>${userRank}</strong>`;
            }

            // Actualizar datos en la página de perfil (si es la página actual)
            if (userEmailProfileSpan) userEmailProfileSpan.textContent = (await supabase.auth.getUser()).data.user.email;
            if (usernameInputProfile) usernameInputProfile.value = profileData.username || '';
            if (countryInputProfile) countryInputProfile.value = profileData.country || '';
            if (goldDisplayProfile) goldDisplayProfile.textContent = profileData.gold;
            if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = profileData.diamonds;
            if (userRankingProfileDisplay) {
                userRankingProfileDisplay.innerHTML = `<i class="fas fa-trophy"></i> Posición: <strong>${userRank}</strong>`;
            }
        }
    } catch (e) {
        console.error("Error inesperado en loadUserProfile:", e);
        showSwal('error', 'Error Inesperado', 'Ha ocurrido un problema al cargar tu perfil.');
    } finally {
        hideLoader(); // Esto se ejecutará SIEMPRE.
        // Aseguramos que la tarjeta de perfil/dashboard sea visible DESPUÉS de ocultar el loader
        // Estas variables solo se asignarán si el elemento existe en la página actual.
        if (profileCard) { 
            profileCard.classList.remove('profile-hidden'); 
        }
        if (dashboardDiv) { 
            dashboardDiv.classList.remove('dashboard-hidden');
        }
    }
}

// --- 6. Inicialización al Cargar el DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    // Asignar referencias a elementos DOM de forma condicional, según la página actual.
    // Esto asegura que solo se intenten obtener elementos que existen en el HTML actual.
    loaderDiv = document.getElementById('loader-wrapper');
    loaderText = loaderDiv ? loaderDiv.querySelector('h1') : null; // Asumiendo que el h1 está dentro del loader-wrapper

    const path = window.location.pathname;

    if (path.includes('dashboard.html')) {
        // Asignar elementos DOM específicos de dashboard.html
        dashboardDiv = document.getElementById('dashboard-div');
        userEmailDashboardSpan = document.getElementById('user-email-dashboard');
        usernameDisplayDashboard = document.getElementById('username-display-dashboard');
        countryDisplayDashboard = document.getElementById('country-display-dashboard');
        goldDisplayDashboard = document.getElementById('gold-display-dashboard');
        diamondsDisplayDashboard = document.getElementById('diamonds-display-dashboard');
        userRankingDashboardDisplay = document.getElementById('user-ranking-display-dashboard');
        profileBtnDashboard = document.getElementById('profile-btn-dashboard');
        logoutBtnDashboard = document.getElementById('logout-button');

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.error('No user logged in or error getting user:', error);
            window.location.href = 'index.html'; // Redirigir al login si no está autenticado
            return;
        }

        await loadUserProfile(user.id);

        // Añadir listeners específicos para dashboard.html
        if (logoutBtnDashboard) {
            logoutBtnDashboard.addEventListener('click', signOut);
        }

    } else if (path.includes('profile.html')) {
        // Asignar elementos DOM específicos de profile.html
        profileCard = document.getElementById('profile-card');
        userEmailProfileSpan = document.getElementById('user-email-profile');
        usernameInputProfile = document.getElementById('username-input-profile');
        countryInputProfile = document.getElementById('country-input-profile');
        goldDisplayProfile = document.getElementById('gold-display-profile');
        diamondsDisplayProfile = document.getElementById('diamonds-display-profile');
        userRankingProfileDisplay = document.getElementById('user-ranking-display-profile');
        saveProfileBtn = document.getElementById('update-profile-button');
        backToDashboardBtn = document.getElementById('back-to-dashboard-button'); 
        configureBtn = document.getElementById('configure-button'); // Si existe

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.error('No user logged in or error getting user:', error);
            window.location.href = 'index.html'; // Redirigir al login si no está autenticado
            return;
        }

        await loadUserProfile(user.id);

        // Añadir listeners específicos para profile.html
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', async () => {
                showLoader('Guardando perfil...');
                const newUsername = usernameInputProfile.value;
                const newCountry = countryInputProfile.value;

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ username: newUsername, country: newCountry })
                    .eq('id', user.id);

                hideLoader();
                if (updateError) {
                    console.error('Error al actualizar perfil:', updateError);
                    showSwal('error', 'Error', 'No se pudo actualizar el perfil: ' + updateError.message);
                } else {
                    showSwal('success', '¡Éxito!', 'Perfil actualizado correctamente.');
                }
            });
        }

    } else if (path.includes('index.html') || path === '/') {
        // Asignar elementos DOM específicos de index.html
        initialOptionsDiv = document.getElementById('initial-options');
        signupFormDiv = document.getElementById('signup-form');
        loginFormDiv = document.getElementById('login-form');
        showSignupBtn = document.getElementById('show-signup-btn');
        showLoginBtn = document.getElementById('show-login-btn');
        backToOptionsFromSignup = document.getElementById('back-to-options-signup');
        backToOptionsFromLogin = document.getElementById('back-to-options-login');
        forgotPasswordLink = document.getElementById('forgot-password-link');

        signupEmail = document.getElementById('signup-email');
        signupPassword = document.getElementById('signup-password');
        registerBtn = document.getElementById('register-btn');

        loginEmail = document.getElementById('login-email');
        loginPassword = document.getElementById('login-password');
        loginSubmitBtn = document.getElementById('login-submit-btn');

        // Comprobar si el usuario ya está logueado en index.html
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            window.location.href = 'dashboard.html'; // Redirigir al dashboard si ya está logueado
        } else {
            showInitialOptions(); // Mostrar opciones iniciales si no está logueado
        }

        // Añadir listeners específicos para index.html
        if (showSignupBtn) showSignupBtn.addEventListener('click', showSignupForm);
        if (showLoginBtn) showLoginBtn.addEventListener('click', showLoginForm);
        if (backToOptionsFromSignup) backToOptionsFromSignup.addEventListener('click', showInitialOptions);
        if (backToOptionsFromLogin) backToOptionsFromLogin.addEventListener('click', showInitialOptions);
        if (registerBtn) registerBtn.addEventListener('click', signUp);
        if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', signIn);
    }
});


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