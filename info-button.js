// Archivo: info-button.js

document.addEventListener('DOMContentLoaded', function() {
    const infoButton = document.getElementById('info-button');

    function showInfoAlert() {
        Swal.fire({
            title: 'Acerca de Tienda Lucete',
            html: `
                <p>¡Bienvenido a Tienda Lucete! Aquí encontrarás una emocionante colección de juegos rápidos, cofres misteriosos y fragmentos exclusivos para personalizar tu experiencia.</p>
                <p>Usa nuestros fragmentos para desbloquear objetos únicos y diviértete con nuestros juegos para ganar premios increíbles. ¡Explora, juega y luce tu estilo!</p>
            `,
            icon: 'info', // El icono de información
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#6c5ce7', // Color morado para el botón
        });
    }

    if (infoButton) {
        infoButton.addEventListener('click', showInfoAlert);
    }
});