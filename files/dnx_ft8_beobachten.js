/* =====================================================================
   DNX FT8  v1.6.0
   ---------------------------------------------------------------------
   Ein Knopf in der DNX-Werkzeugreihe ("DNX FT8: An"/"DNX FT8: Aus")
   und ein Fenster zum Beobachten und Verfolgen von FT8-Stationen:

     - Merkliste (BEOBACHTEN) mit Zaehler und "vor X min"
     - eigene Karte (Leaflet): eigener Standort, jede gehoerte Station als
       Punkt, Linie dorthin, Entfernung und Richtung; gruen = beobachtet
     - FT8-Tabelle (Zeit, dB, DT, km, Nachricht), Treffer gruen
     - Zeit wahlweise UTC oder Ortszeit; die Zone kommt aus dem QTH,
       ist fest Europa/Berlin, die des Browsers oder wieder UTC
     - Klick auf ein Rufzeichen -> qrz.com, auf einen Locator -> Karte

   AN  = Fenster sichtbar, Tabelle und Karte laufen mit
   AUS = beides weg

   Gaeste duerfen bedienen: Knopf und Fenster tragen data-dnx-capability=""
   (leer). Die Rechtepruefung liest dieses Attribut, bevor sie
   "Knopf in der Werkzeugreihe" sperrt; leer = keine Berechtigung noetig.

   Datenquelle: die WSJT-Nachrichtentabelle des Receivers
   (#openwebrx-panel-wsjt-message). Am Original wird nichts veraendert.

   Private, inoffizielle Hobby-Anpassung; kein offizielles
   OpenWebRX-/OpenWebRX+-Projekt.
   ===================================================================== */
(function () {
  "use strict";
  if (window.__dnxFt8Beob) { return; }
  window.__dnxFt8Beob = true;

  var K_AN    = "dnx_ft8_beob_an_v1";
  var K_LISTE = "dnx_ft8_beob_liste_v1";
  var K_POS   = "dnx_ft8_beob_pos_v1";
  var K_GROSS = "dnx_ft8_beob_gross_v1";   // Breite|Hoehe des Fensters
  var K_KARTE = "dnx_ft8_beob_karte_v1";
  var K_QTH   = "dnx_ft8_beob_qth_v1";
  var K_ZONE  = "dnx_ft8_beob_zone_v1";   // qth | berlin | browser | utc
  var K_ORT   = "dnx_ft8_beob_ort_v1";    // 1 = Ortszeit zeigen, 0 = UTC

  var KNOPF_ID   = "dnx-master-ft8beob";
  var FENSTER_ID = "dnx-ft8-beob-fenster";
  var MAX_ZEILEN = 150;      // Zeilen in der Tabelle
  var MAX_CHIPS  = 24;       // Rufzeichen auf der Merkliste
  var MAX_PUNKTE = 60;       // Stationen auf der Karte

  /* ---------------------------------------------------------------
     Zustand
  --------------------------------------------------------------- */
  function lies(k, f) { try { var v = localStorage.getItem(k); return (v === null) ? f : v; } catch (e) { return f; } }
  function merke(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var an = (lies(K_AN, "0") === "1");
  var karteAn = (lies(K_KARTE, "1") === "1");
  var liste = {};
  try { liste = JSON.parse(lies(K_LISTE, "{}")) || {}; } catch (e) { liste = {}; }
  function listeMerken() { merke(K_LISTE, JSON.stringify(liste)); }

  /* ---------------------------------------------------------------
     Rufzeichen, Locator, Geometrie
  --------------------------------------------------------------- */
  var KEIN_RUF = /^(CQ|CQDX|QRZ|DE|73|88|RR73|RRR|RST|TU|TNX|QSL|QTH|QRP|LP|AGN|PSE|K|KN|BK|SK|CL|E|ME|MY|DXPED|TEST)$/;
  var MUSTER_RUF = /^([0-9][A-Z]{1,2}|[A-Z]{1,2})?[0-9]{1,2}[A-Z]{1,4}(\/[A-Z0-9]{1,3})?$|^[A-Z0-9]{1,3}\/([0-9][A-Z]{1,2}|[A-Z]{1,2})?[0-9]{1,2}[A-Z]{1,4}$/;
  var MUSTER_LOC = /^[A-R]{2}[0-9]{2}([A-X]{2}([0-9]{2})?)?$/;

  function istLocator(t) {
    if (KEIN_RUF.test(t)) { return false; }
    return MUSTER_LOC.test(t) && t.length >= 4 && t.length <= 8;
  }
  function istRufzeichen(t) {
    if (KEIN_RUF.test(t)) { return false; }
    if (istLocator(t)) { return false; }
    if (!MUSTER_RUF.test(t)) { return false; }
    return /[0-9]/.test(t) && /[A-Z]{1,2}[0-9]/.test(t);
  }
  function kern(t) {
    var m = t.match(/([0-9][A-Z]{1,2}|[A-Z]{1,2})?[0-9]{1,2}[A-Z]{1,4}/g) || [];
    var b = "";
    for (var i = 0; i < m.length; i++) { if (m[i].length > b.length) { b = m[i]; } }
    return b || t;
  }
  function alleRufzeichen(text) {
    var out = [], teile = String(text || "").toUpperCase().split(/[^A-Z0-9\/]+/);
    for (var i = 0; i < teile.length; i++) { if (istRufzeichen(teile[i])) { out.push(teile[i]); } }
    return out;
  }
  function locatorImText(text) {
    var teile = String(text || "").toUpperCase().split(/[^A-Z0-9]+/);
    for (var i = 0; i < teile.length; i++) { if (istLocator(teile[i])) { return teile[i]; } }
    return "";
  }
  function locatorZuKoordinaten(g) {
    g = String(g || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (g.length < 4) { return null; }
    var A = g.charCodeAt(0) - 65, B = g.charCodeAt(1) - 65;
    var C = parseInt(g[2], 10),   D = parseInt(g[3], 10);
    if (A < 0 || A > 17 || B < 0 || B > 17) { return null; }
    var lon = A * 20 - 180 + C * 2, lat = B * 10 - 90 + D * 1;
    if (g.length >= 6) {
      var E = g.charCodeAt(4) - 65, F = g.charCodeAt(5) - 65;
      if (E >= 0 && E < 24) { lon += (E * 5 + 2.5) / 60; }
      if (F >= 0 && F < 24) { lat += (F * 2.5 + 1.25) / 60; }
    }
    if (g.length >= 8) {
      lon += (parseInt(g[6], 10) * 0.5 + 0.25) / 60;
      lat += (parseInt(g[7], 10) * 0.25 + 0.125) / 60;
    } else if (g.length === 4) { lon += 1; lat += 0.5; }
    return { lat: lat, lon: lon };
  }
  function koordinatenZuLocator(lat, lon) {
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    lat = Math.max(-89.999, Math.min(89.999, lat));
    var g = "";
    g += String.fromCharCode(65 + Math.floor((lon + 180) / 20));
    g += String.fromCharCode(65 + Math.floor((lat + 90) / 10));
    g += String(Math.floor(((lon + 180) % 20) / 2));
    g += String(Math.floor((lat + 90) % 10));
    return g;
  }
  function entfernung(a, b) {                       // km (Großkreis)
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(s))));
  }
  function richtung(a, b) {                          // Grad, 0 = Nord
    var dLon = (b.lon - a.lon) * Math.PI / 180;
    var y = Math.sin(dLon) * Math.cos(b.lat * Math.PI / 180);
    var x = Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
            Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos(dLon);
    return Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360);
  }
  var HIMMEL = ["N","NNO","NO","ONO","O","OSO","SO","SSO","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  function himmelsrichtung(grad) { return HIMMEL[Math.round(grad / 22.5) % 16]; }

  function vorher(ts) {
    if (!ts) { return "noch nie"; }
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    { return "vor " + s + " s"; }
    if (s < 3600)  { return "vor " + Math.floor(s / 60) + " min"; }
    if (s < 86400) { return "vor " + Math.floor(s / 3600) + " h"; }
    return "vor " + Math.floor(s / 86400) + " d";
  }

  /* ---------------------------------------------------------------
     Eigener Standort (QTH)
  --------------------------------------------------------------- */
  function qthAusSeite() {
    /* Erste Wahl: der Empfaenger-Standort, den OpenWebRX+ selbst kennt */
    try {
      if (window.Utils && typeof window.Utils.getReceiverPos === "function") {
        var p = window.Utils.getReceiverPos();
        if (p && typeof p.lat === "number" && typeof p.lon === "number") {
          return { lat: p.lat, lon: p.lon, quelle: "Empfaenger-Standort" };
        }
      }
    } catch (eU) {}
    var quellen = [window.settings, window.details, window.receiverDetails,
                   window.openwebrxSettings, window.openwebrx_details];
    for (var i = 0; i < quellen.length; i++) {
      var s = quellen[i];
      if (!s) { continue; }
      try {
        var g = s.receiver_gps || s.gps || s.receiver_location;
        if (g && typeof g.lat === "number" && typeof g.lon === "number") {
          return { lat: g.lat, lon: g.lon, quelle: "Konfig" };
        }
        var q = s.receiver_locator || s.locator || s.qth || s.grid;
        if (typeof q === "string" && istLocator(q.toUpperCase())) {
          var k = locatorZuKoordinaten(q);
          if (k) { return { lat: k.lat, lon: k.lon, quelle: "Konfig" }; }
        }
      } catch (e) {}
    }
    return null;
  }
  function qth() {
    var manuell = lies(K_QTH, "");
    if (manuell) {
      if (istLocator(manuell.toUpperCase())) {
        var k = locatorZuKoordinaten(manuell);
        if (k) { return { lat: k.lat, lon: k.lon, quelle: "eigene Angabe", locator: manuell.toUpperCase() }; }
      }
      var mm = manuell.match(/(-?\d+[.,]\d+)\s*[,\/ ]\s*(-?\d+[.,]\d+)/);
      if (mm) {
        return { lat: parseFloat(mm[1].replace(",", ".")), lon: parseFloat(mm[2].replace(",", ".")),
                 quelle: "eigene Angabe", locator: koordinatenZuLocator(parseFloat(mm[1].replace(",",".")), parseFloat(mm[2].replace(",","."))) };
      }
    }
    var s = qthAusSeite();
    if (s) { s.locator = koordinatenZuLocator(s.lat, s.lon); return s; }
    return null;
  }

  /* ---------------------------------------------------------------
     Aussehen
  --------------------------------------------------------------- */
  function css() {
    if (document.getElementById("dnx-ft8-beob-css")) { return; }
    var s = document.createElement("style");
    s.id = "dnx-ft8-beob-css";
    s.textContent = [
      "#dnx-ft8-beob-fenster{",
      "  position:fixed;z-index:9996;width:470px;max-height:82vh;display:none;",
      "  flex-direction:column;background:#0f1713;color:#dfe9e3;",
      "  border:1px solid #2c4a3a;border-radius:8px;",
      "  box-shadow:0 6px 22px rgba(0,0,0,.55);",
      "  font:12.5px/1.45 'Segoe UI',Arial,sans-serif;}",
      "#dnx-ft8-beob-fenster.dnx-ft8-offen{display:flex;}",
      /* Eck-Griffe zum Ziehen der Groesse - Rahmen-Ecken in DNX-Gruen */
      ".dnx-ft8-ecke{position:absolute;width:15px;height:15px;z-index:9;",
      "  border:0 solid #35ff83;opacity:.9;touch-action:none;}",
      ".dnx-ft8-ecke:hover{opacity:1;border-color:#7dffb4;}",
      ".dnx-ft8-ecke.nw{left:-1px;top:-1px;cursor:nwse-resize;",
      "  border-left-width:3px;border-top-width:3px;border-top-left-radius:8px;}",
      ".dnx-ft8-ecke.ne{right:-1px;top:-1px;cursor:nesw-resize;",
      "  border-right-width:3px;border-top-width:3px;border-top-right-radius:8px;}",
      ".dnx-ft8-ecke.sw{left:-1px;bottom:-1px;cursor:nesw-resize;",
      "  border-left-width:3px;border-bottom-width:3px;border-bottom-left-radius:8px;}",
      ".dnx-ft8-ecke.se{right:-1px;bottom:-1px;cursor:nwse-resize;",
      "  border-right-width:3px;border-bottom-width:3px;border-bottom-right-radius:8px;}",
      ".dnx-ft8-ecke.se::after{content:'';position:absolute;right:1px;bottom:1px;width:9px;height:9px;",
      "  background:linear-gradient(135deg,transparent 0 40%,#35ff83 40% 55%,",
      "  transparent 55% 68%,#35ff83 68% 82%,transparent 82%);}",
      "#dnx-ft8-beob-kopf{display:flex;align-items:center;gap:8px;cursor:move;",
      "  padding:6px 18px;background:#182a20;border-bottom:1px solid #2c4a3a;",
      "  border-radius:8px 8px 0 0;user-select:none;}",
      "#dnx-ft8-beob-kopf b{color:#7fd8a0;font-size:12.5px;letter-spacing:.3px;flex:1;}",
      "#dnx-ft8-beob-karte-btn,#dnx-ft8-beob-zu,#dnx-ft8-beob-zeit-btn{background:none;border:1px solid #2c4a3a;",
      "  color:#9fc4ad;cursor:pointer;border-radius:4px;line-height:1;padding:2px 7px;font-size:11.5px;}",
      "#dnx-ft8-beob-karte-btn:hover,#dnx-ft8-beob-zu:hover,#dnx-ft8-beob-zeit-btn:hover{border-color:#35ff83;color:#fff;}",
      "#dnx-ft8-beob-zeit-btn{min-width:62px;font-weight:700;color:#8fd0ff;border-color:#2c4a3a;}",
      "select.dnx-ft8-wahl{background:#0f1a14;border:1px solid #2c4a3a;color:#dfe9e3;",
      "  border-radius:999px;padding:2px 6px;font-size:11.5px;max-width:132px;cursor:pointer;}",
      "select.dnx-ft8-wahl:focus{outline:none;border-color:#35ff83;}",
      "#dnx-ft8-beob-leiste,#dnx-ft8-beob-qthzeile{display:flex;flex-wrap:wrap;align-items:center;gap:5px;",
      "  padding:6px 8px;background:#141f19;border-bottom:1px solid #2c4a3a;}",
      ".dnx-ft8-titel{color:#7fd8a0;font-weight:700;font-size:11px;letter-spacing:.5px;}",
      "input.dnx-ft8-eingabe{background:#0f1a14;border:1px solid #2c4a3a;color:#dfe9e3;",
      "  border-radius:999px;padding:2px 8px;font-size:12px;text-transform:uppercase;}",
      "input.dnx-ft8-eingabe:focus{outline:none;border-color:#35ff83;}",
      "#dnx-ft8-beob-leiste button{background:#1f8f52;border:1px solid #35ff83;color:#f2fff8;",
      "  font-weight:700;border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer;}",
      "#dnx-ft8-beob-leiste button:hover{background:#27a862;}",
      "#dnx-ft8-beob-chips{display:contents;}",
      ".dnx-ft8-chip{display:inline-flex;align-items:center;gap:5px;cursor:pointer;",
      "  background:rgba(53,255,131,.13);border:1px solid rgba(53,255,131,.42);",
      "  color:#8ff0b6;border-radius:999px;padding:2px 9px;font-weight:700;font-size:11.5px;}",
      ".dnx-ft8-chip:hover{background:rgba(53,255,131,.26);}",
      ".dnx-ft8-chip .zahl{color:#d8ffe9;} .dnx-ft8-chip .wann{color:#6fbf90;font-weight:400;}",
      "#dnx-ft8-beob-leer{color:#6f8f7d;font-size:11.5px;font-style:italic;}",
      "#dnx-ft8-beob-karte{height:230px;display:block;border-bottom:1px solid #2c4a3a;}",
      "#dnx-ft8-beob-karte .leaflet-container{height:230px;background:#0b1410;}",
      "#dnx-ft8-beob-karte iframe{display:block;width:100%;height:230px;border:0;}",
      "#dnx-ft8-beob-karte .leer{padding:10px;color:#6f8f7d;font-size:11.5px;",
      "  height:230px;display:flex;align-items:center;justify-content:center;text-align:center;}",
      "#dnx-ft8-beob-tabelle{overflow:auto;max-height:200px;border-bottom:1px solid #2c4a3a;}",
      "#dnx-ft8-beob-tabelle table{width:100%;border-collapse:collapse;}",
      "#dnx-ft8-beob-tabelle thead th{position:sticky;top:0;background:#111c16;color:#7fd8a0;",
      "  text-align:left;font:700 10.5px/1.6 'Segoe UI',Arial,sans-serif;letter-spacing:.4px;",
      "  padding:3px 6px;border-bottom:1px solid #2c4a3a;}",
      "#dnx-ft8-beob-tabelle td{padding:2px 6px;border-bottom:1px solid #1b2a22;white-space:nowrap;",
      "  font-family:Consolas,'Courier New',monospace;font-size:11.5px;}",
      "#dnx-ft8-beob-tabelle td.zeit{color:#7f9b8b;}",
      "#dnx-ft8-beob-tabelle td.km{color:#8fd0ff;text-align:right;}",
      "#dnx-ft8-beob-tabelle td.nach{white-space:normal;width:100%;}",
      "#dnx-ft8-beob-tabelle tr.treffer > td{background:rgba(53,255,131,.14);}",
      "#dnx-ft8-beob-tabelle tr.treffer > td.nach{box-shadow:inset 3px 0 0 #35ff83;}",
      "#dnx-ft8-beob-tabelle .hinweis{color:#6f8f7d;font-style:italic;padding:6px;}",
      "#dnx-ft8-beob-tabelle a.ruf{color:#8ff0b6;text-decoration:none;border-bottom:1px dotted #4fbf83;font-weight:700;}",
      "#dnx-ft8-beob-tabelle a.ruf:hover{color:#fff;background:rgba(53,255,131,.18);}",
      "#dnx-ft8-beob-tabelle a.loc{color:#8fd0ff;text-decoration:none;border-bottom:1px dotted #4f8fbf;}",
      "#dnx-ft8-beob-tabelle a.loc:hover{color:#fff;background:rgba(80,160,255,.18);}",
      ".dnx-ft8-plus{color:#35ff83;opacity:.5;cursor:pointer;margin-left:2px;font-weight:700;}",
      ".dnx-ft8-plus:hover{opacity:1;}",
      "#dnx-ft8-beob-fuss{display:flex;gap:8px;flex-wrap:wrap;padding:5px 18px;",
      "  color:#6f8f7d;font-size:11px;background:#111c16;}",
      "#dnx-ft8-beob-fuss b{color:#8fd0a8;font-weight:600;}",
      "tr.dnx-ft8-treffer > td{background:rgba(53,255,131,.15) !important;}",
      "tr.dnx-ft8-treffer > td:first-child{box-shadow:inset 3px 0 0 #35ff83;}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---------------------------------------------------------------
     Verweise: selbst oeffnen, damit niemand sie umbiegen kann
  --------------------------------------------------------------- */
  function verweis(text, href, klasse, titel) {
    var a = document.createElement("a");
    a.className = klasse; a.textContent = text; a.href = href; a.title = titel || "";
    a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer");
    a.addEventListener("click", function (ev) {
      if (ev.preventDefault) { ev.preventDefault(); }
      if (ev.stopImmediatePropagation) { ev.stopImmediatePropagation(); }
      if (ev.stopPropagation) { ev.stopPropagation(); }
      try { window.open(href, "_blank", "noopener"); } catch (e) { window.location.href = href; }
      return false;
    }, true);
    return a;
  }

  /* ---------------------------------------------------------------
     Daten
  --------------------------------------------------------------- */
  var eintraege = [];        // Tabellenzeilen
  var stationen = {};        // Rufzeichen -> Station

  /* ---------------------------------------------------------------
     Fenster
  --------------------------------------------------------------- */
  var fenster = null, chips = null, tabelleBox = null, tbody = null;
  var karteBox = null, qthFeld = null, zaehlerBox = null;
  var karte = null, markerschicht = null, letzteKarte = 0, letzterPunkt = null;
  var karteNachlauf = null;
  var zoneFeld = null;
  function zoneFeldTitel() {
    if (zoneFeld) { zoneFeld.title = "Ortszeit: " + zoneHinweis(); }
  }

  function nachrichtBauen(text) {
    var frag = document.createDocumentFragment();
    var teile = String(text).split(/(\s+)/);
    for (var i = 0; i < teile.length; i++) {
      var teil = teile[i];
      if (/^\s+$/.test(teil)) { frag.appendChild(document.createTextNode(teil)); continue; }
      var wort = teil.toUpperCase();
      if (istRufzeichen(wort)) {
        frag.appendChild(verweis(teil, "https://www.qrz.com/db/" + encodeURIComponent(kern(wort)),
                                 "ruf", "qrz.com: " + kern(wort)));
        var p = document.createElement("span");
        p.className = "dnx-ft8-plus"; p.textContent = "+";
        p.title = kern(wort) + " beobachten";
        p.onclick = (function (r) { return function () { zufuegen(r); }; })(kern(wort));
        frag.appendChild(p);
        continue;
      }
      if (istLocator(wort)) {
        (function (w, t) {
          var a = verweis(t, "https://www.openstreetmap.org/?mlat=" +
                  locatorZuKoordinaten(w).lat.toFixed(4) + "&mlon=" +
                  locatorZuKoordinaten(w).lon.toFixed(4) + "#map=9/" +
                  locatorZuKoordinaten(w).lat.toFixed(4) + "/" + locatorZuKoordinaten(w).lon.toFixed(4),
                  "loc", "Karte: Locator " + w);
          a.addEventListener("click", function () { karteZeigen(w); }, true);
          frag.appendChild(a);
        })(wort, teil);
        continue;
      }
      if (wort.indexOf("CQ") === 0) {
        var s = document.createElement("span");
        s.style.color = "#ffd479"; s.style.fontWeight = "700"; s.textContent = teil;
        frag.appendChild(s); continue;
      }
      frag.appendChild(document.createTextNode(teil));
    }
    return frag;
  }

  function chipsZeichnen() {
    if (!chips) { return; }
    var keys = Object.keys(liste).sort();
    chips.innerHTML = "";
    if (!keys.length) {
      var l = document.createElement("span");
      l.id = "dnx-ft8-beob-leer";
      l.textContent = "noch nichts - eintragen oder + klicken";
      chips.appendChild(l);
      return;
    }
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var v = liste[k], st = stationen[k];
        var c = document.createElement("span");
        c.className = "dnx-ft8-chip";
        c.title = "beobachtet (" + v.n + "x)" +
                  (st ? ", zuletzt " + (st.locator || "ohne Locator") : "") +
                  " - Klick nimmt es von der Liste";
        var n = document.createElement("span"); n.className = "zahl"; n.textContent = "x" + v.n;
        var w = document.createElement("span"); w.className = "wann"; w.textContent = vorher(v.letzter);
        c.appendChild(document.createTextNode(k + " "));
        c.appendChild(n); c.appendChild(document.createTextNode(" ")); c.appendChild(w);
        c.onclick = function () { entfernen(k); };
        chips.appendChild(c);
      })(keys[i]);
    }
  }

  function zufuegen(ruf) {
    ruf = String(ruf || "").toUpperCase().replace(/[^A-Z0-9\/]/g, "");
    if (!ruf) { return; }
    if (Object.keys(liste).length >= MAX_CHIPS && !liste[ruf]) { return; }
    if (!liste[ruf]) { liste[ruf] = { n: 0, letzter: 0 }; }
    listeMerken(); chipsZeichnen(); tabelleNeu(); karteNeu();
  }
  function entfernen(ruf) { delete liste[ruf]; listeMerken(); chipsZeichnen(); tabelleNeu(); karteNeu(); }

  /* --- Tabelle --- */
  function kmText(eintrag) {
    if (!eintrag.locator) { return ""; }
    var q = qth();
    if (!q) { return ""; }
    return String(entfernung(q, locatorZuKoordinaten(eintrag.locator)));
  }
  function tabelleZeile(e) {
    var tr = document.createElement("tr");
    if (e.treffer) { tr.className = "treffer"; }
    var td1 = document.createElement("td"); td1.className = "zeit"; td1.textContent = zeitAnzeige(e.zeit);
    var td2 = document.createElement("td"); td2.className = "db";   td2.textContent = e.db;
    var td3 = document.createElement("td"); td3.className = "dt";   td3.textContent = e.dt;
    var td4 = document.createElement("td"); td4.className = "km";   td4.textContent = kmText(e);
    var td5 = document.createElement("td"); td5.className = "nach";
    td5.appendChild(nachrichtBauen(e.text));
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    tr.appendChild(td4); tr.appendChild(td5);
    return tr;
  }
  function tabelleNeu() {
    if (!tbody) { return; }
    var th = document.getElementById("dnx-ft8-beob-th-zeit");
    if (th) { th.textContent = zeitSpalte(); }
    tbody.innerHTML = "";
    if (!eintraege.length) {
      var tr = document.createElement("tr"), td = document.createElement("td");
      td.className = "hinweis"; td.colSpan = 5;
      td.textContent = "noch keine FT8-Meldung - wartet auf den Decoder ...";
      tr.appendChild(td); tbody.appendChild(tr);
      return;
    }
    for (var i = 0; i < eintraege.length; i++) { tbody.appendChild(tabelleZeile(eintraege[i])); }
    zaehlerNeu();
  }
  function zaehlerNeu() {
    if (!zaehlerBox) { return; }
    zaehlerBox.textContent = "Stationen " + Object.keys(stationen).length +
                             " · beobachtet " + Object.keys(liste).length;
  }

  /* ---------------------------------------------------------------
     Zeit

     FT8 liefert UTC. Angezeigt wird wahlweise UTC oder die Ortszeit.
     Welche Ortszeit gilt, bestimmt die Auswahl im Fenster:

       QTH (auto)       Zone wird aus dem eigenen Standort geraten
                        (ein paar Kasten in Europa; ausserhalb davon
                        gilt die Ortszeit des Browsers)
       Europa/Berlin    immer MEZ/MESZ, unabhaengig vom Betrachter
       Browser-Ortszeit Zone des eigenen Rechners
       UTC              keine Umrechnung

     Sommer-/Winterzeit rechnet Intl (die Zone des Systems) selbst.
  --------------------------------------------------------------- */
  var ZONEN = [
    { zone: "Europe/Berlin", kurz: "MEZ/MESZ", lonA: 5.5,  lonB: 15.1, latA: 47.2, latB: 55.1 },
    { zone: "Europe/London", kurz: "GMT/BST",  lonA: -8.7, lonB: 2.1,  latA: 49.8, latB: 60.9 },
    { zone: "Europe/Madrid", kurz: "MEZ/MESZ", lonA: -9.6, lonB: 4.4,  latA: 35.8, latB: 44.0 },
    { zone: "Europe/Rome",   kurz: "MEZ/MESZ", lonA: 6.5,  lonB: 19.0, latA: 36.5, latB: 47.1 },
    { zone: "Europe/Athens", kurz: "OEZ/OESZ", lonA: 19.0, lonB: 29.0, latA: 34.0, latB: 41.8 },
    { zone: "Europe/Helsinki", kurz: "OEZ/OESZ", lonA: 19.0, lonB: 31.6, latA: 59.7, latB: 70.1 }
  ];
  function zoneAusQth(q) {
    if (!q || typeof q.lon !== "number" || typeof q.lat !== "number") { return null; }
    for (var i = 0; i < ZONEN.length; i++) {
      var k = ZONEN[i];
      if (q.lon >= k.lonA && q.lon <= k.lonB && q.lat >= k.latA && q.lat <= k.latB) { return k.zone; }
    }
    return null;
  }
  /* liefert die IANA-Zone; "" = Ortszeit des Browsers */
  function zoneJetzt() {
    var modus = lies(K_ZONE, "qth");
    if (modus === "utc") { return "UTC"; }
    if (modus === "berlin") { return "Europe/Berlin"; }
    if (modus === "browser") { return ""; }
    var z = zoneAusQth(qth());
    if (z) { return z; }
    return "";                       /* ausserhalb der Kasten: Browser-Ortszeit */
  }
  function zoneHinweis() {
    var modus = lies(K_ZONE, "qth");
    if (modus === "utc") { return "keine Umrechnung - Anzeige in UTC"; }
    if (modus === "berlin") { return "Europa/Berlin - MEZ/MESZ wird automatisch beruecksichtigt"; }
    if (modus === "browser") { return "Zone des eigenen Rechners (" + browserZone() + ")"; }
    var z = zoneAusQth(qth());
    var q = qth();
    if (z) {
      return "aus QTH " + (q && q.locator ? q.locator : "?") + " erkannt: " + z;
    }
    return "QTH passt in keinen Kasten (" + (q && q.locator ? q.locator : "kein QTH") +
           ") - es gilt die Ortszeit des Browsers (" + browserZone() + ")";
  }
  function browserZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "?"; } catch (eZ) { return "?"; }
  }
  function ortZeitAn() { return lies(K_ORT, "1") === "1"; }

  /* "17:04:33" (UTC) -> Ortszeit der gewaehlten Zone */
  function umrechnen(utc, tz) {
    var m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(utc || "").trim());
    if (!m) { return utc; }
    var jetzt = new Date();
    var basis = Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate(),
                         parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3] || "0", 10));
    var d = basis - jetzt.getTime();                 /* Tageswechsel abfangen */
    if (d >  12 * 3600000) { basis -= 24 * 3600000; }
    if (d < -12 * 3600000) { basis += 24 * 3600000; }
    var opt = { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
    if (tz) { opt.timeZone = tz; }
    try { return new Intl.DateTimeFormat("de-DE", opt).format(new Date(basis)); }
    catch (eF) { return utc; }
  }
  /* Anzeige: je nach Schalter UTC oder Ortszeit.
     Achtung: "" heisst NICHT UTC, sondern "Ortszeit des Browsers" - nur der
     ausdrueckliche Modus utc liefert "UTC" und bleibt unverrechnet. */
  function zeitAnzeige(utc) {
    var txt = String(utc || "");
    if (!ortZeitAn()) { return txt; }
    var tz = zoneJetzt();
    if (tz === "UTC") { return txt; }
    return umrechnen(txt, tz);
  }
  function zeitSpalte() {
    if (!ortZeitAn()) { return "UTC"; }
    return (zoneJetzt() === "UTC") ? "UTC" : "Ortszeit";
  }

  /* --- Karte --- */
  function karteAufbauen() {
    if (karte || !karteBox) { return; }
    if (!window.L) { return; }
    try {
      karte = window.L.map(karteBox, { attributionControl: false, zoomControl: true, worldCopyJump: true });
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(karte);
      karte.setView([51.6, 7.0], 4);
      markerschicht = window.L.layerGroup().addTo(karte);
    } catch (e) { karte = null; }
  }
  function karteNeu(sofort) {
    if (!an || !karteAn) { return; }
    var jetzt = Date.now();
    if (!sofort && jetzt - letzteKarte < 1500) {
      /* nicht verpassen: kurz danach noch einmal zeichnen */
      if (!karteNachlauf) {
        karteNachlauf = setTimeout(function () { karteNachlauf = null; karteNeu(true); }, 1700);
      }
      return;
    }
    letzteKarte = jetzt;
    if (!karteBox) { return; }
    if (!window.L) { karteErsatz(); return; }
    karteAufbauen();
    if (!karte || !markerschicht) { karteErsatz(); return; }
    markerschicht.clearLayers();

    var q = qth();
    var punkte = [];
    if (q) {
      window.L.circleMarker([q.lat, q.lon], {
        radius: 6, color: "#4f9dff", weight: 2, fillColor: "#4f9dff", fillOpacity: 0.9
      }).bindPopup("<b>Eigener Standort</b><br>" + (q.locator || "") +
                   "<br>" + q.lat.toFixed(3) + ", " + q.lon.toFixed(3) +
                   "<br><small>" + (q.quelle || "") + "</small>").addTo(markerschicht);
      punkte.push([q.lat, q.lon]);
    }

    var namen = Object.keys(stationen);
    namen.sort(function (a, b) { return (stationen[b].letzter || 0) - (stationen[a].letzter || 0); });
    var gezeigt = 0;
    for (var i = 0; i < namen.length && gezeigt < MAX_PUNKTE; i++) {
      var st = stationen[namen[i]];
      if (!st.lat || !st.lon) { continue; }
      gezeigt++;
      var beob = !!liste[st.ruf];
      var farbe = beob ? "#35ff83" : "#8fd0ff";
      var km = q ? entfernung(q, { lat: st.lat, lon: st.lon }) : null;
      var peil = q ? himmelsrichtung(richtung(q, { lat: st.lat, lon: st.lon })) : "";
      var html = "<b>" + st.ruf + "</b>" + (beob ? " <span style='color:#35ff83'>(beobachtet, " +
                 (liste[st.ruf] ? liste[st.ruf].n : 0) + "x)</span>" : "") +
                 "<br>Locator " + (st.locator || "-") +
                 "<br>zuletzt " + zeitAnzeige(st.zeit) + " " + zeitSpalte() + " · " + vorher(st.letzter) +
                 (st.db ? " · " + st.db + " dB" : "") +
                 (km !== null ? "<br>" + km + " km " + peil : "") +
                 "<br><a href='https://www.qrz.com/db/" + encodeURIComponent(st.ruf) +
                 "' target='_blank' rel='noopener noreferrer'>qrz.com</a>" +
                 " · <a href='https://www.openstreetmap.org/?mlat=" + st.lat.toFixed(4) +
                 "&mlon=" + st.lon.toFixed(4) + "#map=9/" + st.lat.toFixed(4) + "/" + st.lon.toFixed(4) +
                 "' target='_blank' rel='noopener noreferrer'>Karte</a>";
      window.L.circleMarker([st.lat, st.lon], {
        radius: beob ? 7 : 5, color: farbe, weight: 2, fillColor: farbe, fillOpacity: beob ? 0.85 : 0.5
      }).bindPopup(html).addTo(markerschicht);
      if (q) {
        window.L.polyline([[q.lat, q.lon], [st.lat, st.lon]], {
          color: farbe, weight: beob ? 1.6 : 0.8, opacity: beob ? 0.8 : 0.35
        }).addTo(markerschicht);
      }
      punkte.push([st.lat, st.lon]);
    }
    if (punkte.length > 1) {
      try { karte.fitBounds(window.L.latLngBounds(punkte).pad(0.25)); } catch (e) {}
    } else if (q) {
      karte.setView([q.lat, q.lon], 4);
    }
  }
  function karteZeigen(locator) {
    var k = locatorZuKoordinaten(locator);
    if (!k) { return; }
    letzterPunkt = k;
    if (karte) { try { karte.setView([k.lat, k.lon], 7); } catch (e) {} }
  }
  function karteErsatz() {                        // ohne Leaflet: Kartenausschnitt als Rahmen
    if (!karteBox) { return; }
    var loc = letzterPunkt;
    if (!loc) {
      var letzte = eintraege.filter(function (e) { return e.locator; })[0];
      if (letzte) { loc = locatorZuKoordinaten(letzte.locator); }
    }
    if (!loc) {
      karteBox.innerHTML = "<div class='leer'>Karte nicht verfuegbar.<br>Sobald ein Locator empfangen wird, erscheint hier der Kartenausschnitt.</div>";
      return;
    }
    karteBox.innerHTML = "";
    var f = document.createElement("iframe");
    f.setAttribute("loading", "lazy");
    var bbox = (loc.lon - 2.5).toFixed(3) + "," + (loc.lat - 1.5).toFixed(3) + "," +
               (loc.lon + 2.5).toFixed(3) + "," + (loc.lat + 1.5).toFixed(3);
    f.src = "https://www.openstreetmap.org/export/embed.html?bbox=" + bbox +
            "&layer=mapnik&marker=" + loc.lat.toFixed(4) + "," + loc.lon.toFixed(4);
    karteBox.appendChild(f);
  }
  function zeitUmschalten() {
    merke(K_ORT, ortZeitAn() ? "0" : "1");
    var b = document.getElementById("dnx-ft8-beob-zeit-btn");
    if (b) {
      b.textContent = zeitSpalte();
      b.title = "Zwischen UTC und Ortszeit umschalten (jetzt: " + zeitSpalte() + ")";
    }
    var th = document.getElementById("dnx-ft8-beob-th-zeit");
    if (th) { th.textContent = zeitSpalte(); }
    tabelleNeu(); karteNeu(true);
  }

  function karteAnAus(neu) {
    karteAn = !!neu;
    merke(K_KARTE, karteAn ? "1" : "0");
    if (!karteBox) { return; }
    karteBox.style.display = karteAn ? "block" : "none";
    var b = document.getElementById("dnx-ft8-beob-karte-btn");
    if (b) { b.textContent = karteAn ? "Karte aus" : "Karte an"; }
    if (karteAn) {
      karteNeu(true);
      if (karte) { setTimeout(function () { try { karte.invalidateSize(); } catch (e) {} }, 60); }
    }
  }

  /* ---------------------------------------------------------------
     Groesse ziehen

     Vier Griff-Ecken in DNX-Gruen (wie bei den anderen DNX-Fenstern).
     Gezogen wird nur an den Ecken; die Groesse wird je Browser gemerkt
     und beim Oeffnen wiederhergestellt.
  --------------------------------------------------------------- */
  var MIN_BREIT = 320, MIN_HOEHE = 180;

  function groesseMerken() {
    if (!fenster) { return; }
    merke(K_GROSS, Math.round(fenster.offsetWidth) + "|" + Math.round(fenster.offsetHeight));
    merke(K_POS, fenster.offsetLeft + "|" + fenster.offsetTop);
  }
  function groesseAnwenden() {
    if (!fenster) { return; }
    var g = lies(K_GROSS, "");
    if (!g) { return; }
    var t = String(g).split("|");
    var b = parseInt(t[0], 10), h = parseInt(t[1], 10);
    if (isNaN(b) || isNaN(h)) { return; }
    b = Math.min(Math.max(MIN_BREIT, b), (window.innerWidth || 1200) - 8);
    h = Math.min(Math.max(MIN_HOEHE, h), (window.innerHeight || 800) - 8);
    fenster.style.width = b + "px";
    fenster.style.height = h + "px";
    fenster.style.maxHeight = "none";
  }
  function eckenBauen() {
    if (!fenster || fenster.__dnxEcken) { return; }
    fenster.__dnxEcken = true;
    var arten = [["nw", 1, 1], ["ne", 0, 1], ["sw", 1, 0], ["se", 0, 0]];
    for (var i = 0; i < arten.length; i++) {
      (function (art) {
        var ecke = document.createElement("div");
        ecke.className = "dnx-ft8-ecke " + art[0];
        ecke.title = "Groesse ziehen";
        ecke.setAttribute("data-dnx-capability", "");   // Gaeste duerfen ziehen
        fenster.appendChild(ecke);

        var amZiehen = false, sx = 0, sy = 0, b0 = 0, h0 = 0, l0 = 0, t0 = 0;
        var vonLinks = art[1], vonOben = art[2];

        ecke.addEventListener("pointerdown", function (e) {
          amZiehen = true;
          sx = e.clientX; sy = e.clientY;
          var r = fenster.getBoundingClientRect();
          b0 = r.width; h0 = r.height; l0 = fenster.offsetLeft; t0 = fenster.offsetTop;
          try { ecke.setPointerCapture(e.pointerId); } catch (eP) {}
          e.preventDefault(); e.stopPropagation();
        });
        ecke.addEventListener("pointermove", function (e) {
          if (!amZiehen) { return; }
          var dx = e.clientX - sx, dy = e.clientY - sy;
          var b = b0 + (vonLinks ? -dx : dx);
          var h = h0 + (vonOben  ? -dy : dy);
          var l = vonLinks ? l0 + dx : l0;
          var t = vonOben  ? t0 + dy : t0;
          if (b < MIN_BREIT) { if (vonLinks) { l -= (MIN_BREIT - b); } b = MIN_BREIT; }
          if (h < MIN_HOEHE) { if (vonOben)  { t -= (MIN_HOEHE - h); } h = MIN_HOEHE; }
          fenster.style.width = Math.round(b) + "px";
          fenster.style.height = Math.round(h) + "px";
          fenster.style.maxHeight = "none";
          if (vonLinks) { fenster.style.left = Math.round(l) + "px"; }
          if (vonOben)  { fenster.style.top = Math.max(2, Math.round(t)) + "px"; }
        });
        function ende() {
          if (!amZiehen) { return; }
          amZiehen = false;
          groesseMerken();
          if (karte) { try { karte.invalidateSize(); } catch (eI) {} }
        }
        ecke.addEventListener("pointerup", ende);
        ecke.addEventListener("pointercancel", ende);
      })(arten[i]);
    }
  }

  /* ---------------------------------------------------------------
     Fenster bauen
  --------------------------------------------------------------- */
  function fensterBauen() {
    if (fenster) { return fenster; }

    fenster = document.createElement("div");
    fenster.id = FENSTER_ID;
    fenster.setAttribute("data-dnx-capability", "");   // Gaeste duerfen bedienen

    /* Kopf */
    var kopf = document.createElement("div");
    kopf.id = "dnx-ft8-beob-kopf";
    var titel = document.createElement("b"); titel.textContent = "DNX FT8 - Beobachten und Verfolgen";
    var zbtn = document.createElement("button");
    zbtn.type = "button"; zbtn.id = "dnx-ft8-beob-zeit-btn";
    zbtn.title = "Zwischen UTC und Ortszeit umschalten (jetzt: " + zeitSpalte() + ")";
    zbtn.textContent = zeitSpalte();
    zbtn.onclick = function () { zeitUmschalten(); };
    var kbtn = document.createElement("button");
    kbtn.type = "button"; kbtn.id = "dnx-ft8-beob-karte-btn";
    kbtn.textContent = karteAn ? "Karte aus" : "Karte an";
    kbtn.title = "Karte ein- oder ausblenden";
    kbtn.onclick = function () { karteAnAus(!karteAn); };
    var zu = document.createElement("button");
    zu.type = "button"; zu.id = "dnx-ft8-beob-zu"; zu.textContent = "x";
    zu.title = "Beobachten ausschalten";
    zu.onclick = function () { anSetzen(false); };
    kopf.appendChild(titel); kopf.appendChild(zbtn); kopf.appendChild(kbtn); kopf.appendChild(zu);

    /* Merkliste */
    var leiste = document.createElement("div");
    leiste.id = "dnx-ft8-beob-leiste";
    var t2 = document.createElement("span"); t2.className = "dnx-ft8-titel"; t2.textContent = "BEOBACHTEN:";
    chips = document.createElement("span"); chips.id = "dnx-ft8-beob-chips";
    var eingabe = document.createElement("input");
    eingabe.className = "dnx-ft8-eingabe"; eingabe.maxLength = 12;
    eingabe.placeholder = "Rufzeichen"; eingabe.style.width = "104px";
    var plus = document.createElement("button");
    plus.type = "button"; plus.textContent = "+";
    plus.onclick = function () { zufuegen(eingabe.value); eingabe.value = ""; };
    eingabe.onkeydown = function (e) { if (e.key === "Enter") { plus.click(); } };
    leiste.appendChild(t2); leiste.appendChild(chips);
    leiste.appendChild(eingabe); leiste.appendChild(plus);

    /* Standort + Zaehler */
    var qthZeile = document.createElement("div");
    qthZeile.id = "dnx-ft8-beob-qthzeile";
    var qt = document.createElement("span"); qt.className = "dnx-ft8-titel"; qt.textContent = "QTH:";
    qthFeld = document.createElement("input");
    qthFeld.className = "dnx-ft8-eingabe"; qthFeld.style.width = "92px";
    var q0 = qth();
    qthFeld.value = lies(K_QTH, "") || (q0 ? q0.locator : "");
    qthFeld.placeholder = "JO31";
    qthFeld.title = "Eigener Locator oder Breite,Länge - fuer Entfernungsangaben";
    qthFeld.onchange = function () { merke(K_QTH, qthFeld.value.trim()); zoneFeldTitel(); tabelleNeu(); karteNeu(true); };

    /* Zeit: welche Ortszeit gilt? */
    var zt = document.createElement("span"); zt.className = "dnx-ft8-titel"; zt.textContent = "Zeit:";
    zoneFeld = document.createElement("select");
    zoneFeld.id = "dnx-ft8-beob-zone";
    zoneFeld.className = "dnx-ft8-wahl";
    [["qth", "QTH (auto)"], ["berlin", "Berlin MEZ/MESZ"],
     ["browser", "Browser-Ortszeit"], ["utc", "UTC"]].forEach(function (o) {
      var op = document.createElement("option");
      op.value = o[0]; op.textContent = o[1];
      zoneFeld.appendChild(op);
    });
    zoneFeld.value = lies(K_ZONE, "qth");
    zoneFeld.onchange = function () {
      merke(K_ZONE, zoneFeld.value);
      zoneFeldTitel();
      var b = document.getElementById("dnx-ft8-beob-zeit-btn");
      if (b) {
        b.textContent = zeitSpalte();
        b.title = "Zwischen UTC und Ortszeit umschalten (jetzt: " + zeitSpalte() + ")";
      }
      tabelleNeu(); karteNeu(true);
    };
    zaehlerBox = document.createElement("span");
    zaehlerBox.style.cssText = "margin-left:auto;color:#6f8f7d;font-size:11px;";
    qthZeile.appendChild(qt); qthZeile.appendChild(qthFeld);
    qthZeile.appendChild(zt); qthZeile.appendChild(zoneFeld);
    qthZeile.appendChild(zaehlerBox);
    setTimeout(zoneFeldTitel, 400);

    /* Karte */
    karteBox = document.createElement("div");
    karteBox.id = "dnx-ft8-beob-karte";

    /* Tabelle */
    tabelleBox = document.createElement("div");
    tabelleBox.id = "dnx-ft8-beob-tabelle";
    tabelleBox.innerHTML = "<table><thead><tr><th id='dnx-ft8-beob-th-zeit'>" + zeitSpalte() +
                           "</th><th>dB</th><th>DT</th><th>km</th><th>Nachricht</th></tr></thead><tbody></tbody></table>";
    tbody = tabelleBox.querySelector("tbody");

    var fuss = document.createElement("div");
    fuss.id = "dnx-ft8-beob-fuss";
    fuss.innerHTML = "<span><b>Rufzeichen</b> = qrz.com</span><span><b>Locator</b> = Karte</span>" +
                     "<span><b>+</b> merkt vor</span>";

    fenster.appendChild(kopf); fenster.appendChild(leiste); fenster.appendChild(qthZeile);
    fenster.appendChild(karteBox); fenster.appendChild(tabelleBox); fenster.appendChild(fuss);
    (document.body || document.documentElement).appendChild(fenster);

    /* Position */
    var pos = lies(K_POS, ""), l = null, t = null;
    if (pos) {
      var pp = String(pos).split("|");
      l = parseInt(pp[0], 10); t = parseInt(pp[1], 10);
      if (isNaN(l) || isNaN(t)) { l = null; t = null; }
    }
    if (l === null) {
      l = Math.max(8, (window.innerWidth || 1200) - 470 - 16);
      t = 110;
    }
    fenster.style.left = l + "px";
    fenster.style.top = Math.max(4, t) + "px";

    /* Verschieben */
    (function () {
      var ziehen = false, dx = 0, dy = 0;
      kopf.addEventListener("pointerdown", function (e) {
        /* Nicht ziehen, wenn ein Knopf im Kopf getroffen wurde - sonst faengt
           setPointerCapture den Zeiger ein und der Klick kommt nie am Knopf an. */
        if (e.target && e.target.closest && e.target.closest("button,select,input,a")) { return; }
        ziehen = true;
        dx = e.clientX - fenster.offsetLeft; dy = e.clientY - fenster.offsetTop;
        try { kopf.setPointerCapture(e.pointerId); } catch (err) {}
      });
      kopf.addEventListener("pointermove", function (e) {
        if (!ziehen) { return; }
        var nx = Math.min(Math.max(0, e.clientX - dx), (window.innerWidth || 1200) - 60);
        var ny = Math.min(Math.max(0, e.clientY - dy), (window.innerHeight || 800) - 30);
        fenster.style.left = nx + "px"; fenster.style.top = ny + "px";
      });
      kopf.addEventListener("pointerup", function () {
        if (!ziehen) { return; }
        ziehen = false;
        merke(K_POS, fenster.offsetLeft + "|" + fenster.offsetTop);
      });
    })();

    karteBox.style.display = karteAn ? "block" : "none";
    groesseAnwenden();
    eckenBauen();
    chipsZeichnen(); tabelleNeu();
    if (karteAn) { karteNeu(true); }
    return fenster;
  }

  /* ---------------------------------------------------------------
     Gaestefreigabe

     Knopf und Fenster tragen data-dnx-capability="" (leer). Bei der
     Klick-Pruefung heisst leer: keine Berechtigung noetig - Gaeste
     duerfen durch. Die Rechteverwaltung (dnx_access.js) schaltet aber
     zusaetzlich alles mit diesem Merkmal ab (disabled/inert), auch bei
     leerem Wert. Damit der Knopf nicht taub wird, werden disabled und
     inert hier zurueckgestellt - aber nur bei Elementen, die ein
     LEERES Merkmal tragen. Wird dem Werkzeug spaeter in der
     Rechteverwaltung eine Berechtigung zugewiesen, bleibt das
     massgeblich: dann wird hier nicht eingegriffen.
  --------------------------------------------------------------- */
  function gastFrei(el) {
    if (!el) { return; }
    if (el.getAttribute("data-dnx-capability") !== "") { return; }
    try {
      if (el.disabled) { el.disabled = false; }
      if (el.inert) { el.inert = false; }
      if (el.getAttribute("data-dnx-rights-disabled") === "1") {
        el.removeAttribute("data-dnx-rights-disabled");
      }
      if (el.getAttribute("aria-disabled") === "true") { el.removeAttribute("aria-disabled"); }
      if (el.getAttribute("data-dnx-readonly") === "1") { el.setAttribute("data-dnx-readonly", "0"); }
    } catch (eG) {}
  }
  function gaesteFrei() {
    gastFrei(knopfBauen());
    gastFrei(fenster);
    var ec = document.querySelectorAll(".dnx-ft8-ecke");
    for (var ie = 0; ie < ec.length; ie++) { gastFrei(ec[ie]); }
    if (fenster) {
      var f = fenster.querySelectorAll("[data-dnx-capability]");
      for (var i = 0; i < f.length; i++) { gastFrei(f[i]); }
    }
  }

  /* ---------------------------------------------------------------
     Knopf
  --------------------------------------------------------------- */
  function knopfBauen() {
    var b = document.getElementById(KNOPF_ID);
    if (!b) {
      b = document.createElement("button");
      b.type = "button"; b.id = KNOPF_ID;
      b.setAttribute("data-dnx-capability", "");
    }
    b.textContent = "DNX FT8: " + (an ? "An" : "Aus");
    b.title = "DNX FT8: FT8-Rufzeichen beobachten und verfolgen (" + (an ? "an" : "aus") + ")";
    try {
      b.style.setProperty("background", an ? "#1f8f52" : "#666666", "important");
      b.style.setProperty("color", an ? "#f2fff8" : "#ffffff", "important");
    } catch (e) {}
    return b;
  }
  function knopfEinhaengen() {
    var b = knopfBauen();
    var row = document.getElementById("dnx-master-tool-row");
    var ziel = row || document.getElementById("dnx-an-panel") ||
               document.getElementById("openwebrx-panel-receiver") || document.body;
    if (b.parentNode !== ziel) { ziel.appendChild(b); }
    if (row && b.parentNode !== row && row !== ziel) { row.appendChild(b); }
  }

  /* ---------------------------------------------------------------
     Mithoeren
  --------------------------------------------------------------- */
  function panels() {
    var out = [], el = document.querySelectorAll("div[id^='openwebrx-panel-wsjt']");
    for (var i = 0; i < el.length; i++) {
      var tb = el[i].querySelector("tbody");
      if (tb) { out.push(tb); }
    }
    return out;
  }

  function stationMerken(ruf, e, zaehlen) {
    var s = stationen[ruf];
    if (!s) { s = stationen[ruf] = { ruf: ruf, n: 0, zuerst: 0, letzter: 0 }; }
    if (e.locator) {
      var k = locatorZuKoordinaten(e.locator);
      if (k) { s.lat = k.lat; s.lon = k.lon; s.locator = e.locator; }
    }
    if (e.db) { s.db = e.db; }
    if (e.zeit) { s.zeit = e.zeit; }
    if (zaehlen !== false) {
      s.n++; s.letzter = Date.now();
      if (!s.zuerst) { s.zuerst = Date.now(); }
    }
  }

  function zeileAufnehmen(tr, zaehlen) {
    if (!an) { return; }
    if (zaehlen !== false) {
      if (tr.__dnxFt8) { return; }
      tr.__dnxFt8 = true;
    }
    var msg = tr.querySelector ? tr.querySelector("td.message") : null;
    var text = msg ? String(msg.textContent || "") : "";
    if (!text) { return; }
    var txt = text.toUpperCase();

    var treffer = false, keys = Object.keys(liste);
    for (var i = 0; i < keys.length; i++) {
      if (txt.indexOf(keys[i]) >= 0) {
        if (zaehlen !== false) { liste[keys[i]].n++; liste[keys[i]].letzter = Date.now(); }
        treffer = true;
      }
    }

    var zelle = tr.querySelector("td.time");
    var eintrag = {
      zeit: zelle ? String(zelle.textContent || "") : "",
      db: tr.children[1] ? String(tr.children[1].textContent || "") : "",
      dt: tr.children[2] ? String(tr.children[2].textContent || "") : "",
      locator: locatorImText(text),
      text: text,
      treffer: treffer
    };
    eintraege.unshift(eintrag);
    while (eintraege.length > MAX_ZEILEN) { eintraege.pop(); }

    /* alle Rufzeichen der Zeile als Station erfassen */
    var rufe = alleRufzeichen(text);
    for (var r = 0; r < rufe.length; r++) { stationMerken(kern(rufe[r]), eintrag, zaehlen); }

    if (tbody) {
      if (eintraege.length === 1) { tbody.innerHTML = ""; }
      tbody.insertBefore(tabelleZeile(eintrag), tbody.firstChild);
      while (tbody.children.length > MAX_ZEILEN) { tbody.removeChild(tbody.lastChild); }
    }

    if (treffer) { tr.classList.add("dnx-ft8-treffer"); }
    if (zaehlen !== false) {
      listeMerken(); chipsZeichnen();
      if (eintrag.locator) { letzterPunkt = locatorZuKoordinaten(eintrag.locator); }
      karteNeu();
    }
    zaehlerNeu();
  }

  function panelHaken(tb) {
    if (!tb || tb.__dnxFt8Haken) { return; }
    tb.__dnxFt8Haken = true;
    try {                                   /* Bestand mitnehmen, ohne zu zaehlen */
      var alt = tb.querySelectorAll("tr");
      var von = Math.max(0, alt.length - MAX_ZEILEN);
      for (var a = von; a < alt.length; a++) { zeileAufnehmen(alt[a], false); }
    } catch (eAlt) {}
    try {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var nodes = muts[i].addedNodes || [];
          for (var j = 0; j < nodes.length; j++) {
            if (nodes[j] && nodes[j].tagName === "TR") { zeileAufnehmen(nodes[j], true); }
          }
        }
      }).observe(tb, { childList: true });
    } catch (e) {}
  }

  function markierungWeg() {
    try {
      var r = document.querySelectorAll("tr.dnx-ft8-treffer");
      for (var i = 0; i < r.length; i++) { r[i].classList.remove("dnx-ft8-treffer"); }
    } catch (e) {}
  }

  /* ---------------------------------------------------------------
     AN / AUS
  --------------------------------------------------------------- */
  function anSetzen(neu) {
    an = !!neu;
    merke(K_AN, an ? "1" : "0");
    knopfEinhaengen();
    if (an) {
      fensterBauen();
      fenster.classList.add("dnx-ft8-offen");
      gaesteFrei();
      var ps = panels();
      for (var i = 0; i < ps.length; i++) { panelHaken(ps[i]); }
      chipsZeichnen(); tabelleNeu(); karteNeu(true);
      if (karte) { setTimeout(function () { try { karte.invalidateSize(); } catch (e) {} }, 80); }
    } else {
      if (fenster) { fenster.classList.remove("dnx-ft8-offen"); }
      markierungWeg();
    }
  }

  /* ---------------------------------------------------------------
     Start
  --------------------------------------------------------------- */
  document.addEventListener("click", function (ev) {
    if (ev && ev.__dnxFt8Behandelt) { return; }
    var t = ev.target;
    if (!t || !t.closest) { return; }
    if (!t.closest("#" + KNOPF_ID)) { return; }
    try { ev.__dnxFt8Behandelt = true; } catch (eE) {}
    if (ev.preventDefault) { ev.preventDefault(); }
    if (ev.stopPropagation) { ev.stopPropagation(); }
    anSetzen(!an);
  }, true);

  css();
  knopfEinhaengen();
  gaesteFrei();
  if (an) { anSetzen(true); }

  var versuche = 0;
  var takt = setInterval(function () {
    versuche++;
    knopfEinhaengen();
    gaesteFrei();
    if (an) {
      var ps = panels();
      for (var i = 0; i < ps.length; i++) { panelHaken(ps[i]); }
    }
    if (versuche > 240) { clearInterval(takt); }
  }, 500);

  setInterval(function () { if (an) { chipsZeichnen(); zoneFeldTitel(); } }, 15000);

  window.DNXFt8Beob = {
    an: function () { return an; },
    setze: function (v) { anSetzen(!!v); return true; },
    isVisible: function () { return !!(fenster && fenster.classList.contains("dnx-ft8-offen")); },
    show: function () { anSetzen(true); },
    hide: function () { anSetzen(false); },
    liste: function () { return liste; },
    stationen: function () { return stationen; },
    zeilen: function () { return eintraege; },
    qth: function () { return qth(); },
    merken: function (ruf) { zufuegen(ruf); }
  };
})();
