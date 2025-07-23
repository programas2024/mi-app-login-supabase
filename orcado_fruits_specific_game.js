// orcado_fruits_specific_game.js - Logic for the Hangman game (Fruits theme, with levels)

// IMPORTANT: Import createClient from the Supabase CDN URL as an ES module!
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// GAME INITIAL CONFIGURATION
// Contains word lists for each level and hangman drawing configurations.
// ====================================================================================
const fruits_game_wordLists = {
    1: ["MANZANA", "PLATANO", "NARANJA", "UVA", "FRESA", "SANDIA", "MANGO", "PIÑA", "PERA", "CEREZA"],
    2: ["KIWI", "MELON", "PAPAYA", "GUAYABA", "MARACUYA", "LICHIS", "GRANADA", "HIGO", "CIRUELA", "ALBARICOQUE"],
    3: ["RAMBUTAN", "PITAHAYA", "CARAMBOLA", "SALAK", "DURION", "KUMQUAT", "ACEROLA", "CHIRIMOYA", "NISPERO", "TAMARINDO"]
};

const fruits_game_hangmanParts = [
    'hangman-head', 'hangman-body', 'hangman-arm-left', 'hangman-arm-right', 'hangman-leg-left', 'hangman-leg-right'
];

// ====================================================================================
// CURRENT GAME STATE
// Variables that control player progress and the game session.
// ====================================================================================
let fruits_game_currentLevel = 1;         // Current game level
let fruits_game_selectedWord = "";        // Word selected to guess
let fruits_game_guessedWord = [];         // Guessed letters of the word
let fruits_game_wrongGuesses = 0;         // Number of incorrect attempts
let fruits_game_lettersUsed = [];         // Letters already tried by the player
let fruits_game_timerInterval;            // Reference to the timer interval
let fruits_game_timeLeft = 120;           // Time remaining in seconds (2 minutes)
const fruits_game_maxWrongGuesses = 6;    // Maximum allowed errors before Game Over

// Level requirements and rewards
const fruits_game_levelRequirements = {
    1: { maxErrors: 5, reward: { gold: 5, diamonds: 0 } },
    2: { maxErrors: 3, reward: { gold: 10, diamonds: 0 } },
    3: { maxErrors: 2, reward: { gold: 20, diamonds: 30 } } // Final game reward
};

// ====================================================================================
// DOM ELEMENTS
// References to HTML elements for interacting with the interface.
// ====================================================================================
const fruits_game_wordDisplay = document.getElementById('word-display');
const fruits_game_guessInput = document.getElementById('guess-input');
const fruits_game_submitButton = document.getElementById('submit-guess');
const fruits_game_messageDisplay = document.getElementById('message');
const fruits_game_levelDisplay = document.getElementById('level-display');
const fruits_game_wrongGuessesDisplay = document.getElementById('wrong-guesses-display');
const fruits_game_timerDisplay = document.getElementById('timer-display');
const fruits_game_lettersUsedDisplay = document.getElementById('letters-used-display');
const fruits_game_loaderWrapper = document.getElementById('loader-wrapper');

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
 * @param {number} level - The level to initialize the game to. Defaults to 1.
 */
async function fruits_game_initializeGame(level = 1) {
    fruits_game_currentLevel = level;
    
    // Ensure the level exists in the fruits wordLists
    if (!fruits_game_wordLists[fruits_game_currentLevel] || fruits_game_wordLists[fruits_game_currentLevel].length === 0) {
        console.error(`Error (Fruits Game): No words found for level ${fruits_game_currentLevel}. Resetting to level 1.`);
        fruits_game_currentLevel = 1; // Fallback to level 1 if current level has no words
        if (!fruits_game_wordLists[fruits_game_currentLevel] || fruits_game_wordLists[fruits_game_currentLevel].length === 0) {
            Swal.fire({ icon: 'error', title: 'Error de Palabras', text: 'No se encontraron palabras de frutas para iniciar el juego. Por favor, contacta soporte.', customClass: { popup: 'swal2-custom-game-over' } });
            return; // Stop initialization if no fallback words are found
        }
    }

    fruits_game_selectedWord = fruits_game_wordLists[fruits_game_currentLevel][Math.floor(Math.random() * fruits_game_wordLists[fruits_game_currentLevel].length)].toUpperCase();
    fruits_game_guessedWord = Array(fruits_game_selectedWord.length).fill('_');
    fruits_game_wrongGuesses = 0;
    fruits_game_lettersUsed = [];
    fruits_game_timeLeft = 120;
    fruits_game_messageDisplay.textContent = "";
    fruits_game_guessInput.value = "";
    
    fruits_game_updateDisplay();
    fruits_game_updateHangmanDrawing();
    fruits_game_startTimer();
    fruits_game_guessInput.focus();
    
    fruits_game_levelDisplay.textContent = fruits_game_currentLevel;
    fruits_game_wrongGuessesDisplay.textContent = fruits_game_wrongGuesses;
    fruits_game_lettersUsedDisplay.textContent = '';
}

/**
 * Updates the display of the word, errors, and used letters in the interface.
 */
function fruits_game_updateDisplay() {
    fruits_game_wordDisplay.textContent = fruits_game_guessedWord.join(' ');
    fruits_game_wrongGuessesDisplay.textContent = fruits_game_wrongGuesses;
    // Show used letters, highlighting incorrect ones.
    fruits_game_lettersUsedDisplay.innerHTML = fruits_game_lettersUsed.map(letter => {
        return fruits_game_selectedWord.includes(letter) ? `<span>${letter}</span>` : `<strong style="color:#B22222;">${letter}</strong>`; // Soft red for errors
    }).join(', ');
}

/**
 * Shows or hides parts of the hangman drawing based on the number of errors.
 */
function fruits_game_updateHangmanDrawing() {
    console.log(`DEBUG (Fruits Game): updateHangmanDrawing called. wrongGuesses: ${fruits_game_wrongGuesses}`);
    fruits_game_hangmanParts.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        if (partElement) {
            if (index < fruits_game_wrongGuesses) {
                partElement.classList.add('show-part'); // Show the part if enough errors
                console.log(`DEBUG (Fruits Game): Adding 'show-part' to ${partId}`);
            } else {
                partElement.classList.remove('show-part'); // Hide the part
                console.log(`DEBUG (Fruits Game): Removing 'show-part' from ${partId}`);
            }
        } else {
            console.warn(`DEBUG (Fruits Game): Element with ID '${partId}' not found in HTML. Check your HTML structure.`);
        }
    });
}

/**
 * Starts or restarts the game timer.
 */
function fruits_game_startTimer() {
    clearInterval(fruits_game_timerInterval); // Clear any existing timer
    fruits_game_timerInterval = setInterval(() => {
        fruits_game_timeLeft--;
        fruits_game_timerDisplay.textContent = fruits_game_timeLeft;
        if (fruits_game_timeLeft <= 0) {
            clearInterval(fruits_game_timerInterval);
            fruits_game_handleGameOver(false, "¡Se acabó el tiempo! La palabra era: " + fruits_game_selectedWord);
        }
    }, 1000); // Update every second
}

/**
 * Updates the player's gold and diamond balance in the database (Supabase).
 * @param {number} gold - Amount of gold to add.
 * @param {number} diamonds - Amount of diamonds to add.
 */
async function fruits_game_updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (Fruits Game):", sessionError);
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
        console.warn("No user logged in (Fruits Game). Cannot update balance.");
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
        console.error("Error fetching current profile (Fruits Game):", fetchError);
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
        console.error("Error updating player balance (Fruits Game):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (Fruits Game): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}

/**
 * Processes the letter entered by the player.
 */
async function fruits_game_checkGuess() {
    const guess = fruits_game_guessInput.value.toUpperCase();
    fruits_game_guessInput.value = ""; // Clear the input

    // Input validations
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        fruits_game_messageDisplay.textContent = "Por favor, ingresa una sola letra válida.";
        return;
    }

    if (fruits_game_lettersUsed.includes(guess)) {
        fruits_game_messageDisplay.textContent = `Ya adivinaste la letra '${guess}'. Intenta con otra.`;
        return;
    }

    fruits_game_lettersUsed.push(guess); // Add the letter to used ones

    if (fruits_game_selectedWord.includes(guess)) {
        // Correct letter, update the guessed word
        for (let i = 0; i < fruits_game_selectedWord.length; i++) {
            if (fruits_game_selectedWord[i] === guess) {
                fruits_game_guessedWord[i] = guess;
            }
        }
        fruits_game_messageDisplay.textContent = `¡Bien! La letra '${guess}' es correcta.`;
    } else {
        // Incorrect letter
        fruits_game_wrongGuesses++;
        fruits_game_messageDisplay.textContent = `Incorrecto. Te quedan ${fruits_game_maxWrongGuesses - fruits_game_wrongGuesses} intentos.`;
        fruits_game_updateHangmanDrawing(); // Draw one more hangman part
    }

    fruits_game_updateDisplay(); // Update the interface
    await fruits_game_checkGameStatus(); // Check game status (win/loss)
}

/**
 * Checks if the game has ended (win or loss) and handles rewards/transitions.
 */
async function fruits_game_checkGameStatus() {
    // If the word has been completely guessed
    if (fruits_game_guessedWord.join('') === fruits_game_selectedWord) {
        clearInterval(fruits_game_timerInterval); // Stop the timer

        const goldPerWord = 10;
        await fruits_game_updatePlayerBalance(goldPerWord, 0); // Grant gold for guessing the word

        const errorsAllowed = fruits_game_levelRequirements[fruits_game_currentLevel].maxErrors;

        // If the player meets the error requirement to advance/win
        if (fruits_game_wrongGuesses <= errorsAllowed) {
            // If there are more levels
            if (fruits_game_currentLevel < Object.keys(fruits_game_wordLists).length) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Nivel Completado!',
                    html: `¡Perfecto! Has adivinado la palabra **"${fruits_game_selectedWord}"** con ${fruits_game_wrongGuesses} errores.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por esta palabra!<br>¡Pasas al Nivel ${fruits_game_currentLevel + 1}!`,
                    confirmButtonText: 'Siguiente Nivel',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-level-up' // Custom class for level completed popup
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        fruits_game_initializeGame(fruits_game_currentLevel + 1); // Load the next level
                    }
                });
            } else {
                // The player has completed all levels (Fruits Hangman Master)
                const finalReward = fruits_game_levelRequirements[fruits_game_currentLevel].reward;
                await fruits_game_updatePlayerBalance(finalReward.gold, finalReward.diamonds); // Grant final reward

                Swal.fire({
                    icon: 'success',
                    title: '¡FELICITACIONES, ERES EL MAESTRO DE AHORCADO DE FRUTAS!',
                    html: `¡Lo lograste! Has superado todos los niveles de frutas.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por la última palabra!<br>¡Como recompensa final, has ganado <strong>${finalReward.diamonds} Diamantes <i class="fas fa-gem"></i></strong> y <strong>${finalReward.gold} Oro <i class="fas fa-coins"></i></strong> adicionales!`,
                    confirmButtonText: '¡A Jugar de Nuevo!',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-final-success' // Custom class for final success popup
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        fruits_game_initializeGame(); // Restart the game at level 1 of Fruits
                    }
                });
            }
        } else {
            // The word was guessed, but with too many errors to advance level
            Swal.fire({
                icon: 'warning',
                title: 'Palabra Adivinada, ¡pero cuidado!',
                html: `Adivinaste la palabra **"${fruits_game_selectedWord}"**, pero tuviste ${fruits_game_wrongGuesses} errores. Necesitabas ${errorsAllowed} para avanzar al siguiente nivel. <br>Por tu esfuerzo, ganas <strong>${goldPerWord} Oro <i class="fas fa-coins"></i></strong>.`,
                confirmButtonText: 'Volver a Intentar',
                customClass: {
                    confirmButton: 'swal2-confirm-button',
                    popup: 'swal2-custom-warning' // Custom class for warning popup
                },
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    fruits_game_initializeGame(); // Restart the game at level 1 of Fruits
                }
            });
        }
    } else if (fruits_game_wrongGuesses >= fruits_game_maxWrongGuesses) {
        // Player has exhausted all attempts
        fruits_game_handleGameOver(false, `¡Has superado los ${fruits_game_maxWrongGuesses} errores! La palabra era: **${fruits_game_selectedWord}**`);
    }
}

/**
 * Handles game over, displaying a win or loss message.
 * @param {boolean} isWin - True if the player won, false if lost.
 * @param {string} message - Message to display to the player.
 */
async function fruits_game_handleGameOver(isWin, message) {
    clearInterval(fruits_game_timerInterval); // Stop the timer
    Swal.fire({
        icon: isWin ? 'success' : 'error',
        title: isWin ? '¡Ganaste!' : '¡Game Over!',
        html: message,
        confirmButtonText: 'Intentar de nuevo',
        customClass: {
            confirmButton: 'swal2-confirm-button',
            popup: isWin ? 'swal2-custom-final-success' : 'swal2-custom-game-over' // Custom classes
        },
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            fruits_game_initializeGame(); // Restart the game
        }
    });
}

// ====================================================================================
// EVENT HANDLERS
// Connects user actions with game logic.
// ====================================================================================

fruits_game_submitButton.addEventListener('click', fruits_game_checkGuess);

fruits_game_guessInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        await fruits_game_checkGuess();
    }
});

// LOADER LOGIC AND GAME INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide the loader after a fixed time (e.g., 2 seconds)
    setTimeout(() => {
        if (fruits_game_loaderWrapper) {
            fruits_game_loaderWrapper.classList.add('hidden');
        }
    }, 2000); // 2000 milliseconds = 2 seconds

    // 2. Initialize the game immediately when the DOM is loaded.
    //    This happens in parallel with the loader timer.
    fruits_game_initializeGame();
});