const locations = [
  {
    id: "kauppatori",
    name: "Market Square",
    category: "Food",
    address: "Etelaranta, 00170 Helsinki",
    blurb: "Harbor market with local snacks, coffee, and sea views.",
    coords: [60.1674, 24.9525],
  },
  {
    id: "suomenlinna",
    name: "Suomenlinna",
    category: "Historic",
    address: "Suomenlinna C 40, Helsinki",
    blurb: "Sea fortress islands with museums and walking paths.",
    coords: [60.1464, 24.9836],
  },
  {
    id: "loyly",
    name: "Loyly Sauna",
    category: "Wellness",
    address: "Hernesaarenranta 4, Helsinki",
    blurb: "Public sauna and restaurant on the Baltic shoreline.",
    coords: [60.1566, 24.9217],
  },
  {
    id: "oodi",
    name: "Oodi Library",
    category: "Culture",
    address: "Toolonlahdenkatu 4, Helsinki",
    blurb: "Flagship public library and event venue near Kansalaistori.",
    coords: [60.1738, 24.9383],
  },
  {
    id: "kiasma",
    name: "Kiasma Museum",
    category: "Culture",
    address: "Mannerheiminaukio 2, Helsinki",
    blurb: "Contemporary art museum in central Helsinki.",
    coords: [60.1714, 24.9365],
  },
  {
    id: "allas",
    name: "Allas Sea Pool",
    category: "Wellness",
    address: "Katajanokanlaituri 2a, Helsinki",
    blurb: "Outdoor pools and saunas with harbor skyline views.",
    coords: [60.1678, 24.9588],
  },
  {
    id: "esplanadi",
    name: "Esplanadi Park",
    category: "Outdoor",
    address: "Pohjoisesplanadi, Helsinki",
    blurb: "Central promenade for strolls, events, and cafes.",
    coords: [60.1673, 24.9466],
  },
  {
    id: "kallio",
    name: "Kallio District",
    category: "Neighborhood",
    address: "Kallio, Helsinki",
    blurb: "Lively district with independent bars and food spots.",
    coords: [60.1842, 24.9503],
  },
];

const searchInput = document.getElementById("searchInput");
const categoryChips = document.getElementById("categoryChips");
const locationList = document.getElementById("locationList");
const resultsCount = document.getElementById("resultsCount");

let activeCategory = "All";
let selectedLocationId = null;

const map = L.map("map", {
  zoomControl: false,
}).setView([60.1699, 24.9384], 12);

L.control.zoom({ position: "topright" }).addTo(map);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const markersById = new Map();

for (const location of locations) {
  const marker = L.marker(location.coords).addTo(map);
  marker.bindPopup(
    `<strong>${location.name}</strong><br>${location.category}<br>${location.address}`
  );
  markersById.set(location.id, marker);
}

const categories = ["All", ...new Set(locations.map((location) => location.category))];

function createCategoryChips() {
  categoryChips.innerHTML = "";

  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-chip";
    button.textContent = category;
    button.setAttribute("role", "tab");

    if (category === activeCategory) {
      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
    } else {
      button.setAttribute("aria-selected", "false");
    }

    button.addEventListener("click", () => {
      activeCategory = category;
      createCategoryChips();
      update();
    });

    categoryChips.appendChild(button);
  }
}

function filterLocations() {
  const searchValue = searchInput.value.trim().toLowerCase();

  return locations.filter((location) => {
    const matchesCategory =
      activeCategory === "All" || location.category === activeCategory;
    const matchesSearch =
      location.name.toLowerCase().includes(searchValue) ||
      location.address.toLowerCase().includes(searchValue) ||
      location.blurb.toLowerCase().includes(searchValue);

    return matchesCategory && matchesSearch;
  });
}

function focusLocation(locationId) {
  const location = locations.find((item) => item.id === locationId);

  if (!location) {
    return;
  }

  selectedLocationId = locationId;
  map.flyTo(location.coords, 14, { duration: 0.7 });
  markersById.get(locationId).openPopup();
  renderList(filterLocations());
}

function renderList(filtered) {
  locationList.innerHTML = "";
  resultsCount.textContent = `${filtered.length} shown`;

  if (!filtered.length) {
    locationList.innerHTML = `<p class="empty-state">No locations match this filter.</p>`;
    return;
  }

  for (const location of filtered) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "location-card";

    if (location.id === selectedLocationId) {
      card.classList.add("active");
    }

    card.innerHTML = `
      <h3>${location.name}</h3>
      <p class="meta">${location.address}</p>
      <p class="meta">${location.blurb}</p>
      <span class="tag">${location.category}</span>
    `;

    card.addEventListener("click", () => focusLocation(location.id));
    locationList.appendChild(card);
  }
}

function setMarkerVisibility(filtered) {
  const visibleIds = new Set(filtered.map((location) => location.id));

  for (const location of locations) {
    const marker = markersById.get(location.id);

    if (visibleIds.has(location.id)) {
      marker.addTo(map);
    } else {
      marker.remove();
    }
  }
}

function fitToResults(filtered) {
  if (!filtered.length) {
    map.setView([60.1699, 24.9384], 12);
    return;
  }

  if (filtered.length === 1) {
    map.setView(filtered[0].coords, 14);
    return;
  }

  const bounds = L.latLngBounds(filtered.map((location) => location.coords));
  map.fitBounds(bounds, { padding: [36, 36] });
}

function update() {
  const filtered = filterLocations();

  if (!filtered.some((location) => location.id === selectedLocationId)) {
    selectedLocationId = filtered[0]?.id ?? null;
  }

  renderList(filtered);
  setMarkerVisibility(filtered);
  fitToResults(filtered);
}

searchInput.addEventListener("input", () => update());
createCategoryChips();
update();
