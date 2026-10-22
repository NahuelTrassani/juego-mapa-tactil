const $ = (s) => document.querySelector(s);
const SVGNS = "http://www.w3.org/2000/svg";

let partida = null;
let arrastre = null;
let pantallaActual = "inicio";
let ultimoToque = Date.now();
let timers = [];
let timerTarjeta = null;
let repaso = false;

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
  $("#totem").dataset.pantalla = id;
  ultimoToque = Date.now();
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

// El sticker colocado no puede sobresalir de su región: si sobresale, se corre hacia adentro
function dentroDeRegion(reg, [x, y]) {
  const m = CONFIG.mapa.tamProducto * 0.38;
  const adentro = (px, py) => reg.isPointInFill(new DOMPoint(px, py));
  const cabe = (px, py) => [[0, 0], [-m, -m], [m, -m], [-m, m], [m, m]].every(([dx, dy]) => adentro(px + dx, py + dy));
  if (cabe(x, y)) return [x, y];
  const b = reg.getBBox();
  let centro = [b.x + b.width / 2, b.y + b.height / 2];
  if (!cabe(...centro)) {
    let mejor = null;
    for (let i = 1; i < 30; i++) for (let j = 1; j < 30; j++) {
      const px = b.x + b.width * i / 30, py = b.y + b.height * j / 30;
      if (cabe(px, py)) { const d = (px - x) ** 2 + (py - y) ** 2; if (!mejor || d < mejor[2]) mejor = [px, py, d]; }
    }
    if (mejor) centro = [mejor[0], mejor[1]];
  }
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const px = x + (centro[0] - x) * t, py = y + (centro[1] - y) * t;
    if (cabe(px, py)) return [px, py];
  }
  return centro;
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
  repaso = false;
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
  if (repaso) {
    repaso = false;
    mostrar("juego");
    return;
  }
  mostrar("condiciones");
}

// Flecha de atrás: vuelve una pantalla; desde el juego muestra el mapa completo y retoma la partida
function repasarMapa() {
  for (const r of document.querySelectorAll("#mapa .region.error")) r.classList.remove("error");
  $("#tarjeta").hidden = true;
  mostrarMuestra();
  repaso = true;
}

function irAtras() {
  if (pantallaActual === "muestra") volverAlInicio();
  else if (pantallaActual === "condiciones") mostrarMuestra();
  else if (pantallaActual === "juego" && !partida.terminada) repasarMapa();
  else if (pantallaActual === "final") volverAlInicio();
}

// Juego
function armarBandeja() {
  const bandeja = $("#bandeja");
  bandeja.replaceChildren();
  const { min, max } = CONFIG.productosPorPartida;
  const cantidad = Math.min(CONFIG.productos.length, min + Math.floor(Math.random() * (max - min + 1)));
  const botones = mezclar(CONFIG.productos).slice(0, cantidad).map(prod => {
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
  const { width: ancho, height: alto } = $(".tablero").getBoundingClientRect();
  const azar = (min, max) => min + Math.random() * (max - min);
  botones.forEach((b, i) => {
    const { x, y, w, h } = lugares[i % lugares.length] || { x: 0, y: 0, w: tam.width, h: tam.height };
    b.dataset.x = `${(x + azar(0, 0.08) * w) / ancho * 100}%`;
    b.dataset.y = `${(y + azar(0, 0.05) * h) / alto * 100}%`;
    b.style.left = b.dataset.x;
    b.style.top = b.dataset.y;
    b.style.setProperty("--giro", `${azar(-8, 8)}deg`);
  });
}

// Lugares en el espacio libre a la derecha del mapa, sin tocar regiones, la leyenda ni el botón
function lugaresLibres(tam, cantidad) {
  const tablero = $(".tablero").getBoundingClientRect();
  if (!tablero.width || !tablero.height || !tam.width || !tam.height) return [];
  const svg = $("#mapa");
  const inversa = svg.getScreenCTM().inverse();
  const regiones = [...svg.querySelectorAll(".region")];
  const tapados = [...[$("#leyenda"), $("#volver-juego")].map(e => e.getBoundingClientRect()), ...zonasOcupadas()];
  const PASO = tablero.width / 80;
  const cols = Math.ceil(tablero.width / PASO), filas = Math.ceil(tablero.height / PASO);

  // Ocupación de la pantalla en celdas chicas (mapa, leyenda y botón), con sumas acumuladas para consultar rectángulos rápido
  const suma = Array.from({ length: filas + 1 }, () => new Int32Array(cols + 1));
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < cols; c++) {
      const x = tablero.left + (c + 0.5) * PASO, y = tablero.top + (f + 0.5) * PASO;
      const p = new DOMPoint(x, y).matrixTransform(inversa);
      const ocupada = regiones.some(r => r.isPointInFill(p)) || tapados.some(o => x >= o.left && x <= o.right && y >= o.top && y <= o.bottom);
      suma[f + 1][c + 1] = (ocupada ? 1 : 0) + suma[f][c + 1] + suma[f + 1][c] - suma[f][c];
    }
  }
  const libre = (x, y, w, h) => {
    const c0 = Math.max(0, Math.floor(x / PASO) - 1), f0 = Math.max(0, Math.floor(y / PASO) - 1);
    const c1 = Math.min(cols, Math.ceil((x + w) / PASO) + 1), f1 = Math.min(filas, Math.ceil((y + h) / PASO) + 1);
    return suma[f1][c1] - suma[f0][c1] - suma[f1][c0] + suma[f0][c0] === 0;
  };

  // Lugares posibles a la derecha (el área incluye el corrimiento al azar)
  const w = tam.width * 1.1, h = tam.height * 1.06;
  const posibles = [];
  const zonas = zonasOcupadas();
  const limite = zonas.length ? Math.min(...zonas.map(z => z.top)) - tablero.top : tablero.height;
  for (let y = 0; y + h <= limite; y += PASO) {
    for (let x = tablero.width - w; x >= tablero.width * 0.4; x -= PASO) {
      if (libre(x, y, w, h)) posibles.push({ x, y, w: tam.width, h: tam.height });
    }
  }

  // Elegidos al azar sin pisarse entre sí
  const separados = (a, b) => a.x + w <= b.x || b.x + w <= a.x || a.y + h <= b.y || b.y + h <= a.y;
  // Varios intentos de reparto al azar; se queda con el primero donde entran todos (o el que más ubicó)
  let mejor = [];
  for (let intento = 0; intento < 40 && mejor.length < cantidad; intento++) {
    const elegidos = [];
    for (const lugar of mezclar(posibles)) {
      if (elegidos.every(o => separados(lugar, o))) elegidos.push(lugar);
      if (elegidos.length === cantidad) break;
    }
    if (elegidos.length > mejor.length) mejor = elegidos;
  }
  return mejor;
}

// Zonas del dibujo que no pueden taparse (la leyenda del mapa), en coordenadas de pantalla
function zonasOcupadas() {
  const ctm = $("#mapa").getScreenCTM();
  return (CONFIG.mapa.zonasOcupadas || []).map(([x0, y0, x1, y1]) => {
    const a = new DOMPoint(x0, y0).matrixTransform(ctm), b = new DOMPoint(x1, y1).matrixTransform(ctm);
    return { left: a.x, top: a.y, right: b.x, bottom: b.y };
  });
}

function armarLeyenda() {
  $("#leyenda").hidden = !CONFIG.mostrarLeyenda;
  $("#leyenda").replaceChildren(...CONFIG.regiones.map(r => {
    const li = crear("li");
    li.append(crear("b", "", r.id), r.nombre);
    return li;
  }));
}

// Cartel: 3 s quieto en el medio, después sube desvaneciéndose (2 s) y se va. Con fija: true queda en el medio (último intento)
function mostrarTarjeta(clase, etiqueta, titulo, texto, fija = false, lectura = CONFIG.msTarjetaLectura) {
  const t = $("#tarjeta");
  t.className = `tarjeta nueva ${clase}`.trim();
  t.replaceChildren(...[etiqueta && crear("div", "eti", etiqueta), crear("h3", "", titulo), texto && crear("p", "", texto)].filter(Boolean));
  t.hidden = false;
  clearTimeout(timerTarjeta);
  if (fija) return;
  timerTarjeta = setTimeout(() => {
    t.style.setProperty("--salida", `${CONFIG.msTarjetaSalida}ms`);
    t.classList.add("se-va");
    timerTarjeta = setTimeout(() => { t.hidden = true; }, CONFIG.msTarjetaSalida);
  }, lectura);
}

function actualizarCuenta() {
  const total = CONFIG.intentos;
  $("#cuenta").textContent = partida.terminada
    ? CONFIG.textos.terminaste
    : `Intento ${partida.resultados.length + 1} de ${total}`;
  $("#intentos").replaceChildren(...Array.from({ length: total }, (_, k) => crear("i", partida.resultados[k] || "")));
}

function empezarPartida() {
  cancelarTimers();
  partida = { resultados: [], terminada: false };
  $("#bandeja").classList.remove("apagada");
  mostrar("juego");
  armarMapa($("#mapa"));
  armarLeyenda();
  armarBandeja();
  const t = CONFIG.textos.tarjetaInicial;
  mostrarTarjeta("", t.etiqueta, t.titulo, t.texto, false, CONFIG.msTarjetaInicial);
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
  const grilla = [0.1, 0.3, 0.5, 0.7, 0.9];
  const puntos = [[0.5, 0.5], ...grilla.flatMap(a => grilla.map(b => [a, b]))];
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

// Fuera del mapa queda donde lo soltaron, acomodado dentro del tablero; si tapa la leyenda, el botón u otro producto, vuelve a su último lugar
function dejarDondeLoSoltaron(el) {
  const r = el.getBoundingClientRect();
  const tablero = $(".tablero").getBoundingClientRect();
  const x = Math.min(Math.max(r.left, tablero.left), tablero.right - r.width);
  const y = Math.min(Math.max(r.top, tablero.top), tablero.bottom - r.height);
  const choca = (o) => x < o.right && x + r.width > o.left && y < o.bottom && y + r.height > o.top;
  const otros = [...$("#bandeja").children].filter(f => f !== el);
  const obstaculos = [...[$("#leyenda"), $("#volver-juego"), ...otros].map(o => o.getBoundingClientRect()), ...zonasOcupadas()];
  if (!obstaculos.some(choca)) {
    el.dataset.x = `${(x - tablero.left) / tablero.width * 100}%`;
    el.dataset.y = `${(y - tablero.top) / tablero.height * 100}%`;
  }
  devolver(el);
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
    if (e.type === "pointerup") dejarDondeLoSoltaron(el);
    else devolver(el);
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
  if (partida.terminada) {
    $("#bandeja").classList.add("apagada");
    programar(terminar, CONFIG.msAntesDelFinal);
    // Un toque en la pantalla pasa al resultado sin esperar
    $("#juego").addEventListener("pointerdown", () => {
      if (pantallaActual === "juego" && partida.terminada) {
        cancelarTimers();
        terminar();
      }
    }, { once: true });
  }
}

function acierto(el, reg, prod, punto) {
  el.remove();
  reg.classList.add("lograda");
  $("#mapa").append(productoEnMapa(prod, dentroDeRegion(reg, punto)));
  mostrarTarjeta("bien", "", CONFIG.textos.acierto, partida.terminada ? CONFIG.textos.vamosAlResultado : "", partida.terminada);
}

function error(el, reg, prod) {
  devolver(el);
  reg.classList.add("error");
  programar(() => reg.classList.remove("error"), CONFIG.msMarcaError);
  mostrarTarjeta("error", "", CONFIG.textos.error, partida.terminada ? CONFIG.textos.vamosAlResultado : "", partida.terminada);
}

function terminar() {
  const aciertos = partida.resultados.filter(r => r === "bien").length;
  const finales = CONFIG.textos.finales;
  const final = finales.find(f => aciertos >= f.desde && aciertos <= f.hasta) || finales[finales.length - 1];
  $("#final-resultado").hidden = !CONFIG.mostrarResultado;
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
  repaso = false;
  mostrar("inicio");
  programar(mostrarMuestra, CONFIG.segundos.inicio * 1000);
}

// Inactividad: en condiciones a los 30 s y en el juego al minuto, vuelve al inicio
function vigilarInactividad() {
  document.addEventListener("pointerdown", () => { ultimoToque = Date.now(); }, true);
  setInterval(() => {
    const limite = pantallaActual === "condiciones" ? CONFIG.segundos.condiciones : CONFIG.segundos.inactividad;
    const quieto = Date.now() - ultimoToque > limite * 1000;
    if (quieto && !arrastre && (pantallaActual === "juego" || pantallaActual === "condiciones")) volverAlInicio();
  }, 2000);
}

// Esquina oculta: arriba a la derecha 5 s cierra el juego
function activarEsquinaOculta(z, ms, accion) {
  let timer = null;
  const cortar = () => { clearTimeout(timer); timer = null; z.classList.remove("sosteniendo"); };
  z.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    try { z.setPointerCapture(e.pointerId); } catch {}
    z.classList.add("sosteniendo");
    timer = setTimeout(() => { cortar(); accion(); }, ms);
  });
  z.addEventListener("pointerup", cortar);
  z.addEventListener("pointerleave", cortar);
  z.addEventListener("pointercancel", cortar);
}

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

// Precarga: las imágenes quedan listas mientras se ve el inicio, así no tardan la primera vez
const precargadas = [CONFIG.mapa.imagen, CONFIG.muestra.imagen, ...CONFIG.productos.map(p => p.imagen)].filter(Boolean).map(u => {
  const img = new Image();
  img.src = u;
  img.decode().catch(() => {});
  return img;
});

revisarConfig();
cargarTextos();
vigilarInactividad();
$("#atras").addEventListener("click", irAtras);
activarEsquinaOculta($("#cierre-oculto"), 5000, () => window.close());
volverAlInicio();
