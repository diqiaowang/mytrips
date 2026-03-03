const STORAGE_KEY = "mytrips.memories.v1";
const GEOCODE_CACHE_KEY = "mytrips.geocode-cache.v1";
const GEOCODE_URL = "https://nominatim.openstreetmap.org/search?format=json&limit=5&q=";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80";

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
    tags: ["tram", "sunset", "food"],
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
    tags: ["nature", "scooter"],
  },
];

const mapElement = document.getElementById("map");
const memoryListElement = document.getElementById("memory-list");
const memoryForm = document.getElementById("memory-form");
const memoryCardTemplate = document.getElementById("memory-card-template");
const memoryDialog = document.getElementById("memory-dialog");
const focusFormButton = document.getElementById("focus-form");
const closeDialogButton = document.getElementById("close-dialog");
const collapseFormButton = document.getElementById("collapse-form");
const formContent = document.getElementById("form-content");

const placeInput = document.getElementById("place");
const dateInput = document.getElementById("date");
const latInput = document.getElementById("lat");
const lngInput = document.getElementById("lng");
const photoInput = document.getElementById("photo");
const tagsInput = document.getElementById("tags");
const noteInput = document.getElementById("note");
const formError = document.getElementById("form-error");
const formTitle = document.getElementById("form-title");
const submitMemoryButton = document.getElementById("submit-memory");
const cancelEditButton = document.getElementById("cancel-edit");

const suggestionsList = document.getElementById("suggestions");
const suggestionState = document.getElementById("suggestion-state");
const toggleAdvancedButton = document.getElementById("toggle-advanced");
const advancedFields = document.getElementById("advanced-fields");

const searchInput = document.getElementById("search-input");
const tagFilter = document.getElementById("tag-filter");

const exportMemoriesButton = document.getElementById("export-memories");
const importMergeButton = document.getElementById("import-merge");
const importReplaceButton = document.getElementById("import-replace");
const importFileInput = document.getElementById("import-file");

const dialogImage = document.getElementById("dialog-image");
const dialogPlace = document.getElementById("dialog-place");
const dialogMeta = document.getElementById("dialog-meta");
const dialogNote = document.getElementById("dialog-note");
const dialogTags = document.getElementById("dialog-tags");
const editMemoryButton = document.getElementById("edit-memory");
const deleteMemoryButton = document.getElementById("delete-memory");

const normalizeLongitude = (longitude) => ((longitude + 180) / 360) * 100;
const normalizeLatitude = (latitude) => ((90 - latitude) / 180) * 100;
const formatDate = (dateValue) => new Date(dateValue).toLocaleDateString(undefined, { dateStyle: "medium" });
const sortByNewest = (items) => items.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseTags = (value) =>
  value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, arr) => arr.indexOf(tag) === index);

const normalizeMemory = (memory) => ({
  id: memory.id || crypto.randomUUID(),
  place: String(memory.place || "").trim(),
  date: String(memory.date || ""),
  lat: Number(memory.lat),
  lng: Number(memory.lng),
  photo: String(memory.photo || FALLBACK_IMAGE).trim(),
  note: String(memory.note || "").trim(),
  tags: Array.isArray(memory.tags) ? memory.tags.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean) : [],
});

const loadState = () => {
  const storedMemories = safeParse(localStorage.getItem(STORAGE_KEY), null);
  const memoriesRaw = Array.isArray(storedMemories) ? storedMemories : defaultMemories;
  const memories = memoriesRaw.map(normalizeMemory).filter((memory) => memory.place && memory.date);

  if (!storedMemories) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  }

  const cache = safeParse(localStorage.getItem(GEOCODE_CACHE_KEY), {});
  return {
    memories,
    geocodeCache: typeof cache === "object" && cache ? cache : {},
    filters: {
      search: "",
      tag: "",
    },
    editingId: null,
    selectedMemoryId: null,
    importMode: "merge",
  };
};

let state = loadState();
let geocodeDebounceId;
let previewPin;

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.memories));
  localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(state.geocodeCache));
};

const setSuggestionState = (message = "") => {
  suggestionState.textContent = message;
};

const clearSuggestions = () => {
  suggestionsList.innerHTML = "";
  suggestionsList.hidden = true;
};

const setLatLng = (lat, lng) => {
  latInput.value = Number(lat).toFixed(4);
  lngInput.value = Number(lng).toFixed(4);
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

const hidePreviewPin = () => {
  if (previewPin) {
    previewPin.remove();
    previewPin = null;
  }
};

const getSelectedMemory = () => state.memories.find((memory) => memory.id === state.selectedMemoryId) || null;

const renderTagFilter = () => {
  const allTags = new Set();
  state.memories.forEach((memory) => memory.tags.forEach((tag) => allTags.add(tag)));

  tagFilter.innerHTML = '<option value="">All tags</option>';
  [...allTags].sort().forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = `#${tag}`;
    if (tag === state.filters.tag) {
      option.selected = true;
    }
    tagFilter.append(option);
  });
};

const applyFilters = () => {
  const query = state.filters.search.toLowerCase();
  return sortByNewest(state.memories).filter((memory) => {
    const haystack = `${memory.place} ${memory.note} ${memory.tags.join(" ")}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const matchesTag = !state.filters.tag || memory.tags.includes(state.filters.tag);
    return matchesSearch && matchesTag;
  });
};

const openModal = (memory) => {
  state.selectedMemoryId = memory.id;
  dialogImage.src = memory.photo || FALLBACK_IMAGE;
  dialogPlace.textContent = memory.place;
  dialogMeta.textContent = `${formatDate(memory.date)} · ${memory.place}`;
  dialogNote.textContent = memory.note;
  dialogTags.textContent = memory.tags.length ? `#${memory.tags.join(" #")}` : "No tags";
  memoryDialog.showModal();
};

const renderMap = () => {
  mapElement.querySelectorAll(".pin:not(.pin--preview)").forEach((pin) => pin.remove());

  state.memories.forEach((memory) => {
    const pin = document.createElement("button");
    pin.className = "pin";
    pin.type = "button";
    pin.style.left = `${normalizeLongitude(memory.lng)}%`;
    pin.style.top = `${normalizeLatitude(memory.lat)}%`;
    pin.title = memory.place;
    pin.addEventListener("click", () => openModal(memory));
    mapElement.append(pin);
  });
};

const renderList = () => {
  memoryListElement.innerHTML = "";
  const filteredMemories = applyFilters();

  if (!filteredMemories.length) {
    const empty = document.createElement("p");
    empty.className = "memory-empty";
    empty.textContent = "No memories match your current search/filter.";
    memoryListElement.append(empty);
    return;
  }

  filteredMemories.forEach((memory) => {
    const fragment = memoryCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".memory-card");
    const image = fragment.querySelector(".memory-card__image");

    image.src = memory.photo || FALLBACK_IMAGE;
    image.alt = `Photo from ${memory.place}`;
    fragment.querySelector(".memory-card__meta").textContent = `${formatDate(memory.date)} • ${memory.place}`;
    fragment.querySelector(".memory-card__note").textContent = memory.note;
    fragment.querySelector(".memory-card__tags").textContent = memory.tags.length
      ? `#${memory.tags.join(" #")}`
      : "";

    card.addEventListener("click", () => openModal(memory));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openModal(memory);
      }
    });

    memoryListElement.append(fragment);
  });
};

const renderAll = () => {
  renderMap();
  renderTagFilter();
  renderList();
};

const isValidCoordinate = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const resetFormMode = () => {
  state.editingId = null;
  formTitle.textContent = "Add new memory";
  submitMemoryButton.textContent = "Save memory";
  cancelEditButton.hidden = true;
};

const fillForm = (memory) => {
  placeInput.value = memory.place;
  dateInput.value = memory.date;
  latInput.value = String(memory.lat);
  lngInput.value = String(memory.lng);
  photoInput.value = memory.photo;
  noteInput.value = memory.note;
  tagsInput.value = memory.tags.join(", ");
  showPreviewPin(memory.lat, memory.lng);
};

const upsertMemory = (memory) => {
  const normalized = normalizeMemory(memory);

  if (state.editingId) {
    state.memories = state.memories.map((item) => (item.id === state.editingId ? { ...normalized, id: state.editingId } : item));
  } else {
    state.memories.push(normalized);
  }

  saveState();
  renderAll();
};

const deleteMemory = (id) => {
  state.memories = state.memories.filter((memory) => memory.id !== id);
  saveState();
  renderAll();
};

const geocodePlace = async (query) => {
  const key = query.toLowerCase();
  if (state.geocodeCache[key]) {
    return state.geocodeCache[key];
  }

  const response = await fetch(`${GEOCODE_URL}${encodeURIComponent(query)}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Network error");
  }

  const data = await response.json();
  state.geocodeCache[key] = Array.isArray(data) ? data : [];
  saveState();
  return state.geocodeCache[key];
};

const renderSuggestions = (results) => {
  suggestionsList.innerHTML = "";

  if (!results.length) {
    clearSuggestions();
    setSuggestionState("No results.");
    return;
  }

  setSuggestionState("Select a place to fill coordinates.");
  results.forEach((result) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = result.display_name;
    button.addEventListener("click", () => {
      placeInput.value = result.display_name;
      setLatLng(Number(result.lat), Number(result.lon));
      showPreviewPin(Number(result.lat), Number(result.lon));
      clearSuggestions();
      setSuggestionState("Coordinates auto-filled.");
    });
    item.append(button);
    suggestionsList.append(item);
  });

  suggestionsList.hidden = false;
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
      setSuggestionState("Network error.");
    }
  }, 400);
};

const exportJSON = () => {
  const blob = new Blob([JSON.stringify(state.memories, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mytrips-memories-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const importJSON = (text, mode) => {
  const parsed = safeParse(text, null);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid JSON file");
  }

  const imported = parsed.map(normalizeMemory).filter((memory) => memory.place && memory.date);

  if (mode === "replace") {
    state.memories = imported;
  } else {
    const byId = new Map(state.memories.map((memory) => [memory.id, memory]));
    imported.forEach((memory) => {
      const id = memory.id || crypto.randomUUID();
      byId.set(id, { ...memory, id });
    });
    state.memories = [...byId.values()];
  }

  saveState();
  renderAll();
};

memoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.textContent = "";

  const place = placeInput.value.trim();
  const date = dateInput.value;
  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);
  const photo = photoInput.value.trim();
  const note = noteInput.value.trim();
  const tags = parseTags(tagsInput.value);

  if (!place || !date || !photo || !note) {
    formError.textContent = "Please complete place, date, photo, and note.";
    return;
  }

  if (!isValidCoordinate(lat, lng)) {
    formError.textContent = "Use a suggestion or enter valid latitude/longitude.";
    return;
  }

  upsertMemory({
    id: state.editingId || crypto.randomUUID(),
    place,
    date,
    lat,
    lng,
    photo,
    note,
    tags,
  });

  memoryForm.reset();
  hidePreviewPin();
  clearSuggestions();
  setSuggestionState("");
  resetFormMode();
});

editMemoryButton.addEventListener("click", () => {
  const memory = getSelectedMemory();
  if (!memory) {
    return;
  }

  state.editingId = memory.id;
  formTitle.textContent = "Edit memory";
  submitMemoryButton.textContent = "Update memory";
  cancelEditButton.hidden = false;
  fillForm(memory);

  memoryDialog.close();
  formContent.hidden = false;
  collapseFormButton.textContent = "Collapse form";
  collapseFormButton.setAttribute("aria-expanded", "true");
  placeInput.focus();
});

deleteMemoryButton.addEventListener("click", () => {
  const memory = getSelectedMemory();
  if (!memory) {
    return;
  }

  if (!window.confirm(`Delete memory from ${memory.place}?`)) {
    return;
  }

  deleteMemory(memory.id);
  memoryDialog.close();
});

cancelEditButton.addEventListener("click", () => {
  memoryForm.reset();
  hidePreviewPin();
  resetFormMode();
  formError.textContent = "";
});

searchInput.addEventListener("input", () => {
  state.filters.search = searchInput.value.trim();
  renderList();
});

tagFilter.addEventListener("change", () => {
  state.filters.tag = tagFilter.value;
  renderList();
});

placeInput.addEventListener("input", handlePlaceInput);

toggleAdvancedButton.addEventListener("click", () => {
  const isHidden = advancedFields.hidden;
  advancedFields.hidden = !isHidden;
  toggleAdvancedButton.setAttribute("aria-expanded", String(isHidden));
});

collapseFormButton.addEventListener("click", () => {
  const nextHidden = !formContent.hidden;
  formContent.hidden = nextHidden;
  collapseFormButton.textContent = nextHidden ? "Expand form" : "Collapse form";
  collapseFormButton.setAttribute("aria-expanded", String(!nextHidden));
});

focusFormButton.addEventListener("click", () => {
  formContent.hidden = false;
  collapseFormButton.textContent = "Collapse form";
  collapseFormButton.setAttribute("aria-expanded", "true");
  placeInput.focus();
});

exportMemoriesButton.addEventListener("click", exportJSON);

importMergeButton.addEventListener("click", () => {
  state.importMode = "merge";
  importFileInput.click();
});

importReplaceButton.addEventListener("click", () => {
  if (!window.confirm("Replace all current memories with imported file?")) {
    return;
  }
  state.importMode = "replace";
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const [file] = importFileInput.files;
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    importJSON(text, state.importMode);
    formError.textContent = "Import successful.";
  } catch {
    formError.textContent = "Import failed. Use a valid memories JSON file.";
  }

  importFileInput.value = "";
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
