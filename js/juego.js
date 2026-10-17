const $ = (s) => document.querySelector(s);
const SVGNS = "http://www.w3.org/2000/svg";

let ubicadas, arrastre = null, ultimoToque = Date.now();

function mostrar(id) {
  for (const s of document.querySelectorAll(".pantalla")) s.hidden = s.id !== id;
}

function regionDe(fig) {
  return CONFIG.regiones.find(r => r.id === fig.region);
}

// Imagen de una figura dentro del mapa, centrada en el punto de su región
function imagenEnMapa(fig, clase) {
  const t = CONFIG.mapa.tamFigura, [x, y] = regionDe(fig).punto;
  const img = document.createElementNS(SVGNS, "image");
  img.setAttribute("href", fig.imagen);
  img.setAttribute("x", x - t / 2);
  img.setAttribute("y", y - t / 2);
  img.setAttribute("width", t);
  img.setAttribute("height", t);
  img.setAttribute("class", clase);
  img.dataset.figura = fig.id;
  return img;
}

function cargarTextos() {
  const t = CONFIG.textos;
  $("#titulo").textContent = t.titulo;
  $("#bajada").textContent = t.bajada;
  $("#jugar").textContent = t.botonJugar;
  $("#ayuda").textContent = t.ayuda;
  $("#consigna").textContent = t.consigna;
  $("#final-titulo").textContent = t.finalTitulo;
  $("#final-texto").textContent = t.finalTexto;
  $("#otra-vez").textContent = t.botonOtraVez;
  document.title = t.titulo;
}

function armarMapa() {
  const mapa = $("#mapa");
  mapa.innerHTML = "";
  mapa.setAttribute("viewBox", CONFIG.mapa.viewBox);
  mapa.classList.toggle("con-imagen", Boolean(CONFIG.mapa.imagen));

  if (CONFIG.mapa.imagen) {
    const [vx, vy, vw, vh] = CONFIG.mapa.viewBox.split(" ").map(Number);
    const fondo = document.createElementNS(SVGNS, "image");
    fondo.setAttribute("href", CONFIG.mapa.imagen);
    fondo.setAttribute("x", vx);
    fondo.setAttribute("y", vy);
    fondo.setAttribute("width", vw);
    fondo.setAttribute("height", vh);
    mapa.appendChild(fondo);
  }

  for (const reg of CONFIG.regiones) {
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", reg.contorno);
    p.setAttribute("class", "region");
    p.dataset.region = reg.id;
    mapa.appendChild(p);
  }

  if (CONFIG.mapa.mostrarPistas) {
    for (const fig of CONFIG.figuras) mapa.appendChild(imagenEnMapa(fig, "pista"));
  }

  if (CONFIG.mapa.mostrarNumeros) {
    for (const reg of CONFIG.regiones) {
      const [x, y] = reg.punto, d = CONFIG.mapa.tamFigura / 2 + 2;
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("class", "num");
      g.innerHTML = `<circle cx="${x - d}" cy="${y - d}" r="8"/><text x="${x - d}" y="${y - d + 1}">${reg.id}</text>`;
      mapa.appendChild(g);
    }
  }
}

function armarBandeja() {
  const bandeja = $("#bandeja");
  bandeja.innerHTML = "";
  const mezcladas = [...CONFIG.figuras].sort(() => Math.random() - .5);
  for (const f of mezcladas) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "figura";
    b.dataset.figura = f.id;
    b.innerHTML = `<img src="${f.imagen}" alt="" draggable="false"><span>${f.etiqueta}</span>`;
    b.addEventListener("pointerdown", empezarArrastre);
    bandeja.appendChild(b);
  }
}

function armarJuego() {
  ubicadas = new Set();
  armarMapa();
  armarBandeja();
  $("#leyenda").innerHTML = CONFIG.regiones.map(r => `<li data-region="${r.id}"><b>${r.id}</b>${r.nombre}</li>`).join("");
  $("#barra").innerHTML = CONFIG.figuras.map(() => "<i></i>").join("");
  mostrarTarjeta("", CONFIG.textos.tarjetaInicial);
  actualizarCuenta();
}

function mostrarTarjeta(clase, { etiqueta, titulo, texto }) {
  const t = $("#tarjeta");
  t.className = `tarjeta ${clase}`.trim();
  t.innerHTML = `<div class="eti"></div><h3></h3><p></p>`;
  t.querySelector(".eti").textContent = etiqueta;
  t.querySelector("h3").textContent = titulo;
  t.querySelector("p").textContent = texto;
}

function actualizarCuenta() {
  const total = CONFIG.figuras.length;
  $("#cuenta").textContent = `${ubicadas.size} de ${total} ubicadas`;
  [...$("#barra").children].forEach((i, k) => i.classList.toggle("on", k < ubicadas.size));
}

// Arrastre: un solo dedo a la vez, los demás se ignoran
function empezarArrastre(e) {
  if (arrastre) return;
  e.preventDefault();
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  arrastre = { el, dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId, encima: null };
  el.style.width = r.width + "px";
  el.classList.add("arrastrando");
  mover(e);
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
  window.addEventListener("pointercancel", soltar);
}

function regionBajo(x, y) {
  return document.elementsFromPoint(x, y).find(n => n.classList?.contains("region")) || null;
}

function mover(e) {
  if (!arrastre || e.pointerId !== arrastre.id) return;
  const base = $("#juego").getBoundingClientRect();
  arrastre.el.style.left = (e.clientX - base.left - arrastre.dx) + "px";
  arrastre.el.style.top = (e.clientY - base.top - arrastre.dy) + "px";
  const reg = regionBajo(e.clientX, e.clientY);
  if (reg !== arrastre.encima) {
    arrastre.encima?.classList.remove("encima");
    if (reg && !reg.classList.contains("lograda")) reg.classList.add("encima");
    arrastre.encima = reg;
  }
}

function soltar(e) {
  if (!arrastre || e.pointerId !== arrastre.id) return;
  window.removeEventListener("pointermove", mover);
  window.removeEventListener("pointerup", soltar);
  window.removeEventListener("pointercancel", soltar);
  const { el } = arrastre;
  arrastre.encima?.classList.remove("encima");
  const reg = e.type === "pointerup" ? regionBajo(e.clientX, e.clientY) : null;
  const fig = CONFIG.figuras.find(f => f.id === el.dataset.figura);
  arrastre = null;

  if (reg && Number(reg.dataset.region) === fig.region && !reg.classList.contains("lograda")) {
    acierto(el, reg, fig);
    return;
  }
  el.classList.remove("arrastrando");
  el.style.left = el.style.top = el.style.width = "";
  if (reg) {
    el.classList.remove("sacude");
    void el.offsetWidth;
    el.classList.add("sacude");
    mostrarTarjeta("error nueva", CONFIG.textos.tarjetaError);
  }
}

function acierto(el, reg, fig) {
  el.remove();
  reg.classList.add("lograda");
  ubicadas.add(fig.id);
  const mapa = $("#mapa");
  mapa.querySelector(`.pista[data-figura="${fig.id}"]`)?.remove();
  mapa.appendChild(imagenEnMapa(fig, "colocada"));
  const region = regionDe(fig);
  $("#leyenda").querySelector(`[data-region="${fig.region}"]`).classList.add("ok");
  mostrarTarjeta("nueva", { etiqueta: `${CONFIG.textos.etiquetaAcierto} · ${region.nombre}`, titulo: fig.titulo, texto: fig.texto });
  actualizarCuenta();
  if (ubicadas.size === CONFIG.figuras.length) setTimeout(terminar, CONFIG.msAntesDelFinal);
}

function terminar() {
  const colores = CONFIG.papelitos;
  $("#papelitos").innerHTML = Array.from({ length: 40 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;background:${colores[i % colores.length]};animation-delay:${Math.random() * 0.9}s"></i>`
  ).join("");
  mostrar("final");
}

function volverAlInicio() {
  arrastre = null;
  mostrar("inicio");
}

// Inactividad: vuelve al inicio
function vigilarInactividad() {
  document.addEventListener("pointerdown", () => { ultimoToque = Date.now(); }, true);
  setInterval(() => {
    const enJuego = $("#inicio").hidden;
    if (enJuego && !arrastre && Date.now() - ultimoToque > CONFIG.segundosInactividad * 1000) volverAlInicio();
  }, 2000);
}

// Reinicio oculto: 2 s apretando la esquina superior izquierda
function activarReinicioOculto() {
  const z = $("#reinicio-oculto");
  let timer = null;
  const cortar = () => { clearTimeout(timer); timer = null; z.classList.remove("sosteniendo"); };
  z.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    z.classList.add("sosteniendo");
    timer = setTimeout(() => { cortar(); volverAlInicio(); }, 2000);
  });
  z.addEventListener("pointerup", cortar);
  z.addEventListener("pointerleave", cortar);
  z.addEventListener("pointercancel", cortar);
}

// Tótem: sin menú del toque largo
document.addEventListener("contextmenu", (e) => e.preventDefault());

$("#jugar").addEventListener("click", () => { armarJuego(); mostrar("juego"); });
$("#otra-vez").addEventListener("click", () => { armarJuego(); mostrar("juego"); });

cargarTextos();
vigilarInactividad();
activarReinicioOculto();
mostrar("inicio");
