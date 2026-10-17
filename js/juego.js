const $ = (s) => document.querySelector(s);
const SVGNS = "http://www.w3.org/2000/svg";

let partida = null;
let arrastre = null;
let pantallaActual = "inicio";
let ultimoToque = Date.now();
let timers = [];
let timerTarjeta = null;

// Timers de la partida: se cancelan todos al volver al inicio
function programar(fn, ms) {
  timers.push(setTimeout(fn, ms));
}

function cancelarTimers() {
  timers.forEach(clearTimeout);
  timers = [];
  clearTimeout(timerTarjeta);
}

function mostrar(id) {
  pantallaActual = id;
  for (const s of document.querySelectorAll(".pantalla")) s.hidden = s.id !== id;
}

function crear(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function crearSVG(tag, atributos) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  return el;
}

function mezclar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function regionDe(prod) {
  return CONFIG.regiones.find(r => r.id === prod.region);
}

function avisarSiFalta(img, prod) {
  img.addEventListener("error", () => console.warn(`Falta la imagen de "${prod.etiqueta}": ${prod.imagen}`));
}

function cargarTextos() {
  const t = CONFIG.textos;
  document.title = t.titulo;
  $("#inicio-logo").textContent = t.logo;
  $("#juego-logo").textContent = t.logo;
  $("#final-logo").textContent = t.logo;
  $("#inicio-titulo").textContent = t.inicio.titulo;
  $("#inicio-texto").textContent = t.inicio.texto;
  $("#muestra-titulo").textContent = t.muestra.titulo;
  $("#muestra-ayuda").textContent = t.muestra.ayuda;
  $("#condiciones-titulo").textContent = t.condiciones.titulo;
  $("#condiciones-texto").textContent = t.condiciones.texto;
  $("#empezar").textContent = t.condiciones.boton;
  $("#volver-juego").textContent = t.botonVolver;
  $("#volver-final").textContent = t.botonOtraVez;
}

// Mapa
function armarMapa(svg) {
  svg.replaceChildren();
  svg.setAttribute("viewBox", CONFIG.mapa.viewBox);
  svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
  svg.classList.toggle("con-imagen", Boolean(CONFIG.mapa.imagen));

  if (CONFIG.mapa.imagen) {
    const [x, y, width, height] = CONFIG.mapa.viewBox.split(" ");
    svg.append(crearSVG("image", { href: CONFIG.mapa.imagen, x, y, width, height }));
  }
  for (const reg of CONFIG.regiones) {
    svg.append(crearSVG("path", { d: reg.contorno, class: "region", "data-region": reg.id }));
  }
  if (CONFIG.mapa.mostrarNumeros) {
    for (const reg of CONFIG.regiones) {
      const [x, y] = reg.punto;
      const g = crearSVG("g", { class: "num" });
      const texto = crearSVG("text", { x, y: y + 1 });
      texto.textContent = reg.id;
      g.append(crearSVG("circle", { cx: x, cy: y, r: 8 }), texto);
      svg.append(g);
    }
  }
}

function productoEnMapa(prod, [x, y]) {
  const t = CONFIG.mapa.tamProducto;
  return crearSVG("image", { href: prod.imagen, x: x - t / 2, y: y - t / 2, width: t, height: t, class: "colocada" });
}

// Muestra: la imagen del diseño, o el mapa con todos los productos ubicados
function armarMuestra() {
  const cont = $("#muestra-contenido");
  cont.replaceChildren();
  if (CONFIG.muestra.imagen) {
    const img = crear("img");
    img.src = CONFIG.muestra.imagen;
    img.alt = "";
    cont.append(img);
    return;
  }
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "mapa");
  armarMapa(svg);
  const t = CONFIG.mapa.tamProducto, porRegion = {};
  for (const prod of CONFIG.productos) {
    const k = porRegion[prod.region] = (porRegion[prod.region] ?? -1) + 1;
    const [x, y] = regionDe(prod).punto;
    svg.append(productoEnMapa(prod, [x + (k % 2) * t, y + t * 0.8 + Math.floor(k / 2) * t]));
  }
  cont.append(svg);
}

function mostrarMuestra() {
  cancelarTimers();
  armarMuestra();
  const barra = $("#tiempo-muestra");
  barra.classList.remove("corriendo");
  void barra.offsetWidth;
  barra.style.animationDuration = `${CONFIG.segundos.muestra}s`;
  barra.classList.add("corriendo");
  mostrar("muestra");
  programar(irACondiciones, CONFIG.segundos.muestra * 1000);
}

function irACondiciones() {
  cancelarTimers();
  mostrar("condiciones");
}

// Juego
function armarBandeja() {
  const bandeja = $("#bandeja");
  bandeja.replaceChildren();
  const botones = mezclar(CONFIG.productos).map(prod => {
    const b = crear("button", "figura");
    b.type = "button";
    b.dataset.producto = prod.id;
    const img = crear("img");
    img.src = prod.imagen;
    img.alt = prod.etiqueta;
    img.draggable = false;
    avisarSiFalta(img, prod);
    b.append(img);
    if (CONFIG.mostrarEtiquetas) b.append(crear("span", "", prod.etiqueta));
    b.addEventListener("pointerdown", empezarArrastre);
    bandeja.append(b);
    return b;
  });
  ubicarProductos(botones);
}

// Cada producto en un lugar libre; se mide el más grande para que ninguno se pise
function ubicarProductos(botones) {
  if (!botones.length) return;
  for (const b of botones) b.style.left = b.style.top = "0";
  const tam = { width: Math.max(...botones.map(b => b.offsetWidth)), height: Math.max(...botones.map(b => b.offsetHeight)) };
  const lugares = lugaresLibres(tam, botones.length);
  const azar = (min, max) => min + Math.random() * (max - min);
  botones.forEach((b, i) => {
    const { x, y, w, h } = lugares[i % lugares.length] || { x: 0, y: 0, w: tam.width, h: tam.height };
    b.dataset.x = `${x + azar(0, 0.08) * w}px`;
    b.dataset.y = `${y + azar(0, 0.05) * h}px`;
    b.style.left = b.dataset.x;
    b.style.top = b.dataset.y;
    b.style.setProperty("--giro", `${azar(-12, 12)}deg`);
  });
}

// Lugares en el espacio libre a la derecha del mapa, sin tapar regiones, la leyenda ni el botón
function lugaresLibres(tam, cantidad) {
  const tablero = $(".tablero").getBoundingClientRect();
  const svg = $("#mapa");
  const inversa = svg.getScreenCTM().inverse();
  const regiones = [...svg.querySelectorAll(".region")];
  const tapados = [$("#leyenda"), $("#volver-juego")].map(e => e.getBoundingClientRect());
  const enElMapa = (x, y) => {
    const p = new DOMPoint(x, y).matrixTransform(inversa);
    return regiones.some(r => r.isPointInFill(p));
  };
  const puntos = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
  const w = tam.width * 1.3, h = tam.height * 1.1;
  const libres = [], resto = [];
  for (let y = tablero.top; y + h <= tablero.bottom; y += h) {
    for (let x = tablero.right - w; x >= tablero.left + tablero.width * 0.4; x -= w) {
      if (tapados.some(o => x < o.right && x + w > o.left && y < o.bottom && y + h > o.top)) continue;
      const lugar = { x: x - tablero.left, y: y - tablero.top, w, h };
      (puntos.some(([a, b]) => enElMapa(x + w * a, y + h * b)) ? resto : libres).push(lugar);
    }
  }
  // Repartidos de arriba abajo: un lugar al azar por cada tramo
  const paso = libres.length / cantidad;
  const elegidos = paso >= 1
    ? Array.from({ length: cantidad }, (_, i) => {
        const desde = Math.floor(i * paso), hasta = Math.floor((i + 1) * paso);
        return libres[desde + Math.floor(Math.random() * (hasta - desde))];
      })
    : libres;
  return [...elegidos, ...resto].slice(0, cantidad);
}

function armarLeyenda() {
  $("#leyenda").replaceChildren(...CONFIG.regiones.map(r => {
    const li = crear("li");
    li.append(crear("b", "", r.id), r.nombre);
    return li;
  }));
}

// Cartel sobre el mapa: aparece y se va solo
function mostrarTarjeta(clase, etiqueta, titulo, texto) {
  const t = $("#tarjeta");
  t.className = `tarjeta nueva ${clase}`.trim();
  t.replaceChildren(crear("div", "eti", etiqueta), crear("h3", "", titulo), crear("p", "", texto));
  t.hidden = false;
  clearTimeout(timerTarjeta);
  timerTarjeta = setTimeout(() => {
    t.classList.add("sale");
    timerTarjeta = setTimeout(() => { t.hidden = true; }, 300);
  }, CONFIG.msTarjeta);
}

function actualizarCuenta() {
  const total = CONFIG.intentos;
  $("#cuenta").textContent = partida.terminada
    ? CONFIG.textos.terminaste
    : `Intento ${partida.resultados.length + 1} de ${total}`;
  $("#intentos").replaceChildren(...Array.from({ length: total }, (_, k) => crear("i", partida.resultados[k] || "")));
}

function quedan() {
  const n = CONFIG.intentos - partida.resultados.length;
  return n === 1 ? "Te queda 1 intento." : `Te quedan ${n} intentos.`;
}

function empezarPartida() {
  cancelarTimers();
  partida = { resultados: [], terminada: false };
  mostrar("juego");
  armarMapa($("#mapa"));
  armarLeyenda();
  armarBandeja();
  const t = CONFIG.textos.tarjetaInicial;
  mostrarTarjeta("", t.etiqueta, t.titulo, t.texto);
  actualizarCuenta();
}

// Arrastre: un solo dedo a la vez, los demás se ignoran
function empezarArrastre(e) {
  if (arrastre || partida.terminada || e.button !== 0) return;
  e.preventDefault();
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.getAnimations().forEach(a => a.cancel());
  const base = el.offsetParent.getBoundingClientRect();
  arrastre = { el, base, dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId, encima: null };
  el.style.width = el.offsetWidth + "px";
  el.classList.add("arrastrando");
  $("#totem").setPointerCapture(e.pointerId);
  mover(e);
  window.addEventListener("pointermove", mover);
  window.addEventListener("pointerup", soltar);
  window.addEventListener("pointercancel", soltar);
  window.addEventListener("lostpointercapture", soltar);
}

function cancelarArrastre() {
  if (!arrastre) return;
  window.removeEventListener("pointermove", mover);
  window.removeEventListener("pointerup", soltar);
  window.removeEventListener("pointercancel", soltar);
  window.removeEventListener("lostpointercapture", soltar);
  arrastre.encima?.classList.remove("encima");
  arrastre = null;
}

function regionBajo(x, y) {
  return document.elementsFromPoint(x, y).find(n => n.classList?.contains("region") && n.closest("#mapa")) || null;
}

// Región que toca el producto: primero el centro de la imagen, después sus bordes
function regionBajoFigura(el) {
  const r = el.querySelector("img").getBoundingClientRect();
  const puntos = [[0.5, 0.5], [0.5, 0.15], [0.5, 0.85], [0.15, 0.5], [0.85, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
  for (const [a, b] of puntos) {
    const reg = regionBajo(r.left + r.width * a, r.top + r.height * b);
    if (reg) return reg;
  }
  return null;
}

function puntoEnMapa(x, y) {
  const p = new DOMPoint(x, y).matrixTransform($("#mapa").getScreenCTM().inverse());
  return [p.x, p.y];
}

function mover(e) {
  if (!arrastre || e.pointerId !== arrastre.id) return;
  arrastre.el.style.left = (e.clientX - arrastre.base.left - arrastre.dx) + "px";
  arrastre.el.style.top = (e.clientY - arrastre.base.top - arrastre.dy) + "px";
  const reg = regionBajoFigura(arrastre.el);
  if (reg !== arrastre.encima) {
    arrastre.encima?.classList.remove("encima");
    reg?.classList.add("encima");
    arrastre.encima = reg;
  }
}

// El producto vuelve volando a su lugar en la bandeja
function devolver(el) {
  const antes = el.getBoundingClientRect();
  el.classList.remove("arrastrando");
  el.style.left = el.dataset.x;
  el.style.top = el.dataset.y;
  el.style.width = "";
  const despues = el.getBoundingClientRect();
  const vuelo = el.animate([
    { transform: `translate(${antes.left - despues.left}px, ${antes.top - despues.top}px) scale(1.2)` },
    { transform: "none" }
  ], { duration: 450, easing: "cubic-bezier(.3, 1.3, .5, 1)" });
  setTimeout(() => vuelo.finish(), 600);
}

function soltar(e) {
  if (!arrastre || e.pointerId !== arrastre.id) return;
  const { el } = arrastre;
  cancelarArrastre();
  const reg = e.type === "pointerup" ? regionBajoFigura(el) : null;
  if (!reg) {
    devolver(el);
    return;
  }
  const prod = CONFIG.productos.find(p => p.id === el.dataset.producto);
  const bien = Number(reg.dataset.region) === prod.region;
  partida.resultados.push(bien ? "bien" : "mal");
  const quedanProductos = $("#bandeja").children.length - (bien ? 1 : 0);
  partida.terminada = partida.resultados.length >= CONFIG.intentos || quedanProductos === 0;
  const img = el.querySelector("img").getBoundingClientRect();
  if (bien) acierto(el, reg, prod, puntoEnMapa(img.left + img.width / 2, img.top + img.height / 2));
  else error(el, reg, prod);
  actualizarCuenta();
  if (partida.terminada) programar(terminar, CONFIG.msAntesDelFinal);
}

function acierto(el, reg, prod, punto) {
  el.remove();
  reg.classList.add("lograda");
  $("#mapa").append(productoEnMapa(prod, punto));
  const region = regionDe(prod);
  const cierre = partida.terminada ? "" : ` ${quedan()}`;
  mostrarTarjeta("bien", `${CONFIG.textos.etiquetaAcierto} · ${region.nombre}`, prod.titulo, prod.texto + cierre);
}

function error(el, reg, prod) {
  devolver(el);
  reg.classList.add("error");
  programar(() => reg.classList.remove("error"), CONFIG.msMarcaError);
  const region = CONFIG.regiones.find(r => r.id === Number(reg.dataset.region));
  const texto = partida.terminada ? CONFIG.textos.sinIntentos : `Probá con otra región. ${quedan()}`;
  mostrarTarjeta("error", CONFIG.textos.etiquetaError, `${prod.etiqueta} no va en ${region.nombre}`, texto);
}

function terminar() {
  const aciertos = partida.resultados.filter(r => r === "bien").length;
  const finales = CONFIG.textos.finales;
  const final = finales.find(f => aciertos >= f.desde && aciertos <= f.hasta) || finales[finales.length - 1];
  $("#final-resultado").textContent = `Acertaste ${aciertos} de ${partida.resultados.length}`;
  $("#final-titulo").textContent = final.titulo;
  $("#final-texto").textContent = final.texto;
  const colores = CONFIG.papelitos;
  $("#papelitos").replaceChildren(...(aciertos >= 2 ? Array.from({ length: 40 }, (_, i) => {
    const p = crear("i");
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colores[i % colores.length];
    p.style.animationDelay = `${Math.random() * 0.9}s`;
    return p;
  }) : []));
  mostrar("final");
  programar(volverAlInicio, CONFIG.segundos.final * 1000);
}

function volverAlInicio() {
  cancelarTimers();
  cancelarArrastre();
  mostrar("inicio");
  programar(mostrarMuestra, CONFIG.segundos.inicio * 1000);
}

// Inactividad en las condiciones o en el juego: vuelve al inicio
function vigilarInactividad() {
  document.addEventListener("pointerdown", () => { ultimoToque = Date.now(); }, true);
  setInterval(() => {
    const quieto = Date.now() - ultimoToque > CONFIG.segundos.inactividad * 1000;
    if (quieto && !arrastre && (pantallaActual === "juego" || pantallaActual === "condiciones")) volverAlInicio();
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

// Si cambia el tamaño de la pantalla en pleno juego, se reubican los productos que quedan
window.addEventListener("resize", () => {
  if (pantallaActual === "juego" && !arrastre) ubicarProductos([...$("#bandeja").children]);
});

// Revisión del contenido al cargar: avisa en la consola lo que haría fallar el juego
function revisarConfig() {
  const avisar = (m) => console.warn(`CONFIG: ${m}`);
  const ids = CONFIG.productos.map(p => p.id);
  const regiones = new Set(CONFIG.regiones.map(r => r.id));
  if (!CONFIG.productos.length) avisar("no hay productos");
  ids.filter((id, i) => ids.indexOf(id) !== i).forEach(id => avisar(`producto repetido: ${id}`));
  CONFIG.productos.filter(p => !regiones.has(p.region)).forEach(p => avisar(`"${p.id}" apunta a la región ${p.region}, que no existe`));
  for (let n = 0; n <= CONFIG.intentos; n++) {
    if (!CONFIG.textos.finales.some(f => n >= f.desde && n <= f.hasta)) avisar(`ningún mensaje final cubre ${n} aciertos`);
  }
}

// Tótem: sin menú del toque largo
document.addEventListener("contextmenu", (e) => e.preventDefault());

$("#inicio").addEventListener("click", mostrarMuestra);
$("#muestra").addEventListener("click", irACondiciones);
$("#empezar").addEventListener("click", () => { if (CONFIG.productos.length) empezarPartida(); });
$("#volver-juego").addEventListener("click", volverAlInicio);
$("#volver-final").addEventListener("click", volverAlInicio);

revisarConfig();
cargarTextos();
vigilarInactividad();
activarReinicioOculto();
volverAlInicio();
