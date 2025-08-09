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
            icon: 'info',
            // Ocultamos el icono predeterminado para usar uno propio
            showConfirmButton: true,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#6c5ce7', // Morado principal de la tienda
            customClass: {
                popup: 'swal2-lucete-popup',
                title: 'swal2-lucete-title',
                htmlContainer: 'swal2-lucete-text',
                confirmButton: 'swal2-lucete-button'
            },
            // Añadimos un fondo con efecto de desenfoque
            backdrop: `
                rgba(0,0,0,0.4)
                url("https://sweetalert2.github.io/images/nyan-cat.gif")
                left top
                no-repeat
            `
        });
    }

    if (infoButton) {
        infoButton.addEventListener('click', showInfoAlert);
    }
});
