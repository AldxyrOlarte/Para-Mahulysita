/* =========================================================
   ¿Por qué te amo? - colección diaria
   Una razón nueva por día, guardada en el navegador.
   Trucos para probar (agrégalos a la dirección de la página):
     ?probar     -> permite abrir varias razones el mismo día
     ?reiniciar  -> borra el progreso guardado en este navegador
   Requiere js/razones.js cargado antes que este archivo.
   ========================================================= */

const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PARAMS = new URLSearchParams(location.search);
const MODO_PRUEBA = PARAMS.has("probar");
const CLAVE = "pqtm-coleccion-v3";

const emojis = ["💖", "💕", "💗", "❤️"];
const confetiEmojis = ["💖", "💕", "💗", "❤️", "✨", "🌸", "🎉", "💌", "👑"];

const RAREZAS = {
    comun:      { nombre: "Común",      icono: "💗", confeti: 0 },
    rara:       { nombre: "Rara",       icono: "💎", confeti: 14 },
    epica:      { nombre: "Épica",      icono: "🔮", confeti: 28 },
    legendaria: { nombre: "Legendaria", icono: "👑", confeti: 60 }
};

/* La posición dentro de cada categoría (0-19) decide la rareza */
function rarezaDe(pos) {
    if (pos === 19) return "legendaria";
    if ([4, 9, 14].includes(pos)) return "epica";
    if ([2, 6, 10, 16].includes(pos)) return "rara";
    return "comun";
}

const RAZONES = [];
TEXTOS.forEach((lista, c) => {
    lista.forEach((texto, p) => {
        RAZONES.push({ id: RAZONES.length + 1, cat: c, texto, rareza: rarezaDe(p) });
    });
});

const TOTAL = RAZONES.length;
const $ = (id) => document.getElementById(id);

/* ---------- Estado guardado ---------- */
let estado = {
    desc: {},        // { idRazón: "AAAA-MM-DD" } cuándo se descubrió cada una
    ultima: null,    // último día que abrió una razón
    hoyId: null,     // razón que abrió ese día
    racha: 0,
    mejor: 0,
    fin: false       // ya vio la sorpresa de colección completa
};

let escribiendo = null;
let filtro = -1;
let estabaDormido = null;

function cargar() {
    try {
        if (PARAMS.has("reiniciar")) {
            localStorage.removeItem(CLAVE);
            PARAMS.delete("reiniciar");
            const resto = PARAMS.toString();
            history.replaceState(null, "", location.pathname + (resto ? "?" + resto : ""));
        }

        const d = JSON.parse(localStorage.getItem(CLAVE) || "null");
        if (d && typeof d === "object") {
            Object.keys(d.desc || {}).forEach((k) => {
                const id = Number(k);
                if (id >= 1 && id <= TOTAL) estado.desc[id] = String(d.desc[k]);
            });
            estado.ultima = d.ultima || null;
            estado.hoyId = d.hoyId || null;
            estado.racha = Number(d.racha) || 0;
            estado.mejor = Number(d.mejor) || 0;
            estado.fin = !!d.fin;
        }
    } catch (e) { /* sin guardado, empieza de cero */ }
}

function guardar() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (e) { /* sin guardado, no pasa nada */ }
}

/* ---------- Fechas ---------- */
const pad = (n) => String(n).padStart(2, "0");
const claveFecha = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoyStr = () => claveFecha(new Date());

function ayerStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return claveFecha(d);
}

function fechaBonita(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

function msHastaManana() {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n;
}

const abiertaHoy = () => !MODO_PRUEBA && estado.ultima === hoyStr();
const cantidad = () => Object.keys(estado.desc).length;

function rachaActual() {
    return (estado.ultima === hoyStr() || estado.ultima === ayerStr()) ? estado.racha : 0;
}

/* ---------- Tarjetas ---------- */
function escribirTexto(el, texto) {
    clearInterval(escribiendo);
    const letras = Array.from(texto);
    let i = 0;
    el.textContent = "";

    escribiendo = setInterval(() => {
        el.textContent += letras[i];
        i++;
        if (i >= letras.length) clearInterval(escribiendo);
    }, 28);
}

function pintarTarjeta(el, r, escribir) {
    const cat = CATEGORIAS[r.cat];
    const rz = RAREZAS[r.rareza];
    const fecha = estado.desc[r.id];

    el.dataset.rareza = r.rareza;
    el.style.setProperty("--acento", cat.color);
    el.innerHTML =
        `<div class="t-top">
            <span class="t-num">#${String(r.id).padStart(3, "0")}</span>
            <span class="t-rareza">${rz.icono} ${rz.nombre}</span>
        </div>
        <div class="t-emoji">${cat.emoji}</div>
        <p class="t-cat">${cat.nombre}</p>
        <p class="t-texto"></p>
        <p class="t-fecha">${fecha ? "Descubierta el " + fechaBonita(fecha) : ""}</p>`;

    const p = el.querySelector(".t-texto");

    if (escribir && !reducirMovimiento) {
        escribirTexto(p, r.texto);
    } else {
        p.textContent = r.texto;
    }
}

function tarjetaVacia() {
    const el = $("carta");
    el.dataset.rareza = "";
    el.style.setProperty("--acento", "#ff7eb6");
    el.innerHTML =
        `<div class="t-emoji">💌</div>
        <p class="t-cat">Para ti</p>
        <p class="t-texto">Toca el corazón para abrir tu razón de hoy ❤️</p>`;
}

/* ---------- Abrir la razón del día ---------- */
function elegirRazon() {
    let pool = RAZONES.filter((r) => !estado.desc[r.id]);

    // Si ya las tiene todas, sigue releyendo una al azar
    if (pool.length === 0) pool = RAZONES.filter((r) => r.id !== estado.hoyId);

    return pool[Math.floor(Math.random() * pool.length)];
}

function abrirHoy() {
    if (abiertaHoy()) {
        const boton = $("heart-btn");
        boton.classList.remove("sacude");
        void boton.offsetWidth;
        boton.classList.add("sacude");

        const r = RAZONES.find((x) => x.id === estado.hoyId);
        if (r) pintarTarjeta($("carta"), r, false);

        toast("Ya abriste tu razón de hoy 💤 Vuelve mañana");
        return;
    }

    const hoy = hoyStr();
    const razon = elegirRazon();
    const eraNueva = !estado.desc[razon.id];
    let subioRacha = false;

    if (estado.ultima !== hoy) {
        estado.racha = (estado.ultima === ayerStr()) ? estado.racha + 1 : 1;
        estado.mejor = Math.max(estado.mejor, estado.racha);
        subioRacha = true;
    }

    estado.ultima = hoy;
    estado.hoyId = razon.id;
    if (eraNueva) estado.desc[razon.id] = hoy;
    guardar();

    revelar(razon);
    actualizarTodo(eraNueva ? razon.id : -1);
    hitos(razon, eraNueva, subioRacha);
}

function revelar(r) {
    const carta = $("carta");
    const rz = RAREZAS[r.rareza];

    pintarTarjeta(carta, r, true);

    if (!reducirMovimiento) {
        carta.animate([
            { transform: "rotateY(90deg) scale(0.9)", opacity: 0 },
            { transform: "rotateY(0deg) scale(1)", opacity: 1 }
        ], { duration: 650, easing: "ease-out" });
    }

    const b = $("heart-btn").getBoundingClientRect();
    explotarCorazones(b.left + b.width / 2, b.top + b.height / 2, 9);

    if (rz.confeti) lluviaConfeti(rz.confeti);

    if (navigator.vibrate) {
        navigator.vibrate(r.rareza === "legendaria" ? [60, 40, 60, 40, 120] : 30);
    }

    if (r.rareza !== "comun") toast(`${rz.icono} ¡Carta ${rz.nombre}!`);
}

function hitos(razon, eraNueva, subioRacha) {
    const n = cantidad();

    if (eraNueva) {
        if (n === 1) {
            toast("¡Empezó tu colección! Vuelve mañana por la siguiente 💌");
        } else if ([10, 25, 50, 100, 150].includes(n)) {
            toast(`¡${n} razones coleccionadas! 🎉`);
        }

        const completa = RAZONES.filter((x) => x.cat === razon.cat).every((x) => estado.desc[x.id]);
        if (completa) {
            const c = CATEGORIAS[razon.cat];
            toast(`¡Completaste «${c.nombre}»! ${c.emoji}`);
        }
    }

    if (subioRacha && [7, 14, 30, 60, 100].includes(estado.racha)) {
        toast(`🔥 ¡${estado.racha} días seguidos! Qué constancia, mi amor`);
    }

    if (n === TOTAL && !estado.fin) {
        estado.fin = true;
        guardar();
        setTimeout(() => {
            $("sorpresa").hidden = false;
            lluviaConfeti(60);
        }, 3400);
    }
}

/* ---------- Pantalla ---------- */
function actualizarStats() {
    const n = cantidad();
    const leg = RAZONES.filter((r) => r.rareza === "legendaria" && estado.desc[r.id]).length;

    $("st-total").textContent = n;
    $("st-racha").textContent = rachaActual();
    $("st-leg").textContent = `${leg}/${RAZONES.filter((r) => r.rareza === "legendaria").length}`;
    $("relleno").style.width = (n / TOTAL * 100) + "%";
    $("barra").setAttribute("aria-valuenow", n);
    $("contador-razones").textContent = n === TOTAL
        ? "¡Colección completa! 💖"
        : `${n} de ${TOTAL} · faltan ${TOTAL - n}`;
}

function actualizarHoy() {
    const dormido = abiertaHoy();
    estabaDormido = dormido;

    $("heart-wrap").classList.toggle("dormido", dormido);
    $("heart-btn").setAttribute("aria-label", dormido ? "Ya abriste tu razón de hoy" : "Abrir mi razón de hoy");

    if (dormido) {
        $("hoy-estado").textContent = "Ya abriste tu razón de hoy ✅";
        pintarCuenta();
    } else {
        $("hoy-estado").textContent = cantidad() === TOTAL
            ? "Hoy te toca releer una al azar 💖"
            : "¡Tu razón de hoy te está esperando! 💌";
        $("cuenta").textContent = "";
    }
}

function pintarCuenta() {
    const s = Math.max(0, Math.floor(msHastaManana() / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    $("cuenta").textContent = `Tu próxima razón llega en ${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

function tick() {
    const dormido = abiertaHoy();

    if (dormido !== estabaDormido) {
        actualizarHoy();
        actualizarStats();
        return;
    }

    if (dormido) pintarCuenta();
}

function crearFiltros() {
    const cont = $("filtros");
    cont.innerHTML = "";

    const opciones = [{ id: -1 }, ...CATEGORIAS.map((_, i) => ({ id: i }))];

    opciones.forEach((o) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.dataset.f = o.id;
        b.addEventListener("click", () => {
            filtro = o.id;
            actualizarAlbum(-1);
            actualizarChips();
        });
        cont.appendChild(b);
    });
}

function actualizarChips() {
    document.querySelectorAll(".chip").forEach((b) => {
        const f = Number(b.dataset.f);
        const lista = f === -1 ? RAZONES : RAZONES.filter((r) => r.cat === f);
        const abiertas = lista.filter((r) => estado.desc[r.id]).length;

        b.textContent = f === -1
            ? `Todas ${abiertas}/${lista.length}`
            : `${CATEGORIAS[f].emoji} ${abiertas}/${lista.length}`;
        b.title = f === -1 ? "Todas" : CATEGORIAS[f].nombre;
        b.classList.toggle("activo", f === filtro);
    });
}

function crearAlbum() {
    const cont = $("album");
    cont.innerHTML = "";

    RAZONES.forEach((r) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mini";
        b.dataset.id = r.id;
        b.innerHTML = `<span class="m-num">${String(r.id).padStart(3, "0")}</span><span class="m-ico">?</span>`;
        b.addEventListener("click", () => abrirVisor(r.id));
        cont.appendChild(b);
    });
}

function actualizarAlbum(nuevoId) {
    document.querySelectorAll(".mini").forEach((b) => {
        const id = Number(b.dataset.id);
        const r = RAZONES[id - 1];
        const abierta = !!estado.desc[id];

        b.className = "mini" + (abierta ? " abierta r-" + r.rareza : "");
        if (id === nuevoId) b.classList.add("nueva");

        b.querySelector(".m-ico").textContent = abierta ? CATEGORIAS[r.cat].emoji : "?";
        b.setAttribute("aria-label", abierta ? `Releer razón ${id}` : `Razón ${id}, aún sin descubrir`);
        b.hidden = filtro !== -1 && r.cat !== filtro;
    });
}

function actualizarTodo(nuevoId) {
    actualizarStats();
    actualizarAlbum(nuevoId);
    actualizarChips();
    actualizarHoy();
}

/* ---------- Ventanas y avisos ---------- */
function abrirVisor(id) {
    if (!estado.desc[id]) {
        toast("Aún no la descubres… cada día aparece una nueva ✨");
        return;
    }

    pintarTarjeta($("visor-tarjeta"), RAZONES[id - 1], false);
    $("visor").hidden = false;
}

function cerrarVentanas() {
    $("visor").hidden = true;
    $("sorpresa").hidden = true;
}

const colaToast = [];
let toastActivo = false;

function toast(msg) {
    colaToast.push(msg);
    if (!toastActivo) siguienteToast();
}

function siguienteToast() {
    const msg = colaToast.shift();
    const el = $("toast");

    if (!msg) {
        toastActivo = false;
        return;
    }

    toastActivo = true;
    el.textContent = msg;
    el.classList.add("visible");

    setTimeout(() => {
        el.classList.remove("visible");
        setTimeout(siguienteToast, 400);
    }, 2800);
}

/* ---------- Efectos ---------- */
function explotarCorazones(x, y, cant) {
    if (reducirMovimiento) return;

    for (let i = 0; i < cant; i++) {
        const c = document.createElement("span");
        const angulo = Math.random() * Math.PI * 2;
        const distancia = 50 + Math.random() * 70;

        c.className = "corazon-toque";
        c.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        c.style.left = x + "px";
        c.style.top = y + "px";
        c.style.setProperty("--dx", Math.cos(angulo) * distancia + "px");
        c.style.setProperty("--dy", Math.sin(angulo) * distancia + "px");

        document.body.appendChild(c);
        setTimeout(() => c.remove(), 1000);
    }
}

function lluviaConfeti(cant) {
    if (reducirMovimiento) return;

    for (let i = 0; i < cant; i++) {
        const c = document.createElement("span");
        const duracion = 2.5 + Math.random() * 2.5;

        c.className = "confeti";
        c.textContent = confetiEmojis[Math.floor(Math.random() * confetiEmojis.length)];
        c.style.left = Math.random() * 100 + "vw";
        c.style.fontSize = (16 + Math.random() * 18) + "px";
        c.style.animationDuration = duracion + "s";
        c.style.animationDelay = (Math.random() * 0.8) + "s";
        c.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");

        document.body.appendChild(c);
        setTimeout(() => c.remove(), (duracion + 1) * 1000);
    }
}

let ultimoDestello = 0;

function destello(e) {
    const ahora = Date.now();
    if (ahora - ultimoDestello < 70) return;
    ultimoDestello = ahora;

    const d = document.createElement("span");
    d.className = "destello";
    d.textContent = ["✦", "✧", "♡", "💗"][Math.floor(Math.random() * 4)];
    d.style.left = e.clientX + "px";
    d.style.top = e.clientY + "px";
    d.style.fontSize = (10 + Math.random() * 12) + "px";
    d.style.color = ["#ff4d98", "#ff7eb6", "#c44dff", "#f5b400"][Math.floor(Math.random() * 4)];

    document.body.appendChild(d);
    setTimeout(() => d.remove(), 800);
}

function crearCorazon() {
    const corazon = document.createElement("span");

    corazon.className = "corazon-flotante";
    corazon.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    corazon.style.left = Math.random() * 100 + "vw";
    corazon.style.fontSize = (14 + Math.random() * 18) + "px";
    corazon.style.animationDuration = (6 + Math.random() * 5) + "s";

    document.body.appendChild(corazon);
    setTimeout(() => corazon.remove(), 11000);
}

/* ---------- Inicio ---------- */
cargar();

document.querySelectorAll(".n-total").forEach((e) => { e.textContent = TOTAL; });
$("barra").setAttribute("aria-valuemax", TOTAL);

crearFiltros();
crearAlbum();

const deHoy = (estado.ultima === hoyStr() && estado.hoyId)
    ? RAZONES.find((r) => r.id === estado.hoyId)
    : null;

if (deHoy) {
    pintarTarjeta($("carta"), deHoy, false);
} else {
    tarjetaVacia();
}

actualizarTodo(-1);

$("heart-btn").addEventListener("click", abrirHoy);
$("cerrar-visor").addEventListener("click", cerrarVentanas);
$("cerrar-sorpresa").addEventListener("click", cerrarVentanas);
[$("visor"), $("sorpresa")].forEach((m) => {
    m.addEventListener("click", (e) => { if (e.target === m) cerrarVentanas(); });
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") cerrarVentanas();
});

setInterval(tick, 1000);

if (!reducirMovimiento) {
    document.addEventListener("pointermove", destello);

    const esCelular = window.matchMedia("(max-width: 699px)").matches;
    setInterval(crearCorazon, esCelular ? 1500 : 1000);
}
