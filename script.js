const STORAGE_KEY = "mytrips.memories.v1";
const GEOCODE_CACHE_KEY = "mytrips.geocode-cache.v1";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search?format=json&q=";

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

const placeInput = document.getElementById("place");
const dateInput = document.getElementById("date");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");
const photoInput = document.getElementById("photo");
const noteInput = document.getElementById("note");
const formError = document.getElementById("form-error");
const suggestionsList = document.getElementById("suggestions");
const suggestionState = document.getElementById("suggestion-state");
const toggleAdvancedButton = document.getElementById("toggle-advanced");
const advancedFields = document.getElementById("advanced-fields");

const dialogImage = document.getElementById("dialog-image");
const dialogPlace = document.getElementById("dialog-place");
const dialogDate = document.getElementById("dialog-date");
const dialogNote = document.getElementById("dialog-note");

const normalizeLongitude = (longitude) => ((longitude + 180) / 360) * 100;
const normalizeLatitude = (latitude) => ((90 - latitude) / 180) * 100;

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const loadState = () => {
  const storedMemories = safeParse(localStorage.getItem(STORAGE_KEY), null);
  const memories = Array.isArray(storedMemories) ? storedMemories : defaultMemories;
  if (!storedMemories) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  }

  const cache = safeParse(localStorage.getItem(GEOCODE_CACHE_KEY), {});
  return {
    memories,
    geocodeCache: typeof cache === "object" && cache ? cache : {},
  };
};

let state = loadState();
let geocodeDebounceId;
let previewPin;

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.memories));
  localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(state.geocodeCache));
};

const sortByNewest = (items) => items.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

const setLatLng = (lat, lng) => {
  latInput.value = Number(lat).toFixed(4);
  lngInput.value = Number(lng).toFixed(4);
};

const clearSuggestions = () => {
  suggestionsList.innerHTML = "";
  suggestionsList.hidden = true;
};

const setSuggestionState = (message = "") => {
  suggestionState.textContent = message;
};

const showPreviewPin = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  if (!previewPin) {
    previewPin = document.createElement("span");
    previewPin.className = "pin pin--preview";
    mapElement.append(previewPin);
  }

  previewPin.style.left = `${normalizeLongitude(lng)}%`;
  previewPin.style.top = `${normalizeLatitude(lat)}%`;
};

const formatDate = (dateValue) => new Date(dateValue).toLocaleDateString(undefined, { dateStyle: "medium" });

const renderTimeline = () => {
  memoryListElement.innerHTML = "";

  sortByNewest(state.memories).forEach((memory) => {
    const fragment = memoryCardTemplate.content.cloneNode(true);
    const image = fragment.querySelector(".memory-card__image");
    image.src = memory.photo;
    image.alt = `Photo from ${memory.place}`;
    fragment.querySelector(".memory-card__meta").textContent = `${formatDate(memory.date)} · ${memory.place}`;
    fragment.querySelector(".memory-card__note").textContent = memory.note;
    memoryListElement.append(fragment);
  });
};

const openMemoryDialog = (memory) => {
  dialogImage.src = memory.photo;
  dialogPlace.textContent = memory.place;
  dialogDate.textContent = formatDate(memory.date);
  dialogNote.textContent = memory.note;
  memoryDialog.showModal();
};

const renderMap = () => {
  mapElement.querySelectorAll(".pin:not(.pin--preview)").forEach((pin) => pin.remove());

  state.memories.forEach((memory) => {
    const pin = document.createElement("button");
    pin.className = "pin";
    pin.style.left = `${normalizeLongitude(memory.lng)}%`;
    pin.style.top = `${normalizeLatitude(memory.lat)}%`;
    pin.title = memory.place;
    pin.type = "button";
    pin.addEventListener("click", () => openMemoryDialog(memory));
    mapElement.append(pin);
  });
};

const renderSuggestions = (results) => {
  suggestionsList.innerHTML = "";

  if (!results.length) {
    clearSuggestions();
    setSuggestionState("No results found.");
    return;
  }

  setSuggestionState("Select a place to fill coordinates.");
  results.slice(0, 5).forEach((result) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = result.display_name;
    button.addEventListener("click", () => {
      placeInput.value = result.display_name;
      setLatLng(Number(result.lat), Number(result.lon));
      showPreviewPin(Number(result.lat), Number(result.lon));
      clearSuggestions();
      setSuggestionState("Coordinates auto-filled from selected place.");
    });
    item.append(button);
    suggestionsList.append(item);
  });
  suggestionsList.hidden = false;
};

const geocodePlace = async (query) => {
  const key = query.toLowerCase();
  if (state.geocodeCache[key]) {
    return state.geocodeCache[key];
  }

  const response = await fetch(`${GEOCODE_URL}${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Network error");
  }

  const data = await response.json();
  state.geocodeCache[key] = Array.isArray(data) ? data : [];
  saveState();
  return state.geocodeCache[key];
};

const handlePlaceInput = () => {
  const query = placeInput.value.trim();
  clearTimeout(geocodeDebounceId);

  if (query.length < 2) {
    clearSuggestions();
    setSuggestionState("");
    return;
  }

  setSuggestionState("Searching places…");

  geocodeDebounceId = setTimeout(async () => {
    try {
      const results = await geocodePlace(query);
      renderSuggestions(results);
    } catch {
      clearSuggestions();
      setSuggestionState("Network error. Try again.");
    }
  }, 400);
};

const toggleAdvanced = () => {
  const isHidden = advancedFields.hidden;
  advancedFields.hidden = !isHidden;
  toggleAdvancedButton.setAttribute("aria-expanded", String(isHidden));
};

const isValidCoordinate = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const addMemory = (memory) => {
  state.memories.push(memory);
  saveState();
  renderMap();
  renderTimeline();
};

memoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.textContent = "";

  const place = placeInput.value.trim();
  const date = dateInput.value.trim();
  const photo = photoInput.value.trim();
  const note = noteInput.value.trim();
  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);

  if (!place || !date || !photo || !note) {
    formError.textContent = "Please fill out all required fields.";
    return;
  }

  if (!isValidCoordinate(lat, lng)) {
    formError.textContent = "Please choose a place suggestion or enter valid coordinates.";
    return;
  }

  addMemory({
    id: crypto.randomUUID(),
    place,
    date,
    photo,
    note,
    lat,
    lng,
  });

  memoryForm.reset();
  clearSuggestions();
  setSuggestionState("");
  if (previewPin) {
    previewPin.remove();
    previewPin = null;
  }
});

focusFormButton.addEventListener("click", () => {
  placeInput.focus();
});

placeInput.addEventListener("input", handlePlaceInput);
toggleAdvancedButton.addEventListener("click", toggleAdvanced);

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

renderMap();
renderTimeline();
