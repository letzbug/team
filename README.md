# Creative Evolution Atelier – Live Meeting Room (Prototyp v0.1)

Rein visueller Prototyp. HTML, CSS, Vanilla JS, kein Build. Ordner ins Repo legen, GitHub Pages aktivieren, fertig.

## Bedienung
- Klick auf eine Figur, auf den INVITÉ-Platz oder auf die Leiste unten markiert den aktiven Sprecher.
- Tasten 1–6 wählen den Platz, 0 oder Esc hebt die Markierung auf.

## Aufbau
- `assets/scene.jpg` – die Designvorlage als Bühnenbild (unverändert).
- `js/app.js` – Tabelle `SEATS` mit allen Positionen in Prozent. Hier feinjustieren.
- `css/style.css` – Spotlight, Schein, Hologramm-Platz, Bedienleiste.

## Fehlende Assets
1. **INVITÉ-Avatar** – Figur im Stil der fünf anderen, als transparentes PNG/WebP (Brustbild, ca. 900 px hoch). Bis dahin zeigt der Platz bewusst nur einen leeren Hologramm-Rahmen.
2. **Sechster Sitzplatz am Tisch** – die Vorlage hat fünf Stühle. Für einen echten Platz braucht es eine neu komponierte Szene mit sechs Plätzen. Aktuell ist INVITÉ als zugeschaltetes Hologramm oben links gelöst.
3. **Freigestellte Einzelfiguren** – Claude, Grok, Cameron, Mistral, Vibe je als transparentes PNG (idealerweise Ruhe- und Sprechpose). Erst damit lassen sich Figuren einzeln hervorheben oder bewegen.
4. **Leere Raumplatte** – Hintergrund ohne Figuren, Namensschilder und Text.
5. **Namensschilder ohne Bildtext** – im Bild sind sie eingebrannt; als HTML wären sie scharf, übersetzbar und einzeln animierbar.


## V1.1 – Datenschutzorientiertes Update
- INVITÉ ist beim Start ausgeblendet; Schalter in der Bedienleiste zeigt/versteckt ihn.
- Transkriptpanel: Thema, Sprecher, manuelle Beitragserfassung, TXT-/Markdown-Export und bestätigtes Zurücksetzen.
- Nur flüchtiger JS-Arbeitsspeicher: kein localStorage, keine Datenbank, keine Netzwerkanfragen durch die Transkriptfunktion.
- Noch KEINE automatische Gesprächserkennung, Sprachaufnahme oder KI-Anbindung.
- Der Browser kann nicht feststellen, ob eine heruntergeladene Datei tatsächlich sicher gespeichert wurde. Export bitte prüfen, erst dann löschen.
- Löschung aus der Anwendung garantiert keine Löschung bereits exportierter Dateien, Browser-/Systemkopien oder zukünftiger Drittanbieterprotokolle.
