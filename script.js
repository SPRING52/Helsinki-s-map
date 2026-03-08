const STORAGE_KEY = "helsinki_explorer_custom_points_v1";
const DEFAULT_CENTER = [60.1699, 24.9384];
const DEFAULT_ZOOM = 12;

const BASE_POINTS = [
  {
    id: "kauppatori",
    name: "Рыночная площадь",
    category: "Еда",
    address: "Etelaranta, 00170 Helsinki",
    blurb: "Рынок в гавани с местными закусками, кофе и видом на море.",
    coords: [60.1674, 24.9525],
    source: "seed",
  },
  {
    id: "suomenlinna",
    name: "Суоменлинна",
    category: "История",
    address: "Suomenlinna C 40, Helsinki",
    blurb: "Острова с морскими крепостями, музеями и прогулочными тропами.",
    coords: [60.1464, 24.9836],
    source: "seed",
  },
  {
    id: "loyly",
    name: "Сауна Loyly",
    category: "Здоровье",
    address: "Hernesaarenranta 4, Helsinki",
    blurb: "Общественная сауна и ресторан на берегу Балтийского моря.",
    coords: [60.1566, 24.9217],
    source: "seed",
  },
  {
    id: "oodi",
    name: "Библиотека Oodi",
    category: "Культура",
    address: "Toolonlahdenkatu 4, Helsinki",
    blurb:
      "Флагманская публичная библиотека и место проведения мероприятий недалеко от Кансалайстори.",
    coords: [60.1738, 24.9383],
    source: "seed",
  },
  {
    id: "kiasma",
    name: "Музей Kiasma",
    category: "Культура",
    address: "Mannerheiminaukio 2, Helsinki",
    blurb: "Музей современного искусства в центре Хельсинки.",
    coords: [60.1714, 24.9365],
    source: "seed",
  },
  {
    id: "allas",
    name: "Морской бассейн Allas",
    category: "Здоровье",
    address: "Katajanokanlaituri 2a, Helsinki",
    blurb: "Открытые бассейны и сауны с видом на горизонт гавани.",
    coords: [60.1678, 24.9588],
    source: "seed",
  },
  {
    id: "esplanadi",
    name: "Парк Эспланади",
    category: "На открытом воздухе",
    address: "Pohjoisesplanadi, Helsinki",
    blurb: "Центральная набережная для прогулок, мероприятий и кафе.",
    coords: [60.1673, 24.9466],
    source: "seed",
  },
  {
    id: "kallio",
    name: "Район Каллио",
    category: "Окрестности",
    address: "Kallio, Helsinki",
    blurb: "Оживленный район с независимыми барами и ресторанами.",
    coords: [60.1842, 24.9503],
    source: "seed",
  },
];

const dom = {
  searchInput: document.getElementById("searchInput"),
  categoryChips: document.getElementById("categoryChips"),
  locationList: document.getElementById("locationList"),
  resultsCount: document.getElementById("resultsCount"),
  pointForm: document.getElementById("pointForm"),
  pointName: document.getElementById("pointName"),
  pointDescription: document.getElementById("pointDescription"),
  pointLat: document.getElementById("pointLat"),
  pointLng: document.getElementById("pointLng"),
  pointCategory: document.getElementById("pointCategory"),
  pickCoordsButton: document.getElementById("pickCoordsButton"),
  formFeedback: document.getElementById("formFeedback"),
};

const appState = {
  points: [],
  filteredPoints: [],
  activeCategory: "Все",
  searchTerm: "",
  selectedPointId: null,
  mapCoordinatePicking: false,
};

const map = L.map("map", { zoomControl: false }).setView(
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
);
L.control.zoom({ position: "topright" }).addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const markersById = new Map();

initialize();

function initialize() {
  appState.points = [...BASE_POINTS, ...loadCustomPoints()];
  bindEvents();
  renderCategoryChips();
  applyFilters({ fitMap: true });
}

function bindEvents() {
  dom.searchInput.addEventListener("input", handleSearchInput);
  dom.categoryChips.addEventListener("click", handleCategoryClick);
  dom.locationList.addEventListener("click", handleListClick);
  dom.pointForm.addEventListener("submit", handlePointFormSubmit);
  dom.pickCoordsButton.addEventListener("click", toggleMapCoordinatePicking);
  map.on("click", handleMapClick);
}

function handleSearchInput(event) {
  appState.searchTerm = event.target.value.trim().toLowerCase();
  applyFilters({ fitMap: true });
}

function handleCategoryClick(event) {
  const chip = event.target.closest("button[data-category]");
  if (!chip) {
    return;
  }

  appState.activeCategory = chip.dataset.category;
  renderCategoryChips();
  applyFilters({ fitMap: true });
}

function handleListClick(event) {
  const card = event.target.closest("button[data-point-id]");
  if (!card) {
    return;
  }

  focusPoint(card.dataset.pointId, {
    flyTo: true,
    openPopup: true,
  });
}

function handlePointFormSubmit(event) {
  event.preventDefault();

  const formValues = {
    name: dom.pointName.value.trim(),
    description: dom.pointDescription.value.trim(),
    latitude: Number(dom.pointLat.value),
    longitude: Number(dom.pointLng.value),
    category: dom.pointCategory.value.trim(),
  };

  const validationError = validatePointForm(formValues);
  if (validationError) {
    setFormFeedback(validationError, "error");
    return;
  }

  const point = {
    id: createPointId(formValues.name),
    name: formValues.name,
    category: formValues.category || "Custom",
    address: `${formValues.latitude.toFixed(5)}, ${formValues.longitude.toFixed(5)}`,
    blurb: formValues.description,
    coords: [formValues.latitude, formValues.longitude],
    source: "custom",
  };

  appState.points.push(point);
  saveCustomPoints();

  dom.pointForm.reset();
  setMapCoordinatePicking(false);
  setFormFeedback("Point created and saved locally.", "success");

  appState.searchTerm = "";
  dom.searchInput.value = "";
  appState.activeCategory = "Все";
  renderCategoryChips();
  applyFilters({ fitMap: true });
  focusPoint(point.id, { flyTo: true, openPopup: true });
}

function handleMapClick(event) {
  if (!appState.mapCoordinatePicking) {
    return;
  }

  const latitude = Number(event.latlng.lat.toFixed(5));
  const longitude = Number(event.latlng.lng.toFixed(5));
  dom.pointLat.value = latitude;
  dom.pointLng.value = longitude;

  setMapCoordinatePicking(false);
  setFormFeedback("Coordinates captured from the map.", "info");
}

function toggleMapCoordinatePicking() {
  setMapCoordinatePicking(!appState.mapCoordinatePicking);
}

function setMapCoordinatePicking(enabled) {
  appState.mapCoordinatePicking = enabled;
  dom.pickCoordsButton.classList.toggle("is-active", enabled);
  dom.pickCoordsButton.setAttribute("aria-pressed", String(enabled));
  document.body.classList.toggle("is-picking-coords", enabled);

  if (enabled) {
    setFormFeedback(
      "Click any location on the map to fill coordinates.",
      "info",
    );
  }
}

function validatePointForm(values) {
  if (values.name.length < 2) {
    return "Name must contain at least 2 characters.";
  }

  if (values.description.length < 6) {
    return "Description must contain at least 6 characters.";
  }

  if (
    !Number.isFinite(values.latitude) ||
    values.latitude < -90 ||
    values.latitude > 90
  ) {
    return "Latitude must be a valid number between -90 and 90.";
  }

  if (
    !Number.isFinite(values.longitude) ||
    values.longitude < -180 ||
    values.longitude > 180
  ) {
    return "Longitude must be a valid number between -180 and 180.";
  }

  return null;
}

function setFormFeedback(message, tone) {
  dom.formFeedback.textContent = message;
  dom.formFeedback.className = `form-feedback ${tone}`;
}

function applyFilters(options = { fitMap: false }) {
  appState.filteredPoints = getFilteredPoints();

  if (
    !appState.filteredPoints.some(
      (point) => point.id === appState.selectedPointId,
    )
  ) {
    appState.selectedPointId = appState.filteredPoints[0]?.id ?? null;
  }

  renderLocationList();
  ensureMarkersExist();
  syncMarkerVisibility();
  updateMarkerStyles();

  if (options.fitMap) {
    fitMapToFilteredPoints();
  }
}

function getFilteredPoints() {
  return appState.points.filter((point) => {
    const matchesCategory =
      appState.activeCategory === "Все" ||
      point.category === appState.activeCategory;
    const matchesSearch =
      point.name.toLowerCase().includes(appState.searchTerm) ||
      point.address.toLowerCase().includes(appState.searchTerm) ||
      point.blurb.toLowerCase().includes(appState.searchTerm);

    return matchesCategory && matchesSearch;
  });
}

function renderCategoryChips() {
  const categories = [
    "Все",
    ...new Set(appState.points.map((point) => point.category).filter(Boolean)),
  ];

  dom.categoryChips.innerHTML = categories
    .map((category) => {
      const isActive = category === appState.activeCategory;
      return `
        <button
          type="button"
          class="category-chip ${isActive ? "active" : ""}"
          role="tab"
          aria-selected="${isActive}"
          data-category="${escapeHtml(category)}"
        >
          ${escapeHtml(category)}
        </button>
      `;
    })
    .join("");
}

function renderLocationList() {
  if (appState.filteredPoints.length === 1) {
    dom.resultsCount.textContent = `${appState.filteredPoints.length} Место`;
  } else if (
    appState.filteredPoints.length > 1 &&
    appState.filteredPoints.length < 5
  ) {
    dom.resultsCount.textContent = `${appState.filteredPoints.length} Места`;
  } else if (appState.filteredPoints.length >= 5) {
    dom.resultsCount.textContent = `${appState.filteredPoints.length} Мест`;
  }

  if (!appState.filteredPoints.length) {
    dom.locationList.innerHTML =
      '<p class="empty-state">No locations match this filter.</p>';
    return;
  }

  const cards = appState.filteredPoints
    .map((point) => {
      const isActive = point.id === appState.selectedPointId;
      return `
        <button
          type="button"
          class="location-card ${isActive ? "active" : ""}"
          data-point-id="${escapeHtml(point.id)}"
        >
          <h3>${escapeHtml(point.name)}</h3>
          <p class="meta">${escapeHtml(point.address)}</p>
          <p class="meta">${escapeHtml(point.blurb)}</p>
          <span class="tag">${escapeHtml(point.category)}</span>
        </button>
      `;
    })
    .join("");

  dom.locationList.innerHTML = cards;
}

function ensureMarkersExist() {
  for (const point of appState.points) {
    if (markersById.has(point.id)) {
      continue;
    }

    const marker = createMarker(point);
    markersById.set(point.id, marker);
    marker.addTo(markerLayer);
  }
}

function createMarker(point) {
  const marker = L.circleMarker(point.coords, {
    className: "map-point",
    radius: 8,
    color: "#0a7f8f",
    weight: 2,
    fillColor: "#0a7f8f",
    fillOpacity: 0.88,
  });

  marker.bindPopup(createPopupHtml(point));

  marker.on("mouseover", () => {
    if (point.id === appState.selectedPointId) {
      return;
    }
    applyMarkerStyle(marker, "hover");
  });

  marker.on("mouseout", () => {
    const styleMode =
      point.id === appState.selectedPointId ? "selected" : "default";
    applyMarkerStyle(marker, styleMode);
  });

  marker.on("click", () => {
    focusPoint(point.id, { flyTo: false, openPopup: true });
  });

  return marker;
}

function syncMarkerVisibility() {
  const visibleIds = new Set(appState.filteredPoints.map((point) => point.id));

  // Keep marker instances cached and only toggle visibility.
  for (const [pointId, marker] of markersById.entries()) {
    if (visibleIds.has(pointId)) {
      if (!markerLayer.hasLayer(marker)) {
        markerLayer.addLayer(marker);
      }
    } else if (markerLayer.hasLayer(marker)) {
      markerLayer.removeLayer(marker);
    }
  }
}

function updateMarkerStyles() {
  const visibleIds = new Set(appState.filteredPoints.map((point) => point.id));

  for (const [pointId, marker] of markersById.entries()) {
    if (!visibleIds.has(pointId)) {
      continue;
    }

    const styleMode =
      pointId === appState.selectedPointId ? "selected" : "default";
    applyMarkerStyle(marker, styleMode);
  }
}

function applyMarkerStyle(marker, mode) {
  if (mode === "hover") {
    marker.setStyle({
      color: "#d9901f",
      fillColor: "#d9901f",
      fillOpacity: 1,
      weight: 3,
    });
    marker.setRadius(10);
    return;
  }

  if (mode === "selected") {
    marker.setStyle({
      color: "#e39d32",
      fillColor: "#e39d32",
      fillOpacity: 1,
      weight: 3,
    });
    marker.setRadius(10);
    return;
  }

  marker.setStyle({
    color: "#0a7f8f",
    fillColor: "#0a7f8f",
    fillOpacity: 0.88,
    weight: 2,
  });
  marker.setRadius(8);
}

function fitMapToFilteredPoints() {
  if (!appState.filteredPoints.length) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    return;
  }

  if (appState.filteredPoints.length === 1) {
    map.setView(appState.filteredPoints[0].coords, 14);
    return;
  }

  const bounds = L.latLngBounds(
    appState.filteredPoints.map((point) => point.coords),
  );
  map.fitBounds(bounds, { padding: [36, 36] });
}

function focusPoint(pointId, options = { flyTo: false, openPopup: false }) {
  const point = appState.points.find((candidate) => candidate.id === pointId);
  if (!point) {
    return;
  }

  appState.selectedPointId = point.id;
  renderLocationList();
  updateMarkerStyles();

  if (options.flyTo) {
    map.flyTo(point.coords, 14, { duration: 0.65 });
  }

  if (options.openPopup) {
    markersById.get(point.id)?.openPopup();
  }
}

function createPopupHtml(point) {
  return `
    <strong>${escapeHtml(point.name)}</strong><br>
    ${escapeHtml(point.category)}<br>
    ${escapeHtml(point.address)}
  `;
}

function createPointId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28);
  return `${slug || "point"}-${Date.now()}`;
}

function loadCustomPoints() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeStoredPoint).filter((point) => point !== null);
  } catch (_error) {
    return [];
  }
}

function normalizeStoredPoint(rawPoint) {
  if (!rawPoint || typeof rawPoint !== "object") {
    return null;
  }

  const latitude = Number(rawPoint.coords?.[0]);
  const longitude = Number(rawPoint.coords?.[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: typeof rawPoint.id === "string" ? rawPoint.id : createPointId("point"),
    name: String(rawPoint.name || "Untitled point"),
    category: String(rawPoint.category || "Custom"),
    address: String(
      rawPoint.address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    ),
    blurb: String(rawPoint.blurb || "No description provided."),
    coords: [latitude, longitude],
    source: "custom",
  };
}

function saveCustomPoints() {
  const customPoints = appState.points.filter(
    (point) => point.source === "custom",
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customPoints));
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}
