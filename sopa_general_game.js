// sopa_general_game.js - Lógica para el juego de Sopa de Letras (Tema General)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// CONFIGURACIÓN Y ESTADO DEL JUEGO
// ====================================================================================

const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
// ¡CLAVE PROPORCIONADA POR EL USUARIO - ASEGÚRATE DE QUE SEA EXACTAMENTE LA DE TU PROYECTO!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBojyWvYCrR5nLo'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GRID_SIZE = 12; // Cuadrícula de 12x12
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Palabras principales a encontrar (combinadas de todas las categorías)
const MAIN_WORDS = [
    "LEON", "ELEFANTE", "SERPIENTE", "JIRAFA", "TIGRE", // Animales
    "ARBOL", "FLOR", "HOJA", "SEMILLA", "CACTUS",      // Plantas
    "SALUD", "DOCTOR", "HOSPITAL", "VACUNA", "SINTOMA", // Medicina
    "FUTBOL", "TENIS", "NATACION", "GIMNASIA", "BOXEO"  // Deportes
];

// Palabras sorpresa (no visibles en la lista, pero dan puntos extra)
const SURPRISE_WORDS = [
    "PANDA", "KOALA", "ROSA", "ORQUIDEA", "ANATOMIA", 
    "BACTERIA", "SURF", "YOGA", "ESPACIO", "ESTRELLA"
];

const ALL_WORDS = [...MAIN_WORDS, ...SURPRISE_WORDS];

let gameGrid = [];
let placedWords = []; // { word: "WORD", cells: [{row:0, col:0}, ...], isFound: false, isBonus: false }
let foundWordsCount = 0; // Contador de palabras principales encontradas
let totalMainWords = MAIN_WORDS.length;

let timerInterval;
let timeLeft = 180; // 3 minutos para la categoría General
let gameStartedTime = 0;

let currentGold = 0; // Oro acumulado por palabras encontradas (base)
let currentDiamonds = 0; // Diamantes acumulados por palabras sorpresa

let isSelecting = false;
let startCell = null;
let endCell = null;
let selectedCells = [];

// ====================================================================================
// REFERENCIAS A ELEMENTOS DEL DOM
// ====================================================================================
let loaderWrapper;
let wordGridElement;
let wordListElement;
let timerDisplay;
let goldScoreDisplay;
let diamondsScoreDisplay;
let rankingButton;

// ====================================================================================
// FUNCIONES DE UTILIDAD
// ====================================================================================

/**
 * Muestra el loader de la página de juego.
 * @param {string} message - Mensaje a mostrar en el loader.
 */
function showLoader(message = 'Cargando...') {
    if (loaderWrapper) {
        const loaderText = loaderWrapper.querySelector('h1'); // Asumiendo que el texto está en un h1
        if (loaderText) {
            loaderText.textContent = message;
        }
        loaderWrapper.classList.remove('hidden');
    }
}

/**
 * Oculta el loader de la página de juego.
 */
function hideLoader() {
    if (loaderWrapper) {
        loaderWrapper.classList.add('hidden');
    }
}

/**
 * Obtiene un número aleatorio entre min y max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Obtiene una letra aleatoria del alfabeto.
 * @returns {string}
 */
function getRandomLetter() {
    return ALPHABET[getRandomInt(0, ALPHABET.length - 1)];
}

/**
 * Aplica una animación temporal a un elemento de puntaje.
 * @param {HTMLElement} element - El elemento DOM del puntaje a animar.
 */
function animateScore(element) {
    element.classList.remove('score-highlight'); // Asegura que se reinicie la animación
    void element.offsetWidth; // Truco para forzar un reflow y reiniciar la animación
    element.classList.add('score-highlight');
}

/**
 * Formatea segundos a formato MM:SS.
 * @param {number} totalSeconds - Segundos totales.
 * @returns {string} Tiempo formateado.
 */
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// ====================================================================================
// LÓGICA DE GENERACIÓN DE LA CUADRÍCULA
// ====================================================================================

/**
 * Inicializa una cuadrícula vacía con el tamaño especificado.
 * @param {number} size - Tamaño de la cuadrícula (ej. 10 para 10x10).
 * @returns {Array<Array<string>>} La cuadrícula vacía.
 */
function createEmptyGrid(size) {
    return Array(size).fill(null).map(() => Array(size).fill(''));
}

/**
 * Intenta colocar una palabra en la cuadrícula.
 * @param {Array<Array<string>>} grid - La cuadrícula actual.
 * @param {string} word - La palabra a colocar.
 * @returns {Array<{row: number, col: number}> | null} Las celdas ocupadas por la palabra si se colocó, o null.
 */
function placeWord(grid, word) {
    const directions = [
        { dr: 0, dc: 1 },  // Horizontal
        { dr: 1, dc: 0 },  // Vertical
        { dr: 1, dc: 1 },  // Diagonal (abajo-derecha)
        { dr: 1, dc: -1 }, // Diagonal (abajo-izquierda)
        { dr: 0, dc: -1 }, // Horizontal (inverso)
        { dr: -1, dc: 0 }, // Vertical (inverso)
        { dr: -1, dc: -1 },// Diagonal (arriba-izquierda)
        { dr: -1, dc: 1 }  // Diagonal (arriba-derecha)
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
                    return cells; // Palabra colocada exitosamente
                }
            }
        }
    }
    return null; // No se pudo colocar la palabra
}

/**
 * Rellena las celdas vacías de la cuadrícula con letras aleatorias.
 * @param {Array<Array<string>>} grid - La cuadrícula.
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
 * Genera la cuadrícula de sopa de letras con palabras y letras aleatorias.
 */
function generateWordSearchGrid() {
    gameGrid = createEmptyGrid(GRID_SIZE);
    placedWords = [];

    // Colocar palabras principales
    const shuffledMainWords = [...MAIN_WORDS].sort(() => Math.random() - 0.5);
    shuffledMainWords.forEach(word => {
        const cells = placeWord(gameGrid, word);
        if (cells) {
            placedWords.push({ word: word, cells: cells, isFound: false, isBonus: false, element: null });
        } else {
            console.warn(`No se pudo colocar la palabra principal: ${word}`);
        }
    });

    // Colocar palabras sorpresa
    const shuffledSurpriseWords = [...SURPRISE_WORDS].sort(() => Math.random() - 0.5);
    shuffledSurpriseWords.forEach(word => {
        const cells = placeWord(gameGrid, word);
        if (cells) {
            placedWords.push({ word: word, cells: cells, isFound: false, isBonus: true, element: null });
        } else {
            console.warn(`No se pudo colocar la palabra sorpresa: ${word}`);
        }
    });

    fillEmptyCells(gameGrid);
}

/**
 * Renderiza la cuadrícula en el DOM.
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
 * Renderiza la lista de palabras a encontrar.
 */
function renderWordList() {
    wordListElement.innerHTML = '';
    MAIN_WORDS.forEach(word => {
        const listItem = document.createElement('li');
        listItem.textContent = word;
        listItem.dataset.word = word; // Guarda la palabra en un data attribute
        wordListElement.appendChild(listItem);

        // Almacena la referencia al elemento LI en el objeto de la palabra colocada
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
 * Maneja el inicio de la selección de celdas.
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
 * Maneja el movimiento del ratón/dedo durante la selección.
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
            return; // Evita recalcular si la celda final no ha cambiado
        }
        endCell = currentCell;
        updateSelectionHighlight();
    }
}

/**
 * Maneja el final de la selección de celdas.
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
    clearSelection(); // Limpia la selección después de verificar
}

/**
 * Resalta las celdas entre startCell y endCell.
 */
function updateSelectionHighlight() {
    clearSelection();
    if (!startCell || !endCell) return;

    const cellsToHighlight = getCellsInSelection(startCell, endCell);
    selectedCells = []; // Reiniciar la lista de celdas seleccionadas
    cellsToHighlight.forEach(cellPos => {
        const cellElement = wordGridElement.querySelector(`[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`);
        if (cellElement) { 
            highlightCell(cellElement);
            selectedCells.push(cellPos); // Almacenar las celdas que realmente se resaltaron
        }
    });
}

/**
 * Añade la clase 'selected' a una celda.
 * @param {HTMLElement} cellElement
 */
function highlightCell(cellElement) {
    cellElement.classList.add('selected');
}

/**
 * Elimina la clase 'selected' de todas las celdas.
 */
function clearSelection() {
    document.querySelectorAll('.grid-cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    selectedCells = [];
}

/**
 * Obtiene todas las celdas entre dos puntos en línea recta.
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

    // Solo permitir selecciones horizontales, verticales o diagonales perfectas
    if (dr !== 0 && dc !== 0 && absDr !== absDc) {
        return []; // No es una línea recta válida
    }

    const steps = Math.max(absDr, absDc);
    if (steps === 0) { // Selección de una sola celda
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
 * Extrae la palabra de una lista de celdas seleccionadas.
 * @param {Array<{row: number, col: number}>} cells - Las celdas seleccionadas.
 * @returns {string} La palabra formada.
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
 * Verifica si la palabra seleccionada es correcta y actualiza el juego.
 * @param {string} selectedWordText - La palabra que el usuario seleccionó.
 * @param {Array<{row: number, col: number}>} cells - Las celdas de la palabra seleccionada.
 */
async function checkSelectedWord(selectedWordText, cells) {
    // Buscar la palabra en las palabras colocadas (principales o sorpresa)
    const foundPlacedWord = placedWords.find(pw => 
        !pw.isFound && 
        (pw.word === selectedWordText || pw.word === selectedWordText.split('').reverse().join('')) && // Comprobar también la palabra invertida
        pw.cells.every(pc => cells.some(sc => sc.row === pc.row && sc.col === pc.col)) && // Todas las celdas de la palabra colocada están en la selección
        cells.length === pw.word.length // La selección tiene la longitud exacta de la palabra
    );

    if (foundPlacedWord) {
        foundPlacedWord.isFound = true;
        
        // Marcar celdas como encontradas en la cuadrícula
        cells.forEach(cellPos => {
            const cellElement = wordGridElement.querySelector(`[data-row="${cellPos.row}"][data-col="${cellPos.col}"]`);
            if (cellElement) {
                cellElement.classList.add('found');
                cellElement.classList.remove('selected');
            }
        });

        if (foundPlacedWord.isBonus) {
            // Palabra sorpresa encontrada
            currentDiamonds += 5; // Recompensa de diamantes por palabra sorpresa
            diamondsScoreDisplay.textContent = currentDiamonds;
            animateScore(diamondsScoreDisplay);
            Swal.fire({
                icon: 'info',
                title: '¡Palabra Sorpresa!',
                text: `¡Encontraste "${foundPlacedWord.word}"! Ganaste 5 Diamantes.`,
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
                customClass: { popup: 'swal2-custom-level-up' } // Usar un estilo de éxito/info
            });
        } else {
            // Palabra principal encontrada
            foundWordsCount++;
            currentGold += 10; // Recompensa de oro por palabra principal
            goldScoreDisplay.textContent = currentGold;
            animateScore(goldScoreDisplay);
            
            // Marcar palabra en la lista
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
                customClass: { popup: 'swal2-custom-final-success' } // Usar un estilo de éxito
            });
        }
        
        await checkGameEnd();
    } else {
        // Palabra incorrecta o ya encontrada
        // No hacer nada visualmente, la selección se borrará automáticamente.
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
 * Saves or updates the game result in the profiles table.
 * Prioritizes updating if the combined score (gold + diamonds) is better,
 * or if the time is better in case of a tie in combined score.
 * @param {number} timeTaken - Time in seconds to complete the game.
 * @param {number} wordsFound - Number of words found.
 * @param {number} goldEarned - Gold earned in this specific game.
 * @param {number} diamondsEarned - Diamonds earned in this specific game.
 */
async function saveGameResultToRanking(timeTaken, wordsFound, goldEarned, diamondsEarned) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;
    
    // If no user is logged in, we cannot save a persistent best score.
    // The game will still run, but ranking will only be for logged-in users.
    if (!user) {
        console.warn("No user logged in. Best game result not saved to ranking.");
        Swal.fire({
            icon: 'info',
            title: 'Inicia Sesión para Guardar tu Mejor Puntaje',
            text: 'Tu puntaje de esta partida no se guardará en el ranking global porque no has iniciado sesión.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-warning' }
        });
        return;
    }

    let username = "Anónimo"; // Default username if not fetched
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, best_time_taken_seconds, best_words_found_count, best_gold_earned_game, best_diamonds_earned_game')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error("Error fetching profile for ranking:", profileError);
        // If profile fetch fails, we cannot save/update the best game result.
        Swal.fire({
            icon: 'error',
            title: 'Error al Obtener Perfil para Ranking',
            text: 'Hubo un problema al cargar tu perfil para guardar el mejor resultado. Por favor, contacta soporte.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
        return;
    }

    if (profile && profile.username) {
        username = profile.username;
    }

    const newCombinedScore = goldEarned + diamondsEarned;
    const existingCombinedScore = (profile.best_gold_earned_game || 0) + (profile.best_diamonds_earned_game || 0);

    let shouldUpdate = false;
    // Check if the new score is better than the existing best score
    if (newCombinedScore > existingCombinedScore) {
        shouldUpdate = true;
    } else if (newCombinedScore === existingCombinedScore) {
        // If combined scores are equal, check if the new time is better (lower)
        if (Math.floor(timeTaken) < (profile.best_time_taken_seconds || Infinity)) { // Use Infinity if no previous time
            shouldUpdate = true;
        }
    }

    if (shouldUpdate) {
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                best_time_taken_seconds: Math.floor(timeTaken),
                best_words_found_count: wordsFound,
                best_gold_earned_game: goldEarned,
                best_diamonds_earned_game: diamondsEarned
            })
            .eq('id', user.id);

        if (updateError) {
            console.error("Error updating best game result in profiles:", updateError);
            Swal.fire({
                icon: 'error',
                title: 'Error al Actualizar Mejor Puntaje',
                text: 'Hubo un problema al guardar tu mejor resultado en el ranking. Intenta de nuevo.',
                confirmButtonText: 'Entendido',
                customClass: { popup: 'swal2-custom-game-over' }
            });
        } else {
            console.log("Best game result updated in profiles (better score/time).");
        }
    } else {
        console.log("New game score/time is not better than existing best. Ranking not updated.");
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

    // Query the profiles table for ranking data
    const { data, error } = await supabase
        .from('profiles')
        .select('username, best_time_taken_seconds, best_words_found_count, best_gold_earned_game, best_diamonds_earned_game')
        // Filter out profiles with no game data (optional, but good for clean ranking)
        .not('best_gold_earned_game', 'is', null) 
        .not('best_diamonds_earned_game', 'is', null)
        // ORDERING: First by best gold (desc), then by best diamonds (desc), then by best time (asc)
        .order('best_gold_earned_game', { ascending: false })      // Higher gold first
        .order('best_diamonds_earned_game', { ascending: false }) // Then higher diamonds
        .order('best_time_taken_seconds', { ascending: true }) // Finally lower time (for tie-breaking)
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
            const isCurrentUser = currentUserId && entry.id === currentUserId; // Use entry.id now, as it's the profile ID
            const rowClass = isCurrentUser ? 'current-player-rank' : '';

            // Ensure values are not null before displaying
            const time = entry.best_time_taken_seconds !== null ? formatTime(entry.best_time_taken_seconds) : 'N/A';
            const words = entry.best_words_found_count !== null ? entry.best_words_found_count : 'N/A';
            const gold = entry.best_gold_earned_game !== null ? entry.best_gold_earned_game : 'N/A';
            const diamonds = entry.best_diamonds_earned_game !== null ? entry.best_diamonds_earned_game : 'N/A';

            rankingHtml += `
                <tr class="${rowClass}">
                    <td class="rank-number" data-label="#">${index + 1}</td>
                    <td data-label="Jugador">${entry.username || 'Anónimo'}</td>
                    <td class="time-taken" data-label="Tiempo">${time}</td>
                    <td data-label="Palabras">${words}</td>
                    <td data-label="Oro">${gold} <i class="fas fa-coins"></i></td>
                    <td data-label="Diamantes">${diamonds} <i class="fas fa-gem"></i></td>
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
