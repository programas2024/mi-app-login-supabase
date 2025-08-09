document.addEventListener('DOMContentLoaded', function() {
    // Seleccionamos todos los botones de la barra lateral
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    // Seleccionamos todas las secciones de contenido
    const secciones = document.querySelectorAll('.seccion-contenido');

    // Función para mostrar la sección seleccionada y ocultar las demás
    function mostrarSeccion(seccionId) {
        // Oculta todas las secciones
        secciones.forEach(seccion => {
            seccion.style.display = 'none';
        });

        // Muestra la sección que coincide con el ID
        const seccionAMostrar = document.getElementById(seccionId);
        if (seccionAMostrar) {
            seccionAMostrar.style.display = 'block';
        }
    }

    // Añade un "event listener" a cada botón de la barra lateral
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault(); // Evita que el enlace recargue la página
            
            // Obtiene el ID de la sección a mostrar desde el atributo 'data-target'
            const targetId = this.getAttribute('data-target');
            
            // Llama a la función para mostrar la sección
            mostrarSeccion(targetId);
        });
    });
});

// Archivo: info-button.js

document.addEventListener('DOMContentLoaded', function() {
    const infoButton = document.getElementById('info-button');

    // Creamos el HTML del modal en el cuerpo del documento
    const modalHTML = `
        <div class="info-modal-overlay">
            <div class="info-modal-content">
                <h3>Acerca de Tienda Lucete</h3>
                <p>
                    ¡Bienvenido a Tienda Lucete! Aquí encontrarás una emocionante colección de juegos rápidos, cofres misteriosos y fragmentos exclusivos para personalizar tu experiencia.
                </p>
                <p>
                    Usa nuestros fragmentos para desbloquear objetos únicos y diviértete con nuestros juegos para ganar premios increíbles. ¡Explora, juega y luce tu estilo!
                </p>
                <button class="info-modal-close">Entendido</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const infoModalOverlay = document.querySelector('.info-modal-overlay');
    const closeButton = document.querySelector('.info-modal-close');

    // Función para mostrar el modal
    function showModal() {
        infoModalOverlay.classList.add('visible');
    }

    // Función para ocultar el modal
    function hideModal() {
        infoModalOverlay.classList.remove('visible');
    }

    // Escuchamos los clics en los botones
    infoButton.addEventListener('click', showModal);
    closeButton.addEventListener('click', hideModal);

    // Ocultar modal si se hace clic fuera del contenido
    infoModalOverlay.addEventListener('click', function(e) {
        if (e.target === infoModalOverlay) {
            hideModal();
        }
    });
});