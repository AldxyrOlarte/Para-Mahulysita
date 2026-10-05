"use strict";

/* ---------- Elementos ---------- */

const $ = id => document.getElementById(id);

const game = $("game");
const basket = $("basket");
const scoreText = $("score");
const livesText = $("lives");
const bestText = $("best");
const message = $("message");
const overlay = $("overlay");
const overlayTitle = $("overlayTitle");
const overlayText = $("overlayText");
const btnRestart = $("btnRestart");
const btnContinue = $("btnContinue");
const pauseBtn = $("pauseBtn");
const musica = $("musica");
const musicBtn = $("musicBtn");

/* ---------- Configuración ---------- */

const MAX_LIVES = 3;
const WIN_SCORE = 100;
const HEART_SIZE = 40;

const MENSAJES = {
    10: "¡Sigaaa asiii mi amorrr! ❤️",
    30: "¡Amorrr la que persevera alcanzaa! 🥰",
    40: "¡Amoorrr Le gusto el juego responda por WSP! 💘",
    60: "¡Ya casi lo logras bby! 🥹",
    75: "Amorrr Le debooo un heladitoo <3",
    100: "Amorrr Dioss que viciosaaa mami ;33"
};

/* ---------- Estado ---------- */

let estado = "inicio"; // inicio | jugando | pausa | fin
let score = 0;
let lives = MAX_LIVES;
let basketX = 0;
let items = [];          // ¡antes estaba sin inicializar y rompía iniciar()!
let lastSpawn = 0;
let lastTime = 0;
let rafId = 0;
let continuando = false; // true si el jugador siguió jugando después de ganar
let msgTimer = null;
let best = 0;
const keys = {};

try { best = parseInt(localStorage.getItem("amorBest"), 10) || 0; } catch (e) {}

/* ---------- Utilidades ---------- */

const ancho = () => game.clientWidth;
const alto = () => game.clientHeight;

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function mostrarMensajeTemporal(texto) {
    clearTimeout(msgTimer);
    message.textContent = texto;
    // reinicia la animación aunque ya hubiera un mensaje visible
    message.style.display = "none";
    void message.offsetWidth;
    message.style.display = "block";
    msgTimer = setTimeout(() => {
        message.style.display = "none";
    }, 2500);
}

function actualizarHUD() {
    scoreText.textContent = "❤️ Amor: " + score;
    livesText.textContent = "💗".repeat(lives) + "🖤".repeat(MAX_LIVES - lives);
    bestText.textContent = "Récord: " + best;
}

function moverCesta(x) {
    const mitad = (basket.offsetWidth || 90) / 2;
    basketX = clamp(x, mitad, ancho() - mitad);
    basket.style.left = basketX + "px";
}

function efectoPop(x, y, texto) {
    const pop = document.createElement("div");
    pop.className = "pop";
    pop.textContent = texto;
    pop.style.left = x + "px";
    pop.style.top = y + "px";
    game.appendChild(pop);
    setTimeout(() => pop.remove(), 700);
}

function mostrarOverlay(titulo, texto, textoContinuar, textoReiniciar) {
    overlayTitle.textContent = titulo;
    overlayText.textContent = texto;
    btnContinue.textContent = textoContinuar || "";
    btnContinue.style.display = textoContinuar ? "inline-block" : "none";
    btnRestart.textContent = textoReiniciar;
    overlay.style.display = "flex";
}

/* ---------- Corazones ---------- */

function crearItem() {
    // 15% corazón roto (quita vida, solo después de 5 puntos), 8% corazón dorado (vale 3)
    let tipo = "normal";
    const r = Math.random();
    if (score >= 5 && r < 0.15) tipo = "malo";
    else if (r > 0.92) tipo = "oro";

    const el = document.createElement("div");
    el.className = "heart";
    el.textContent = tipo === "malo" ? "💔" : tipo === "oro" ? "💖" : "❤️";

    const x = Math.random() * (ancho() - HEART_SIZE - 10) + 5;
    const y = -HEART_SIZE;

    // La velocidad se adapta al alto de la pantalla y sube con el puntaje (con tope)
    const escala = clamp(alto() / 700, 0.8, 1.4);
    const vy = (180 + Math.random() * 160 + Math.min(score, 80) * 4) * escala;

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    game.appendChild(el);

    items.push({ el, x, y, vy, tipo });
}

function atrapar(item) {
    if (item.tipo === "malo") {
        lives--;
        efectoPop(item.x, item.y, "💔");
        basket.classList.add("hit");
        setTimeout(() => basket.classList.remove("hit"), 250);
        if (navigator.vibrate) navigator.vibrate(60);
        if (lives <= 0) {
            actualizarHUD();
            terminar(false);
            return;
        }
    } else {
        const puntos = item.tipo === "oro" ? 3 : 1;
        const anterior = score;
        score += puntos;
        efectoPop(item.x, item.y, "+" + puntos);

        // Mensajes por hitos (funciona aunque el puntaje salte por el corazón dorado)
        for (const hito in MENSAJES) {
            if (anterior < hito && score >= hito) mostrarMensajeTemporal(MENSAJES[hito]);
        }

        if (score > best) {
            best = score;
            try { localStorage.setItem("amorBest", best); } catch (e) {}
        }

        if (score >= WIN_SCORE && !continuando) {
            actualizarHUD();
            terminar(true);
            return;
        }
    }
    actualizarHUD();
}

/* ---------- Bucle principal ---------- */

function arrancarLoop() {
    cancelAnimationFrame(rafId);
    lastTime = performance.now();
    lastSpawn = lastTime;
    rafId = requestAnimationFrame(loop);
}

function loop(now) {
    if (estado !== "jugando") return;
    rafId = requestAnimationFrame(loop);

    const dt = clamp((now - lastTime) / 1000, 0, 0.05); // evita saltos al volver a la pestaña
    lastTime = now;

    // Movimiento con teclado (escritorio)
    if (keys.ArrowLeft || keys.a) moverCesta(basketX - 700 * dt);
    if (keys.ArrowRight || keys.d) moverCesta(basketX + 700 * dt);

    // Aparición de corazones: cada vez más rápido
    const intervalo = Math.max(350, 900 - score * 10);
    if (now - lastSpawn > intervalo) {
        crearItem();
        lastSpawn = now;
    }

    const cesta = basket.getBoundingClientRect();
    const altura = alto();

    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt;
        it.el.style.transform = `translate3d(${it.x}px, ${it.y}px, 0)`;

        const fondo = it.y + HEART_SIZE;
        const choca =
            fondo >= cesta.top &&
            it.y <= cesta.bottom &&
            it.x + HEART_SIZE > cesta.left &&
            it.x < cesta.right;

        if (choca) {
            it.el.remove();
            items.splice(i, 1);
            atrapar(it);
            if (estado !== "jugando") return;
        } else if (it.y > altura) {
            it.el.remove();
            items.splice(i, 1);
        }
    }
}

/* ---------- Estado del juego ---------- */

function iniciar() {
    items.forEach(it => it.el.remove());
    items = [];
    game.querySelectorAll(".pop").forEach(p => p.remove());
    score = 0;
    lives = MAX_LIVES;
    continuando = false;
    estado = "jugando";
    overlay.style.display = "none";
    message.style.display = "none";
    moverCesta(ancho() / 2);
    actualizarHUD();
    arrancarLoop();
}

function terminar(gano) {
    estado = "fin";
    cancelAnimationFrame(rafId);
    if (gano) {
        continuando = true; // permite elegir "Seguir jugando" sin volver a ganar
        mostrarOverlay(
            "💖 ¡Ganaste mi corazón! 💖",
            "¡Te amo muchísimo! Atrapaste " + score + " corazones.",
            "Seguir jugando",
            "Jugar de nuevo"
        );
    } else {
        mostrarOverlay(
            "💔 Se acabaron las vidas",
            "Lograste " + score + " puntos de amor. ¡Inténtalo otra vez!",
            "",
            "Jugar de nuevo"
        );
    }
}

function pausar() {
    if (estado !== "jugando") return;
    estado = "pausa";
    cancelAnimationFrame(rafId);
    mostrarOverlay("⏸ Pausa", "Toca Continuar para seguir atrapando corazones.", "Continuar", "Reiniciar");
}

function reanudar() {
    if (estado === "pausa" || (estado === "fin" && continuando)) {
        estado = "jugando";
        overlay.style.display = "none";
        arrancarLoop();
    }
}

function alternarPausa() {
    if (estado === "jugando") pausar();
    else if (estado === "pausa") reanudar();
}

/* ---------- Música ---------- */

let musicaOn = false;        // true si el jugador quiere música
let musicaIntentada = false; // para arrancarla solo con el primer toque

function actualizarBotonMusica() {
    musicBtn.textContent = musicaOn ? "🎵" : "🔇";
    musicBtn.setAttribute("aria-pressed", String(musicaOn));
}

function reproducir() {
    const p = musica.play();
    if (p && p.catch) {
        p.catch(() => {
            musicaOn = false;
            actualizarBotonMusica();
        });
    }
}

function alternarMusica() {
    musicaOn = !musicaOn;
    if (musicaOn) reproducir();
    else musica.pause();
    actualizarBotonMusica();
}

function primeraMusica() {
    if (musicaIntentada) return;
    musicaIntentada = true;
    musica.volume = 0.6;
    musicaOn = true;
    reproducir();
    actualizarBotonMusica();
}

/* ---------- Eventos ---------- */

// Un solo manejador para dedo y mouse (Pointer Events)
function seguirPuntero(e) {
    if (estado === "jugando") moverCesta(e.clientX);
}
game.addEventListener("pointerdown", seguirPuntero);
game.addEventListener("pointermove", seguirPuntero);

document.addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = true;
    if (k === "p" || k === "Escape") alternarPausa();
});
document.addEventListener("keyup", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = false;
});

// Pausa automática si sales de la pestaña o apagas la pantalla
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        pausar();
        musica.pause();
    } else if (musicaOn) {
        reproducir();
    }
});

// Recolocar la cesta si cambia el tamaño o la orientación
window.addEventListener("resize", () => moverCesta(basketX || ancho() / 2));

btnRestart.addEventListener("click", () => {
    primeraMusica();
    iniciar();
});
btnContinue.addEventListener("click", reanudar);
pauseBtn.addEventListener("click", alternarPausa);
musicBtn.addEventListener("click", alternarMusica);

// Si la imagen de la cesta no carga (ruta mal), usa un emoji para que el juego siga funcionando
const imgCesta = basket.querySelector("img");
if (imgCesta) {
    imgCesta.addEventListener("error", () => {
        basket.classList.add("emoji");
        basket.textContent = "🧺";
    });
}

/* ---------- Arranque ---------- */

actualizarBotonMusica();
actualizarHUD();
moverCesta(ancho() / 2);
mostrarOverlay(
    "💘 Atrapa los corazones",
    "Desliza el dedo para mover la cesta. ¡Cuidado con los 💔!",
    "",
    "Jugar"
);
