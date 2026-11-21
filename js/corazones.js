"use strict";

/* ---------- Elementos ---------- */

const $ = id => document.getElementById(id);

const game = $("game");
const basket = $("basket");
const scoreText = $("score");
const livesText = $("lives");
const bestText = $("best");
const statusText = $("status");
const message = $("message");
const overlay = $("overlay");
const overlayTitle = $("overlayTitle");
const overlayText = $("overlayText");
const btnRestart = $("btnRestart");
const btnContinue = $("btnContinue");
const btnCambiar = $("btnCambiar");
const dificultadesBox = $("dificultades");
const menuBtn = $("menuBtn");
const musica = $("musica");
const musicBtn = $("musicBtn");
const volumeBox = $("volumeBox");
const volMute = $("volMute");
const volDown = $("volDown");
const volUp = $("volUp");
const volSlider = $("volSlider");
const volValue = $("volValue");

/* ---------- Configuración ---------- */

const WIN_SCORE = 100;
const HEART_SIZE = 40;
const PUNTOS_POR_NIVEL = 20;

// Con cuántos corazones seguidos sube el multiplicador (x2, x3, x4)
const COMBO_PASOS = [5, 10, 20];

// Dificultades:
//  vidas     -> vidas al empezar
//  vel       -> multiplicador de velocidad de caída
//  malo      -> probabilidad de que salga un 💔
//  intervalo -> milisegundos entre corazones al empezar
//  minimo    -> intervalo mínimo al ir subiendo el puntaje
//  paso      -> cuánto se acorta el intervalo por cada punto
const DIFICULTADES = {
    facil:   { nombre: "Fácil",   icono: "🌸", vidas: 5, vel: 0.8, malo: 0.08, intervalo: 1000, minimo: 450, paso: 8 },
    normal:  { nombre: "Normal",  icono: "💘", vidas: 3, vel: 1,   malo: 0.14, intervalo: 900,  minimo: 350, paso: 10 },
    dificil: { nombre: "Difícil", icono: "🔥", vidas: 2, vel: 1.3, malo: 0.22, intervalo: 750,  minimo: 280, paso: 12 }
};

const MENSAJES = {
    10: "¡Sigaaa asiii mi amorrr! ❤️",
    30: "¡Amorrr la que persevera alcanzaa! 🥰",
    40: "¡Amoorrr Le gusto el juego responda por WSP! 💘",
    60: "¡Ya casi lo logras bby! 🥹",
    75: "Amorrr Le debooo un heladitoo <3",
    100: "Amorrr Dioss que viciosaaa mami ;33"
};

const EMOJI_ITEM = {
    normal: "❤️", oro: "💖", malo: "💔",
    escudo: "🛡️", iman: "🧲", lento: "⏳", fiebre: "🌟"
};

const PODERES_ESPECIALES = ["escudo", "iman", "lento", "fiebre"];

// Cuánto dura cada poder (segundos)
const DURACION = { iman: 7, lento: 6, fiebre: 5 };

/* ---------- Estado ---------- */

let dificultad = "normal";
let cfg = DIFICULTADES.normal;
let maxVidas = cfg.vidas;

let estado = "inicio"; // inicio | jugando | pausa | fin
let score = 0;
let lives = maxVidas;
let combo = 0;
let nivel = 1;
let escudo = false;
const poder = { iman: 0, lento: 0, fiebre: 0 };
let firmaPoderes = "";
let basketX = 0;
let items = [];
let lastSpawn = 0;
let lastTime = 0;
let rafId = 0;
let continuando = false; // true si el jugador siguió jugando después de ganar
let msgTimer = null;
let best = 0;
let volumen = 60;        // 0 a 100
const keys = {};

try {
    const d = localStorage.getItem("amorDif");
    if (DIFICULTADES[d]) dificultad = d;
} catch (e) {}
try {
    const v = parseInt(localStorage.getItem("amorVol"), 10);
    if (!isNaN(v)) volumen = Math.max(0, Math.min(100, v));
} catch (e) {}

function leerBest(k) {
    try { return parseInt(localStorage.getItem("amorBest_" + k), 10) || 0; }
    catch (e) { return 0; }
}

function guardarBest() {
    try {
        localStorage.setItem("amorBest_" + dificultad, best);
        // récord general que se ve en el menú de juegos
        const general = parseInt(localStorage.getItem("amorBest"), 10) || 0;
        if (best > general) localStorage.setItem("amorBest", best);
    } catch (e) {}
}

function aplicarDificultad(k) {
    dificultad = k;
    cfg = DIFICULTADES[k];
    maxVidas = cfg.vidas;
    best = leerBest(k);
    try { localStorage.setItem("amorDif", k); } catch (e) {}
}

aplicarDificultad(dificultad);

/* ---------- Utilidades ---------- */

const ancho = () => game.clientWidth;
const alto = () => game.clientHeight;

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function multiplicador() {
    return 1 + COMBO_PASOS.filter(n => combo >= n).length;
}

function mostrarMensajeTemporal(texto) {
    clearTimeout(msgTimer);
    message.textContent = texto;
    message.style.display = "none";
    void message.offsetWidth; // reinicia la animación
    message.style.display = "block";
    msgTimer = setTimeout(() => {
        message.style.display = "none";
    }, 2500);
}

function actualizarHUD() {
    scoreText.textContent = "❤️ Amor: " + score + "  ·  Nv " + nivel;
    livesText.textContent = "💗".repeat(Math.max(0, lives)) + "🖤".repeat(Math.max(0, maxVidas - lives));
    bestText.textContent = "Récord " + cfg.icono + ": " + best;

    const partes = [];
    if (combo >= 2) partes.push("🔥 Combo " + combo + (multiplicador() > 1 ? " · x" + multiplicador() : ""));
    if (escudo) partes.push("🛡️");
    if (poder.iman > 0) partes.push("🧲 " + Math.ceil(poder.iman) + "s");
    if (poder.lento > 0) partes.push("⏳ " + Math.ceil(poder.lento) + "s");
    if (poder.fiebre > 0) partes.push("🌟 " + Math.ceil(poder.fiebre) + "s");
    statusText.textContent = partes.join("  ·  ");

    basket.classList.toggle("escudo", escudo);
    basket.classList.toggle("iman", poder.iman > 0);
    game.classList.toggle("lento", poder.lento > 0);
    game.classList.toggle("fiebre", poder.fiebre > 0);
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
    pop.style.left = clamp(x, 4, ancho() - 120) + "px";
    pop.style.top = y + "px";
    game.appendChild(pop);
    setTimeout(() => pop.remove(), 700);
}

function chispas(x, y, emoji) {
    const n = 6;
    for (let i = 0; i < n; i++) {
        const c = document.createElement("span");
        const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 40 + Math.random() * 35;
        c.className = "chispa";
        c.textContent = emoji;
        c.style.left = (x + HEART_SIZE / 2) + "px";
        c.style.top = (y + HEART_SIZE / 2) + "px";
        c.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        c.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        game.appendChild(c);
        setTimeout(() => c.remove(), 700);
    }
}

function sacudir() {
    game.classList.remove("shake");
    void game.offsetWidth;
    game.classList.add("shake");
    setTimeout(() => game.classList.remove("shake"), 350);
}

function rebotarCesta() {
    basket.classList.add("catch");
    setTimeout(() => basket.classList.remove("catch"), 150);
}

function pintarDificultades() {
    dificultadesBox.querySelectorAll("button").forEach(btn => {
        const k = btn.dataset.dif;
        const d = DIFICULTADES[k];
        const r = leerBest(k);
        btn.querySelector("small").textContent = d.vidas + " vidas" + (r ? " · 🏆 " + r : "");
        btn.classList.toggle("actual", k === dificultad);
    });
}

function mostrarOverlay(o) {
    overlayTitle.textContent = o.titulo;
    overlayText.textContent = o.texto;

    btnContinue.textContent = o.continuar || "";
    btnContinue.style.display = o.continuar ? "inline-flex" : "none";

    btnRestart.textContent = o.reiniciar || "";
    btnRestart.style.display = o.reiniciar ? "inline-flex" : "none";

    btnCambiar.style.display = o.cambiar ? "inline-flex" : "none";

    if (o.dificultades) pintarDificultades();
    dificultadesBox.style.display = o.dificultades ? "flex" : "none";

    volumeBox.style.display = o.volumen ? "flex" : "none";

    clearTimeout(msgTimer);
    message.style.display = "none";
    overlay.style.display = "flex";
}

/* ---------- Efectos de sonido (sin archivos) ---------- */

let sfxCtx = null;

function sfx(freq, dur, tipo, vol) {
    if (!sonidoOn || volumen === 0) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        sfxCtx = sfxCtx || new AC();
        if (sfxCtx.state === "suspended") sfxCtx.resume();

        const t = sfxCtx.currentTime;
        const o = sfxCtx.createOscillator();
        const g = sfxCtx.createGain();
        o.type = tipo || "sine";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime((vol || 0.15) * (volumen / 100), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(sfxCtx.destination);
        o.start(t);
        o.stop(t + dur);
    } catch (e) {}
}

const sonidoAtrapar = () => { sfx(660, 0.12, "sine"); setTimeout(() => sfx(880, 0.12, "sine"), 70); };
const sonidoOro = () => { sfx(784, 0.12, "triangle"); setTimeout(() => sfx(988, 0.12, "triangle"), 70); setTimeout(() => sfx(1318, 0.18, "triangle"), 140); };
const sonidoMalo = () => sfx(150, 0.3, "sawtooth", 0.2);
const sonidoEscudo = () => { sfx(500, 0.15, "square", 0.1); setTimeout(() => sfx(750, 0.2, "square", 0.1), 90); };
const sonidoBloqueo = () => sfx(300, 0.15, "square", 0.12);
const sonidoPoder = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => sfx(f, 0.14, "triangle", 0.14), i * 60)); };
const sonidoNivel = () => { [392, 523, 659].forEach((f, i) => setTimeout(() => sfx(f, 0.16, "sine", 0.16), i * 90)); };

/* ---------- Corazones ---------- */

function elegirTipo(soloBueno) {
    const r = Math.random();

    if (!soloBueno && score >= 5 && r < cfg.malo) return "malo";

    // 8% de probabilidad de poder especial (desde 8 puntos)
    if (!soloBueno && score >= 8 && r < cfg.malo + 0.08) {
        const opciones = ["iman", "lento", "fiebre"];
        if (!escudo) opciones.push("escudo", "escudo");
        return opciones[Math.floor(Math.random() * opciones.length)];
    }

    if (r > 0.93) return "oro";
    return "normal";
}

function crearItem(soloBueno) {
    const tipo = elegirTipo(soloBueno);

    const el = document.createElement("div");
    el.className = "heart";
    el.textContent = EMOJI_ITEM[tipo];

    const x = Math.random() * (ancho() - HEART_SIZE - 50) + 25;
    const y = -HEART_SIZE;

    // La velocidad se adapta al alto de la pantalla, a la dificultad y sube con el puntaje
    const escala = clamp(alto() / 700, 0.8, 1.4);
    const vy = (180 + Math.random() * 160 + Math.min(score, 80) * 4) * escala * cfg.vel;

    // Pequeño vaivén lateral
    const fase = Math.random() * Math.PI * 2;
    const amp = 8 + Math.random() * 14;

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    game.appendChild(el);

    items.push({ el, x, xd: x, y, vy, tipo, fase, amp });
}

function subirNivel() {
    const nuevo = 1 + Math.floor(score / PUNTOS_POR_NIVEL);
    if (nuevo > nivel) {
        nivel = nuevo;
        efectoPop(ancho() / 2 - 55, alto() * 0.3, "⬆️ Nivel " + nivel);
        sonidoNivel();
    }
}

function activarPoder(item) {
    const x = item.xd;
    const y = item.y;
    chispas(x, y, "✨");
    sonidoPoder();

    if (item.tipo === "escudo") {
        escudo = true;
        efectoPop(x, y, "🛡️ Escudo");
        sonidoEscudo();
    } else if (item.tipo === "iman") {
        poder.iman = DURACION.iman;
        efectoPop(x, y, "🧲 ¡Imán!");
    } else if (item.tipo === "lento") {
        poder.lento = DURACION.lento;
        efectoPop(x, y, "⏳ Cámara lenta");
    } else if (item.tipo === "fiebre") {
        poder.fiebre = DURACION.fiebre;
        efectoPop(x, y, "🌟 ¡Fiebre de amor!");
    }
}

function atrapar(item) {
    const x = item.xd;
    const y = item.y;
    rebotarCesta();

    if (item.tipo === "malo") {
        if (escudo) {
            escudo = false;
            efectoPop(x, y, "🛡️ ¡Bloqueado!");
            sonidoBloqueo();
        } else {
            lives--;
            combo = 0;
            efectoPop(x, y, "💔");
            basket.classList.add("hit");
            setTimeout(() => basket.classList.remove("hit"), 250);
            sacudir();
            sonidoMalo();
            if (navigator.vibrate) navigator.vibrate(60);
            if (lives <= 0) {
                actualizarHUD();
                terminar(false);
                return;
            }
        }
    } else if (PODERES_ESPECIALES.includes(item.tipo)) {
        activarPoder(item);
    } else {
        combo++;
        const base = item.tipo === "oro" ? 3 : 1;
        const puntos = base * multiplicador();
        const anterior = score;
        score += puntos;

        efectoPop(x, y, "+" + puntos);
        chispas(x, y, item.tipo === "oro" ? "⭐" : "💕");
        if (item.tipo === "oro") sonidoOro(); else sonidoAtrapar();

        // Aviso al subir el multiplicador del combo
        if (COMBO_PASOS.includes(combo)) {
            efectoPop(basketX - 40, alto() - 190, "🔥 Combo x" + multiplicador());
        }

        // Mensajes por hitos (funciona aunque el puntaje salte)
        for (const hito in MENSAJES) {
            if (anterior < Number(hito) && score >= Number(hito)) mostrarMensajeTemporal(MENSAJES[hito]);
        }

        if (score > best) {
            best = score;
            guardarBest();
        }

        subirNivel();

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

function actualizarPoderes(dt) {
    let cambio = false;

    for (const k in poder) {
        if (poder[k] > 0) {
            poder[k] -= dt;
            if (poder[k] <= 0) {
                poder[k] = 0;
                cambio = true;
            }
        }
    }

    // Refresca el marcador solo cuando cambia el segundo que se muestra
    const firma = Math.ceil(poder.iman) + "-" + Math.ceil(poder.lento) + "-" + Math.ceil(poder.fiebre);
    if (firma !== firmaPoderes) {
        firmaPoderes = firma;
        cambio = true;
    }

    if (cambio) actualizarHUD();
}

function loop(now) {
    if (estado !== "jugando") return;
    rafId = requestAnimationFrame(loop);

    const dt = clamp((now - lastTime) / 1000, 0, 0.05);
    lastTime = now;

    actualizarPoderes(dt);

    // Movimiento con teclado (escritorio)
    if (keys.ArrowLeft || keys.a) moverCesta(basketX - 700 * dt);
    if (keys.ArrowRight || keys.d) moverCesta(basketX + 700 * dt);

    // Aparición de corazones: cada vez más rápido (y muchísimo en la fiebre)
    const fiebre = poder.fiebre > 0;
    const intervalo = fiebre ? 140 : Math.max(cfg.minimo, cfg.intervalo - score * cfg.paso);
    if (now - lastSpawn > intervalo) {
        crearItem(fiebre);
        lastSpawn = now;
    }

    const g = game.getBoundingClientRect();
    const c = basket.getBoundingClientRect();
    const cesta = {
        left: c.left - g.left,
        right: c.right - g.left,
        top: c.top - g.top,
        bottom: c.bottom - g.top
    };
    const altura = alto();
    const factor = poder.lento > 0 ? 0.45 : 1;

    for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt * factor;

        // El imán atrae los corazones buenos hacia la cesta
        if (poder.iman > 0 && it.tipo !== "malo") {
            it.x += (basketX - HEART_SIZE / 2 - it.x) * clamp(dt * 2.6, 0, 1);
        }

        it.xd = it.x + Math.sin(it.y / 55 + it.fase) * it.amp;
        it.el.style.transform = `translate3d(${it.xd}px, ${it.y}px, 0)`;

        const fondo = it.y + HEART_SIZE;
        const choca =
            fondo >= cesta.top &&
            it.y <= cesta.bottom &&
            it.xd + HEART_SIZE > cesta.left &&
            it.xd < cesta.right;

        if (choca) {
            it.el.remove();
            items.splice(i, 1);
            atrapar(it);
            if (estado !== "jugando") return;
        } else if (it.y > altura) {
            it.el.remove();
            items.splice(i, 1);
            // Dejar caer un corazón bueno rompe el combo
            if ((it.tipo === "normal" || it.tipo === "oro") && combo > 0) {
                combo = 0;
                actualizarHUD();
            }
        }
    }
}

/* ---------- Estado del juego ---------- */

function limpiarPantalla() {
    items.forEach(it => it.el.remove());
    items = [];
    game.querySelectorAll(".pop, .chispa").forEach(p => p.remove());
}

function iniciar() {
    limpiarPantalla();
    score = 0;
    maxVidas = cfg.vidas;
    lives = maxVidas;
    combo = 0;
    nivel = 1;
    escudo = false;
    poder.iman = poder.lento = poder.fiebre = 0;
    firmaPoderes = "";
    continuando = false;
    estado = "jugando";
    overlay.style.display = "none";
    message.style.display = "none";
    moverCesta(ancho() / 2);
    actualizarHUD();
    arrancarLoop();
}

function mostrarInicio() {
    cancelAnimationFrame(rafId);
    limpiarPantalla();
    estado = "inicio";
    score = 0;
    combo = 0;
    nivel = 1;
    escudo = false;
    poder.iman = poder.lento = poder.fiebre = 0;
    lives = maxVidas;
    actualizarHUD();

    mostrarOverlay({
        titulo: "💘 Atrapa los corazones",
        texto: "Desliza el dedo para mover la cesta. Esquiva los 💔 y atrapa poderes: 🛡️ escudo, 🧲 imán, ⏳ cámara lenta y 🌟 fiebre de amor. ¡Elige tu dificultad!",
        dificultades: true,
        volumen: true
    });
}

function elegirDificultad(k) {
    primeraVez();
    aplicarDificultad(k);
    iniciar();
}

function terminar(gano) {
    estado = "fin";
    cancelAnimationFrame(rafId);
    if (gano) {
        continuando = true;
        const extra = dificultad === "dificil" ? " ¡Y en modo Difícil! 🔥" : "";
        mostrarOverlay({
            titulo: "💖 ¡Ganaste mi corazón! 💖",
            texto: "¡Te amo muchísimo! Atrapaste " + score + " corazones en modo " + cfg.nombre + "." + extra,
            continuar: "Seguir jugando",
            reiniciar: "Jugar de nuevo",
            cambiar: true
        });
    } else {
        mostrarOverlay({
            titulo: "💔 Se acabaron las vidas",
            texto: "Lograste " + score + " puntos de amor en modo " + cfg.nombre + ". ¡Inténtalo otra vez!",
            reiniciar: "Jugar de nuevo",
            cambiar: true
        });
    }
}

function pausar() {
    if (estado !== "jugando") return;
    estado = "pausa";
    cancelAnimationFrame(rafId);
    mostrarOverlay({
        titulo: "☰ Menú",
        texto: "El juego está en pausa. Dificultad: " + cfg.icono + " " + cfg.nombre,
        continuar: "Continuar",
        reiniciar: "Reiniciar",
        cambiar: true,
        volumen: true
    });
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

/* ---------- Música y volumen ---------- */

let sonidoOn = false;        // true si el jugador quiere sonido (música y efectos)
let sonidoIntentado = false; // para arrancar la música solo con un toque del jugador

// En iPhone/iPad el volumen del <audio> no se puede cambiar (siempre es 1).
// En ese caso usamos Web Audio con un "gain" para que la barra sí funcione.
const usaGain = (() => {
    try {
        const original = musica.volume;
        musica.volume = 0.5;
        const ok = Math.abs(musica.volume - 0.5) < 0.01;
        musica.volume = original;
        return !ok;
    } catch (e) {
        return true;
    }
})();

let audioCtx = null;
let gainNode = null;

function prepararGain() {
    if (!usaGain || gainNode) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        const fuente = audioCtx.createMediaElementSource(musica);
        gainNode = audioCtx.createGain();
        fuente.connect(gainNode);
        gainNode.connect(audioCtx.destination);
    } catch (e) {
        gainNode = null;
    }
}

function aplicarVolumen() {
    const v = volumen / 100;
    if (gainNode) gainNode.gain.value = v;
    else musica.volume = v;
    volSlider.value = volumen;
    volValue.textContent = volumen + "%";
    try { localStorage.setItem("amorVol", volumen); } catch (e) {}
}

function actualizarAudioUI() {
    const sonando = sonidoOn && volumen > 0;
    musicBtn.textContent = sonidoOn ? "🎵" : "🔇";
    musicBtn.setAttribute("aria-pressed", String(sonidoOn));
    volMute.textContent = sonando ? "🔊" : "🔇";
}

function reproducir() {
    prepararGain();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    const p = musica.play();
    if (p && p.catch) p.catch(() => {});
}

function cambiarVolumen(v) {
    volumen = clamp(Math.round(Number(v)), 0, 100);
    if (volumen > 0 && !sonidoOn && sonidoIntentado) {
        sonidoOn = true;
        reproducir();
    }
    aplicarVolumen();
    actualizarAudioUI();
}

function alternarSonido() {
    sonidoOn = !sonidoOn;
    sonidoIntentado = true;
    if (sonidoOn) {
        if (volumen === 0) volumen = 40;
        aplicarVolumen();
        reproducir();
    } else {
        musica.pause();
    }
    actualizarAudioUI();
}

function primeraVez() {
    if (sonidoIntentado) return;
    sonidoIntentado = true;
    sonidoOn = true;
    aplicarVolumen();
    reproducir();
    actualizarAudioUI();
}

/* ---------- Eventos ---------- */

function seguirPuntero(e) {
    if (estado === "jugando") {
        moverCesta(e.clientX - game.getBoundingClientRect().left);
    }
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
    } else if (sonidoOn) {
        reproducir();
    }
});

window.addEventListener("resize", () => moverCesta(basketX || ancho() / 2));

dificultadesBox.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => elegirDificultad(btn.dataset.dif));
});

btnRestart.addEventListener("click", () => {
    primeraVez();
    iniciar();
});
btnContinue.addEventListener("click", reanudar);
btnCambiar.addEventListener("click", mostrarInicio);
menuBtn.addEventListener("click", alternarPausa);
musicBtn.addEventListener("click", alternarSonido);

volSlider.addEventListener("input", () => cambiarVolumen(volSlider.value));
volDown.addEventListener("click", () => cambiarVolumen(volumen - 10));
volUp.addEventListener("click", () => cambiarVolumen(volumen + 10));
volMute.addEventListener("click", alternarSonido);

// Si la imagen de la cesta no carga (ruta mal), usa un emoji para que el juego siga funcionando
function usarCestaEmoji() {
    basket.classList.add("emoji");
    basket.textContent = "🧺";
}
const imgCesta = basket.querySelector("img");
if (imgCesta) {
    imgCesta.addEventListener("error", usarCestaEmoji);
    if (imgCesta.complete && imgCesta.naturalWidth === 0) usarCestaEmoji();
}

/* ---------- Arranque ---------- */

aplicarVolumen();
actualizarAudioUI();
moverCesta(ancho() / 2);
mostrarInicio();
