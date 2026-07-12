const STUDIO_STORAGE_KEY = "travelers-workstation.studio.projects.v1";
const STUDIO_ACTIVE_KEY = "travelers-workstation.studio.active-project.v1";
const STUDIO_SCHEMA_VERSION = 1;
const STUDIO_EXPORT_SIZES = {
  "3:4": { width: 1080, height: 1440 },
  "2:3": { width: 1080, height: 1620 },
};

const studioLayouts = ["split-cover", "standard", "image-first", "full-image", "places"];
const studioThemes = {
  atelier: { background: "#FBF9F4", ink: "#242321", accent: "#7d638f", line: "#DCD9D2" },
  powder: { background: "#F5F1E8", ink: "#242321", accent: "#6f8ba2", line: "#C7D8E6" },
  sage: { background: "#F5F1E8", ink: "#242321", accent: "#7d8870", line: "#C9D2C0" },
};

const studioDefaultPages = [
  ["01", "AMSTERDAM", "72 HOURS", "Summer 2026", "split-cover"],
  ["02", "HOTEL", "The Hoxton Amsterdam", "", "standard"],
  ["03", "MUSEUM", "Stedelijk Museum", "", "standard"],
  ["04", "MUSEUM", "Rijksmuseum", "", "standard"],
  ["05", "COFFEE", "Bocca", "", "image-first"],
  ["06", "FOOD", "Toko Bersama", "", "standard"],
  ["07", "WANDERING", "Nine Streets", "", "standard"],
  ["08", "DETAILS", "Markets and small finds", "", "image-first"],
  ["09", "EVENING", "Canals, 10:45 p.m.", "", "full-image"],
  ["10", "PLACES", "", "Bocca\nToko Bersama\nDe Juwelier\nVan Gogh Museum\nRijksmuseum\nStedelijk Museum\nThe Hoxton Amsterdam", "places"],
];

const studioEls = {};
let studioState;
let studioInitialized = false;
let studioHistory = [];
let studioFuture = [];

const studioUid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const studioNow = () => new Date().toISOString();
const cloneStudio = (value) => JSON.parse(JSON.stringify(value));
const slugifyStudio = (value) => String(value || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";

const defaultCrop = () => ({ zoom: 1, x: 0, y: 0, rotate: 0, fit: "fill" });
const defaultAdjustments = () => ({ exposure: 0, temperature: 0, tint: 0, contrast: 0, highlights: 0, shadows: 0, saturation: 0, grain: 0 });

const createDefaultProject = () => {
  const createdAt = studioNow();
  return {
    id: studioUid("studio-project"),
    schemaVersion: STUDIO_SCHEMA_VERSION,
    title: "Amsterdam · 72 Hours",
    city: "Amsterdam",
    country: "Netherlands",
    travelDates: "Summer 2026",
    journeyReference: "",
    websiteEntryReference: "",
    aspectRatio: "3:4",
    theme: "atelier",
    pages: studioDefaultPages.map(([number, title, subtitle, notes, layoutType], index) => ({
      id: studioUid("page"),
      order: index + 1,
      layoutType,
      content: { number, title, subtitle, kicker: index === 0 ? "Summer 2026" : "", notes },
      photoAssetId: "",
      crop: defaultCrop(),
      adjustments: defaultAdjustments(),
      background: "",
      typographyOverrides: {},
      altText: `${title} ${subtitle}`.trim(),
    })),
    mediaAssets: [],
    exportSettings: { format: "png", scale: 1, longLayout: "one-column" },
    createdAt,
    updatedAt: createdAt,
  };
};

const validateStudioProject = (project) => {
  if (!project || typeof project !== "object") throw new Error("Project file is not an object.");
  if (project.schemaVersion !== STUDIO_SCHEMA_VERSION) throw new Error(`Unsupported Studio schema version: ${project.schemaVersion || "missing"}.`);
  if (!Array.isArray(project.pages) || project.pages.length === 0) throw new Error("Project must include at least one page.");
  project.pages.forEach((page, index) => {
    if (!page.id || !studioLayouts.includes(page.layoutType)) throw new Error(`Page ${index + 1} has an invalid layout.`);
    if (!page.content || typeof page.content.title !== "string") throw new Error(`Page ${index + 1} has invalid editable content.`);
  });
  if (!Array.isArray(project.mediaAssets)) throw new Error("Project mediaAssets must be an array.");
  return true;
};

const loadStudioProject = () => {
  try {
    const activeId = localStorage.getItem(STUDIO_ACTIVE_KEY);
    const projects = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) || "[]");
    const project = projects.find((item) => item.id === activeId) || projects[0];
    if (project) {
      validateStudioProject(project);
      return project;
    }
  } catch (error) {
    console.warn(error.message);
  }
  return createDefaultProject();
};

const saveStudioProject = () => {
  studioState.project.updatedAt = studioNow();
  const projects = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) || "[]").filter((item) => item.id !== studioState.project.id);
  projects.unshift(studioState.project);
  localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(projects));
  localStorage.setItem(STUDIO_ACTIVE_KEY, studioState.project.id);
  studioEls.mediaState.textContent = "Project saved locally in this browser.";
};

const getSelectedStudioPage = () => studioState.project.pages.find((page) => page.id === studioState.selectedPageId) || studioState.project.pages[0];
const getStudioAsset = (id) => studioState.project.mediaAssets.find((asset) => asset.id === id) || null;

const rememberStudio = () => {
  studioHistory.push(cloneStudio(studioState.project));
  if (studioHistory.length > 40) studioHistory.shift();
  studioFuture = [];
};

const commitStudio = () => {
  studioState.project.updatedAt = studioNow();
  saveStudioProject();
  renderStudio();
};

const imageFilter = (adjustments) => {
  const exposure = 1 + Number(adjustments.exposure || 0);
  const contrast = 1 + Number(adjustments.contrast || 0) / 100;
  const saturation = 1 + Number(adjustments.saturation || 0) / 100;
  const temp = Number(adjustments.temperature || 0);
  return `brightness(${exposure}) contrast(${contrast}) saturate(${saturation}) sepia(${Math.max(0, temp) / 80})`;
};

const renderStudioCanvas = () => {
  const page = getSelectedStudioPage();
  const asset = getStudioAsset(page.photoAssetId);
  const theme = studioThemes[studioState.project.theme] || studioThemes.atelier;
  studioEls.canvas.className = `studio-canvas studio-canvas--${page.layoutType} studio-theme--${studioState.project.theme}`;
  studioEls.canvas.style.setProperty("--studio-page-bg", theme.background);
  studioEls.canvas.style.setProperty("--studio-page-ink", theme.ink);
  studioEls.canvas.style.setProperty("--studio-page-accent", theme.accent);
  studioEls.canvas.style.setProperty("--studio-page-line", theme.line);
  studioEls.canvas.style.aspectRatio = studioState.project.aspectRatio.replace(":", " / ");
  const image = asset
    ? `<img src="${asset.dataUrl}" alt="${page.altText || asset.originalName}" style="object-position:${50 + Number(page.crop.x)}% ${50 + Number(page.crop.y)}%; transform:scale(${page.crop.zoom}) rotate(${page.crop.rotate}deg); filter:${imageFilter(page.adjustments)};" />`
    : `<span>Drop photograph</span>`;
  const notes = String(page.content.notes || "").split("\n").filter(Boolean).map((line) => `<li>${line}</li>`).join("");
  studioEls.canvas.innerHTML = `
    <div class="studio-safe-area ${studioEls.guides.checked ? "is-visible" : ""}"></div>
    <div class="studio-page-number" data-field="number">${page.content.number || String(page.order).padStart(2, "0")}</div>
    <div class="studio-photo-frame" data-photo-frame>${image}</div>
    <div class="studio-text-block">
      <p class="studio-canvas-kicker" data-field="kicker">${page.content.kicker || ""}</p>
      <h2 data-field="title">${page.content.title || "Untitled"}</h2>
      <p class="studio-canvas-subtitle" data-field="subtitle">${page.content.subtitle || ""}</p>
      ${page.layoutType === "places" ? `<ol>${notes}</ol>` : `<p class="studio-canvas-notes" data-field="notes">${page.content.notes || ""}</p>`}
    </div>`;
};

const renderStudioPages = () => {
  studioEls.pageList.innerHTML = "";
  studioState.project.pages.sort((a, b) => a.order - b.order).forEach((page, index) => {
    page.order = index + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `studio-page-row ${page.id === studioState.selectedPageId ? "is-selected" : ""}`;
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${page.content.title || "Untitled"}</strong><small>${page.content.subtitle || page.layoutType}</small>`;
    button.addEventListener("click", () => {
      studioState.selectedPageId = page.id;
      renderStudio();
    });
    studioEls.pageList.append(button);
  });
};

const renderStudioFilmstrip = () => {
  studioEls.filmstrip.innerHTML = "";
  studioState.project.pages.forEach((page, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = page.id === studioState.selectedPageId ? "is-selected" : "";
    button.textContent = `${String(index + 1).padStart(2, "0")} ${page.content.title}`;
    button.addEventListener("click", () => {
      studioState.selectedPageId = page.id;
      renderStudio();
    });
    studioEls.filmstrip.append(button);
  });
};

const renderStudioMedia = () => {
  studioEls.mediaList.innerHTML = "";
  studioState.project.mediaAssets.forEach((asset) => {
    const uses = studioState.project.pages.filter((page) => page.photoAssetId === asset.id).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "studio-media-item";
    button.innerHTML = `<img src="${asset.dataUrl}" alt=""><span>${asset.originalName}</span><small>${asset.width}×${asset.height} · used ${uses}</small>`;
    button.addEventListener("click", () => {
      rememberStudio();
      getSelectedStudioPage().photoAssetId = asset.id;
      commitStudio();
    });
    studioEls.mediaList.append(button);
  });
};

const updateStudioWarnings = () => {
  const page = getSelectedStudioPage();
  const titleWords = String(page.content.title || "").split(/\s+/).filter(Boolean).length;
  const subtitleWords = String(page.content.subtitle || "").split(/\s+/).filter(Boolean).length;
  const notesWords = String(page.content.notes || "").split(/\s+/).filter(Boolean).length;
  studioEls.titleWarning.textContent = titleWords > 4 ? "Recommended: 1–4 words." : "";
  studioEls.subtitleWarning.textContent = subtitleWords > 6 ? "Recommended place name: maximum 6 words." : "";
  studioEls.notesWarning.textContent = notesWords > 25 ? "Recommended supporting copy: 20–25 words." : "";
};

const renderStudioInspector = () => {
  const project = studioState.project;
  const page = getSelectedStudioPage();
  studioEls.projectTitle.value = project.title;
  studioEls.city.value = project.city || "";
  studioEls.country.value = project.country || "";
  studioEls.ratio.value = project.aspectRatio;
  studioEls.theme.value = project.theme;
  studioEls.layout.value = page.layoutType;
  studioEls.number.value = page.content.number || "";
  studioEls.title.value = page.content.title || "";
  studioEls.subtitle.value = page.content.subtitle || "";
  studioEls.kicker.value = page.content.kicker || "";
  studioEls.notes.value = page.content.notes || "";
  studioEls.alt.value = page.altText || "";
  studioEls.zoom.value = page.crop.zoom;
  studioEls.x.value = page.crop.x;
  studioEls.y.value = page.crop.y;
  studioEls.exposure.value = page.adjustments.exposure;
  studioEls.temperature.value = page.adjustments.temperature;
  studioEls.contrast.value = page.adjustments.contrast;
  studioEls.saturation.value = page.adjustments.saturation;
  studioEls.grain.value = page.adjustments.grain;
  studioEls.selectedState.textContent = `${page.content.number || String(page.order).padStart(2, "0")} · ${page.content.title}`;
  updateStudioWarnings();
};

const renderStudio = () => {
  renderStudioPages();
  renderStudioCanvas();
  renderStudioInspector();
  renderStudioMedia();
  renderStudioFilmstrip();
};

const setStudioPageField = (field, value) => {
  rememberStudio();
  getSelectedStudioPage().content[field] = value;
  commitStudio();
};

const setStudioProjectField = (field, value) => {
  rememberStudio();
  studioState.project[field] = value;
  commitStudio();
};

const readStudioImage = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(jpeg|png|webp|heic)$/)) {
      reject(new Error(`${file.name} cannot be previewed by this browser.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error(`Could not decode ${file.name}.`));
      image.onload = () => resolve({
        id: studioUid("media"),
        originalName: file.name,
        mimeType: file.type,
        width: image.naturalWidth,
        height: image.naturalHeight,
        indexedDbReference: "localStorage-data-url-mvp",
        dataUrl: reader.result,
        createdAt: studioNow(),
      });
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const handleStudioFiles = async (files) => {
  const incoming = [...files];
  if (!incoming.length) return;
  rememberStudio();
  studioEls.mediaState.textContent = `Importing ${incoming.length} photograph(s)…`;
  const results = [];
  const errors = [];
  for (const file of incoming) {
    try {
      if (file.size > 8 * 1024 * 1024) errors.push(`${file.name} is large; localStorage may fill quickly.`);
      results.push(await readStudioImage(file));
    } catch (error) {
      errors.push(error.message);
    }
  }
  studioState.project.mediaAssets.push(...results);
  if (results[0] && !getSelectedStudioPage().photoAssetId) getSelectedStudioPage().photoAssetId = results[0].id;
  studioEls.mediaState.textContent = errors.length ? errors.join(" ") : `${results.length} photograph(s) added locally.`;
  commitStudio();
};

const renderExportCanvas = async (page, scale = 1) => {
  const size = STUDIO_EXPORT_SIZES[studioState.project.aspectRatio] || STUDIO_EXPORT_SIZES["3:4"];
  const canvas = document.createElement("canvas");
  canvas.width = size.width * scale;
  canvas.height = size.height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const theme = studioThemes[studioState.project.theme] || studioThemes.atelier;
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.strokeStyle = theme.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 72, size.width - 144, size.height - 144);

  const asset = getStudioAsset(page.photoAssetId);
  const drawText = () => {
    ctx.fillStyle = theme.ink;
    ctx.font = "28px Inter, sans-serif";
    ctx.fillText(page.content.number || String(page.order).padStart(2, "0"), 120, 150);
    ctx.font = "96px Instrument Serif, serif";
    wrapCanvasText(ctx, page.content.title || "Untitled", 120, page.layoutType === "split-cover" ? 430 : 260, 430, 104);
    ctx.font = "38px Instrument Serif, serif";
    if (page.content.subtitle) wrapCanvasText(ctx, page.content.subtitle, 120, page.layoutType === "split-cover" ? 650 : 385, 430, 48);
    ctx.font = "28px Inter, sans-serif";
    if (page.content.kicker) ctx.fillText(page.content.kicker, 120, size.height - 150);
    if (page.layoutType === "places") wrapCanvasText(ctx, page.content.notes || "", 120, 350, 760, 44);
  };

  const frame = getFrameForLayout(page.layoutType, size);
  if (asset && page.layoutType !== "places") {
    await drawImageToFrame(ctx, asset.dataUrl, frame, page.crop, page.adjustments);
  } else if (page.layoutType !== "places") {
    ctx.fillStyle = "#E7E3DC";
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
  }
  drawText();
  return canvas;
};

const getFrameForLayout = (layout, size) => {
  const standard = { x: 120, y: 520, w: size.width - 240, h: 560 };
  if (layout === "split-cover") return { x: 590, y: 160, w: 360, h: size.height - 320 };
  if (layout === "image-first") return { x: 120, y: 150, w: size.width - 240, h: 680 };
  if (layout === "full-image") return { x: 72, y: 72, w: size.width - 144, h: size.height - 144 };
  return standard;
};

const drawImageToFrame = (ctx, dataUrl, frame, crop, adjustments) =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(frame.x, frame.y, frame.w, frame.h);
      ctx.clip();
      ctx.filter = imageFilter(adjustments);
      const scale = Math.max(frame.w / image.naturalWidth, frame.h / image.naturalHeight) * Number(crop.zoom || 1);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      const x = frame.x + (frame.w - w) / 2 + (Number(crop.x || 0) / 50) * frame.w;
      const y = frame.y + (frame.h - h) / 2 + (Number(crop.y || 0) / 50) * frame.h;
      ctx.drawImage(image, x, y, w, h);
      ctx.restore();
      ctx.filter = "none";
      resolve();
    };
    image.src = dataUrl;
  });

const wrapCanvasText = (ctx, text, x, y, maxWidth, lineHeight) => {
  String(text || "").split("\n").forEach((paragraph) => {
    const words = paragraph.split(/\s+/);
    let line = "";
    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    });
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportCurrentStudioPage = async () => {
  const page = getSelectedStudioPage();
  const canvas = await renderExportCanvas(page, 1);
  canvas.toBlob((blob) => downloadBlob(blob, studioFileName(page, "png")), "image/png");
};

const studioFileName = (page, ext) => `${slugifyStudio(studioState.project.title)}-${String(page.order).padStart(2, "0")}-${slugifyStudio(page.content.title)}.${ext}`;

const makeZip = (files) => {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = file.bytes;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, data);
    const header = new Uint8Array(46 + nameBytes.length);
    const cview = new DataView(header.buffer);
    cview.setUint32(0, 0x02014b50, true);
    cview.setUint16(4, 20, true);
    cview.setUint16(6, 20, true);
    cview.setUint32(16, crc, true);
    cview.setUint32(20, data.length, true);
    cview.setUint32(24, data.length, true);
    cview.setUint16(28, nameBytes.length, true);
    cview.setUint32(42, offset, true);
    header.set(nameBytes, 46);
    central.push(header);
    offset += local.length + data.length;
  });
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const eview = new DataView(end.buffer);
  eview.setUint32(0, 0x06054b50, true);
  eview.setUint16(8, files.length, true);
  eview.setUint16(10, files.length, true);
  eview.setUint32(12, centralSize, true);
  eview.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end], { type: "application/zip" });
};

const crc32 = (bytes) => {
  let crc = -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
};

const exportAllStudioPages = async () => {
  const files = [];
  for (const page of studioState.project.pages) {
    const canvas = await renderExportCanvas(page, 1);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    files.push({ name: studioFileName(page, "png"), bytes: new Uint8Array(await blob.arrayBuffer()) });
  }
  downloadBlob(makeZip(files), `${slugifyStudio(studioState.project.title)}-carousel.zip`);
};

const exportLongStudioImage = async () => {
  const size = STUDIO_EXPORT_SIZES[studioState.project.aspectRatio] || STUDIO_EXPORT_SIZES["3:4"];
  const gutter = 80;
  const canvas = document.createElement("canvas");
  canvas.width = size.width + gutter * 2;
  canvas.height = studioState.project.pages.length * size.height + (studioState.project.pages.length + 1) * gutter;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#F5F1E8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < studioState.project.pages.length; i += 1) {
    const pageCanvas = await renderExportCanvas(studioState.project.pages[i], 1);
    ctx.drawImage(pageCanvas, gutter, gutter + i * (size.height + gutter));
  }
  canvas.toBlob((blob) => downloadBlob(blob, `${slugifyStudio(studioState.project.title)}-long-editorial.png`), "image/png");
};

const bindStudio = () => {
  Object.assign(studioEls, {
    page: document.getElementById("studio-page"), back: document.getElementById("studio-back-cover"), projectTitle: document.getElementById("studio-project-title"), city: document.getElementById("studio-city"), country: document.getElementById("studio-country"), ratio: document.getElementById("studio-ratio"), theme: document.getElementById("studio-theme"), pageList: document.getElementById("studio-page-list"), canvas: document.getElementById("studio-canvas"), guides: document.getElementById("studio-guides"), selectedState: document.getElementById("studio-selected-state"), filmstrip: document.getElementById("studio-filmstrip"), layout: document.getElementById("studio-layout"), number: document.getElementById("studio-number"), title: document.getElementById("studio-title"), subtitle: document.getElementById("studio-subtitle"), kicker: document.getElementById("studio-kicker"), notes: document.getElementById("studio-notes"), alt: document.getElementById("studio-alt"), titleWarning: document.getElementById("studio-title-warning"), subtitleWarning: document.getElementById("studio-subtitle-warning"), notesWarning: document.getElementById("studio-notes-warning"), upload: document.getElementById("studio-media-upload"), mediaState: document.getElementById("studio-media-state"), drop: document.getElementById("studio-media-drop"), mediaList: document.getElementById("studio-media-list"), zoom: document.getElementById("studio-zoom"), x: document.getElementById("studio-x"), y: document.getElementById("studio-y"), exposure: document.getElementById("studio-exposure"), temperature: document.getElementById("studio-temperature"), contrast: document.getElementById("studio-contrast"), saturation: document.getElementById("studio-saturation"), grain: document.getElementById("studio-grain"), importProject: document.getElementById("studio-import")
  });

  studioEls.back.addEventListener("click", () => window.WorkstationNavigation?.openCoverPage());
  document.getElementById("studio-save").addEventListener("click", saveStudioProject);
  document.getElementById("studio-export-page").addEventListener("click", exportCurrentStudioPage);
  document.getElementById("studio-export-all").addEventListener("click", exportAllStudioPages);
  document.getElementById("studio-export-long").addEventListener("click", exportLongStudioImage);
  document.getElementById("studio-export-project").addEventListener("click", () => downloadBlob(new Blob([JSON.stringify(studioState.project, null, 2)], { type: "application/json" }), `${slugifyStudio(studioState.project.title)}.json`));
  document.getElementById("studio-delete-project").addEventListener("click", () => { if (confirm("Delete the local Studio project?")) { studioState.project = createDefaultProject(); studioState.selectedPageId = studioState.project.pages[0].id; commitStudio(); } });
  document.getElementById("studio-duplicate-project").addEventListener("click", () => { rememberStudio(); studioState.project = { ...cloneStudio(studioState.project), id: studioUid("studio-project"), title: `${studioState.project.title} copy`, createdAt: studioNow(), updatedAt: studioNow() }; studioState.selectedPageId = studioState.project.pages[0].id; commitStudio(); });
  document.getElementById("studio-add-page").addEventListener("click", () => { rememberStudio(); const page = createDefaultProject().pages[1]; page.id = studioUid("page"); page.order = studioState.project.pages.length + 1; page.content.number = String(page.order).padStart(2, "0"); page.content.title = "NEW PAGE"; studioState.project.pages.push(page); studioState.selectedPageId = page.id; commitStudio(); });
  document.getElementById("studio-duplicate-page").addEventListener("click", () => { rememberStudio(); const page = cloneStudio(getSelectedStudioPage()); page.id = studioUid("page"); page.order = studioState.project.pages.length + 1; studioState.project.pages.push(page); studioState.selectedPageId = page.id; commitStudio(); });
  document.getElementById("studio-delete-page").addEventListener("click", () => { if (studioState.project.pages.length <= 1) return; rememberStudio(); studioState.project.pages = studioState.project.pages.filter((page) => page.id !== studioState.selectedPageId); studioState.selectedPageId = studioState.project.pages[0].id; commitStudio(); });
  document.getElementById("studio-move-up").addEventListener("click", () => moveSelectedPage(-1));
  document.getElementById("studio-move-down").addEventListener("click", () => moveSelectedPage(1));
  document.getElementById("studio-undo").addEventListener("click", () => { if (!studioHistory.length) return; studioFuture.push(cloneStudio(studioState.project)); studioState.project = studioHistory.pop(); studioState.selectedPageId = studioState.project.pages[0].id; commitStudio(); });
  document.getElementById("studio-redo").addEventListener("click", () => { if (!studioFuture.length) return; studioHistory.push(cloneStudio(studioState.project)); studioState.project = studioFuture.pop(); studioState.selectedPageId = studioState.project.pages[0].id; commitStudio(); });
  document.getElementById("studio-preview").addEventListener("click", () => studioEls.filmstrip.scrollIntoView({ behavior: "smooth" }));
  document.getElementById("studio-fit").addEventListener("click", () => { rememberStudio(); getSelectedStudioPage().crop = { ...getSelectedStudioPage().crop, zoom: 0.8, fit: "fit" }; commitStudio(); });
  document.getElementById("studio-fill").addEventListener("click", () => { rememberStudio(); getSelectedStudioPage().crop = { ...getSelectedStudioPage().crop, zoom: 1, fit: "fill" }; commitStudio(); });
  document.getElementById("studio-rotate").addEventListener("click", () => { rememberStudio(); getSelectedStudioPage().crop.rotate = (Number(getSelectedStudioPage().crop.rotate) + 90) % 360; commitStudio(); });
  document.getElementById("studio-reset-crop").addEventListener("click", () => { rememberStudio(); getSelectedStudioPage().crop = defaultCrop(); commitStudio(); });
  document.getElementById("studio-reset-adjustments").addEventListener("click", () => { rememberStudio(); getSelectedStudioPage().adjustments = defaultAdjustments(); commitStudio(); });

  [[studioEls.projectTitle, "title"], [studioEls.city, "city"], [studioEls.country, "country"], [studioEls.ratio, "aspectRatio"], [studioEls.theme, "theme"]].forEach(([element, field]) => element.addEventListener("change", () => setStudioProjectField(field, element.value)));
  [[studioEls.number, "number"], [studioEls.title, "title"], [studioEls.subtitle, "subtitle"], [studioEls.kicker, "kicker"], [studioEls.notes, "notes"]].forEach(([element, field]) => element.addEventListener("input", () => setStudioPageField(field, element.value)));
  studioEls.layout.addEventListener("change", () => { rememberStudio(); getSelectedStudioPage().layoutType = studioEls.layout.value; commitStudio(); });
  studioEls.alt.addEventListener("input", () => { rememberStudio(); getSelectedStudioPage().altText = studioEls.alt.value; commitStudio(); });
  [[studioEls.zoom, "zoom"], [studioEls.x, "x"], [studioEls.y, "y"]].forEach(([element, field]) => element.addEventListener("input", () => { getSelectedStudioPage().crop[field] = Number(element.value); renderStudioCanvas(); }));
  [[studioEls.exposure, "exposure"], [studioEls.temperature, "temperature"], [studioEls.contrast, "contrast"], [studioEls.saturation, "saturation"], [studioEls.grain, "grain"]].forEach(([element, field]) => element.addEventListener("input", () => { getSelectedStudioPage().adjustments[field] = Number(element.value); renderStudioCanvas(); }));
  studioEls.upload.addEventListener("change", () => handleStudioFiles(studioEls.upload.files));
  studioEls.drop.addEventListener("dragover", (event) => { event.preventDefault(); studioEls.drop.classList.add("is-dragging"); });
  studioEls.drop.addEventListener("dragleave", () => studioEls.drop.classList.remove("is-dragging"));
  studioEls.drop.addEventListener("drop", (event) => { event.preventDefault(); studioEls.drop.classList.remove("is-dragging"); handleStudioFiles(event.dataTransfer.files); });
  studioEls.guides.addEventListener("change", renderStudioCanvas);
  studioEls.importProject.addEventListener("change", importStudioProject);
  document.querySelectorAll(".studio-tab").forEach((tab) => tab.addEventListener("click", () => switchStudioTab(tab.dataset.tab)));
};

const moveSelectedPage = (direction) => {
  const index = studioState.project.pages.findIndex((page) => page.id === studioState.selectedPageId);
  const next = index + direction;
  if (next < 0 || next >= studioState.project.pages.length) return;
  rememberStudio();
  const [page] = studioState.project.pages.splice(index, 1);
  studioState.project.pages.splice(next, 0, page);
  commitStudio();
};

const switchStudioTab = (name) => {
  document.querySelectorAll(".studio-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
  document.querySelectorAll(".studio-tab-panel").forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
};

const importStudioProject = async () => {
  const file = studioEls.importProject.files?.[0];
  if (!file) return;
  try {
    const project = JSON.parse(await file.text());
    validateStudioProject(project);
    rememberStudio();
    studioState.project = project;
    studioState.selectedPageId = project.pages[0].id;
    commitStudio();
  } catch (error) {
    studioEls.mediaState.textContent = `Invalid project file: ${error.message}`;
  }
};

const initStudio = () => {
  if (!studioInitialized) {
    bindStudio();
    studioState = { project: loadStudioProject(), selectedPageId: null };
    studioState.selectedPageId = studioState.project.pages[0].id;
    studioInitialized = true;
  }
  renderStudio();
};

window.EditorialStudio = { init: initStudio };

if (!document.getElementById("studio-page")?.hidden) {
  initStudio();
}
