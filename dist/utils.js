import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs/promises';
export async function loadConfig(config_file = path.join(__dirname, '../config/default.json')) {
    const config_raw = await fs.readFile(config_file, 'utf-8');
    return JSON.parse(config_raw);
}
export async function getFeature(url, layer_name) {
    return axios.get(url, {
        params: {
            service: 'WFS',
            version: '1.0.0',
            request: 'GetFeature',
            typeName: layer_name,
            maxFeatures: '500',
            outputFormat: 'application/json'
        }
        // ,
        // auth: {
        //     username: username,
        //     password: password
        // }
    });
}
export async function fetchLastValues(var_id = 2) {
    const config = await loadConfig();
    if (Object.keys(var_layer_map).indexOf(var_id.toString()) < 0) {
        throw new Error("Invalid var_id");
    }
    const layer_name = var_layer_map[var_id];
    try {
        const response = await getFeature(config.geoserver.url, layer_name); //, config.geoserver.username, config.geoserver.password)
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
function getTrend(valor, valor_precedente, var_id) {
    if (valor == null || valor_precedente == null) {
        return ["no_data", ""];
    }
    const diferencia = Math.round((valor - valor_precedente) * 100) / 100;
    const [tendencia_text, clases] = (diferencia > 0) ? ["sube", trend_icon_mapping["sube"]] : (diferencia < 0) ? ["baja", trend_icon_mapping["baja"]] : ["igual", trend_icon_mapping["igual"]];
    const unidades = (var_id == 2) ? "m" : "m&#179/s";
    return [
        tendencia_text,
        `<i class="${clases}" aria-hidden="true" title="diferencia con el registro anterior: ${diferencia.toString()} ${unidades}"></i>`
    ];
}
function formatDecimal(value, places = 2) {
    if (value == null) {
        return "";
    }
    return value.toFixed(places).replace(/\./, ",");
}
export async function getLastValues(station_ids, var_id = 2) {
    const data = await fetchLastValues(var_id);
    const decimal_places = (var_id == 2) ? 2 : 0;
    const rows = [];
    for (const feature of data.features) {
        if (station_ids.indexOf(feature.properties.unid) >= 0) {
            const [tendencia_text, tendencia_icon] = getTrend(feature.properties.valor, feature.properties.valor_precedente, var_id);
            const aviso = detectWarning(feature.properties.valor, feature.properties.nivel_de_alerta, feature.properties.nivel_de_evacuacion);
            rows.push({
                id: feature.properties.unid,
                estacion_nombre: feature.properties.nombre,
                rio: getRio(feature.properties.rio),
                valor: formatDecimal(feature.properties.valor, decimal_places),
                tendencia: tendencia_icon,
                alerta: formatDecimal(feature.properties.nivel_de_alerta, decimal_places),
                evacuacion: formatDecimal(feature.properties.nivel_de_evacuacion, decimal_places),
                perspectiva: feature.properties.perspectiva, // undefined
                aviso: warning_icon_mapping[aviso],
                status_color: getStatusColor(feature.properties.percentil),
                series_id: feature.properties.series_id,
                secciones_url: getSeccionesUrl(feature.properties.series_id),
                x: feature.geometry.coordinates[0],
                y: feature.geometry.coordinates[1],
                status_text: getStatusText(feature.properties.percentil),
                percentil: feature.properties.percentil,
                tendencia_text: tendencia_text,
                aviso_text: aviso
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
    else if (rio != null) {
        return toTitleCase(rio);
    }
    else {
        return "";
    }
}
function getSynopSemanalUrl(current_date) {
    const date = new Date(current_date);
    const n_days = (date.getHours() < 12) ? 8 : 7;
    date.setDate(date.getDate() - n_days);
    const d = getYMDstrings(date);
    return `https://alerta.ina.gob.ar/ina/13-SYNOP/mapas_semanales_/${d.year}/${d.month}/pp_semanal_${d.year}${d.month}${d.day}_surf.png`;
}
export function getYMDstrings(date) {
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
    return `https://alerta.ina.gob.ar/ina/34-GFS/mapas/suma/gfs.${fe.year}${fe.month}${fe.day}06.${fe.year}${fe.month}${fe.day}12.suma.mask.png`;
}
function getMapaCaudalesUrl(current_date) {
    const fecha_emision = new Date(current_date);
    const dt_emision = (current_date.getHours() * 60 + current_date.getMinutes() >= 12 * 60 + 2) ? 0 : 1;
    fecha_emision.setDate(fecha_emision.getDate() - dt_emision);
    const fe = getYMDstrings(fecha_emision);
    return `https://alerta.ina.gob.ar/ina/mapa_informe_diario/mapa_estado_${fe.year}-${fe.month}-${fe.day}.png`;
}
function getPdfUrl(current_date, pdf_dir = "http://localhost:3000/pdf" // "https://alerta.ina.gob.ar/ina/06-INFORMES/diario/pdf"
) {
    const fe = getYMDstrings(current_date);
    return `${pdf_dir}/reporte_diario_${fe.year}-${fe.month}-${fe.day}.pdf`;
}
function getSeccionesUrl(series_id) {
    return `https://alerta.ina.gob.ar/a5/secciones?seriesId=${series_id}`;
}
export async function getValuesDiario(station_ids, station_ids_caudal) {
    const config = await loadConfig();
    const [tabla_hidro, tabla_caudales] = await Promise.all([getLastValues(station_ids, 2), getLastValues(station_ids_caudal, 4)]);
    const hidrogramas = [];
    for (const id of station_ids) {
        if (plot_mapping.hasOwnProperty(id)) {
            hidrogramas.push({
                id: id,
                name: plot_mapping[id].name,
                src: plot_mapping[id].src,
                river: plot_mapping[id].river
            });
        }
    }
    const current_date = new Date();
    return {
        mapa_synop_semanal: getSynopSemanalUrl(current_date),
        texto_synop_semanal: defaults.texto_synop_semanal,
        mapa_suma_gfs: getGfsUrl(current_date),
        tabla_hidro: tabla_hidro,
        tabla_caudales: tabla_caudales,
        texto_hidro: defaults.texto_hidro,
        hidrogramas: hidrogramas,
        status_colors: statusColorsDict(),
        fecha_emision: current_date.toLocaleDateString('en-GB'),
        mapa_caudales: getMapaCaudalesUrl(current_date),
        pdf_url: getPdfUrl(current_date, config.pdf_dir)
    };
}
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
const var_layer_map = {
    2: 'siyah:ultimas_alturas_con_timeseries',
    4: "siyah:ultimos_caudales_con_timeseries"
};
const warning_icon_mapping = {
    "ok": '',
    "alerta": '<i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: yellow !important;"></i>',
    "evacuacion": '<i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: red !important;"></i>',
    "no_data": ''
};
// MAPS
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
const trend_icon_mapping = {
    "baja": 'fa fa-arrow-down',
    "sube": 'fa fa-arrow-up',
    "igual": 'fas fa-equals',
    "no_data": 'fa fa-times'
    // "baja": '<i class="fa fa-arrow-down" aria-hidden="true"></i>',
    // "sube": '<i class="fa fa-arrow-up" aria-hidden="true"></i>',
    // "igual": '<i class="fas fa-equals"></i>',
    // "no_data": '<i class="fa fa-times" aria-hidden="true"></i>'
};
const plot_mapping = {
    19: { name: "Corrientes", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/corrientes.png", river: "Paraná" },
    20: { name: "Barranqueras", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/barranqueras.png", river: "Paraná" },
    23: { name: "Goya", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/goya.png", river: "Paraná" },
    24: { name: "Reconquista", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/reconquista.png", river: "Paraná" },
    26: { name: "La Paz", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/la_paz.png", river: "Paraná" },
    29: { name: "Paraná", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/parana.png", river: "Paraná" },
    30: { name: "Santa Fe", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/santa_fe.png", river: "Paraná" },
    34: { name: "Rosario", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/rosario.png", river: "Paraná" },
    65: { name: "San Javier", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/san_javier.png", river: "Uruguay" },
    68: { name: "Santo Tomé", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/santo_tome.png", river: "Uruguay" },
    72: { name: "Paso de los Libres", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/paso_de_los_libres.png", river: "Uruguay" },
    55: { name: "Puerto Pilcomayo", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/puerto_pilcomayo.png", river: "Paraguay" },
    57: { name: "Puerto Formosa", src: "https://alerta.ina.gob.ar/ina/08-PRONOSTICOS/graficos/puerto_formosa.png", river: "Paraguay" }
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
    texto_synop_semanal: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    texto_hidro: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`
};
