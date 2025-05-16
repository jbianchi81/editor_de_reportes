import {getFeature, loadConfig, fetchLastValues, getLastValues, GeoJSONObject} from '../app/utils'

function isGeoJSON(data : any): data is GeoJSONObject {
    return (
        typeof data === 'object' &&
        typeof data.type === 'string' &&
        Array.isArray(data.features)
    )
}

describe('getFeature', () => {
    it("should return features", async () => {
        const config = await loadConfig()
        var response = await getFeature(config.geoserver.url, "siyah:ultimas_alturas_con_timeseries") // , config.geoserver.username, config.geoserver.password)
        expect(response.status).toBe(200)
        expect(response.data).toBeDefined()
    })
})

describe('fetchWithParams', () => {
    it('should return data from API', async () => {
      const data = await fetchLastValues();
      expect(isGeoJSON(data)).toBe(true)
      for(const feature of data.features) {
        expect(feature.properties).toHaveProperty("rio")
        expect(feature.properties).toHaveProperty("percentil")
      }
    });

    it('should return list of HydroTableRows', async () => {
        const station_ids = [19, 20, 23, 24, 26, 29, 30, 34]
        const rows = await getLastValues(station_ids)
        expect(Array.isArray(rows)).toBe(true)
        expect(rows.length).toEqual(station_ids.length)
        for(const row of rows) {
            expect(row.rio).not.toBe("")
            expect(row.status_color).not.toBe('#ffffff')
        }
    })

    it('should return q data from API', async () => {
      const data = await fetchLastValues(4);
      expect(isGeoJSON(data)).toBe(true)
      for(const feature of data.features) {
        expect(feature.properties).toHaveProperty("rio")
        expect(feature.properties).toHaveProperty("percentil")
      }
    });

    it('should return list of HydroTableRows for q', async () => {
        const station_ids = [91, 92, 8, 93, 87, 88]
        const rows = await getLastValues(station_ids, 4)
        expect(Array.isArray(rows)).toBe(true)
        expect(rows.length).toEqual(station_ids.length)
        for(const row of rows) {
            expect(row.rio).not.toBe("")
            expect(row.status_color).not.toBe('#ffffff')
        }
    })
});