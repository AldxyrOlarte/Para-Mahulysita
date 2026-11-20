"use strict";

/* ---------- Elementos ---------- */

const $ = id => document.getElementById(id);

const app = $("app");
const tablero = $("tablero");
const movsEl = $("movs");
const tiempoEl = $("tiempo");
const parejasEl = $("parejas");
const recordEl = $("record");
const mensajeEl = $("mensaje");
const overlay = $("overlay");
const ovTitulo = $("ovTitulo");
const ovTexto = $("ovTexto");
const ovEstrellas = $("ovEstrellas");
const ovBotones = $("ovBotones");
const btnReiniciar = $("btnReiniciar");

/* ---------- Configuración ---------- */

const TOTAL_FOTOS = 8;
const foto = i => `../img/juntos${i + 1}.jpeg`;

// Si una foto no carga, se muestra este emoji en su lugar
const EMOJIS_RESPALDO = ["💑", "🌹", "🍫", "🧸", "🌙", "🎁", "💍", "🌅"];

// Mensaje que se desbloquea al encontrar la pareja de cada foto (¡cámbialos por los tuyos!)
const FRASES = [
    "Contigo hasta el tiempo se detiene 💕",
    "Mi lugar favorito es a tu lado 🥰",
    "Cada día contigo es mi recuerdo preferido 💘",
    "Eres mi casualidad más bonita 🌹",
    "Tu sonrisa me arregla el día ✨",
    "Contigo todo es mejor, mi amor 🧸",
    "Qué suerte la mía de tenerte 💖",
    "Mi para siempre tiene tu nombre 💍"
];

/* ---------- Estado ---------- */

let pares = 8;
let primera = null;
let bloqueo = true;
let movs = 0;
let aciertos = 0;
let seg = 0;
let timer = null;
let empezo = false;
let msgTimer = null;
let peekTimer = null;

/* ---------- Utilidades ---------- */

function leerRecord(p) {
    try { return parseInt(localStorage.getItem("memoramaBest_" + p), 10) || 0; }
    catch (e) { return 0; }
}

function guardarRecord(p, v) {
    try { localStorage.setItem("memoramaBest_" + p, v); } catch (e) {}
}

function mezclar(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function formato(s) {
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function actualizarHUD() {
    movsEl.textContent = movs;
    tiempoEl.textContent = formato(seg);
    parejasEl.textContent = aciertos + "/" + pares;
    const r = leerRecord(pares);
    recordEl.textContent = r ? r : "-";
}

function mostrarMensaje(texto, ms) {
    clearTimeout(msgTimer);
    mensajeEl.textContent = texto;
    mensajeEl.classList.add("visible");
    msgTimer = setTimeout(() => mensajeEl.classList.remove("visible"), ms || 2500);
}

function vibrar(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

/* ---------- Efectos ---------- */

function chispasEn(elemento) {
    const a = app.getBoundingClientRect();
    const r = elemento.getBoundingClientRect();
    const x = r.left - a.left + r.width / 2;
    const y = r.top - a.top + r.height / 2;

    for (let i = 0; i < 6; i++) {
        const c = document.createElement("span");
        const ang = (i / 6) * Math.PI * 2 + Math.random() * 0.6;
        const dist = 45 + Math.random() * 35;
        c.className = "chispa";
        c.textContent = i % 2 ? "💖" : "✨";
        c.style.left = x + "px";
        c.style.top = y + "px";
        c.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        c.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        app.appendChild(c);
        setTimeout(() => c.remove(), 800);
    }
}

function lluvia() {
    const emojis = ["💖", "💕", "💗", "❤️", "💘", "✨"];
    for (let i = 0; i < 32; i++) {
        const c = document.createElement("span");
        c.className = "lluvia";
        c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        c.style.left = Math.random() * 100 + "%";
        c.style.fontSize = 18 + Math.random() * 24 + "px";
        c.style.animationDuration = 2.5 + Math.random() * 2.5 + "s";
        c.style.animationDelay = Math.random() * 1.5 + "s";
        app.appendChild(c);
        c.addEventListener("animationend", () => c.remove());
    }
}

/* ---------- Pantallas ---------- */

function mostrarOverlay(titulo, texto, estrellas, botones) {
    ovTitulo.textContent = titulo;
    ovTexto.textContent = texto;
    ovEstrellas.innerHTML = estrellas
        ? Array.from({ length: 3 }, (_, i) =>
            `<span class="est">${i < estrellas ? "⭐" : "☆"}</span>`).join("")
        : "";

    ovBotones.innerHTML = "";
    botones.forEach(b => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = b.t;
        btn.addEventListener("click", b.f);
        ovBotones.appendChild(btn);
    });

    const menu = document.createElement("a");
    menu.href = "minijuego.html";
    menu.textContent = "Menú de juegos";
    ovBotones.appendChild(menu);

    overlay.style.display = "flex";
}

function pantallaInicio() {
    clearInterval(timer);
    clearTimeout(peekTimer);
    bloqueo = true;
    mostrarOverlay(
        "📸 Memorama del amor",
        "Encuentra las parejas de nuestras fotos. Cada pareja desbloquea un mensaje para ti 💌",
        0,
        [
            { t: "Fácil · 6 parejas", f: () => iniciar(6) },
            { t: "Normal · 8 parejas", f: () => iniciar(8) }
        ]
    );
}

/* ---------- Cartas ---------- */

function crearCarta(id, indice) {
    const carta = document.createElement("button");
    carta.type = "button";
    carta.className = "carta";
    carta.dataset.id = id;
    carta.setAttribute("aria-label", "Carta tapada");
    carta.style.animationDelay = indice * 0.04 + "s";

    const interior = document.createElement("div");
    interior.className = "interior";

    const dorso = document.createElement("div");
    dorso.className = "cara dorso";
    dorso.textContent = "❤️";

    const frente = document.createElement("div");
    frente.className = "cara frente";

    const img = document.createElement("img");
    img.src = foto(id);
    img.alt = "Foto " + (id + 1);
    img.draggable = false;
    img.addEventListener("error", () => {
        frente.textContent = EMOJIS_RESPALDO[id];
        frente.classList.add("emoji");
    });
    frente.appendChild(img);

    interior.appendChild(dorso);
    interior.appendChild(frente);
    carta.appendChild(interior);
    return carta;
}

/* ---------- Juego ---------- */

function iniciar(n) {
    pares = n;
    clearInterval(timer);
    clearTimeout(peekTimer);
    primera = null;
    movs = 0;
    aciertos = 0;
    seg = 0;
    empezo = false;
    bloqueo = true;

    app.querySelectorAll(".lluvia, .chispa").forEach(e => e.remove());

    tablero.className = n === 6 ? "c3" : "c4";
    tablero.innerHTML = "";

    const ids = mezclar([...Array(TOTAL_FOTOS).keys()]).slice(0, n);
    const baraja = mezclar([...ids, ...ids]);
    baraja.forEach((id, i) => tablero.appendChild(crearCarta(id, i)));

    overlay.style.display = "none";
    actualizarHUD();

    // Vistazo rápido para memorizar
    mostrarMensaje("¡Memoriza! 👀", 1800);
    peekTimer = setTimeout(() => {
        tablero.querySelectorAll(".carta").forEach(c => c.classList.add("volteada"));
        peekTimer = setTimeout(() => {
            tablero.querySelectorAll(".carta").forEach(c => c.classList.remove("volteada"));
            bloqueo = false;
            mostrarMensaje("¡Tú puedes, mi amor! 💪", 1800);
        }, 1700);
    }, 500);
}

function empezarReloj() {
    empezo = true;
    timer = setInterval(() => {
        seg++;
        tiempoEl.textContent = formato(seg);
    }, 1000);
}

function elegir(carta) {
    if (bloqueo || carta.classList.contains("volteada") || carta.classList.contains("encontrada")) return;

    if (!empezo) empezarReloj();

    carta.classList.add("volteada");

    if (!primera) {
        primera = carta;
        return;
    }

    const segunda = carta;
    movs++;
    movsEl.textContent = movs;

    if (primera.dataset.id === segunda.dataset.id) {
        // ¡Pareja!
        const id = Number(segunda.dataset.id);
        const a = primera;
        primera = null;
        aciertos++;
        parejasEl.textContent = aciertos + "/" + pares;

        setTimeout(() => {
            a.classList.add("encontrada");
            segunda.classList.add("encontrada");
            chispasEn(a);
            chispasEn(segunda);
        }, 350);

        mostrarMensaje(FRASES[id], 3000);
        vibrar(40);

        if (aciertos === pares) ganar();
    } else {
        // No coinciden
        const a = primera;
        bloqueo = true;
        setTimeout(() => {
            a.classList.add("error");
            segunda.classList.add("error");
        }, 450);
        setTimeout(() => {
            a.classList.remove("volteada", "error");
            segunda.classList.remove("volteada", "error");
            primera = null;
            bloqueo = false;
        }, 1000);
    }
}

function ganar() {
    clearInterval(timer);
    bloqueo = true;

    const anterior = leerRecord(pares);
    const nuevoRecord = !anterior || movs < anterior;
    if (nuevoRecord) guardarRecord(pares, movs);
    actualizarHUD();

    let estrellas = 1;
    if (movs <= pares * 1.6) estrellas = 3;
    else if (movs <= pares * 2.4) estrellas = 2;

    setTimeout(() => {
        lluvia();
        vibrar([60, 40, 60]);
        mostrarOverlay(
            "💖 ¡Lo lograste! 💖",
            `Lo hiciste en ${movs} movimientos y ${formato(seg)}.` +
                (nuevoRecord ? " ¡Nuevo récord! 🏆" : "") +
                " ¡Te amo!",
            estrellas,
            [
                { t: "Jugar de nuevo", f: () => iniciar(pares) },
                { t: "Cambiar dificultad", f: pantallaInicio }
            ]
        );
    }, 1100);
}

/* ---------- Eventos ---------- */

tablero.addEventListener("click", e => {
    const carta = e.target.closest(".carta");
    if (carta) elegir(carta);
});

btnReiniciar.addEventListener("click", () => iniciar(pares));

document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInterval(timer);
    else if (empezo && aciertos < pares && overlay.style.display !== "flex") {
        clearInterval(timer);
        timer = setInterval(() => { seg++; tiempoEl.textContent = formato(seg); }, 1000);
    }
});

/* ---------- Arranque ---------- */

actualizarHUD();
pantallaInicio();
