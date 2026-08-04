const fotos = document.querySelectorAll(".foto img");

const lightbox = document.createElement("div");
lightbox.className = "lightbox";

lightbox.innerHTML = `
<span class="cerrar">&times;</span>
<span class="anterior">&#10094;</span>
<img src="">
<span class="siguiente">&#10095;</span>
`;

document.body.appendChild(lightbox);

const imagen = lightbox.querySelector("img");
const cerrar = lightbox.querySelector(".cerrar");
const anterior = lightbox.querySelector(".anterior");
const siguiente = lightbox.querySelector(".siguiente");

let indice = 0;

function mostrar(i){

    indice = i;

    imagen.src = fotos[indice].src;

    lightbox.classList.add("active");

}

fotos.forEach((foto,i)=>{

    foto.addEventListener("click",()=>{

        mostrar(i);

    });

});

cerrar.onclick=()=>{

    lightbox.classList.remove("active");

}

lightbox.onclick=(e)=>{

    if(e.target===lightbox){

        lightbox.classList.remove("active");

    }

}

siguiente.onclick=()=>{

    indice++;

    if(indice>=fotos.length){

        indice=0;

    }

    imagen.src=fotos[indice].src;

}

anterior.onclick=()=>{

    indice--;

    if(indice<0){

        indice=fotos.length-1;

    }

    imagen.src=fotos[indice].src;

}

document.addEventListener("keydown",(e)=>{

    if(!lightbox.classList.contains("active")) return;

    if(e.key==="ArrowRight") siguiente.click();

    if(e.key==="ArrowLeft") anterior.click();

    if(e.key==="Escape") cerrar.click();

});
