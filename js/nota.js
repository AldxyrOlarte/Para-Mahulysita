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
    firma: "Siempre tuyo, Thiago ❤️",

    // Segundos que pasan desde que ella ve la nota hasta que se despega
    // (pon 0 si no quieres que se despegue)
    segundosParaDespegar: 6
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

    // Cuando termina de caer, se queda quieta en su nueva posición
    nota.addEventListener("animationend", function (e) {
        if (e.animationName === "nota-cae") {
            nota.classList.remove("despegada");
            nota.classList.add("quieta");
        }
    });

    function despegar() {
        if (nota.classList.contains("despegada") || nota.classList.contains("quieta")) { return; }
        nota.classList.remove("mueve");
        nota.classList.add("despegada");
    }

    // La cuenta empieza cuando la nota aparece en la pantalla
    if (!NOTA.segundosParaDespegar || NOTA.segundosParaDespegar <= 0) { return; }

    function empezarCuenta() {
        setTimeout(despegar, NOTA.segundosParaDespegar * 1000);
    }

    if ("IntersectionObserver" in window) {
        var obs = new IntersectionObserver(function (entradas) {
            if (entradas[0].isIntersecting) {
                obs.disconnect();
                empezarCuenta();
            }
        }, { threshold: 0.6 });
        obs.observe(nota);
    } else {
        empezarCuenta();
    }
})();
