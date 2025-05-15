import axios from 'axios';
const last_values_url = "https://alerta.ina.gob.ar/geoserver/ows";
export async function fetchLastValues() {
    try {
        const response = await axios.get(last_values_url, {
            params: {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: 'public2:ultimas_alturas_con_timeseries',
                maxFeatures: '500',
                outputFormat: 'application/json'
            }
        });
        return response.data; // Use the parsed JSON
    }
    catch (err) {
        throw err;
    }
}
function detectWarning(valor, nivel_de_alerta, nivel_de_evacuacion) {
    if (valor == null) {
        return "no_data";
    }
    if (nivel_de_alerta != null && valor >= nivel_de_alerta) {
        if (nivel_de_evacuacion != null && valor >= nivel_de_evacuacion) {
            return "evacuacion";
        }
        else {
            return "alerta";
        }
    }
    else {
        return "ok";
    }
}
function getTrend(valor, valor_precedente) {
    if (valor == null || valor_precedente == null) {
        return "no_data";
    }
    return (valor > valor_precedente) ? "sube" : (valor < valor_precedente) ? "baja" : "igual";
}
function formatDecimal(value) {
    return value.toFixed(2).replace(/\./, ",");
}
export async function getLastValues(station_ids) {
    const data = await fetchLastValues();
    const rows = [];
    for (const feature of data.features) {
        if (station_ids.indexOf(feature.properties.unid) >= 0) {
            const tendencia = getTrend(feature.properties.valor, feature.properties.valor_precedente);
            const aviso = detectWarning(feature.properties.valor, feature.properties.nivel_de_alerta, feature.properties.nivel_de_evacuacion);
            rows.push({
                id: feature.properties.unid,
                estacion_nombre: feature.properties.nombre,
                rio: getRio(feature.properties.rio),
                valor: formatDecimal(feature.properties.valor),
                tendencia: trend_icon_mapping[tendencia],
                alerta: formatDecimal(feature.properties.nivel_de_alerta),
                evacuacion: formatDecimal(feature.properties.nivel_de_evacuacion),
                perspectiva: feature.properties.perspectiva, // undefined
                aviso: warning_icon_mapping[aviso],
                status_color: getStatusColor(feature.properties.percentil)
            });
        }
    }
    rows.sort((a, b) => {
        return station_ids.indexOf(a.id) - station_ids.indexOf(b.id);
    });
    return rows;
}
function toTitleCase(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
function getRio(rio) {
    if (rio_mapping.hasOwnProperty(rio)) {
        return rio_mapping[rio];
    }
    else {
        return toTitleCase(rio);
    }
}
function getSynopSemanalUrl(current_date) {
    const date = new Date(current_date);
    const n_days = (date.getHours() < 12) ? 8 : 7;
    date.setDate(date.getDate() - n_days);
    const d = getYMDstrings(date);
    return `https://alerta.ina.gob.ar/ina/13-SYNOP/mapas_semanales_/${d.year}/${d.month}/pp_semanal_${d.year}${d.month}${d.day}_surf.png`;
}
function getYMDstrings(date) {
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return {
        year: year,
        month: month,
        day: day
    };
}
function getGfsUrl(current_date) {
    const fecha_emision = new Date(current_date);
    const dt_emision = (current_date.getHours() * 60 + current_date.getMinutes() >= 10 * 60 + 31) ? 0 : 1;
    fecha_emision.setDate(fecha_emision.getDate() - dt_emision);
    const fe = getYMDstrings(fecha_emision);
    return `https://alerta.ina.gob.ar/ina/34-GFS/mapas/suma/gfs.${fe.year}${fe.month}${fe.day}06.${fe.year}${fe.month}${fe.day}12.suma.png`;
}
export async function getValuesDiario(station_ids) {
    const tabla_hidro = await getLastValues(station_ids);
    const hidrogramas = [];
    for (const id of station_ids) {
        if (plot_mapping.hasOwnProperty(id)) {
            hidrogramas.push(plot_mapping[id]);
        }
    }
    const current_date = new Date();
    return {
        mapa_synop_semanal: getSynopSemanalUrl(current_date),
        texto_synop_semanal: defaults.texto_synop_semanal,
        mapa_suma_gfs: getGfsUrl(current_date),
        tabla_hidro: tabla_hidro,
        texto_hidro: defaults.texto_hidro,
        hidrogramas: hidrogramas,
        status_colors: statusColorsDict(),
        fecha_emision: current_date.toLocaleDateString('en-GB')
    };
}
const warning_icon_mapping = {
    "ok": '',
    "alerta": '<i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: yellow !important;"></i>',
    "evacuacion": '<i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: red !important;"></i>',
    "no_data": ''
};
const status_categories = {
    5: "aguas altas",
    25: "aguas medias altas",
    75: "aguas medias",
    95: "aguas medias bajas",
    100: "aguas bajas"
};
const status_colors = {
    5: "#6fa8dc",
    25: "#cfe2f3",
    75: "#fff2cc",
    95: "#f6b26b",
    100: "#ea9999"
};
export function statusColorsDict() {
    const status_colors_dict = {};
    const keys = Object.keys(status_categories).map(Number).sort((a, b) => a - b);
    for (const key of keys) {
        status_colors_dict[(status_categories[key].replace(/\s/g, "_"))] = status_colors[key];
    }
    return status_colors_dict;
}
export function getStatusColor(percentil) {
    if (percentil == null) {
        return "#ffffff";
    }
    const keys = Object.keys(status_categories).map(Number).sort((a, b) => a - b);
    for (const key of keys) {
        if (percentil <= key) {
            return status_colors[key];
        }
    }
    return "";
}
export function getStatusText(percentil) {
    if (percentil == null) {
        return "";
    }
    const keys = Object.keys(status_categories).map(Number).sort((a, b) => a - b);
    for (const key of keys) {
        if (percentil <= key) {
            return status_categories[key];
        }
    }
    return "";
}
export function getStatus(percentil) {
    const status_text = getStatusText(percentil);
    const color = getStatusColor(percentil);
    return `<div style="background-color: ${color}; width: 100%; height: 100%;">${status_text}</div>`;
}
const trend_icon_mapping = {
    "baja": '<i class="fa fa-arrow-down" aria-hidden="true"></i>',
    "sube": '<i class="fa fa-arrow-up" aria-hidden="true"></i>',
    "igual": '<i class="fas fa-equals"></i>',
    "no_data": '<i class="fa fa-times" aria-hidden="true"></i>'
};
const plot_mapping = {
    19: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/corrientes.png",
    20: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/barranqueras.png",
    23: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/goya.png",
    24: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/reconquista.png",
    26: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/la_paz.png",
    29: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/parana.png",
    30: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/santa_fe.png",
    34: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/rosario.png",
    65: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/san_javier.png",
    68: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/santo_tome.png",
    72: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/paso_de_los_libres.png",
    55: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/puerto_pilcomayo.png",
    57: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/puerto_formosa.png"
};
const rio_mapping = {
    PARANAMED: "Paraná",
    BARRANQUERAS: "Paraná",
    PARANAINF: "Paraná",
    SANJAVIER: "Paraná",
    VICTORIA: "Paraná/Delta",
    PARAGUAY: "Paraguay",
    URUGUAY: "Uruguay",
    PARANASUP: "Alto Paraná"
};
const defaults = {
    texto_synop_semanal: "Para lo que resta del día se esperan precipitaciones sobre aportes al Paraná en territorio argentino por margen derecha, así como sobre aportes al Bermejo y Pilcomayo. Para lo que resta de la semana, se esperan precipitaciones en gran parte de la cuenca, con acumulados mayores esperados sobre el tramo medio e inferior del Paraguay, sobre el tramo del Paraná en territorio argentino - paraguayo y sobre aportes al Salado Juramento y aportes por margen derecha al Paraná en territorio argentino.",
    texto_hidro: "En Guairá, la afluencia a Itaipú se observa oscilante en el límite de las aguas bajas/medias bajas. A corto plazo se prevé que se mantenga con aumento de punta hacia las aguas medias bajas y el nivel de base se sostenga estable en aguas bajas, en asociación a la amplitud observada en la erogación en Porto Primavera (incremento de punta). En Itaipú, la erogación se observó con descenso de base en aguas bajas, y todavía con punta en aguas medias bajas. La descarga del río Iguazú persiste con base en aguas bajas, en asociación al déficit prolongado. Se espera que continúe con base en aguas bajas y punta en aguas medias bajas, fuertemente regulado en una condición por debajo de lo normal. La afluencia a Yacyretá se observó con incremento de punta en aguas medias bajas, en respuesta al aumento del aporte de la cuenca propia, en asociación a las últimas lluvias registradas (abundantes). Asimismo, por este efecto persistirá con base estable o con leve ascenso, en aguas bajas, durante los próximos días (si bien es presumible que la amplitud disminuya). A su vez, la erogación se observó con punta en aguas medias bajas y leve aumento de base, con previsión a corto plazo de continuar con base estable y punta estable o en leve disminución. Aguas abajo, el río Paraná en el tramo Corrientes - Goya se observa con incremento ocasional de punta en aguas medias bajas, asociado a las lluvias ocurridas sobre el Paraná argentino - paraguayo y al efecto del aporte en ruta. A corto plazo se prevé que persista con la dinámica observada, para observarse luego disminución de punta, si bien con base en leve incremento (probablemente con aproximación a aguas medias bajas en Corrientes) por efecto del gradual aumento de caudal del río Paraguay y la erogación estable en Yacyretá. Por otro lado, sobre La Paz - Rosario se observa en aguas bajas, con gradual aumento en los valores semanales, más significativo en La Paz por propagación del patrón observado aguas arriba."
};
