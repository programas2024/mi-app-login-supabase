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