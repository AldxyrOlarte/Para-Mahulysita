const cartas = [
"❤️ Te amo porque tu sonrisa puede alegrar incluso mis días más difíciles.",

"🌸 Te amo porque contigo cualquier momento se convierte en un recuerdo hermoso.",

"💖 Te amo porque eres la persona con la que quiero compartir mis sueños.",

"🥰 Te amo porque cuando hablo contigo todo parece más fácil.",

"🌹 Te amo porque eres especial de una forma que nadie más puede ser.",

"✨ Te amo porque haces que mi corazón lata más fuerte cada día.",

"💕 Te amo porque me haces sentir afortunado de tenerte en mi vida.",

"🐱 Te amo porque eres tan tierna que pareces salida de un mundo de Hello Kitty.",

"💞 Te amo porque contigo aprendí lo que significa amar de verdad.",

"💌 Te amo simplemente porque eres tú."
];

function abrirCarta(){

    const mensaje =
    cartas[Math.floor(Math.random()*cartas.length)];

    document.getElementById("mensaje").innerHTML = mensaje;

    document.getElementById("carta").animate([
        {transform:'rotateY(90deg)',opacity:0},
        {transform:'rotateY(0deg)',opacity:1}
    ],{
        duration:600
    });
}