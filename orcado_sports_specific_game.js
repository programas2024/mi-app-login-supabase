// orcado_sports_specific_game.js - Logic for the Hangman game (Sports theme, with levels)

// IMPORTANT: Import createClient from the Supabase CDN URL as an ES module!
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// GAME INITIAL CONFIGURATION
// Contains word lists for each level and hangman drawing configurations.
// ====================================================================================
const sports_game_wordLists = {
    1: ["FUTBOL", "BALONCESTO", "TENIS", "NATACION", "ATLETISMO", "CICLISMO", "VOLEIBOL", "BOXEO", "GOLF", "RUGBY"],
    2: ["BADMINTON", "ESGRIMA", "GIMNASIA", "HOCKEY", "JUDO", "KARATE", "LUCHA", "REMO", "SURF", "TRIATLON"],
    3: ["ESQUI", "SNOWBOARD", "PATINAJE", "ESCALADA", "PARACAIDISMO", "BUCEO", "VELA", "ESNORKEL", "BALONMANO", "WATERPOLO"]
};

const sports_game_hangmanParts = [
    'hangman-head', 'hangman-body', 'hangman-arm-left', 'hangman-arm-right', 'hangman-leg-left', 'hangman-leg-right'
];

// ====================================================================================
// CURRENT GAME STATE
// Variables that control player progress and the game session.
// ====================================================================================
let sports_game_currentLevel = 1;         // Current game level
let sports_game_selectedWord = "";        // Word selected to guess
let sports_game_guessedWord = [];         // Guessed letters of the word
let sports_game_wrongGuesses = 0;         // Number of incorrect attempts
let sports_game_lettersUsed = [];         // Letters already tried by the player
let sports_game_timerInterval;            // Reference to the timer interval
let sports_game_timeLeft = 120;           // Time remaining in seconds (2 minutes)
const sports_game_maxWrongGuesses = 6;    // Maximum allowed errors before Game Over

// Level requirements and rewards
const sports_game_levelRequirements = {
    1: { maxErrors: 5, reward: { gold: 5, diamonds: 0 } },
    2: { maxErrors: 3, reward: { gold: 10, diamonds: 0 } },
    3: { maxErrors: 2, reward: { gold: 20, diamonds: 30 } } // Final game reward
};

// ====================================================================================
// DOM ELEMENTS
// References to HTML elements for interacting with the interface.
// ====================================================================================
const sports_game_wordDisplay = document.getElementById('word-display');
const sports_game_guessInput = document.getElementById('guess-input');
const sports_game_submitButton = document.getElementById('submit-guess');
const sports_game_messageDisplay = document.getElementById('message');
const sports_game_levelDisplay = document.getElementById('level-display');
const sports_game_wrongGuessesDisplay = document.getElementById('wrong-guesses-display');
const sports_game_timerDisplay = document.getElementById('timer-display');
const sports_game_lettersUsedDisplay = document.getElementById('letters-used-display');
const sports_game_loaderWrapper = document.getElementById('loader-wrapper');

// --- Supabase Config ---
const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ====================================================================================
// MAIN GAME FUNCTIONS
// Logic for initializing, updating, and managing the game.
// ====================================================================================

/**
 * Initializes or restarts the game for a specific level.
 * @param {number} level - The level to initialize the game to. Defaults to 1.
 */
async function sports_game_initializeGame(level = 1) {
    sports_game_currentLevel = level;
    
    // Ensure the level exists in the sports wordLists
    if (!sports_game_wordLists[sports_game_currentLevel] || sports_game_wordLists[sports_game_currentLevel].length === 0) {
        console.error(`Error (Sports Game): No words found for level ${sports_game_currentLevel}. Resetting to level 1.`);
        sports_game_currentLevel = 1; // Fallback to level 1 if current level has no words
        if (!sports_game_wordLists[sports_game_currentLevel] || sports_game_wordLists[sports_game_currentLevel].length === 0) {
            Swal.fire({ icon: 'error', title: 'Error de Palabras', text: 'No se encontraron palabras de deportes para iniciar el juego. Por favor, contacta soporte.', customClass: { popup: 'swal2-custom-game-over' } });
            return; // Stop initialization if no fallback words are found
        }
    }

    sports_game_selectedWord = sports_game_wordLists[sports_game_currentLevel][Math.floor(Math.random() * sports_game_wordLists[sports_game_currentLevel].length)].toUpperCase();
    sports_game_guessedWord = Array(sports_game_selectedWord.length).fill('_');
    sports_game_wrongGuesses = 0;
    sports_game_lettersUsed = [];
    sports_game_timeLeft = 120;
    sports_game_messageDisplay.textContent = "";
    sports_game_guessInput.value = "";
    
    sports_game_updateDisplay();
    sports_game_updateHangmanDrawing();
    sports_game_startTimer();
    sports_game_guessInput.focus();
    
    sports_game_levelDisplay.textContent = sports_game_currentLevel;
    sports_game_wrongGuessesDisplay.textContent = sports_game_wrongGuesses;
    sports_game_lettersUsedDisplay.textContent = '';
}

/**
 * Updates the display of the word, errors, and used letters in the interface.
 */
function sports_game_updateDisplay() {
    sports_game_wordDisplay.textContent = sports_game_guessedWord.join(' ');
    sports_game_wrongGuessesDisplay.textContent = sports_game_wrongGuesses;
    // Show used letters, highlighting incorrect ones.
    sports_game_lettersUsedDisplay.innerHTML = sports_game_lettersUsed.map(letter => {
        return sports_game_selectedWord.includes(letter) ? `<span>${letter}</span>` : `<strong style="color:#B22222;">${letter}</strong>`; // Soft red for errors
    }).join(', ');
}

/**
 * Shows or hides parts of the hangman drawing based on the number of errors.
 */
function sports_game_updateHangmanDrawing() {
    console.log(`DEBUG (Sports Game): updateHangmanDrawing called. wrongGuesses: ${sports_game_wrongGuesses}`);
    sports_game_hangmanParts.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        if (partElement) {
            if (index < sports_game_wrongGuesses) {
                partElement.classList.add('show-part'); // Show the part if enough errors
                console.log(`DEBUG (Sports Game): Adding 'show-part' to ${partId}`);
            } else {
                partElement.classList.remove('show-part'); // Hide the part
                console.log(`DEBUG (Sports Game): Removing 'show-part' from ${partId}`);
            }
        } else {
            console.warn(`DEBUG (Sports Game): Element with ID '${partId}' not found in HTML. Check your HTML structure.`);
        }
    });
}

/**
 * Starts or restarts the game timer.
 */
function sports_game_startTimer() {
    clearInterval(sports_game_timerInterval); // Clear any existing timer
    sports_game_timerInterval = setInterval(() => {
        sports_game_timeLeft--;
        sports_game_timerDisplay.textContent = sports_game_timeLeft;
        if (sports_game_timeLeft <= 0) {
            clearInterval(sports_game_timerInterval);
            sports_game_handleGameOver(false, "¡Se acabó el tiempo! La palabra era: " + sports_game_selectedWord);
        }
    }, 1000); // Update every second
}

/**
 * Updates the player's gold and diamond balance in the database (Supabase).
 * @param {number} gold - Amount of gold to add.
 * @param {number} diamonds - Amount of diamonds to add.
 */
async function sports_game_updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (Sports Game):", sessionError);
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
        console.warn("No user logged in (Sports Game). Cannot update balance.");
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
        console.error("Error fetching current profile (Sports Game):", fetchError);
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
        console.error("Error updating player balance (Sports Game):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (Sports Game): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}

/**
 * Processes the letter entered by the player.
 */
async function sports_game_checkGuess() {
    const guess = sports_game_guessInput.value.toUpperCase();
    sports_game_guessInput.value = ""; // Clear the input

    // Input validations
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        sports_game_messageDisplay.textContent = "Por favor, ingresa una sola letra válida.";
        return;
    }

    if (sports_game_lettersUsed.includes(guess)) {
        sports_game_messageDisplay.textContent = `Ya adivinaste la letra '${guess}'. Intenta con otra.`;
        return;
    }

    sports_game_lettersUsed.push(guess); // Add the letter to used ones

    if (sports_game_selectedWord.includes(guess)) {
        // Correct letter, update the guessed word
        for (let i = 0; i < sports_game_selectedWord.length; i++) {
            if (sports_game_selectedWord[i] === guess) {
                sports_game_guessedWord[i] = guess;
            }
        }
        sports_game_messageDisplay.textContent = `¡Bien! La letra '${guess}' es correcta.`;
    } else {
        // Incorrect letter
        sports_game_wrongGuesses++;
        sports_game_messageDisplay.textContent = `Incorrecto. Te quedan ${sports_game_maxWrongGuesses - sports_game_wrongGuesses} intentos.`;
        sports_game_updateHangmanDrawing(); // Draw one more hangman part
    }

    sports_game_updateDisplay(); // Update the interface
    await sports_game_checkGameStatus(); // Check game status (win/loss)
}

/**
 * Checks if the game has ended (win or loss) and handles rewards/transitions.
 */
async function sports_game_checkGameStatus() {
    // If the word has been completely guessed
    if (sports_game_guessedWord.join('') === sports_game_selectedWord) {
        clearInterval(sports_game_timerInterval); // Stop the timer

        const goldPerWord = 10;
        await sports_game_updatePlayerBalance(goldPerWord, 0); // Grant gold for guessing the word

        const errorsAllowed = sports_game_levelRequirements[sports_game_currentLevel].maxErrors;

        // If the player meets the error requirement to advance/win
        if (sports_game_wrongGuesses <= errorsAllowed) {
            // If there are more levels
            if (sports_game_currentLevel < Object.keys(sports_game_wordLists).length) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Nivel Completado!',
                    html: `¡Perfecto! Has adivinado la palabra **"${sports_game_selectedWord}"** con ${sports_game_wrongGuesses} errores.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por esta palabra!<br>¡Pasas al Nivel ${sports_game_currentLevel + 1}!`,
                    confirmButtonText: 'Siguiente Nivel',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-level-up' // Custom class for level completed popup
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        sports_game_initializeGame(sports_game_currentLevel + 1); // Load the next level
                    }
                });
            } else {
                // The player has completed all levels (Sports Hangman Master)
                const finalReward = sports_game_levelRequirements[sports_game_currentLevel].reward;
                await sports_game_updatePlayerBalance(finalReward.gold, finalReward.diamonds); // Grant final reward

                Swal.fire({
                    icon: 'success',
                    title: '¡FELICITACIONES, ERES EL MAESTRO DE AHORCADO DE DEPORTES!',
                    html: `¡Lo lograste! Has superado todos los niveles de deportes.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por la última palabra!<br>¡Como recompensa final, has ganado <strong>${finalReward.diamonds} Diamantes <i class="fas fa-gem"></i></strong> y <strong>${finalReward.gold} Oro <i class="fas fa-coins"></i></strong> adicionales!`,
                    confirmButtonText: '¡A Jugar de Nuevo!',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-final-success' // Custom class for final success popup
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        sports_game_initializeGame(); // Restart the game at level 1 of sports
                    }
                });
            }
        } else {
            // The word was guessed, but with too many errors to advance level
            Swal.fire({
                icon: 'warning',
                title: 'Palabra Adivinada, ¡pero cuidado!',
                html: `Adivinaste la palabra **"${sports_game_selectedWord}"**, pero tuviste ${sports_game_wrongGuesses} errores. Necesitabas ${errorsAllowed} para avanzar al siguiente nivel. <br>Por tu esfuerzo, ganas <strong>${goldPerWord} Oro <i class="fas fa-coins"></i></strong>.`,
                confirmButtonText: 'Volver a Intentar',
                customClass: {
                    confirmButton: 'swal2-confirm-button',
                    popup: 'swal2-custom-warning' // Custom class for warning popup
                },
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    sports_game_initializeGame(); // Restart the game at level 1 of sports
                }
            });
        }
    } else if (sports_game_wrongGuesses >= sports_game_maxWrongGuesses) {
        // Player has exhausted all attempts
        sports_game_handleGameOver(false, `¡Has superado los ${sports_game_maxWrongGuesses} errores! La palabra era: **${sports_game_selectedWord}**`);
    }
}

/**
 * Handles game over, displaying a win or loss message.
 * @param {boolean} isWin - True if the player won, false if lost.
 * @param {string} message - Message to display to the player.
 */
async function sports_game_handleGameOver(isWin, message) {
    clearInterval(sports_game_timerInterval); // Stop the timer
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
            sports_game_initializeGame(); // Restart the game
        }
    });
}

// ====================================================================================
// EVENT HANDLERS
// Connects user actions with game logic.
// ====================================================================================

sports_game_submitButton.addEventListener('click', sports_game_checkGuess);

sports_game_guessInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        await sports_game_checkGuess();
    }
});

// LOADER LOGIC AND GAME INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide the loader after a fixed time (e.g., 2 seconds)
    setTimeout(() => {
        if (sports_game_loaderWrapper) {
            sports_game_loaderWrapper.classList.add('hidden');
        }
    }, 2000); // 2000 milliseconds = 2 seconds

    // 2. Initialize the game immediately when the DOM is loaded.
    //    This happens in parallel with the loader timer.
    sports_game_initializeGame();
});