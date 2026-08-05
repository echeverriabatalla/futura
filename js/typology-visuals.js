// Ilustraciones referenciales de tipología (planta e isométrico), generadas
// en SVG a partir de sus specs. Compartido entre proyecto.html y
// mi-cuenta/comparar.html — todavía no hay renders/planos reales.
window.FuturaTypologyVisuals = (() => {
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

  return { floorPlanSVG, isoSVG };
})();
