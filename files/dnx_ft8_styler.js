/* =====================================================================
   DNX FT8  v1.4.0  -  Schalter im DNX-Styler
   ---------------------------------------------------------------------
   Drei Haken in der Styler-Rubrik "Werkzeuge an / aus":

       [x] FT8 openwebrx        das Original-FT8-Fenster von OpenWebRX
       [x] DNX FT8              dieses Werkzeug (Knopf in der Werkzeugreihe)
       [ ] FT8 zusammen schalten  wer von beiden umschaltet, nimmt den
                                 anderen mit (wie 2D & 3D Wasserfall)

   Damit ist beides moeglich: beide zusammen einschalten (Koppel-Haken)
   oder jedes fuer sich (Koppel-Haken aus, einzelne Haken setzen).

   Die Haken werden nur in die vorhandene Werkzeug-Box des Stylers
   eingehangen (wie dnx_wf_2d3d.js). Der Styler selbst bleibt unberuehrt.
   Alle 800 ms wird der echte Zustand nachgezogen - wer also im Fenster
   oder in der Werkzeugreihe schaltet, sieht den Haken mitgehen.

   Private, inoffizielle Hobby-Anpassung; kein offizielles
   OpenWebRX-/OpenWebRX+-Projekt. Nutzung auf eigene Gefahr.
   ===================================================================== */
(function () {
    "use strict";
    if (window.__dnxFt8Styler) { return; }
    window.__dnxFt8Styler = true;

    var SPEICHER = "dnx_ft8_koppel";
    var ID_OWRX  = "dnx-tool-ft8owrx";
    var ID_DNX   = "dnx-tool-ft8dnx";
    var ID_KOPP  = "dnx-tool-ft8zusammen";
    var KNOPF    = "dnx-master-ft8beob";   /* Knopf in der DNX-Werkzeugreihe */

    var koppel = false;
    try { koppel = localStorage.getItem(SPEICHER) === "1"; } catch (eL) { }

    var elOwrx = null, elDnx = null, elKopp = null;
    var gebaut = false;
    var vorher = null;      /* zuletzt gesehener Stand beider Haken */
    var offene = null;      /* mein eigenes Umschalten, noch nicht bestaetigt */

    /* ---------- Original: FT8 von OpenWebRX -----------------------------
       Geschaltet wird ueber den Sekundaer-Demodulator (Auswahl "ft8").
       Ist der Haken gesetzt, bleibt das Meldungsfenster sichtbar, auch
       wenn OpenWebRX es gerade verstecken moechte.                     */
    function demod() {
        return document.querySelector(".openwebrx-secondary-demod-listbox");
    }
    function owrxStand() {
        var s = demod();
        if (!s) { return null; }
        return String(s.value || "").toLowerCase() === "ft8";
    }
    function fensterZeigen(an) {
        var st = document.getElementById("dnx-ft8-styler-style");
        if (!st) {
            st = document.createElement("style");
            st.id = "dnx-ft8-styler-style";
            (document.head || document.documentElement).appendChild(st);
        }
        st.textContent = an ? "#openwebrx-panel-wsjt-message{display:block !important;}" : "";
    }
    function owrxSetze(an) {
        var s = demod();
        if (!s) { return false; }
        var wert = an ? "ft8" : "none";
        s.value = wert;
        try { s.dispatchEvent(new Event("change", { bubbles: true })); } catch (eD) { }
        fensterZeigen(!!an);
        return String(s.value || "").toLowerCase() === wert;
    }

    /* ---------- DNX FT8: Knopf in der Werkzeugreihe --------------------- */
    /* Bevorzugt ueber die eigene Schnittstelle des Werkzeugs - die greift
       unabhaengig davon, ob der Knopf gerade bedienbar ist. */
    function dnxStand() {
        if (window.DNXFt8Beob && typeof window.DNXFt8Beob.an === "function") {
            try { return !!window.DNXFt8Beob.an(); } catch (eA) { }
        }
        var b = document.getElementById(KNOPF);
        if (!b) { return null; }
        var t = String(b.textContent || "");
        if (/(:\s*)(on|an)\b/i.test(t)) { return true; }
        if (/(:\s*)(off|aus)\b/i.test(t)) { return false; }
        return null;
    }
    function dnxSetze(an) {
        if (window.DNXFt8Beob && typeof window.DNXFt8Beob.setze === "function") {
            try { window.DNXFt8Beob.setze(!!an); return true; } catch (eS) { }
        }
        var b = document.getElementById(KNOPF);
        if (!b) { return false; }
        var jetzt = dnxStand();
        if (jetzt === null || jetzt === an) { return jetzt !== null; }
        try { b.click(); return true; } catch (eC) { return false; }
    }

    /* ---------- Haken bauen -------------------------------------------- */
    function haken(box, id, text, titel, beimWechsel) {
        var alt = document.getElementById(id);
        if (alt) { return alt; }
        var zeile = document.createElement("label");
        zeile.style.cssText = "display:flex;align-items:center;gap:6px;padding:1px 0;cursor:pointer;";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = id;
        cb.onchange = function () {
            var an = cb.checked;
            if (id === ID_KOPP) {
                koppel = an;
                try { localStorage.setItem(SPEICHER, an ? "1" : "0"); } catch (eS) { }
                vorher = null;
                offene = null;
                angleichen(true);          /* beim Einschalten sofort angleichen */
                return;
            }
            try { beimWechsel(an); } catch (eW) { }
            /* NICHT vorher/offene zuruecksetzen: der naechste Takt muss diesen
               Wechsel als Benutzer-Eingabe erkennen, damit das Koppeln greift. */
        };
        var tx = document.createElement("span");
        tx.textContent = text;
        tx.title = titel;
        zeile.appendChild(cb);
        zeile.appendChild(tx);
        box.appendChild(zeile);
        return cb;
    }

    function bauen() {
        if (gebaut) { return true; }
        var box = document.getElementById("dnx-tools-box");
        if (!box) { return false; }
        elOwrx = haken(box, ID_OWRX, "FT8 openwebrx",
            "Das Original-FT8-Fenster von OpenWebRX (WSJT-Dekoder) ein- oder ausschalten.",
            function (an) { return owrxSetze(an); });
        elDnx = haken(box, ID_DNX, "DNX FT8",
            "Das DNX-Werkzeug: FT8-Rufzeichen beobachten und verfolgen.",
            function (an) { return dnxSetze(an); });
        elKopp = haken(box, ID_KOPP, "FT8 zusammen schalten",
            "Ist der Haken gesetzt, nimmt ein Umschalten das andere FT8-Werkzeug mit.",
            function () { return true; });
        if (elKopp) { elKopp.checked = koppel; }
        gebaut = true;
        return true;
    }

    /* ---------- Zustand nachziehen ------------------------------------- */
    function syncHaken() {
        if (!gebaut) { return; }
        var w = owrxStand(), d = dnxStand();
        if (elOwrx && w !== null) { elOwrx.checked = !!w; fensterZeigen(!!w); }
        if (elDnx && d !== null) { elDnx.checked = !!d; }
        if (elKopp) { elKopp.checked = koppel; }
    }

    /* ---------- Koppeln ------------------------------------------------ */
    function setze(seite, el, wert, jetzt) {
        var stand = { owrx: jetzt.owrx, dnx: jetzt.dnx };
        stand[seite] = wert;
        offene = { seite: seite, wert: wert, stand: stand };
        vorher = stand;
        if (el) {
            el.checked = wert;
            try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch (eE) { }
        }
    }
    function angleichen(sofort) {
        if (!koppel || !gebaut) { vorher = null; offene = null; return; }
        var w = owrxStand(), d = dnxStand();
        if (w === null || d === null) { return; }

        var jetzt = { owrx: !!w, dnx: !!d };

        /* mein eigenes Umschalten: hat es gegriffen? */
        if (offene) {
            var o = offene;
            offene = null;
            vorher = (jetzt[o.seite] === o.wert) ? { owrx: o.stand.owrx, dnx: o.stand.dnx } : jetzt;
            return;
        }

        var alt = vorher;
        vorher = jetzt;
        if (!alt) {
            if (sofort && jetzt.owrx !== jetzt.dnx) { setze("dnx", elDnx, jetzt.owrx, jetzt); }
            return;
        }
        if (jetzt.owrx !== alt.owrx && jetzt.dnx === alt.dnx) { setze("dnx", elDnx, jetzt.owrx, jetzt); return; }
        if (jetzt.dnx !== alt.dnx && jetzt.owrx === alt.owrx) { setze("owrx", elOwrx, jetzt.dnx, jetzt); return; }
        /* beide gleichzeitig geaendert -> nichts tun */
    }

    setInterval(function () {
        try {
            bauen();
            syncHaken();
            angleichen(false);
        } catch (eT) { }
    }, 800);
})();
