import {getValuesSemanal, getHydrologicalReport, loadConfig} from '../app/utils'

describe('getHydroReport', () => {
    it('should return values for q map', async () => {
        const config = await loadConfig()
        const values = await getHydrologicalReport(
            config.semanal.url,
            config.semanal.mapeo_series,
            config.semanal.limites_estados
        )
        expect(values).toHaveProperty("fecha")
        expect(values).toHaveProperty("itaipu")
    })
});