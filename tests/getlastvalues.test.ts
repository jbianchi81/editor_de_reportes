import {fetchLastValues, getLastValues, GeoJSONObject} from '../app/utils'

function isGeoJSON(data : any): data is GeoJSONObject {
    return (
        typeof data === 'object' &&
        typeof data.type === 'string' &&
        Array.isArray(data.features)
    )
}

describe('fetchWithParams', () => {
    it('should return data from API', async () => {
      const data = await fetchLastValues();
      expect(isGeoJSON(data)).toBe(true)
    });

    it('should return list of HydroTableRows', async () => {
        const station_ids = [19, 20, 23, 24, 26, 29, 30, 34]
        const rows = await getLastValues(station_ids)
        expect(Array.isArray(rows)).toBe(true)
        expect(rows.length).toEqual(station_ids.length)

    })
  
});