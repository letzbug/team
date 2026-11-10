// V1.1 – ausschließlich flüchtiger Sitzungsspeicher, kein localStorage/Backend.
(() => {
  "use strict";
  const panel = document.getElementById("transcriptPanel");
  const toggle = document.getElementById("toggleTranscript");
  const log = document.getElementById("transcriptLog");
  const speaker = document.getElementById("entrySpeaker");
  const topic = document.getElementById("meetingTopic");
  const entry = document.getElementById("entryText");
  const entries = [];
  const started = new Date();

  SEATS.forEach(s => {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.name;
    speaker.appendChild(option);
  });
  speaker.value = "cameron";

  function show(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }
  toggle.addEventListener("click", () => show(panel.hidden));
  document.getElementById("closeTranscript").addEventListener("click", () => show(false));

  function render() {
    log.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.textContent = "Noch keine manuell erfassten Beiträge.";
      log.appendChild(empty);
      return;
    }
    entries.forEach(item => {
      const p = document.createElement("p");
      const time = document.createElement("time");
      time.textContent = item.time + " ";
      const strong = document.createElement("strong");
      strong.textContent = item.name + ": ";
      p.append(time, strong, document.createTextNode(item.text));
      log.appendChild(p);
    });
    log.scrollTop = log.scrollHeight;
  }
  document.getElementById("entryForm").addEventListener("submit", event => {
    event.preventDefault();
    const text = entry.value.trim();
    if (!text) return;
    const seat = SEATS.find(s => s.id === speaker.value);
    entries.push({
      time: new Date().toLocaleTimeString("de-LU"),
      name: seat.name,
      text
    });
    entry.value = "";
    render();
  });

  function exportText(markdown) {
    if (!entries.length) {
      alert("Es sind noch keine Beiträge vorhanden.");
      return;
    }
    const heading = "Creative Evolution Atelier – Sitzungstranskript";
    const subject = topic.value.trim() || "Ohne Thema";
    const lines = markdown
      ? [`# ${heading}`, "", `**Thema:** ${subject}`, `**Beginn:** ${started.toLocaleString("de-LU")}`, "", ...entries.flatMap(x => [`### ${x.time} – ${x.name}`, "", x.text, ""])]
      : [heading, `Thema: ${subject}`, `Beginn: ${started.toLocaleString("de-LU")}`, "", ...entries.map(x => `[${x.time}] ${x.name}: ${x.text}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atelier-transkript-${started.toISOString().slice(0,10)}.${markdown ? "md" : "txt"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  document.getElementById("exportTxt").addEventListener("click", () => exportText(false));
  document.getElementById("exportMd").addEventListener("click", () => exportText(true));
  document.getElementById("resetTranscript").addEventListener("click", () => {
    if (!confirm("Sitzung wirklich löschen? Nicht exportierte Beiträge gehen unwiderruflich verloren. Bitte vorher den Download prüfen.")) return;
    entries.length = 0;
    topic.value = "";
    entry.value = "";
    render();
  });
  render();
})();
