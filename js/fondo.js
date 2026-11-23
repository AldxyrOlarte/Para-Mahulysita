/* =========================================================
   Fondo según la hora  ->  js/fondo.js
   Script normal (sin módulos): funciona aunque Firebase falle.
   Probar: agrega ?momento=noche (o amanecer, dia, tarde) a la dirección.
   ========================================================= */

(function () {
    var SALUDOS = {
        amanecer: "Buenos días, mi amor ☀️",
        dia: "Hola, mi amor",
        tarde: "Buenas tardes, mi amor 🌅",
        noche: "Buenas noches, mi amor 🌙"
    };
    var COLOR_TEMA = { amanecer: "#ff9a8b", dia: "#ff4d98", tarde: "#ff6f61", noche: "#3b1d5a" };

    function momentoActual() {
        var forzado = "";
        try { forzado = new URLSearchParams(location.search).get("momento") || ""; } catch (e) {}
        if (COLOR_TEMA[forzado]) { return forzado; }

        var h = new Date().getHours();
        if (h >= 5 && h < 9) { return "amanecer"; }
        if (h >= 9 && h < 17) { return "dia"; }
        if (h >= 17 && h < 20) { return "tarde"; }
        return "noche";
    }

    function aplicar() {
        var m = momentoActual();
        document.documentElement.setAttribute("data-momento", m);

        // Solo cambia el saludo si todavía tiene uno de los textos por defecto
        // (así no pisa el que edites desde la página)
        var saludo = document.querySelector(".saludo");
        if (saludo) {
            var esDefecto = Object.keys(SALUDOS).some(function (k) { return SALUDOS[k] === saludo.textContent || saludo.textContent === "Hola, mi amor"; });
            if (esDefecto) { saludo.textContent = SALUDOS[m]; }
        }

        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) { meta.setAttribute("content", COLOR_TEMA[m]); }
    }

    // Estrellitas y luna (se ven solo de noche, lo decide el CSS)
    function crearEstrellas() {
        if (document.querySelector(".estrellas")) { return; }
        var cont = document.createElement("div");
        cont.className = "estrellas";
        cont.setAttribute("aria-hidden", "true");

        var total = window.matchMedia("(max-width: 699px)").matches ? 30 : 55;
        for (var i = 0; i < total; i++) {
            var s = document.createElement("span");
            s.style.left = Math.random() * 100 + "%";
            s.style.top = Math.random() * 100 + "%";
            s.style.animationDelay = Math.random() * 3 + "s";
            s.style.animationDuration = 2 + Math.random() * 3 + "s";
            cont.appendChild(s);
        }

        var luna = document.createElement("span");
        luna.className = "luna";
        luna.textContent = "🌙";
        cont.appendChild(luna);

        document.body.appendChild(cont);
    }

    aplicar();
    crearEstrellas();
    setInterval(aplicar, 60 * 1000);
})();
