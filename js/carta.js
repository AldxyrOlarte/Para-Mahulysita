const FORMSPREE_URL = "https://formspree.io/f/TU_CODIGO_AQUI";

/* ---------- LA HISTORIA (edita los textos aquí) ----------
   clase:   e1 ... e8 (cambia fondo y posición de los personajes)
   camina:  quién camina al empezar la escena ("tiago", "mahuly", "rohys")
   eventos: cosas que pasan a los X milisegundos de empezar la escena
            { ms, emo: ["tiago", "😳"] }  -> globito con emoji
            { ms, clase: "huye", camina: ["mahuly"] }  -> clase extra y caminata
            { ms, lluvia: 10 }  -> lluvia de corazones
*/

const escenas = [
    {
        clase: "e1",
        camina: [],
        eventos: [
            { ms: 3500, emo: ["mahuly", "✨"] }
        ],
        texto: `Eran las 6:20 de la tarde y el atardecer pintaba el cielo. 🌇

Yo salía del colegio con Rohys, mi amigo, sin imaginar que ese día algo iba a cambiar... Y a lo lejos, estabas tú.`
    },
    {
        clase: "e2",
        camina: ["tiago"],
        eventos: [
            { ms: 3000, emo: ["mahuly", "😳"] },
            { ms: 5500, clase: "huye", camina: ["mahuly"] }
        ],
        texto: `Me acerqué a ti y te pregunté si eras compañera de Rohys. Me dijiste que sí... y te fuiste rapidito, toda nerviosa. 😳`
    },
    {
        clase: "e3",
        camina: ["tiago", "mahuly"],
        eventos: [
            { ms: 3800, emo: ["tiago", "⏰"] }
        ],
        texto: `Al día siguiente, en la hora del recreo, fui a hablarte. Con toda mi valentía te pregunté la hora... ⏰`
    },
    {
        clase: "e4",
        camina: ["tiago", "mahuly"],
        eventos: [
            { ms: 3000, emo: ["tiago", "💭"] },
            { ms: 4800, emo: ["mahuly", "😊"] }
        ],
        texto: `Y sin pensarlo mucho te dije que las cosas se me olvidaban cuando estaba cerca de ti. 🙈`
    },
    {
        clase: "e5",
        camina: [],
        eventos: [
            { ms: 2500, emo: ["tiago", "💗"] },
            { ms: 3500, emo: ["mahuly", "💗"] }
        ],
        texto: `Pasaron unas semanas, y cada día me gustabas un poquito más... 💗`
    },
    {
        clase: "e6",
        camina: [],
        eventos: [
            { ms: 3200, emo: ["tiago", "😳"] }
        ],
        texto: `Hasta que un día me armé de valor y te dije que me gustabas. 😳💘`
    },
    {
        clase: "e7",
        camina: [],
        eventos: [
            { ms: 2400, emo: ["mahuly", "💖"] },
            { ms: 2400, lluvia: 10 }
        ],
        texto: `Y tú... me respondiste que sí. 🥹

Mi corazón no cabía de tanta felicidad.`
    },
    {
        clase: "e8",
        camina: ["tiago", "mahuly"],
        eventos: [],
        texto: `Y desde ese día nos hicimos novios. 💖

Gracias por cada risa y cada momento. Eres lo mejor que me ha pasado.`
    }
];

let escenaActual = -1;
let escribiendo = false;
let timer = null;
let textoActual = "";
let alTerminar = null;
let timersEscena = [];

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

/* ---------- GLOBITOS Y CAMINATA ---------- */

function ponerEmo(quien, icono) {
    const e = document.querySelector("." + quien + " .emo");
    if (!e) { return; }
    e.textContent = icono;
    e.classList.add("ver");
    setTimeout(function () { e.classList.remove("ver"); }, 2500);
}

function caminar(esc, quienes) {
    quienes.forEach(function (q) {
        esc.classList.add("cam-" + q);
        setTimeout(function () { esc.classList.remove("cam-" + q); }, 2700);
    });
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

    // limpiar lo pendiente de la escena anterior
    timersEscena.forEach(clearTimeout);
    timersEscena = [];
    document.querySelectorAll(".emo").forEach(function (x) { x.classList.remove("ver"); });

    esc.className = "escenario " + e.clase;

    caminar(esc, e.camina || []);

    (e.eventos || []).forEach(function (ev) {
        timersEscena.push(setTimeout(function () {
            if (ev.clase) { esc.classList.add(ev.clase); }
            if (ev.camina) { caminar(esc, ev.camina); }
            if (ev.emo) { ponerEmo(ev.emo[0], ev.emo[1]); }
            if (ev.lluvia) { lluvia(ev.lluvia); }
        }, ev.ms));
    });

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
            document.getElementById("notaFinal").classList.add("visible");
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
