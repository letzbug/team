// Creative Evolution Atelier – Live Meeting Room
// Positionen in Prozent der Szene (assets/scene.jpg, 16:9).
// x/y = Spotlight-Mitte, plate = Mitte des Namensschilds, zone = Klickfläche [links, breite].
const SEATS = [
  { id: "claude",  name: "Claude",  color: "#5cc8ff", x: 9,    y: 44, plate: 11,   zone: [0, 19.5] },
  { id: "grok",    name: "Grok",    color: "#ff9a3c", x: 28,   y: 44, plate: 29.8, zone: [19.5, 21] },
  { id: "cameron", name: "Cameron", color: "#c77dff", x: 50.3, y: 44, plate: 50.5, zone: [40.5, 20.5] },
  { id: "mistral", name: "Mistral", color: "#6f9bff", x: 72,   y: 44, plate: 71,   zone: [61, 19.5] },
  { id: "vibe",    name: "Vibe",    color: "#4dff88", x: 90,   y: 44, plate: 89.7, zone: [80.5, 19.5] },
  { id: "invite",  name: "Invité",  color: "#7ef0e0", x: 25,   y: 9.6, plate: 25,  zone: null }
];

const stage = document.getElementById("stage");
const seatsEl = document.getElementById("seats");
const dock = document.getElementById("dock");
const chipText = document.getElementById("chipText");
const inviteBtn = document.querySelector(".invite");
const controls = [];
let guestVisible = false;
const guestToggle = document.getElementById("toggleInvite");
function setGuestVisible(visible) {
  guestVisible = Boolean(visible);
  inviteBtn.hidden = !guestVisible;
  guestToggle.setAttribute("aria-pressed", String(guestVisible));
  guestToggle.textContent = guestVisible ? "Invité ausblenden" : "Invité anzeigen";
  const guestDock = controls.find(([btn, id]) => id === "invite" && btn !== inviteBtn);
  if (guestDock) guestDock[0].hidden = !guestVisible;
  if (!guestVisible && stage.dataset.active === "invite") setSpeaker(null);
}
guestToggle.addEventListener("click", () => setGuestVisible(!guestVisible));

function setSpeaker(id) {
  const seat = SEATS.find(s => s.id === id && (s.id !== "invite" || guestVisible)) || null;
  if (seat && stage.dataset.active === seat.id) return setSpeaker(null); // erneuter Klick = aus
  stage.dataset.active = seat ? seat.id : "";
  if (seat) {
    stage.style.setProperty("--sx", seat.x + "%");
    stage.style.setProperty("--sy", seat.y + "%");
    stage.style.setProperty("--px", seat.plate + "%");
    stage.style.setProperty("--accent", seat.color);
    chipText.textContent = seat.name + " spricht";
  }
  controls.forEach(([btn, sid]) =>
    btn.setAttribute("aria-pressed", String(seat ? sid === seat.id : sid === null)));
}

function dockButton(label, id, color, key) {
  const b = document.createElement("button");
  b.type = "button";
  b.innerHTML = `${label} <kbd>${key}</kbd>`;
  if (color) b.style.setProperty("--c", color); else b.className = "none";
  b.addEventListener("click", () => setSpeaker(id));
  dock.appendChild(b);
  controls.push([b, id]);
}

SEATS.forEach((s, i) => {
  if (s.zone) {
    const hot = document.createElement("button");
    hot.type = "button";
    hot.className = "seat";
    hot.style.left = s.zone[0] + "%";
    hot.style.width = s.zone[1] + "%";
    hot.setAttribute("aria-label", s.name + " als Sprecher markieren");
    hot.addEventListener("click", () => setSpeaker(s.id));
    seatsEl.appendChild(hot);
  }
  dockButton(s.name, s.id, s.color, i + 1);
});
dockButton("Niemand", null, null, "0");
inviteBtn.addEventListener("click", () => setSpeaker("invite"));
controls.push([inviteBtn, "invite"]);

document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "0" || e.key === "Escape") return setSpeaker(null);
  const n = Number(e.key);
  if (n >= 1 && n <= SEATS.length) {
    const s = SEATS[n - 1];
    if (s.id === "invite" && !guestVisible) return;
    if (stage.dataset.active !== s.id) setSpeaker(s.id);
  }
});

setSpeaker(null);

setGuestVisible(false);
