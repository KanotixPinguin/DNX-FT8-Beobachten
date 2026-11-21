# DNX FT8

<!-- DNX-DISCLAIMER-START -->
> **Wichtiger Hinweis / Vollständige Distanzierung (Hobby-Mod-Mode)**
>
> - **Vollständige Distanzierung:** Ich distanziere mich in jeder Hinsicht vollständig vom Projekt **OpenWebRX / OpenWebRX+** sowie dessen Entwicklern und Betreibern. Es besteht keinerlei Verbindung, Zusammenarbeit, Prüfung, Befürwortung oder Partnerschaft.
> - **Keine öffentlichen/offiziellen OpenWebRX-Plugins (nur Mod-Mode):** Bei diesem Projekt handelt es sich ausdrücklich **nicht** um ein öffentliches oder offizielles Plugin von OpenWebRX, sondern ausschließlich um einen privaten, inoffiziellen **Mod-Mode** (Eigenmodifikation).
> - **Warum bewusst kein reines Browser-JavaScript (Mod-Mode-Architektur):** Viele Funktionen (z. B. serverseitige Speicherung, Konten-/Rollenverwaltung, Profil-Synchronisation, VNC-/websockify-Brücken, geschützte Schnittstellen, Docker-/Systemintegration und stabile UI-Anpassungen) lassen sich sauber und sicher nicht allein über simples Client-JavaScript umsetzen, ohne den OpenWebRX-Kern umzubauen oder Browsergrenzen zu umgehen. Deshalb setzt dieses Projekt bewusst auf getrennte Begleitmodule, Shell-Installer und Dienste im **Mod-Mode** statt alles künstlich in reines JavaScript zu pressen.
> - **Kein öffentlicher Support & keine Haftung:** Es gibt **keinen öffentlichen Support**, keine Garantie und keine Haftung. Nutzung, Installation und Anpassung erfolgen vollständig auf eigene Gefahr (immer vorher Backups anlegen und zunächst im eigenen Testsystem prüfen).
> - **Reines Hobbyprojekt – frei nutzbar, änderbar & verbreitbar:** Dieses Projekt entsteht ausschließlich aus reinem Hobby und Interesse am gemeinsamen Funk-/SDR-Hobby. Es steht ausdrücklich frei zur Verfügung und darf frei genutzt, weiterverbreitet, verändert und verbessert werden.
<!-- DNX-DISCLAIMER-END -->

Ein Knopf in der DNX-Werkzeugreihe (**„DNX FT8: An" / „DNX FT8: Aus"**) und ein
Fenster, in dem FT8-Rufzeichen festgehalten werden, damit man sie nicht aus den Augen
verliert — **mit eigener Karte, Stationen-Verfolgung und FT8-Tabelle**.

## Funktionen

- **Knopf unter „Werkzeuge"**: `DNX FT8: An` (grün) oder `DNX FT8: Aus` (grau).
  - **AN** = Fenster sichtbar **und** Beobachten aktiv: Tabelle läuft mit, Treffer werden markiert
  - **AUS** = beides weg: Fenster zu, keine Markierung, es wird nichts gezählt
- **Karte** (Leaflet/OpenStreetMap, 230 px): eigener Standort (blau), **jede gehörte
  Station als Punkt**, Linie vom eigenen Standort dorthin, **beobachtete Stationen grün**.
  Ein Klick auf einen Punkt zeigt Rufzeichen (mit qrz.com-Verweis), Locator, Uhrzeit,
  dB, **Entfernung in km und Himmelsrichtung**. Die Karte rahmt alle Punkte automatisch ein.
- **Verfolgen**: pro Station werden Anzahl, erstmals/zuletzt gehört, Locator und dB
  gemerkt — sichtbar in der Karte, in der Tabelle (Spalte km) und in den Chips.
- **Zeit**: FT8 liefert **UTC** — das Fenster kann es in **Ortszeit** zeigen. Der Schalter
  `Ortszeit` / `UTC` sitzt im Fensterkopf; welche Ortszeit gilt, wählt das Feld **Zeit:**
  neben dem QTH:
  - **QTH (auto)** – Zone wird aus dem eigenen Standort erkannt (einige Kästen in Europa;
    JO31/Dorsten ergibt *Europe/Berlin*). Außerhalb davon gilt die Ortszeit des Browsers.
  - **Berlin MEZ/MESZ** – immer deutsche Zeit, Sommer/Winter automatisch
  - **Browser-Ortszeit** – Zone des eigenen Rechners
  - **UTC** – keine Umrechnung
  Sommer- und Winterzeit rechnet das System; die Wahl wird je Browser gespeichert.
- **FT8-Tabelle** (Zeit, dB, DT, km, Nachricht): alle Meldungen des Decoders, neueste oben,
  **Treffer grün hervorgehoben**. Beim Einschalten werden die zuletzt empfangenen Zeilen
  mitgenommen, ohne die Zähler zu verfälschen.
- **Eigener Standort (QTH)**: wird aus der Empfänger-Konfiguration gelesen
  (`receiver_gps`) und kann im Feld **QTH** überschrieben werden (Locator wie `JO31`
  oder `51.65,6.97`); bleibt gespeichert. Ohne Angabe bleiben die km-Spalten leer.
- **Merkliste** (`BEOBACHTEN:`): Rufzeichen per Eingabefeld + `+` oder über das kleine
  `+` hinter jedem Rufzeichen aufnehmen. Klick auf ein Chip nimmt es wieder herunter.
- **Mitzählen**: jedes Chip zeigt `x7` und `vor 2 min` – wie oft und wann zuletzt gehört.
- **Hervorhebung in der Original-Tabelle** des Receivers: Trefferzeilen werden grün
  hinterlegt (links mit grünem Rand).
- **Klick auf ein Rufzeichen** öffnet den Eintrag auf **qrz.com**,
  **Klick auf einen Locator** die Karte an dieser Stelle (Maidenhead, 4/6/8 Zeichen).
- **Alles bleibt gespeichert**: Knopfzustand, Merkliste mit Zählern, Fensterposition,
  **Fenstergröße** und Kartenanzeige – je Browser, also auch nach einem Neustart des Receivers.
- **Größe ziehen**: vier **Eck-Griffe in DNX-Grün** (`#35ff83`) an den Rahmen-Ecken – wie bei
  den anderen DNX-Fenstern. An der rechten unteren Ecke zusätzlich der gewohnte Schrägstrich.
  Gezogen werden darf an allen vier Ecken; die Mindestgröße ist 320×180 px, die Größe wird
  gemerkt. Ziehen am Titel verschiebt das Fenster weiterhin.
- **Voreinstellung ist AUS.** Nichts passiert, bevor der Benutzer einschaltet.
- Verweise werden vom Werkzeug selbst geöffnet (`window.open`), damit kein anderes
  Skript sie umbiegen kann.

## Gäste

**Gäste dürfen das Werkzeug benutzen.** Knopf und Fenster tragen
`data-dnx-capability=""` (leer). Die Rechteprüfung (`dnx_access.js`) liest dieses Attribut,
*bevor* sie „Knopf in der Werkzeugreihe" sperrt; ein leerer Wert bedeutet
„keine Berechtigung nötig". Wer in der Rechteverwaltung etwas anderes einstellt, bleibt
maßgeblich: wird dem Werkzeug dort eine Berechtigung zugewiesen, gilt wieder diese.

## Schalter im DNX-Styler

Unter **Werkzeuge an / aus** kommen drei Haken dazu:

| Haken | Wirkung |
|---|---|
| **FT8 openwebrx** | das Original-FT8-Fenster von OpenWebRX (Sekundär-Decoder auf `ft8`, Meldungsfenster bleibt sichtbar) |
| **DNX FT8** | dieses Werkzeug – derselbe Schalter wie der Knopf in der Werkzeugreihe |
| **FT8 zusammen schalten** | Koppel-Haken: wer von beiden umgeschaltet wird, nimmt den anderen mit |

Damit geht **beides zusammen** (Koppel-Haken setzen, dann einen von beiden schalten)
und **jedes einzeln** (Koppel-Haken aus, Haken einzeln setzen). Die Haken werden nur in
die vorhandene Werkzeug-Box eingehängt (wie `dnx_wf_2d3d.js`); der Styler selbst wird
nicht verändert. Der Zustand wird alle 800 ms nachgezogen – wer in der Werkzeugreihe
oder im Fenster schaltet, sieht den Haken mitgehen.

## Voraussetzungen

- OpenWebRX / OpenWebRX+ mit dem WSJT-Decoder (FT8/FT4/JT65 …). Ohne Decoder bleibt die
  Tabelle leer (das Fenster erscheint trotzdem und sagt, worauf es wartet).
- `docker` und Schreibrechte im Plugin-Verzeichnis (root/sudo).

## Installation

```bash
chmod +x install.sh
sudo ./install.sh install
```

Der Installer sucht das Plugin-Verzeichnis auf drei Wegen — **Docker ist nicht nötig**:

1. **Direkt angeben** (Empfehlung, wenn OpenWebRX nicht im Container läuft):

   ```bash
   sudo PLUGINS=/pfad/zu/plugins ./install.sh install
   ```

   Dort muss `<pfad>/receiver/init.js` liegen — zum Beispiel
   `/usr/lib/python3/dist-packages/htdocs/plugins`.

2. **Docker-Container** — der Mountpunkt wird aus dem Container gelesen
   (Voreinstellung `owrx-8013`):

   ```bash
   sudo CONTAINER=owrx-8011 ./install.sh install
   ```

3. **Nichts angeben** — dann werden die üblichen Pfade durchgesehen
   (`/opt/owrx-docker/plugins`, `…/dist-packages/htdocs/plugins`,
   `/opt/openwebrx/htdocs/plugins`).

Ohne Neustart (danach im Browser `Strg+F5`):

```bash
sudo NORESTART=1 ./install.sh install
```

Wird ein Container genutzt, startet der Installer diesen neu; bei einer Installation
ohne Docker wird ein vorhandener Systemdienst (`openwebrx`, `owrx`) neu gestartet,
sonst erscheint ein Hinweis. `status` zeigt, welcher Weg genommen wurde.

## Prüfen / Aktualisieren / Entfernen

```bash
./install.sh status
sudo ./install.sh update
sudo ./install.sh uninstall
```

## Was wird verändert?

Nur drei Dinge:

1. `<plugins>/receiver/dnx_ft8_beobachten.js` – das Werkzeug selbst
2. `<plugins>/receiver/dnx_ft8_styler.js` – die drei Haken für den DNX-Styler
3. `<plugins>/receiver/init.js` – ein Loader-Block zwischen
   `/* DNX_FT8_BEOB_START */` und `/* DNX_FT8_BEOB_END */`

Vor jedem Eingriff wird `init.js` nach `/opt/dnx-ft8-beobachten-backups/<Zeitpunkt>/`
gesichert. `uninstall` nimmt den Loader heraus und löscht **beide** Dateien – restlos.

## Hinweise

- Gezählt wird, was **ab dem Einschalten** hereinkommt; der Bestand beim Einschalten
  wird nur angezeigt, nicht gezählt.
- Die **ursprüngliche** Nachrichtentabelle des Receivers bleibt unangetastet; das Werkzeug
  hört nur mit und hebt Zeilen hervor. Die dortigen Rufzeichen-Links zeigen auf die Adresse,
  die der Betreiber in `settings.json` unter `callsign_url` eingetragen hat
  (bei OpenWebRX+ häufig `qrzcq.com`). Das Fenster dieses Pakets verlinkt **qrz.com**.
- Die Karte braucht die auf der Seite vorhandene Kartenbibliothek **Leaflet**
  (OpenWebRX+ bringt sie mit, hier 1.9.4) und lädt ihre Kacheln von `openstreetmap.org`.
  Fehlt Leaflet, zeigt das Fenster stattdessen einen Kartenausschnitt als Rahmen;
  ohne Internet bleiben die Kacheln leer, alles andere funktioniert weiter.
- Getestet mit OpenWebRX+ (WSJT-Nachrichtentabelle `#openwebrx-panel-wsjt-message`).

## Änderungen

- **v1.6.0**: vier **Eck-Griffe in DNX-Grün** zum Ziehen der Fenstergröße (an allen vier
  Ecken, Größe wird gespeichert). Kopf und Fuß haben seitlich Luft bekommen, damit die Griffe
  nichts verdecken. Fehler behoben: ein **echter Mausklick** auf `x`, `Karte aus/an` und
  `Ortszeit/UTC` kam nicht an, weil der Titelbalken den Zeiger beim Drücken einfing.
- **v1.5.0**: Zeit umstellbar. Schalter **Ortszeit / UTC** im Fensterkopf und Auswahlfeld
  **Zeit:** (QTH auto, Berlin MEZ/MESZ, Browser-Ortszeit, UTC) neben dem QTH. Bei
  **QTH (auto)** wird die Zone aus dem eigenen Standort erkannt — JO31 ergibt
  *Europe/Berlin*, also 17:00:45 UTC = 18:00:45 MEZ (im Sommer 19:00:45). Sommer-/Winterzeit
  rechnet das System. Auch die Zeit im Karten-Popup wird umgerechnet.
- **v1.4.0**: Der Installer läuft jetzt auch **ohne Docker** — `PLUGINS=<pfad>` für
  Installationen von Hand/aus den Paketquellen, dazu eine Suche in den üblichen
  Standardpfaden. Beim Entfernen bleibt `init.js` wieder haargenau wie vorher.
- **v1.3.0**: Knopf heißt jetzt **„DNX FT8"** (vorher „Beobachten"). Drei Haken im
  DNX-Styler unter **Werkzeuge an / aus**: `FT8 openwebrx`, `DNX FT8` und der Koppel-Haken
  `FT8 zusammen schalten` – damit beide zusammen oder jedes einzeln schaltbar sind.
- **v1.2.0**: richtige Karte mit eigenem Standort, Stationspunkten, Linien, Entfernung
  und Richtung; Stationen-Verfolgung; Spalte km in der Tabelle; QTH-Feld; Verweise werden
  selbst geöffnet.
- **v1.1.0**: eigene FT8-Tabelle im Fenster, Karte zum zuletzt gehörten Locator
  (ein-/ausblendbar), Bestandszeilen beim Einschalten mitnehmen, Gäste dürfen bedienen.
- **v1.0.0**: erste Fassung – Knopf „Beobachten", Merkliste mit Zähler, grün hervorgehobene
  Trefferzeilen, QRZ- und Karten-Links, `install.sh` mit install/update/status/uninstall.

## Hinweis

Private, inoffizielle Hobby-Anpassung; kein offizielles OpenWebRX-/OpenWebRX+-Projekt.
Nutzung auf eigene Gefahr; soweit gesetzlich zulässig keine Haftung. Vorher Backups erstellen.
