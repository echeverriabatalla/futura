(() => {
  const PROJECTS = window.FUTURA_PROJECTS;
  const { floorPlanSVG } = window.FuturaTypologyVisuals;
  const MAX_COMPARE = 4;
  const DEFAULT_HINT = "Marcá el check de hasta " + MAX_COMPARE + " para compararlas abajo.";

  const emailEl = document.getElementById("account-email");
  const signinBtn = document.getElementById("account-signin-btn");
  const signoutBtn = document.getElementById("account-signout-btn");
  const signedOutSection = document.getElementById("account-signed-out");
  const signedOutBtn = document.getElementById("account-signed-out-btn");
  const noSavedSection = document.getElementById("account-no-saved");
  const savedSection = document.getElementById("saved-section");
  const savedGrid = document.getElementById("saved-grid");
  const compareSection = document.getElementById("compare-section");
  const compareBody = document.getElementById("compare-inline-body");
  const selectHint = document.getElementById("saved-select-hint");

  const selected = new Map();

  window.FuturaBreadcrumb.render({
    container: document.getElementById("breadcrumb-slot"),
    basePrefix: "../",
    currentLabel: "Mis tipologías",
    fallback: { href: "../resultados.html", label: "Resultados" },
  });

  signinBtn.addEventListener("click", () => window.FuturaAuthModal.open(loadPage));
  signedOutBtn.addEventListener("click", () => window.FuturaAuthModal.open(loadPage));
  signoutBtn.addEventListener("click", () => {
    window.FuturaAuth.signOut().then(loadPage).catch(loadPage);
  });

  loadPage();

  function loadPage() {
    window.FuturaAuth.getSession()
      .then((session) => {
        if (!session) {
          showSignedOut();
          return;
        }
        showSignedIn(session);
        window.FuturaAuth.listSaved()
          .then(renderSaved)
          .catch(() => renderSaved([]));
      })
      .catch(() => showSignedOut());
  }

  function showSignedOut() {
    emailEl.hidden = true;
    signinBtn.hidden = false;
    signoutBtn.hidden = true;
    signedOutSection.hidden = false;
    noSavedSection.hidden = true;
    savedSection.hidden = true;
    compareSection.hidden = true;
  }

  function showSignedIn(session) {
    emailEl.textContent = session.user.email;
    emailEl.hidden = false;
    signinBtn.hidden = true;
    signoutBtn.hidden = false;
    signedOutSection.hidden = true;
  }

  function enrich(row) {
    const project = PROJECTS.find((p) => p.id === row.project_id);
    if (!project) return null;
    const typology = project.typologies.find((t) => t.id === row.typology_id);
    if (!typology) return null;
    return { rowId: row.id, project, typology };
  }

  function renderSaved(rows) {
    const items = rows.map(enrich).filter(Boolean);
    selected.clear();

    if (items.length === 0) {
      noSavedSection.hidden = false;
      savedSection.hidden = true;
      compareSection.hidden = true;
      return;
    }

    noSavedSection.hidden = true;
    savedSection.hidden = false;
    selectHint.textContent = DEFAULT_HINT;

    savedGrid.innerHTML = "";
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "saved-card";
      card.innerHTML =
        '<div class="saved-card-image">' + floorPlanSVG(item.typology) + "</div>" +
        '<div class="saved-card-body">' +
        '<span class="saved-card-project">' + item.project.name + " · " + item.project.developer.name + "</span>" +
        "<h3>" + item.typology.name + "</h3>" +
        '<div class="typology-specs">' +
        "<span>" + item.typology.sqm + " m²</span>" +
        "<span>" + item.typology.bedrooms + " hab.</span>" +
        "<span>" + item.typology.bathrooms + " baños</span>" +
        "</div>" +
        '<span class="saved-card-price">Desde $' + item.project.priceFrom.toLocaleString("en-US") + "</span>" +
        '<a class="project-card-link" href="' +
        window.FuturaBreadcrumb.withOrigin("../proyecto.html?id=" + item.project.id, "cuenta") +
        '">Ver proyecto →</a>' +
        '<div class="saved-card-actions">' +
        '<label class="saved-card-check"><input type="checkbox" /> Comparar</label>' +
        '<button type="button" class="saved-card-remove">Eliminar</button>' +
        "</div></div>";

      card.querySelector('input[type="checkbox"]').addEventListener("change", (e) => toggleSelect(item, e.target));
      card.querySelector(".saved-card-remove").addEventListener("click", () => removeItem(item));

      savedGrid.appendChild(card);
    });

    updateCompareView();
  }

  function removeItem(item) {
    window.FuturaAuth.removeById(item.rowId)
      .then(() => window.FuturaAuth.listSaved().then(renderSaved))
      .catch(() => {
        /* si falla el borrado, la tarjeta se queda como estaba */
      });
  }

  function toggleSelect(item, checkbox) {
    if (checkbox.checked) {
      if (selected.size >= MAX_COMPARE) {
        checkbox.checked = false;
        selectHint.textContent = "Ya elegiste el máximo de " + MAX_COMPARE + " para comparar. Desmarcá alguna primero.";
        return;
      }
      selected.set(item.rowId, item);
      selectHint.textContent = DEFAULT_HINT;
    } else {
      selected.delete(item.rowId);
      selectHint.textContent = DEFAULT_HINT;
    }
    updateCompareView();
  }

  function updateCompareView() {
    if (selected.size === 0) {
      compareSection.hidden = true;
      return;
    }
    compareSection.hidden = false;
    compareBody.innerHTML = "";
    selected.forEach((item) => {
      const col = document.createElement("div");
      col.className = "compare-col";
      col.innerHTML =
        '<div class="compare-col-image">' + floorPlanSVG(item.typology) + "</div>" +
        "<h4>" + item.typology.name + "</h4>" +
        '<p class="compare-col-project">' + item.project.name + "</p>" +
        '<dl class="compare-specs">' +
        "<dt>Área</dt><dd>" + item.typology.sqm + " m²</dd>" +
        "<dt>Habitaciones</dt><dd>" + item.typology.bedrooms + "</dd>" +
        "<dt>Baños</dt><dd>" + item.typology.bathrooms + "</dd>" +
        "<dt>Precio desde</dt><dd>$" + item.project.priceFrom.toLocaleString("en-US") + "</dd>" +
        "</dl>";
      compareBody.appendChild(col);
    });
  }
})();
