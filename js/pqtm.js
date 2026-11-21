/* =========================================================
   ¿Por qué te amo? - razones
   ========================================================= */

const razones = [
    { emoji: "❤️", color: "#ff4d98", texto: "Te amo porque tu sonrisa puede alegrar incluso mis días más difíciles." },
    { emoji: "🌸", color: "#ff7eb6", texto: "Te amo porque contigo cualquier momento se convierte en un recuerdo hermoso." },
    { emoji: "💖", color: "#c44dff", texto: "Te amo porque eres la persona con la que quiero compartir mis sueños." },
    { emoji: "🥰", color: "#ff8a4d", texto: "Te amo porque cuando hablo contigo todo parece más fácil." },
    { emoji: "🌹", color: "#e0307c", texto: "Te amo porque eres especial de una forma que nadie más puede ser." },
    { emoji: "✨", color: "#f5b400", texto: "Te amo porque haces que mi corazón lata más fuerte cada día." },
    { emoji: "💕", color: "#ff5a7a", texto: "Te amo porque me haces sentir afortunado de tenerte en mi vida." },
    { emoji: "🐱", color: "#3fb4f0", texto: "Te amo porque eres tan tierna que pareces salida de un mundo de Hello Kitty." },
    { emoji: "💞", color: "#9b5de5", texto: "Te amo porque contigo aprendí lo que significa amar de verdad." },
    { emoji: "💌", color: "#ff4d98", texto: "Te amo simplemente porque eres tú." }
];

const emojis = ["💖", "💕", "💗", "❤️"];
const confetiEmojis = ["💖", "💕", "💗", "❤️", "✨", "🌸", "🎉", "💌"];
const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const total = razones.length;
const CLAVE = "pqtm-descubiertas-v2";

let descubiertas = new Set();   // índices de razones ya vistas
let ultima = -1;                // para no repetir la misma dos veces seguidas
let escribiendo = null;         // temporizador de la máquina de escribir

const $ = (id) => document.getElementById(id);

/* ---------- Guardado (para que no pierda su progreso) ---------- */
function cargarProgreso() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE) || "[]");
        datos.forEach((i) => { if (i >= 0 && i < total) descubiertas.add(i); });
    } catch (e) { /* sin guardado, no pasa nada */ }
}

function guardarProgreso() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify([...descubiertas]));
    } catch (e) { /* sin guardado, no pasa nada */ }
}

/* ---------- Máquina de escribir ---------- */
function escribirMensaje(texto) {
    const mensaje = $("mensaje");
    clearInterval(escribiendo);

    if (reducirMovimiento) {
        mensaje.textContent = texto;
        return;
    }

    const letras = Array.from(texto);
    let i = 0;
    mensaje.textContent = "";

    escribiendo = setInterval(() => {
        mensaje.textContent += letras[i];
        i++;
        if (i >= letras.length) clearInterval(escribiendo);
    }, 28);
}

/* ---------- Colección ---------- */
function crearColeccion() {
    const cont = $("coleccion");
    cont.innerHTML = "";

    razones.forEach((r, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "sello";
        b.dataset.i = i;
        b.style.setProperty("--acento", r.color);
        b.addEventListener("click", () => {
            if (descubiertas.has(i)) mostrarRazon(i, false);
        });
        cont.appendChild(b);
    });

    actualizarColeccion();
}

function actualizarColeccion(nuevo) {
    document.querySelectorAll(".sello").forEach((b) => {
        const i = Number(b.dataset.i);
        const abierta = descubiertas.has(i);

        b.classList.toggle("activo", abierta);
        b.textContent = abierta ? razones[i].emoji : "?";
        b.disabled = !abierta;
        b.setAttribute("aria-label", abierta ? `Releer razón ${i + 1}` : `Razón ${i + 1} sin descubrir`);

        // La animación de "aparece" solo en la razón recién descubierta
        if (abierta && i !== nuevo) {
            b.style.animation = "none";
        } else {
            b.style.animation = "";
        }
    });
}

function actualizarMedidor() {
    const n = descubiertas.size;

    $("relleno").style.width = (n / total * 100) + "%";
    $("barra").setAttribute("aria-valuenow", n);

    $("contador-razones").textContent = n === total
        ? "¡Las descubriste todas! Pero hay más… 💖"
        : `${n} de ${total} descubiertas`;
}

/* ---------- Elegir y mostrar ---------- */
function elegirIndice() {
    let pool = razones.map((_, i) => i).filter((i) => !descubiertas.has(i));

    // Si ya vio todas, puede seguir leyendo cualquiera (menos la actual)
    if (pool.length === 0) {
        pool = razones.map((_, i) => i).filter((i) => i !== ultima);
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

function mostrarRazon(indice, esClickEnCorazon) {
    const r = razones[indice];
    const eraNueva = !descubiertas.has(indice);
    const yaCompleta = descubiertas.size === total;

    ultima = indice;
    descubiertas.add(indice);
    guardarProgreso();

    // Color propio de cada razón
    const carta = $("carta");
    carta.style.setProperty("--acento", r.color);
    $("carta-emoji").textContent = r.emoji;

    escribirMensaje(`${r.emoji} ${r.texto}`);
    actualizarMedidor();
    actualizarColeccion(eraNueva ? indice : -1);
    $("btn-otra").classList.add("visible");

    // Giro de la tarjeta
    if (!reducirMovimiento) {
        carta.animate([
            { transform: "rotateY(90deg) scale(0.9)", opacity: 0 },
            { transform: "rotateY(0deg) scale(1)", opacity: 1 }
        ], { duration: 600, easing: "ease-out" });
    }

    // Corazones, vibración y confeti
    const boton = $("heart-btn").getBoundingClientRect();
    explotarCorazones(boton.left + boton.width / 2, boton.top + boton.height / 2, 9);

    if (esClickEnCorazon && navigator.vibrate) navigator.vibrate(30);

    // Sorpresa al completar la décima razón por primera vez
    if (eraNueva && descubiertas.size === total && !yaCompleta) {
        setTimeout(abrirSorpresa, 2600);
    }
}

function abrirCarta() {
    mostrarRazon(elegirIndice(), true);
}

/* ---------- Sorpresa ---------- */
function abrirSorpresa() {
    $("sorpresa").hidden = false;
    lluviaConfeti(40);
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    $("cerrar-sorpresa").focus();
}

function cerrarSorpresa() {
    $("sorpresa").hidden = true;
}

/* ---------- Efectos ---------- */
function explotarCorazones(x, y, cantidad) {
    if (reducirMovimiento) return;

    for (let i = 0; i < cantidad; i++) {
        const c = document.createElement("span");
        const angulo = Math.random() * Math.PI * 2;
        const distancia = 50 + Math.random() * 70;

        c.className = "corazon-toque";
        c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        c.style.left = x + "px";
        c.style.top = y + "px";
        c.style.setProperty("--dx", Math.cos(angulo) * distancia + "px");
        c.style.setProperty("--dy", Math.sin(angulo) * distancia + "px");

        document.body.appendChild(c);
        setTimeout(() => c.remove(), 1000);
    }
}

function lluviaConfeti(cantidad) {
    if (reducirMovimiento) return;

    for (let i = 0; i < cantidad; i++) {
        const c = document.createElement("span");
        const duracion = 2.5 + Math.random() * 2.5;

        c.className = "confeti";
        c.textContent = confetiEmojis[Math.floor(Math.random() * confetiEmojis.length)];
        c.style.left = Math.random() * 100 + "vw";
        c.style.fontSize = (16 + Math.random() * 18) + "px";
        c.style.animationDuration = duracion + "s";
        c.style.animationDelay = (Math.random() * 0.8) + "s";
        c.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");

        document.body.appendChild(c);
        setTimeout(() => c.remove(), (duracion + 1) * 1000);
    }
}

/* Destellos que siguen al dedo */
let ultimoDestello = 0;

function destello(e) {
    const ahora = Date.now();
    if (ahora - ultimoDestello < 70) return;
    ultimoDestello = ahora;

    const d = document.createElement("span");
    d.className = "destello";
    d.textContent = ["✦", "✧", "♡", "💗"][Math.floor(Math.random() * 4)];
    d.style.left = e.clientX + "px";
    d.style.top = e.clientY + "px";
    d.style.fontSize = (10 + Math.random() * 12) + "px";
    d.style.color = ["#ff4d98", "#ff7eb6", "#c44dff", "#f5b400"][Math.floor(Math.random() * 4)];

    document.body.appendChild(d);
    setTimeout(() => d.remove(), 800);
}

/* Corazones de fondo */
function crearCorazon() {
    const corazon = document.createElement("span");

    corazon.className = "corazon-flotante";
    corazon.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    corazon.style.left = Math.random() * 100 + "vw";
    corazon.style.fontSize = (14 + Math.random() * 18) + "px";
    corazon.style.animationDuration = (6 + Math.random() * 5) + "s";

    document.body.appendChild(corazon);
    setTimeout(() => corazon.remove(), 11000);
}

/* ---------- Inicio ---------- */
cargarProgreso();
crearColeccion();
actualizarMedidor();

if (descubiertas.size > 0) $("btn-otra").classList.add("visible");

$("heart-btn").addEventListener("click", abrirCarta);
$("btn-otra").addEventListener("click", abrirCarta);
$("cerrar-sorpresa").addEventListener("click", cerrarSorpresa);
$("sorpresa").addEventListener("click", (e) => {
    if (e.target === $("sorpresa")) cerrarSorpresa();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarSorpresa();
});

if (!reducirMovimiento) {
    document.addEventListener("pointermove", destello);

    const esCelular = window.matchMedia("(max-width: 699px)").matches;
    setInterval(crearCorazon, esCelular ? 1500 : 1000);
}
