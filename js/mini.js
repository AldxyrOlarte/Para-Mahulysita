const basket = document.getElementById("basket");
const game = document.getElementById("game");
const gameContainer = document.getElementById("game-container");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");
const musica = document.getElementById("musica");
const musicBtn = document.getElementById("musicBtn");

let score = 0;
let isMusicPlaying = false;

// --- CONTROLADOR DE MÚSICA ---
musicBtn.addEventListener("click", () => {
    if (isMusicPlaying) {
        musica.pause();
        musicBtn.innerHTML = "🎵 Música: OFF";
    } else {
        musica.play();
        musicBtn.innerHTML = "🎵 Música: ON";
    }
    isMusicPlaying = !isMusicPlaying;
});

// --- FUNCIÓN DE MENSAJES TEMPORALES ---
function mostrarMensajeTemporal(texto) {
    message.innerHTML = texto;
    message.style.display = "block";
    setTimeout(() => {
        message.style.display = "none";
    }, 3000);
}

// --- CREACIÓN DE CORAZONES ---
function createHeart() {
    const heart = document.createElement("div");
    heart.classList.add("heart");
    heart.innerHTML = "❤️";

    // Mantiene los corazones dentro del ancho del celular
    const containerWidth = gameContainer.offsetWidth;
    const x = Math.random() * (containerWidth - 50);
    heart.style.left = x + "px";

    const speed = 2.5 + Math.random() * 2;
    heart.style.animationDuration = speed + "s";

    game.appendChild(heart);

    const interval = setInterval(() => {
        const heartRect = heart.getBoundingClientRect();
        const basketRect = basket.getBoundingClientRect();

        // Colisión mejorada para dispositivos táctiles
        if(
            heartRect.bottom >= basketRect.top + 10 &&
            heartRect.left <= basketRect.right - 10 &&
            heartRect.right >= basketRect.left + 10 &&
            heartRect.top <= basketRect.bottom
        ){
            score++;
            scoreText.innerHTML = "❤️ Amor: " + score;
            heart.remove();
            clearInterval(interval);

            if(score === 10) mostrarMensajeTemporal("¡Qué buen ritmo! ❤️");
            else if(score === 20) mostrarMensajeTemporal("¡Me encantas! 🥰");
            else if(score === 30) mostrarMensajeTemporal("¡Eres increíble! 💘");
            else if(score === 50) mostrarMensajeTemporal("¡Te amo muchísimo! 💖");
        }

        if(heartRect.top > window.innerHeight){
            heart.remove();
            clearInterval(interval);
        }
    }, 20);
}

setInterval(createHeart, 800);

// --- MOVIMIENTO DE CANASTA CON LÍMITES ---
function moverCanasta(clientX) {
    const containerRect = gameContainer.getBoundingClientRect();
    let nuevaPosicion = clientX - containerRect.left;

    // Evita que la canasta (que mide 90px, 45px es la mitad) salga de la pantalla
    if (nuevaPosicion < 45) nuevaPosicion = 45;
    if (nuevaPosicion > containerRect.width - 45) nuevaPosicion = containerRect.width - 45;

    basket.style.left = nuevaPosicion + "px";
}

// Soporte para PC
document.addEventListener("mousemove", (e) => {
    moverCanasta(e.clientX);
});

// Soporte perfecto para celular
document.addEventListener("touchmove", (e) => {
    moverCanasta(e.touches[0].clientX);
}, { passive: false });
