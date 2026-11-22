"use strict";

/* =====================================================
   RESCÁTAME 🔒💖
   Ella cruza 3 niveles llenos de obstáculos, consigue la
   llave y libera a su amor de la jaula.
   ===================================================== */

/* ---------- Personaliza aquí ---------- */

const ICONO_ELLA = "👱🏻‍♀️";   // cámbialo por el emoji que más se parezca a ella (👧 👸 💃 ...)
const ICONO_EL = "🧑🏽";     // y el tuyo (👦 🧔 🤴 ...)
const MENSAJE_FINAL = "Sabía que llegarías hasta mí, mi amor. mis rizitoss de oroo de estuve esperandoo";

/* ---------- Constantes del juego ---------- */

let W = 640;              // ancho lógico de la pantalla (cambia en vertical)
const H = 360;            // alto lógico
const T = 32;             // tamaño de cada bloque
const SUELO = 9;          // fila donde empieza el suelo

const GRAV = 1500;
const VEL = 195;
const SALTO = -570;
const RESORTE = -840;
const PW = 22;            // ancho de ella
const PH = 34;            // alto de ella

/* ---------- Elementos ---------- */

const $ = id => document.getElementById(id);

const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d");
const pantalla = $("pantalla");
const avisoEl = $("aviso");
const overlay = $("overlay");
const ovTitulo = $("ovTitulo");
const ovTexto = $("ovTexto");
const ovBotones = $("ovBotones");
const nivelTxt = $("nivelTxt");
const corazonesTxt = $("corazonesTxt");
const caidasTxt = $("caidasTxt");
const llaveTxt = $("llaveTxt");
const btnPausa = $("btnPausa");
const btnSonido = $("btnSonido");

/* ---------- Diseño de los niveles ---------- */

// Ayudantes para colocar corazones
const linea = (x, y, n) => Array.from({ length: n }, (_, i) => [x + i, y]);
const arco = (x, n, y, alto) => Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return [x + i, y - Math.sin(t * Math.PI) * alto];
});

/*  Medidas en bloques (1 bloque = 32 px). El suelo empieza en la fila 9.
    suelo: tramos [desde, hasta]; los huecos entre tramos son abismos.
    plataformas: y = fila; se pueden atravesar desde abajo.
    moviles: plataformas que van de un lado a otro.
    pinchos: x y ancho en bloques, sobre el suelo.
    enemigos: caminan entre min y max (se les pisa desde arriba).
    murcielagos: vuelan de arriba abajo, no se pueden pisar.         */
const NIVELES = [
    {
        nombre: "El jardín 🌸", tema: "jardin", ancho: 72,
        suelo: [[0, 14], [17, 30], [33, 48], [51, 72]],
        plataformas: [{ x: 21, y: 7, w: 3 }, { x: 40, y: 7, w: 3 }, { x: 55, y: 7, w: 3 }],
        moviles: [],
        pinchos: [{ x: 8, w: 1 }, { x: 36, w: 2 }, { x: 58, w: 1 }, { x: 62, w: 2 }],
        enemigos: [
            { x: 24, min: 22, max: 29, e: "🐛" },
            { x: 43, min: 40, max: 46, e: "🐛" },
            { x: 66, min: 64.5, max: 68.5, e: "🐛" }
        ],
        murcielagos: [],
        resortes: [],
        corazones: [
            ...arco(13, 5, 7.4, 2.2), ...linea(21, 6.2, 3),
            ...arco(29, 5, 7.4, 2.2), ...linea(40, 6.2, 3),
            ...arco(47, 5, 7.4, 2.2), ...linea(55, 6.2, 3)
        ],
        checkpoints: [33],
        meta: 70
    },
    {
        nombre: "La cueva 🦇", tema: "cueva", ancho: 86,
        suelo: [[0, 10], [13, 22], [25, 34], [37, 44], [54, 86]],
        plataformas: [{ x: 72, y: 7, w: 6 }],
        moviles: [{ x: 44, min: 44, max: 51, w: 3, vel: 55 }],
        pinchos: [
            { x: 5, w: 2 }, { x: 17, w: 1 }, { x: 40, w: 1 }, { x: 58, w: 2 },
            { x: 64, w: 1 }, { x: 69, w: 1 }, { x: 73, w: 5 }
        ],
        enemigos: [
            { x: 28, min: 26.5, max: 32.5, e: "🕷️" },
            { x: 80, min: 79, max: 83, e: "🕷️" }
        ],
        murcielagos: [
            { x: 19, y: 4.9, amp: 1 }, { x: 31, y: 4.9, amp: 1 },
            { x: 48, y: 4.9, amp: 1.1 }, { x: 62, y: 4.9, amp: 1 }, { x: 76, y: 4.4, amp: 1 }
        ],
        resortes: [],
        corazones: [
            ...arco(10, 4, 7.4, 2), ...arco(22, 4, 7.4, 2), ...arco(34, 4, 7.4, 2),
            ...linea(46, 7, 6), ...linea(72, 6, 6), ...linea(66, 7.5, 2)
        ],
        checkpoints: [25, 54],
        meta: 84
    },
    {
        nombre: "El castillo 🏰", tema: "castillo", ancho: 94,
        suelo: [[0, 12], [15, 24], [27, 36], [46, 62], [65, 94]],
        plataformas: [
            { x: 50, y: 7, w: 3 }, { x: 56, y: 3, w: 5 }, { x: 69, y: 7, w: 2 },
            { x: 80, y: 7, w: 2 }, { x: 83, y: 5, w: 4 }
        ],
        moviles: [{ x: 36, min: 36, max: 43, w: 3, vel: 70 }],
        pinchos: [
            { x: 7, w: 2 }, { x: 18, w: 1 }, { x: 30, w: 2 },
            { x: 48, w: 2 }, { x: 69, w: 2 }, { x: 77, w: 1 }
        ],
        enemigos: [
            { x: 52, min: 50.5, max: 55, e: "🧟" },
            { x: 73, min: 72, max: 75.5, e: "👻" }
        ],
        murcielagos: [
            { x: 21, y: 4.9, amp: 1 }, { x: 40, y: 4.6, amp: 1.2 },
            { x: 66, y: 4.9, amp: 1 }, { x: 79, y: 4.4, amp: 1 }
        ],
        resortes: [{ x: 58 }],
        corazones: [
            ...arco(12, 4, 7.4, 2), ...arco(24, 4, 7.4, 2), ...linea(38, 7, 6),
            ...arco(62, 4, 7.4, 2), ...linea(57, 2.1, 4), ...linea(50, 6.2, 3),
            ...linea(80, 6.2, 2)
        ],
        checkpoints: [27, 46, 65],
        llave: { x: 85, y: 4.1 },
        jaula: { x: 89, w: 3 }
    }
];

/* ---------- Estado ---------- */

let modo = "menu";     // menu | jugando | pausa | rescate | fin
let nivelIdx = 0;
let nivel = NIVELES[0];

let suelos = [], plats = [], movers = [], pinchos = [], enemigos = [];
let murcis = [], resortes = [], corazones = [], checkpoints = [];
let decor = [];
let meta = null, jaula = null, llave = null;
let tieneLlave = false;
let reaparicion = { x: 0, y: 0 };
let particulas = [];

let camX = 0;
let tiempo = 0;
let muerteT = 0;
let rescateT = 0;
let avisoTimer = null;
let avisoEspera = 0;
let corazonesNivel = 0;

// Estadísticas de toda la partida
let statCorazones = 0;
let statPosibles = 0;
let caidas = 0;

let escala = 1;
let sonidoOn = true;

const p = {
    x: 0, y: 0, w: PW, h: PH, vx: 0, vy: 0,
    onGround: false, face: 1, vivo: true,
    coyote: 0, buffer: 0, sobre: null
};

const input = { izq: false, der: false, salto: false, pulso: false };

/* ---------- Utilidades ---------- */

const mod = (a, b) => ((a % b) + b) % b;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const solapa = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function leerNum(clave) {
    try { return parseInt(localStorage.getItem(clave), 10) || 0; }
    catch (e) { return 0; }
}

function guardarNum(clave, valor) {
    try { localStorage.setItem(clave, valor); } catch (e) {}
}

function vibrar(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

function mostrarAviso(texto) {
    clearTimeout(avisoTimer);
    avisoEl.textContent = texto;
    avisoEl.classList.add("visible");
    avisoTimer = setTimeout(() => avisoEl.classList.remove("visible"), 2200);
}

function actualizarHUD() {
    nivelTxt.textContent = "Nivel " + (nivelIdx + 1) + " · " + nivel.nombre;
    corazonesTxt.textContent = "❤️ " + corazonesNivel + "/" + corazones.length;
    caidasTxt.textContent = "💔 " + caidas;
    llaveTxt.hidden = !llave;
    llaveTxt.textContent = tieneLlave ? "🔑 ¡Lista!" : "🔑 ?";
}

/* ---------- Sonido (sintetizado, sin archivos) ---------- */

let audioCtx = null;

function tono(freq, dur, tipo, vol, retraso) {
    if (!sonidoOn) return;
    setTimeout(() => {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = audioCtx || new AC();
            if (audioCtx.state === "suspended") audioCtx.resume();
            const t = audioCtx.currentTime;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = tipo || "sine";
            o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(vol || 0.12, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start(t);
            o.stop(t + dur);
        } catch (e) {}
    }, retraso || 0);
}

const sSalto = () => { tono(380, 0.12, "square", 0.07); tono(560, 0.1, "square", 0.06, 50); };
const sCorazon = () => { tono(880, 0.1, "sine", 0.12); tono(1175, 0.14, "sine", 0.12, 70); };
const sMuerte = () => { tono(220, 0.18, "sawtooth", 0.14); tono(140, 0.3, "sawtooth", 0.14, 120); };
const sPisar = () => tono(300, 0.12, "triangle", 0.15);
const sResorte = () => { tono(300, 0.25, "square", 0.08); tono(700, 0.25, "square", 0.08, 90); };
const sLlave = () => [660, 880, 1100, 1320].forEach((f, i) => tono(f, 0.14, "triangle", 0.13, i * 70));
const sPunto = () => { tono(523, 0.12, "sine", 0.12); tono(784, 0.18, "sine", 0.12, 100); };
const sVictoria = () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, 0.2, "triangle", 0.14, i * 120));

/* ---------- Partículas ---------- */

function emitir(x, y, emoji, n) {
    for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const vel = 60 + Math.random() * 120;
        particulas.push({
            x, y, e: emoji,
            vx: Math.cos(ang) * vel,
            vy: Math.sin(ang) * vel - 90,
            vida: 0.7 + Math.random() * 0.5,
            max: 1.2,
            tam: 12 + Math.random() * 10
        });
    }
}

function lluviaFinal() {
    const e = ["💖", "💕", "💗", "❤️", "✨", "💘"];
    for (let i = 0; i < 40; i++) {
        particulas.push({
            x: camX + Math.random() * W, y: -20 - Math.random() * 200,
            vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 90,
            vida: 5, max: 5, tam: 16 + Math.random() * 14,
            e: e[Math.floor(Math.random() * e.length)], flota: true
        });
    }
}

function actualizarParticulas(dt) {
    for (let i = particulas.length - 1; i >= 0; i--) {
        const q = particulas[i];
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        if (!q.flota) q.vy += 400 * dt;
        q.vida -= dt;
        if (q.vida <= 0) particulas.splice(i, 1);
    }
}

/* ---------- Carga de niveles ---------- */

function cargarNivel(i) {
    const d = NIVELES[i];
    nivelIdx = i;
    nivel = d;

    suelos = d.suelo.map(([a, b]) => ({ x: a * T, y: SUELO * T, w: (b - a) * T, h: 2 * T }));
    plats = d.plataformas.map(o => ({ x: o.x * T, y: o.y * T, w: o.w * T, h: 12 }));
    movers = d.moviles.map(o => ({
        x: o.x * T, y: SUELO * T, w: o.w * T, h: 12,
        min: o.min * T, max: o.max * T, vel: o.vel, dir: 1, dx: 0
    }));
    pinchos = d.pinchos.map(o => ({ x: o.x * T, y: SUELO * T - 24, w: o.w * T, h: 24 }));
    enemigos = d.enemigos.map(o => ({
        x: o.x * T, y: SUELO * T - 24, w: 26, h: 24,
        min: o.min * T, max: o.max * T - 26, dir: 1, vivo: true, aplastado: 0, e: o.e
    }));
    murcis = d.murcielagos.map(o => ({
        cx: o.x * T, cy: o.y * T, amp: o.amp * T, fase: Math.random() * 6.28, x: o.x * T, y: o.y * T
    }));
    resortes = d.resortes.map(o => ({ x: o.x * T, y: SUELO * T - 14, w: T, h: 14, c: 0 }));
    corazones = d.corazones.map(([x, y]) => ({ x: x * T + T / 2, y: y * T, got: false }));
    checkpoints = d.checkpoints.map(x => ({ x: x * T, activo: false }));
    meta = d.meta != null ? { x: d.meta * T } : null;
    jaula = d.jaula
        ? { x: d.jaula.x * T, w: d.jaula.w * T, y: SUELO * T - 96, h: 96, abierta: false, t: 0, elX: (d.jaula.x + d.jaula.w / 2) * T }
        : null;
    llave = d.llave ? { x: d.llave.x * T, y: d.llave.y * T, got: false } : null;
    tieneLlave = false;
    corazonesNivel = 0;
    particulas = [];

    // Decoración del suelo
    const flores = d.tema === "jardin" ? ["🌷", "🌼", "🌸", "🌱"] : d.tema === "cueva" ? ["🍄", "🪨"] : ["🕯️", "🏺"];
    decor = [];
    suelos.forEach(r => {
        for (let x = r.x + T; x < r.x + r.w - T; x += T * (2 + Math.floor(Math.random() * 3))) {
            decor.push({ x: x + Math.random() * 12, e: flores[Math.floor(Math.random() * flores.length)] });
        }
    });

    reaparicion = { x: 2 * T, y: SUELO * T - PH };
    reiniciarJugador();
    camX = 0;
    actualizarHUD();
}

function reiniciarJugador() {
    p.x = reaparicion.x;
    p.y = reaparicion.y;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
    p.vivo = true;
    p.sobre = null;
    p.coyote = 0;
    p.buffer = 0;
}

/* ---------- Lógica ---------- */

function morir() {
    if (!p.vivo || modo !== "jugando") return;
    p.vivo = false;
    muerteT = 0.8;
    caidas++;
    emitir(p.x + PW / 2, p.y + PH / 2, "💔", 5);
    sMuerte();
    vibrar(80);
    actualizarHUD();
}

function reaparecer() {
    reiniciarJugador();
    camX = clamp(p.x - W * 0.35, 0, nivel.ancho * T - W);
}

function aplastar(e) {
    e.vivo = false;
    e.aplastado = 0.35;
    p.vy = -380;
    emitir(e.x + e.w / 2, e.y, "✨", 4);
    sPisar();
}

function moverJugador(dt) {
    const solidos = (jaula && !jaula.abierta)
        ? suelos.concat([{ x: jaula.x, y: jaula.y, w: jaula.w, h: jaula.h }])
        : suelos;
    const unaVia = plats.concat(movers);

    // Horizontal
    p.x += p.vx * dt;
    for (const r of solidos) {
        if (solapa(p, r)) {
            if (p.vx > 0) p.x = r.x - p.w;
            else if (p.vx < 0) p.x = r.x + r.w;
            p.vx = 0;
        }
    }
    if (p.x < 0) { p.x = 0; p.vx = 0; }

    // Vertical
    const yAntes = p.y;
    p.y += p.vy * dt;
    p.onGround = false;
    p.sobre = null;

    for (const r of solidos) {
        if (solapa(p, r)) {
            if (p.vy > 0) { p.y = r.y - p.h; p.onGround = true; }
            else if (p.vy < 0) { p.y = r.y + r.h; }
            p.vy = 0;
        }
    }

    for (const r of unaVia) {
        if (p.vy >= 0 && yAntes + p.h <= r.y + 0.5 && p.y + p.h >= r.y &&
            p.x + p.w > r.x && p.x < r.x + r.w) {
            p.y = r.y - p.h;
            p.vy = 0;
            p.onGround = true;
            if (movers.includes(r)) p.sobre = r;
        }
    }
}

function actualizar(dt) {
    // Plataformas móviles
    for (const m of movers) {
        const viejo = m.x;
        m.x += m.vel * m.dir * dt;
        if (m.x >= m.max) { m.x = m.max; m.dir = -1; }
        else if (m.x <= m.min) { m.x = m.min; m.dir = 1; }
        m.dx = m.x - viejo;
    }

    // Enemigos y murciélagos
    for (const e of enemigos) {
        if (e.vivo) {
            e.x += e.dir * 50 * dt;
            if (e.x >= e.max) { e.x = e.max; e.dir = -1; }
            else if (e.x <= e.min) { e.x = e.min; e.dir = 1; }
        } else if (e.aplastado > 0) {
            e.aplastado -= dt;
        }
    }
    murcis.forEach(m => {
        m.y = m.cy + Math.sin(tiempo * 2 + m.fase) * m.amp;
        m.x = m.cx + Math.sin(tiempo * 0.9 + m.fase) * 26;
    });
    resortes.forEach(r => { if (r.c > 0) r.c -= dt * 4; });

    if (avisoEspera > 0) avisoEspera -= dt;

    // Cámara: sigue a la jugadora (también durante el rescate)
    if (p.vivo) {
        const objCam = clamp(p.x - W * 0.35, 0, nivel.ancho * T - W);
        camX += (objCam - camX) * Math.min(1, dt * 7);
    }

    // Secuencia de rescate
    if (modo === "rescate") {
        rescateT += dt;
        jaula.t = Math.min(1, rescateT / 0.9);
        if (rescateT > 0.9) {
            const objetivo = p.x + PW + 14;
            if (jaula.elX > objetivo) jaula.elX = Math.max(objetivo, jaula.elX - 110 * dt);
        }
        if (rescateT > 2.4 && !jaula.celebro) {
            jaula.celebro = true;
            emitir(p.x + 20, p.y, "💖", 14);
            lluviaFinal();
            sVictoria();
            vibrar([60, 40, 60, 40, 120]);
        }
        if (rescateT > 4) mostrarFinal();
        return;
    }

    // Jugador muerto: espera para reaparecer
    if (!p.vivo) {
        muerteT -= dt;
        if (muerteT <= 0) reaparecer();
        return;
    }

    // Llevar al jugador sobre una plataforma móvil
    if (p.sobre) p.x += p.sobre.dx;

    // Movimiento
    const dir = (input.der ? 1 : 0) - (input.izq ? 1 : 0);
    const objetivo = dir * VEL;
    const acel = (p.onGround ? 2400 : 1500) * dt;
    if (p.vx < objetivo) p.vx = Math.min(objetivo, p.vx + acel);
    else if (p.vx > objetivo) p.vx = Math.max(objetivo, p.vx - acel);
    if (dir) p.face = dir;

    // Salto con "perdón": un instante después de dejar el borde y un instante antes de tocar el suelo
    if (input.pulso) { p.buffer = 0.12; input.pulso = false; }
    p.coyote = p.onGround ? 0.1 : p.coyote - dt;
    p.buffer -= dt;
    if (p.buffer > 0 && p.coyote > 0) {
        p.vy = SALTO;
        p.buffer = 0;
        p.coyote = 0;
        p.onGround = false;
        sSalto();
    }

    // Gravedad (si sueltas el botón en el aire, el salto es más corto)
    p.vy += GRAV * dt * (p.vy < 0 && !input.salto ? 1.9 : 1);
    p.vy = Math.min(p.vy, 900);

    moverJugador(dt);

    // Resortes
    for (const r of resortes) {
        if (p.vy >= 0 && solapa(p, r)) {
            p.vy = RESORTE;
            r.c = 1;
            p.onGround = false;
            sResorte();
            emitir(r.x + T / 2, r.y, "✨", 4);
        }
    }

    // Pinchos
    for (const s of pinchos) {
        if (solapa(p, { x: s.x + 5, y: s.y + 9, w: s.w - 10, h: s.h - 9 })) { morir(); return; }
    }

    // Enemigos
    for (const e of enemigos) {
        if (!e.vivo) continue;
        if (solapa(p, { x: e.x + 3, y: e.y + 2, w: e.w - 6, h: e.h - 2 })) {
            if (p.vy > 0 && (p.y + p.h) - e.y < 18) aplastar(e);
            else { morir(); return; }
        }
    }

    // Murciélagos
    for (const m of murcis) {
        if (solapa(p, { x: m.x - 10, y: m.y - 9, w: 20, h: 18 })) { morir(); return; }
    }

    // Abismo
    if (p.y > H + 70) { morir(); return; }

    // Corazones
    const cx = p.x + PW / 2;
    const cy = p.y + PH / 2;
    for (const c of corazones) {
        if (!c.got && (c.x - cx) ** 2 + (c.y - cy) ** 2 < 19 * 19) {
            c.got = true;
            corazonesNivel++;
            emitir(c.x, c.y, "💕", 3);
            sCorazon();
            actualizarHUD();
        }
    }

    // Llave
    if (llave && !llave.got && (llave.x - cx) ** 2 + (llave.y - cy) ** 2 < 24 * 24) {
        llave.got = true;
        tieneLlave = true;
        emitir(llave.x, llave.y, "✨", 10);
        sLlave();
        mostrarAviso("🔑 ¡Conseguiste la llave! Corre a la jaula");
        actualizarHUD();
    }

    // Puntos de control
    for (const c of checkpoints) {
        if (!c.activo && p.x > c.x + 8) {
            c.activo = true;
            reaparicion = { x: c.x + 6, y: SUELO * T - PH };
            sPunto();
            mostrarAviso("🚩 ¡Punto guardado!");
        }
    }

    // Meta del nivel
    if (meta && p.x + PW > meta.x && p.x < meta.x + 30) {
        completarNivel();
        return;
    }

    // La jaula
    if (jaula && !jaula.abierta &&
        solapa(p, { x: jaula.x - 10, y: jaula.y, w: jaula.w + 20, h: jaula.h })) {
        if (tieneLlave) abrirJaula();
        else if (avisoEspera <= 0) {
            mostrarAviso("🔒 ¡Necesitas la llave! Búscala en las plataformas");
            avisoEspera = 2.5;
        }
    }

}

function abrirJaula() {
    jaula.abierta = true;
    jaula.celebro = false;
    modo = "rescate";
    rescateT = 0;
    p.vx = 0;
    p.face = 1;
    input.izq = input.der = input.salto = false;
    sLlave();
    mostrarAviso("🔓 ¡Jaula abierta!");
    emitir(jaula.x + jaula.w / 2, jaula.y + 20, "✨", 12);
}

/* ---------- Pantallas ---------- */

function mostrarOverlay(titulo, texto, botones, conMenu) {
    ovTitulo.textContent = titulo;
    ovTexto.textContent = texto;
    ovBotones.innerHTML = "";

    botones.forEach(b => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = b.t;
        btn.addEventListener("click", b.f);
        ovBotones.appendChild(btn);
    });

    if (conMenu !== false) {
        const a = document.createElement("a");
        a.href = "minijuego.html";
        a.textContent = "Menú de juegos";
        ovBotones.appendChild(a);
    }

    overlay.style.display = "flex";
}

function ocultarOverlay() {
    overlay.style.display = "none";
}

function pantallaInicio() {
    modo = "menu";
    cargarNivel(0);
    const progreso = leerNum("rescateProgreso");
    const botones = [{ t: "▶ Jugar", f: partidaNueva }];
    if (progreso > 0 && progreso < NIVELES.length) {
        botones.push({ t: "Continuar nivel " + (progreso + 1), f: () => continuarDesde(progreso) });
    }
    mostrarOverlay(
        "🔒 ¡Rescátame! 💖",
        "Estoy atrapado en una jaula al final del castillo. Cruza el jardín, la cueva y el castillo, esquiva los obstáculos, consigue la llave 🔑 y libérame. (Se ve más grande si giras el celular 📱)",
        botones
    );
}

function partidaNueva() {
    statCorazones = 0;
    statPosibles = 0;
    caidas = 0;
    empezar(0);
}

function continuarDesde(i) {
    caidas = 0;
    statCorazones = 0;
    statPosibles = 0;
    empezar(i);
}

function empezar(i) {
    cargarNivel(i);
    modo = "jugando";
    ocultarOverlay();
    input.izq = input.der = input.salto = false;
}

function completarNivel() {
    modo = "pausa";
    statCorazones += corazonesNivel;
    statPosibles += corazones.length;
    sVictoria();
    guardarNum("rescateProgreso", Math.max(leerNum("rescateProgreso"), nivelIdx + 1));
    emitir(p.x + 10, p.y, "💖", 12);

    mostrarOverlay(
        "⭐ ¡Nivel " + (nivelIdx + 1) + " completado! ⭐",
        "Corazones: " + corazonesNivel + "/" + corazones.length + "  ·  Caídas: " + caidas +
            ". " + (nivelIdx === 0 ? "¡Ahora, a la cueva!" : "¡Ya casi llegas hasta mí!"),
        [{ t: "Siguiente nivel ▶", f: () => empezar(nivelIdx + 1) }]
    );
}

function mostrarFinal() {
    modo = "fin";
    statCorazones += corazonesNivel;
    statPosibles += corazones.length;
    guardarNum("rescateProgreso", 0);
    guardarNum("rescateFin", 1);

    mostrarOverlay(
        "💖 ¡Me rescataste! 💖",
        MENSAJE_FINAL + "  —  Corazones: " + statCorazones + "/" + statPosibles + " · Caídas: " + caidas,
        [{ t: "Jugar de nuevo", f: partidaNueva }]
    );
}

function pausar() {
    if (modo !== "jugando") return;
    modo = "pausa";
    mostrarOverlay("⏸ Pausa", "Nivel " + (nivelIdx + 1) + " · " + nivel.nombre, [
        { t: "Continuar", f: reanudar },
        { t: "Reiniciar nivel", f: () => empezar(nivelIdx) }
    ]);
}

function reanudar() {
    if (modo !== "pausa") return;
    modo = "jugando";
    ocultarOverlay();
}

/* ---------- Dibujo ---------- */

function nube(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, 6.283);
    ctx.arc(x + 20, y - 8, 20, 0, 6.283);
    ctx.arc(x + 44, y, 16, 0, 6.283);
    ctx.arc(x + 22, y + 6, 18, 0, 6.283);
    ctx.fill();
}

function colinas(par, color, base, amp, largo) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) {
        ctx.lineTo(x, base + Math.sin((x + camX * par) / largo) * amp);
    }
    ctx.lineTo(W, H);
    ctx.fill();
}

function dibujarFondo() {
    const g = ctx.createLinearGradient(0, 0, 0, H);

    if (nivel.tema === "jardin") {
        g.addColorStop(0, "#7fcdff");
        g.addColorStop(1, "#eaf8ff");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ffe066";
        ctx.beginPath();
        ctx.arc(550, 70, 30, 0, 6.283);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,.92)";
        for (let i = 0; i < 8; i++) {
            nube(mod(i * 230 - camX * 0.25, 1840) - 120, 40 + (i % 3) * 32);
        }
        colinas(0.35, "#a8e59a", 255, 26, 110);
        colinas(0.6, "#7bd36b", 278, 18, 70);

    } else if (nivel.tema === "cueva") {
        g.addColorStop(0, "#140a28");
        g.addColorStop(1, "#3a1f5e");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        colinas(0.3, "#2a1650", 260, 30, 90);

        ctx.fillStyle = "#2b1650";
        for (let i = 0; i < 14; i++) {
            const x = mod(i * 80 - camX * 0.5, 1120) - 80;
            const h = 30 + ((i * 37) % 55);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 38, 0);
            ctx.lineTo(x + 19, h);
            ctx.fill();
        }
        for (let i = 0; i < 10; i++) {
            const x = mod(i * 150 - camX * 0.7, 1500) - 60;
            const y = 190 + (i * 53) % 80;
            ctx.fillStyle = "rgba(120,230,255," + (0.45 + 0.3 * Math.sin(tiempo * 2 + i)) + ")";
            ctx.beginPath();
            ctx.moveTo(x, y - 12);
            ctx.lineTo(x + 7, y);
            ctx.lineTo(x, y + 12);
            ctx.lineTo(x - 7, y);
            ctx.fill();
        }

    } else {
        g.addColorStop(0, "#0b0d2e");
        g.addColorStop(1, "#4a2f7a");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        for (let i = 0; i < 45; i++) {
            ctx.fillStyle = "rgba(255,255,255," + (0.5 + 0.4 * Math.sin(tiempo * 2 + i)) + ")";
            ctx.fillRect((i * 97) % W, (i * 53) % 190, 2, 2);
        }

        ctx.fillStyle = "#fff6c8";
        ctx.beginPath();
        ctx.arc(530, 68, 28, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = "#1c1550";
        ctx.beginPath();
        ctx.arc(542, 62, 26, 0, 6.283);
        ctx.fill();

        for (let i = 0; i < 6; i++) {
            const x = mod(i * 300 - camX * 0.3, 1800) - 150;
            ctx.fillStyle = "#1b1745";
            ctx.fillRect(x, 175, 80, 190);
            for (let k = 0; k < 4; k++) ctx.fillRect(x + k * 22, 163, 14, 14);
            ctx.beginPath();
            ctx.moveTo(x + 90, 365);
            ctx.lineTo(x + 90, 140);
            ctx.lineTo(x + 125, 100);
            ctx.lineTo(x + 160, 140);
            ctx.lineTo(x + 160, 365);
            ctx.fill();
            ctx.fillStyle = "rgba(255,220,120,.85)";
            ctx.fillRect(x + 118, 150, 14, 22);
            ctx.fillRect(x + 28, 200, 12, 18);
        }
    }
}

function colores() {
    if (nivel.tema === "jardin") return { c: "#8a5a35", t: "#5fcf4b", l: "rgba(0,0,0,.12)", p: "#c98a47", pt: "#8be06f" };
    if (nivel.tema === "cueva") return { c: "#3b2a5a", t: "#7f5bd1", l: "rgba(255,255,255,.08)", p: "#5a4388", pt: "#a98bf0" };
    return { c: "#4b4a6a", t: "#a7a6d8", l: "rgba(0,0,0,.22)", p: "#6b6a93", pt: "#c9c8f2" };
}

function emoji(txt, x, y, tam, giro) {
    ctx.fillStyle = "#000";
    ctx.font = tam + "px serif";
    if (giro && giro < 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.fillText(txt, 0, 0);
        ctx.restore();
    } else {
        ctx.fillText(txt, x, y);
    }
}

function dibujarMundo() {
    const col = colores();
    const visible = (x, w) => x + w > camX - 40 && x < camX + W + 40;

    // Suelo
    for (const r of suelos) {
        if (!visible(r.x, r.w)) continue;
        ctx.fillStyle = col.c;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = col.t;
        ctx.fillRect(r.x, r.y, r.w, 9);
        ctx.fillStyle = col.l;
        for (let x = r.x; x < r.x + r.w; x += T) ctx.fillRect(x, r.y + 9, 2, r.h - 9);
        ctx.fillRect(r.x, r.y + T, r.w, 2);
    }

    // Decoración
    for (const d of decor) {
        if (visible(d.x, 20)) emoji(d.e, d.x, SUELO * T - 7, 18);
    }

    // Plataformas
    for (const r of plats) {
        if (!visible(r.x, r.w)) continue;
        rr(r.x, r.y, r.w, 12, 5);
        ctx.fillStyle = col.p;
        ctx.fill();
        ctx.fillStyle = col.pt;
        ctx.fillRect(r.x + 3, r.y, r.w - 6, 4);
    }

    // Plataformas móviles
    for (const m of movers) {
        if (!visible(m.x, m.w)) continue;
        rr(m.x, m.y, m.w, 14, 6);
        ctx.fillStyle = "#ff7ab0";
        ctx.fill();
        ctx.fillStyle = "#ffd1e6";
        ctx.fillRect(m.x + 4, m.y, m.w - 8, 4);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px Arial";
        ctx.fillText("↔", m.x + m.w / 2, m.y + 8);
    }

    // Pinchos
    for (const s of pinchos) {
        if (!visible(s.x, s.w)) continue;
        for (let x = s.x; x < s.x + s.w; x += T) {
            ctx.beginPath();
            ctx.moveTo(x + 2, SUELO * T);
            ctx.lineTo(x + T / 2, SUELO * T - 26);
            ctx.lineTo(x + T - 2, SUELO * T);
            ctx.closePath();
            ctx.fillStyle = "#dfe6ee";
            ctx.fill();
            ctx.strokeStyle = "#7a8696";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // Resortes
    for (const r of resortes) {
        if (!visible(r.x, r.w)) continue;
        const alto = 14 - Math.max(0, r.c) * 6;
        const y = SUELO * T - alto;
        ctx.fillStyle = "#ff4d88";
        rr(r.x + 3, y, T - 6, 5, 2);
        ctx.fill();
        ctx.strokeStyle = "#ffd1e6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(r.x + 8, SUELO * T);
        ctx.lineTo(r.x + 24, y + 7);
        ctx.moveTo(r.x + 24, SUELO * T);
        ctx.lineTo(r.x + 8, y + 7);
        ctx.stroke();
    }

    // Puntos de control
    for (const c of checkpoints) {
        if (!visible(c.x, 40)) continue;
        ctx.fillStyle = "#8b8b99";
        ctx.fillRect(c.x + 4, SUELO * T - 56, 4, 56);
        ctx.fillStyle = c.activo ? "#ff4d88" : "#b9b9c6";
        ctx.beginPath();
        ctx.moveTo(c.x + 8, SUELO * T - 56);
        ctx.lineTo(c.x + 34, SUELO * T - 46);
        ctx.lineTo(c.x + 8, SUELO * T - 36);
        ctx.fill();
    }

    // Meta
    if (meta && visible(meta.x, 50)) {
        ctx.fillStyle = "#8b8b99";
        ctx.fillRect(meta.x + 6, SUELO * T - 96, 5, 96);
        emoji("🏁", meta.x + 28, SUELO * T - 78, 40);
        ctx.fillStyle = "rgba(255,230,120," + (0.25 + 0.2 * Math.sin(tiempo * 4)) + ")";
        ctx.fillRect(meta.x, SUELO * T - 100, 44, 100);
    }

    // Corazones
    for (const c of corazones) {
        if (c.got || !visible(c.x, 20)) continue;
        emoji("❤️", c.x, c.y + Math.sin(tiempo * 3 + c.x) * 3, 20);
    }

    // Llave
    if (llave && !llave.got && visible(llave.x, 30)) {
        const y = llave.y + Math.sin(tiempo * 3) * 4;
        ctx.fillStyle = "rgba(255,230,120," + (0.3 + 0.2 * Math.sin(tiempo * 5)) + ")";
        ctx.beginPath();
        ctx.arc(llave.x, y, 22, 0, 6.283);
        ctx.fill();
        emoji("🔑", llave.x, y, 30);
    }

    // Enemigos
    for (const e of enemigos) {
        if (!visible(e.x, e.w)) continue;
        if (e.vivo) {
            emoji(e.e, e.x + e.w / 2, e.y + e.h / 2 + 1, 28, e.dir);
        } else if (e.aplastado > 0) {
            ctx.save();
            ctx.translate(e.x + e.w / 2, e.y + e.h);
            ctx.scale(1.3, 0.35);
            emoji(e.e, 0, -10, 28);
            ctx.restore();
        }
    }

    // Murciélagos
    for (const m of murcis) {
        if (!visible(m.x, 30)) continue;
        const aleteo = 1 + Math.sin(tiempo * 14 + m.fase) * 0.12;
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.scale(aleteo, 1);
        emoji("🦇", 0, 0, 28);
        ctx.restore();
    }

    dibujarJaula();
    dibujarJugador();

    // Partículas
    for (const q of particulas) {
        ctx.globalAlpha = clamp(q.vida / 0.5, 0, 1);
        emoji(q.e, q.x, q.y, q.tam);
    }
    ctx.globalAlpha = 1;
}

function dibujarJaula() {
    if (!jaula || !(jaula.x + jaula.w > camX - 40 && jaula.x < camX + W + 40)) return;

    const gy = SUELO * T;

    // Él
    emoji(ICONO_EL, jaula.elX, gy - 28, 42);
    if (jaula.celebro) emoji("💖", jaula.elX, gy - 70 + Math.sin(tiempo * 6) * 4, 22);

    // Barrotes
    const subida = jaula.t * (jaula.h + 12);
    ctx.globalAlpha = 1 - jaula.t * 0.85;
    ctx.fillStyle = "#c9ced8";
    ctx.fillRect(jaula.x, jaula.y - subida, jaula.w, 8);
    ctx.fillStyle = "#9aa3b2";
    for (let x = jaula.x + 6; x < jaula.x + jaula.w; x += 15) {
        ctx.fillRect(x, jaula.y - subida, 5, jaula.h);
    }
    ctx.fillStyle = "#c9ced8";
    ctx.fillRect(jaula.x, gy - 8 - subida, jaula.w, 8);
    ctx.globalAlpha = 1;

    // Candado y globo de texto
    if (!jaula.abierta) {
        emoji("🔒", jaula.x + jaula.w / 2, jaula.y + 18, 26);

        const txt = "¡Ayúdame! 🥺";
        ctx.font = "bold 14px Arial";
        const ancho = ctx.measureText(txt).width + 20;
        const bx = jaula.x + jaula.w / 2 - ancho / 2;
        const by = jaula.y - 40 + Math.sin(tiempo * 3) * 3;
        rr(bx, by, ancho, 26, 12);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(jaula.x + jaula.w / 2 - 6, by + 25);
        ctx.lineTo(jaula.x + jaula.w / 2, by + 34);
        ctx.lineTo(jaula.x + jaula.w / 2 + 6, by + 25);
        ctx.fill();
        ctx.fillStyle = "#c2185b";
        ctx.fillText(txt, jaula.x + jaula.w / 2, by + 14);
    }
}

function dibujarJugador() {
    if (!p.vivo) {
        const t = clamp(1 - muerteT / 0.8, 0, 1);
        ctx.globalAlpha = 1 - t;
        emoji("💔", p.x + PW / 2, p.y + PH / 2 - t * 40, 30);
        ctx.globalAlpha = 1;
        return;
    }

    const cx = p.x + PW / 2;
    const cy = p.y + PH / 2;
    const corriendo = p.onGround && Math.abs(p.vx) > 20;
    const rebote = corriendo ? Math.abs(Math.sin(tiempo * 14)) * 2 : 0;

    // Sombra
    if (p.onGround) {
        ctx.fillStyle = "rgba(0,0,0,.2)";
        ctx.beginPath();
        ctx.ellipse(cx, p.y + PH, 11, 3, 0, 0, 6.283);
        ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy - rebote);
    const estira = !p.onGround ? clamp(Math.abs(p.vy) / 2500, 0, 0.12) : 0;
    ctx.scale(p.face * (1 - estira), 1 + estira);
    ctx.fillStyle = "#000";
    ctx.font = "36px serif";
    ctx.fillText(ICONO_ELLA, 0, 2);
    ctx.restore();
}

function dibujar() {
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    dibujarFondo();

    ctx.save();
    ctx.translate(-Math.round(camX), 0);
    dibujarMundo();
    ctx.restore();
}

/* ---------- Tamaño de la pantalla ---------- */

function ajustar() {
    // En vertical la pantalla es más cuadrada para verse más grande
    const vertical = window.innerHeight > window.innerWidth;
    W = vertical ? 480 : 640;
    pantalla.style.aspectRatio = W + " / " + H;
    camX = clamp(camX, 0, Math.max(0, nivel.ancho * T - W));

    const r = pantalla.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    lienzo.width = Math.max(2, Math.round(r.width * dpr));
    lienzo.height = Math.max(2, Math.round(r.height * dpr));
    escala = lienzo.width / W;
}

/* ---------- Bucle ---------- */

let ultimo = 0;

function bucle(ts) {
    const dt = Math.min(0.033, (ts - ultimo) / 1000 || 0);
    ultimo = ts;
    tiempo += dt;

    if (modo === "jugando" || modo === "rescate") {
        actualizar(dt);
        actualizarParticulas(dt);
    } else if (modo === "fin" || modo === "pausa" || modo === "menu") {
        actualizarParticulas(dt);
        if (modo === "menu") {
            movers.forEach(m => {
                m.x += m.vel * m.dir * dt;
                if (m.x >= m.max) m.dir = -1;
                if (m.x <= m.min) m.dir = 1;
            });
        }
    }

    dibujar();
    requestAnimationFrame(bucle);
}

/* ---------- Controles ---------- */

function ligarBoton(id, clave) {
    const btn = $(id);

    const bajar = e => {
        e.preventDefault();
        input[clave] = true;
        if (clave === "salto") input.pulso = true;
        btn.classList.add("pres");
    };
    const subir = e => {
        e.preventDefault();
        input[clave] = false;
        btn.classList.remove("pres");
    };

    btn.addEventListener("pointerdown", bajar);
    btn.addEventListener("pointerup", subir);
    btn.addEventListener("pointercancel", subir);
    btn.addEventListener("pointerleave", subir);
    btn.addEventListener("contextmenu", e => e.preventDefault());
}

ligarBoton("bIzq", "izq");
ligarBoton("bDer", "der");
ligarBoton("bSalto", "salto");

document.addEventListener("keydown", e => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") input.izq = true;
    else if (k === "ArrowRight" || k === "d" || k === "D") input.der = true;
    else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") {
        if (!e.repeat) input.pulso = true;
        input.salto = true;
    } else if (k === "Escape" || k === "p" || k === "P") {
        if (modo === "jugando") pausar(); else if (modo === "pausa" && overlay.textContent.includes("Pausa")) reanudar();
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(k)) e.preventDefault();
});

document.addEventListener("keyup", e => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") input.izq = false;
    else if (k === "ArrowRight" || k === "d" || k === "D") input.der = false;
    else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") input.salto = false;
});

btnPausa.addEventListener("click", () => {
    if (modo === "jugando") pausar();
    else if (modo === "pausa" && overlay.textContent.includes("Pausa")) reanudar();
});

btnSonido.addEventListener("click", () => {
    sonidoOn = !sonidoOn;
    btnSonido.textContent = sonidoOn ? "🔊" : "🔇";
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) pausar();
});

window.addEventListener("resize", ajustar);
window.addEventListener("orientationchange", () => setTimeout(ajustar, 200));
document.addEventListener("contextmenu", e => e.preventDefault());

/* ---------- Arranque ---------- */

ajustar();
pantallaInicio();
requestAnimationFrame(bucle);
