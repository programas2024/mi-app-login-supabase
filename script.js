// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias a elementos comunes
const loader = document.getElementById('loader');
const userEmailSpan = document.getElementById('user-email'); // Para dashboard.html
const userEmailProfileSpan = document.getElementById('user-email-profile'); // Para profile.html

// Funciones de utilidad
function showLoader(message = 'Cargando...') {
    if (loader) {
        loader.classList.remove('loader-hidden');
        loader.querySelector('p').textContent = message;
    }
}

function hideLoader() {
    if (loader) {
        loader.classList.add('loader-hidden');
    }
}

// Función para mostrar mensajes con SweetAlert2
function showSwal(icon, title, text) {
    const isAutoClose = (icon === 'success' || icon === 'info');
    Swal.fire({
        icon: icon,
        title: title,
        text: text,
        showConfirmButton: !isAutoClose,
        timer: isAutoClose ? 3000 : undefined,
        timerProgressBar: isAutoClose,
    });
}

// Función para cerrar sesión
async function signOut() {
    showLoader('Cerrando sesión...');
    const { error } = await supabase.auth.signOut();
    hideLoader();

    if (error) {
        showSwal('error', 'Error al cerrar sesión', error.message);
    } else {
        showSwal('success', '¡Hasta pronto!', 'Has cerrado sesión correctamente.');
        setTimeout(() => {
            window.location.href = 'index.html'; // Redirigir a la página de inicio
        }, 1500); // Dar tiempo para ver el SweetAlert
    }
}

// --- Lógica de Autenticación (index.html) ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');

function showLoginForm() {
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
}

function showSignupForm() {
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.remove('hidden');
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
        showSwal('error', 'Fallo en Inicio de Sesión', error.message);
    } else {
        showSwal('success', '¡Bienvenido!', 'Has iniciado sesión correctamente.');
        setTimeout(() => {
            window.location.href = 'dashboard.html'; // Redirigir al dashboard
        }, 1500);
    }
}

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
        // La fila en 'profiles' se creará automáticamente gracias a auth.uid() en la columna id y la política INSERT.
        showSwal('success', '¡Registro Exitoso!', 'Por favor, revisa tu correo electrónico para verificar tu cuenta e iniciar sesión.');
        signupEmail.value = '';
        signupPassword.value = '';
        showLoginForm(); // Después de registrar, mostramos el formulario de login.
    }
}

// --- Lógica del Dashboard y Perfil (dashboard.html y profile.html) ---

// Referencias a elementos específicos del dashboard
let goldDisplayDashboard, diamondsDisplayDashboard;
let profileBtnDashboard, logoutBtnDashboard;

// Referencias a elementos específicos de la página de perfil
let usernameInputProfile, countryInputProfile, saveProfileBtn, giveGoldBtnProfile, backToDashboardBtn, logoutBtnProfile;
let goldDisplayProfile, diamondsDisplayProfile;


// Función para cargar y mostrar los datos del perfil
async function loadUserProfile(userId) {
    showLoader('Cargando perfil...');
    const { data, error } = await supabase
        .from('profiles')
        .select('username, country, gold, diamonds')
        .eq('id', userId)
        .single();

    hideLoader();

    if (error) {
        console.error('Error al cargar perfil:', error);
        showSwal('error', 'Error de Perfil', 'No se pudo cargar la información de tu perfil. Inténtalo de nuevo.');
        // Considerar crear un perfil básico si no existe (aunque auth.uid() debería manejarlo)
        if (error.code === 'PGRST116') { // Código para "no rows found"
            console.log('Perfil no encontrado, intentando crear uno básico.');
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: userId, username: 'Nuevo Jugador', country: 'Desconocido', gold: 0, diamonds: 0 }]);
            if (insertError) {
                console.error('Error al crear perfil básico:', insertError);
            } else {
                showSwal('info', 'Perfil Creado', 'Se ha generado un perfil básico para ti. ¡Rellena tus datos!');
                // Recargar para mostrar los datos recién creados
                loadUserProfile(userId);
            }
        }
    } else if (data) {
        // Actualizar el email del usuario (en ambas páginas si el span existe)
        const { data: { user } } = await supabase.auth.getUser();
        if (userEmailSpan && user) userEmailSpan.textContent = user.email;
        if (userEmailProfileSpan && user) userEmailProfileSpan.textContent = user.email;

        // Actualizar contadores en dashboard.html
        if (goldDisplayDashboard) goldDisplayDashboard.textContent = data.gold;
        if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = data.diamonds;

        // Actualizar campos y contadores en profile.html
        if (usernameInputProfile) usernameInputProfile.value = data.username || '';
        if (countryInputProfile) countryInputProfile.value = data.country || '';
        if (goldDisplayProfile) goldDisplayProfile.textContent = data.gold;
        if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = data.diamonds;
    }
}

// Función para guardar los cambios del perfil
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
        // Recargar el perfil para actualizar los spans mostrados
        await loadUserProfile(user.id);
    }
}

// Función de ejemplo para dar oro
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

    const newGold = (currentProfile.gold || 0) + 10; // Sumar 10 de oro

    const { error } = await supabase
        .from('profiles')
        .update({ gold: newGold })
        .eq('id', user.id);

    hideLoader();

    if (error) {
        showSwal('error', 'Error al dar oro', 'No se pudo actualizar el oro: ' + error.message);
    } else {
        // Actualizar los displays en ambas páginas si existen
        if (goldDisplayDashboard) goldDisplayDashboard.textContent = newGold;
        if (goldDisplayProfile) goldDisplayProfile.textContent = newGold;
        showSwal('success', '¡Oro Obtenido!', `Has recibido 10 de oro. Total: ${newGold}`);
    }
}


// --- Inicialización al cargar el DOM ---
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();
    console.log('Cargando script en:', currentPage);

    // Lógica para index.html (Login/Signup)
    if (currentPage === 'index.html') {
        if (showSignupBtn) showSignupBtn.addEventListener('click', showSignupForm);
        if (showLoginBtn) showLoginBtn.addEventListener('click', showLoginForm);
        if (document.getElementById('login-btn')) document.getElementById('login-btn').addEventListener('click', signIn);
        if (document.getElementById('signup-btn')) document.getElementById('signup-btn').addEventListener('click', signUp);

        // Observador de estado de autenticación para index.html: redirigir si ya hay sesión
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event in index.html:', event, 'Session:', session);
            if (session) {
                console.log('Sesión activa en index.html. Redirigiendo a dashboard.html.');
                window.location.href = 'dashboard.html';
            }
        });

    } else if (currentPage === 'dashboard.html') {
        // Referencias para dashboard.html
        profileBtnDashboard = document.getElementById('profile-btn');
        logoutBtnDashboard = document.getElementById('logout-btn');
        goldDisplayDashboard = document.getElementById('gold-display');
        diamondsDisplayDashboard = document.getElementById('diamonds-display');

        // Asegurarse de que el usuario esté logueado para ver el dashboard
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            document.getElementById('dashboard').classList.remove('dashboard-hidden');
            await loadUserProfile(user.id); // Cargar datos del perfil

            if (profileBtnDashboard) profileBtnDashboard.addEventListener('click', () => {
                window.location.href = 'profile.html'; // Navegar a la página de perfil
            });
            if (logoutBtnDashboard) logoutBtnDashboard.addEventListener('click', signOut);
        } else {
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

    } else if (currentPage === 'profile.html') {
        // Referencias para profile.html
        usernameInputProfile = document.getElementById('edit-username');
        countryInputProfile = document.getElementById('edit-country');
        saveProfileBtn = document.getElementById('save-profile-btn');
        giveGoldBtnProfile = document.getElementById('give-gold-btn');
        backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        logoutBtnProfile = document.getElementById('logout-btn-profile');
        goldDisplayProfile = document.getElementById('gold-display-profile');
        diamondsDisplayProfile = document.getElementById('diamonds-display-profile');

        // Asegurarse de que el usuario esté logueado para ver el perfil
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            document.getElementById('profile-card').classList.remove('dashboard-hidden'); // Reutilizando la clase para ocultar/mostrar
            await loadUserProfile(user.id); // Cargar datos del perfil

            if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
            if (giveGoldBtnProfile) giveGoldBtnProfile.addEventListener('click', giveGold);
            if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html'; // Volver al dashboard
            });
            if (logoutBtnProfile) logoutBtnProfile.addEventListener('click', signOut);

        } else {
            console.log('No hay usuario autenticado en profile.html. Redirigiendo a index.html');
            window.location.href = 'index.html';
        }

        // Observador de estado de autenticación para profile.html: redirigir si la sesión termina
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event in profile.html:', event, 'Session:', session);
            if (event === 'SIGNED_OUT' || !session) {
                console.log('Sesión terminada en profile.html. Redirigiendo a index.html.');
                window.location.href = 'index.html';
            }
        });
    }
});