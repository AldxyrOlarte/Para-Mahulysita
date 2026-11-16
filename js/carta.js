const texto = `Hola mi amortitooooo lindoooo

Amortitooo te quieroo decir muchas graciass por todoo, y de verdadd te merecess un heladitooo, perooo usted elige la opcionnn`;

let i = 0;

function escribirTexto() {
    if (i < texto.length) {
        document.getElementById("mensaje").innerHTML += texto.charAt(i);
        i++;
        setTimeout(escribirTexto, 45);
    }
}

function abrirCarta() {

    document.getElementById("sobre").classList.toggle("abierto");

    if (i === 0) {
        setTimeout(escribirTexto, 1000);
    }
}
