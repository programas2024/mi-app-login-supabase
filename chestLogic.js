// chestLogic.js

// Importaciones necesarias para este módulo: Supabase y Confetti
// Es crucial que la URL de Confetti incluya '+esm' para la importación en módulos ES.
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/+esm';

// --- Configuración de Supabase (debe ser la misma que en tu script.js) ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Elementos del DOM específicos para el cofre (o que el cofre necesita para actualizar) ---
const chestBtn = document.getElementById('chest-btn');
const goldDisplay = document.getElementById('gold-display');
const diamondsDisplay = document.getElementById('diamonds-display'); // Necesitamos estos para actualizar la UI


// Función para actualizar los displays de Oro y Diamantes en el dashboard
// Esta función es vital para que el cofre pueda actualizar el UI.
// Si esta función ya existe en script.js, deberías exportarla desde allí
// y luego importarla aquí. Por simplicidad, la recreo aquí temporalmente.
async function updateCurrencyDisplay() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.warn('No hay usuario autenticado para actualizar la moneda.');
        return;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('gold, diamonds')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Error al actualizar la vista de moneda:', error.message);
    } else if (profile) {
        goldDisplay.textContent = profile.gold || 0;
        diamondsDisplay.textContent = profile.diamonds || 0;
    }
}


// --- Lógica del botón de Cofre ---
if (chestBtn) { // Asegurarse de que el botón existe antes de añadir el listener
    chestBtn.addEventListener('click', async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debes iniciar sesión para abrir cofres.',
                customClass: {
                    popup: 'swal2-chest-popup',
                    confirmButton: 'swal2-confirm-button'
                }
            });
            return;
        }

        // Deshabilitar el botón mientras se procesa
        chestBtn.disabled = true;
        chestBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Abriendo...`;

        try {
            // Generar recompensas aleatorias
            const goldReward = Math.floor(Math.random() * (40 - 10 + 1)) + 10; // entre 10 y 40 de oro
            const diamondReward = Math.floor(Math.random() * (40 - 10 + 1)) + 10; // entre 10 y 40 diamantes

            // Obtener el perfil actual para actualizar las monedas
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('gold, diamonds')
                .eq('id', user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            const currentGold = profile.gold || 0;
            const currentDiamonds = profile.diamonds || 0;

            // Actualizar el perfil del usuario con las nuevas recompensas
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    gold: currentGold + goldReward,
                    diamonds: currentDiamonds + diamondReward
                })
                .eq('id', user.id);

            if (updateError) {
                throw updateError;
            }

            // Mostrar SweetAlert con las recompensas y efectos
            Swal.fire({
                title: '¡Cofre Abierto!',
                html: `
                    <div class="swal2-chest-content">
                        <i class="fas fa-box-open swal2-chest-icon"></i>
                        <p style="font-size: 1.2em; margin-bottom: 15px; color: #dcdcdc;">Has encontrado:</p>
                        <div class="swal2-reward-item">
                            <i class="fas fa-coins currency-icon"></i> <span>${goldReward} Oro</span>
                        </div>
                        <div class="swal2-reward-item">
                            <i class="fas fa-gem currency-icon"></i> <span>${diamondReward} Diamantes</span>
                        </div>
                    </div>
                `,
                confirmButtonText: '¡Genial!',
                customClass: {
                    popup: 'swal2-chest-popup',
                    confirmButton: 'swal2-confirm-button'
                },
                willOpen: () => {
                    // Efecto de confeti al abrir el cofre
                    confetti({
                        particleCount: 200,
                        spread: 180,
                        origin: { y: 0.6, x: 0.5 },
                        colors: ['#FFD700', '#62c3e8', '#ffffff', '#8B4513'], // Oro, Diamante, Blanco, Marrón
                        shapes: ['circle', 'square', 'star'],
                        scalar: 1.5,
                        disableForReducedMotion: true
                    });
                }
            });

            // Actualizar los displays de oro y diamantes en el dashboard
            await updateCurrencyDisplay();

        } catch (error) {
            console.error('Error al abrir el cofre:', error.message);
            Swal.fire({
                icon: 'error',
                title: 'Error al abrir cofre',
                text: 'No se pudo abrir el cofre. Intenta de nuevo. Detalles: ' + error.message,
                confirmButtonText: 'Entendido',
                customClass: {
                    popup: 'swal2-chest-popup',
                    confirmButton: 'swal2-confirm-button'
                }
            });
        } finally {
            // Habilitar el botón de nuevo
            chestBtn.disabled = false;
            chestBtn.innerHTML = `<i class="fas fa-box-open"></i> Cofre`;
        }
    });
}