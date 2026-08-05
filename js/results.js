(() => {
  const { loadGoogleMaps, MAP_STYLE, haversineKm, computeIsochrone } = window.FuturaMapsUtils;
  const PROJECTS = window.FUTURA_PROJECTS;
  const GAM_CENTER = { lat: 9.9333, lng: -84.0833 };

  const summaryEl = document.getElementById("profile-summary");
  const emptyStateEl = document.getElementById("empty-state");
  const mapSectionEl = document.getElementById("map-section");
  const listSectionEl = document.querySelector(".results-list-section");
  const mapEl = document.getElementById("results-map");
  const mapLoadingEl = document.getElementById("map-loading");
  const listEl = document.getElementById("project-list");

  const profile = loadProfile();

  if (!profile) {
    emptyStateEl.hidden = false;
    mapSectionEl.hidden = true;
    listSectionEl.hidden = true;
    return;
  }

  renderSummary(profile);

  // El listado no depende del mapa: se calcula y se muestra siempre,
  // aunque la API de Google Maps falle o esté deshabilitada.
  const scoredProjects = PROJECTS.map((project) => ({
    ...project,
    matchScore: computeMatchScore(project),
  })).sort((a, b) => b.matchScore - a.matchScore);
  renderProjectList(scoredProjects);

  let map;
  const infoWindow = () => new google.maps.InfoWindow();

  loadGoogleMaps("geometry")
    .then(() => initMap(scoredProjects))
    .catch(() => {
      mapLoadingEl.textContent = "No pudimos cargar el mapa en este momento.";
    });

  function loadProfile() {
    try {
      const raw = localStorage.getItem("futuraUserProfile");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function renderSummary(p) {
    const chips = [
      p.familySize ? p.familySize + " persona(s) en el núcleo familiar" : null,
      p.zone ? "Zona preferida: " + p.zone : null,
      p.income ? "Ingresos: " + p.income : null,
      p.budget ? "Presupuesto: " + p.budget : null,
    ].filter(Boolean);

    summaryEl.innerHTML = "";
    chips.forEach((text) => {
      const chip = document.createElement("span");
      chip.className = "summary-chip";
      chip.textContent = text;
      summaryEl.appendChild(chip);
    });
  }

  function initMap(scored) {
    map = new google.maps.Map(mapEl, {
      center: profile.zoneGeo ? { lat: profile.zoneGeo.lat, lng: profile.zoneGeo.lng } : GAM_CENTER,
      zoom: 12,
      styles: MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    });
    mapLoadingEl.remove();

    const bounds = new google.maps.LatLngBounds();

    if (profile.zoneGeo) {
      addDot(profile.zoneGeo.lat, profile.zoneGeo.lng, "#c9a15a", "Zona preferida: " + profile.zoneGeo.formattedAddress, 9);
      bounds.extend({ lat: profile.zoneGeo.lat, lng: profile.zoneGeo.lng });
    }

    geocodeSupportPin(profile.workLocations, "#4c74e0", "Trabajo", bounds);
    geocodeSupportPin(profile.schools, "#a24fd6", "Colegio", bounds);
    geocodeSupportPin(profile.activities, "#2fa88f", "Actividades", bounds);

    scored.forEach((project) => {
      bounds.extend(project.location);
      addProjectMarker(project);
      computeIsochrone(project.location, 20).then((path) => {
        if (!path) return;
        new google.maps.Polygon({
          paths: path,
          map,
          fillColor: "#3b66d6",
          fillOpacity: 0.12,
          strokeColor: "#3b66d6",
          strokeOpacity: 0.55,
          strokeWeight: 1.5,
        });
      });
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
  }

  function addDot(lat, lng, color, label, scale) {
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      title: label,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: scale || 7,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 5,
    });
    marker.addListener("click", () => {
      const iw = infoWindow();
      iw.setContent('<div style="font:600 13px Inter, sans-serif; color:#0b1220;">' + label + "</div>");
      iw.open(map, marker);
    });
    return marker;
  }

  function geocodeSupportPin(text, color, label, bounds) {
    if (!text) return;
    loadGoogleMaps("geometry").then(() => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: text + ", Costa Rica" }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          addDot(lat, lng, color, label + ": " + results[0].formatted_address, 7);
          bounds.extend({ lat, lng });
          if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
        }
        /* Si no se puede ubicar el texto, se omite el pin sin bloquear el mapa. */
      });
    });
  }

  function addProjectMarker(project) {
    const marker = new google.maps.Marker({
      position: project.location,
      map,
      title: project.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#0b1220",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
      zIndex: 10,
    });
    marker.addListener("click", () => {
      const iw = infoWindow();
      iw.setContent(
        '<div style="font-family: Inter, sans-serif; max-width:200px;">' +
          '<strong style="color:#0b1220;">' + project.name + "</strong><br/>" +
          '<span style="color:#5b6b8c; font-size:12.5px;">' + project.zone + "</span><br/>" +
          '<span style="color:#3b66d6; font-weight:700; font-size:13px;">Desde $' +
          project.priceFrom.toLocaleString("en-US") +
          '</span><br/><a href="' +
          window.FuturaBreadcrumb.withOrigin("proyecto.html?id=" + project.id, "resultados") +
          '" style="color:#3b66d6; font-size:12px;">Ver proyecto →</a></div>'
      );
      iw.open(map, marker);
    });
    project._marker = marker;
  }

  function computeMatchScore(project) {
    const ref = profile.zoneGeo ? { lat: profile.zoneGeo.lat, lng: profile.zoneGeo.lng } : GAM_CENTER;
    const distanceKm = haversineKm(ref.lat, ref.lng, project.location.lat, project.location.lng);
    const score = 96 - distanceKm * 2.2;
    return Math.max(45, Math.min(97, Math.round(score)));
  }

  function renderProjectList(scored) {
    listEl.innerHTML = "";
    scored.forEach((project, index) => {
      const card = window.FuturaProjectCard.render(project, {
        matchScore: project.matchScore,
        badge: index === 0 ? "Mejor match" : null,
        from: { from: "resultados" },
      });

      card.addEventListener("click", (e) => {
        if (e.target.closest(".project-card-link")) return;
        if (!map || !project._marker) return;
        map.panTo(project.location);
        map.setZoom(14);
        google.maps.event.trigger(project._marker, "click");
        document.getElementById("map-section").scrollIntoView({ behavior: "smooth", block: "start" });
      });

      listEl.appendChild(card);
    });
  }
})();
