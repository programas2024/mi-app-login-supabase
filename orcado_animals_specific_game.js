// orcado_animals_specific_game.js - Lógica para el juego de Orcado de Animales (con niveles)

// ====================================================================================
// CONFIGURACIÓN INICIAL DEL JUEGO
// Contiene las palabras para cada nivel y las configuraciones de la horca.
// ====================================================================================
const animals_game_wordLists = {
    1: ["PERRO", "GATO", "LEON", "TIGRE", "OSO", "LOBO", "ZORRO", "CONEJO", "CERDO", "VACA"],
    2: ["ELEFANTE", "JIRAFA", "DELFIN", "BALLENA", "PINGUINO", "COCODRILO", "SERPIENTE", "AGUILA", "HALCON", "BUHO"],
    3: ["RINOCERONTE", "HIPOPOTAMO", "ORNITORRINCO", "CAMELLO", "PANDA", "KOALA", "CANGURO", "LEMUR", "MURCIELAGO", "CHIMPANCE"]
};

const animals_game_hangmanParts = [
    'hangman-head', 'hangman-body', 'hangman-arm-left', 'hangman-arm-right', 'hangman-leg-left', 'hangman-leg-right'
];

// ====================================================================================
// ESTADO ACTUAL DEL JUEGO
// Variables que controlan el progreso del jugador y la partida.
// ====================================================================================
let animals_game_currentLevel = 1;         // Nivel actual del juego
let animals_game_selectedWord = "";        // Palabra seleccionada para adivinar
let animals_game_guessedWord = [];         // Letras adivinadas de la palabra
let animals_game_wrongGuesses = 0;         // Número de intentos errados
let animals_game_lettersUsed = [];         // Letras ya intentadas por el jugador
let animals_game_timerInterval;            // Referencia al intervalo del temporizador
let animals_game_timeLeft = 120;           // Tiempo restante en segundos (2 minutos)
const animals_game_maxWrongGuesses = 6;    // Máximo de errores permitidos antes de Game Over

// Requisitos y recompensas por nivel
const animals_game_levelRequirements = {
    1: { maxErrors: 5, reward: { gold: 5, diamonds: 0 } },
    2: { maxErrors: 3, reward: { gold: 10, diamonds: 0 } },
    3: { maxErrors: 2, reward: { gold: 20, diamonds: 30 } } // Recompensa final del juego
};

// ====================================================================================
// ELEMENTOS DEL DOM
// Referencias a los elementos HTML para interactuar con la interfaz.
// ====================================================================================
const animals_game_wordDisplay = document.getElementById('word-display');
const animals_game_guessInput = document.getElementById('guess-input');
const animals_game_submitButton = document.getElementById('submit-guess');
const animals_game_messageDisplay = document.getElementById('message');
const animals_game_levelDisplay = document.getElementById('level-display');
const animals_game_wrongGuessesDisplay = document.getElementById('wrong-guesses-display');
const animals_game_timerDisplay = document.getElementById('timer-display');
const animals_game_lettersUsedDisplay = document.getElementById('letters-used-display');
const animals_game_loaderWrapper = document.getElementById('loader-wrapper');

// --- Supabase Config (Asegúrate de que estas claves sean las correctas para tu proyecto) ---
// NOTA: Se incluye aquí para que el script sea completamente autónomo.
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
async function animals_game_initializeGame(level = 1) {
    animals_game_currentLevel = level;
    
    // Asegura que el nivel exista en wordLists de animales
    if (!animals_game_wordLists[animals_game_currentLevel] || animals_game_wordLists[animals_game_currentLevel].length === 0) {
        console.error(`Error (Animals Game): No words found for level ${animals_game_currentLevel}. Resetting to level 1.`);
        animals_game_currentLevel = 1; // Vuelve al nivel 1 si el actual no tiene palabras
        if (!animals_game_wordLists[animals_game_currentLevel] || animals_game_wordLists[animals_game_currentLevel].length === 0) {
            Swal.fire({ icon: 'error', title: 'Error de Palabras', text: 'No se encontraron palabras de animales para iniciar el juego. Por favor, contacta soporte.', customClass: { popup: 'swal2-custom-game-over' } });
            return; // Detiene la inicialización si no hay palabras ni siquiera en el nivel 1
        }
    }

    animals_game_selectedWord = animals_game_wordLists[animals_game_currentLevel][Math.floor(Math.random() * animals_game_wordLists[animals_game_currentLevel].length)].toUpperCase();
    animals_game_guessedWord = Array(animals_game_selectedWord.length).fill('_');
    animals_game_wrongGuesses = 0;
    animals_game_lettersUsed = [];
    animals_game_timeLeft = 120;
    animals_game_messageDisplay.textContent = "";
    animals_game_guessInput.value = "";
    
    animals_game_updateDisplay();
    animals_game_updateHangmanDrawing();
    animals_game_startTimer();
    animals_game_guessInput.focus();
    
    animals_game_levelDisplay.textContent = animals_game_currentLevel;
    animals_game_wrongGuessesDisplay.textContent = animals_game_wrongGuesses;
    animals_game_lettersUsedDisplay.textContent = '';
}

/**
 * Actualiza la visualización de la palabra, errores y letras usadas en la interfaz.
 */
function animals_game_updateDisplay() {
    animals_game_wordDisplay.textContent = animals_game_guessedWord.join(' ');
    animals_game_wrongGuessesDisplay.textContent = animals_game_wrongGuesses;
    // Muestra las letras usadas, destacando las incorrectas.
    animals_game_lettersUsedDisplay.innerHTML = animals_game_lettersUsed.map(letter => {
        return animals_game_selectedWord.includes(letter) ? `<span>${letter}</span>` : `<strong style="color:#B22222;">${letter}</strong>`; // Rojo suave para errores
    }).join(', ');
}

/**
 * Muestra u oculta las partes del dibujo del ahorcado según el número de errores.
 */
function animals_game_updateHangmanDrawing() {
    console.log(`DEBUG (Animals Game): updateHangmanDrawing called. wrongGuesses: ${animals_game_wrongGuesses}`);
    animals_game_hangmanParts.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        if (partElement) {
            if (index < animals_game_wrongGuesses) {
                partElement.classList.add('show-part'); // Muestra la parte si el error es suficiente
                console.log(`DEBUG (Animals Game): Adding 'show-part' to ${partId}`);
            } else {
                partElement.classList.remove('show-part'); // Oculta la parte
                console.log(`DEBUG (Animals Game): Removing 'show-part' from ${partId}`);
            }
        } else {
            console.warn(`DEBUG (Animals Game): Element with ID '${partId}' not found in HTML. Check your HTML structure.`);
        }
    });
}

/**
 * Inicia o reinicia el temporizador del juego.
 */
function animals_game_startTimer() {
    clearInterval(animals_game_timerInterval); // Limpia cualquier temporizador existente
    animals_game_timerInterval = setInterval(() => {
        animals_game_timeLeft--;
        animals_game_timerDisplay.textContent = animals_game_timeLeft;
        if (animals_game_timeLeft <= 0) {
            clearInterval(animals_game_timerInterval);
            animals_game_handleGameOver(false, "¡Se acabó el tiempo! La palabra era: " + animals_game_selectedWord);
        }
    }, 1000); // Actualiza cada segundo
}

/**
 * Actualiza el balance de oro y diamantes del jugador en la base de datos (Supabase).
 * @param {number} gold - Cantidad de oro a añadir.
 * @param {number} diamonds - Cantidad de diamantes a añadir.
 */
async function animals_game_updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (Animals Game):", sessionError);
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
        console.warn("No user logged in (Animals Game). Cannot update balance.");
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
        console.error("Error fetching current profile (Animals Game):", fetchError);
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
        console.error("Error updating player balance (Animals Game):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (Animals Game): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}

/**
 * Procesa la letra ingresada por el jugador.
 */
async function animals_game_checkGuess() {
    const guess = animals_game_guessInput.value.toUpperCase();
    animals_game_guessInput.value = ""; // Limpia el input

    // Validaciones de entrada
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        animals_game_messageDisplay.textContent = "Por favor, ingresa una sola letra válida.";
        return;
    }

    if (animals_game_lettersUsed.includes(guess)) {
        animals_game_messageDisplay.textContent = `Ya adivinaste la letra '${guess}'. Intenta con otra.`;
        return;
    }

    animals_game_lettersUsed.push(guess); // Añade la letra a las usadas

    if (animals_game_selectedWord.includes(guess)) {
        // La letra es correcta, actualiza la palabra adivinada
        for (let i = 0; i < animals_game_selectedWord.length; i++) {
            if (animals_game_selectedWord[i] === guess) {
                animals_game_guessedWord[i] = guess;
            }
        }
        animals_game_messageDisplay.textContent = `¡Bien! La letra '${guess}' es correcta.`;
    } else {
        // La letra es incorrecta
        animals_game_wrongGuesses++;
        animals_game_messageDisplay.textContent = `Incorrecto. Te quedan ${animals_game_maxWrongGuesses - animals_game_wrongGuesses} intentos.`;
        animals_game_updateHangmanDrawing(); // Dibuja una parte más del ahorcado
    }

    animals_game_updateDisplay(); // Actualiza la interfaz
    await animals_game_checkGameStatus(); // Verifica el estado del juego (victoria/derrota)
}

/**
 * Verifica si el juego ha terminado (victoria o derrota) y maneja las recompensas/transiciones.
 */
async function animals_game_checkGameStatus() {
    // Si la palabra ha sido completamente adivinada
    if (animals_game_guessedWord.join('') === animals_game_selectedWord) {
        clearInterval(animals_game_timerInterval); // Detiene el temporizador

        const goldPerWord = 10;
        await animals_game_updatePlayerBalance(goldPerWord, 0); // Otorga oro por adivinar la palabra

        const errorsAllowed = animals_game_levelRequirements[animals_game_currentLevel].maxErrors;

        // Si el jugador cumple con el requisito de errores para avanzar/ganar
        if (animals_game_wrongGuesses <= errorsAllowed) {
            // Si hay más niveles
            if (animals_game_currentLevel < Object.keys(animals_game_wordLists).length) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Nivel Completado!',
                    html: `¡Perfecto! Has adivinado la palabra **"${animals_game_selectedWord}"** con ${animals_game_wrongGuesses} errores.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por esta palabra!<br>¡Pasas al Nivel ${animals_game_currentLevel + 1}!`,
                    confirmButtonText: 'Siguiente Nivel',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-level-up' // Clase personalizada para pop-up de nivel completado
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        animals_game_initializeGame(animals_game_currentLevel + 1); // Carga el siguiente nivel
                    }
                });
            } else {
                // El jugador ha completado todos los niveles (Maestro de Ahorcado de Animales)
                const finalReward = animals_game_levelRequirements[animals_game_currentLevel].reward;
                await animals_game_updatePlayerBalance(finalReward.gold, finalReward.diamonds); // Otorga la recompensa final

                Swal.fire({
                    icon: 'success',
                    title: '¡FELICITACIONES, ERES EL MAESTRO DE AHORCADO DE ANIMALES!',
                    html: `¡Lo lograste! Has superado todos los niveles de animales.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por la última palabra!<br>¡Como recompensa final, has ganado <strong>${finalReward.diamonds} Diamantes <i class="fas fa-gem"></i></strong> y <strong>${finalReward.gold} Oro <i class="fas fa-coins"></i></strong> adicionales!`,
                    confirmButtonText: '¡A Jugar de Nuevo!',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-final-success' // Clase personalizada para pop-up de éxito final
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        animals_game_initializeGame(); // Reinicia el juego al nivel 1 de animales
                    }
                });
            }
        } else {
            // La palabra fue adivinada, pero con demasiados errores para avanzar de nivel
            Swal.fire({
                icon: 'warning',
                title: 'Palabra Adivinada, ¡pero cuidado!',
                html: `Adivinaste la palabra **"${animals_game_selectedWord}"**, pero tuviste ${animals_game_wrongGuesses} errores. Necesitabas ${errorsAllowed} para avanzar al siguiente nivel. <br>Por tu esfuerzo, ganas <strong>${goldPerWord} Oro <i class="fas fa-coins"></i></strong>.`,
                confirmButtonText: 'Volver a Intentar',
                customClass: {
                    confirmButton: 'swal2-confirm-button',
                    popup: 'swal2-custom-warning' // Clase personalizada para pop-up de advertencia
                },
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    animals_game_initializeGame(); // Reinicia el juego al nivel 1 de animales
                }
            });
        }
    } else if (animals_game_wrongGuesses >= animals_game_maxWrongGuesses) {
        // El jugador ha agotado todos sus intentos
        animals_game_handleGameOver(false, `¡Has superado los ${animals_game_maxWrongGuesses} errores! La palabra era: **${animals_game_selectedWord}**`);
    }
}

/**
 * Maneja el fin del juego, mostrando un mensaje de victoria o derrota.
 * @param {boolean} isWin - True si el jugador ganó, false si perdió.
 * @param {string} message - Mensaje a mostrar al jugador.
 */
async function animals_game_handleGameOver(isWin, message) {
    clearInterval(animals_game_timerInterval); // Detiene el temporizador
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
            animals_game_initializeGame(); // Reinicia el juego
        }
    });
}

// ====================================================================================
// MANEJADORES DE EVENTOS
// Conecta las acciones del usuario con la lógica del juego.
// ====================================================================================

animals_game_submitButton.addEventListener('click', animals_game_checkGuess);

animals_game_guessInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        await animals_game_checkGuess();
    }
});

// LÓGICA PARA EL CARGADOR Y LA INICIALIZACIÓN DEL JUEGO
document.addEventListener('DOMContentLoaded', () => {
    // 1. Ocultar el cargador después de un tiempo fijo (ej. 2 segundos)
    setTimeout(() => {
        if (animals_game_loaderWrapper) {
            animals_game_loaderWrapper.classList.add('hidden');
        }
    }, 2000); // 2000 milisegundos = 2 segundos

    // 2. Inicializar el juego inmediatamente cuando el DOM esté cargado.
    //    Esto ocurre en paralelo con el temporizador del cargador.
    animals_game_initializeGame();
});