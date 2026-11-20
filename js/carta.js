const FORMSPREE_URL = "https://formspree.io/f/TU_CODIGO_AQUI";

/* ---------- LA HISTORIA (edita los textos aquí) ---------- */

const escenas = [
    {
        clase: "e1",
        camina: false,
        texto: `Había una vez una chica de rizos preciosos y una sonrisa de esas que iluminan todo... 🌸

Y también un chico de pelo lacio, tranquilo y soñador, que aún no sabía lo que le esperaba. ✨`
    },
    {
        clase: "e2",
        camina: true,
        corazones: 2400,
        texto: `Un día, sus caminos se cruzaron. Se miraron y, sin saber por qué, el corazón les empezó a latir más fuerte. 💓`
    },
    {
        clase: "e3",
        camina: false,
        texto: `Desde ese día todo fue más bonito: risas, charlas y paseos... y claro, siempre había tiempo para un heladito juntos. 🍦`
    },
    {
        clase: "e4",
        camina: true,
        texto: `Y una noche, bajo las estrellas, el chico entendió que lo mejor que le pudo pasar fue encontrarla a ella. 🌙⭐`
    },
    {
        clase: "e5",
        camina: true,
        texto: `Hola mi amortitooooo lindoooo

Amortitooo te quieroo decir muchas graciass por todoo, y de verdadd te merecess un heladitooo, perooo usted elige la opcionnn 🍦`
    }
];

let escenaActual = -1;
let escribiendo = false;
let timer = null;
let textoActual = "";
let alTerminar = null;

/* ---------- CORAZONES DE FONDO ---------- */

const emojis = ["💖", "💗", "💕", "❤️", "🌸"];

function crearCorazon() {
    const c = document.createElement("span");
    c.className = "corazon";
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    c.style.left = Math.random() * 100 + "vw";
    c.style.fontSize = 14 + Math.random() * 22 + "px";
    c.style.animationDuration = 5 + Math.random() * 5 + "s";
    document.getElementById("corazones").appendChild(c);
    setTimeout(function () { c.remove(); }, 10000);
}

setInterval(crearCorazon, 700);

/* ---------- ESTRELLAS DE LA ESCENA DE NOCHE ---------- */

(function crearEstrellas() {
    const cont = document.getElementById("estrellas");
    for (let k = 0; k < 28; k++) {
        const s = document.createElement("span");
        s.style.left = Math.random() * 100 + "%";
        s.style.top = Math.random() * 65 + "%";
        s.style.animationDelay = Math.random() * 2 + "s";
        cont.appendChild(s);
    }
})();

/* ---------- PUNTOS DE PROGRESO ---------- */

(function crearPuntos() {
    const cont = document.getElementById("puntos");
    escenas.forEach(function () {
        cont.appendChild(document.createElement("span"));
    });
})();

/* ---------- LLUVIA DE CORAZONES EN EL ESCENARIO ---------- */

function lluvia(cantidad) {
    const cont = document.getElementById("latidos");
    for (let k = 0; k < cantidad; k++) {
        setTimeout(function () {
            const h = document.createElement("span");
            h.textContent = emojis[Math.floor(Math.random() * 4)];
            h.style.left = 30 + Math.random() * 40 + "%";
            cont.appendChild(h);
            setTimeout(function () { h.remove(); }, 2700);
        }, k * 120);
    }
}

/* ---------- ABRIR EL SOBRE ---------- */

function abrirCarta() {
    const boton = document.getElementById("btnAbrir");
    boton.disabled = true;
    document.getElementById("sobre").classList.add("abierto");

    setTimeout(function () {
        document.getElementById("portada").classList.add("salir");
    }, 2200);

    setTimeout(function () {
        document.getElementById("portada").style.display = "none";
        document.getElementById("historia").classList.add("visible");
        irEscena(0);
    }, 3000);
}

/* ---------- MÁQUINA DE ESCRIBIR ---------- */

function escribir(texto, callback) {
    clearTimeout(timer);
    const p = document.getElementById("mensaje");
    p.textContent = "";
    p.classList.add("escribiendo");
    escribiendo = true;
    textoActual = texto;
    alTerminar = callback;
    document.getElementById("btnSig").textContent = "Saltar ⏩";

    let k = 0;
    (function paso() {
        if (k < texto.length) {
            p.textContent += texto.charAt(k);
            k++;
            timer = setTimeout(paso, 38);
        } else {
            terminarTexto();
        }
    })();
}

function terminarTexto() {
    clearTimeout(timer);
    const p = document.getElementById("mensaje");
    p.textContent = textoActual;
    p.classList.remove("escribiendo");
    escribiendo = false;
    document.getElementById("btnSig").textContent = "Siguiente ▶";

    if (alTerminar) {
        const cb = alTerminar;
        alTerminar = null;
        cb();
    }
}

/* ---------- ESCENAS ---------- */

function irEscena(n) {
    const esc = document.getElementById("escenario");
    const e = escenas[n];
    escenaActual = n;

    esc.className = "escenario " + e.clase;

    if (e.camina) {
        esc.classList.add("caminando");
        setTimeout(function () { esc.classList.remove("caminando"); }, 2700);
    }

    if (e.corazones) {
        setTimeout(function () { lluvia(10); }, e.corazones);
    }

    const puntos = document.getElementById("puntos").children;
    for (let k = 0; k < puntos.length; k++) {
        puntos[k].classList.toggle("activo", k === n);
    }

    const ultima = n === escenas.length - 1;
    document.getElementById("btnSig").style.display = ultima ? "none" : "block";

    escribir(e.texto, function () {
        if (ultima) {
            finalDeLaHistoria();
        }
    });
}

function siguiente() {
    if (escribiendo) {
        terminarTexto();
        return;
    }
    if (escenaActual < escenas.length - 1) {
        irEscena(escenaActual + 1);
    }
}

function finalDeLaHistoria() {
    document.getElementById("firma").classList.add("visible");
    document.getElementById("opciones").classList.add("visible");
    document.getElementById("galeria").classList.add("visible");
    lluvia(12);
    setTimeout(function () {
        document.getElementById("opciones").scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
}

/* ---------- RESPUESTA (Formspree) ---------- */

function responder(opcion) {
    const respuesta = document.getElementById("respuesta");
    respuesta.textContent = "Enviando tu respuesta...";

    fetch(FORMSPREE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ mensaje: "Jazmín eligió: " + opcion })
    })
    .then(function (r) {
        if (r.ok) {
            respuesta.textContent = "Listo, elegiste: " + opcion;
            document.getElementById("opciones").style.display = "none";
            lluvia(25);
            for (let k = 0; k < 15; k++) {
                setTimeout(crearCorazon, k * 80);
            }
        } else {
            respuesta.textContent = "Ups, algo falló. Intenta de nuevo";
        }
    })
    .catch(function () {
        respuesta.textContent = "Ups, no hay conexión. Intenta de nuevo";
    });
}

/* ---------- VISOR DE FOTOS ---------- */

function verFoto(figura) {
    const img = figura.querySelector("img");
    if (!img || img.style.display === "none") {
        return; // todavía no hay foto cargada
    }
    document.getElementById("visorImg").src = img.src;
    document.getElementById("visorTexto").textContent =
        figura.querySelector("figcaption").textContent;
    document.getElementById("visor").classList.add("activo");
}

function cerrarVisor() {
    document.getElementById("visor").classList.remove("activo");
}
