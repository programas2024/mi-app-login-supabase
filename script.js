// script.js - Lógica de Autenticación y Perfil (para index.html, dashboard.html, profile.html)

// Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// Importa las funciones sociales desde socialLogic.js
import { 
    loadPendingFriendRequestsCount, 
    loadUnreadMessagesCount, 
    loadFriendsList, 
    setupFriendsRealtimeSubscription 
} from './socialLogic.js';

// --- 1. Configuración de Supabase ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 2. Referencias a Elementos HTML ---
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
let avatarImg, avatarUploadInput, changeAvatarBtn;

// --- 3. Funciones de Utilidad ---
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
            popup: 'swal2-modern',
            confirmButton: 'swal2-confirm-btn'
        }
    });
}

// --- 4. Funciones de Gestión de Avatar ---
async function uploadAvatar(userId) {
    if (!avatarUploadInput.files || avatarUploadInput.files.length === 0) {
        showSwal('warning', 'Ningún archivo seleccionado', 'Por favor selecciona una imagen para tu avatar.');
        return;
    }

    const file = avatarUploadInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    showLoader('Subiendo avatar...');
    
    try {
        // 1. Eliminar avatar anterior si existe
        const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', userId)
            .single();

        if (profileData?.avatar_url) {
            const oldFilePath = profileData.avatar_url.split('/').pop();
            await supabase.storage.from('avatars').remove([oldFilePath]);
        }

        // 2. Subir nuevo avatar
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 3. Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // 4. Actualizar perfil
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 5. Actualizar visualización
        if (avatarImg) {
            avatarImg.src = publicUrl + '?t=' + Date.now();
            avatarImg.style.display = 'block';
        }

        showSwal('success', '¡Avatar actualizado!', 'Tu nueva imagen de perfil se ha guardado correctamente.');
    } catch (error) {
        console.error('Error al subir avatar:', error);
        showSwal('error', 'Error al subir avatar', error.message);
    } finally {
        hideLoader();
        avatarUploadInput.value = '';
    }
}

async function handleAvatarChange() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showSwal('error', 'Error', 'No hay sesión activa.');
        return;
    }

    await uploadAvatar(user.id);
}

// --- 5. Funciones de Autenticación ---
async function signUp() {
    const email = signupEmail.value;
    const password = signupPassword.value;

    if (!email || password.length < 6) {
        showSwal('warning', 'Datos incompletos', 'Por favor, ingresa un correo válido y una contraseña de al menos 6 caracteres.');
        return;
    }

    showLoader('Registrando...');
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            data: {
                username: email.split('@')[0] // Nombre de usuario por defecto
            }
        }
    });
    hideLoader();

    if (error) {
        let errorMessage = 'Error al registrarse. Inténtalo de nuevo.';
        if (error.message.includes('User already registered')) {
            errorMessage = 'Este correo ya está registrado. Intenta iniciar sesión.';
        }
        showSwal('error', 'Fallo en Registro', errorMessage);
    } else {
        showSwal('success', '¡Registro Exitoso!', 'Por favor, revisa tu correo electrónico para verificar tu cuenta.');
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
        let errorMessage = 'Credenciales incorrectas.';
        if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Por favor verifica tu correo electrónico antes de iniciar sesión.';
        }
        showSwal('error', 'Fallo en Inicio de Sesión', errorMessage);
    } else {
        window.location.href = 'dashboard.html';
    }
}

async function signOut() {
    showLoader('Cerrando sesión...');
    const { error } = await supabase.auth.signOut();
    hideLoader();

    if (error) {
        showSwal('error', 'Error', 'No se pudo cerrar la sesión: ' + error.message);
    } else {
        window.location.href = 'index.html';
    }
}

// --- 6. Funciones de Gestión de Perfil ---
async function loadUserProfile(userId) {
    showLoader('Cargando perfil...');

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username, country, gold, diamonds, avatar_url')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error al cargar perfil:', error);
            
            if (error.code === 'PGRST116') {
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{ 
                        id: userId, 
                        username: 'Nuevo Jugador', 
                        country: 'Desconocido', 
                        gold: 0, 
                        diamonds: 0,
                        avatar_url: null
                    }]);
                
                if (insertError && insertError.code !== '23505') {
                    throw insertError;
                }
                await loadUserProfile(userId); // Recargar después de crear
                return;
            }
            throw error;
        }

        // Actualizar UI
        const userEmail = (await supabase.auth.getUser()).data.user?.email || '';

        // Dashboard
        if (userEmailDashboardSpan) userEmailDashboardSpan.textContent = userEmail;
        if (goldDisplayDashboard) goldDisplayDashboard.textContent = data.gold;
        if (diamondsDisplayDashboard) diamondsDisplayDashboard.textContent = data.diamonds;

        // Perfil
        if (userEmailProfileSpan) userEmailProfileSpan.textContent = userEmail;
        if (usernameInputProfile) usernameInputProfile.value = data.username || '';
        if (countryInputProfile) countryInputProfile.value = data.country || '';
        if (goldDisplayProfile) goldDisplayProfile.textContent = data.gold;
        if (diamondsDisplayProfile) diamondsDisplayProfile.textContent = data.diamonds;

        // Avatar
        if (avatarImg) {
            if (data.avatar_url) {
                avatarImg.src = data.avatar_url + '?t=' + Date.now();
            } else {
                avatarImg.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
            }
            avatarImg.style.display = 'block';
        }

    } catch (error) {
        console.error("Error cargando perfil:", error);
        showSwal('error', 'Error', 'No se pudo cargar el perfil: ' + error.message);
    } finally {
        hideLoader();
        if (profileCard) profileCard.classList.remove('dashboard-hidden');
        if (dashboardDiv) dashboardDiv.classList.remove('dashboard-hidden');
    }
}

async function saveProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showSwal('error', 'Error', 'No hay sesión activa.');
        return;
    }

    const newUsername = usernameInputProfile?.value.trim() || '';
    const newCountry = countryInputProfile?.value.trim() || '';

    if (!newUsername) {
        showSwal('warning', 'Campo requerido', 'Por favor ingresa un nombre de usuario.');
        return;
    }

    showLoader('Guardando...');
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                username: newUsername, 
                country: newCountry 
            })
            .eq('id', user.id);
        
        if (error) throw error;
        
        showSwal('success', '¡Guardado!', 'Tu perfil ha sido actualizado.');
        await loadUserProfile(user.id);
    } catch (error) {
        showSwal('error', 'Error', 'No se pudo guardar: ' + error.message);
    } finally {
        hideLoader();
    }
}

async function giveGold() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showSwal('error', 'Error', 'No hay sesión activa.');
        return;
    }

    showLoader('Actualizando...');
    try {
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('gold')
            .eq('id', user.id)
            .single();
        
        if (fetchError) throw fetchError;

        const newGold = (profile.gold || 0) + 10;
        
        const { error } = await supabase
            .from('profiles')
            .update({ gold: newGold })
            .eq('id', user.id);
        
        if (error) throw error;

        // Actualizar UI
        if (goldDisplayProfile) goldDisplayProfile.textContent = newGold;
        if (goldDisplayDashboard) goldDisplayDashboard.textContent = newGold;
        
        showSwal('success', '¡Oro obtenido!', `Has recibido 10 de oro. Total: ${newGold}`);
    } catch (error) {
        showSwal('error', 'Error', 'No se pudo dar oro: ' + error.message);
    } finally {
        hideLoader();
    }
}

// --- 7. Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();

    // Inicializar elementos comunes
    loaderDiv = document.getElementById('loader');
    loaderText = loaderDiv?.querySelector('p');

    // Lógica para index.html
    if (currentPage === 'index.html' || currentPage === '') {
        // [Código de inicialización de index.html...]
    } 
    // Lógica para dashboard.html y profile.html
    else if (currentPage === 'dashboard.html' || currentPage === 'profile.html') {
        // Inicializar elementos
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

        // Elementos de avatar
        avatarImg = document.getElementById('avatar-img');
        avatarUploadInput = document.getElementById('avatar-upload');
        changeAvatarBtn = document.getElementById('change-avatar-btn');

        // Verificar autenticación
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            window.location.href = 'index.html';
            return;
        }

        // Cargar datos iniciales
        await loadUserProfile(user.id);
        await loadPendingFriendRequestsCount(user.id);
        await loadUnreadMessagesCount(user.id);
        await loadFriendsList(user.id);
        setupFriendsRealtimeSubscription();

        // Event listeners
        if (currentPage === 'dashboard.html') {
            profileBtnDashboard?.addEventListener('click', () => window.location.href = 'profile.html');
            logoutBtnDashboard?.addEventListener('click', signOut);
        } else if (currentPage === 'profile.html') {
            saveProfileBtn?.addEventListener('click', saveProfile);
            backToDashboardBtn?.addEventListener('click', () => window.location.href = 'dashboard.html');
            configureBtn?.addEventListener('click', showConfigureOptions);
            changeAvatarBtn?.addEventListener('click', () => avatarUploadInput.click());
            avatarUploadInput?.addEventListener('change', handleAvatarChange);
        }

        // Manejar cambios de autenticación
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = 'index.html';
            }
        });
    }
});

async function showConfigureOptions() {
    await Swal.fire({
        title: 'Opciones',
        html: `
            <div class="swal-buttons-container">
                <button id="swal-give-gold" class="swal-gold-btn">
                    <i class="fas fa-coins"></i> Obtener 10 de Oro
                </button>
                <button id="swal-logout" class="swal-logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        `,
        showConfirmButton: false,
        background: '#1e293b',
        color: '#ffffff',
        width: '350px',
        padding: '20px',
        customClass: {
            popup: 'custom-swal-popup',
            htmlContainer: 'custom-swal-html'
        }
    });

    document.getElementById('swal-give-gold').addEventListener('click', async () => {
        Swal.close();
        await giveGold();
    });

    document.getElementById('swal-logout').addEventListener('click', async () => {
        Swal.close();
        await signOut();
    });
}