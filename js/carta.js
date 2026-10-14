const texto = `Hola mi amortitooooo lindoooo

Quería decirte que soy un monstruo para usted y siento que aveces usted se siente mal y
no me quiere hablar porque aveces me porto similar
a como se portaba su papa y no quiero ser la persona que te haga daño posiblemente si usted quiere me alejo de usted :(
Te quiero muchísimo mamiii perdon. 💖`;

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
