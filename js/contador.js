/* =========================================================
   Para Mahulysita - contador y detalles
   ========================================================= */

// Fecha en que empezó todo: 28 de mayo de 2026, 10:23 am
const fechaInicio = new Date("2026-05-28T10:23:00");
const MS_DIA = 1000 * 60 * 60 * 24;

/* ---------- Contador ---------- */
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

function actualizarContador() {
    const ahora = new Date();
    const diferencia = Math.max(0, ahora - fechaInicio);

    const dias = Math.floor(diferencia / MS_DIA);
    const horas = Math.floor((diferencia % MS_DIA) / (1000 * 60 * 60));
    const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

    document.getElementById("tiempo").innerHTML = `
        <div class="caja-tiempo">${dias}<small>días 💕</small></div>
        <div class="caja-tiempo">${horas}<small>horas 💕</small></div>
        <div class="caja-tiempo">${minutos}<small>minutos 💕</small></div>
        <div class="caja-tiempo">${segundos}<small>segundos 💕</small></div>
    `;

    // Detalle: meses cumplidos
    const meses = mesesCumplidos(ahora);
    const detalle = document.getElementById("detalle");
    if (detalle) {
        detalle.textContent =
            meses === 0
                ? "Y cada día me gustas más 💖"
                : `¡Ya son ${meses} ${meses === 1 ? "mes" : "meses"} a tu lado! 💖`;
    }

    // Cuenta regresiva al próximo mesversario (cada día 28)
    const mes = document.getElementById("mesversario");
    if (mes) {
        if (ahora.getDate() === fechaInicio.getDate()) {
            mes.textContent = "🎉 ¡Hoy es nuestro mesversario! Te amo 🎉";
        } else {
            let proximo = new Date(
                ahora.getFullYear(),
                ahora.getMonth(),
                fechaInicio.getDate(),
                fechaInicio.getHours(),
                fechaInicio.getMinutes()
            );
            if (proximo <= ahora) {
                proximo = new Date(
                    ahora.getFullYear(),
                    ahora.getMonth() + 1,
                    fechaInicio.getDate(),
                    fechaInicio.getHours(),
                    fechaInicio.getMinutes()
                );
            }
            const faltan = Math.ceil((proximo - ahora) / MS_DIA);
            mes.textContent =
                `Faltan ${faltan} ${faltan === 1 ? "día" : "días"} para nuestro mesversario 💕`;
        }
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

/* ---------- Corazones que suben por la pantalla ---------- */
const emojis = ["💖", "💕", "💗", "❤️"];
const esCelular = window.matchMedia("(max-width: 699px)").matches;

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

// En celular salen menos para no gastar batería
setInterval(crearCorazon, esCelular ? 1400 : 900);

/* ---------- Explosión de corazones al tocar la pantalla ---------- */
document.addEventListener("pointerdown", (e) => {
    // No molestar al tocar los botones del menú
    if (e.target.closest("a")) return;

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
