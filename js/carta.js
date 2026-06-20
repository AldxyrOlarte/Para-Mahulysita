const texto = `Hola mi amor ❤️

Quería escribirte esta pequeña carta para recordarte lo especial que eres para mí.

Gracias por cada sonrisa, cada conversación y cada momento que hemos compartido juntos.

Eres una persona increíble y espero seguir creando muchos recuerdos hermosos contigo.

Te quiero muchísimo. 💖`;

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
