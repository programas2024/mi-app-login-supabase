// orcado_vs_algo_game.js - Logic for the Hangman game (VS. Algorithm theme, with levels and scoring)

// IMPORTANT: Import createClient from the Supabase CDN URL as an ES module!
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// GAME INITIAL CONFIGURATION
// Contains word lists for each level and hangman drawing configurations.
// ====================================================================================
const vs_game_wordLists = {
    1: [
        // Programación - Nivel 1 (Fácil)
        "WEB", "ALGORITMO", "CODIGO", "SISTEMA",
        // Animales - Nivel 1 (Fácil)
        "LEON", "GATO", "PERRO", "PEZ",
        // Escritores - Nivel 1 (Fácil)
        "LIBRO", "AUTOR", "POEMA", "TEXTO",
        // Carreras - Nivel 1 (Fácil)
        "MEDICO", "CHEF", "MAESTRO", "POLICIA",
        // Deportes - Nivel 1 (Fácil)
        "FUTBOL", "TENIS", "GOLF", "BOXEO",
        // Inglés - Nivel 1 (Fácil)
        "HELLO", "BOOK", "APPLE", "HOUSE",
        // Países - Nivel 1 (Fácil)
        "INDIA", "CHINA", "CUBA", "PERU",
        // Género Musical - Nivel 1 (Fácil)
        "POP", "ROCK", "JAZZ", "BLUES",
        // Frutas - Nivel 1 (Fácil)
        "MANZANA", "UVA", "FRESA", "KIWI",
        // Ciencia - Nivel 1 (Fácil)
        "FISICA", "QUIMICA", "TEORIA", "ATOMO",
        // Biología - Nivel 1 (Fácil)
        "CELULA", "ADN", "VIRUS", "FLORA"
    ],
    2: [
        // Programación - Nivel 2 (Medio)
        "JAVASCRIPT", "SERVIDOR", "DATABASE", "FRAMEWORK",
        // Animales - Nivel 2 (Medio)
        "ELEFANTE", "DELFIN", "PINGUINO", "COCODRILO",
        // Escritores - Nivel 2 (Medio)
        "NOVELA", "POESIA", "DRAMA", "CERVANTES",
        // Carreras - Nivel 2 (Medio)
        "INGENIERO", "PILOTO", "ARQUITECTO", "CONTADOR",
        // Deportes - Nivel 2 (Medio)
        "BALONCESTO", "NATACION", "CICLISMO", "VOLEIBOL",
        // Inglés - Nivel 2 (Medio)
        "COMPUTER", "LANGUAGE", "SOFTWARE", "HARDWARE",
        // Países - Nivel 2 (Medio)
        "COLOMBIA", "MEXICO", "ARGENTINA", "BRASIL",
        // Género Musical - Nivel 2 (Medio)
        "COUNTRY", "REGGAE", "SALSA", "CUMBIA",
        // Frutas - Nivel 2 (Medio)
        "PLATANO", "NARANJA", "SANDIA", "MANGO",
        // Ciencia - Nivel 2 (Medio)
        "ASTRONOMIA", "GEOLOGIA", "EXPERIMENTO", "GRAVEDAD",
        // Biología - Nivel 2 (Medio)
        "ECOSISTEMA", "EVOLUCION", "FOTOSINTESIS", "ORGANISMO"
    ],
    3: [
        // Programación - Nivel 3 (Difícil)
        "CIBERSEGURIDAD", "NANOTECNOLOGIA", "INTELIGENCIA", "MICROSERVICIO",
        // Animales - Nivel 3 (Difícil)
        "RINOCERONTE", "ORNITORRINCO", "HIPOPOTAMO", "CHIMPANCE",
        // Escritores - Nivel 3 (Difícil)
        "SHAKESPEARE", "DOSTOYEVSKI", "HEMINGWAY", "MARQUEZ",
        // Carreras - Nivel 3 (Difícil)
        "ASTRONAUTA", "CIENTIFICO", "INVESTIGADOR", "CRIMINOLOGO",
        // Deportes - Nivel 3 (Difícil)
        "PARACAIDISMO", "TRIATLON", "ESGRIMA", "GIMNASIA",
        // Inglés - Nivel 3 (Difícil)
        "INTELLIGENCE", "CRYPTOGRAPHY", "APPLICATION", "AUTOMATION",
        // Países - Nivel 3 (Difícil)
        "SUDAFRICA", "AUSTRALIA", "INDONESIA", "NUEVAZELANDA",
        // Género Musical - Nivel 3 (Difícil)
        "ELECTRONICA", "HIPHOP", "VALLENATO", "FLAMENCO",
        // Frutas - Nivel 3 (Difícil)
        "PITAHAYA", "CHIRIMOYA", "RAMBUTAN", "TAMARINDO",
        // Ciencia - Nivel 3 (Difícil)
        "LABORATORIO", "TELESCOPIO", "CUANTICA", "GENETICA",
        // Biología - Nivel 3 (Difícil)
        "BACTERIA", "ANATOMIA", "PARASITO", "NEURONA"
    ]
};

const vs_game_hangmanParts = [
    'hangman-head', 'hangman-body', 'hangman-arm-left', 'hangman-arm-right', 'hangman-leg-left', 'hangman-leg-right'
];

// ====================================================================================
// CURRENT GAME STATE
// Variables that control player progress and the game session.
// ====================================================================================
let vs_game_currentLevel = 1;         // Current game level
let vs_game_selectedWord = "";        // Word selected to guess
let vs_game_guessedWord = [];         // Guessed letters of the word
let vs_game_wrongGuesses = 0;         // Number of incorrect attempts for current word
let vs_game_lettersUsed = [];         // Letters already tried by the player for current word
let vs_game_timerInterval;            // Reference to the timer interval
let vs_game_timeLeft = 120;           // Time remaining in seconds (2 minutes)
const vs_game_maxWrongGuesses = 6;    // Maximum allowed errors before Game Over for current word

// VS. ALGORITHM SCORING
let vs_game_playerScore = 0;          // Player's total score
let vs_game_algoScore = 0;            // Algorithm's total score
const vs_game_pointsPerCorrectLetter = 10;
const vs_game_pointsPerWrongGuess = 20;
const vs_game_playerWinBonus = 50;
const vs_game_algoWinBonus = 50;

// Requisitos y recompensas por nivel (para Supabase, si se gana el juego completo)
const vs_game_levelRequirements = {
    1: { maxErrors: 5, reward: { gold: 5, diamonds: 0 } },
    2: { maxErrors: 3, reward: { gold: 10, diamonds: 0 } },
    3: { maxErrors: 2, reward: { gold: 20, diamonds: 30 } } // Final game reward
};

// ====================================================================================
// DOM ELEMENTS
// References to HTML elements for interacting with the interface.
// ====================================================================================
const vs_game_wordDisplay = document.getElementById('word-display');
const vs_game_guessInput = document.getElementById('guess-input');
const vs_game_submitButton = document.getElementById('submit-guess');
const vs_game_messageDisplay = document.getElementById('message');
const vs_game_levelDisplay = document.getElementById('level-display');
const vs_game_wrongGuessesDisplay = document.getElementById('wrong-guesses-display');
const vs_game_timerDisplay = document.getElementById('timer-display');
const vs_game_lettersUsedDisplay = document.getElementById('letters-used-display');
const vs_game_loaderWrapper = document.getElementById('loader-wrapper');
const vs_game_playerScoreDisplay = document.getElementById('player-score-display'); // New
const vs_game_algoScoreDisplay = document.getElementById('algo-score-display');     // New

// --- Supabase Config ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBojyWvYCrR5nLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ====================================================================================
// MAIN GAME FUNCTIONS
// Logic for initializing, updating, and managing the game.
// ====================================================================================

/**
 * Initializes or restarts the game for a specific level.
 * Resets per-word game state, but keeps cumulative scores for the overall game.
 * @param {number} level - The level to initialize the game to. Defaults to 1.
 * @param {boolean} resetOverallScores - If true, resets player and algo total scores (for new game).
 */
async function vs_game_initializeGame(level = 1, resetOverallScores = true) {
    vs_game_currentLevel = level;
    
    if (resetOverallScores) {
        vs_game_playerScore = 0;
        vs_game_algoScore = 0;
    }

    // Ensure the level exists in the wordLists
    if (!vs_game_wordLists[vs_game_currentLevel] || vs_game_wordLists[vs_game_currentLevel].length === 0) {
        console.error(`Error (VS. Algo Game): No words found for level ${vs_game_currentLevel}. Resetting to level 1.`);
        vs_game_currentLevel = 1; // Fallback to level 1 if current level has no words
        if (!vs_game_wordLists[vs_game_currentLevel] || vs_game_wordLists[vs_game_currentLevel].length === 0) {
            Swal.fire({ icon: 'error', title: 'Error de Palabras', text: 'No se encontraron palabras para iniciar el juego. Por favor, contacta soporte.', customClass: { popup: 'swal2-custom-game-over' } });
            return; // Stop initialization if no fallback words are found
        }
    }

    // Shuffle words for the current level
    const shuffledWords = [...vs_game_wordLists[vs_game_currentLevel]];
    for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
    }

    vs_game_selectedWord = shuffledWords[0].toUpperCase(); // Select the first word after shuffling
    vs_game_guessedWord = Array(vs_game_selectedWord.length).fill('_');
    vs_game_wrongGuesses = 0;
    vs_game_lettersUsed = [];
    vs_game_timeLeft = 120;
    vs_game_messageDisplay.textContent = "";
    vs_game_guessInput.value = "";
    
    vs_game_updateDisplay();
    vs_game_updateHangmanDrawing();
    vs_game_startTimer();
    vs_game_guessInput.focus();
    
    vs_game_levelDisplay.textContent = vs_game_currentLevel;
    vs_game_wrongGuessesDisplay.textContent = vs_game_wrongGuesses;
    vs_game_lettersUsedDisplay.textContent = '';
}

/**
 * Updates the display of the word, errors, used letters, and scores in the interface.
 */
function vs_game_updateDisplay() {
    vs_game_wordDisplay.textContent = vs_game_guessedWord.join(' ');
    vs_game_wrongGuessesDisplay.textContent = vs_game_wrongGuesses;
    // Show used letters, highlighting incorrect ones.
    vs_game_lettersUsedDisplay.innerHTML = vs_game_lettersUsed.map(letter => {
        return vs_game_selectedWord.includes(letter) ? `<span>${letter}</span>` : `<strong style="color:#B22222;">${letter}</strong>`; // Soft red for errors
    }).join(', ');

    vs_game_playerScoreDisplay.textContent = vs_game_playerScore;
    vs_game_algoScoreDisplay.textContent = vs_game_algoScore;
}

/**
 * Shows or hides parts of the hangman drawing based on the number of errors.
 */
function vs_game_updateHangmanDrawing() {
    console.log(`DEBUG (VS. Algo Game): updateHangmanDrawing called. wrongGuesses: ${vs_game_wrongGuesses}`);
    vs_game_hangmanParts.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        if (partElement) {
            if (index < vs_game_wrongGuesses) {
                partElement.classList.add('show-part'); // Show the part if enough errors
                console.log(`DEBUG (VS. Algo Game): Adding 'show-part' to ${partId}`);
            } else {
                partElement.classList.remove('show-part'); // Hide the part
                console.log(`DEBUG (VS. Algo Game): Removing 'show-part' from ${partId}`);
            }
        } else {
            console.warn(`DEBUG (VS. Algo Game): Element with ID '${partId}' not found in HTML. Check your HTML structure.`);
        }
    });
}

/**
 * Starts or restarts the game timer.
 */
function vs_game_startTimer() {
    clearInterval(vs_game_timerInterval); // Clear any existing timer
    vs_game_timerInterval = setInterval(() => {
        vs_game_timeLeft--;
        vs_game_timerDisplay.textContent = vs_game_timeLeft;
        if (vs_game_timeLeft <= 0) {
            clearInterval(vs_game_timerInterval);
            vs_game_handleRoundEnd(false, "¡Se acabó el tiempo! La palabra era: " + vs_game_selectedWord);
        }
    }, 1000); // Update every second
}

/**
 * Updates the player's gold and diamond balance in the database (Supabase).
 * This function is called only at the very end of the *entire* VS. Algo game, if the player wins.
 * @param {number} gold - Amount of gold to add.
 * @param {number} diamonds - Amount of diamonds to add.
 */
async function vs_game_updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (VS. Algo Game):", sessionError);
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
        console.warn("No user logged in (VS. Algo Game). Cannot update balance.");
        Swal.fire({
            icon: 'info',
            title: 'Inicia Sesión para Guardar',
            text: 'Inicia sesión para que tus recompensas se guarden.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-warning' }
        });
        return;
    }

    // Try to get the current user profile.
    const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('gold, diamonds')
        .eq('id', user.id)
        .single();

    if (fetchError) {
        console.error("Error fetching current profile (VS. Algo Game):", fetchError);
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

    // Update the profile with the new values.
    const { data, error } = await supabase
        .from('profiles')
        .update({ gold: newGold, diamonds: newDiamonds })
        .eq('id', user.id);

    if (error) {
        console.error("Error updating player balance (VS. Algo Game):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (VS. Algo Game): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}

/**
 * Procesa la letra ingresada por el jugador y actualiza los puntajes.
 */
async function vs_game_checkGuess() {
    const guess = vs_game_guessInput.value.toUpperCase();
    vs_game_guessInput.value = ""; // Limpia el input

    // Validaciones de entrada
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        vs_game_messageDisplay.textContent = "Por favor, ingresa una sola letra válida.";
        return;
    }

    if (vs_game_lettersUsed.includes(guess)) {
        vs_game_messageDisplay.textContent = `Ya adivinaste la letra '${guess}'. Intenta con otra.`;
        return;
    }

    vs_game_lettersUsed.push(guess); // Añade la letra a las usadas

    if (vs_game_selectedWord.includes(guess)) {
        // La letra es correcta, actualiza la palabra adivinada
        let lettersFoundInThisGuess = 0;
        for (let i = 0; i < vs_game_selectedWord.length; i++) {
            if (vs_game_selectedWord[i] === guess) {
                if (vs_game_guessedWord[i] === '_') { // Only count if it's a new reveal
                    vs_game_guessedWord[i] = guess;
                    lettersFoundInThisGuess++;
                }
            }
        }
        vs_game_playerScore += lettersFoundInThisGuess * vs_game_pointsPerCorrectLetter;
        vs_game_messageDisplay.textContent = `¡Bien! La letra '${guess}' es correcta.`;
    } else {
        // La letra es incorrecta
        vs_game_wrongGuesses++;
        vs_game_algoScore += vs_game_pointsPerWrongGuess;
        vs_game_messageDisplay.textContent = `Incorrecto. Te quedan ${vs_game_maxWrongGuesses - vs_game_wrongGuesses} intentos.`;
        vs_game_updateHangmanDrawing(); // Dibuja una parte más del ahorcado
    }

    vs_game_updateDisplay(); // Actualiza la interfaz
    await vs_game_checkRoundEnd(); // Verifica el estado de la ronda (victoria/derrota de la palabra)
}

/**
 * Verifica si la palabra actual ha sido adivinada o si se agotaron los intentos.
 * Luego maneja la transición a la siguiente ronda o al fin del juego completo.
 */
async function vs_game_checkRoundEnd() {
    let playerWonWord = false;
    let message = "";

    // Si la palabra ha sido completamente adivinada
    if (vs_game_guessedWord.join('') === vs_game_selectedWord) {
        clearInterval(vs_game_timerInterval); // Detiene el temporizador
        vs_game_playerScore += vs_game_playerWinBonus; // Bono por adivinar la palabra
        playerWonWord = true;
        message = `¡Felicidades! Adivinaste la palabra **"${vs_game_selectedWord}"**.`;
    } else if (vs_game_wrongGuesses >= vs_game_maxWrongGuesses) {
        // El jugador ha agotado todos sus intentos
        clearInterval(vs_game_timerInterval); // Detiene el temporizador
        vs_game_algoScore += vs_game_algoWinBonus; // Bono para el algoritmo por ahorcar al jugador
        playerWonWord = false;
        message = `¡Has superado los ${vs_game_maxWrongGuesses} errores! La palabra era: **${vs_game_selectedWord}**`;
    } else {
        // La ronda aún no termina
        return;
    }

    // Actualiza la visualización final de puntajes para la ronda
    vs_game_updateDisplay();

    // Comprueba si hay más niveles
    if (vs_game_currentLevel < Object.keys(vs_game_wordLists).length) {
        Swal.fire({
            icon: playerWonWord ? 'success' : 'error',
            title: playerWonWord ? '¡Palabra Adivinada!' : '¡Ahorcado!',
            html: `${message}<br>Tu puntaje en esta ronda: <strong>${vs_game_playerScore}</strong><br>Puntaje del Algoritmo: <strong>${vs_game_algoScore}</strong><br><br>¡Pasas al Nivel ${vs_game_currentLevel + 1}!`,
            confirmButtonText: 'Siguiente Nivel',
            customClass: {
                confirmButton: 'swal2-confirm-button',
                popup: playerWonWord ? 'swal2-custom-level-up' : 'swal2-custom-game-over'
            },
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                vs_game_initializeGame(vs_game_currentLevel + 1, false); // Carga el siguiente nivel, NO reinicia puntajes generales
            }
        });
    } else {
        // Fin del juego completo (todos los niveles completados)
        await vs_game_handleGameOver();
    }
}

/**
 * Maneja el fin del juego completo, mostrando el ganador final y las recompensas.
 */
async function vs_game_handleGameOver() {
    let finalMessage = "";
    let icon = 'info'; // Default icon

    if (vs_game_playerScore > vs_game_algoScore) {
        finalMessage = `¡FELICITACIONES! Has vencido al Algoritmo.<br>Tu puntaje final: <strong>${vs_game_playerScore}</strong><br>Puntaje del Algoritmo: <strong>${vs_game_algoScore}</strong>`;
        icon = 'success';
        const finalReward = vs_game_levelRequirements[Object.keys(vs_game_levelRequirements).length].reward; // Recompensa del último nivel
        await vs_game_updatePlayerBalance(finalReward.gold, finalReward.diamonds);
        finalMessage += `<br><br>¡Como recompensa, has ganado <strong>${finalReward.diamonds} Diamantes <i class="fas fa-gem"></i></strong> y <strong>${finalReward.gold} Oro <i class="fas fa-coins"></i></strong>!`;
    } else if (vs_game_algoScore > vs_game_playerScore) {
        finalMessage = `¡GAME OVER! El Algoritmo te ha superado.<br>Tu puntaje final: <strong>${vs_game_playerScore}</strong><br>Puntaje del Algoritmo: <strong>${vs_game_algoScore}</strong>`;
        icon = 'error';
    } else {
        finalMessage = `¡EMPATE! Ha sido una batalla reñida.<br>Tu puntaje final: <strong>${vs_game_playerScore}</strong><br>Puntaje del Algoritmo: <strong>${vs_game_algoScore}</strong>`;
        icon = 'warning';
    }

    Swal.fire({
        icon: icon,
        title: '¡Juego Terminado!',
        html: finalMessage,
        confirmButtonText: 'Jugar de Nuevo',
        customClass: {
            confirmButton: 'swal2-confirm-button',
            popup: icon === 'success' ? 'swal2-custom-final-success' : (icon === 'error' ? 'swal2-custom-game-over' : 'swal2-custom-warning')
        },
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            vs_game_initializeGame(1, true); // Reinicia el juego al nivel 1 y reinicia puntajes
        }
    });
}

// ====================================================================================
// EVENT HANDLERS
// Connects user actions with game logic.
// ====================================================================================

vs_game_submitButton.addEventListener('click', vs_game_checkGuess);

vs_game_guessInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        await vs_game_checkGuess();
    }
});

// LOADER LOGIC AND GAME INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide the loader after a fixed time (e.g., 2 seconds)
    setTimeout(() => {
        if (vs_game_loaderWrapper) {
            vs_game_loaderWrapper.classList.add('hidden');
        }
    }, 2000); // 2000 milliseconds = 2 seconds

    // 2. Initialize the game immediately when the DOM is loaded.
    //    This happens in parallel with the loader timer.
    vs_game_initializeGame(1, true); // Start a new game, resetting scores
});