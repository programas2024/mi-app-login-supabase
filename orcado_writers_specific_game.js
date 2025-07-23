// orcado_writers_specific_game.js - Lógica para el juego de Orcado de Escritores (con niveles)

// ¡IMPORTANTE: Importa createClient desde la URL del CDN de Supabase como un módulo ES!
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// CONFIGURACIÓN INICIAL DEL JUEGO
// Contiene las palabras para cada nivel y las configuraciones de la horca.
// ====================================================================================
const writers_game_wordLists = {
    1: ["NOVELA", "POESIA", "CUENTO", "DRAMA", "AUTOR", "LIBRO", "PLUMA", "TINTA", "PAGINA", "LECTOR"],
    2: ["CERVANTES", "SHAKESPEARE", "AUSTEN", "DICKENS", "TOLSTOI", "DOSTOYEVSKI", "VIRGINIA", "WOOLF", "HEMINGWAY", "GABRIEL", "MARQUEZ"],
    3: ["BORGES", "NERUDA", "CORTAZAR", "OCTAVIO", "PAZ", "ISABEL", "ALLENDE", "VARGAS", "LLOSA", "JUANA", "INES", "DE", "LA", "CRUZ"]
};

const writers_game_hangmanParts = [
    'hangman-head', 'hangman-body', 'hangman-arm-left', 'hangman-arm-right', 'hangman-leg-left', 'hangman-leg-right'
];

// ====================================================================================
// ESTADO ACTUAL DEL JUEGO
// Variables que controlan el progreso del jugador y la partida.
// ====================================================================================
let writers_game_currentLevel = 1;         // Nivel actual del juego
let writers_game_selectedWord = "";        // Palabra seleccionada para adivinar
let writers_game_guessedWord = [];         // Letras adivinadas de la palabra
let writers_game_wrongGuesses = 0;         // Número de intentos errados
let writers_game_lettersUsed = [];         // Letras ya intentadas por el jugador
let writers_game_timerInterval;            // Referencia al intervalo del temporizador
let writers_game_timeLeft = 120;           // Tiempo restante en segundos (2 minutos)
const writers_game_maxWrongGuesses = 6;    // Máximo de errores permitidos antes de Game Over

// Requisitos y recompensas por nivel
const writers_game_levelRequirements = {
    1: { maxErrors: 5, reward: { gold: 5, diamonds: 0 } },
    2: { maxErrors: 3, reward: { gold: 10, diamonds: 0 } },
    3: { maxErrors: 2, reward: { gold: 20, diamonds: 30 } } // Recompensa final del juego
};

// ====================================================================================
// ELEMENTOS DEL DOM
// Referencias a los elementos HTML para interactuar con la interfaz.
// ====================================================================================
const writers_game_wordDisplay = document.getElementById('word-display');
const writers_game_guessInput = document.getElementById('guess-input');
const writers_game_submitButton = document.getElementById('submit-guess');
const writers_game_messageDisplay = document.getElementById('message');
const writers_game_levelDisplay = document.getElementById('level-display');
const writers_game_wrongGuessesDisplay = document.getElementById('wrong-guesses-display');
const writers_game_timerDisplay = document.getElementById('timer-display');
const writers_game_lettersUsedDisplay = document.getElementById('letters-used-display');
const writers_game_loaderWrapper = document.getElementById('loader-wrapper');

// --- Supabase Config ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ====================================================================================
// FUNCIONES PRINCIPALES DEL JUEGO
// Lógica para inicializar, actualizar y gestionar la partida.
// ====================================================================================

/**
 * Inicializa o reinicia el juego para un nivel específico.
 * @param {number} level - El nivel al que se desea inicializar el juego. Por defecto es 1.
 */
async function writers_game_initializeGame(level = 1) {
    writers_game_currentLevel = level;
    
    // Asegura que el nivel exista en wordLists de escritores
    if (!writers_game_wordLists[writers_game_currentLevel] || writers_game_wordLists[writers_game_currentLevel].length === 0) {
        console.error(`Error (Writers Game): No words found for level ${writers_game_currentLevel}. Resetting to level 1.`);
        writers_game_currentLevel = 1; // Vuelve al nivel 1 si el actual no tiene palabras
        if (!writers_game_wordLists[writers_game_currentLevel] || writers_game_wordLists[writers_game_currentLevel].length === 0) {
            Swal.fire({ icon: 'error', title: 'Error de Palabras', text: 'No se encontraron palabras de escritores para iniciar el juego. Por favor, contacta soporte.', customClass: { popup: 'swal2-custom-game-over' } });
            return; // Detiene la inicialización si no hay palabras ni siquiera en el nivel 1
        }
    }

    writers_game_selectedWord = writers_game_wordLists[writers_game_currentLevel][Math.floor(Math.random() * writers_game_wordLists[writers_game_currentLevel].length)].toUpperCase();
    writers_game_guessedWord = Array(writers_game_selectedWord.length).fill('_');
    writers_game_wrongGuesses = 0;
    writers_game_lettersUsed = [];
    writers_game_timeLeft = 120;
    writers_game_messageDisplay.textContent = "";
    writers_game_guessInput.value = "";
    
    writers_game_updateDisplay();
    writers_game_updateHangmanDrawing();
    writers_game_startTimer();
    writers_game_guessInput.focus();
    
    writers_game_levelDisplay.textContent = writers_game_currentLevel;
    writers_game_wrongGuessesDisplay.textContent = writers_game_wrongGuesses;
    writers_game_lettersUsedDisplay.textContent = '';
}

/**
 * Actualiza la visualización de la palabra, errores y letras usadas en la interfaz.
 */
function writers_game_updateDisplay() {
    writers_game_wordDisplay.textContent = writers_game_guessedWord.join(' ');
    writers_game_wrongGuessesDisplay.textContent = writers_game_wrongGuesses;
    // Muestra las letras usadas, destacando las incorrectas.
    writers_game_lettersUsedDisplay.innerHTML = writers_game_lettersUsed.map(letter => {
        return writers_game_selectedWord.includes(letter) ? `<span>${letter}</span>` : `<strong style="color:#B22222;">${letter}</strong>`; // Rojo suave para errores
    }).join(', ');
}

/**
 * Muestra u oculta las partes del dibujo del ahorcado según el número de errores.
 */
function writers_game_updateHangmanDrawing() {
    console.log(`DEBUG (Writers Game): updateHangmanDrawing called. wrongGuesses: ${writers_game_wrongGuesses}`);
    writers_game_hangmanParts.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        if (partElement) {
            if (index < writers_game_wrongGuesses) {
                partElement.classList.add('show-part'); // Muestra la parte si el error es suficiente
                console.log(`DEBUG (Writers Game): Adding 'show-part' to ${partId}`);
            } else {
                partElement.classList.remove('show-part'); // Oculta la parte
                console.log(`DEBUG (Writers Game): Removing 'show-part' from ${partId}`);
            }
        } else {
            console.warn(`DEBUG (Writers Game): Element with ID '${partId}' not found in HTML. Check your HTML structure.`);
        }
    });
}

/**
 * Inicia o reinicia el temporizador del juego.
 */
function writers_game_startTimer() {
    clearInterval(writers_game_timerInterval); // Limpia cualquier temporizador existente
    writers_game_timerInterval = setInterval(() => {
        writers_game_timeLeft--;
        writers_game_timerDisplay.textContent = writers_game_timeLeft;
        if (writers_game_timeLeft <= 0) {
            clearInterval(writers_game_timerInterval);
            writers_game_handleGameOver(false, "¡Se acabó el tiempo! La palabra era: " + writers_game_selectedWord);
        }
    }, 1000); // Actualiza cada segundo
}

/**
 * Actualiza el balance de oro y diamantes del jugador en la base de datos (Supabase).
 * @param {number} gold - Cantidad de oro a añadir.
 * @param {number} diamonds - Cantidad de diamantes a añadir.
 */
async function writers_game_updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (Writers Game):", sessionError);
        Swal.fire({
            icon: 'error',
            title: 'Error de Sesión',
            text: 'Hubo un problema al verificar tu sesión. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
        return;
    }

    if (!user) {
        console.warn("No user logged in (Writers Game). Cannot update balance.");
        Swal.fire({
            icon: 'info',
            title: 'Inicia Sesión para Guardar',
            text: 'Inicia sesión para que tus recompensas se guarden.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-warning' }
        });
        return;
    }

    // Intenta obtener el perfil actual del usuario.
    const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('gold, diamonds')
        .eq('id', user.id)
        .single();

    if (fetchError) {
        console.error("Error fetching current profile (Writers Game):", fetchError);
        Swal.fire({
            icon: 'error',
            title: 'Error al Obtener Perfil',
            text: 'Hubo un problema al cargar tu perfil de jugador. Por favor, contacta soporte.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
        return;
    }

    const newGold = currentProfile.gold + gold;
    const newDiamonds = currentProfile.diamonds + diamonds;

    // Actualiza el perfil con los nuevos valores.
    const { data, error } = await supabase
        .from('profiles')
        .update({ gold: newGold, diamonds: newDiamonds })
        .eq('id', user.id);

    if (error) {
        console.error("Error updating player balance (Writers Game):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (Writers Game): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}

/**
 * Procesa la letra ingresada por el jugador.
 */
async function writers_game_checkGuess() {
    const guess = writers_game_guessInput.value.toUpperCase();
    writers_game_guessInput.value = ""; // Limpia el input

    // Validaciones de entrada
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        writers_game_messageDisplay.textContent = "Por favor, ingresa una sola letra válida.";
        return;
    }

    if (writers_game_lettersUsed.includes(guess)) {
        writers_game_messageDisplay.textContent = `Ya adivinaste la letra '${guess}'. Intenta con otra.`;
        return;
    }

    writers_game_lettersUsed.push(guess); // Añade la letra a las usadas

    if (writers_game_selectedWord.includes(guess)) {
        // La letra es correcta, actualiza la palabra adivinada
        for (let i = 0; i < writers_game_selectedWord.length; i++) {
            if (writers_game_selectedWord[i] === guess) {
                writers_game_guessedWord[i] = guess;
            }
        }
        writers_game_messageDisplay.textContent = `¡Bien! La letra '${guess}' es correcta.`;
    } else {
        // La letra es incorrecta
        writers_game_wrongGuesses++;
        writers_game_messageDisplay.textContent = `Incorrecto. Te quedan ${writers_game_maxWrongGuesses - writers_game_wrongGuesses} intentos.`;
        writers_game_updateHangmanDrawing(); // Dibuja una parte más del ahorcado
    }

    writers_game_updateDisplay(); // Actualiza la interfaz
    await writers_game_checkGameStatus(); // Verifica el estado del juego (victoria/derrota)
}

/**
 * Verifica si el juego ha terminado (victoria o derrota) y maneja las recompensas/transiciones.
 */
async function writers_game_checkGameStatus() {
    // Si la palabra ha sido completamente adivinada
    if (writers_game_guessedWord.join('') === writers_game_selectedWord) {
        clearInterval(writers_game_timerInterval); // Detiene el temporizador

        const goldPerWord = 10;
        await writers_game_updatePlayerBalance(goldPerWord, 0); // Otorga oro por adivinar la palabra

        const errorsAllowed = writers_game_levelRequirements[writers_game_currentLevel].maxErrors;

        // Si el jugador cumple con el requisito de errores para avanzar/ganar
        if (writers_game_wrongGuesses <= errorsAllowed) {
            // Si hay más niveles
            if (writers_game_currentLevel < Object.keys(writers_game_wordLists).length) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Nivel Completado!',
                    html: `¡Perfecto! Has adivinado la palabra **"${writers_game_selectedWord}"** con ${writers_game_wrongGuesses} errores.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por esta palabra!<br>¡Pasas al Nivel ${writers_game_currentLevel + 1}!`,
                    confirmButtonText: 'Siguiente Nivel',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-level-up' // Clase personalizada para pop-up de nivel completado
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        writers_game_initializeGame(writers_game_currentLevel + 1); // Carga el siguiente nivel
                    }
                });
            } else {
                // El jugador ha completado todos los niveles (Maestro de Ahorcado de Escritores)
                const finalReward = writers_game_levelRequirements[writers_game_currentLevel].reward;
                await writers_game_updatePlayerBalance(finalReward.gold, finalReward.diamonds); // Otorga la recompensa final

                Swal.fire({
                    icon: 'success',
                    title: '¡FELICITACIONES, ERES EL MAESTRO DE AHORCADO DE ESCRITORES!',
                    html: `¡Lo lograste! Has superado todos los niveles de escritores.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por la última palabra!<br>¡Como recompensa final, has ganado <strong>${finalReward.diamonds} Diamantes <i class="fas fa-gem"></i></strong> y <strong>${finalReward.gold} Oro <i class="fas fa-coins"></i></strong> adicionales!`,
                    confirmButtonText: '¡A Jugar de Nuevo!',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-final-success' // Clase personalizada para pop-up de éxito final
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        writers_game_initializeGame(); // Reinicia el juego al nivel 1 de escritores
                    }
                });
            }
        } else {
            // La palabra fue adivinada, pero con demasiados errores para avanzar de nivel
            Swal.fire({
                icon: 'warning',
                title: 'Palabra Adivinada, ¡pero cuidado!',
                html: `Adivinaste la palabra **"${writers_game_selectedWord}"**, pero tuviste ${writers_game_wrongGuesses} errores. Necesitabas ${errorsAllowed} para avanzar al siguiente nivel. <br>Por tu esfuerzo, ganas <strong>${goldPerWord} Oro <i class="fas fa-coins"></i></strong>.`,
                confirmButtonText: 'Volver a Intentar',
                customClass: {
                    confirmButton: 'swal2-confirm-button',
                    popup: 'swal2-custom-warning' // Clase personalizada para pop-up de advertencia
                },
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    writers_game_initializeGame(); // Reinicia el juego al nivel 1 de escritores
                }
            });
        }
    } else if (writers_game_wrongGuesses >= writers_game_maxWrongGuesses) {
        // El jugador ha agotado todos sus intentos
        writers_game_handleGameOver(false, `¡Has superado los ${writers_game_maxWrongGuesses} errores! La palabra era: **${writers_game_selectedWord}**`);
    }
}

/**
 * Maneja el fin del juego, mostrando un mensaje de victoria o derrota.
 * @param {boolean} isWin - True si el jugador ganó, false si perdió.
 * @param {string} message - Mensaje a mostrar al jugador.
 */
async function writers_game_handleGameOver(isWin, message) {
    clearInterval(writers_game_timerInterval); // Detiene el temporizador
    Swal.fire({
        icon: isWin ? 'success' : 'error',
        title: isWin ? '¡Ganaste!' : '¡Game Over!',
        html: message,
        confirmButtonText: 'Intentar de nuevo',
        customClass: {
            confirmButton: 'swal2-confirm-button',
            popup: isWin ? 'swal2-custom-final-success' : 'swal2-custom-game-over' // Clases personalizadas
        },
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            writers_game_initializeGame(); // Reinicia el juego
        }
    });
}

// ====================================================================================
// MANEJADORES DE EVENTOS
// Conecta las acciones del usuario con la lógica del juego.
// ====================================================================================

writers_game_submitButton.addEventListener('click', writers_game_checkGuess);

writers_game_guessInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        await writers_game_checkGuess();
    }
});

// LÓGICA PARA EL CARGADOR Y LA INICIALIZACIÓN DEL JUEGO
document.addEventListener('DOMContentLoaded', () => {
    // 1. Ocultar el cargador después de un tiempo fijo (ej. 2 segundos)
    setTimeout(() => {
        if (writers_game_loaderWrapper) {
            writers_game_loaderWrapper.classList.add('hidden');
        }
    }, 2000); // 2000 milisegundos = 2 segundos

    // 2. Inicializar el juego inmediatamente cuando el DOM esté cargado.
    //    Esto ocurre en paralelo con el temporizador del cargador.
    writers_game_initializeGame();
});