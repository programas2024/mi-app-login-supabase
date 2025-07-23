// orcado_all_inclusive_specific_game.js - Logic for the Hangman game (All Inclusive theme, with levels)

// IMPORTANT: Import createClient from the Supabase CDN URL as an ES module!
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// GAME INITIAL CONFIGURATION
// Contains word lists for each level and hangman drawing configurations.
// ====================================================================================
const all_inclusive_game_wordLists = {
    1: [
        // Programación - Nivel 1
        "PROGRAMACION", "JAVASCRIPT", "DESARROLLO", "WEB", "COMPUTADORA", "ALGORITMO", "TECNOLOGIA", "INTERNET", "NAVEGADOR", "APLICACION",
        // Animales - Nivel 1
        "PERRO", "GATO", "LEON", "TIGRE", "OSO", "LOBO", "ZORRO", "CONEJO", "CERDO", "VACA",
        // Escritores - Nivel 1
        "NOVELA", "POESIA", "CUENTO", "DRAMA", "AUTOR", "LIBRO", "PLUMA", "TINTA", "PAGINA", "LECTOR",
        // Carreras - Nivel 1
        "MEDICO", "MAESTRO", "POLICIA", "BOMBERO", "CHEF", "ARTISTA", "PILOTO", "ENFERMERA", "SECRETARIA", "ABOGADO",
        // Deportes - Nivel 1
        "FUTBOL", "BALONCESTO", "TENIS", "NATACION", "ATLETISMO", "CICLISMO", "VOLEIBOL", "BOXEO", "GOLF", "RUGBY",
        // Inglés - Nivel 1
        "HELLO", "WORLD", "COMPUTER", "PROGRAMMING", "LANGUAGE", "SCIENCE", "BOOK", "MUSIC", "TRAVEL", "FRIEND",
        // Países - Nivel 1
        "COLOMBIA", "MEXICO", "ESPAÑA", "BRASIL", "CANADA", "INDIA", "JAPON", "CHINA", "ITALIA", "FRANCIA",
        // Género Musical - Nivel 1
        "ROCK", "POP", "JAZZ", "BLUES", "CLASICA", "SALSA", "CUMBIA", "REGGAETON", "HIPHOP", "ELECTRONICA",
        // Frutas - Nivel 1
        "MANZANA", "PLATANO", "NARANJA", "UVA", "FRESA", "SANDIA", "MANGO", "PIÑA", "PERA", "CEREZA"
    ],
    2: [
        // Programación - Nivel 2
        "INTELIGENCIA", "CRIPTOGRAFIA", "NEURONAL", "BIGDATA", "CIBERSEGURIDAD", "REALIDAD", "VIRTUAL", "AUMENTADA", "ROBOTICA", "AUTOMATIZACION",
        // Animales - Nivel 2
        "ELEFANTE", "JIRAFA", "DELFIN", "BALLENA", "PINGUINO", "COCODRILO", "SERPIENTE", "AGUILA", "HALCON", "BUHO",
        // Escritores - Nivel 2
        "CERVANTES", "SHAKESPEARE", "AUSTEN", "DICKENS", "TOLSTOI", "DOSTOYEVSKI", "VIRGINIA", "WOOLF", "HEMINGWAY", "MARQUEZ",
        // Carreras - Nivel 2
        "INGENIERO", "ARQUITECTO", "CONTADOR", "PERIODISTA", "PROGRAMADOR", "DISEÑADOR", "PSICOLOGO", "VETERINARIO", "FOTOGRAFO", "MUSICO",
        // Deportes - Nivel 2
        "BADMINTON", "ESGRIMA", "GIMNASIA", "HOCKEY", "JUDO", "KARATE", "LUCHA", "REMO", "SURF", "TRIATLON",
        // Inglés - Nivel 2
        "KEYBOARD", "MONITOR", "ALGORITHM", "DATABASE", "INTERNET", "WEBSITE", "SOFTWARE", "HARDWARE", "NETWORK", "APPLICATION",
        // Países - Nivel 2
        "ARGENTINA", "CHILE", "PERU", "ECUADOR", "VENEZUELA", "ALEMANIA", "REINOUNIDO", "RUSIA", "AUSTRALIA", "EGIPTO",
        // Género Musical - Nivel 2
        "COUNTRY", "FOLK", "REGGAE", "SOUL", "FUNK", "DISCO", "PUNK", "METAL", "GOSPEL", "FLAMENCO",
        // Frutas - Nivel 2
        "KIWI", "MELON", "PAPAYA", "GUAYABA", "MARACUYA", "LICHIS", "GRANADA", "HIGO", "CIRUELA", "ALBARICOQUE"
    ],
    3: [
        // Programación - Nivel 3
        "QUANTUM", "BIOMETRIA", "NANOTECNOLOGIA", "HOLOGRAMA", "SISTEMAS", "COMPLEJOS", "INFRAESTRUCTURA", "MICROSERVICIO", "CONTENEDORES", "DESPLIEGUE", "INTEGRACION",
        // Animales - Nivel 3
        "RINOCERONTE", "HIPOPOTAMO", "ORNITORRINCO", "CAMELLO", "PANDA", "KOALA", "CANGURO", "LEMUR", "MURCIELAGO", "CHIMPANCE",
        // Escritores - Nivel 3
        "BORGES", "NERUDA", "CORTAZAR", "OCTAVIO", "PAZ", "ISABEL", "ALLENDE", "VARGAS", "LLOSA", "JUANA", "INES", "DE", "LA", "CRUZ",
        // Carreras - Nivel 3
        "ASTRONAUTA", "CIENTIFICO", "INVESTIGADOR", "DIPLOMATICO", "ARQUEOLOGO", "GEOLOGO", "METEOROLOGO", "OCEANOGRAFO", "CRIMINOLOGO", "FILOSOFO",
        // Deportes - Nivel 3
        "ESQUI", "SNOWBOARD", "PATINAJE", "ESCALADA", "PARACAIDISMO", "BUCEO", "VELA", "ESNORKEL", "BALONMANO", "WATERPOLO",
        // Inglés - Nivel 3
        "INTELLIGENCE", "CRYPTOGRAPHY", "NEURONAL", "BIGDATA", "CYBERSECURITY", "VIRTUAL", "AUGMENTED", "ROBOTICS", "AUTOMATION", "INNOVATION",
        // Países - Nivel 3
        "SUDAFRICA", "NUEVAZELANDA", "FILIPINAS", "INDONESIA", "VIETNAM", "SUECIA", "NORUEGA", "FINLANDIA", "GRECIA", "PORTUGAL",
        // Género Musical - Nivel 3
        "OPERA", "TANGO", "MERENGUE", "BACHATA", "SAMBA", "BOLERO", "RANCHERA", "VALLENATO", "CHAMAME", "FUSION",
        // Frutas - Nivel 3
        "RAMBUTAN", "PITAHAYA", "CARAMBOLA", "SALAK", "DURION", "KUMQUAT", "ACEROLA", "CHIRIMOYA", "NISPERO", "TAMARINDO"
    ]
};

const all_inclusive_game_hangmanParts = [
    'hangman-head', 'hangman-body', 'hangman-arm-left', 'hangman-arm-right', 'hangman-leg-left', 'hangman-leg-right'
];

// ====================================================================================
// CURRENT GAME STATE
// Variables that control player progress and the game session.
// ====================================================================================
let all_inclusive_game_currentLevel = 1;         // Current game level
let all_inclusive_game_selectedWord = "";        // Word selected to guess
let all_inclusive_game_guessedWord = [];         // Guessed letters of the word
let all_inclusive_game_wrongGuesses = 0;         // Number of incorrect attempts
let all_inclusive_game_lettersUsed = [];         // Letters already tried by the player
let all_inclusive_game_timerInterval;            // Reference to the timer interval
let all_inclusive_game_timeLeft = 120;           // Time remaining in seconds (2 minutes)
const all_inclusive_game_maxWrongGuesses = 6;    // Maximum allowed errors before Game Over

// Level requirements and rewards
const all_inclusive_game_levelRequirements = {
    1: { maxErrors: 5, reward: { gold: 5, diamonds: 0 } },
    2: { maxErrors: 3, reward: { gold: 10, diamonds: 0 } },
    3: { maxErrors: 2, reward: { gold: 20, diamonds: 30 } } // Final game reward
};

// ====================================================================================
// DOM ELEMENTS
// References to HTML elements for interacting with the interface.
// ====================================================================================
const all_inclusive_game_wordDisplay = document.getElementById('word-display');
const all_inclusive_game_guessInput = document.getElementById('guess-input');
const all_inclusive_game_submitButton = document.getElementById('submit-guess');
const all_inclusive_game_messageDisplay = document.getElementById('message');
const all_inclusive_game_levelDisplay = document.getElementById('level-display');
const all_inclusive_game_wrongGuessesDisplay = document.getElementById('wrong-guesses-display');
const all_inclusive_game_timerDisplay = document.getElementById('timer-display');
const all_inclusive_game_lettersUsedDisplay = document.getElementById('letters-used-display');
const all_inclusive_game_loaderWrapper = document.getElementById('loader-wrapper');

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
async function all_inclusive_game_initializeGame(level = 1) {
    all_inclusive_game_currentLevel = level;
    
    // Ensure the level exists in the all_inclusive wordLists
    if (!all_inclusive_game_wordLists[all_inclusive_game_currentLevel] || all_inclusive_game_wordLists[all_inclusive_game_currentLevel].length === 0) {
        console.error(`Error (All Inclusive Game): No words found for level ${all_inclusive_game_currentLevel}. Resetting to level 1.`);
        all_inclusive_game_currentLevel = 1; // Fallback to level 1 if current level has no words
        if (!all_inclusive_game_wordLists[all_inclusive_game_currentLevel] || all_inclusive_game_wordLists[all_inclusive_game_currentLevel].length === 0) {
            Swal.fire({ icon: 'error', title: 'Error de Palabras', text: 'No se encontraron palabras para iniciar el juego. Por favor, contacta soporte.', customClass: { popup: 'swal2-custom-game-over' } });
            return; // Stop initialization if no fallback words are found
        }
    }

    // Shuffle the words for the current level to ensure randomness
    const shuffledWords = [...all_inclusive_game_wordLists[all_inclusive_game_currentLevel]];
    for (let i = shuffledWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledWords[i], shuffledWords[j]] = [shuffledWords[j], shuffledWords[i]];
    }

    all_inclusive_game_selectedWord = shuffledWords[0].toUpperCase(); // Select the first word after shuffling
    all_inclusive_game_guessedWord = Array(all_inclusive_game_selectedWord.length).fill('_');
    all_inclusive_game_wrongGuesses = 0;
    all_inclusive_game_lettersUsed = [];
    all_inclusive_game_timeLeft = 120;
    all_inclusive_game_messageDisplay.textContent = "";
    all_inclusive_game_guessInput.value = "";
    
    all_inclusive_game_updateDisplay();
    all_inclusive_game_updateHangmanDrawing();
    all_inclusive_game_startTimer();
    all_inclusive_game_guessInput.focus();
    
    all_inclusive_game_levelDisplay.textContent = all_inclusive_game_currentLevel;
    all_inclusive_game_wrongGuessesDisplay.textContent = all_inclusive_game_wrongGuesses;
    all_inclusive_game_lettersUsedDisplay.textContent = '';
}

/**
 * Updates the display of the word, errors, and used letters in the interface.
 */
function all_inclusive_game_updateDisplay() {
    all_inclusive_game_wordDisplay.textContent = all_inclusive_game_guessedWord.join(' ');
    all_inclusive_game_wrongGuessesDisplay.textContent = all_inclusive_game_wrongGuesses;
    // Show used letters, highlighting incorrect ones.
    all_inclusive_game_lettersUsedDisplay.innerHTML = all_inclusive_game_lettersUsed.map(letter => {
        return all_inclusive_game_selectedWord.includes(letter) ? `<span>${letter}</span>` : `<strong style="color:#B22222;">${letter}</strong>`; // Soft red for errors
    }).join(', ');
}

/**
 * Shows or hides parts of the hangman drawing based on the number of errors.
 */
function all_inclusive_game_updateHangmanDrawing() {
    console.log(`DEBUG (All Inclusive Game): updateHangmanDrawing called. wrongGuesses: ${all_inclusive_game_wrongGuesses}`);
    all_inclusive_game_hangmanParts.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        if (partElement) {
            if (index < all_inclusive_game_wrongGuesses) {
                partElement.classList.add('show-part'); // Show the part if enough errors
                console.log(`DEBUG (All Inclusive Game): Adding 'show-part' to ${partId}`);
            } else {
                partElement.classList.remove('show-part'); // Hide the part
                console.log(`DEBUG (All Inclusive Game): Removing 'show-part' from ${partId}`);
            }
        } else {
            console.warn(`DEBUG (All Inclusive Game): Element with ID '${partId}' not found in HTML. Check your HTML structure.`);
        }
    });
}

/**
 * Starts or restarts the game timer.
 */
function all_inclusive_game_startTimer() {
    clearInterval(all_inclusive_game_timerInterval); // Clear any existing timer
    all_inclusive_game_timerInterval = setInterval(() => {
        all_inclusive_game_timeLeft--;
        all_inclusive_game_timerDisplay.textContent = all_inclusive_game_timeLeft;
        if (all_inclusive_game_timeLeft <= 0) {
            clearInterval(all_inclusive_game_timerInterval);
            all_inclusive_game_handleGameOver(false, "¡Se acabó el tiempo! La palabra era: " + all_inclusive_game_selectedWord);
        }
    }, 1000); // Update every second
}

/**
 * Updates the player's gold and diamond balance in the database (Supabase).
 * @param {number} gold - Amount of gold to add.
 * @param {number} diamonds - Amount of diamonds to add.
 */
async function all_inclusive_game_updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (All Inclusive Game):", sessionError);
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
        console.warn("No user logged in (All Inclusive Game). Cannot update balance.");
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
        console.error("Error fetching current profile (All Inclusive Game):", fetchError);
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
        console.error("Error updating player balance (All Inclusive Game):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (All Inclusive Game): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}

/**
 * Processes the letter entered by the player.
 */
async function all_inclusive_game_checkGuess() {
    const guess = all_inclusive_game_guessInput.value.toUpperCase();
    all_inclusive_game_guessInput.value = ""; // Clear the input

    // Input validations
    if (guess.length !== 1 || !/[A-Z]/.test(guess)) {
        all_inclusive_game_messageDisplay.textContent = "Por favor, ingresa una sola letra válida.";
        return;
    }

    if (all_inclusive_game_lettersUsed.includes(guess)) {
        all_inclusive_game_messageDisplay.textContent = `Ya adivinaste la letra '${guess}'. Intenta con otra.`;
        return;
    }

    all_inclusive_game_lettersUsed.push(guess); // Add the letter to used ones

    if (all_inclusive_game_selectedWord.includes(guess)) {
        // Correct letter, update the guessed word
        for (let i = 0; i < all_inclusive_game_selectedWord.length; i++) {
            if (all_inclusive_game_selectedWord[i] === guess) {
                all_inclusive_game_guessedWord[i] = guess;
            }
        }
        all_inclusive_game_messageDisplay.textContent = `¡Bien! La letra '${guess}' es correcta.`;
    } else {
        // Incorrect letter
        all_inclusive_game_wrongGuesses++;
        all_inclusive_game_messageDisplay.textContent = `Incorrecto. Te quedan ${all_inclusive_game_maxWrongGuesses - all_inclusive_game_wrongGuesses} intentos.`;
        all_inclusive_game_updateHangmanDrawing(); // Draw one more hangman part
    }

    all_inclusive_game_updateDisplay(); // Update the interface
    await all_inclusive_game_checkGameStatus(); // Check game status (win/loss)
}

/**
 * Checks if the game has ended (win or loss) and handles rewards/transitions.
 */
async function all_inclusive_game_checkGameStatus() {
    // If the word has been completely guessed
    if (all_inclusive_game_guessedWord.join('') === all_inclusive_game_selectedWord) {
        clearInterval(all_inclusive_game_timerInterval); // Stop the timer

        const goldPerWord = 10;
        await all_inclusive_game_updatePlayerBalance(goldPerWord, 0); // Grant gold for guessing the word

        const errorsAllowed = all_inclusive_game_levelRequirements[all_inclusive_game_currentLevel].maxErrors;

        // If the player meets the error requirement to advance/win
        if (all_inclusive_game_wrongGuesses <= errorsAllowed) {
            // If there are more levels
            if (all_inclusive_game_currentLevel < Object.keys(all_inclusive_game_wordLists).length) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Nivel Completado!',
                    html: `¡Perfecto! Has adivinado la palabra **"${all_inclusive_game_selectedWord}"** con ${all_inclusive_game_wrongGuesses} errores.<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por esta palabra!<br>¡Pasas al Nivel ${all_inclusive_game_currentLevel + 1}!`,
                    confirmButtonText: 'Siguiente Nivel',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-level-up' // Custom class for level completed popup
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        all_inclusive_game_initializeGame(all_inclusive_game_currentLevel + 1); // Load the next level
                    }
                });
            } else {
                // The player has completed all levels (All Inclusive Hangman Master)
                const finalReward = all_inclusive_game_levelRequirements[all_inclusive_game_currentLevel].reward;
                await all_inclusive_game_updatePlayerBalance(finalReward.gold, finalReward.diamonds); // Grant final reward

                Swal.fire({
                    icon: 'success',
                    title: '¡FELICITACIONES, ERES EL MAESTRO DE AHORCADO DE EL TODO!',
                    html: `¡Lo lograste! Has superado todos los niveles de "El Todo".<br>¡Ganaste **${goldPerWord} Oro <i class="fas fa-coins"></i>** por la última palabra!<br>¡Como recompensa final, has ganado <strong>${finalReward.diamonds} Diamantes <i class="fas fa-gem"></i></strong> y <strong>${finalReward.gold} Oro <i class="fas fa-coins"></i></strong> adicionales!`,
                    confirmButtonText: '¡A Jugar de Nuevo!',
                    customClass: {
                        confirmButton: 'swal2-confirm-button',
                        popup: 'swal2-custom-final-success' // Custom class for final success popup
                    },
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        all_inclusive_game_initializeGame(); // Restart the game at level 1 of All Inclusive
                    }
                });
            }
        } else {
            // The word was guessed, but with too many errors to advance level
            Swal.fire({
                icon: 'warning',
                title: 'Palabra Adivinada, ¡pero cuidado!',
                html: `Adivinaste la palabra **"${all_inclusive_game_selectedWord}"**, pero tuviste ${all_inclusive_game_wrongGuesses} errores. Necesitabas ${errorsAllowed} para avanzar al siguiente nivel. <br>Por tu esfuerzo, ganas <strong>${goldPerWord} Oro <i class="fas fa-coins"></i></strong>.`,
                confirmButtonText: 'Volver a Intentar',
                customClass: {
                    confirmButton: 'swal2-confirm-button',
                    popup: 'swal2-custom-warning' // Custom class for warning popup
                },
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    all_inclusive_game_initializeGame(); // Restart the game at level 1 of All Inclusive
                }
            });
        }
    } else if (all_inclusive_game_wrongGuesses >= all_inclusive_game_maxWrongGuesses) {
        // Player has exhausted all attempts
        all_inclusive_game_handleGameOver(false, `¡Has superado los ${all_inclusive_game_maxWrongGuesses} errores! La palabra era: **${all_inclusive_game_selectedWord}**`);
    }
}

/**
 * Handles game over, displaying a win or loss message.
 * @param {boolean} isWin - True if the player won, false if lost.
 * @param {string} message - Message to display to the player.
 */
async function all_inclusive_game_handleGameOver(isWin, message) {
    clearInterval(all_inclusive_game_timerInterval); // Stop the timer
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
            all_inclusive_game_initializeGame(); // Restart the game
        }
    });
}

// ====================================================================================
// EVENT HANDLERS
// Connects user actions with game logic.
// ====================================================================================

all_inclusive_game_submitButton.addEventListener('click', all_inclusive_game_checkGuess);

all_inclusive_game_guessInput.addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        await all_inclusive_game_checkGuess();
    }
});

// LOADER LOGIC AND GAME INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide the loader after a fixed time (e.g., 2 seconds)
    setTimeout(() => {
        if (all_inclusive_game_loaderWrapper) {
            all_inclusive_game_loaderWrapper.classList.add('hidden');
        }
    }, 2000); // 2000 milliseconds = 2 seconds

    // 2. Initialize the game immediately when the DOM is loaded.
    //    This happens in parallel with the loader timer.
    all_inclusive_game_initializeGame();
});