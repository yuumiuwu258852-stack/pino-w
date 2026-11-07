/* ===================================================================
   PINO-W en terreno (prefijo ap-) · 07-11-2026, pedido de Karen

   PINO-W en el celular para quien trabaja en terreno: su jornada, su AST,
   los documentos que firma, la Bandeja y los avisos de seguridad. Usa el
   mismo servidor que el programa de escritorio y sus mismas reglas: no se
   agrega nada que suba solo.

   PARA QUE NO SE PEGUE (pedido de Karen)
   · La app queda guardada en el teléfono (sw.js): abre sin esperar a internet.
   · Muestra al tiro lo último que trajo y actualiza por detrás. El servidor
     gratis se duerme tras 15 minutos sin uso: la primera respuesta puede
     tardar hasta un minuto, y mientras tanto se puede seguir usando.
   · Los avisos (accidente, peligro, dolencia) y las constancias de lectura
     van a una cola que se reintenta sola cuando hay señal.
   · Lo que se firma con la clave no se guarda en la cola: la clave nunca se
     guarda. Si no hay señal, se avisa y se vuelve a intentar a mano.
   · Las fotos se achican en el teléfono antes de subirlas.

   Lo que trae del servidor queda en el teléfono (para mostrarlo sin señal)
   solo mientras la sesión está abierta: «Salir» lo borra todo.
   =================================================================== */

(function () {
  "use strict";

  // Abierta desde este computador (pruebas) habla con un servidor de prueba, nunca con el publicado
  var LOCAL = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  var SERVIDOR = LOCAL ? "http://127.0.0.1:8013" : "https://pino-w-servidor.onrender.com";
  var ESPERA = 95000;                // el servidor gratis puede tardar en despertar
  var AVISAR_LENTO = 3500;           // pasado esto se muestra «Conectando…»
  var CLAVES = { sesion: "pinow.sesion", datos: "pinow.datos", cola: "pinow.cola", recordar: "pinow.recordar" };

  var EPP_AST = ["Casco", "Lentes de seguridad", "Guantes", "Zapatos de seguridad", "Protector auditivo", "Respirador", "Arnés", "Ropa de alta visibilidad"];
  var VERIFICA_AST = [["procedimiento", "Conozco el procedimiento de la tarea"], ["condiciones", "Revisé las condiciones del lugar antes de empezar"],
    ["epp", "Tengo y uso el EPP que la tarea exige"], ["emergencia", "Sé qué hacer en una emergencia y dónde está la zona de seguridad"]];
  var REPORTES = [["condicion", "Condición insegura"], ["acto", "Acto o conducta insegura"], ["falla", "Falla de equipo"], ["incidente", "Incidente sin lesión"]];
  var CLASES_PROG = { charla: "Charla de 5 minutos", capacitacion: "Capacitación", otra: "Actividad" };
  var CLASES_FIRMA = { epp: "Recepción de EPP", odi: "Información de los riesgos (ODI)", riohs: "Recepción del Reglamento Interno", capacitacion: "Asistencia a una capacitación" };
  // Los mismos textos que el programa de escritorio (bandeja.js): Dictamen 0789/15 de la Dirección del Trabajo
  var CONSENTIMIENTO_SI = "Acepto que mi documentación de seguridad y salud en el trabajo (entrega de elementos de protección personal, " +
    "información de los riesgos, recepción del Reglamento Interno y asistencia a capacitaciones) se confeccione, firme y me sea enviada " +
    "en forma electrónica, con copia a mi correo personal.";
  var CONSENTIMIENTO_NO = "Prefiero que mi documentación de seguridad y salud en el trabajo se haga en papel.";
  var AVISOS = [
    { tipo: "accidente", titulo: "Avisar un accidente", texto: "Llega al tiro a los administradores y a prevención.", rojo: true, foto: true },
    { tipo: "interrupcion", titulo: "Avisar riesgo grave", texto: "Interrumpí el trabajo por un riesgo grave e inminente.", rojo: true, foto: true },
    { tipo: "alto_potencial", titulo: "Incidente de alto potencial", texto: "Pudo herir gravemente, aunque nadie se lesionó.", rojo: true, foto: true },
    { tipo: "reporte_peligro", titulo: "Reportar un peligro", texto: "Una condición o un acto inseguro, una falla. Te responde tu supervisor.", foto: true, noJefe: true },
    { tipo: "dolencia", titulo: "Avisar una dolencia", texto: "Una molestia que puede venir del trabajo. La ve solo prevención.", noJefe: true }
  ];

  var raiz = document.getElementById("app");
  var estado = {
    sesion: null, empresas: null, empresa: null, datos: null, actualizado: "", pendientes: 0, lento: false, sinRed: false,
    pantalla: "entrar", mensaje: null, filtro: "hacer", ocupado: false, foto: null, astModo: "digital", astPasos: 3, instalar: null
  };

  /* ================= GUARDAR EN EL TELÉFONO ================= */

  function almacen() {
    try { return localStorage.getItem(CLAVES.recordar) === "1" ? localStorage : sessionStorage; } catch (e) { return null; }
  }
  function leerJson(clave) {
    var a = almacen();
    try { return a ? JSON.parse(a.getItem(clave) || "null") : null; } catch (e) { return null; }
  }
  function guardarJson(clave, valor) {
    var a = almacen();
    try { if (a) { a.setItem(clave, JSON.stringify(valor)); } } catch (e) { /* sin espacio: se sigue sin guardar */ }
  }
  function borrarTodo() {
    [localStorage, sessionStorage].forEach(function (a) {
      try { Object.keys(CLAVES).forEach(function (k) { a.removeItem(CLAVES[k]); }); } catch (e) { /* nada */ }
    });
  }

  /* ================= EL SERVIDOR ================= */

  function api(metodo, ruta, cuerpo) {
    var control = typeof AbortController === "function" ? new AbortController() : null;
    var reloj = setTimeout(function () { if (control) { control.abort(); } }, ESPERA);
    var lento = setTimeout(function () { estado.lento = true; pintarRed(); }, AVISAR_LENTO);
    estado.pendientes++;
    var cabeceras = { "Content-Type": "application/json" };
    if (estado.sesion && estado.sesion.credencial) { cabeceras.Authorization = "Bearer " + estado.sesion.credencial; }
    function fin() {
      clearTimeout(reloj); clearTimeout(lento);
      estado.pendientes = Math.max(0, estado.pendientes - 1);
      if (!estado.pendientes) { estado.lento = false; }
      pintarRed();
    }
    return fetch(SERVIDOR + ruta, { method: metodo, headers: cabeceras, body: cuerpo ? JSON.stringify(cuerpo) : undefined, signal: control ? control.signal : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          fin();
          estado.sinRed = false;
          if (r.status === 401 && estado.sesion && ruta !== "/api/cuentas/ingreso") {
            salir("Tu sesión venció. Entra de nuevo.");
            throw { estado: 401, detalle: "Tu sesión venció." };
          }
          if (!r.ok) { throw { estado: r.status, detalle: detalle(d) }; }
          return d;
        });
      }, function () {
        fin();
        estado.sinRed = true;
        pintarRed();
        throw { estado: 0, detalle: "No hay conexión con PINO-W. Revisa tu señal." };
      });
  }
  function detalle(d) {
    if (d && typeof d.detail === "string") { return d.detail; }
    if (d && Array.isArray(d.detail) && d.detail[0]) { return "Revisa los datos: " + (d.detail[0].msg || "falta algo"); }
    return "No se pudo hacer. Intenta de nuevo.";
  }

  /* La cola: lo que se manda sin clave y se reintenta solo cuando hay señal */
  function cola() { return leerJson(CLAVES.cola) || []; }
  function encolar(item) {
    var c = cola();
    item.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    item.creado = new Date().toISOString();
    c.push(item);
    guardarJson(CLAVES.cola, c);
    procesarCola();
  }
  var procesando = false;
  function procesarCola() {
    if (procesando || !estado.sesion) { return; }
    var c = cola(), item = c.filter(function (x) { return !x.error; })[0];
    if (!item) { return; }
    procesando = true;
    api(item.metodo, item.ruta, item.cuerpo).then(function () {
      guardarJson(CLAVES.cola, cola().filter(function (x) { return x.id !== item.id; }));
      procesando = false;
      if (item.aviso) { avisar(item.aviso + " Ya llegó.", "bien"); }
      traer();
      procesarCola();
    }, function (e) {
      procesando = false;
      if (e.estado && e.estado !== 401) {
        // El servidor lo rechazó: no se reintenta solo, se muestra para corregir o borrar
        var c2 = cola();
        c2.forEach(function (x) { if (x.id === item.id) { x.error = e.detalle; } });
        guardarJson(CLAVES.cola, c2);
        pintar();
      }
    });
  }
  window.addEventListener("online", procesarCola);
  setInterval(function () { if (document.visibilityState === "visible") { procesarCola(); } }, 30000);

  /* ================= LO QUE SE TRAE ================= */

  function traer() {
    if (!estado.sesion) { return Promise.resolve(); }
    return api("GET", "/api/empresas/mias").then(function (r) {
      estado.empresas = r.empresas || [];
      var activas = estado.empresas.filter(function (e) { return e.activa !== false; });
      var guardada = (leerJson(CLAVES.datos) || {}).empresaId;
      estado.empresa = activas.filter(function (e) { return e.id === guardada; })[0] || (activas.length === 1 ? activas[0] : estado.empresa);
      if (!estado.empresa || estado.empresa.estadoMiembro === "pendiente") { pintar(); return null; }
      return api("GET", "/api/bandeja/empresa/" + estado.empresa.id).then(function (b) {
        estado.datos = b;
        estado.actualizado = new Date().toISOString();
        guardarJson(CLAVES.datos, { empresaId: estado.empresa.id, empresas: estado.empresas, datos: b, actualizado: estado.actualizado,
                                    vistos: (leerJson(CLAVES.datos) || {}).vistos || {} });
        pintar();
      });
    }).catch(function () { pintar(); });
  }

  function vistos() { return (leerJson(CLAVES.datos) || {}).vistos || {}; }
  function marcarVisto(id) {
    var d = leerJson(CLAVES.datos);
    if (!d) { return; }
    d.vistos = d.vistos || {};
    d.vistos[id] = 1;
    guardarJson(CLAVES.datos, d);
  }

  /* ================= UTILIDADES ================= */

  function esc(t) {
    return String(t === undefined || t === null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function dos(n) { return String(n).padStart(2, "0"); }
  function hoyIso() { var f = new Date(); return f.getFullYear() + "-" + dos(f.getMonth() + 1) + "-" + dos(f.getDate()); }
  var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function cuando(iso) {
    var f = new Date(iso);
    if (isNaN(f.getTime())) { return ""; }
    var hora = dos(f.getHours()) + ":" + dos(f.getMinutes());
    if (f.toDateString() === new Date().toDateString()) { return hora; }
    if (f.toDateString() === new Date(Date.now() - 86400000).toDateString()) { return "Ayer"; }
    return f.getDate() + " " + MESES[f.getMonth()];
  }
  function diaLindo(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? p[2] + "-" + p[1] + "-" + p[0] : ""; }
  function g(x) { return x.gestion || {}; }
  function yo() { return (estado.datos && estado.datos.yo) || (estado.sesion && estado.sesion.usuario && estado.sesion.usuario.id); }
  function envios() { return (estado.datos && estado.datos.envios) || []; }
  function envio(id) { return envios().filter(function (x) { return x.id === Number(id); })[0]; }
  function administra() { return estado.datos && estado.datos.rol === "jefe"; }
  function lleno(t) { return String(t || "").trim() !== ""; }
  /* El aviso se escribe en su lugar, sin repintar: así no se borra lo que la persona estaba escribiendo */
  function avisar(texto, clase) {
    estado.mensaje = texto ? { texto: texto, clase: clase || "", cuando: Date.now() } : null;
    var caja = document.getElementById("ap-msg");
    if (!caja) { pintar(); return; }
    caja.innerHTML = mensajeTexto();
    if (texto && caja.getBoundingClientRect().top < 0) { caja.scrollIntoView({ block: "start" }); }
  }
  function mensajeTexto() { return estado.mensaje ? '<p class="ap-mensaje ' + estado.mensaje.clase + '" role="status">' + esc(estado.mensaje.texto) + "</p>" : ""; }
  function mensajeHtml() { return '<div id="ap-msg">' + mensajeTexto() + "</div>"; }
  /* Mientras se envía: el botón lo dice y no se puede apretar dos veces */
  function ocupar(si, texto) {
    estado.ocupado = si;
    var b = document.querySelector('#ap-form [type="submit"]');
    if (!b) { return; }
    if (si) { b.dataset.texto = b.dataset.texto || b.textContent; b.textContent = texto || "Enviando…"; }
    else if (b.dataset.texto) { b.textContent = b.dataset.texto; }
    b.disabled = si;
  }
  function ico(d, lado) {
    return '<svg width="' + (lado || 22) + '" height="' + (lado || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  }
  var ICONOS = {
    hoy: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.8v3.4M15.5 3.8v3.4"/>',
    bandeja: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.8 6.5l8.2 6 8.2-6"/>',
    avisar: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.4h.01"/>',
    cuenta: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    volver: '<path d="M14.5 6l-6 6 6 6"/>'
  };

  /* Lo que espera algo de mí */
  function porHacer() {
    var mio = yo();
    return envios().filter(function (x) {
      if (x.tipo === "ast_cuadrilla") { return g(x).destinatarioId === mio && (x.estado === "pendiente" || x.estado === "devuelto"); }
      if (x.tipo === "firma_trabajador") { return g(x).destinatarioId === mio && x.estado === "pendiente"; }
      if (x.grupo === "directo") { return g(x).destinatarioId === mio && x.estado === "pendiente"; }
      return x.publico && x.leido === false;
    });
  }
  function accionDe(x) {
    if (x.tipo === "ast_cuadrilla") { return ["#ast/" + x.id, x.estado === "devuelto" ? "Corregir" : "Rellenar"]; }
    if (x.tipo === "firma_trabajador") { return ["#firmar/" + x.id, "Firmar"]; }
    return ["#ver/" + x.id, x.publico ? "Leer" : "Ver"];
  }
  function etiqueta(x) {
    if (x.grupo === "urgente") { return ["Urgente", "rojo"]; }
    if (x.tipo === "ast_cuadrilla") { return ["AST", ""]; }
    if (x.tipo === "firma_trabajador") { return [x.estado === "pendiente" ? "Por firmar" : x.estado === "firmado" ? "Firmado" : "Objetado", x.estado === "firmado" ? "verde" : "ambar"]; }
    if (x.grupo === "directo") { return ["Documento", ""]; }
    if (x.publico || x.grupo === "comunicar") { return ["Comunicado", "verde"]; }
    if (x.grupo === "reporte") { return ["Reporte", "ambar"]; }
    if (x.grupo === "salud") { return ["Dolencia", "ambar"]; }
    return [x.estadoNombre || "Envío", ""];
  }

  /* ================= PANTALLAS ================= */

  function pintarRed() {
    var r = document.getElementById("ap-red");
    if (!r) { return; }
    var cuantos = cola().filter(function (x) { return !x.error; }).length;
    var texto = estado.sinRed ? "Sin conexión con PINO-W. Ves lo último que se trajo" + (estado.actualizado ? " (" + cuando(estado.actualizado) + ")" : "") + "."
      : estado.lento ? "Conectando con PINO-W… si estuvo un rato sin uso puede tardar hasta un minuto. Puedes seguir usando la app." : "";
    if (cuantos) { texto += (texto ? " " : "") + (cuantos === 1 ? "1 aviso esperando señal para enviarse." : cuantos + " avisos esperando señal para enviarse."); }
    r.hidden = !texto;
    r.className = "ap-red" + (estado.sinRed ? " mal" : "");
    r.textContent = texto;
  }

  function marco(contenido, pestana) {
    var n = porHacer().length;
    var tab = function (h, nombre, icono, extra) {
      return '<a href="' + h + '" class="' + (pestana === h.slice(1) ? "activo " : "") + (extra || "") + '">' + ico(ICONOS[icono]) + nombre +
        (icono === "hoy" && n ? '<b class="ap-num">' + n + "</b>" : "") + "</a>";
    };
    return '<header class="ap-arriba"><span class="ap-logo">PINO<span>-W</span></span>' +
        "<small>" + esc(estado.empresa ? estado.empresa.nombre : "") + "<br>" + esc((estado.empresa && (estado.empresa.puestoNombre || (estado.empresa.rol === "jefe" ? "Administración" : ""))) || "") + "</small>" +
        '<button type="button" class="ap-enlace ap-derecha" data-ap="actualizar">Actualizar</button></header>' +
      '<p class="ap-red" id="ap-red" hidden></p>' +
      '<main class="ap-cuerpo">' + mensajeHtml() + contenido + "</main>" +
      '<nav class="ap-abajo" aria-label="Secciones">' + tab("#hoy", "Hoy", "hoy") + tab("#bandeja", "Bandeja", "bandeja") +
        tab("#avisar", "Avisar", "avisar", "rojo") + tab("#cuenta", "Cuenta", "cuenta") + "</nav>";
  }

  function hoyHtml() {
    var nombre = ((estado.sesion.usuario || {}).nombre || "").split(" ")[0];
    var hacer = porHacer();
    var agenda = envios().filter(function (x) { return x.grupo === "agenda" && g(x).fecha === hoyIso(); })
      .sort(function (a, b) { return String(g(a).hora).localeCompare(String(g(b).hora)); });
    var h = '<h1 class="ap-titulo">Hola, ' + esc(nombre) + "</h1>" +
      '<p class="ap-sub">' + diaLindo(hoyIso()) + (estado.actualizado ? " · al día a las " + esc(cuando(estado.actualizado)) : " · trayendo lo tuyo…") + "</p>";
    var sinDecidir = !administra() && estado.datos && !estado.datos.miConsentimiento;
    h += '<section class="ap-tarjeta"><h2>Por hacer</h2>' + (sinDecidir ? '<div class="ap-hacer"><span class="ap-texto"><b>Tu decisión sobre la documentación electrónica</b>' +
      '<em>Para firmar desde el teléfono tu EPP, la ODI y las capacitaciones</em></span><a href="#consentimiento">Decidir</a></div>' : "") +
      (hacer.length ? hacer.map(function (x) {
      var a = accionDe(x);
      return '<div class="ap-hacer"><span class="ap-texto"><b>' + esc(x.titulo) + "</b><em>" + esc(x.tipoNombre) + " · " + esc(x.autor) + "</em></span>" +
        '<a href="' + a[0] + '">' + a[1] + "</a></div>";
    }).join("") : sinDecidir ? "" : '<p class="ap-vacio">Nada pendiente. ¡Buen turno!</p>') + "</section>";
    h += '<section class="ap-tarjeta"><h2>Tu jornada de hoy</h2>' + (agenda.length ? '<ul class="ap-lista">' + agenda.map(function (x) {
      return '<li><a class="ap-item" href="#ver/' + x.id + '"><span class="ap-texto"><b>' + esc(x.titulo) + "</b><em>" +
        esc((CLASES_PROG[g(x).clase] || "Actividad") + (g(x).lugar ? " · " + g(x).lugar : "")) + '</em></span><span class="ap-hora">' + esc(g(x).hora || "") + "</span></a></li>";
    }).join("") + "</ul>" : '<p class="ap-vacio">No tienes charlas ni capacitaciones programadas para hoy.</p>') + "</section>";
    h += '<a class="ap-boton rojo" href="#avisar">' + ico(ICONOS.avisar, 20) + "Avisar un peligro o un accidente</a>";
    return h;
  }

  function bandejaHtml() {
    var mio = yo(), vis = vistos();
    var lista = envios().filter(function (x) { return x.tipo !== "consentimiento"; });
    if (estado.filtro === "hacer") {
      var ids = porHacer().map(function (x) { return x.id; });
      lista = lista.filter(function (x) { return ids.indexOf(x.id) !== -1; });
    }
    lista.sort(function (a, b) { return String(b.creado).localeCompare(String(a.creado)); });
    return '<h1 class="ap-titulo">Bandeja</h1>' +
      '<div class="ap-chips"><button type="button" data-ap="filtro" data-filtro="hacer" class="' + (estado.filtro === "hacer" ? "elegido" : "") + '">Por hacer</button>' +
        '<button type="button" data-ap="filtro" data-filtro="todo" class="' + (estado.filtro === "todo" ? "elegido" : "") + '">Todo</button></div>' +
      '<section class="ap-tarjeta">' + (lista.length ? '<ul class="ap-lista">' + lista.slice(0, 150).map(function (x) {
        var et = etiqueta(x), nuevo = x.autorId !== mio && !vis[x.id] && (x.leido === false || x.leido === undefined);
        return '<li><a class="ap-item" href="#ver/' + x.id + '"><span class="ap-punto' + (nuevo ? " si" : "") + '"></span>' +
          '<span class="ap-texto"><b>' + esc(x.titulo) + "</b><em>" + esc(x.autorId === mio ? "Enviado por ti" : x.autor) + "</em></span>" +
          '<span class="ap-hora"><span class="ap-etiqueta ' + et[1] + '">' + esc(et[0]) + "</span><br>" + esc(cuando(x.creado)) + "</span></a></li>";
      }).join("") + "</ul>" : '<p class="ap-vacio">' + (estado.filtro === "hacer" ? "No tienes nada por hacer." : "Tu bandeja está vacía.") + "</p>") + "</section>";
  }

  function archivosHtml(x) {
    var lista = [];
    if (x.archivo) { lista.push({ n: 0, nombre: x.archivo.nombre }); }
    (g(x).adjuntos || []).forEach(function (a) { lista.push({ n: a.n, nombre: a.nombre }); });
    return lista.map(function (a) {
      return '<button type="button" class="ap-archivo" data-ap="archivo" data-id="' + x.id + '" data-n="' + a.n + '">' +
        '<span class="ap-ext">' + esc(String(a.nombre).split(".").pop().toUpperCase().slice(0, 4)) + "</span><span>" + esc(a.nombre) + "</span></button>";
    }).join("");
  }

  function verHtml(id) {
    var x = envio(id);
    if (!x) { return '<a class="ap-volver" href="#bandeja">' + ico(ICONOS.volver, 18) + "Bandeja</a><p class=\"ap-vacio\">Ese mensaje ya no está.</p>"; }
    marcarVisto(x.id);
    var mio = x.autorId === yo(), et = etiqueta(x), acc = "";
    if (x.tipo === "ast_cuadrilla" && g(x).destinatarioId === yo() && (x.estado === "pendiente" || x.estado === "devuelto")) {
      acc = '<a class="ap-boton" href="#ast/' + x.id + '">' + (x.estado === "devuelto" ? "Corregir el AST" : "Rellenar el AST") + "</a>";
    } else if (x.tipo === "firma_trabajador" && g(x).destinatarioId === yo() && x.estado === "pendiente") {
      acc = '<a class="ap-boton" href="#firmar/' + x.id + '">Leer y firmar</a>';
    } else if (x.publico && x.leido === false) {
      acc = '<button type="button" class="ap-boton" data-ap="leido" data-id="' + x.id + '">' + (x.tipo === "reglamento" ? "Lo recibí y lo leí" : "Marcar como leído") + "</button>";
    } else if (x.grupo === "directo" && g(x).destinatarioId === yo() && x.estado === "pendiente") {
      acc = '<button type="button" class="ap-boton" data-ap="recibido" data-id="' + x.id + '">Marcar recibido</button>';
    } else if (!mio && x.estado === "pendiente" && !x.publico) {
      acc = '<p class="ap-pista">Esto se resuelve desde PINO-W en el computador.</p>';
    }
    var lugar = g(x).lugar ? "Lugar: " + g(x).lugar + (g(x).hora ? " · " + g(x).hora : "") : "";
    return '<a class="ap-volver" href="#bandeja">' + ico(ICONOS.volver, 18) + "Bandeja</a>" +
      '<article class="ap-tarjeta ap-detalle"><span class="ap-etiqueta ' + et[1] + '">' + esc(et[0]) + "</span>" +
        "<h1>" + esc(x.titulo) + "</h1>" +
        '<p class="ap-de">' + esc(mio ? "Enviado por ti" : "De " + x.autor) + " · " + esc(cuando(x.creado)) + (x.estadoNombre ? " · " + esc(x.estadoNombre) : "") + "</p>" +
        (lugar ? '<p class="ap-pista">' + esc(lugar) + "</p>" : "") +
        (lleno(x.cuerpo) ? '<div class="ap-cuerpo-texto">' + esc(x.cuerpo) + "</div>" : "") +
        (lleno(x.respuesta) ? '<p class="ap-mensaje">Respuesta: ' + esc(x.respuesta) + "</p>" : "") +
        archivosHtml(x) + "</article>" + acc;
  }

  /* Mi AST: lo que manda la supervisión, relleno y firmado (en el teléfono o en papel con foto) */
  function astHtml(id) {
    var x = envio(id);
    if (!x) { return '<a class="ap-volver" href="#hoy">' + ico(ICONOS.volver, 18) + "Hoy</a><p class=\"ap-vacio\">Ese AST ya no está.</p>"; }
    var d = g(x), r = d.relleno || {}, filas = Math.max(estado.astPasos, (r.pasos || []).length || 0);
    var h = '<a class="ap-volver" href="#hoy">' + ico(ICONOS.volver, 18) + "Hoy</a>" +
      '<section class="ap-tarjeta ap-detalle"><span class="ap-etiqueta">AST</span><h1>' + esc(x.titulo) + "</h1>" +
        '<p class="ap-de">' + esc([d.lugar, diaLindo(d.fecha), d.procedimiento ? "Procedimiento " + d.procedimiento : ""].filter(lleno).join(" · ")) + "</p>" +
        (lleno(x.cuerpo) ? '<div class="ap-cuerpo-texto">' + esc(x.cuerpo) + "</div>" : "") +
        (x.estado === "devuelto" && lleno(x.respuesta) ? '<p class="ap-mensaje mal">Te lo devolvieron: ' + esc(x.respuesta) + "</p>" : "") + "</section>";
    h += '<div class="ap-elegir"><button type="button" data-ap="ast-modo" data-modo="digital" class="' + (estado.astModo === "digital" ? "elegido" : "") + '">Lo lleno aquí</button>' +
      '<button type="button" data-ap="ast-modo" data-modo="mano" class="' + (estado.astModo === "mano" ? "elegido" : "") + '">Lo llené en papel</button></div>';
    h += '<form id="ap-form" class="ap-tarjeta">';
    if (estado.astModo === "digital") {
      h += "<h2>Pasos de la tarea</h2>";
      for (var i = 0; i < filas; i++) {
        var p = (r.pasos || [])[i] || {};
        h += '<div class="ap-paso"><b>Paso ' + (i + 1) + "</b>" +
          '<label class="ap-campo"><span>Qué se hace</span><input name="paso-' + i + '" value="' + esc(p.paso) + '"></label>' +
          '<label class="ap-campo"><span>Peligro</span><input name="peligro-' + i + '" value="' + esc(p.peligro) + '"></label>' +
          '<label class="ap-campo"><span>Cómo lo controlo</span><input name="control-' + i + '" value="' + esc(p.control) + '"></label></div>';
      }
      h += '<button type="button" class="ap-boton claro" data-ap="ast-mas">Agregar un paso</button>' +
        '<h2 style="margin-top:1rem">EPP que uso</h2><div class="ap-epp">' + EPP_AST.map(function (e) {
          return '<label class="ap-check"><input type="checkbox" name="epp" value="' + esc(e) + '"' + ((r.epp || []).indexOf(e) !== -1 ? " checked" : "") + "> " + esc(e) + "</label>";
        }).join("") + "</div>" +
        '<label class="ap-campo"><span>Otro EPP</span><input name="eppOtro" value="' + esc(r.eppOtro) + '"></label>';
    } else {
      h += "<h2>Foto del AST en papel</h2>" +
        '<p class="ap-pista">Saca una foto de la hoja completa, que se lean los pasos y las firmas.</p>' +
        '<label class="ap-boton claro"><input type="file" accept="image/*" capture="environment" data-ap-foto hidden>' + (estado.foto ? "Cambiar la foto" : "Sacar la foto") + "</label>" +
        (estado.foto ? '<div class="ap-foto"><img src="' + estado.foto.url + '" alt="Foto del AST"></div>' : "");
    }
    h += '<h2 style="margin-top:1rem">Antes de empezar</h2>' + VERIFICA_AST.map(function (v) {
        return '<label class="ap-check"><input type="checkbox" name="v-' + v[0] + '"> ' + esc(v[1]) + "</label>";
      }).join("") +
      '<label class="ap-campo"><span>Observaciones (opcional)</span><textarea name="observaciones">' + esc(r.observaciones) + "</textarea></label>" +
      '<label class="ap-campo"><span>Tu clave de PINO-W, para firmar</span><input type="password" name="clave" autocomplete="current-password"></label>' +
      '<button type="submit" class="ap-boton"' + (estado.ocupado ? " disabled" : "") + ">" + (estado.ocupado ? "Firmando…" : "Firmar y entregar") + "</button></form>" +
      '<p class="ap-pista">Si alguna verificación no se cumple, no empieces: avísale a tu supervisor.</p>';
    return h;
  }

  function consentimientoHtml() {
    return '<section class="ap-tarjeta"><h2>Antes: tu decisión sobre la documentación electrónica</h2>' +
      '<p class="ap-pista">La Dirección del Trabajo permite firmar electrónicamente la entrega de EPP, la información de riesgos, el reglamento y las capacitaciones, si tú lo aceptas y te llega la copia de cada documento a tu correo personal. Si no aceptas, todo sigue en papel.</p>' +
      '<form id="ap-form" data-form="consentimiento">' +
        '<label class="ap-check"><input type="radio" name="acepta" value="si" checked> ' + esc(CONSENTIMIENTO_SI) + "</label>" +
        '<label class="ap-check"><input type="radio" name="acepta" value="no"> ' + esc(CONSENTIMIENTO_NO) + "</label>" +
        '<label class="ap-campo"><span>Mi correo personal</span><input type="email" name="correo" autocomplete="email"></label>' +
        '<label class="ap-check"><input type="checkbox" name="personal"> Es mi correo personal, no uno de la empresa</label>' +
        '<label class="ap-campo"><span>Tu clave de PINO-W, para firmar tu decisión</span><input type="password" name="clave" autocomplete="current-password"></label>' +
        '<button type="submit" class="ap-boton"' + (estado.ocupado ? " disabled" : "") + ">" + (estado.ocupado ? "Firmando…" : "Firmar mi decisión") + "</button></form></section>";
  }

  function firmarHtml(id) {
    var x = envio(id);
    if (!x) { return '<a class="ap-volver" href="#hoy">' + ico(ICONOS.volver, 18) + "Hoy</a><p class=\"ap-vacio\">Ese documento ya no está.</p>"; }
    var c = estado.datos && estado.datos.miConsentimiento;
    var h = '<a class="ap-volver" href="#hoy">' + ico(ICONOS.volver, 18) + "Hoy</a>";
    if (!c) { return h + consentimientoHtml(); }
    h += '<article class="ap-tarjeta ap-detalle"><span class="ap-etiqueta ambar">' + esc(CLASES_FIRMA[g(x).clase] || "Para firmar") + "</span>" +
      "<h1>" + esc(x.titulo) + "</h1>" + '<p class="ap-de">De ' + esc(x.autor) + " · " + esc(cuando(x.creado)) + "</p>" +
      '<div class="ap-cuerpo-texto">' + esc(x.cuerpo) + "</div>" + archivosHtml(x) + "</article>";
    if (!c.acepta) {
      return h + '<p class="ap-mensaje">Elegiste documentación en papel: este documento lo firmas en papel con prevención. Puedes cambiar tu decisión en PINO-W en el computador.</p>';
    }
    return h + '<form id="ap-form" data-form="firmar" class="ap-tarjeta">' +
      '<label class="ap-campo"><span>Tu clave de PINO-W, para firmar</span><input type="password" name="clave" autocomplete="current-password"></label>' +
      '<button type="submit" class="ap-boton"' + (estado.ocupado ? " disabled" : "") + ">" + (estado.ocupado ? "Firmando…" : "Firmar con mi clave") + "</button>" +
      '<p class="ap-pista">Te llega la copia a tu correo personal (' + esc(c.correoPersonal || "") + ").</p>" +
      '<label class="ap-campo" style="margin-top:1rem"><span>¿Algo no corresponde? Escribe qué (por ejemplo, «la talla no es la mía»)</span><textarea name="observacion"></textarea></label>' +
      '<button type="button" class="ap-boton claro" data-ap="objetar" data-id="' + x.id + '">Objetar el documento</button></form>';
  }

  function avisarHtml() {
    var lista = AVISOS.filter(function (a) { return !(a.noJefe && administra()); });
    var c = cola();
    return '<h1 class="ap-titulo">Avisar</h1><p class="ap-sub">Se manda aunque no tengas señal: sale apenas vuelva.</p>' +
      '<div class="ap-avisos">' + lista.map(function (a) {
        return '<a class="ap-aviso' + (a.rojo ? " rojo" : "") + '" href="#avisar/' + a.tipo + '"><span class="ap-ico">' + ico(ICONOS.avisar) + "</span>" +
          "<span><b>" + esc(a.titulo) + "</b><span>" + esc(a.texto) + "</span></span></a>";
      }).join("") + "</div>" +
      (c.length ? '<section class="ap-tarjeta" style="margin-top:1rem"><h2>Lo que estás enviando</h2><ul class="ap-lista ap-cola">' + c.map(function (x) {
        return "<li><span class=\"ap-texto\"><b>" + esc(x.titulo) + "</b><em>" + esc(x.error ? "No se pudo enviar: " + x.error : "Esperando señal…") + "</em></span>" +
          (x.error ? '<button type="button" class="ap-enlace" data-ap="cola-borrar" data-id="' + x.id + '">Borrar</button>' : "") + "</li>";
      }).join("") + "</ul></section>" : "");
  }

  function avisoFormHtml(tipo) {
    var a = AVISOS.filter(function (x) { return x.tipo === tipo; })[0];
    if (!a) { return avisarHtml(); }
    var h = '<a class="ap-volver" href="#avisar">' + ico(ICONOS.volver, 18) + "Avisar</a>" +
      '<h1 class="ap-titulo">' + esc(a.titulo) + "</h1><p class=\"ap-sub\">" + esc(a.texto) + "</p>" +
      '<form id="ap-form" data-form="aviso" data-tipo="' + tipo + '" class="ap-tarjeta">';
    if (tipo === "reporte_peligro") {
      h += '<label class="ap-campo"><span>Qué es</span><select name="clase"><option value="">Elige…</option>' + REPORTES.map(function (r) { return '<option value="' + r[0] + '">' + esc(r[1]) + "</option>"; }).join("") + "</select></label>";
    }
    if (tipo !== "dolencia") { h += '<label class="ap-campo"><span>Dónde</span><input name="lugar" placeholder="Ej.: correa CV-03, nivel 2"></label>'; }
    if (tipo === "reporte_peligro") {
      h += '<label class="ap-campo"><span>Equipo (si es una falla)</span><input name="equipo"></label>' +
        '<label class="ap-check"><input type="checkbox" name="fuera"> Dejé el equipo fuera de servicio</label>' +
        '<label class="ap-campo"><span>Qué hice o propongo (opcional)</span><input name="medida"></label>';
    }
    h += '<label class="ap-campo"><span>' + (tipo === "dolencia" ? "Qué sientes, dónde y desde cuándo (opcional)" : "Qué pasó") + '</span><textarea name="cuerpo"></textarea></label>';
    if (a.foto) {
      h += '<label class="ap-boton claro"><input type="file" accept="image/*" capture="environment" data-ap-foto hidden>' + (estado.foto ? "Cambiar la foto" : "Agregar una foto (opcional)") + "</label>" +
        (estado.foto ? '<div class="ap-foto"><img src="' + estado.foto.url + '" alt="Foto"></div><p class="ap-pista">La foto no debe mostrar exámenes de salud ni nada de una denuncia de Ley Karin.</p>' : "");
    }
    if (tipo === "dolencia") { h += '<p class="ap-pista">Lo ve solo prevención. No adjuntes exámenes ni resultados médicos.</p>'; }
    return h + '<button type="submit" class="ap-boton' + (a.rojo ? " rojo" : "") + '" style="margin-top:0.8rem">Enviar</button></form>';
  }

  function cuentaHtml() {
    var u = estado.sesion.usuario || {}, otras = (estado.empresas || []).filter(function (e) { return e.activa !== false; });
    return '<h1 class="ap-titulo">Cuenta</h1>' +
      '<section class="ap-tarjeta"><h2>' + esc(u.nombre) + "</h2><p class=\"ap-vacio\">" + esc(u.correo || "") + "</p>" +
        (estado.empresa ? '<p class="ap-vacio">' + esc(estado.empresa.nombre) + (estado.empresa.puestoNombre ? " · " + esc(estado.empresa.puestoNombre) : "") + "</p>" : "") +
        (otras.length > 1 ? '<button type="button" class="ap-boton claro" data-ap="empresas">Cambiar de empresa</button>' : "") + "</section>" +
      (administra() ? "" : '<section class="ap-tarjeta"><h2>Documentación electrónica</h2>' + (function () {
        var c = estado.datos && estado.datos.miConsentimiento;
        return c ? '<p class="ap-vacio">' + (c.acepta ? "Aceptaste firmar desde PINO-W. Tus copias llegan a " + esc(c.correoPersonal) + "." : "Elegiste papel.") + "</p>" +
            '<a class="ap-boton claro" href="#consentimiento">Cambiar mi decisión</a>'
          : '<p class="ap-vacio">Todavía no decides.</p><a class="ap-boton" href="#consentimiento">Decidir</a>';
      })() + "</section>") +
      '<section class="ap-tarjeta"><h2>Tenerla como app</h2>' +
        (estado.instalar ? '<button type="button" class="ap-boton" data-ap="instalar">Instalar PINO-W en este teléfono</button>' :
          '<p class="ap-pista"><b>Android:</b> en Chrome, el menú ⋮ y «Instalar app» o «Agregar a pantalla principal».<br><b>iPhone:</b> en Safari, el botón Compartir y «Agregar a inicio».</p>') + "</section>" +
      '<section class="ap-tarjeta"><h2>Lo legal</h2><p class="ap-pista"><button type="button" class="ap-enlace" data-legal="terminos">Términos y condiciones</button> · ' +
        '<button type="button" class="ap-enlace" data-legal="privacidad">Política de privacidad</button></p></section>' +
      '<button type="button" class="ap-boton claro" data-ap="salir">Salir</button>' +
      '<p class="ap-pista" style="margin-top:0.8rem">Al salir se borra de este teléfono todo lo que PINO-W guardó.</p>';
  }

  /* Antes de entrar */
  function entrarHtml() {
    return '<div class="ap-entrada"><span class="ap-logo">PINO<span>-W</span></span><p class="ap-sub">En terreno: tu jornada, tu AST, tus documentos y los avisos de seguridad.</p>' +
      mensajeHtml() +
      '<form id="ap-form" data-form="entrar">' +
        '<label class="ap-campo"><span>Correo</span><input type="email" name="correo" autocomplete="username" required></label>' +
        '<label class="ap-campo"><span>Clave</span><input type="password" name="clave" autocomplete="current-password" required></label>' +
        '<label class="ap-check"><input type="checkbox" name="recordar" checked> Recordarme en este teléfono</label>' +
        '<button type="submit" class="ap-boton"' + (estado.ocupado ? " disabled" : "") + ">" + (estado.ocupado ? "Entrando… (puede tardar si PINO-W estuvo sin uso)" : "Entrar") + "</button></form>" +
      '<button type="button" class="ap-boton claro" data-ap="pantalla" data-pantalla="registro" style="margin-top:0.8rem">Crear mi cuenta</button></div>';
  }
  function registroHtml() {
    return '<div class="ap-entrada"><span class="ap-logo">PINO<span>-W</span></span><p class="ap-sub">Crea tu cuenta. Después entras a tu empresa con el código que te dan sus administradores.</p>' +
      mensajeHtml() +
      '<form id="ap-form" data-form="registro">' +
        '<label class="ap-campo"><span>Nombre y apellido</span><input name="nombre" autocomplete="name" required></label>' +
        '<label class="ap-campo"><span>Correo</span><input type="email" name="correo" autocomplete="email" required></label>' +
        '<label class="ap-campo"><span>Clave (mínimo 8 caracteres)</span><input type="password" name="clave" autocomplete="new-password" required minlength="8"></label>' +
        '<label class="ap-check"><input type="checkbox" name="acepto"> <span>Leí y acepto los <button type="button" class="ap-enlace" data-legal="terminos">Términos</button> y la <button type="button" class="ap-enlace" data-legal="privacidad">Política de privacidad</button>.</span></label>' +
        '<button type="submit" class="ap-boton"' + (estado.ocupado ? " disabled" : "") + ">" + (estado.ocupado ? "Creando…" : "Crear mi cuenta") + "</button></form>" +
      '<button type="button" class="ap-boton claro" data-ap="pantalla" data-pantalla="entrar" style="margin-top:0.8rem">Ya tengo cuenta</button></div>';
  }
  function unirseHtml() {
    return '<div class="ap-entrada"><span class="ap-logo">PINO<span>-W</span></span><h1 class="ap-titulo">Entra a tu empresa</h1>' +
      '<p class="ap-sub">Pídele el código de invitación a los administradores de tu empresa.</p>' + mensajeHtml() +
      '<form id="ap-form" data-form="unirse">' +
        '<label class="ap-campo"><span>Código de la empresa</span><input name="codigo" autocapitalize="characters" required></label>' +
        '<label class="ap-campo"><span>Tu RUT</span><input name="rut" placeholder="12.345.678-9" required></label>' +
        '<button type="submit" class="ap-boton"' + (estado.ocupado ? " disabled" : "") + ">Entrar a la empresa</button></form>" +
      '<button type="button" class="ap-boton claro" data-ap="salir" style="margin-top:0.8rem">Salir</button></div>';
  }
  function esperaHtml() {
    return '<div class="ap-entrada"><span class="ap-logo">PINO<span>-W</span></span><h1 class="ap-titulo">Tu solicitud está esperando</h1>' +
      '<p class="ap-sub">Entraste a ' + esc(estado.empresa ? estado.empresa.nombre : "tu empresa") + '. Cuando un administrador te asigne tu rol, aquí aparece todo lo tuyo.</p>' +
      '<button type="button" class="ap-boton" data-ap="actualizar">Revisar de nuevo</button>' +
      '<button type="button" class="ap-boton claro" data-ap="salir">Salir</button></div>';
  }
  function elegirEmpresaHtml() {
    var lista = (estado.empresas || []).filter(function (e) { return e.activa !== false; });
    return '<div class="ap-entrada"><span class="ap-logo">PINO<span>-W</span></span><h1 class="ap-titulo">¿En qué empresa trabajas hoy?</h1>' +
      '<section class="ap-tarjeta"><ul class="ap-lista">' + lista.map(function (e) {
        return '<li><button type="button" class="ap-item" data-ap="empresa" data-id="' + e.id + '"><span class="ap-texto"><b>' + esc(e.nombre) + "</b><em>" +
          esc(e.estadoMiembro === "pendiente" ? "Solicitud pendiente" : e.puestoNombre || (e.rol === "jefe" ? "Administración" : "")) + "</em></span></button></li>";
      }).join("") + "</ul></section></div>";
  }

  function pintar() {
    var ruta = (location.hash || "#hoy").slice(1).split("/");
    if (!estado.sesion) { raiz.innerHTML = estado.pantalla === "registro" ? registroHtml() : entrarHtml(); return; }
    if (estado.empresas === null) { raiz.innerHTML = marco('<p class="ap-vacio">Trayendo lo tuyo…</p>', ""); pintarRed(); return; }
    if (!estado.empresas.length) { raiz.innerHTML = unirseHtml(); return; }
    if (!estado.empresa) { raiz.innerHTML = elegirEmpresaHtml(); return; }
    if (estado.empresa.estadoMiembro === "pendiente") { raiz.innerHTML = esperaHtml(); return; }
    if (!estado.datos) { raiz.innerHTML = marco('<p class="ap-vacio">Trayendo lo tuyo…</p>', ruta[0]); pintarRed(); return; }
    var contenido = ruta[0] === "bandeja" ? bandejaHtml() : ruta[0] === "ver" ? verHtml(ruta[1]) : ruta[0] === "ast" ? astHtml(ruta[1])
      : ruta[0] === "firmar" ? firmarHtml(ruta[1])
      : ruta[0] === "consentimiento" ? '<a class="ap-volver" href="#cuenta">' + ico(ICONOS.volver, 18) + "Cuenta</a>" + consentimientoHtml() : ruta[0] === "avisar" ? (ruta[1] ? avisoFormHtml(ruta[1]) : avisarHtml()) : ruta[0] === "cuenta" ? cuentaHtml() : hoyHtml();
    raiz.innerHTML = marco(contenido, ruta[0] === "ver" || ruta[0] === "ast" || ruta[0] === "firmar" || ruta[0] === "consentimiento" ? "" : ruta[0] || "hoy");
    pintarRed();
  }

  /* ================= LO QUE HACE LA PERSONA ================= */

  function form() { return document.getElementById("ap-form"); }
  function campo(nombre) { var f = form(); var c = f && f.elements[nombre]; return c ? (c.type === "checkbox" ? c.checked : c.value) : ""; }

  /* Las fotos se achican en el teléfono: suben rápido aunque la señal sea mala */
  function prepararFoto(archivo) {
    return new Promise(function (resolver, rechazar) {
      var lector = new FileReader();
      lector.onerror = rechazar;
      lector.onload = function () {
        var img = new Image();
        img.onerror = rechazar;
        img.onload = function () {
          var f = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * f); c.height = Math.round(img.naturalHeight * f);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          var url = c.toDataURL("image/jpeg", 0.78), ahora = new Date();
          resolver({ url: url, contenido: url.split(",")[1],
                     nombre: "foto-" + ahora.getFullYear() + dos(ahora.getMonth() + 1) + dos(ahora.getDate()) + "-" + dos(ahora.getHours()) + dos(ahora.getMinutes()) + ".jpg" });
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }

  function entrar(sesion, recordar) {
    try { localStorage.setItem(CLAVES.recordar, recordar ? "1" : "0"); } catch (e) { /* nada */ }
    estado.sesion = { credencial: sesion.credencial, usuario: sesion.usuario };
    guardarJson(CLAVES.sesion, estado.sesion);
    var u = estado.sesion.usuario || {};
    // Los Términos vigentes, con el mismo texto del programa de escritorio (legal.js)
    var aceptar = window.Legal && u.terminosAlDia === false ? window.Legal.exigir({ nube: true, terminosAlDia: false }) : Promise.resolve(true);
    return aceptar.then(function (si) {
      if (!si) { salir("Para usar PINO-W hay que aceptar los Términos y la Política de privacidad."); return; }
      estado.empresas = null;
      location.hash = "#hoy";
      pintar();
      traer().then(procesarCola);
    });
  }
  // legal.js acepta los Términos a través de este puente (en el escritorio es Python)
  window.pywebview = { api: { nube_aceptar_terminos: function (version) {
    return api("POST", "/api/cuentas/terminos", { version: version }).then(function () { return { ok: true }; }, function (e) { return { ok: false, error: e.detalle }; });
  } } };

  function salir(motivo) {
    borrarTodo();
    estado.sesion = null; estado.empresas = null; estado.empresa = null; estado.datos = null; estado.actualizado = "";
    estado.pantalla = "entrar";
    estado.mensaje = motivo ? { texto: motivo, clase: "" } : null;
    history.replaceState(null, "", location.pathname);
    pintar();
  }

  /* Lo escrito se lee antes de cualquier aviso: avisar repinta la pantalla y vacía el formulario */
  function valores(f) {
    var v = {};
    Array.prototype.forEach.call(f.elements, function (c) {
      if (!c.name) { return; }
      if (c.type === "checkbox") { v[c.name] = c.checked; }
      else if (c.type === "radio") { if (c.checked) { v[c.name] = c.value; } }
      else { v[c.name] = c.value; }
    });
    return v;
  }

  function enviarForm(f) {
    var tipo = f.dataset.form, ruta = (location.hash || "").slice(1).split("/");
    var v = valores(f), val = function (n) { return v[n] === undefined ? "" : v[n]; };
    if (estado.ocupado) { return; }
    var mal = function (e) { ocupar(false); avisar(e.detalle || String(e), "mal"); };

    if (tipo === "entrar") {
      ocupar(true); avisar("");
      api("POST", "/api/cuentas/ingreso", { correo: val("correo").trim(), clave: val("clave") }).then(function (r) {
        estado.ocupado = false; return entrar(r, val("recordar"));
      }, mal);
      return;
    }
    if (tipo === "registro") {
      if (!val("acepto")) { avisar("Marca que aceptas los Términos y la Política de privacidad.", "mal"); return; }
      ocupar(true); avisar("");
      api("POST", "/api/cuentas/registro", { nombre: val("nombre").trim(), correo: val("correo").trim(), clave: val("clave"),
                                            terminos: window.Legal ? window.Legal.version : "" }).then(function (r) {
        estado.ocupado = false;
        if (!r.credencial) { estado.pantalla = "entrar"; estado.mensaje = { texto: r.aviso || "Tu cuenta quedó creada.", clase: "bien", cuando: Date.now() }; pintar(); return null; }
        return entrar(r, true);
      }, mal);
      return;
    }
    if (tipo === "unirse") {
      ocupar(true); avisar("");
      api("POST", "/api/empresas/unirse", { codigo: val("codigo").trim(), rut: val("rut").trim() }).then(function () {
        estado.ocupado = false; avisar("Listo: ya pediste entrar a tu empresa.", "bien"); return traer();
      }, mal);
      return;
    }
    if (tipo === "consentimiento") {
      var acepta = (val("acepta") || "si") === "si";
      var gc = { acepta: acepta };
      if (acepta) { gc.correoPersonal = val("correo").trim(); gc.personal = !!val("personal"); }
      if (acepta && !gc.correoPersonal) { avisar("Escribe tu correo personal.", "mal"); return; }
      if (acepta && !gc.personal) { avisar("Confirma que es tu correo personal y no uno de la empresa.", "mal"); return; }
      if (!val("clave")) { avisar("Escribe tu clave para firmar tu decisión.", "mal"); return; }
      ocupar(true); avisar("");
      api("POST", "/api/bandeja/empresa/" + estado.empresa.id, { tipo: "consentimiento", titulo: acepta ? "Acepto la documentación electrónica" : "Prefiero la documentación en papel",
        cuerpo: acepta ? CONSENTIMIENTO_SI : CONSENTIMIENTO_NO, clave: val("clave"), gestion: gc }).then(function () {
        estado.ocupado = false; if (ruta[0] === "consentimiento") { location.hash = "#hoy"; }
        avisar("Tu decisión quedó firmada.", "bien"); return traer();
      }, mal);
      return;
    }
    if (tipo === "firmar") {
      if (!val("clave")) { avisar("Escribe tu clave para firmar.", "mal"); return; }
      ocupar(true); avisar("");
      api("PATCH", "/api/bandeja/" + Number(ruta[1]) + "/firmar", { accion: "firmar", clave: val("clave") }).then(function () {
        estado.ocupado = false; location.hash = "#hoy"; avisar("Firmado. Te llega la copia a tu correo personal.", "bien"); return traer();
      }, mal);
      return;
    }
    if (tipo === "aviso") {
      var t = f.dataset.tipo, a = AVISOS.filter(function (x) { return x.tipo === t; })[0];
      var lugar = val("lugar").trim(), cuerpo = val("cuerpo").trim();
      var datos = { tipo: t, cuerpo: cuerpo, declaro: !!estado.foto };
      if (t === "dolencia") { datos.titulo = "Aviso de una dolencia · " + diaLindo(hoyIso()); }
      else {
        if (!lugar) { avisar("Indica dónde.", "mal"); return; }
        if (!cuerpo) { avisar(t === "reporte_peligro" ? "Cuenta qué viste o qué pasó." : "Cuenta qué pasó.", "mal"); return; }
        datos.titulo = (a.titulo.replace(/^Avisar (un |una )?/, "").replace(/^Reportar un /, "Reporte de ") + " · " + lugar).slice(0, 160);
        datos.titulo = datos.titulo.charAt(0).toUpperCase() + datos.titulo.slice(1);
      }
      if (t === "reporte_peligro") {
        datos.gestion = { clase: val("clase"), lugar: lugar, equipo: val("equipo").trim(), medida: val("medida").trim(), fueraServicio: !!val("fuera") };
        if (!datos.gestion.clase) { avisar("Elige qué es.", "mal"); return; }
        if (datos.gestion.fueraServicio && !datos.gestion.equipo) { avisar("Indica qué equipo quedó fuera de servicio.", "mal"); return; }
      }
      if (estado.foto) { datos.nombre = estado.foto.nombre; datos.contenido = estado.foto.contenido; }
      encolar({ metodo: "POST", ruta: "/api/bandeja/empresa/" + estado.empresa.id, cuerpo: datos, titulo: datos.titulo, aviso: "«" + datos.titulo + "»" });
      estado.foto = null;
      location.hash = "#avisar";
      avisar(navigator.onLine === false ? "Quedó guardado: se envía apenas vuelva la señal." : "Enviando… te aviso cuando llegue.", "bien");
      return;
    }
    if (ruta[0] === "ast") { enviarAst(Number(ruta[1])); }
  }

  function enviarAst(id) {
    var datos = { modo: estado.astModo, pasos: [], epp: [], eppOtro: "", verificaciones: {}, observaciones: campo("observaciones").trim(), clave: campo("clave") };
    if (estado.astModo === "digital") {
      for (var i = 0; i < 20; i++) {
        if (!form().elements["paso-" + i]) { break; }
        var p = { paso: campo("paso-" + i).trim(), peligro: campo("peligro-" + i).trim(), control: campo("control-" + i).trim() };
        if (p.paso || p.peligro || p.control) { datos.pasos.push(p); }
      }
      if (!datos.pasos.length || datos.pasos.some(function (p) { return !p.paso || !p.peligro || !p.control; })) { avisar("Cada paso va con su peligro y cómo lo controlas.", "mal"); return; }
      datos.epp = Array.prototype.filter.call(form().querySelectorAll('input[name="epp"]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
      datos.eppOtro = campo("eppOtro").trim();
    } else {
      if (!estado.foto) { avisar("Saca la foto del AST que llenaste en papel.", "mal"); return; }
      datos.nombre = estado.foto.nombre; datos.contenido = estado.foto.contenido;
    }
    VERIFICA_AST.forEach(function (v) { datos.verificaciones[v[0]] = !!campo("v-" + v[0]); });
    if (VERIFICA_AST.some(function (v) { return !datos.verificaciones[v[0]]; })) { avisar("Antes de empezar se confirman las cuatro verificaciones. Si alguna no se cumple, avísale a tu supervisor.", "mal"); return; }
    if (!datos.clave) { avisar("Escribe tu clave para firmar.", "mal"); return; }
    ocupar(true); avisar("");
    // Con clave: no va a la cola (la clave nunca se guarda). Sin señal, se avisa y se reintenta a mano.
    api("PATCH", "/api/bandeja/" + id + "/ast_rellenar", datos).then(function () {
      estado.ocupado = false; estado.foto = null; location.hash = "#hoy";
      avisar("AST firmado y entregado a tu supervisor.", "bien");
      return traer();
    }, function (e) { ocupar(false); avisar(e.estado === 0 ? "No hay señal: tu AST no se envió. Inténtalo de nuevo cuando tengas conexión." : e.detalle, "mal"); });
  }

  function abrirArchivo(id, n) {
    var ruta = n ? "/api/bandeja/" + id + "/adjunto/" + n : "/api/bandeja/" + id + "/archivo";
    avisar("Abriendo el archivo…");
    api("GET", ruta).then(function (r) {
      var bytes = atob(r.contenido || ""), arr = new Uint8Array(bytes.length);
      for (var i = 0; i < bytes.length; i++) { arr[i] = bytes.charCodeAt(i); }
      var ext = String(r.extension || r.nombre.split(".").pop()).toLowerCase();
      var tipos = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
                    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
      var url = URL.createObjectURL(new Blob([arr], { type: tipos[ext] || "application/octet-stream" }));
      var a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener";
      if (!/^(pdf|png|jpe?g)$/.test(ext)) { a.download = r.nombre; }
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      avisar("");
    }, function (e) { avisar(e.detalle, "mal"); });
  }

  document.addEventListener("submit", function (ev) {
    if (ev.target.id !== "ap-form") { return; }
    ev.preventDefault();
    enviarForm(ev.target);
  });

  document.addEventListener("change", function (ev) {
    if (!ev.target.hasAttribute || !ev.target.hasAttribute("data-ap-foto")) { return; }
    var archivo = ev.target.files && ev.target.files[0];
    if (!archivo) { return; }
    // Lo escrito en el formulario se mantiene al repintar
    var guardado = {};
    Array.prototype.forEach.call(form().elements, function (c) { if (c.name && c.type !== "password" && c.type !== "file") { guardado[c.name + "|" + c.value] = c.type === "checkbox" || c.type === "radio" ? c.checked : c.value; } });
    prepararFoto(archivo).then(function (f) {
      estado.foto = f;
      pintar();
      Array.prototype.forEach.call(form().elements, function (c) {
        var k = c.name + "|" + c.value;
        if (c.type === "checkbox" || c.type === "radio") { if (Object.prototype.hasOwnProperty.call(guardado, k)) { c.checked = guardado[k]; } }
        else if (c.name && c.type !== "password" && c.type !== "file") {
          var v = Object.keys(guardado).filter(function (x) { return x.split("|")[0] === c.name; })[0];
          if (v) { c.value = guardado[v]; }
        }
      });
    }, function () { avisar("No se pudo leer la foto. Prueba de nuevo.", "mal"); });
  });

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("[data-ap]") : null;
    if (!b) { return; }
    var que = b.dataset.ap, id = Number(b.dataset.id || 0);
    if (que === "pantalla") { estado.pantalla = b.dataset.pantalla; estado.mensaje = null; pintar(); return; }
    if (que === "salir") { salir(""); return; }
    if (que === "actualizar") { avisar(""); traer().then(procesarCola); return; }
    if (que === "filtro") { estado.filtro = b.dataset.filtro; pintar(); return; }
    if (que === "empresa") {
      estado.empresa = (estado.empresas || []).filter(function (e) { return e.id === id; })[0] || null;
      var d = leerJson(CLAVES.datos) || {};
      d.empresaId = id; d.datos = null; guardarJson(CLAVES.datos, d);
      estado.datos = null; location.hash = "#hoy"; pintar(); traer(); return;
    }
    if (que === "empresas") { estado.empresa = null; pintar(); return; }
    if (que === "leido") {
      encolar({ metodo: "POST", ruta: "/api/bandeja/" + id + "/leido", cuerpo: {}, titulo: "Constancia de lectura" });
      var x = envio(id); if (x) { x.leido = true; }
      avisar("Quedó la constancia de que lo leíste.", "bien"); return;
    }
    if (que === "recibido") {
      encolar({ metodo: "PATCH", ruta: "/api/bandeja/" + id + "/documento_recibido", cuerpo: {}, titulo: "Constancia de recibido" });
      var y = envio(id); if (y) { y.estado = "visto"; y.estadoNombre = "Recibido"; }
      avisar("Quedó la constancia de que lo recibiste.", "bien"); return;
    }
    if (que === "archivo") { abrirArchivo(id, Number(b.dataset.n || 0)); return; }
    if (que === "ast-modo") { estado.astModo = b.dataset.modo; pintar(); return; }
    if (que === "ast-mas") { estado.astPasos = Math.min(20, estado.astPasos + 1); pintar(); return; }
    if (que === "objetar") {
      var obs = campo("observacion").trim();
      if (!obs) { avisar("Escribe qué no corresponde.", "mal"); return; }
      estado.ocupado = true;
      api("PATCH", "/api/bandeja/" + id + "/firmar", { accion: "objetar", observacion: obs }).then(function () {
        estado.ocupado = false; location.hash = "#hoy"; avisar("Objetaste el documento. Prevención ve tu observación.", "bien"); return traer();
      }, function (e) { estado.ocupado = false; avisar(e.detalle, "mal"); });
      return;
    }
    if (que === "cola-borrar") { guardarJson(CLAVES.cola, cola().filter(function (x) { return x.id !== b.dataset.id; })); pintar(); return; }
    if (que === "instalar" && estado.instalar) { estado.instalar.prompt(); estado.instalar = null; pintar(); }
  });

  window.addEventListener("hashchange", function () {
    if (!estado.mensaje || Date.now() - (estado.mensaje.cuando || 0) > 1500) { estado.mensaje = null; }
    estado.foto = null; estado.ocupado = false;
    if (!/^#ast\//.test(location.hash)) { estado.astModo = "digital"; estado.astPasos = 3; }
    pintar(); window.scrollTo(0, 0);
  });
  window.addEventListener("beforeinstallprompt", function (ev) { ev.preventDefault(); estado.instalar = ev; });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && estado.sesion && (!estado.actualizado || Date.now() - new Date(estado.actualizado).getTime() > 120000)) { traer(); }
  });

  /* ================= ARRANQUE ================= */

  // Lo último que se trajo se muestra al tiro; lo nuevo llega por detrás
  estado.sesion = leerJson(CLAVES.sesion);
  if (estado.sesion) {
    var d = leerJson(CLAVES.datos);
    if (d) {
      estado.empresas = d.empresas || null;
      estado.empresa = (d.empresas || []).filter(function (e) { return e.id === d.empresaId; })[0] || null;
      estado.datos = d.datos || null;
      estado.actualizado = d.actualizado || "";
    }
    pintar();
    traer().then(procesarCola);
  } else {
    pintar();
  }
  if ("serviceWorker" in navigator) { navigator.serviceWorker.register("sw.js").catch(function () { /* sin guardar en el teléfono */ }); }
})();
