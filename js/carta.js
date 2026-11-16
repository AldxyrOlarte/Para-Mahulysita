const texto = `Hola mi amortitooooo lindoooo

Amortitooo te quieroo decir muchas graciass por todoo, y de verdadd te merecess un heladitooo, perooo usted elige la opcionnn`;

// Pega aquí la URL que te da Formspree
const FORMSPREE_URL = "https://formspree.io/f/TU_CODIGO_AQUI";

let i = 0;

function escribirTexto() {
    if (i < texto.length) {
        document.getElementById("mensaje").innerHTML += texto.charAt(i);
        i++;
        setTimeout(escribirTexto, 45);
    } else {
        document.getElementById("opciones").classList.add("visible");
    }
}

function abrirCarta() {
    document.getElementById("sobre").classList.toggle("abierto");

    if (i === 0) {
        setTimeout(escribirTexto, 1000);
    }
}

function responder(opcion) {
    const respuesta = document.getElementById("respuesta");
    respuesta.textContent = "Enviando tu respuesta... 💌";

    fetch(FORMSPREE_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            mensaje: "Mahulysita eligió: " + opcion
        })
    })
    .then(r => {
        if (r.ok) {
            respuesta.textContent = "¡Qué rico! Elegiste: " + opcion + " 💖
