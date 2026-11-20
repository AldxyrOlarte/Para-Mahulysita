/* =========================================================
   ¿Por qué te amo? - razones
   ========================================================= */

const cartas = [
    "❤️ Te amo porque tu sonrisa puede alegrar incluso mis días más difíciles.",
    "🌸 Te amo porque contigo cualquier momento se convierte en un recuerdo hermoso.",
    "💖 Te amo porque eres la persona con la que quiero compartir mis sueños.",
    "🥰 Te amo porque cuando hablo contigo todo parece más fácil.",
    "🌹 Te amo porque eres especial de una forma que nadie más puede ser.",
    "✨ Te amo porque haces que mi corazón lata más fuerte cada día.",
    "💕 Te amo porque me haces sentir afortunado de tenerte en mi vida.",
    "🐱 Te amo porque eres tan tierna que pareces salida de un mundo de Hello Kitty.",
    "💞 Te amo porque contigo aprendí lo que significa amar de verdad.",
    "💌 Te amo simplemente porque eres tú."
];

const emojis = ["💖", "💕", "💗", "❤️"];
const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let baraja = [];          // razones que aún no han salido en esta ronda
let ultima = -1;          // para no repetir la misma dos veces seguidas
let vistas = 0;           // cuántas razones lleva leídas
let escribiendo = null;   // temporizador de la máquina de escribir

/* Mezcla las razones para que salgan todas sin repetirse */
function nuevaBaraja() {
    baraja = cartas.map((_, i) => i);

    for (let i = baraja.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baraja[i], baraja[j]] = [baraja[j], baraja[i]];
    }

    // Evita que la primera de la nueva ronda sea igual a la última de la anterior
    if (baraja[baraja.length - 1] === ultima && baraja.length > 1) {
        [baraja[0], baraja[baraja.length - 1]] = [baraja[baraja.length - 1], baraja[0]];
    }
}

/* Escribe el mensaje letra por letra */
function escribirMensaje(texto) {
    const mensaje = document.getElementById("mensaje");
    clearInterval(escribiendo);

    if (reducirMovimiento) {
        mensaje.textContent = texto;
        return;
    }

    const letras = Array.from(texto);   // respeta los emojis
    let i = 0;
    mensaje.textContent = "";

    escribiendo = setInterval(() => {
        mensaje.textContent += letras[i];
        i++;
        if (i >= letras.length) clearInterval(escribiendo);
    }, 28);
}

function abrirCarta() {
    if (baraja.length === 0) nuevaBaraja();

    const indice = baraja.pop();
    ultima = indice;
    vistas++;

    escribirMensaje(cartas[indice]);

    // Contador de razones
    const total = cartas.length;
    const contador = document.getElementById("contador-razones");
    const ronda = ((vistas - 1) % total) + 1;
    contador.textContent = `Razón ${ronda} de ${total}`;

    if (vistas === total) {
        contador.textContent = `Razón ${total} de ${total} · ¡Ya las leíste todas, pero hay más! 💖`;
    }

    // Aparece el botón "Otra razón"
    document.getElementById("btn-otra").classList.add("visible");

    // Animación de giro de la tarjeta
    if (!reducirMovimiento) {
        document.getElementById("carta").animate([
            { transform: "rotateY(90deg)", opacity: 0 },
            { transform: "rotateY(0deg)", opacity: 1 }
        ], {
            duration: 600,
            easing: "ease-out"
        });
    }

    // Corazones desde el botón
    const boton = document.querySelector(".heart-btn").getBoundingClientRect();
    explotarCorazones(boton.left + boton.width / 2, boton.top + boton.height / 2, 9);
}

/* ---------- Corazones que explotan ---------- */
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

/* ---------- Corazones de fondo ---------- */
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

if (!reducirMovimiento) {
    const esCelular = window.matchMedia("(max-width: 699px)").matches;
    setInterval(crearCorazon, esCelular ? 1500 : 1000);
}
