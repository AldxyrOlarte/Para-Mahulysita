const fechaInicio = new Date("2026-05-28T10:23:00");

function actualizarContador() {
    const ahora = new Date();

    let diferencia = Math.max(0, ahora - fechaInicio);

    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    const horas = Math.floor(
        (diferencia % (1000 * 60 * 60 * 24))
        / (1000 * 60 * 60)
    );

    const minutos = Math.floor(
        (diferencia % (1000 * 60 * 60))
        / (1000 * 60)
    );

    const segundos = Math.floor(
        (diferencia % (1000 * 60))
        / 1000
    );

    document.getElementById("tiempo").innerHTML = `
        <div class="caja-tiempo">${dias}<small>días 💕</small></div>
        <div class="caja-tiempo">${horas}<small>horas 💕</small></div>
        <div class="caja-tiempo">${minutos}<small>minutos 💕</small></div>
        <div class="caja-tiempo">${segundos}<small>segundos 💕</small></div>
    `;
}

actualizarContador();
setInterval(actualizarContador, 1000);

/* Corazones que suben suavemente por la pantalla */
function crearCorazon() {
    const corazon = document.createElement("span");
    const emojis = ["💖", "💕", "💗", "❤️"];

    corazon.className = "corazon-flotante";
    corazon.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    corazon.style.left = Math.random() * 100 + "vw";
    corazon.style.fontSize = (14 + Math.random() * 18) + "px";
    corazon.style.animationDuration = (6 + Math.random() * 5) + "s";

    document.body.appendChild(corazon);
    setTimeout(() => corazon.remove(), 11000);
}

setInterval(crearCorazon, 900);
