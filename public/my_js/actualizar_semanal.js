function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value == null ? "" : String(value);
    }
}

function setAttribute(id, attribute, value) {
    const element = document.getElementById(id);
    if (element) {
        element.setAttribute(attribute, value == null ? "" : String(value));
    }
}

function appendCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value == null ? "" : String(value);
    row.appendChild(cell);
}

function renderWeeklyRows(rows, element_id) {
    const body = document.getElementById(element_id);
    if (!body) return;

    const fragment = document.createDocumentFragment();
    for (const station of rows || []) {
        const row = document.createElement("tr");
        const attributes = {
            id: station.estacion_id,
            series_id: station.series_id,
            x: station.x,
            y: station.y,
            status_color: station.status_color,
            status_text: station.status_text,
            percentil: station.percentil,
            tendencia: station.tendencia_text || station.tendencia,
            aviso: station.aviso_text
        };
        for (const [name, value] of Object.entries(attributes)) {
            row.setAttribute(`data-${name}`, value == null ? "" : String(value));
        }

        const stationCell = document.createElement("td");
        const stationLink = document.createElement("div");
        stationLink.className = "as-link";
        stationLink.style.cursor = "pointer";
        stationLink.setAttribute("data-bs-toggle", "modal");
        stationLink.setAttribute("data-bs-target", "#hidrolinksModal");
        stationLink.setAttribute("data-title", station.estacion_nombre || "");
        stationLink.setAttribute("data-id", station.estacion_id == null ? "" : String(station.estacion_id));
        stationLink.setAttribute("data-seccionesurl", station.secciones_url || "");
        stationLink.textContent = station.estacion_nombre || "";
        stationCell.appendChild(stationLink);
        row.appendChild(stationCell);

        appendCell(row, station.obs && station.obs.min);
        appendCell(row, station.obs && station.obs.max);
        appendCell(row, station.obs && station.obs.mean);
        const forecastMin = station.prono && station.prono.min;
        const forecastMax = station.prono && station.prono.max;
        appendCell(row, `[${forecastMin == null ? "" : forecastMin} - ${forecastMax == null ? "" : forecastMax}]`);
        appendCell(row, station.tendencia);
        appendCell(row, "");
        fragment.appendChild(row);
    }

    body.replaceChildren(fragment);
}

async function actualizarReporteSemanal() {
    document.body.style.cursor = "wait"
    try {
        const response = await fetch("/api/template_semanal", { cache: "no-store" });
        document.body.style.cursor = "default"
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const values = await response.json();
        setText("fecha-emision", values.fecha_emision);
        setAttribute("pdf-link", "href", values.pdf_url);
        setAttribute("mapa-anomalia", "src", values.mapa_anomalia);
        setAttribute("mapa-suma-gfs", "src", values.mapa_suma_gfs);
        if(values.hidro) {
            for(const [key, region] of Object.entries(values.hidro)) {
                setText(`hidro-${key}-nombre`, region.nombre);
                setText(`hidro-${key}-condicion`, region.condicion);
                if(region.tabla) {
                    renderWeeklyRows(region.tabla, `tabla-caudales-body-${key}`);
                }
                if(region.tabla_altura) {
                    renderWeeklyRows(region.tabla_altura, `tabla-alturas-body-${key}`);
                }
            }
        }
        setText("proxima-fecha", values.proxima_fecha);
    } catch (error) {
        document.body.style.cursor = "default"
        alert("No se pudo actualizar el reporte semanal:", error);
    }
}

// actualizarReporteSemanal();
