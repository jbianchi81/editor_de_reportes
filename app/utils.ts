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
        nombre : string,
        rio : string,
        perspectiva : string,
        nivel_de_alerta : number,
        nivel_de_evacuacion : number
    }
}

export type HydroTableRow = {
    id : number,
    estacion_nombre : string,
    rio : string, // undefined
    valor : number,
    alerta : number,
    evacuacion : number,
    perspectiva : string // undefined
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

export async function getLastValues(station_ids : number[]) {
    const data = await fetchLastValues()
    const rows : HydroTableRow[] = []
    for(const feature of data.features) {
        if(station_ids.indexOf(feature.properties.unid) >= 0) {
            rows.push({
                id: feature.properties.unid,
                estacion_nombre: feature.properties.nombre,
                rio: feature.properties.rio, // undefined
                valor: feature.properties.valor,
                alerta: feature.properties.nivel_de_alerta,
                evacuacion: feature.properties.nivel_de_evacuacion,
                perspectiva: feature.properties.perspectiva // undefined
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