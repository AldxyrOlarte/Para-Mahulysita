"use strict";

/* ---------- Récords guardados ---------- */

function leer(clave) {
    try {
        return parseInt(localStorage.getItem(clave), 10) || 0;
    } catch (e) {
        return 0;
    }
}

const recCorazones = leer("amorBest");
const recMemorama = leer("memoramaBest_8");

if (recCorazones) {
    document.getElementById("recCorazones").textContent = `🏆 Récord: ${recCorazones} puntos`;
}

if (recMemorama) {
    document.getElementById("recMemorama").textContent = `🏆 Mejor: ${recMemorama} movimientos`;
}

const progresoRescate = leer("rescateProgreso");

if (leer("rescateFin")) {
    document.getElementById("recRescate").textContent = "🏆 ¡Rescate completado!";
} else if (progresoRescate) {
    document.getElementById("recRescate").textContent = `🚩 Vas en el nivel ${progresoRescate + 1} de 3`;
}

/* ---------- Corazones flotando de fondo ---------- */

const emojis = ["💖", "💕", "💗", "❤️", "💘"];

function crearCorazon() {
    if (document.hidden) return;

    const c = document.createElement("span");
    c.className = "corazon-flotante";
    c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    c.style.left = `${Math.random() * 100}vw`;
    c.style.fontSize = `${14 + Math.random() * 22}px`;
    c.style.animationDuration = `${7 + Math.random() * 6}s`;

    document.body.appendChild(c);
    c.addEventListener("animationend", () => c.remove());
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setInterval(crearCorazon, 800);
}
