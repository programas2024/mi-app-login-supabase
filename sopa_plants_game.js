// sopa_plants_game.js - Lógica para el juego de Sopa de Letras (Tema Plantas)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ====================================================================================
// CONFIGURACIÓN Y ESTADO DEL JUEGO
// ====================================================================================

const SUPABASE_URL = 'https://fesrphtabjohxcklbosh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc3JwaHRhYmpvaHhja2xib3NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjQ0ODAsImV4cCI6MjA2ODYwMDQ4MH0.S8EJGetv7v9OWfiUCbxvoza1e8yUBVojyWvYCrR5nLo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GRID_SIZE = 12; // Cuadrícula de 12x12
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Palabras principales a encontrar (15 palabras) para PLANTAS
const MAIN_WORDS = [
    "ARBOL", "FLOR", "HOJA", "RAIZ", "TALLO",
    "FRUTO", "SEMILLA", "RAMA", "CORTEZA", "POLEN",
    "PETALO", "HIERBA", "MUSGO", "HELECHO", "CACTUS"
];

// Palabras sorpresa (no visibles en la lista, pero dan puntos extra) para PLANTAS
const SURPRISE_WORDS = [
    "ROSA", "LIRIO", "TULIPAN", "ORQUIDEA", "GIRASOL",
    "BAMBU", "PALMERA", "TRIGO", "MAIZ", "ALGA"
];

const ALL_WORDS = [...MAIN_WORDS, ...SURPRISE_WORDS];

let gameGrid = [];
let placedWords = []; // { word: "ARBOL", cells: [{row:0, col:0}, ...], isFound: false, isBonus: false }
let foundWordsCount = 0;
let totalMainWords = MAIN_WORDS.length;

let timerInterval;
let timeLeft = 120; // 2 minutos
let gameStartedTime = 0;

let currentGold = 0;
let currentDiamonds = 0;

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
// LÓGICA DE INTERACCIÓN DEL USUARIO (SELECCIÓN DE PALABRAS)
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
// LÓGICA DEL JUEGO (INICIALIZACIÓN, TEMPORIZADOR, FIN DEL JUEGO)
// ====================================================================================

/**
 * Inicializa el juego de Sopa de Letras.
 */
async function initializeGame() {
    showLoader('Generando Sopa de Letras...'); // Mostrar loader al inicio de la inicialización
    
    currentGold = 0;
    currentDiamonds = 0;
    foundWordsCount = 0;
    timeLeft = 120; // Reiniciar tiempo a 2 minutos
    gameStartedTime = Date.now();

    goldScoreDisplay.textContent = currentGold;
    diamondsScoreDisplay.textContent = currentDiamonds;
    updateTimerDisplay();

    generateWordSearchGrid();
    renderGrid();
    renderWordList();
    startTimer();

    // Añadir event listeners para la interacción con la cuadrícula
    wordGridElement.addEventListener('mousedown', handleMouseDown);
    wordGridElement.addEventListener('mousemove', handleMouseMove);
    wordGridElement.addEventListener('mouseup', handleMouseUp);
    // Para dispositivos táctiles
    wordGridElement.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevenir scroll
        const touch = e.touches[0];
        // Usar elementFromPoint para obtener el elemento en la posición del toque
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElement && targetElement.classList.contains('grid-cell')) {
            handleMouseDown({ target: targetElement });
        }
    }, { passive: false });
    wordGridElement.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevenir scroll
        const touch = e.touches[0];
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElement && targetElement.classList.contains('grid-cell')) {
            handleMouseMove({ target: targetElement });
        }
    }, { passive: false });
    wordGridElement.addEventListener('touchend', handleMouseUp);

    hideLoader(); // Ocultar loader al finalizar la inicialización
}

/**
 * Inicia el temporizador del juego.
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
 * Actualiza la visualización del temporizador.
 */
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Verifica si el juego ha terminado (todas las palabras principales encontradas).
 */
async function checkGameEnd() {
    if (foundWordsCount === totalMainWords) {
        clearInterval(timerInterval);
        const timeTaken = (Date.now() - gameStartedTime) / 1000; // Tiempo en segundos
        const bonusTime = Math.max(0, timeLeft); // Tiempo restante como bonus
        const finalGold = currentGold + Math.floor(bonusTime / 5); // 1 oro por cada 5 segundos restantes
        const finalDiamonds = currentDiamonds + Math.floor(bonusTime / 10); // 1 diamante por cada 10 segundos restantes

        await updatePlayerBalance(finalGold, finalDiamonds);

        Swal.fire({
            icon: 'success',
            title: '¡Sopa de Letras Completada!',
            html: `¡Felicidades! Encontraste todas las palabras.<br>
                   Tiempo restante: <strong>${Math.floor(bonusTime)} segundos</strong><br>
                   Ganaste <strong>${finalGold} Oro <i class="fas fa-coins"></i></strong> y <strong>${finalDiamonds} Diamantes <i class="fas fa-gem"></i></strong>.`,
            confirmButtonText: 'Jugar de Nuevo',
            customClass: {
                confirmButton: 'swal2-confirm-button',
                popup: 'swal2-custom-final-success'
            },
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                initializeGame(); // Reinicia el juego
            }
        });
    }
}

/**
 * Maneja el fin del juego, específicamente cuando el tiempo se agota.
 * @param {string} message - Mensaje a mostrar (ej. "¡Se acabó el tiempo!").
 */
async function handleGameOver(message) { 
    clearInterval(timerInterval);

    // Otorgar oro y diamantes acumulados por las palabras encontradas hasta ahora
    await updatePlayerBalance(currentGold, currentDiamonds);

    Swal.fire({
        icon: 'error', // Icono para tiempo agotado/derrota
        title: '¡Tiempo Agotado!',
        html: `${message}<br>Has ganado <strong>${currentGold} Oro <i class="fas fa-coins"></i></strong> y <strong>${currentDiamonds} Diamantes <i class="fas fa-gem"></i></strong> por las palabras que encontraste.<br>¡Inténtalo de nuevo para mejorar tu puntaje!`,
        confirmButtonText: 'Jugar de Nuevo',
        customClass: {
            confirmButton: 'swal2-confirm-button',
            popup: 'swal2-custom-game-over' // Estilo para fin de juego
        },
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            initializeGame(); // Reinicia el juego
        }
    });
}

// ====================================================================================
// SUPABASE INTEGRATION
// ====================================================================================

/**
 * Actualiza el balance de oro y diamantes del jugador en la base de datos (Supabase).
 * @param {number} gold - Cantidad de oro a añadir.
 * @param {number} diamonds - Cantidad de diamantes a añadir.
 */
async function updatePlayerBalance(gold = 0, diamonds = 0) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError) {
        console.error("Error getting session (Sopa de Letras):", sessionError);
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
        console.warn("No user logged in (Sopa de Letras). Cannot update balance.");
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
        console.error("Error fetching current profile (Sopa de Letras):", fetchError);
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
        console.error("Error updating player balance (Sopa de Letras):", error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar Recompensa',
            text: 'Hubo un problema al guardar tus recompensas. Por favor, intenta de nuevo.',
            confirmButtonText: 'Entendido',
            customClass: { popup: 'swal2-custom-game-over' }
        });
    } else {
        console.log(`Balance actualizado (Sopa de Letras): +${gold} Oro, +${diamonds} Diamantes. Nuevo total: ${newGold} Oro, ${newDiamonds} Diamantes.`);
    }
}


// ====================================================================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ====================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    loaderWrapper = document.getElementById('loader-wrapper');
    wordGridElement = document.getElementById('word-grid');
    wordListElement = document.getElementById('word-list');
    timerDisplay = document.getElementById('timer-display');
    goldScoreDisplay = document.getElementById('gold-score-display');
    diamondsScoreDisplay = document.getElementById('diamonds-score-display');

    // Mostrar el loader inmediatamente
    showLoader('Generando Sopa de Letras...');

    // Inicializar el juego después de un breve retraso (para que el loader sea visible)
    setTimeout(() => {
        initializeGame();
    }, 500); // Pequeño retraso para que el loader se muestre antes de la generación
});