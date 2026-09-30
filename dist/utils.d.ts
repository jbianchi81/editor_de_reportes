import { AxiosResponse } from 'axios';
export declare function loadConfig(config_file?: string): Promise<any>;
export type GeoJSONObject = {
    type: string;
    features: Feature[];
};
type Geometry = {
    type: "Point";
    coordinates: number[];
};
type Feature = {
    type: "Feature";
    id: string;
    geometry: Geometry;
    properties: {
        unid: number;
        fecha: string;
        valor: number;
        valor_precedente: number;
        nombre: string;
        rio: string;
        perspectiva: string;
        nivel_de_alerta: number;
        nivel_de_evacuacion: number;
        percentil: number;
        series_id: number;
    };
};
export type HydroTableRow = {
    id: number;
    estacion_nombre: string;
    rio: string;
    valor: string;
    tendencia: string;
    alerta: string;
    evacuacion: string;
    perspectiva: string;
    aviso: string;
    status_color: string;
    series_id: number;
    secciones_url: string;
    x: number;
    y: number;
    status_text: string;
    percentil: number;
    tendencia_text: string;
    aviso_text: string;
    fecha: string;
};
export declare function getFeature(url: string, layer_name: string): Promise<AxiosResponse<any, any>>;
export declare function fetchLastValues(var_id?: number): Promise<GeoJSONObject>;
interface FilaTablaValores {
    id: number;
    estacion_nombre: string;
    rio: string;
    valor: string;
    tendencia: string;
    alerta: string;
    evacuacion: string;
    perspectiva: string;
    aviso: string;
    status_color: string;
    series_id: number;
    secciones_url: string;
    x: number;
    y: number;
    status_text: string;
    percentil: number;
    tendencia_text: string;
    aviso_text: string;
    fecha: string;
}
export declare function getLastValues(station_ids: number[], var_id?: number): Promise<FilaTablaValores[]>;
type YMDstrings = {
    year: string;
    month: string;
    day: string;
};
export declare function getYMDstrings(date: Date): YMDstrings;
type HydrologicalThresholds = {
    bajas: number;
    mb: number;
    ma: number;
    altas: number;
};
export declare function getHydrologicalReport(apiUrl: string, seriesMapping: Record<string, Record<string, number>>, stateThresholds: Record<string, HydrologicalThresholds>, currentDate?: Date): Promise<Record<string, string>>;
export declare function getValuesSemanal(): Promise<{
    datos_mapa_semanal: Record<string, string>;
    pdf_url: string;
    mapa_anomalia: string;
}>;
export declare function getValuesDiario(station_ids: number[], station_ids_caudal: number[]): Promise<{
    mapa_synop_semanal: string;
    texto_synop_semanal: string;
    mapa_suma_gfs: string;
    tabla_hidro: FilaTablaValores[];
    tabla_caudales: FilaTablaValores[];
    texto_hidro: string;
    hidrogramas: {
        id: number;
        name: string;
        src: string;
        river: string;
    }[];
    status_colors: Record<string, string>;
    fecha_emision: string;
    mapa_caudales: string;
    pdf_url: string;
}>;
export declare function statusColorsDict(): Record<string, string>;
export declare function getStatusColor(percentil: number): string;
export declare function getStatusText(percentil: number): string;
export declare function getStatus(percentil: number): string;
interface ObsStats {
    timestart: string;
    timeend: string;
    count: number;
    min: number;
    max: number;
    mean: number;
    nulls: number;
}
interface FilaTablaSemanal {
    estacion_id: number;
    var_id: number;
    series_id: number;
    unit_id: number;
    estacion_nombre: string;
    var_nombre: string;
    unidades_nombre: string;
    unidades_abrev: string;
    obs?: ObsStats;
    prono?: ObsStats;
    tendencia?: string;
}
export declare function fetchValuesSemanal(estacion_id: number, var_id: number, timestart_days?: number, timeend_days?: number, api_url?: string): Promise<FilaTablaSemanal>;
export {};
