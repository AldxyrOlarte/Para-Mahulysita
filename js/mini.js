const basket = document.getElementById("basket");
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");

let score = 0;
let basketX = window.innerWidth / 2;

// --- NUEVA FUNCIÓN ---
// Esta función recibe un texto, lo muestra y lo oculta a los 3 segundos
function mostrarMensajeTemporal(texto) {
    message.innerHTML = texto; // Cambiamos el texto del mensaje
    message.style.display = "block"; // Lo hacemos visible

    // setTimeout cuenta 3000 milisegundos (3 segundos) y luego lo oculta
    setTimeout(() => {
        message.style.display = "none";
    }, 3000);
}
// ---------------------

function createHeart(){
    const heart = document.createElement("div");
    heart.classList.add("heart");
    heart.innerHTML = "❤️";

    const x = Math.random() * (window.innerWidth - 50);
    heart.style.left = x + "px";

    const speed = 3 + Math.random() * 3;
    heart.style.animationDuration = speed + "s";

    game.appendChild(heart);

    const interval = setInterval(() => {
        const heartRect = heart.getBoundingClientRect();
        const basketRect = basket.getBoundingClientRect();

        if(
            heartRect.bottom >= basketRect.top &&
            heartRect.left < basketRect.right &&
            heartRect.right > basketRect.left
        ){
            score++;
            scoreText.innerHTML = "❤️ Amor: " + score;
            heart.remove();
            clearInterval(interval);

            // --- NUEVA LÓGICA DE MENSAJES ---
            // Usamos "===" para que el mensaje salga SOLO cuando llegue a ese número exacto
            if(score === 10){
                mostrarMensajeTemporal("¡Qué buen ritmo! ❤️");
            } else if(score === 20){
                mostrarMensajeTemporal("¡Me encantas! 🥰");
            } else if(score === 30){
                mostrarMensajeTemporal("¡Eres increíble! 💘");
            } else if(score === 50){
                mostrarMensajeTemporal("¡Te amo muchísimo! 💖 ¡Ganaste mi corazón!");
            }
            // Puedes seguir agregando más "else if" para más puntajes
            // ---------------------------------
        }

        if(heartRect.top > window.innerHeight){
            heart.remove();
            clearInterval(interval);
        }

    },20);
}

setInterval(createHeart, 800);

document.addEventListener("mousemove", e=>{
    basketX = e.clientX;
    basket.style.left = basketX + "px";
});

document.addEventListener("touchmove", e=>{
    basketX = e.touches[0].clientX;
    basket.style.left = basketX + "px";
});

const musica = document.getElementById("musica");

document.addEventListener("click", () => {
    musica.play();
}, { once: true });

document.addEventListener("touchstart", () => {
    musica.play();
}, { once: true });
