// tienda.js

document.addEventListener('DOMContentLoaded', () => {
    // Busca el nuevo botón de regreso por su ID
    const backButton = document.getElementById('back-to-dashboard');

    if (backButton) {
        // Añade un 'escuchador de eventos' al botón
        backButton.addEventListener('click', () => {
            // Usa window.location.href para forzar una nueva carga de página
            window.location.href = 'dashboard.html';
        });
    }
});
