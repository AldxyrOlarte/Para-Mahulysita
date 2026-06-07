const fechaInicio = new Date("2026-05-28T10:23:00");

function actualizarContador() {
    const ahora = new Date();

    let diferencia = ahora - fechaInicio;

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

    document.getElementById("tiempo").innerHTML =
        `${dias} días 💕 ${horas} horas 💕 ${minutos} minutos 💕 ${segundos} segundos`;
}

actualizarContador();
setInterval(actualizarContador, 1000);