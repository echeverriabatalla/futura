(() => {
  // Restrict this key by HTTP referrer in Google Cloud Console. Requires
  // "Maps JavaScript API", "Geocoding API" and "Distance Matrix API" enabled.
  const GOOGLE_MAPS_API_KEY = "AIzaSyCp6hfATMHB75MEv_werB1IV5yNUjTu1vM";
  const ISOCHRONE_MINUTES = 20;
  const GAM_CENTER = { lat: 9.9333, lng: -84.0833 };

  // Proyectos de muestra (datos falsos) para esta versión preliminar.
  const PROJECTS = [
    {
      id: "vista-alta-escazu",
      name: "Vista Alta Escazú",
      zone: "Escazú, San José",
      location: { lat: 9.9189, lng: -84.1439 },
      priceFrom: 185000,
      bedrooms: "2–3 hab.",
      delivery: "2027",
      amenities: ["Piscina", "Gimnasio", "Coworking", "Seguridad 24/7"],
    },
    {
      id: "bosques-santa-ana",
      name: "Bosques de Santa Ana",
      zone: "Santa Ana, San José",
      location: { lat: 9.9281, lng: -84.183 },
      priceFrom: 265000,
      bedrooms: "3–4 hab.",
      delivery: "2026",
      amenities: ["Áreas verdes", "Piscina", "Salón de eventos", "Cancha multiuso"],
    },
    {
      id: "terrazas-curridabat",
      name: "Terrazas Curridabat",
      zone: "Curridabat, San José",
      location: { lat: 9.9167, lng: -84.0333 },
      priceFrom: 210000,
      bedrooms: "2 hab.",
      delivery: "2027",
      amenities: ["Rooftop", "Gimnasio", "Pet-friendly", "Coworking"],
    },
    {
      id: "alto-heredia",
      name: "Alto Heredia",
      zone: "Heredia centro",
      location: { lat: 10.0, lng: -84.1165 },
      priceFrom: 195000,
      bedrooms: "3 hab.",
      delivery: "2026",
      amenities: ["Piscina", "Parque infantil", "Seguridad 24/7"],
    },
    {
      id: "cerro-verde",
      name: "Cerro Verde Concepción",
      zone: "San Rafael de Escazú",
      location: { lat: 9.937, lng: -84.152 },
      priceFrom: 340000,
      bedrooms: "4 hab.",
      delivery: "2028",
      amenities: ["Club house", "Piscina infinita", "Gimnasio", "Senderos naturales"],
    },
  ];

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

  loadGoogleMaps()
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

  function loadGoogleMaps() {
    if (window.google && window.google.maps) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const callbackName = "__futuraResultsMapsReady";
      window[callbackName] = () => resolve();
      const script = document.createElement("script");
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        GOOGLE_MAPS_API_KEY +
        "&libraries=geometry&callback=" +
        callbackName;
      script.async = true;
      script.defer = true;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#eef1f8" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#5b6b8c" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#c6cfe3" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f3f5fb" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d9e0f2" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d6ee" }] },
  ];

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
      computeIsochrone(project).then((path) => {
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
    loadGoogleMaps().then(() => {
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
          "</span></div>"
      );
      iw.open(map, marker);
    });
    project._marker = marker;
  }

  // Distancia en línea recta (fórmula de Haversine) — no depende de la API
  // de Google, así el match score y el listado funcionan incluso sin mapa.
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function computeMatchScore(project) {
    const ref = profile.zoneGeo ? { lat: profile.zoneGeo.lat, lng: profile.zoneGeo.lng } : GAM_CENTER;
    const distanceKm = haversineKm(ref.lat, ref.lng, project.location.lat, project.location.lng);
    const score = 96 - distanceKm * 2.2;
    return Math.max(45, Math.min(97, Math.round(score)));
  }

  // Aproxima la isócrona de 20 min: muestrea tiempos de viaje en 8 direcciones
  // con la Distance Matrix API y estima, por interpolación, el punto de cada
  // rayo donde el tiempo cruza los 20 minutos.
  function computeIsochrone(project) {
    return loadGoogleMaps().then(
      () =>
        new Promise((resolve) => {
          const origin = new google.maps.LatLng(project.location.lat, project.location.lng);
          const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
          const sampleDistancesM = [5000, 10000, 16000];

          const destinations = [];
          bearings.forEach((bearing) => {
            sampleDistancesM.forEach((dist) => {
              destinations.push(google.maps.geometry.spherical.computeOffset(origin, dist, bearing));
            });
          });

          const service = new google.maps.DistanceMatrixService();
          service.getDistanceMatrix(
            {
              origins: [origin],
              destinations,
              travelMode: "DRIVING",
            },
            (response, status) => {
              if (status !== "OK" || !response || !response.rows || !response.rows[0]) {
                resolve(null);
                return;
              }
              const elements = response.rows[0].elements;
              const targetSeconds = ISOCHRONE_MINUTES * 60;
              const polygonPoints = [];

              bearings.forEach((bearing, bIdx) => {
                const rayElements = sampleDistancesM.map((_, dIdx) => elements[bIdx * sampleDistancesM.length + dIdx]);
                let boundaryDistance = sampleDistancesM[0];

                for (let i = 0; i < rayElements.length; i++) {
                  const el = rayElements[i];
                  if (!el || el.status !== "OK") continue;
                  const duration = el.duration.value;

                  if (duration >= targetSeconds) {
                    if (i === 0) {
                      boundaryDistance = sampleDistancesM[0];
                    } else {
                      const prevEl = rayElements[i - 1];
                      const prevDuration = prevEl && prevEl.status === "OK" ? prevEl.duration.value : 0;
                      const prevDist = sampleDistancesM[i - 1];
                      const dist = sampleDistancesM[i];
                      const ratio = (targetSeconds - prevDuration) / (duration - prevDuration || 1);
                      boundaryDistance = prevDist + ratio * (dist - prevDist);
                    }
                    break;
                  }
                  boundaryDistance = sampleDistancesM[i];
                }

                polygonPoints.push(google.maps.geometry.spherical.computeOffset(origin, boundaryDistance, bearing));
              });

              resolve(polygonPoints);
            }
          );
        })
    ).catch(() => null);
  }

  function renderProjectList(scored) {
    listEl.innerHTML = "";
    scored.forEach((project, index) => {
      const card = document.createElement("article");
      card.className = "project-card";

      const badge = index === 0 ? '<span class="project-badge">Mejor match</span>' : "";

      card.innerHTML =
        '<div class="project-card-top">' +
        badge +
        '<span class="project-match">' +
        project.matchScore +
        "% match</span>" +
        "</div>" +
        "<h3>" +
        project.name +
        "</h3>" +
        '<p class="project-zone">' +
        project.zone +
        "</p>" +
        '<p class="project-price">Desde $' +
        project.priceFrom.toLocaleString("en-US") +
        "</p>" +
        '<div class="project-meta">' +
        "<span>" +
        project.bedrooms +
        "</span><span>Entrega " +
        project.delivery +
        "</span>" +
        "</div>" +
        '<div class="project-amenities">' +
        project.amenities.map((a) => '<span class="project-amenity">' + a + "</span>").join("") +
        "</div>";

      card.addEventListener("click", () => {
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
