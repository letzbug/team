# Creative Evolution Atelier – Team Meeting Room 2.1

Zusammenführung der Bühne aus `team` und der Anbieter-Adapter aus `mylovelyteam`.
Buildloses HTML/CSS/JavaScript für GitHub Pages, plus eigener Cloudflare Worker.
Kein Node/npm auf Franks Büro-PC erforderlich. Die ZIP enthält keine API-Schlüssel.


## Präsentation und versteckte Bedienung

Vorne erscheinen nur der vollständige Raum, ein dezenter Push-to-Talk-Knopf und ein kleines Zahnrad. Keine Rundentasten, Texteingabe, Ergebnisbox oder Verbindungseinstellungen auf der Bühne. Untertitel sind standardmäßig aus und lassen sich im Admin-Menü einschalten. Das Bild bleibt vollständig sichtbar; je nach Bildschirmformat entstehen schwarze Ränder.

- Admin öffnen/schließen: **Strg + Alt + A**, alternativ Zahnrad oben rechts.
- Dort: Sprecherwahl, eigener Name, Gastname, Sprache, Stimmen, Modelle, Verbindungen, Runden, Tempo, automatische Übertragung, Untertitel, Gastanzeige, Sitzungssteuerung, Transkript, Export und Löschen.
- Das Menü bleibt während der Diskussion erreichbar. Sprecherwahl und Namensfelder können geändert werden; für Verbindungs- und Modelländerungen zuerst pausieren.
- Vor dem Termin Verbindung und Mikrofon testen, Einstellungen übernehmen und Menü schließen.
- Die **erste** Wortmeldung wird bewusst als Begrüßung behandelt, z. B. „Hallo Team, ich bin heute bei Sophie.“ Danach gemeinsam Hallo, Cameron übernimmt und stellt das Team vor. Die eigentliche Frage erst anschließend stellen.
- Im Live-Modus kann das Cameron-Modell die tatsächlich gesprochenen Namen/den eingetragenen Gast in seine kurze Einführung aufnehmen. Ohne eingetragene Cameron-Modellkennung verwendet die Vorstellung einen festen Einführungstext.
- Mit eingeschalteter automatischer Übertragung genügt Halten/Sprechen/Loslassen. Bei ausgeschalteter Übertragung öffnet sich das Admin-Menü zur Textprüfung und zum Senden.
- Im Admin-Menü lässt sich die Vorstellung bei Bedarf manuell starten oder wiederholen. Nach „Sitzung löschen“ beginnt der nächste Empfang wieder mit einer Begrüßung.

## Was diese Version kann

- Bühne mit dem gelieferten leeren Meeting-Raum und fünf Plätzen.
- Empfang: Erste menschliche Wortmeldung → fünf gemeinsame kurze Begrüßungen → Cameron stellt sich und das Atelier kurz vor → die vier anderen stellen sich selbst nacheinander vor → bereit für die erste Frage. Die Begrüßung verbraucht keine Diskussionsrunde.
- Push-to-Talk per gedrückter Leertaste oder Mikrofonknopf. Nach Loslassen wird die Aufnahme transkribiert und standardmäßig ans Team gesendet. Automatisches Senden lässt sich abwählen; dann Text prüfen und „Ans Team senden“ drücken.
- Sprecher im versteckten Admin-Menü zwischen „Ich“ und „Gast“ wählen; beide Namen sind frei eintragbar. Die Zuordnung wird beim Aufnahmestart übernommen, damit ein späterer Wechsel die laufende Aufnahme nicht umbenennt.
- xAI/Grok STT und fünf individuell zugeordnete xAI-TTS-Stimmen. Gesprächssprachen DE/FR/EN. Spracheinstellung bestimmt Transkription und Antwortsprache.
- Sprechtempo ist während der laufenden Audioausgabe veränderbar.
- Die Frage geht an alle fünf; deren erste Antworten einer Runde werden gleichzeitig angefordert und in zufälliger Reihenfolge nacheinander vorgelesen. Außer der gemeinsamen Begrüßung gibt es keine überlappenden Stimmen.
- Anschließend sehen alle die neuen Beiträge und können sich mit einem konkreten Einwand, einer notwendigen Rückfrage, einer Verbesserung oder einer begründeten Positionsänderung melden. Handzeichen und Worterteilung durch Cameron, jeweils nacheinander. Ein Beitrag pro Mitglied und Wortmeldungsphase; keine endlosen Schleifen.
- Wechselnde Blickwinkel pro Runde, keine festgelegten Ja-Sager oder dauernden Kritiker. Zustimmung und Widerspruch brauchen Argumente. Ab Runde 2 werden konkrete Argumente anderer aufgegriffen. Das verbessert den Ablauf, garantiert aber keine vollständige oder fehlerfreie Lösung.
- Drei oder vier Runden: Ideen → Prüfung → konkrete Lösung → optional Umsetzung. Cameron bündelt jede Runde; am Ende erstellt das Cameron-Modell Ergebnis und kurze mündliche Zusammenfassung.
- Menschliche Unterbrechung stoppt laufende Wiedergabe und Browseranfragen. Die neue Info wird innerhalb derselben Runde an ALLE fünf geschickt; bisherige Beiträge bleiben im Protokoll. Ein Provider kann bereits begonnene Berechnung trotz abgebrochener Browseranfrage noch abrechnen.
- Pause / Fortsetzen, Fehler einzelner Modelle sichtbar, gezielter Wiederholungsversuch fehlender Beiträge, Sitzungslimit.
- TXT-Export mit Ergebnis, kompletter Sprecherzuordnung, Zeitstempeln, Modellkonfiguration und Kennzeichnung, ob ein Text vollständig, teilweise oder gar nicht vorgelesen wurde.
- Löschen leert die laufende Sitzung. Exportiert wird nichts automatisch gelöscht; vor dem Löschen den Download selbst prüfen.

## Sofort lokal / auf GitHub Pages ausprobieren

1. Inhalt des Ordners `team-main` ins bestehende Team-Repository übernehmen. `index.html` muss auf dessen oberster Ebene liegen.
2. Über GitHub Pages öffnen. Bei lokalem Test über HTTP auf localhost öffnen, nicht als `file://` (ES-Module und Mikrofon benötigen einen geeigneten Webkontext).
3. Admin-Menü über **Strg + Alt + A** oder das dezente **Zahnrad oben rechts** öffnen → Sprachausgabe „Nur Text (Test)“ → Übernehmen → Admin-Menü erneut öffnen → im Abschnitt „Sitzung“ eine Begrüßung als Text eingeben und „Ans Team senden“ drücken. Dieser Test braucht keine APIs und erzeugt keine Modellantworten. Alternativ „Browserstimmen (Test)“ verwenden; verfügbare Stimmen sind browserabhängig und nicht identisch mit Grok. Der Browser-Sprachsynthesizer spielt das gemeinsame Hallo im Test nur mit einer Stimme ab; der Export kennzeichnet dies als `test-voice`. Der echte Fünfstimmenchor wird im xAI-Modus aus fünf Audiospuren synchron gemischt.
4. Für echtes Brainstorming ist IMMER der Worker mit freigegebenen Modellen erforderlich. Es gibt keine simulierten Live-Antworten.

## Bestehenden Worker erweitern (Cloudflare-Dashboard, ohne lokale Installation)

Die gelieferten alten ZIPs enthalten nur Beispielkonfigurationen mit leeren Modellkennungen. Es war keine tatsächlich eingerichtete Verbindung darin enthalten. Diese ZIP kann daher keine bestehende Live-Konfiguration automatisch erraten.

1. Im eigenen Cloudflare-Konto den bestehenden Atelier-Worker öffnen und eine Sicherung des aktuellen Codes anlegen.
2. `worker/worker.js` als Worker-Modul einsetzen. Die vorhandenen `/v1/chat`- und `/v1/health`-Routen bleiben erhalten; neu: `/v1/stt`, `/v1/tts`, `/v1/voices`.
3. Bestehende Secrets erhalten: `ATELIER_ACCESS_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`. Provider-Schlüssel NICHT in GitHub, JSON-Konfiguration oder das Browserformular schreiben.
4. `ALLOWED_ORIGINS` enthält `https://letzbug.github.io` (ohne Pfad; mehrere Origins kommasepariert). Bei anderem Hosting dessen genaue Origin ergänzen.
5. `ALLOWED_MODELS` enthält die Modellkennungen, die in DEINEM Konto tatsächlich zugänglich sind, je Anbieter als Array. Exakt diese IDs in „Admin-Menü“ einsetzen. Keine Platzhalter aus dem Beispiel unverändert verwenden.
6. `ALLOWED_VOICES=eve,leo,rex,ara,sal`, `STT_MODEL=grok-voice-transcribe-2.0`, `MAX_TOKENS=3000`, `MAX_PROMPT_CHARS=60000`, `DAILY_CALL_LIMIT=400` setzen. Das sind technische Obergrenzen, kein Preisangebot oder garantiertes Ausgabenlimit. Bei Reasoning-Modellen verbrauchen interne Tokens einen Teil des Antwortlimits; bei sichtbarer Fehlermeldung zu abgeschnittenen/leeren Antworten dieses passend erhöhen.
7. Vorhandenes KV-Binding `ATELIER_KV` behalten. Es speichert nur einen Tageszähler, KEIN Gespräch oder Audio. KV ist bei parallelen Anfragen nur eine ungefähre Kostenbremse. Für einen exakten Tageszähler stattdessen die enthaltene Durable-Object-Klasse `RequestLimiter` mit Binding `ATELIER_LIMITER` verwenden; `wrangler.toml.example` zeigt Binding und Migration. Vorhandene Migrationen nicht ersetzen. Ohne einen der beiden Zähler werden kostenpflichtige Routen abgelehnt.
8. Worker bereitstellen. In der Team-Seite Worker-URL und persönliches Worker-Zugangstoken eintragen, dann „Verbindung prüfen“. Eine erfolgreiche Health-Prüfung bestätigt Konfiguration und Erreichbarkeit des Workers, noch keinen erfolgreichen echten Anbieteraufruf.
9. „xAI-Stimmen laden“ holt die aktuellen verfügbaren Stimmen. Andere gewünschte Voice-IDs zusätzlich unter `ALLOWED_VOICES` freigeben.
10. Erst Vorstellung, dann eine kurze Testfrage prüfen. Anschließend Mikrofon, Unterbrechung, Ergebnis und Export mit dem tatsächlichen Präsentationsrechner testen.

### Mistral und Vibe

Es gibt vier Anbieter-Adapter und fünf konfigurierbare Sitze. Vibe nutzt voreingestellt einen zweiten Mistral-Sitz. Ein eigener API-Anbieter „Vibe“ war in den gelieferten Quellen nicht vorhanden. Für echte Modellvielfalt kann dort ein anderes freigeschaltetes Modell gewählt werden. Zwei Sitze mit derselben Modellkennung sind zwei Perspektiven desselben Modells, keine zwei unabhängigen Modelle.

### Vorhandene Konfiguration übernehmen

Eine aus mylovelyteam exportierte JSON-Konfiguration kann importiert werden. Bekannte Teilnehmer-IDs und Worker-URL werden übernommen; der frühere Gastplatz wird nur bei Namen „Mistral“ entsprechend zugeordnet. Vibe und die Stimmen bei Bedarf ergänzen. Die neue Konfiguration lässt sich OHNE Token exportieren. Token und Konfiguration werden nicht automatisch im Browser gespeichert; nach Neuladen Konfiguration importieren und Token neu eingeben.

## Spätere Avatare

Die laufende Gesprächssteuerung hängt nicht von vorhandenen Avataren ab. `js/avatars.js` stellt pro Sitz einen Mount-Punkt und eine Adapter-Schnittstelle bereit:

```js
const mount = window.AtelierAvatars.mount('cameron');
// Hier später den tatsächlichen Live2D- oder 3D-Renderer in mount einhängen.
window.AtelierAvatars.register('cameron', {
  speaking(active) { /* Sprech-/Ruhezustand */ },
  mouth(level) { /* Audiopegel 0..1 → Mundöffnung */ },
  hand(raised) { /* Wortmeldung */ },
  destroy() { /* Renderer freigeben */ }
});
```

Beim Web-Audio-Abspielen liefert der echte Audiopegel die Mundöffnung; kein behauptetes Phonem-Lipsync. Blinzeln und stille Kaffeeanimationen gehören später in den tatsächlichen Renderer; Sprechen muss diese Animationen abbrechen. Live2D-Runtime, Rig-Parameter, Arm-/Handanimation und präzise Platzierung/Verdeckung durch Tisch und Laptop lassen sich erst mit den gelieferten Assets sauber abschließen. In dieser Version sind keine Figuren, Bewegungen oder Live2D-Runtime enthalten. Der Gastplatz bleibt optional als Zuschaltung; keine erfundene sechste Stuhlposition.

## Datenschutz

Sitzungsinhalt, Ergebnis, Rohaufnahme und Zugangstoken werden von dieser Anwendung ausschließlich im Browser-Arbeitsspeicher gehalten. Es gibt keine Sitzungsdatenbank, kein Transcript-localStorage und keine Supabase-Synchronisation. Aufnahme nur während Push-to-Talk, Tracks werden nach Loslassen geschlossen. Maximal 60 Sekunden und 8 MiB je Aufnahme. Kein Audioarchiv.

Live-Betrieb ist NICHT offline: Sprachaufnahme geht zur Transkription an xAI; TTS-Text an xAI; Frage und bisheriger Gesprächskontext an die jeweils ausgewählten Modellanbieter. Deren Aufbewahrung und Verarbeitungsregion hängen vom jeweiligen Konto/Vertrag ab und werden hier nicht als EU-only garantiert. Nur geeignete Inhalte mit Kenntnis der Beteiligten verwenden. Der Worker speichert nur den Tageszähler. Der TXT-Export ist ein Textprotokoll, keine wortgetreue Audioaufzeichnung; STT kann Fehler machen.

## Prüfung

`node --test tests/*.test.js` (nur Entwicklungsumgebung, nicht am Büro-PC nötig).
22 automatisierte Prüfungen bestanden: 3/4 Runden, zufällige Reihenfolge, Blickwinkelwechsel, neue menschliche Info, Abbruch verspäteter Antworten, unterbrochene Wiedergabe, Fehler einzelner Anbieter und gezielte Wiederholung, Wortmeldungen, Limits, Löschung, Vorstellung, Export und alle Worker-Adapter mit simulierten Antworten. Zusätzlich Browserprüfung der reinen Bühnenansicht, des Admin-Tastenkürzels, frei benannter Gäste und des vollständigen Empfangs im Textmodus. Gruppenmix und dessen Unterbrechung sind mit simuliertem Audio geprüft. Echte API-Antworten, reale Stimmen und Mikrofon auf Franks Präsentationsrechner sind noch nicht geprüft, weil keine Live-Verbindung in den ZIPs enthalten war.

API-Verträge geprüft anhand der offiziellen Dokumentation:
- https://docs.x.ai/developers/model-capabilities/audio/text-to-speech
- https://docs.x.ai/developers/model-capabilities/audio/speech-to-text
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create

Die vorhandene mylovelyteam-Anwendung mit Blueprint-/Archivfunktionen bleibt separat bestehen; diese Version übernimmt die Anbieter-Adapter und Gesprächsprinzipien, nicht deren dauerhafte Archivspeicherung.
