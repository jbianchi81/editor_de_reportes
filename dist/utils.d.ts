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
export declare function getLastValues(station_ids: number[], var_id?: number): Promise<HydroTableRow[]>;
type YMDstrings = {
    year: string;
    month: string;
    day: string;
};
export declare function getYMDstrings(date: Date): YMDstrings;
export declare function getValuesDiario(station_ids: number[], station_ids_caudal: number[]): Promise<{
    mapa_synop_semanal: string;
    texto_synop_semanal: string;
    mapa_suma_gfs: string;
    tabla_hidro: HydroTableRow[];
    tabla_caudales: HydroTableRow[];
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
export {};
