/* =========================================================
   Para Mahulysita - contador y detalles
   ========================================================= */

// Fecha en que empezó todo: 28 de mayo de 2026, 10:23 am
const fechaInicio = new Date("2026-05-28T10:23:00");
const MS_DIA = 1000 * 60 * 60 * 24;

const emojis = ["💖", "💕", "💗", "❤️"];
const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const esCelular = window.matchMedia("(max-width: 699px)").matches;

/* ---------- Contador ---------- */
const unidades = ["dias", "horas", "minutos", "segundos"];
const etiquetas = ["días", "horas", "minutos", "segundos"];

// Las cajitas se crean una sola vez; después solo cambian los números
const contenedor = document.getElementById("tiempo");
contenedor.innerHTML = unidades.map((u, i) =>
    `<div class="caja-tiempo"><span data-u="${u}">0</span><small>${etiquetas[i]} 💕</small></div>`
).join("");

const spans = {};
contenedor.querySelectorAll("[data-u]").forEach((s) => { spans[s.dataset.u] = s; });

function poner(unidad, valor) {
    const s = spans[unidad];
    if (s.textContent !== String(valor)) {
        s.textContent = valor;
        s.classList.remove("tic");
        void s.offsetWidth;          // reinicia la animación
        s.classList.add("tic");
    }
}

function mesesCumplidos(ahora) {
    let meses =
        (ahora.getFullYear() - fechaInicio.getFullYear()) * 12 +
        (ahora.getMonth() - fechaInicio.getMonth());

    const aniversario = new Date(
        fechaInicio.getFullYear(),
        fechaInicio.getMonth() + meses,
        fechaInicio.getDate(),
        fechaInicio.getHours(),
        fechaInicio.getMinutes()
    );

    if (aniversario > ahora) meses--;
    return Math.max(0, meses);
}

function fechaMes(anio, mes) {
    return new Date(
        anio,
        mes,
        fechaInicio.getDate(),
        fechaInicio.getHours(),
        fechaInicio.getMinutes()
    );
}

function actualizarContador() {
    const ahora = new Date();
    const diferencia = Math.max(0, ahora - fechaInicio);

    poner("dias", Math.floor(diferencia / MS_DIA));
    poner("horas", Math.floor((diferencia % MS_DIA) / (1000 * 60 * 60)));
    poner("minutos", Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60)));
    poner("segundos", Math.floor((diferencia % (1000 * 60)) / 1000));

    // Meses cumplidos
    const meses = mesesCumplidos(ahora);
    const detalle = document.getElementById("detalle");
    if (detalle) {
        detalle.textContent =
            meses === 0
                ? "Y cada día me gustas más 💖"
                : `¡Ya son ${meses} ${meses === 1 ? "mes" : "meses"} a tu lado! 💖`;
    }

    // Cuenta regresiva y barra hacia el próximo mesversario (cada día 28)
    const mes = document.getElementById("mesversario");
    const relleno = document.getElementById("barra-relleno");

    if (ahora.getDate() === fechaInicio.getDate()) {
        if (mes) mes.textContent = "🎉 ¡Hoy es nuestro mesversario! Te amo 🎉";
        if (relleno) relleno.style.width = "100%";
        return;
    }

    let proximo = fechaMes(ahora.getFullYear(), ahora.getMonth());
    if (proximo <= ahora) {
        proximo = fechaMes(ahora.getFullYear(), ahora.getMonth() + 1);
    }
    const anterior = fechaMes(proximo.getFullYear(), proximo.getMonth() - 1);

    const faltan = Math.ceil((proximo - ahora) / MS_DIA);
    if (mes) {
        mes.textContent =
            `Faltan ${faltan} ${faltan === 1 ? "día" : "días"} para nuestro mesversario 💕`;
    }

    if (relleno) {
        const pct = ((ahora - anterior) / (proximo - anterior)) * 100;
        relleno.style.width = Math.min(100, Math.max(0, pct)).toFixed(1) + "%";
    }
}

actualizarContador();
setInterval(actualizarContador, 1000);

/* ---------- Frases que cambian solas ---------- */
const frases = [
    "Eres lo mejor que me ha pasado 💕",
    "Contigo todo es más bonito ✨",
    "Gracias por existir, mi vida 🌷",
    "Tu sonrisa es mi lugar favorito 😊",
    "Me haces muy feliz, Chikysbaby 💗",
    "Te elegiría una y mil veces ❤️"
];

let indiceFrase = 0;
const elementoFrase = document.getElementById("frase");

function cambiarFrase() {
    if (!elementoFrase) return;
    elementoFrase.classList.add("oculta");
    setTimeout(() => {
        indiceFrase = (indiceFrase + 1) % frases.length;
        elementoFrase.textContent = frases[indiceFrase];
        elementoFrase.classList.remove("oculta");
    }, 600);
}

setInterval(cambiarFrase, 5000);

/* ---------- Estrellitas que titilan en el encabezado ---------- */
(function crearBrillos() {
    const header = document.querySelector("header");
    if (!header || reducirMovimiento) return;

    const cantidad = esCelular ? 8 : 14;
    for (let i = 0; i < cantidad; i++) {
        const b = document.createElement("span");
        b.className = "brillo";
        b.textContent = "✨";
        b.style.left = (4 + Math.random() * 92) + "%";
        b.style.top = (4 + Math.random() * 90) + "%";
        b.style.fontSize = (10 + Math.random() * 12) + "px";
        b.style.animationDelay = (Math.random() * 3.2) + "s";
        b.style.animationDuration = (2.4 + Math.random() * 2) + "s";
        header.appendChild(b);
    }
})();

/* ---------- Corazones que suben por la pantalla ---------- */
function crearCorazon(rapido) {
    const corazon = document.createElement("span");

    corazon.className = "corazon-flotante";
    corazon.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    corazon.style.left = Math.random() * 100 + "vw";
    corazon.style.fontSize = (14 + Math.random() * 20) + "px";
    corazon.style.animationDuration = (rapido ? 3 + Math.random() * 2 : 6 + Math.random() * 5) + "s";

    document.body.appendChild(corazon);
    setTimeout(() => corazon.remove(), 11000);
}

if (!reducirMovimiento) {
    // En celular salen menos para no gastar batería
    setInterval(crearCorazon, esCelular ? 1400 : 900);
}

// Lluvia de corazones al abrir la pantalla de bienvenida
window.lluviaCorazones = function () {
    if (reducirMovimiento) return;
    const total = esCelular ? 22 : 36;
    for (let i = 0; i < total; i++) {
        setTimeout(() => crearCorazon(true), i * 70);
    }
};

/* ---------- Explosión de corazones al tocar la pantalla ---------- */
document.addEventListener("pointerdown", (e) => {
    // No molestar al tocar los botones y enlaces
    if (e.target.closest("a, button")) return;
    if (reducirMovimiento) return;

    for (let i = 0; i < 7; i++) {
        const c = document.createElement("span");
        const angulo = Math.random() * Math.PI * 2;
        const distancia = 40 + Math.random() * 60;

        c.className = "corazon-toque";
        c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        c.style.left = e.clientX + "px";
        c.style.top = e.clientY + "px";
        c.style.setProperty("--dx", Math.cos(angulo) * distancia + "px");
        c.style.setProperty("--dy", Math.sin(angulo) * distancia + "px");

        document.body.appendChild(c);
        setTimeout(() => c.remove(), 1000);
    }
});

/* ---------- Rastro de corazones con el mouse (solo PC) ---------- */
let ultimoRastro = 0;

document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || reducirMovimiento) return;

    const ahora = Date.now();
    if (ahora - ultimoRastro < 90) return;
    ultimoRastro = ahora;

    const r = document.createElement("span");
    r.className = "rastro";
    r.textContent = "💗";
    r.style.left = e.clientX + "px";
    r.style.top = e.clientY + "px";

    document.body.appendChild(r);
    setTimeout(() => r.remove(), 900);
});

/* ---------- Las secciones aparecen suavemente al hacer scroll ---------- */
const secciones = document.querySelectorAll(".revelar");

if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.15 });

    secciones.forEach((s) => observador.observe(s));
} else {
    secciones.forEach((s) => s.classList.add("visible"));
}
