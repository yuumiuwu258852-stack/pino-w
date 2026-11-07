/* ===================================================================
   PINO-W — Términos, privacidad y tratamiento de datos (prefijo lg-)

   Tres documentos, escritos acá para que el programa los muestre igual
   con o sin internet:
     · terminos    Términos y condiciones de uso
     · privacidad  Política de privacidad
     · encargo     Tratamiento de datos por encargo (zona de empresas)

   ANTES DE DISTRIBUIR EL PROGRAMA
   1. Completar RESPONSABLE, aquí abajo: mientras diga «por completar», los
      documentos lo muestran así y avisan arriba que son un borrador.
   2. Hacerlos revisar por un abogado. Son un borrador hecho con cuidado
      sobre lo que el programa realmente hace con los datos, no asesoría
      legal. Las leyes citadas y sus fechas hay que validarlas.

   VERSIÓN
   VERSION es la fecha de los textos. Tiene que ser la misma que TERMINOS
   en servidor\plataforma\ajustes.py: el servidor guarda qué versión aceptó
   cada cuenta y cuándo. Si los textos cambian de fondo, se cambian las dos
   fechas y cada persona vuelve a aceptar al entrar.

     window.Legal.version                → "2026-10-09"
     window.Legal.ver("privacidad")      → abre el documento para leerlo
     window.Legal.exigir(usuario)        → Promise<true|false>: si la cuenta
        de la plataforma no ha aceptado la versión vigente, se lo pide antes
        de dejarla entrar (false = no aceptó: se cierra la sesión)
     Cualquier elemento con data-legal="terminos|privacidad|encargo" abre
     su documento al hacerle clic.
   =================================================================== */

(function () {
  "use strict";

  var VERSION = "2026-10-09";
  var FECHA = "9 de octubre de 2026";

  /* Quién responde por PINO-W. Mientras no exista la empresa, es la persona
     natural dueña del programa; cuando se constituya, se cambia acá y sale
     en los tres documentos. */
  var RESPONSABLE = {
    nombre: "",        // nombre completo o razón social
    rut: "",
    domicilio: "",     // dirección, comuna y región
    correo: "pinow.contacto@gmail.com"   // para consultas y para ejercer derechos sobre los datos
  };

  function falta(que) { return "[por completar: " + que + "]"; }
  var R = {
    nombre: RESPONSABLE.nombre || falta("nombre o razón social del responsable"),
    rut: RESPONSABLE.rut || falta("RUT"),
    domicilio: RESPONSABLE.domicilio || falta("domicilio"),
    correo: RESPONSABLE.correo || falta("correo de contacto")
  };
  var BORRADOR = !(RESPONSABLE.nombre && RESPONSABLE.rut && RESPONSABLE.domicilio && RESPONSABLE.correo);

  /* Cada documento: secciones con título y párrafos. Un párrafo que es una
     lista (arreglo) sale con viñetas. */
  var DOCUMENTOS = {

    terminos: {
      titulo: "Términos y condiciones de uso",
      corto: "Términos y condiciones",
      secciones: [
        ["1. Qué es PINO-W y quién lo ofrece", [
          "PINO-W es un software de gestión preventiva para empresas y sus trabajadores: un programa que se instala en el computador, con módulos para gestionar la seguridad y salud en el trabajo, y una plataforma en internet con cuentas, foro, chat, biblioteca de archivos compartidos y una zona para empresas.",
          "Lo ofrece " + R.nombre + ", RUT " + R.rut + ", con domicilio en " + R.domicilio + " (en adelante, «PINO-W» o «nosotros»). Contacto: " + R.correo + "."
        ]],
        ["2. Aceptación y cuenta", [
          "Para usar PINO-W tienes que crear una cuenta y aceptar estos Términos y la Política de privacidad. Si no estás de acuerdo, no uses el programa.",
          [
            "Debes ser mayor de 18 años.",
            "Los datos de tu cuenta deben ser verdaderos y tuyos.",
            "Tu clave es personal. Lo que se haga con tu cuenta se entiende hecho por ti; si crees que alguien más la usa, cámbiala y avísanos.",
            "Una cuenta por persona. No se comparten ni se traspasan."
          ]
        ]],
        ["3. Es una herramienta de apoyo, no un reemplazo del profesional", [
          "PINO-W ayuda a ordenar, registrar y documentar el trabajo de prevención. No reemplaza el criterio del experto en prevención de riesgos, ni la asesoría legal, ni las obligaciones que la ley le impone a cada empleador.",
          [
            "Las listas, plantillas, criterios, umbrales, plazos y citas de leyes y decretos que trae el programa son una referencia de apoyo. Pueden estar incompletos o desactualizados: verifica siempre la norma vigente y el procedimiento de tu empresa antes de usarlos, sobre todo frente a una fiscalización.",
            "Los documentos que el programa arma (matrices, AST, procedimientos, reglamentos, informes) son borradores de trabajo. Quien los firma y los usa es responsable de su contenido.",
            "El asistente de inteligencia artificial puede equivocarse o inventar datos. Lo que responde no es asesoría profesional: revísalo antes de usarlo.",
            "Las firmas hechas en pantalla son firma electrónica simple. Cuando la ley exige firma de puño y letra u otra formalidad, el documento se imprime y se firma como corresponde."
          ],
          "Cumplir la normativa de seguridad y salud en el trabajo es responsabilidad del empleador y de los profesionales a cargo, no de PINO-W."
        ]],
        ["4. Tus registros quedan en tu computador", [
          "Lo que registras en los módulos (matriz de riesgos, inspecciones, capacitaciones, accidentes, exámenes, denuncias y lo demás) se guarda en la carpeta «datos» de tu computador. No se sube a nuestros servidores por sí solo.",
          "Por lo mismo, respaldar esa carpeta es tarea tuya. Si el computador se pierde, se daña o se borra, nosotros no tenemos una copia y no podemos recuperarla.",
          "Solo sale de tu computador lo que tú decides enviar: lo que publicas en el foro o el chat, lo que compartes en la biblioteca, lo que mandas a los administradores de tu empresa en la zona de empresas, y lo que le preguntas al asistente de IA."
        ]],
        ["5. Comunidad: foro, chat y biblioteca", [
          "La comunidad es de todas las personas con cuenta. Al usarla te comprometes a:",
          [
            "Tratar a los demás con respeto. No se aceptan insultos, acoso, discriminación ni amenazas.",
            "No publicar datos personales de terceros: nombres con RUT, datos de salud, antecedentes de accidentes que identifiquen a una persona, ni nada de una investigación de la Ley Karin.",
            "No publicar información confidencial de tu empresa o de tus clientes si no estás autorizado.",
            "No subir archivos que no sean tuyos o que no tengas derecho a compartir, ni contenido ilegal, engañoso, publicidad no solicitada o programas dañinos."
          ],
          "Lo que compartes sigue siendo tuyo. Al publicarlo nos autorizas a guardarlo y mostrarlo a las demás personas de la comunidad, y a que ellas lo descarguen y lo usen en su trabajo, mientras no lo retires. Puedes eliminar lo que subiste.",
          "Lo que publican otras personas es responsabilidad de quien lo publica. No lo revisamos antes de que aparezca ni garantizamos que sea correcto. La dirección y los moderadores pueden ocultar o eliminar contenido y suspender cuentas que no respeten estas reglas."
        ]],
        ["6. Zona de empresas", [
          "Una empresa puede registrarse con su nombre, RUT, marca y proyectos, y sumar a sus prevencionistas con un código de invitación. Quien la registra declara que tiene facultades para hacerlo en nombre de esa empresa.",
          [
            "Quien registra la empresa queda como su administrador y puede sumar a otras personas a ese rol. Los administradores crean proyectos, los asignan a las personas de la empresa y revisan sus avances.",
            "Quien entra a una empresa con su código indica su RUT y su cargo, y un administrador de la empresa le asigna su rol (por ejemplo jefe de prevención, supervisor, operador o trabajador). Esos datos, junto con su nombre y su correo, los ven los administradores de esa empresa.",
            "Los avances que una persona envía los ven solo ella y los administradores de su empresa.",
            "Los archivos de esos avances pueden traer nombres y RUT de trabajadores cuando el trabajo lo requiere. No pueden traer resultados de salud ni antecedentes de la Ley Karin: quien adjunta lo declara al enviar.",
            "Respecto de esos datos, la empresa es la responsable y PINO-W los guarda por su encargo, según el documento «Tratamiento de datos por encargo», que forma parte de estos Términos."
          ],
          "Al salir de una empresa, o si ella te saca, dejas de ver sus proyectos. Los avances que enviaste siguen siendo parte de los registros de esa empresa hasta que se eliminen."
        ]],
        ["7. Suscripción y pagos", [
          "Usar los módulos del programa y participar en la comunidad no tiene costo. Algunas funciones, como descargar archivos de la biblioteca, pueden requerir una suscripción pagada cuando esté habilitada.",
          [
            "El precio, lo que incluye y cada cuánto se cobra se muestran antes de pagar. No hay cobros sin que los hayas aceptado.",
            "El pago lo procesa Mercado Pago. Los datos de tu tarjeta los ingresas en su página: nunca pasan por el programa ni por nuestros servidores.",
            "La suscripción se renueva en cada período hasta que la canceles. Puedes cancelarla cuando quieras desde «Planes y suscripción»; sigues con acceso hasta el fin del período pagado.",
            "Si un cobro no se concreta, el acceso pagado puede suspenderse hasta regularizarlo."
          ],
          "Si eres consumidor, nada de lo anterior limita los derechos que te da la Ley N.º 19.496 sobre protección de los derechos de los consumidores."
        ]],
        ["8. Propiedad intelectual", [
          "El programa, su diseño, sus textos, la marca PINO-W y el Método PINO-W pertenecen a " + R.nombre + ". Te damos una licencia personal, no exclusiva y que no puedes traspasar, para usar el programa en tu trabajo mientras tengas tu cuenta.",
          "No puedes copiarlo para venderlo, alquilarlo o distribuirlo como propio, ni quitarle las marcas, ni usar la plataforma para armar un producto que compita con ella.",
          "Los registros y documentos que tú creas con el programa son tuyos, o de tu empleador o cliente, según lo que hayan acordado entre ustedes."
        ]],
        ["9. Disponibilidad y cambios en el servicio", [
          "Trabajamos para que la plataforma esté disponible, pero no garantizamos que funcione sin interrupciones ni sin errores. Puede haber mantenciones, caídas del servidor o de internet.",
          "Los módulos del programa funcionan en tu computador aunque la plataforma no esté disponible; el foro, el chat, la biblioteca y la zona de empresas necesitan conexión.",
          "Podemos agregar, cambiar o retirar funciones. Si un cambio afecta de forma importante algo por lo que pagaste, te avisaremos con anticipación."
        ]],
        ["10. Responsabilidad", [
          "PINO-W se entrega tal como está. En la medida en que la ley lo permite, no respondemos por:",
          [
            "decisiones de prevención tomadas con base en lo que muestra el programa sin haberlo verificado;",
            "multas, sanciones o daños derivados del incumplimiento de la normativa por parte del usuario o de su empresa;",
            "la pérdida de registros guardados en tu computador;",
            "el contenido que publican otras personas en la comunidad;",
            "fallas de servicios de terceros (internet, el proveedor de pagos, el proveedor de inteligencia artificial)."
          ],
          "Esto no excluye la responsabilidad que la ley no permite excluir, como la que nace del dolo o la culpa grave, ni los derechos irrenunciables de los consumidores."
        ]],
        ["11. Suspensión y cierre de la cuenta", [
          "Puedes dejar de usar PINO-W cuando quieras y pedirnos que eliminemos tu cuenta escribiendo a " + R.correo + ".",
          "Podemos suspender o cerrar una cuenta que incumpla estos Términos, que se use para dañar a otros o al servicio, o cuando la ley lo exija. Si es posible, avisaremos antes y explicaremos el motivo.",
          "Cerrar la cuenta no borra los registros que tienes en tu computador: esos son tuyos y siguen ahí."
        ]],
        ["12. Cambios a estos Términos", [
          "Podemos actualizar estos Términos. Cuando el cambio sea de fondo, el programa te mostrará la versión nueva y te pedirá aceptarla antes de seguir. La versión vigente y su fecha están siempre arriba de este documento."
        ]],
        ["13. Ley aplicable", [
          "Estos Términos se rigen por las leyes de la República de Chile. Las diferencias que no se resuelvan conversando se someterán a los tribunales competentes según la ley; si eres consumidor, puedes recurrir al tribunal que corresponda a tu domicilio."
        ]]
      ]
    },

    privacidad: {
      titulo: "Política de privacidad",
      corto: "Política de privacidad",
      secciones: [
        ["1. Quién es responsable de tus datos", [
          "El responsable del tratamiento de los datos personales de las cuentas de PINO-W es " + R.nombre + ", RUT " + R.rut + ", con domicilio en " + R.domicilio + ". Para cualquier consulta o para ejercer tus derechos, escribe a " + R.correo + "."
        ]],
        ["2. Lo más importante, en corto", [
          [
            "Lo que registras en los módulos queda en tu computador. No lo vemos ni lo guardamos.",
            "En nuestros servidores guardamos solo tu cuenta, lo que publicas en la comunidad y lo que envías en la zona de empresas.",
            "Tu clave no se guarda: se guarda una huella que no permite recuperarla.",
            "No guardamos datos de tarjetas. No vendemos tus datos ni los usamos para publicidad de terceros."
          ]
        ]],
        ["3. Qué datos guardamos en la plataforma", [
          [
            "Tu cuenta: nombre, correo electrónico y, si los escribes, cargo y empresa. La huella de tu clave. La fecha en que creaste la cuenta, la de tu última entrada, cuántas veces has entrado y la versión de estos documentos que aceptaste y cuándo.",
            "Seguridad: un registro de entradas, intentos fallidos y cambios en las cuentas, asociado a tu correo. La dirección IP desde la que te conectas se usa por unos minutos, en memoria, para frenar abusos; no se guarda en la base de datos.",
            "Comunidad: los mensajes que escribes en el foro y el chat, los archivos que compartes en la biblioteca con su descripción, y si estás conectado en este momento.",
            "Suscripción: si tienes un plan, su estado, sus fechas y el identificador que entrega Mercado Pago. Los datos de tu tarjeta los maneja Mercado Pago, no nosotros.",
            "Zona de empresas: los datos de la empresa (nombre, RUT, rubro, dirección, descripción, logo), quiénes son sus miembros y con qué rol, sus proyectos, y los avances con sus comentarios y archivos."
          ]
        ]],
        ["4. Qué datos no salen de tu computador", [
          "Todo lo que registras en los módulos se guarda en la carpeta «datos» de tu equipo: la matriz de riesgos, inspecciones, capacitaciones, entregas de EPP, investigaciones de accidentes, el reglamento interno, las firmas en pantalla, los planos, tus notas y lo demás.",
          [
            "De los exámenes ocupacionales el programa anota solo la vigencia, no el resultado ni el diagnóstico.",
            "Las denuncias de la Ley Karin se guardan en tu equipo y el programa las trata como reservadas.",
            "Si en un computador se usan cuentas locales (sin plataforma), esas cuentas también se guardan solo en ese equipo."
          ],
          "Sobre esos registros, tú o tu empresa son los responsables: nosotros no tenemos acceso a ellos."
        ]],
        ["5. El asistente de inteligencia artificial", [
          "El asistente funciona con una clave del servicio Gemini, de Google, que tú mismo configuras. Cuando le haces una pregunta, tu pregunta y los datos del programa que el asistente necesite para responderla se envían a Google bajo tu propia cuenta de ese servicio, y se rigen por las condiciones de Google.",
          "Si no quieres que un dato salga de tu computador, no se lo des al asistente. Evita escribirle nombres, RUT o datos de salud de trabajadores. Puedes apagar el asistente en Configuración."
        ]],
        ["6. Para qué usamos tus datos", [
          [
            "Para crear tu cuenta, dejarte entrar y mostrarte en la comunidad con tu nombre.",
            "Para que funcionen el foro, el chat, la biblioteca y la zona de empresas.",
            "Para cobrar la suscripción, si contratas una.",
            "Para cuidar la seguridad de la plataforma: frenar intentos de acceso indebido y moderar la comunidad.",
            "Para cumplir obligaciones legales o requerimientos de una autoridad competente."
          ],
          "Tratamos tus datos porque son necesarios para darte el servicio que aceptaste al crear la cuenta, por tu consentimiento en lo que publicas o envías, y por nuestro interés legítimo en mantener segura la plataforma."
        ]],
        ["7. Con quién se comparten", [
          "No vendemos ni cedemos tus datos. Los ven:",
          [
            "Las demás personas de la comunidad: tu nombre, tu cargo y lo que publicas. Tu correo no se muestra en el foro ni en el chat.",
            "Los administradores de tu empresa: lo que envías en la zona de empresas, y tu nombre, correo, RUT, cargo y puesto.",
            "La dirección y los administradores de PINO-W, para operar y moderar la plataforma.",
            "Los proveedores que nos prestan servicios técnicos: el alojamiento del servidor (Render), la base de datos (Neon) y el procesador de pagos (Mercado Pago). Solo tratan los datos para prestar ese servicio."
          ],
          "Esos proveedores pueden guardar la información en servidores ubicados fuera de Chile.",
          "El programa también carga sus tipografías desde Google Fonts: al abrirlo, tu computador se conecta a ese servicio."
        ]],
        ["8. Cuánto tiempo los guardamos", [
          [
            "Los datos de tu cuenta, mientras la cuenta exista.",
            "Lo que publicas en la comunidad, hasta que lo elimines tú o la moderación, o hasta que se cierre tu cuenta.",
            "Los archivos de avances de la zona de empresas, hasta que los elimine quien los envió, los administradores de la empresa o la propia empresa. Cuando se eliminan, se borran de verdad.",
            "El registro de seguridad y lo relativo a pagos, el tiempo que exijan las obligaciones legales y tributarias."
          ]
        ]],
        ["9. Tus derechos", [
          "Puedes pedirnos en cualquier momento:",
          [
            "saber qué datos tuyos tenemos y obtener una copia (acceso y portabilidad);",
            "corregir los que estén malos (rectificación): tu nombre, cargo y empresa los cambias tú mismo en tu cuenta;",
            "eliminar tu cuenta y tus datos (supresión o cancelación);",
            "oponerte a un uso determinado o pedir que se bloqueen temporalmente."
          ],
          "Escribe a " + R.correo + " desde el correo de tu cuenta. Te responderemos dentro de los plazos que fija la ley. Estos derechos están reconocidos en la Ley N.º 19.628 sobre protección de la vida privada y en la Ley N.º 21.719, que la moderniza y crea la Agencia de Protección de Datos Personales, ante la cual podrás reclamar cuando esté en funciones."
        ]],
        ["10. Cómo los protegemos", [
          [
            "La conexión entre el programa y el servidor va cifrada.",
            "Las claves se guardan como una huella con sal: ni nosotros podemos leerlas.",
            "Las sesiones caducan solas y la cuenta se bloquea por un rato tras varios intentos fallidos.",
            "Los archivos que se suben se revisan por tipo y tamaño; los de la biblioteca se rechazan si traen RUT de personas.",
            "Cada persona ve solo lo que le corresponde: los avances de una empresa no los ve nadie fuera de ella."
          ],
          "Ningún sistema es infalible. Si ocurre un incidente que afecte tus datos, te avisaremos y avisaremos a la autoridad cuando la ley lo exija."
        ]],
        ["11. Menores de edad", [
          "PINO-W es una herramienta de trabajo para profesionales. No está dirigida a menores de 18 años y no creamos cuentas para ellos a sabiendas."
        ]],
        ["12. Cambios a esta política", [
          "Si cambiamos esta política de forma importante, el programa te mostrará la versión nueva y te pedirá aceptarla antes de seguir. La versión vigente y su fecha están arriba de este documento."
        ]]
      ]
    },

    encargo: {
      titulo: "Tratamiento de datos por encargo (zona de empresas)",
      corto: "Tratamiento de datos por encargo",
      secciones: [
        ["1. A quién se aplica", [
          "Este documento se aplica a toda empresa registrada en la zona de empresas de PINO-W (la «Empresa») y forma parte de los Términos y condiciones. Lo acepta quien registra la Empresa, declarando que tiene facultades para obligarla."
        ]],
        ["2. Quién es quién", [
          [
            "La Empresa es la responsable de los datos personales de sus trabajadores, contratistas y demás personas que aparezcan en lo que sus integrantes envían por la zona de empresas. Ella decide qué se sube y para qué.",
            "PINO-W (" + R.nombre + ") actúa como encargado: guarda esos datos y los muestra a quien corresponde, por cuenta de la Empresa y solo para prestarle este servicio."
          ]
        ]],
        ["3. Qué datos y para qué", [
          [
            "Datos: los que contengan los comentarios y archivos de los avances. Pueden incluir nombres, RUT, cargos y firmas de trabajadores, en documentos como matrices, registros de capacitación, AST o listas de asistencia.",
            "Finalidad: que las personas de la Empresa informen su trabajo a sus administradores y que estos lo revisen.",
            "Duración: mientras la Empresa esté registrada, o hasta que los datos se eliminen."
          ]
        ]],
        ["4. Lo que no se puede subir", [
          "Por la zona de empresas no deben enviarse datos de salud (resultados de exámenes, diagnósticos, licencias médicas con su causa) ni antecedentes de denuncias o investigaciones de la Ley Karin. Quien adjunta un archivo lo declara al enviarlo. La Empresa debe instruir a su gente en este sentido y es responsable si se incumple."
        ]],
        ["5. A qué se obliga PINO-W", [
          [
            "Tratar los datos solo según las instrucciones de la Empresa, que son las que resultan del uso de la plataforma, y no usarlos para fines propios.",
            "Mantenerlos reservados: los ven solo quien los envió y los administradores de la Empresa. La dirección de PINO-W puede suspender una empresa, pero no revisa el contenido de sus avances salvo que la Empresa lo pida para dar soporte o que una autoridad competente lo exija.",
            "Aplicar medidas de seguridad razonables: conexión cifrada, control de acceso por cuenta y rol, y revisión de los archivos que se suben.",
            "Avisar a la Empresa, sin demora indebida, si detecta un incidente de seguridad que afecte sus datos.",
            "Ayudarla, en lo que esté a su alcance, a responder las solicitudes de las personas sobre sus datos.",
            "Eliminar los datos de verdad cuando se borra un avance, un proyecto o la Empresa completa."
          ]
        ]],
        ["6. Proveedores que usa PINO-W", [
          "La Empresa autoriza a PINO-W a usar proveedores para alojar el servidor y la base de datos (hoy, Render y Neon), que pueden guardar la información fuera de Chile. PINO-W responde ante la Empresa por lo que hagan esos proveedores con los datos, y le informará si los cambia."
        ]],
        ["7. A qué se obliga la Empresa", [
          [
            "Tener una base legal para tratar los datos que sube e informar a sus trabajadores cuando corresponda.",
            "Subir solo lo necesario para la finalidad indicada.",
            "Decidir quiénes son sus administradores y quiénes integran su equipo, y sacar a quienes ya no deban tener acceso.",
            "Renovar el código de invitación si cree que llegó a manos de quien no corresponde."
          ]
        ]],
        ["8. Término", [
          "La Empresa puede eliminarse de la plataforma en cualquier momento: con eso se borran sus proyectos, avances y archivos. Antes de hacerlo debe guardar por su cuenta lo que necesite conservar, porque PINO-W no mantiene una copia."
        ]]
      ]
    }
  };

  /* ================= PANTALLA ================= */

  function esc(t) {
    return String(t === undefined || t === null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function api() { return window.pywebview && window.pywebview.api; }

  function cuerpoDe(id) {
    var d = DOCUMENTOS[id];
    return '<p class="lg-version">Versión del ' + FECHA + "</p>" +
      (BORRADOR ? '<p class="lg-borrador"><b>Borrador.</b> Faltan los datos del responsable y la revisión de un abogado antes de darlo por definitivo.</p>' : "") +
      d.secciones.map(function (s) {
        return "<h4>" + esc(s[0]) + "</h4>" + s[1].map(function (p) {
          return Array.isArray(p) ? "<ul>" + p.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "<p>" + esc(p) + "</p>";
        }).join("");
      }).join("");
  }

  var caja = null, alCerrar = null;

  function armar() {
    if (caja) { return; }
    caja = document.createElement("div");
    caja.className = "lg-fondo";
    caja.hidden = true;
    caja.innerHTML =
      '<div class="lg-ventana" role="dialog" aria-modal="true" aria-labelledby="lg-titulo">' +
        '<header class="lg-cabeza"><h3 id="lg-titulo"></h3>' +
          '<div class="lg-pestanas" role="tablist">' + Object.keys(DOCUMENTOS).map(function (id) {
            return '<button type="button" role="tab" data-lg-doc="' + id + '">' + esc(DOCUMENTOS[id].corto) + "</button>";
          }).join("") + "</div></header>" +
        '<div class="lg-texto" id="lg-texto" tabindex="0"></div>' +
        '<footer class="lg-pie" id="lg-pie"></footer>' +
      "</div>";
    document.body.appendChild(caja);

    caja.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) { return; }
      if (b.dataset.lgDoc) { mostrar(b.dataset.lgDoc); return; }
      if (b.dataset.lg && typeof alCerrar === "function") { alCerrar(b.dataset.lg, b); }
    });
    document.addEventListener("keydown", function (e) {
      // Con Escape se sale de la lectura; la aceptación obligatoria no se salta así
      if (e.key === "Escape" && caja && !caja.hidden && !caja.classList.contains("lg-exige")) { cerrar(); }
    });
  }

  function mostrar(id) {
    caja.querySelector("#lg-titulo").textContent = DOCUMENTOS[id].titulo;
    var texto = caja.querySelector("#lg-texto");
    texto.innerHTML = cuerpoDe(id);
    texto.scrollTop = 0;
    Array.prototype.forEach.call(caja.querySelectorAll("[data-lg-doc]"), function (b) {
      b.classList.toggle("elegido", b.dataset.lgDoc === id);
      b.setAttribute("aria-selected", b.dataset.lgDoc === id ? "true" : "false");
    });
  }

  function cerrar() {
    if (caja) { caja.hidden = true; caja.classList.remove("lg-exige"); }
    alCerrar = null;
  }

  /* Solo para leer */
  function ver(id) {
    armar();
    caja.classList.remove("lg-exige");
    caja.querySelector("#lg-pie").innerHTML = '<button type="button" class="boton-fino principal" data-lg="cerrar">Cerrar</button>';
    alCerrar = cerrar;
    mostrar(DOCUMENTOS[id] ? id : "terminos");
    caja.hidden = false;
  }

  /* Antes de entrar: la cuenta de la plataforma acepta la versión vigente */
  function exigir(usuario) {
    var puente = api();
    // Cuentas de este computador, servidor antiguo o ya aceptado: pasa
    if (!usuario || !usuario.nube || usuario.terminosAlDia !== false || !puente || !puente.nube_aceptar_terminos) {
      return Promise.resolve(true);
    }
    armar();
    return new Promise(function (resolver) {
      caja.classList.add("lg-exige");
      caja.querySelector("#lg-pie").innerHTML =
        '<label class="lg-acepto"><input type="checkbox" id="lg-casilla"> ' +
          "<span>Leí y acepto los Términos y condiciones y la Política de privacidad de PINO-W.</span></label>" +
        '<p class="lg-aviso" id="lg-aviso" role="status"></p>' +
        '<div class="lg-botones"><button type="button" class="boton-fino" data-lg="no">No acepto: salir</button>' +
          '<button type="button" class="boton-fino principal" data-lg="si">Aceptar y entrar</button></div>';
      alCerrar = function (cual, boton) {
        var aviso = caja.querySelector("#lg-aviso");
        if (cual === "no") { cerrar(); resolver(false); return; }
        if (cual !== "si") { return; }
        if (!caja.querySelector("#lg-casilla").checked) { aviso.textContent = "Marca la casilla para aceptar."; return; }
        boton.disabled = true;
        aviso.textContent = "Guardando…";
        Promise.resolve(puente.nube_aceptar_terminos(VERSION)).then(function (r) {
          boton.disabled = false;
          if (r && r.ok) { usuario.terminosAlDia = true; cerrar(); resolver(true); return; }
          aviso.textContent = (r && r.error) || "No se pudo guardar la aceptación. Revisa tu conexión e intenta de nuevo.";
        }).catch(function () {
          boton.disabled = false;
          aviso.textContent = "No se pudo guardar la aceptación. Revisa tu conexión e intenta de nuevo.";
        });
      };
      mostrar("terminos");
      caja.hidden = false;
    });
  }

  // Cualquier enlace con data-legal abre su documento
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-legal]") : null;
    if (!b) { return; }
    e.preventDefault();
    ver(b.getAttribute("data-legal"));
  });

  window.Legal = { version: VERSION, borrador: BORRADOR, ver: ver, exigir: exigir };
})();
