(() => {
  const { loadGoogleMaps, MAP_STYLE, computeIsochrone } = window.FuturaMapsUtils;
  const PROJECTS = window.FUTURA_PROJECTS;

  const POI_CATEGORIES = [
    { key: "supermarket", label: "Supermercados", color: "#4c74e0", placeType: "supermarket" },
    { key: "school", label: "Escuelas", color: "#a24fd6", placeType: "school" },
    { key: "park", label: "Parques", color: "#2fa88f", placeType: "park" },
    { key: "gym", label: "Gimnasios", color: "#e0954c", placeType: "gym" },
  ];

  const mainEl = document.getElementById("project-main");
  const emptyStateEl = document.getElementById("project-empty-state");

  const project = findProject();

  if (!project) {
    emptyStateEl.hidden = false;
    mainEl.hidden = true;
    document.title = "Proyecto no encontrado — FUTURA";
    return;
  }

  mainEl.hidden = false;
  document.title = project.name + " — FUTURA";

  renderHeader(project);
  renderTitleBar(project);
  renderTypologies(project);
  renderAmenities(project);
  initMap(project);

  function findProject() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return PROJECTS.find((p) => p.id === id) || null;
  }

  function renderHeader(p) {
    const devLink = document.getElementById("dev-logo-link");
    const devText = document.getElementById("dev-logo-text");
    devText.textContent = p.developer.name;
    // La página propia de cada desarrolladora (listado de proyectos y
    // trayectoria) es una funcionalidad futura; el link ya queda listo.
    devLink.href = "desarrolladora.html?dev=" + p.developer.slug;
  }

  function renderTitleBar(p) {
    document.getElementById("project-name").textContent = p.name;
    document.getElementById("project-zone").textContent = p.zone;
    document.getElementById("project-price").textContent = "Desde $" + p.priceFrom.toLocaleString("en-US");
    document.getElementById("project-delivery").textContent = "Entrega " + p.delivery;
  }

  function renderAmenities(p) {
    const grid = document.getElementById("amenities-grid");
    grid.innerHTML = "";
    p.amenities.forEach((a) => {
      const card = document.createElement("div");
      card.className = "amenity-card";
      card.innerHTML = '<span class="amenity-dot"></span><span>' + a + "</span>";
      grid.appendChild(card);
    });
  }

  function renderTypologies(p) {
    const grid = document.getElementById("typology-grid");
    grid.innerHTML = "";
    p.typologies.forEach((t) => {
      const card = document.createElement("article");
      card.className = "typology-card";
      card.innerHTML =
        '<div class="typology-view">' +
        '<div class="typology-image is-active" data-view="plan">' + floorPlanSVG(t) + "</div>" +
        '<div class="typology-image" data-view="iso">' + isoSVG(t) + "</div>" +
        "</div>" +
        '<div class="typology-toggle" role="tablist">' +
        '<button type="button" class="typology-toggle-btn is-active" data-view="plan">Planta</button>' +
        '<button type="button" class="typology-toggle-btn" data-view="iso">Isométrico 3D</button>' +
        "</div>" +
        '<div class="typology-info">' +
        "<h3>" + t.name + "</h3>" +
        '<div class="typology-specs">' +
        '<span>' + t.sqm + " m²</span>" +
        '<span>' + t.bedrooms + " hab.</span>" +
        '<span>' + t.bathrooms + " baños</span>" +
        "</div></div>";

      const toggleBtns = card.querySelectorAll(".typology-toggle-btn");
      const views = card.querySelectorAll(".typology-image");
      toggleBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          toggleBtns.forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          views.forEach((v) => v.classList.toggle("is-active", v.dataset.view === btn.dataset.view));
        });
      });

      grid.appendChild(card);
    });
  }

  function floorPlanSVG(t) {
    const w = 320,
      h = 210;
    const livingH = 82;
    const bottomH = h - livingH;
    const bedroomCount = Math.max(1, Math.round(t.bedrooms));
    const bathCount = Math.max(1, Math.ceil(t.bathrooms));
    const cols = bedroomCount + bathCount;
    const colW = w / cols;

    let cells = "";
    for (let i = 0; i < bedroomCount; i++) {
      const x = i * colW;
      cells +=
        '<rect x="' + x + '" y="' + livingH + '" width="' + colW + '" height="' + bottomH +
        '" fill="none" stroke="#c6cfe3" stroke-width="1.5"/>' +
        '<text x="' + (x + colW / 2) + '" y="' + (livingH + bottomH / 2) +
        '" text-anchor="middle" font-size="10" fill="#5b6b8c" font-family="Inter, sans-serif">Hab.</text>';
    }
    for (let i = 0; i < bathCount; i++) {
      const x = (bedroomCount + i) * colW;
      cells +=
        '<rect x="' + x + '" y="' + livingH + '" width="' + colW + '" height="' + bottomH +
        '" fill="#eef1f8" stroke="#c6cfe3" stroke-width="1.5"/>' +
        '<text x="' + (x + colW / 2) + '" y="' + (livingH + bottomH / 2) +
        '" text-anchor="middle" font-size="9.5" fill="#5b6b8c" font-family="Inter, sans-serif">Baño</text>';
    }

    return (
      '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Planta arquitectónica referencial">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#ffffff"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + livingH + '" fill="none" stroke="#0b1220" stroke-width="2"/>' +
      '<text x="14" y="' + livingH / 2 + '" font-size="12" fill="#0b1220" font-weight="700" font-family="Inter, sans-serif">Sala / Cocina</text>' +
      cells +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="none" stroke="#0b1220" stroke-width="2"/>' +
      "</svg>"
    );
  }

  function isoSVG(t) {
    const height = 40 + Math.min(60, t.sqm / 4);
    const topY = 90 - height;
    return (
      '<svg viewBox="0 0 320 210" role="img" aria-label="Vista isométrica referencial">' +
      '<polygon points="160,' + (topY - 30) + " 260," + (topY + 20) + " 160," + (topY + 70) + " 60," + (topY + 20) +
      '" fill="#d8b878" stroke="#0b1220" stroke-width="2"/>' +
      '<polygon points="60,' + (topY + 20) + " 160," + (topY + 70) + " 160," + 150 + " 60," + 100 +
      '" fill="#16233f" stroke="#0b1220" stroke-width="2"/>' +
      '<polygon points="260,' + (topY + 20) + " 160," + (topY + 70) + " 160," + 150 + " 260," + 100 +
      '" fill="#1f3358" stroke="#0b1220" stroke-width="2"/>' +
      '<rect x="90" y="' + (topY + 55) + '" width="18" height="18" fill="#c9a15a" opacity="0.9"/>' +
      '<rect x="120" y="' + (topY + 65) + '" width="18" height="18" fill="#c9a15a" opacity="0.9"/>' +
      '<rect x="182" y="' + (topY + 65) + '" width="18" height="18" fill="#c9a15a" opacity="0.9"/>' +
      '<rect x="212" y="' + (topY + 55) + '" width="18" height="18" fill="#c9a15a" opacity="0.9"/>' +
      "</svg>"
    );
  }

  function renderPoiFilters() {
    const wrap = document.getElementById("poi-filters");
    wrap.innerHTML = "";
    POI_CATEGORIES.forEach((cat) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "poi-chip is-active";
      chip.dataset.key = cat.key;
      chip.innerHTML = '<i class="poi-chip-dot" style="background:' + cat.color + '"></i>' + cat.label;
      chip.addEventListener("click", () => {
        chip.classList.toggle("is-active");
        const visible = chip.classList.contains("is-active");
        (cat.markers || []).forEach((m) => m.setMap(visible ? cat._map : null));
      });
      wrap.appendChild(chip);
    });
  }

  function initMap(p) {
    renderPoiFilters();
    const mapEl = document.getElementById("project-map");
    const loadingEl = document.getElementById("project-map-loading");

    loadGoogleMaps("geometry,places")
      .then(() => {
        const map = new google.maps.Map(mapEl, {
          center: p.location,
          zoom: 14,
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
        });
        loadingEl.remove();

        new google.maps.Marker({
          position: p.location,
          map,
          title: p.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: "#0b1220",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 10,
        });

        computeIsochrone(p.location, 20).then((path) => {
          if (!path) return;
          const polygon = new google.maps.Polygon({
            paths: path,
            map,
            fillColor: "#3b66d6",
            fillOpacity: 0.1,
            strokeColor: "#3b66d6",
            strokeOpacity: 0.55,
            strokeWeight: 1.5,
          });
          map.fitBounds(polygon.getBounds(), 40);
          loadPois(map, p.location, polygon);
        });
      })
      .catch(() => {
        loadingEl.textContent = "No pudimos cargar el mapa en este momento.";
      });
  }

  function loadPois(map, location, isochronePolygon) {
    const service = new google.maps.places.PlacesService(map);

    POI_CATEGORIES.forEach((cat) => {
      cat._map = map;
      cat.markers = [];
      service.nearbySearch(
        {
          location,
          radius: 15000,
          type: cat.placeType,
        },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;
          results.forEach((place) => {
            if (!place.geometry || !place.geometry.location) return;
            if (!google.maps.geometry.poly.containsLocation(place.geometry.location, isochronePolygon)) return;

            const marker = new google.maps.Marker({
              position: place.geometry.location,
              map,
              title: place.name,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: cat.color,
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
              },
              zIndex: 4,
            });
            const iw = new google.maps.InfoWindow({
              content:
                '<div style="font-family: Inter, sans-serif; font-size:12.5px; color:#0b1220; max-width:180px;"><strong>' +
                place.name +
                "</strong><br/>" +
                (place.vicinity || "") +
                "</div>",
            });
            marker.addListener("click", () => iw.open(map, marker));
            cat.markers.push(marker);
          });
        }
      );
    });
  }
})();
