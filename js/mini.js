const basket = document.getElementById("basket");
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");
const bestText = document.getElementById("best");
const message = document.getElementById("message");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const btnRestart = document.getElementById("btnRestart");
const btnContinue = document.getElementById("btnContinue");
const musica = document.getElementById("musica");
const musicBtn = document.getElementById("musicBtn");

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

let score, lives, basketX, items, lastSpawn, lastTime;
let running = false;
let paused = false;
let continuando = false; // true si el jugador siguió jugando después de ganar
let msgTimer = null;
let best = 0;
const keys = {};

try { best = parseInt(localStorage.getItem("amorBest")) || 0; } catch (e) {}

/* ---------- Utilidades ---------- */

function mostrarMensajeTemporal(texto) {
    clearTimeout(msgTimer);
    message.innerHTML = texto;
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

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function moverCesta(x) {
    const mitad = basket.offsetWidth / 2;
    basketX = clamp(x, mitad, window.innerWidth - mitad);
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

    const x = Math.random() * (window.innerWidth - HEART_SIZE - 10) + 5;
    const y = -HEART_SIZE;
    const vy = 180 + Math.random() * 160 + score * 4; // píxeles por segundo, sube con el puntaje

    el.style.left = x + "px";
    el.style.transform = `translateY(${y}px)`;
    game.appendChild(el);

    items.push({ el, x, y, vy, tipo });
}

function atrapar(item) {
    if (item.tipo === "malo") {
        lives--;
        efectoPop(item.x, item.y, "💔");
        basket.classList.add("hit");
        setTimeout(() => basket.classList.remove("hit"), 250);
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

function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);

    if (paused) { lastTime = now; return; }

    const dt = Math.min((now - lastTime) / 1000, 0.05); // evita saltos al volver a la pestaña
    lastTime = now;

    // Movimiento con teclado
    if (keys.ArrowLeft || keys.a) moverCesta(basketX - 700 * dt);
    if (keys.ArrowRight || keys.d) moverCesta(basketX + 700 * dt);

    // Aparición de corazones: cada vez más rápido
    const intervalo = Math.max(350, 900 - score * 10);
    if (now - lastSpawn > intervalo) {
        crearItem();
        lastSpawn = now;
    }

    const cesta = basket.getBoundingClientRect();
    const alto = window.innerHeight;

    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt;
        it.el.style.transform = `translateY(${it.y}px)`;

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
            if (!running) return;
        } else if (it.y > alto) {
            it.el.remove();
            items.splice(i, 1);
        }
    }
}

/* ---------- Estado del juego ---------- */

function iniciar() {
    items.forEach(it => it.el.remove());
    items = [];
    score = 0;
    lives = MAX_LIVES;
    continuando = false;
    running = true;
    paused = false;
    overlay.style.display = "none";
    message.style.display = "none";
    moverCesta(window.innerWidth / 2);
    actualizarHUD();
    lastTime = performance.now();
    lastSpawn = lastTime;
    requestAnimationFrame(loop);
}

function terminar(gano) {
    running = false;
    if (gano) {
        overlayTitle.textContent = "💖 ¡Ganaste mi corazón! 💖";
        overlayText.textContent = "¡Te amo muchísimo! Atrapaste " + score + " corazones.";
        btnContinue.style.display = "inline-block";
    } else {
        overlayTitle.textContent = "💔 Se acabaron las vidas";
        overlayText.textContent = "Lograste " + score + " puntos de amor. ¡Inténtalo otra vez!";
        btnContinue.style.display = "none";
    }
    overlay.style.display = "flex";
}

function seguirJugando() {
    continuando = true;
    running = true;
    overlay.style.display = "none";
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

/* ---------- Eventos ---------- */

document.addEventListener("mousemove", e => moverCesta(e.clientX));

document.addEventListener("touchmove", e => {
    moverCesta(e.touches[0].clientX);
    e.preventDefault();
}, { passive: false });

document.addEventListener("keydown", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = true;
    if (k === "p" || k === "Escape") paused = !paused;
});
document.addEventListener("keyup", e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys[k] = false;
});

// Pausa automática si cambias de pestaña
document.addEventListener("visibilitychange", () => {
    if (document.hidden) paused = true;
});

// Recolocar la cesta si cambia el tamaño de la ventana
window.addEventListener("resize", () => moverCesta(basketX));

btnRestart.addEventListener("click", iniciar);
btnContinue.addEventListener("click", seguirJugando);

/* ---------- Música ---------- */

let musicaActiva = false;

function actualizarBotonMusica() {
    musicBtn.textContent = musicaActiva ? "🎵 Música: ON" : "🔇 Música: OFF";
}

function iniciarMusica() {
    musica.play().then(() => {
        musicaActiva = true;
        actualizarBotonMusica();
    }).catch(() => {});
}

// Los navegadores bloquean el autoplay: arrancamos con la primera interacción
document.addEventListener("click", iniciarMusica, { once: true });
document.addEventListener("touchstart", iniciarMusica, { once: true });

musicBtn.addEventListener("click", e => {
    e.stopPropagation();
    if (musicaActiva) {
        musica.pause();
        musicaActiva = false;
    } else {
        musica.play().catch(() => {});
        musicaActiva = true;
    }
    actualizarBotonMusica();
});

actualizarBotonMusica();
iniciar();
