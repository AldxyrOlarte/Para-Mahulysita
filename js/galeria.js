const botones = document.querySelectorAll(".foto");
const fotos = Array.from(botones).map(b => b.querySelector("img"));

const lightbox = document.createElement("div");
lightbox.className = "lightbox";
lightbox.setAttribute("role", "dialog");
lightbox.setAttribute("aria-modal", "true");
lightbox.setAttribute("aria-label", "Visor de fotos");

lightbox.innerHTML = `
    <button class="cerrar" aria-label="Cerrar">&times;</button>
    <button class="anterior" aria-label="Foto anterior">&#10094;</button>
    <img src="" alt="">
    <p class="contador"></p>
    <button class="siguiente" aria-label="Foto siguiente">&#10095;</button>
`;

document.body.appendChild(lightbox);

const imagen = lightbox.querySelector("img");
const contador = lightbox.querySelector(".contador");
const cerrar = lightbox.querySelector(".cerrar");
const anterior = lightbox.querySelector(".anterior");
const siguiente = lightbox.querySelector(".siguiente");

let indice = 0;
let botonPrevio = null;

function actualizar(animar = true, direccion = "sig") {
    const foto = fotos[indice];
    const clase = direccion === "sig" ? "cambiando-sig" : "cambiando-ant";

    const poner = () => {
        imagen.src = foto.src;
        imagen.alt = foto.alt;
        contador.textContent = `${indice + 1} / ${fotos.length}`;
        imagen.classList.remove("cambiando-sig", "cambiando-ant");
    };

    if (animar) {
        imagen.classList.add(clase);
        setTimeout(poner, 150);
    } else {
        poner();
    }

    // Precarga la siguiente y la anterior para que el cambio sea instantáneo
    [(indice + 1) % fotos.length, (indice - 1 + fotos.length) % fotos.length]
        .forEach(i => { new Image().src = fotos[i].src; });
}

function abrir(i) {
    botonPrevio = document.activeElement;
    indice = i;
    actualizar(false);
    lightbox.classList.add("active");
    document.body.classList.add("sin-scroll");
    cerrar.focus();
}

function cerrarLightbox() {
    lightbox.classList.remove("active");
    document.body.classList.remove("sin-scroll");
    if (botonPrevio) botonPrevio.focus();
}

function siguienteFoto() {
    indice = (indice + 1) % fotos.length;
    actualizar(true, "sig");
}

function anteriorFoto() {
    indice = (indice - 1 + fotos.length) % fotos.length;
    actualizar(true, "ant");
}

botones.forEach((boton, i) => {
    boton.addEventListener("click", () => abrir(i));
});

cerrar.addEventListener("click", cerrarLightbox);
siguiente.addEventListener("click", siguienteFoto);
anterior.addEventListener("click", anteriorFoto);

// Cerrar al hacer clic fuera de la imagen
lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) cerrarLightbox();
});

// Teclado
document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("active")) return;

    if (e.key === "ArrowRight") siguienteFoto();
    if (e.key === "ArrowLeft") anteriorFoto();
    if (e.key === "Escape") cerrarLightbox();
});

// Deslizar con el dedo en el celular
let inicioX = 0;

lightbox.addEventListener("touchstart", (e) => {
    inicioX = e.changedTouches[0].clientX;
}, { passive: true });

lightbox.addEventListener("touchend", (e) => {
    const diferencia = e.changedTouches[0].clientX - inicioX;

    if (Math.abs(diferencia) < 50) return;

    if (diferencia < 0) siguienteFoto();
    else anteriorFoto();
}, { passive: true });

// ---------- Animaciones ----------

// Las fotos aparecen una a una al hacer scroll
function revelar(boton, retraso) {
    boton.style.transitionDelay = `${retraso}ms`;
    boton.classList.add("visible");
    // Quita el retraso para que el hover responda al instante
    setTimeout(() => { boton.style.transitionDelay = ""; }, retraso + 800);
}

if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver((entradas) => {
        let orden = 0;
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                revelar(entrada.target, orden * 120);
                observador.unobserve(entrada.target);
                orden++;
            }
        });
    }, { threshold: 0.15 });

    botones.forEach((b) => observador.observe(b));
} else {
    botones.forEach((b) => b.classList.add("visible"));
}

// Corazones flotando de fondo
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
    setInterval(crearCorazon, 900);
}
