import axios from 'axios';

export type GeoJSONObject = {
    type : string
    features : Feature[] 
}

type Feature = {
    type : "Feature"
    id : string
    geometry : Object
    properties : {
        unid : number,
        fecha : string,
        valor : number,
        valor_precedente : number,
        nombre : string,
        rio : string,
        perspectiva : string,
        nivel_de_alerta : number,
        nivel_de_evacuacion : number,
        percentil : number
    }
}

export type HydroTableRow = {
    id : number,
    estacion_nombre : string,
    rio : string, // undefined
    valor : number,
    tendencia : string,
    alerta : number,
    evacuacion : number,
    estado : string,
    perspectiva : string, // undefined
    aviso : string
}

const last_values_url = "https://alerta.ina.gob.ar/geoserver/ows"

export async function fetchLastValues() : Promise<GeoJSONObject> {

    try {
        const response = await axios.get(
            last_values_url,
            {
                params: {
                    service: 'WFS',
                    version: '1.0.0',
                    request: 'GetFeature',
                    typeName: 'public2:ultimas_alturas_con_timeseries',
                    maxFeatures: '500',
                    outputFormat: 'application/json'
                }
            }
        )
        return response.data as GeoJSONObject; // Use the parsed JSON
    } catch (err) {
      throw err
    }
}

function detectWarning(valor : number, nivel_de_alerta : number, nivel_de_evacuacion : number) : "ok" | "alerta" | "evacuacion" | "no_data" {
    if(valor == null) {
        return "no_data"
    }
    if(nivel_de_alerta != null && valor >= nivel_de_alerta) {
        if(nivel_de_evacuacion  != null && valor >= nivel_de_evacuacion) {
            return "evacuacion"
        } else {
            return "alerta"
        }
    } else {
        return "ok"
    }
}

function getTrend(valor : number, valor_precedente : number) : "sube" | "baja" | "igual" | "no_data" {
    if(valor == null || valor_precedente == null) {
        return "no_data"
    }
    return (valor > valor_precedente) ? "sube" : (valor < valor_precedente) ? "baja" : "igual"
}

export async function getLastValues(station_ids : number[]) {
    const data = await fetchLastValues()
    const rows : HydroTableRow[] = []
    for(const feature of data.features) {
        if(station_ids.indexOf(feature.properties.unid) >= 0) {
            const tendencia = getTrend(feature.properties.valor, feature.properties.valor_precedente)
            const aviso = detectWarning(feature.properties.valor, feature.properties.nivel_de_alerta, feature.properties.nivel_de_evacuacion)
            rows.push({
                id: feature.properties.unid,
                estacion_nombre: feature.properties.nombre,
                rio: feature.properties.rio, // undefined
                valor: feature.properties.valor,
                tendencia: trend_icon_mapping[tendencia],
                alerta: feature.properties.nivel_de_alerta,
                evacuacion: feature.properties.nivel_de_evacuacion,
                estado: getStatus(feature.properties.percentil),
                perspectiva: feature.properties.perspectiva, // undefined
                aviso: warning_icon_mapping[aviso]
            })
        }
    }
    return rows
} 

export async function getValuesDiario(station_ids : number[]) {
    const tabla_hidro = await getLastValues(station_ids)
    const hidrogramas = []
    for(const id of station_ids) {
        if(plot_mapping.hasOwnProperty(id)) {
            hidrogramas.push(plot_mapping[id])
        }
    }
    return {
        mapa_synop_semanal: "https://alerta.ina.gob.ar/ina/13-SYNOP/mapas_semanales/pp_semanal_20181213_rst.png",
        texto_synop_semanal: "Texto que describe el acumulado semanal",
        mapa_suma_gfs: "https://alerta.ina.gob.ar/ina/34-GFS/mapas/suma/gfs.2025042406.2025042412.suma.png",
        tabla_hidro: tabla_hidro,
        texto_hidro: "Texto que describe la situación y perspectiva",
        hidrogramas: hidrogramas
    }
}

const warning_icon_mapping: Record<string, string> = {
    "ok": '',
    "alerta": '<i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: yellow;"></i>',
    "evacuacion": '<i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: red;"></i>',
    "no_data": ''
}

const status_categories: Record<number, string> = {
    5: "aguas altas",
    25: "aguas medias altas",
    75: "aguas medias",
    95: "aguas medias bajas",
    100: "aguas bajas"
}

const status_colors: Record<number, string> = {
    5: "#9fc5e8",
    25: "#cfe2f3",
    75: "#ffff66",
    95: "#ffd580",
    100: "#ea9999"
}

export function getStatusColor(percentil : number) : string {
    if(percentil == null) {
        return "#ffffff"
    }
    const keys = Object.keys(status_categories).map(Number).sort((a,b) => a - b)
    for (const key of keys) {
        if(percentil <= key) {
            return status_colors[key]
        }
    }
    return ""
}


export function getStatusText(percentil : number) : string {
    if(percentil == null) {
        return ""
    }
    const keys = Object.keys(status_categories).map(Number).sort((a,b) => a - b)
    for (const key of keys) {
        if(percentil <= key) {
            return status_categories[key]
        }
    }
    return ""
}

export function getStatus(percentil : number) : string {
    const status_text = getStatusText(percentil)
    const color = getStatusColor(percentil)
    return `<div style="background-color: ${color}; width: 100%; height: 100%;">${status_text}</div>`
}


const trend_icon_mapping: Record<string, string> = {
    "baja": '<i class="fa fa-arrow-down" aria-hidden="true"></i>',
    "sube": '<i class="fa fa-arrow-up" aria-hidden="true"></i>',
    "igual": '<i class="fas fa-equals"></i>',
    "no_data": '<i class="fa fa-times" aria-hidden="true"></i>'
}

const plot_mapping: Record<number, string> = {
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
}