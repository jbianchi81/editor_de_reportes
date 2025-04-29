export type GeoJSONObject = {
    type: string;
    features: Feature[];
};
type Feature = {
    type: "Feature";
    id: string;
    geometry: Object;
    properties: {
        unid: number;
        fecha: string;
        valor: number;
        nombre: string;
        rio: string;
        perspectiva: string;
        nivel_de_alerta: number;
        nivel_de_evacuacion: number;
    };
};
export type HydroTableRow = {
    id: number;
    estacion_nombre: string;
    rio: string;
    valor: number;
    alerta: number;
    evacuacion: number;
    perspectiva: string;
};
export declare function fetchLastValues(): Promise<GeoJSONObject>;
export declare function getLastValues(station_ids: number[]): Promise<HydroTableRow[]>;
export declare function getValuesDiario(station_ids: number[]): Promise<{
    mapa_synop_semanal: string;
    texto_synop_semanal: string;
    mapa_suma_gfs: string;
    tabla_hidro: HydroTableRow[];
    texto_hidro: string;
    hidrogramas: string[];
}>;
export {};
