const STORAGE_KEY = "mytrips.memories.v1";

const defaultMemories = [
  {
    id: crypto.randomUUID(),
    place: "Lisbon, Portugal",
    date: "2024-05-18",
    lat: 38.72,
    lng: -9.14,
    photo:
      "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=900&q=80",
    note: "Golden tram rides and pastel de nata at sunset.",
  },
  {
    id: crypto.randomUUID(),
    place: "Ubud, Bali",
    date: "2023-09-06",
    lat: -8.5,
    lng: 115.26,
    photo:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80",
    note: "Rice terraces, scooter roads, and warm night air.",
  },
];

const mapElement = document.getElementById("map");
const memoryListElement = document.getElementById("memory-list");
const memoryForm = document.getElementById("memory-form");
const memoryCardTemplate = document.getElementById("memory-card-template");
const memoryDialog = document.getElementById("memory-dialog");
const focusFormButton = document.getElementById("focus-form");
const closeDialogButton = document.getElementById("close-dialog");

const dialogImage = document.getElementById("dialog-image");
const dialogPlace = document.getElementById("dialog-place");
const dialogDate = document.getElementById("dialog-date");
const dialogNote = document.getElementById("dialog-note");

const normalizeLongitude = (longitude) => ((longitude + 180) / 360) * 100;
const normalizeLatitude = (latitude) => ((90 - latitude) / 180) * 100;

const readMemories = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMemories));
    return [...defaultMemories];
  }

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMemories));
    return [...defaultMemories];
  }
};

let memories = readMemories();

const saveMemories = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
};

const renderMemoryCards = () => {
  memoryListElement.innerHTML = "";

  memories
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((memory) => {
      const fragment = memoryCardTemplate.content.cloneNode(true);
      const image = fragment.querySelector(".memory-card__image");
      image.src = memory.photo;
      image.alt = `Photo from ${memory.place}`;
      fragment.querySelector(".memory-card__place").textContent = memory.place;
      fragment.querySelector(".memory-card__date").textContent = new Date(memory.date).toDateString();
      fragment.querySelector(".memory-card__note").textContent = memory.note;
      memoryListElement.append(fragment);
    });
};

const openMemoryDialog = (memory) => {
  dialogImage.src = memory.photo;
  dialogPlace.textContent = memory.place;
  dialogDate.textContent = new Date(memory.date).toDateString();
  dialogNote.textContent = memory.note;
  memoryDialog.showModal();
};

const renderPins = () => {
  mapElement.innerHTML = "";

  memories.forEach((memory) => {
    const pin = document.createElement("button");
    pin.className = "pin";
    pin.style.left = `${normalizeLongitude(memory.lng)}%`;
    pin.style.top = `${normalizeLatitude(memory.lat)}%`;
    pin.title = memory.place;
    pin.addEventListener("click", () => openMemoryDialog(memory));
    mapElement.append(pin);
  });
};

const renderAll = () => {
  renderPins();
  renderMemoryCards();
};

memoryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(memoryForm);
  const place = String(formData.get("place") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const photo = String(formData.get("photo") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  const newMemory = {
    id: crypto.randomUUID(),
    place,
    note,
    photo,
    date,
    lat,
    lng,
  };

  memories.push(newMemory);
  saveMemories();
  renderAll();
  memoryForm.reset();
});

focusFormButton.addEventListener("click", () => {
  memoryForm.querySelector("input[name='place']").focus();
});

closeDialogButton.addEventListener("click", () => {
  memoryDialog.close();
});

memoryDialog.addEventListener("click", (event) => {
  const rect = memoryDialog.getBoundingClientRect();
  const insideBounds =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!insideBounds) {
    memoryDialog.close();
  }
});

renderAll();
