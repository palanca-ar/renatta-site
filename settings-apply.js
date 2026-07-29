/* Ajustes de la lista — aplica al catálogo público los colores y textos que
   Renatta configura desde el panel (⚙️ Ajustes).

   Va en un archivo aparte a propósito: index.html solo suma una línea para
   incluirlo, así el catálogo y los 690 productos embebidos no se tocan.

   Criterio general: si un ajuste está vacío o no existe, no se toca nada y
   queda el texto/color original del HTML. Nunca rompe la página: si la API
   falla, simplemente no pasa nada. */
(function () {
  "use strict";

  // Deriva el tono oscuro de un color (para hovers y degradés) sin pedirle
  // al usuario que elija dos colores por cada uno.
  function darken(hex, amount) {
    try {
      var h = String(hex).replace("#", "");
      if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
      var n = parseInt(h, 16);
      if (isNaN(n)) return hex;
      return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255]
        .map(function (x) {
          return Math.round(x * (1 - amount)).toString(16).padStart(2, "0");
        })
        .join("");
    } catch (e) {
      return hex;
    }
  }

  function setText(el, value) {
    if (el && value != null && value !== "") el.textContent = value;
  }

  function apply(s) {
    if (!s) return;

    // --- Colores: se pisan las variables CSS en :root, así todo lo que las
    // usa (botones, chips, precios, hero) cambia de una sola vez.
    var rootStyle = document.documentElement.style;
    if (s.colorPrimary) {
      rootStyle.setProperty("--red", s.colorPrimary);
      rootStyle.setProperty("--red-dark", darken(s.colorPrimary, 0.18));
    }
    if (s.colorAccent) {
      rootStyle.setProperty("--yellow", s.colorAccent);
    }

    // --- Textos.
    // El lema es el párrafo del hero; el aviso es la cinta de arriba.
    setText(document.querySelector("header.hero p"), s.lema);
    setText(document.querySelector(".ribbon"), s.aviso);

    // La dirección aparece en más de un lugar (barra superior y pie). Se
    // reemplazan todos los textos que arrancan con 📍, conservando el emoji.
    if (s.direccion != null && s.direccion !== "") {
      var nodes = document.querySelectorAll("span, p, div, a");
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (el.children.length) continue; // solo hojas, para no pisar contenedores
        var txt = (el.textContent || "").trim();
        if (txt.indexOf("📍") === 0) el.textContent = "📍 " + s.direccion;
      }
    }
  }

  function load() {
    fetch("/api/get-settings", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(apply)
      .catch(function () { /* sin ajustes guardados o sin red: queda el original */ });
  }

  // Si el HTML todavía no terminó de parsearse, los selectores no encontrarían
  // nada; por eso se espera a DOMContentLoaded cuando hace falta.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
