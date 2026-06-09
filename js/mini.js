const basket = document.getElementById("basket");
const game = document.getElementById("game");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");

let score = 0;
let basketX = window.innerWidth / 2;

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

            if(score >= 20){
                message.style.display = "block";
            }
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