// orcado_programming_specific_game.js - Lógica para el juego de Orcado (Tema Programación, con niveles)

// IMPORTANTE: Importa createClient directamente de la URL del CDN de Supabase como un módulo ES
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// CONFIGURACIÓN INICIAL DEL JUEGO
// Contiene las listas de palabras para cada nivel y las configuraciones del dibujo del ahorcado.
// ====================================================================================
const programming_game_wordLists = {
    1: ["PROGRAMACION", "JAVASCRIPT", "DESARROLLO", "WEB", "COMPUTADORA", "ALGORITMO", "TECNOLOGIA", "INTERNET", "NAVEGADOR", "APLICACION", "SERVIDOR", "DATABASE"],
    2: ["INTELIGENCIA", "CRIPTOGRAFIA", "NEURONAL", "BIGDATA", "CIBERSEGURIDAD", "REALIDAD", "VIRTUAL", "AUMENTADA", "ROBOTICA", "AUTOMATIZACION", "INNOVACION"],
    3: ["QUANTUM", "BIOMETRIA", "NANOTECNOLOGIA", "HOLOGRAMA", "SISTEMAS", "COMPLEJOS", "INFRAESTRUCTURA", "MICROSERVICIO", "CONTENEDORES", "DESPLIEGUE", "INTEGRACION"]
};

const programming_game_hangmanParts = [
    'hangman-head', 'hangman-body', 'hangman-arm-left', 'hangman-arm-right', 'hangman-leg-left', 'hangman-leg-right'
];

// ====================================================================================
// ESTADO ACTUAL DEL JUEGO
// Variables que controlan el progreso del jugador y la partida.
// ====================================================================================
let programming_game_currentLevel = 1;         // Nivel actual del juego
let programming_game_selectedWord = "";        // Palabra seleccionada para adivinar
let programming_game_guessedWord = [];         // Letras adivinadas de la palabra
let programming_game_wrongGuesses = 0;         // Número de intentos errados
let programming_game_lettersUsed = [];         // Letras ya intentadas por el jugador
let programming_game_timerInterval;            // Referencia al intervalo del temporizador
let programming_game_timeLeft = 120;           // Tiempo restante en segundos (2 minutos)
const programming_game_maxWrongGuesses = 6;    // Máximo de errores permitidos antes de Game Over

// Requisitos y recompensas por nivel
const programming_game_levelRequirements = {
    1: { maxErrors: 5, reward: { gold: 5, diamonds: 0 } },
    2: { maxErrors: 3, reward: { gold: 10, diamonds: 0 } },
    3: { maxErrors: 2, reward: { gold: 20, diamonds: 30 } } // Recompensa final del juego
};

// ====================================================================================
// ELEMENTOS DEL DOM (Inicializadas dentro de DOMContentLoaded)
// Referencias a los elementos HTML para interactuar con la interfaz.
// ====================================================================================
let programming_game_wordDisplay;
let programming_game_guessInput;
let programming_game_submitButton;
let programming_game_messageDisplay;
let programming_game_levelDisplay;
let programming_game_wrongGuessesDisplay;
let programming_game_timerDisplay;
let programming_game_lettersUsedDisplay;
let programming_game_loaderWrapper;

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
async function programming_game_initializeGame(level = 1) {
    programming_game_currentLevel = level;
    
    // Asegura que el nivel exista en wordLists
    if (!programming_game_wordLists[programming_game_currentLevel] || programming_game_wordLists[programming_game_currentLevel].length === 0) {
        console.error(`Error (Programming Game): No words found for level ${programming_game_currentLevel}. Resetting to level 1.`);
        programming_game_currentLevel = 1; // Vuelve al nivel 1 si el actual no tiene palabras
        if (!programming_game_wordLists[programming_game_currentLevel] || programming_game_wordLists[programming_game_currentLevel].length === 0) {
            Swal.fire({ icon: 'error', title: 'Error de Palabras', text: 'No se encontraron palabras de programación para iniciar el juego. Por favor, contacta soporte.', customClass: { popup: 'swal2-custom-game-over' } });
            return; // Detiene la inicialización si no hay palabras ni siquiera en el nivel 1
        }
    }

    // Mezcla las palabras para el nivel actual para asegurar la aleatoriedad
    const shuffledWords = [...programming_game_wordLists[programming_game_currentLevel]];
    for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
    }

    programming_game_selectedWord = shuffledWords[0].toUpperCase(); // Selecciona la primera palabra después de mezclar
    programming_game_guessedWord = Array(programming_game_selectedWord.length).fill('_');
    programming_game_wrongGuesses = 0;
    programming_game_lettersUsed = [];
    programming_game_timeLeft = 120;
    programming_game_messageDisplay.textContent = "";
    programming_game_guessInput.value = "";
    
    programming_game_updateDisplay();
    programming_game_updateHangmanDrawing();
    programming_game_startTimer();
    programming_game_guessInput.focus();
    
    programming_game_levelDisplay.textContent = programming_game_currentLevel;
    programming_game_wrongGuessesDisplay.textContent = programming_game_wrongGuesses;
    programming_game_lettersUsedDisplay.textContent = '';
}

/**
 * Actualiza la visualización de la palabra, errores y letras usadas en la interfaz.
 */
function programming_game_updateDisplay() {
    programming_game_wordDisplay.textContent = programming_game_guessedWord.join(' ');
    programming_game_wrongGuessesDisplay.textContent = programming_game_wrongGuesses;
    // Muestra las letras usadas, destacando las incorrectas.
    programming_game_lettersUsedDisplay.innerHTML = programming_game_lettersUsed.map(letter => {
        return programming_game_selectedWord.includes(letter) ? `<span>${letter}</span>` : `<strong style="color:#B22222;">${letter}</strong>`; // Rojo suave para errores
    }).join(', ');
}

/**
 * Muestra u oculta las partes del dibujo del ahorcado según el número de errores.
 */
function programming_game_updateHangmanDrawing() {
    console.log(`DEBUG (Programming Game): updateHangmanDrawing called. wrongGuesses: ${programming_game_wrongGuesses}`);
    programming_game_hangmanParts.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        if (partElement) {
            if (index < programming_game_wrongGuesses) {
                partElement.classList.add('show-part'); // Muestra la parte si el error es suficiente
                console.log(`DEBUG (Programming Game): Adding 'show-part' to ${partId}`);
            } else {
                partElement.classList.remove('show-part'); // Oculta la parte
                console.log(`DEBUG (Programming Game): Removing 'show-part' from ${partId}`);
            }
        } else {
            console.warn(`DEBUG (Programming Game): Element with ID '${partId}' not found in HTML. Check your HTML structure.`);
        }
    });
}

/**
 * Inicia o reinicia el temporizador del juego.
 */
function programming_game_startTimer() {
    clearInterval(programming_game_timerInterval); // Limpia cualquier temporizador existente
    programming_game_timerInterval = setInterval(() => {
        programming_game_timeLeft--;
        programming_game_timerDisplay.textContent = programming_game_timeLeft;
        if (programming_game_timeLeft <= 0) {
            clearInterval(programming_game_timerInterval);
            programming_game_handleGameOver(false, "¡Se acabó el tiempo! La palabra era: " + programming_game_selectedWord);
        }
    }, 1000); // Actualiza cada segundo
}

/**
 * Actualiza el balance de oro y diamantes del jugador en la base de datos (Supabase).
 * @param {number} gold - Cantidad de oro a añadir.
 * @param {number} diamonds - Cantidad de diamantes a añadir.
 */
async function programming_game_updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (Programming Game):", sessionError);
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
        console.warn("No user logged in (Programming Game). Cannot update balance.");
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
        console.error("Error fetching current profile (Programming Game):", fetchError);
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
        console.error("Error updating player balance (Programming Game):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (Programming Game): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}

/**
 * Procesa la letra ingresada por el jugador.
 */
async function programming_game_checkGuess() {
    const guess = programming_game_guessInput.value.toUpperCase();
    programming_game_guessInput.value = ""; // Limpia el input

    // Validaciones de entrada
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        programming_game_messageDisplay.textContent = "Por favor, ingresa una sola letra válida.";
        return;
    }

    if (programming_game_lettersUsed.includes(guess)) {
        programming_game_messageDisplay.textContent = `Ya adivinaste la letra '${guess}'. Intenta con otra.`;
        return;
    }

    programming_game_lettersUsed.push(guess); // Añade la letra a las usadas

    if (programming_game_selectedWord.includes(guess)) {
        // La letra es correcta, actualiza la palabra adivinada
        for (let i = 0; i < programming_game_selectedWord.length; i++) {
            if (programming_game_selectedWord[i] === guess) {
                programming_game_guessedWord[i] = guess;
            }
        }
        programming_game_messageDisplay.textContent = `¡Bien! La letra '${guess}' es correcta.`;
    } else {
        // La letra es incorrecta
        programming_game_wrongGuesses++;
        programming_game_messageDisplay.textContent = `Incorrecto. Te quedan ${programming_game_maxWrongGuesses - programming_game_wrongGuesses} intentos.`;
        programming_game_updateHangmanDrawing(); // Dibuja una parte más del ahorcado
    }

    programming_game_updateDisplay(); // Actualiza la interfaz
    await programming_game_checkGameStatus(); // Verifica el estado del juego (victoria/derrota)
}

/**
 * Verifica si el juego ha terminado (victoria o derrota) y maneja las recompensas/transiciones.
 */
async function programming_game_checkGameStatus() {
    // Si la palabra ha sido completamente adivinada
    if (programming_game_guessedWord.join('') === programming_game_selectedWord) {
        clearInterval(programming_game_timerInterval); // Detiene el temporizador

        const goldPerWord = 10;
        await programming_game_updatePlayerBalance(goldPerWord, 0); // Otorga oro por adivinar la palabra

        const errorsAllowed = programming_game_levelRequirements[programming_game_currentLevel].maxErrors;

        // Si el jugador cumple con el requisito de errores para avanzar/ganar
        if (programming_game_wrongGuesses <= errorsAllowed) {
            // Si hay más niveles
            if (programming_game_currentLevel < Object.keys(programming_game_wordLists).length) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Nivel Completado!',
                    html: `¡Perfecto! Has adivinado la palabra **"${programming_game_selectedWord}"** con ${programming_game_wrongGuesses} errores.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por esta palabra!<br>¡Pasas al Nivel ${programming_game_currentLevel + 1}!`,
                    confirmButtonText: 'Siguiente Nivel',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-level-up'
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        programming_game_initializeGame(programming_game_currentLevel + 1); // Carga el siguiente nivel
                    }
                });
            } else {
                // El jugador ha completado todos los niveles (Maestro de Orcado de Programación)
                const finalReward = programming_game_levelRequirements[programming_game_currentLevel].reward;
                await programming_game_updatePlayerBalance(finalReward.gold, finalReward.diamonds); // Otorga recompensa final

                Swal.fire({
                    icon: 'success',
                    title: '¡FELICITACIONES, ERES EL MAESTRO DE AHORCADO DE PROGRAMACIÓN!',
                    html: `¡Lo lograste! Has superado todos los niveles de programación.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por la última palabra!<br>¡Como recompensa final, has ganado <strong>${finalReward.diamonds} Diamantes <i class="fas fa-gem"></i></strong> y <strong>${finalReward.gold} Oro <i class="fas fa-coins"></i></strong> adicionales!`,
                    confirmButtonText: '¡A Jugar de Nuevo!',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-final-success'
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        programming_game_initializeGame(); // Reinicia el juego en el nivel 1 de Programación
                    }
                });
            }
        } else {
            // La palabra fue adivinada, pero con demasiados errores para avanzar de nivel
            Swal.fire({
                icon: 'warning',
                title: 'Palabra Adivinada, ¡pero cuidado!',
                html: `Adivinaste la palabra **"${programming_game_selectedWord}"**, pero tuviste ${programming_game_wrongGuesses} errores. Necesitabas ${errorsAllowed} para avanzar al siguiente nivel. <br>Por tu esfuerzo, ganas <strong>${goldPerWord} Oro <i class="fas fa-coins"></i></strong>.`,
                confirmButtonText: 'Volver a Intentar',
                customClass: {
                    confirmButton: 'swal2-confirm-button',
                    popup: 'swal2-custom-warning'
                },
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    programming_game_initializeGame(); // Reinicia el juego en el nivel 1 de Programación
                }
            });
        }
    } else if (programming_game_wrongGuesses >= programming_game_maxWrongGuesses) {
        // El jugador ha agotado todos los intentos
        programming_game_handleGameOver(false, `¡Has superado los ${programming_game_maxWrongGuesses} errores! La palabra era: **${programming_game_selectedWord}**`);
    }
}

/**
 * Maneja el fin del juego, mostrando un mensaje de victoria o derrota.
 * @param {boolean} isWin - True si el jugador ganó, false si perdió.
 * @param {string} message - Mensaje a mostrar al jugador.
 */
async function programming_game_handleGameOver(isWin, message) {
    clearInterval(programming_game_timerInterval); // Detiene el temporizador
    Swal.fire({
        icon: isWin ? 'success' : 'error',
        title: isWin ? '¡Ganaste!' : '¡Game Over!',
        html: message,
        confirmButtonText: 'Intentar de nuevo',
        customClass: {
            confirmButton: 'swal2-confirm-button',
            popup: isWin ? 'swal2-custom-final-success' : 'swal2-custom-game-over'
        },
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            programming_game_initializeGame(); // Reinicia el juego
        }
    });
}

// ====================================================================================
// MANEJADORES DE EVENTOS
// Conecta las acciones del usuario con la lógica del juego.
// ====================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referencias a los elementos del DOM aquí, después de que el DOM esté cargado
    programming_game_wordDisplay = document.getElementById('word-display');
    programming_game_guessInput = document.getElementById('guess-input');
    programming_game_submitButton = document.getElementById('submit-guess');
    programming_game_messageDisplay = document.getElementById('message');
    programming_game_levelDisplay = document.getElementById('level-display');
    programming_game_wrongGuessesDisplay = document.getElementById('wrong-guesses-display');
    programming_game_timerDisplay = document.getElementById('timer-display');
    programming_game_lettersUsedDisplay = document.getElementById('letters-used-display');
    programming_game_loaderWrapper = document.getElementById('loader-wrapper');

    // Ahora que los elementos existen, podemos añadir los event listeners
    programming_game_submitButton.addEventListener('click', programming_game_checkGuess);

    programming_game_guessInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            await programming_game_checkGuess();
        }
    });

    // 1. Ocultar el cargador después de un tiempo fijo (ej. 2 segundos)
    setTimeout(() => {
        if (programming_game_loaderWrapper) {
            programming_game_loaderWrapper.classList.add('hidden');
        }
    }, 2000); // 2000 milisegundos = 2 segundos

    // 2. Inicializar el juego inmediatamente cuando el DOM esté cargado.
    //    Esto ocurre en paralelo con el temporizador del cargador.
    programming_game_initializeGame();
});