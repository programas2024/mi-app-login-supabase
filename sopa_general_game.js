// sopa_general_game.js - Game logic for the General Word Search game

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// GAME CONFIGURATION AND STATE
// ====================================================================================

const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
// IMPORTANT: Ensure this key EXACTLY matches your Supabase anon (public) key.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBojyWvYCrR5nLo'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GRID_SIZE = 12; // 12x12 grid
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Main words to find (combined from all categories)
const MAIN_WORDS = [
    "LEON", "ELEFANTE", "SERPIENTE", "JIRAFA", "TIGRE", // Animals
    "ARBOL", "FLOR", "HOJA", "SEMILLA", "CACTUS",      // Plants
    "SALUD", "DOCTOR", "HOSPITAL", "VACUNA", "SINTOMA", // Medicine
    "FUTBOL", "TENIS", "NATACION", "GIMNASIA", "BOXEO"  // Sports
];

// Surprise words (not visible in the list, but give extra points)
const SURPRISE_WORDS = [
    "PANDA", "KOALA", "ROSA", "ORQUIDEA", "ANATOMIA", 
    "BACTERIA", "SURF", "YOGA", "ESPACIO", "ESTRELLA"
];

const ALL_WORDS = [...MAIN_WORDS, ...SURPRISE_WORDS];

let gameGrid = [];
let placedWords = []; // { word: "WORD", cells: [{row:0, col:0}, ...], isFound: false, isBonus: false }
let foundWordsCount = 0; // Counter for main words found
let totalMainWords = MAIN_WORDS.length;

let timerInterval;
let timeLeft = 180; // 3 minutes for General category
let gameStartedTime = 0;

let currentGold = 0; // Gold accumulated from found words (base)
let currentDiamonds = 0; // Diamonds accumulated from surprise words

let isSelecting = false;
let startCell = null;
let endCell = null;
let selectedCells = [];

// ====================================================================================
// DOM ELEMENT REFERENCES
// ====================================================================================
let loaderWrapper;
let wordGridElement;
let wordListElement;
let timerDisplay;
let goldScoreDisplay;
let diamondsScoreDisplay;
let rankingButton;

// ====================================================================================
// UTILITY FUNCTIONS
// ====================================================================================

/**
 * Displays the game page loader.
 * @param {string} message - Message to display in the loader.
 */
function showLoader(message = 'Cargando...') {
    if (loaderWrapper) {
        const loaderText = loaderWrapper.querySelector('h1'); // Assuming text is in an h1
        if (loaderText) {
            loaderText.textContent = message;
        }
        loaderWrapper.classList.remove('hidden');
    }
}

/**
 * Hides the game page loader.
 */
function hideLoader() {
    if (loaderWrapper) {
        loaderWrapper.classList.add('hidden');
    }
}

/**
 * Gets a random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gets a random letter from the alphabet.
 * @returns {string}
 */
function getRandomLetter() {
    return ALPHABET[getRandomInt(0, ALPHABET.length - 1)];
}

/**
 * Applies a temporary animation to a score element.
 * @param {HTMLElement} element - The score DOM element to animate.
 */
function animateScore(element) {
    element.classList.remove('score-highlight'); // Ensures animation restarts
    void element.offsetWidth; // Trick to force a reflow and restart animation
    element.classList.add('score-highlight');
}

/**
 * Formats seconds to MM:SS format.
 * @param {number} totalSeconds - Total seconds.
 * @returns {string} Formatted time.
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// ====================================================================================
// GRID GENERATION LOGIC
// ====================================================================================

/**
 * Initializes an empty grid with the specified size.
 * @param {number} size - Grid size (e.g., 10 for 10x10).
 * @returns {Array<Array<string>>} The empty grid.
 */
function createEmptyGrid(size) {
    return Array(size).fill(null).map(() => Array(size).fill(''));
}

/**
 * Attempts to place a word on the grid.
 * @param {Array<Array<string>>} grid - The current grid.
 * @param {string} word - The word to place.
 * @returns {Array<{row: number, col: number}> | null} The cells occupied by the word if placed, or null.
 */
function placeWord(grid, word) {
    const directions = [
        { dr: 0, dc: 1 },  // Horizontal
        { dr: 1, dc: 0 },  // Vertical
        { dr: 1, dc: 1 },  // Diagonal (down-right)
        { dr: 1, dc: -1 }, // Diagonal (down-left)
        { dr: 0, dc: -1 }, // Horizontal (reverse)
        { dr: -1, dc: 0 }, // Vertical (reverse)
        { dr: -1, dc: -1 },// Diagonal (up-left)
        { dr: -1, dc: 1 }  // Diagonal (up-right)
    ];

    const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);

    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            for (const dir of shuffledDirections) {
                const cells = [];
                let possible = true;
                for (let k = 0; k < word.length; k++) {
                    const r = i + k * dir.dr;
                    const c = j + k * dir.dc;

                    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
                        possible = false;
                        break;
                    }
                    if (grid[r][c] !== '' && grid[r][c] !== word[k]) {
                        possible = false;
                        break;
                    }
                    cells.push({ row: r, col: c });
                }

                if (possible) {
                    for (let k = 0; k < word.length; k++) {
                        grid[cells[k].row][cells[k].col] = word[k];
                    }
                    return cells; // Word placed successfully
                }
            }
        }
    }
    return null; // Could not place the word
}

/**
 * Fills empty grid cells with random letters.
 * @param {Array<Array<string>>} grid - The grid.
 */
function fillEmptyCells(grid) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === '') {
                grid[r][c] = getRandomLetter();
            }
        }
    }
}

/**
 * Generates the word search grid with words and random letters.
 */
function generateWordSearchGrid() {
    gameGrid = createEmptyGrid(GRID_SIZE);
    placedWords = [];

    // Place main words
    const shuffledMainWords = [...MAIN_WORDS].sort(() => Math.random() - 0.5);
    shuffledMainWords.forEach(word => {
        const cells = placeWord(gameGrid, word);
        if (cells) {
            placedWords.push({ word: word, cells: cells, isFound: false, isBonus: false, element: null });
        } else {
            console.warn(`Could not place main word: ${word}`);
        }
    });

    // Place surprise words
    const shuffledSurpriseWords = [...SURPRISE_WORDS].sort(() => Math.random() - 0.5);
    shuffledSurpriseWords.forEach(word => {
        const cells = placeWord(gameGrid, word);
        if (cells) {
            placedWords.push({ word: word, cells: cells, isFound: false, isBonus: true, element: null });
        } else {
            console.warn(`Could not place surprise word: ${word}`);
        }
    });

    fillEmptyCells(gameGrid);
}

/**
 * Renders the grid in the DOM.
 */
function renderGrid() {
    wordGridElement.innerHTML = '';
    wordGridElement.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.textContent = gameGrid[r][c];
            wordGridElement.appendChild(cell);
        }
    }
}

/**
 * Renders the list of words to find.
 */
function renderWordList() {
    wordListElement.innerHTML = '';
    MAIN_WORDS.forEach(word => {
        const listItem = document.createElement('li');
        listItem.textContent = word;
        listItem.dataset.word = word; // Store the word in a data attribute
        wordListElement.appendChild(listItem);

        // Store the reference to the LI element in the placed word object
        const placedWordObj = placedWords.find(pw => pw.word === word && !pw.isBonus);
        if (placedWordObj) {
            placedWordObj.element = listItem;
        }
    });
}

// ====================================================================================
// USER INTERACTION LOGIC (WORD SELECTION)
// ====================================================================================

/**
 * Handles the start of cell selection.
 * @param {Event} event
 */
function handleMouseDown(event) {
    if (event.target.classList.contains('grid-cell')) {
        isSelecting = true;
        startCell = {
            row: parseInt(event.target.dataset.row),
            col: parseInt(event.target.dataset.col)
        };
        endCell = null;
        clearSelection();
        highlightCell(event.target);
    }
}

/**
 * Handles mouse/finger movement during selection.
 * @param {Event} event
 */
function handleMouseMove(event) {
    if (!isSelecting || !startCell) return;
    if (event.target.classList.contains('grid-cell')) {
        const currentCell = {
            row: parseInt(event.target.dataset.row),
            col: parseInt(event.target.dataset.col)
        };
        if (endCell && endCell.row === currentCell.row && endCell.col === currentCell.col) {
            return; // Avoid recalculating if the end cell hasn't changed
        }
        endCell = currentCell;
        updateSelectionHighlight();
    }
}

/**
 * Handles the end of cell selection.
 * @param {Event} event
 */
async function handleMouseUp() {
    if (isSelecting && startCell && endCell) {
        const wordText = getWordFromSelection(selectedCells);
        if (wordText) {
            await checkSelectedWord(wordText, selectedCells);
        }
    }
    isSelecting = false;
    startCell = null;
    endCell = null;
    clearSelection(); // Clear selection after checking
}

/**
 * Highlights cells between startCell and endCell.
 */
function updateSelectionHighlight() {
    clearSelection();
    if (!startCell || !endCell) return;

    const cellsToHighlight = getCellsInSelection(startCell, endCell);
    selectedCells = []; // Reset the list of selected cells
    cellsToHighlight.forEach(cellPos => {
        const cellElement = wordGridElement.querySelector(`[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`);
        if (cellElement) { 
            highlightCell(cellElement);
            selectedCells.push(cellPos); // Store the cells that were actually highlighted
        }
    });
}

/**
 * Adds the 'selected' class to a cell.
 * @param {HTMLElement} cellElement
 */
function highlightCell(cellElement) {
    cellElement.classList.add('selected');
}

/**
 * Removes the 'selected' class from all cells.
 */
function clearSelection() {
    document.querySelectorAll('.grid-cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    selectedCells = [];
}

/**
 * Gets all cells in a straight line between two points.
 * @param {{row: number, col: number}} start
 * @param {{row: number, col: number}} end
 * @returns {Array<{row: number, col: number}>}
 */
function getCellsInSelection(start, end) {
    const cells = [];
    const dr = end.row - start.row;
    const dc = end.col - start.col;

    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    // Only allow perfect horizontal, vertical, or diagonal selections
    if (dr !== 0 && dc !== 0 && absDr !== absDc) {
        return []; // Not a valid straight line
    }

    const steps = Math.max(absDr, absDc);
    if (steps === 0) { // Single cell selection
        cells.push(start);
        return cells;
    }

    const stepDr = dr / steps;
    const stepDc = dc / steps;

    for (let i = 0; i <= steps; i++) {
        cells.push({
            row: start.row + i * stepDr,
            col: start.col + i * stepDc
        });
    }
    return cells;
}

/**
 * Extracts the word from a list of selected cells.
 * @param {Array<{row: number, col: number}>} cells - The selected cells.
 * @returns {string} The formed word.
 */
function getWordFromSelection(cells) {
    if (cells.length === 0) return '';
    let word = '';
    cells.forEach(cellPos => {
        word += gameGrid[cellPos.row][cellPos.col];
    });
    return word;
}

/**
 * Checks if the selected word is correct and updates the game.
 * @param {string} selectedWordText - The word the user selected.
 * @param {Array<{row: number, col: number}>} cells - The cells of the selected word.
 */
async function checkSelectedWord(selectedWordText, cells) {
    // Search for the word in the placed words (main or surprise)
    const foundPlacedWord = placedWords.find(pw => 
        !pw.isFound && 
        (pw.word === selectedWordText || pw.word === selectedWordText.split('').reverse().join('')) && // Also check reversed word
        pw.cells.every(pc => cells.some(sc => sc.row === pc.row && sc.col === pc.col)) && // All cells of the placed word are in the selection
        cells.length === pw.word.length // The selection has the exact length of the word
    );

    if (foundPlacedWord) {
        foundPlacedWord.isFound = true;
        
        // Mark cells as found on the grid
        cells.forEach(cellPos => {
            const cellElement = wordGridElement.querySelector(`[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`);
            if (cellElement) {
                cellElement.classList.add('found');
                cellElement.classList.remove('selected');
            }
        });

        if (foundPlacedWord.isBonus) {
            // Surprise word found
            currentDiamonds += 5; // Diamond reward for surprise word
            diamondsScoreDisplay.textContent = currentDiamonds;
            animateScore(diamondsScoreDisplay);
            Swal.fire({
                icon: 'info',
                title: '¡Palabra Sorpresa!',
                text: `¡Encontraste "${foundPlacedWord.word}"! Ganaste 5 Diamantes.`,
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: { popup: 'swal2-custom-level-up' } // Use success/info style
            });
        } else {
            // Main word found
            foundWordsCount++;
            currentGold += 10; // Gold reward for main word
            goldScoreDisplay.textContent = currentGold;
            animateScore(goldScoreDisplay);
            
            // Mark word in the list
            const listItem = wordListElement.querySelector(`li[data-word="${foundPlacedWord.word}"]`);
            if (listItem) {
                listItem.classList.add('found-word');
            }
            Swal.fire({
                icon: 'success',
                title: '¡Palabra Encontrada!',
                text: `¡Felicidades! Encontraste "${foundPlacedWord.word}". Ganaste 10 Oro.`,
                timer: 1500,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: { popup: 'swal2-custom-final-success' } // Use success style
            });
        }
        
        await checkGameEnd();
    } else {
        // Incorrect or already found word
        // Do nothing visually, selection will clear automatically.
    }
}

// ====================================================================================
// GAME LOGIC (INITIALIZATION, TIMER, GAME OVER)
// ====================================================================================

/**
 * Calculates final rewards based on words found and time left.
 * @param {number} wordsFound - Number of main words found.
 * @param {number} timeLeftAtEnd - Time left in seconds.
 * @param {number} baseGold - Base gold accumulated per word.
 * @param {number} baseDiamonds - Base diamonds accumulated per surprise word.
 * @returns {{gold: number, diamonds: number}} Total rewards.
 */
function calculateFinalRewards(wordsFound, timeLeftAtEnd, baseGold, baseDiamonds) {
    let totalGold = baseGold;
    let totalDiamonds = baseDiamonds;

    // Bonus for remaining time
    totalGold += Math.floor(timeLeftAtEnd / 5); // 1 gold for every 5 seconds remaining
    totalDiamonds += Math.floor(timeLeftAtEnd / 10); // 1 diamond for every 10 seconds remaining

    // Tiered bonuses for number of main words found
    // MAIN_WORDS.length is the total number of main words
    if (wordsFound === totalMainWords) {
        totalGold += 200;
        totalDiamonds += 190;
    } else if (wordsFound >= 9) { // More than 8 words
        totalGold += 90;
        totalDiamonds += 50;
    } else if (wordsFound >= 7) { // More than 6 words
        totalGold += 60;
        totalDiamonds += 20;
    }

    return { gold: totalGold, diamonds: totalDiamonds };
}


/**
 * Initializes the Word Search game.
 */
async function initializeGame() {
    showLoader('Generando Sopa de Letras...'); // Show loader at start of initialization
    
    currentGold = 0;
    currentDiamonds = 0;
    foundWordsCount = 0;
    timeLeft = 180; // Reset time to 3 minutes
    gameStartedTime = Date.now();

    goldScoreDisplay.textContent = currentGold;
    diamondsScoreDisplay.textContent = currentDiamonds;
    updateTimerDisplay();

    generateWordSearchGrid();
    renderGrid();
    renderWordList();
    startTimer();

    // Hide ranking button at game start
    rankingButton.style.display = 'none';

    // Add event listeners for grid interaction
    wordGridElement.addEventListener('mousedown', handleMouseDown);
    wordGridElement.addEventListener('mousemove', handleMouseMove);
    wordGridElement.addEventListener('mouseup', handleMouseUp);
    // For touch devices
    wordGridElement.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scroll
        const touch = e.touches[0];
        // Use elementFromPoint to get the element at the touch position
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElement && targetElement.classList.contains('grid-cell')) {
            handleMouseDown({ target: targetElement });
        }
    }, { passive: false });
    wordGridElement.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scroll
        const touch = e.touches[0];
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElement && targetElement.classList.contains('grid-cell')) {
            handleMouseMove({ target: targetElement });
        }
    }, { passive: false });
    wordGridElement.addEventListener('touchend', handleMouseUp);

    hideLoader(); // Hide loader after initialization
}

/**
 * Starts the game timer.
 */
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleGameOver("¡Se acabó el tiempo!"); 
        }
    }, 1000);
}

/**
 * Updates the timer display.
 */
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Checks if the game has ended (all main words found).
 */
async function checkGameEnd() {
    if (foundWordsCount === totalMainWords) {
        clearInterval(timerInterval);
        const timeRemaining = Math.max(0, timeLeft); // Ensure it's not negative
        const timeTaken = (Date.now() - gameStartedTime) / 1000; // Time in seconds

        const finalRewards = calculateFinalRewards(foundWordsCount, timeRemaining, currentGold, currentDiamonds);

        await updatePlayerBalance(finalRewards.gold, finalRewards.diamonds);
        await saveGameResultToRanking(timeTaken, foundWordsCount, finalRewards.gold, finalRewards.diamonds);

        Swal.fire({
            icon: 'success',
            title: '¡Sopa de Letras Completada!',
            html: `¡Felicidades! Encontraste todas las palabras.<br>
                   Tiempo total: <strong>${formatTime(timeTaken)}</strong><br>
                   Ganaste <strong>${finalRewards.gold} Oro <i class="fas fa-coins"></i></strong> y <strong>${finalRewards.diamonds} Diamantes <i class="fas fa-gem"></i></strong>.`,
            confirmButtonText: 'Jugar de Nuevo',
            showCancelButton: true,
            cancelButtonText: 'Ver Ranking',
            customClass: {
                confirmButton: 'swal2-confirm-button',
                cancelButton: 'swal2-cancel-button',
                popup: 'swal2-custom-final-success'
            },
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                initializeGame(); // Restart game
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                showRanking(); // Show ranking
            }
        });
    }
}

/**
 * Handles game over, specifically when time runs out.
 * @param {string} message - Message to display (e.g., "Time's up!").
 */
async function handleGameOver(message) { 
    clearInterval(timerInterval);
    const timeTaken = (Date.now() - gameStartedTime) / 1000; // Time in seconds

    // Calculate final rewards including bonuses for word count
    const finalRewards = calculateFinalRewards(foundWordsCount, 0, currentGold, currentDiamonds); // Time left is 0 if it runs out

    await updatePlayerBalance(finalRewards.gold, finalRewards.diamonds); // Update player balance
    await saveGameResultToRanking(timeTaken, foundWordsCount, finalRewards.gold, finalRewards.diamonds); // Save result to ranking

    Swal.fire({
        icon: 'error', // Icon for time out/defeat
        title: '¡Tiempo Agotado!',
        html: `${message}<br>Has ganado <strong>${finalRewards.gold} Oro <i class="fas fa-coins"></i></strong> y <strong>${finalRewards.diamonds} Diamantes <i class="fas fa-gem"></i></strong> por las palabras que encontraste.<br>¡Inténtalo de nuevo para mejorar tu puntaje!`,
        confirmButtonText: 'Jugar de Nuevo',
        showCancelButton: true,
        cancelButtonText: 'Ver Ranking',
        customClass: {
            confirmButton: 'swal2-confirm-button',
            cancelButton: 'swal2-cancel-button',
            popup: 'swal2-custom-game-over' // Game over style
        },
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            initializeGame(); // Restart game
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            showRanking(); // Show ranking
        }
    });
}

// ====================================================================================
// SUPABASE INTEGRATION
// ====================================================================================

/**
 * Updates the player's gold and diamond balance in the database (Supabase).
 * @param {number} gold - Amount of gold to add.
 * @param {number} diamonds - Amount of diamonds to add.
 */
async function updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (Word Search):", sessionError);
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
        console.warn("No user logged in (Word Search). Cannot update balance.");
        Swal.fire({
            icon: 'info',
            title: 'Inicia Sesión para Guardar',
            text: 'Inicia sesión para que tus recompensas se guarden.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-warning' }
        });
        return;
    }

    const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('gold, diamonds')
        .eq('id', user.id)
        .single();

    if (fetchError) {
        console.error("Error fetching current profile (Word Search):", fetchError);
        Swal.fire({
            icon: 'error',
            title: 'Error al Obtener Perfil',
            text: 'Hubo un problema al cargar tu perfil de jugador. Por favor, contacta soporte.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
        return;
    }

    const newGold = (currentProfile.gold || 0) + gold;
    const newDiamonds = (currentProfile.diamonds || 0) + diamonds;

    const { data, error } = await supabase
        .from('profiles')
        .update({ gold: newGold, diamonds: newDiamonds })
        .eq('id', user.id);

    if (error) {
        console.error("Error updating player balance (Word Search):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance updated (Word Search): +${gold} Gold, +${diamonds} Diamonds. New total: ${newGold} Gold, ${newDiamonds} Diamonds.`);
    }
}

/**
 * Saves or updates the game result in the rankings table.
 * Prioritizes updating if the combined score is better, or time is better in case of a tie.
 * @param {number} timeTaken - Time in seconds to complete the game.
 * @param {number} wordsFound - Number of words found.
 * @param {number} goldEarned - Gold earned in this game.
 * @param {number} diamondsEarned - Diamonds earned in this game.
 */
async function saveGameResultToRanking(timeTaken, wordsFound, goldEarned, diamondsEarned) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;
    
    let userId = user?.id || null;
    let username = "Anónimo";

    if (user) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("Error fetching profile for ranking:", profileError);
        } else if (profile && profile.username) {
            username = profile.username;
        }

        // --- Logic for logged-in users: Update if better score/time ---
        // Get the best existing record for this user
        const { data: existingRankings, error: fetchRankingError } = await supabase
            .from('sopa_rankings_general')
            .select('*')
            .eq('user_id', userId)
            // ORDERING TO GET THE USER'S BEST RECORD:
            // First by gold (desc), then by diamonds (desc), then by time (asc)
            .order('gold_earned', { ascending: false })      
            .order('diamonds_earned', { ascending: false }) 
            .order('time_taken_seconds', { ascending: true }) 
            .limit(1); 

        let existingRanking = null;
        if (existingRankings && existingRankings.length > 0) {
            existingRanking = existingRankings[0];
        }

        // Handle Supabase errors that are not "no rows found"
        if (fetchRankingError && fetchRankingError.code !== 'PGRST116' && !fetchRankingError.message.includes('rows returned for query')) {
            console.error("Error fetching existing ranking for user:", fetchRankingError);
            // If there's a fetch error (other than "no rows found"), try to insert as if new to avoid losing the result
            const { error: insertError } = await supabase
                .from('sopa_rankings_general')
                .insert([
                    {
                        user_id: userId,
                        username: username,
                        time_taken_seconds: Math.floor(timeTaken),
                        words_found_count: wordsFound,
                        gold_earned: goldEarned,
                        diamonds_earned: diamondsEarned
                    }
                ]);
            if (insertError) {
                console.error("Error inserting new ranking after fetch error:", insertError);
            } else {
                console.log("New ranking inserted after fetch error.");
            }
            return;
        }

        const newCombinedScore = goldEarned + diamondsEarned;
        const existingCombinedScore = existingRanking ? (existingRanking.gold_earned + existingRanking.diamonds_earned) : -1; // -1 if no record exists

        let shouldUpdate = false;
        if (!existingRanking) {
            shouldUpdate = true; // If no record, always insert
        } else if (newCombinedScore > existingCombinedScore) {
            shouldUpdate = true; // If new combined score is better
        } else if (newCombinedScore === existingCombinedScore && Math.floor(timeTaken) < existingRanking.time_taken_seconds) {
            shouldUpdate = true; // If score is equal but time is better
        }

        if (shouldUpdate) {
            if (existingRanking) {
                // Update the existing record
                const { error: updateError } = await supabase
                    .from('sopa_rankings_general')
                    .update({
                        time_taken_seconds: Math.floor(timeTaken),
                        words_found_count: wordsFound,
                        gold_earned: goldEarned,
                        diamonds_earned: diamondsEarned,
                        created_at: new Date().toISOString() // Update the date of the last improvement
                    })
                    .eq('id', existingRanking.id); // Use the existing record's ID for update

                if (updateError) {
                    console.error("Error updating game result in ranking:", updateError);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al Actualizar Ranking',
                        text: 'Hubo un problema al actualizar tu mejor resultado en el ranking. Intenta de nuevo.',
                        confirmButtonText: 'Entendido',
                        customClass: { popup: 'swal2-custom-game-over' }
                    });
                } else {
                    console.log("Game result updated in ranking (better score/time).");
                }
            } else {
                // Insert a new record (first time for this user)
                const { error: insertError } = await supabase
                    .from('sopa_rankings_general')
                    .insert([
                        {
                            user_id: userId,
                            username: username,
                            time_taken_seconds: Math.floor(timeTaken),
                            words_found_count: wordsFound,
                            gold_earned: goldEarned,
                            diamonds_earned: diamondsEarned
                        }
                    ]);

                if (insertError) {
                    console.error("Error inserting new game result to ranking:", insertError);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al Guardar Ranking',
                        text: 'Hubo un problema al guardar tu resultado en el ranking. Intenta de nuevo.',
                        confirmButtonText: 'Entendido',
                        customClass: { popup: 'swal2-custom-game-over' }
                    });
                } else {
                    console.log("New game result inserted into ranking.");
                }
            }
        } else {
            console.log("New game score/time is not better than existing best. Ranking not updated.");
        }
    } else {
        // --- Logic for anonymous users: Always insert new ---
        // For anonymous users, we always insert a new record.
        // This prevents one "Anonymous" from overwriting another "Anonymous" ranking
        // since there is no persistent identity for them.
        console.warn("No user session found. Inserting new ranking as Anónimo.");
        const { error: insertAnonError } = await supabase
            .from('sopa_rankings_general')
            .insert([
                {
                    user_id: null, // user_id is null for anonymous users
                    username: username, // Will be "Anónimo"
                    time_taken_seconds: Math.floor(timeTaken),
                    words_found_count: wordsFound,
                    gold_earned: goldEarned,
                    diamonds_earned: diamondsEarned
                }
            ]);

        if (insertAnonError) {
            console.error("Error inserting anonymous game result to ranking:", insertAnonError);
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar Ranking',
                text: 'Hubo un problema al guardar tu resultado anónimo en el ranking. Intenta de nuevo.',
                confirmButtonText: 'Entendido',
                customClass: { popup: 'swal2-custom-game-over' }
            });
        } else {
            console.log("Anonymous game result inserted into ranking.");
        }
    }
}

/**
 * Displays the General Word Search ranking in a modal.
 */
async function showRanking() {
    showLoader('Cargando Ranking...');
    
    // Get current user ID
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || null;

    const { data, error } = await supabase
        .from('sopa_rankings_general')
        .select('*')
        // ORDERING: First by gold (desc), then by diamonds (desc), then by time (asc)
        .order('gold_earned', { ascending: false })      // Higher gold first
        .order('diamonds_earned', { ascending: false }) // Then higher diamonds
        .order('time_taken_seconds', { ascending: true }) // Finally lower time (for tie-breaking)
        .limit(10); // Show top 10

    hideLoader();

    if (error) {
        console.error("Error fetching ranking:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Cargar Ranking',
            text: 'No se pudo cargar el ranking. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
        return;
    }

    let rankingHtml = `
        <div class="ranking-modal-content">
            <h2><i class="fas fa-trophy"></i> Top 10 Sopa de Letras General</h2>
            <div class="ranking-table-container">
                <table class="ranking-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Jugador</th>
                            <th>Tiempo</th>
                            <th>Palabras</th>
                            <th>Oro</th>
                            <th>Diamantes</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (data.length === 0) {
        rankingHtml += `<tr><td colspan="6">No hay resultados aún. ¡Sé el primero en jugar!</td></tr>`;
    } else {
        data.forEach((entry, index) => {
            // Check if this entry belongs to the current user
            const isCurrentUser = currentUserId && entry.user_id === currentUserId;
            const rowClass = isCurrentUser ? 'current-player-rank' : '';

            rankingHtml += `
                <tr class="${rowClass}">
                    <td class="rank-number" data-label="#">${index + 1}</td>
                    <td data-label="Jugador">${entry.username || 'Anónimo'}</td>
                    <td class="time-taken" data-label="Tiempo">${formatTime(entry.time_taken_seconds)}</td>
                    <td data-label="Palabras">${entry.words_found_count}</td>
                    <td data-label="Oro">${entry.gold_earned} <i class="fas fa-coins"></i></td>
                    <td data-label="Diamantes">${entry.diamonds_earned} <i class="fas fa-gem"></i></td>
                </tr>
            `;
        });
    }

    rankingHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    Swal.fire({
        html: rankingHtml,
        showConfirmButton: true,
        confirmButtonText: 'Cerrar',
        customClass: {
            popup: 'swal2-custom-ranking-modal', // Custom CSS class for the modal
            confirmButton: 'swal2-confirm-button'
        },
        width: '80%', // Modal width
        didOpen: () => {
            // Ensure ranking button is visible if modal is closed
            rankingButton.style.display = 'flex';
        }
    }).then((result) => {
        // On modal close, reload page
        if (result.isConfirmed || result.dismiss === Swal.DismissReason.backdrop || result.dismiss === Swal.DismissReason.esc) {
            location.reload(); // Reloads the page
        }
    });
}


// ====================================================================================
// DOM CONTENT LOADED INITIALIZATION
// ====================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // DOM element references
    loaderWrapper = document.getElementById('loader-wrapper');
    wordGridElement = document.getElementById('word-grid');
    wordListElement = document.getElementById('word-list');
    timerDisplay = document.getElementById('timer-display');
    goldScoreDisplay = document.getElementById('gold-score-display');
    diamondsScoreDisplay = document.getElementById('diamonds-score-display');
    rankingButton = document.getElementById('ranking-button');

    // Add event listener to ranking button
    if (rankingButton) {
        rankingButton.addEventListener('click', showRanking);
    }

    // Show loader immediately
    showLoader('Generando Sopa de Letras...');

    // Initialize game after a short delay (so loader is visible)
    setTimeout(() => {
        initializeGame();
    }, 500); // Small delay for loader to show before generation
});
