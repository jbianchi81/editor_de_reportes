import {getValuesDiario, loadConfig} from '../app/utils'

describe('getValuesDiario', () => {
    it('should return values for template', async () => {
        const config = await loadConfig()
        const values = await getValuesDiario(config.station_ids, config.station_ids_caudal)
        expect(values).toHaveProperty("mapa_synop_semanal")
        expect(values).toHaveProperty("texto_synop_semanal")
        expect(values).toHaveProperty("mapa_suma_gfs")
        expect(values).toHaveProperty("tabla_hidro")
        expect(values).toHaveProperty("tabla_caudales")
        expect(values).toHaveProperty("texto_hidro")
        expect(values).toHaveProperty("hidrogramas")
        expect(values).toHaveProperty("status_colors")
        expect(values).toHaveProperty("fecha_emision")
    })
});