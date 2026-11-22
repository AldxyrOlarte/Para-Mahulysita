/* =========================================================
   Nota adhesiva de la página principal
   Edita solo este bloque para cambiar lo que dice la nota.
   - Usa \n para hacer un salto de línea.
   - Puedes poner emojis.
   ========================================================= */

const NOTA = {
    titulo: "Para ti, mi amor 💛",
    mensaje:
        "Quiero que recuerdes que eres una de las cosas más bonitas que me han pasado.\n\n" +
        "Gracias por cada risa, por cada charla y por quedarte conmigo.\n\n" +
        "Te quiero muchísimo, Mahulysita. 💕",
    firma: "Siempre tuyo, Thiago ❤️"
};

/* ---------- No hace falta tocar nada de aquí para abajo ---------- */

(function () {
    var nota = document.getElementById("nota");
    if (!nota) { return; }

    document.getElementById("nota-titulo").textContent = NOTA.titulo;
    document.getElementById("nota-mensaje").textContent = NOTA.mensaje;
    document.getElementById("nota-firma").textContent = NOTA.firma;

    // Al tocar la nota se mueve un poquito, como si fuera de papel
    nota.addEventListener("click", function () {
        nota.classList.remove("mueve");
        void nota.offsetWidth; // reinicia la animación
        nota.classList.add("mueve");
    });
})();
