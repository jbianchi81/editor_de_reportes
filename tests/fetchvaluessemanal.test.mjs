import {fetchValuesSemanal, loadConfig} from '../dist/utils.js'
import {describe, it} from 'node:test'
import assert from "node:assert/strict";

describe('fetchValuesSemanal', () => {
    it('should return values tabla semanal', async () => {
        const config = await loadConfig()
        const ts = new Date()
        ts.setDate(ts.getDate() - 9)
        const te = new Date()
        te.setDate(te.getDate() + 16)
        const values = await fetchValuesSemanal(    
            19,
            2,
            -8,
            15
        )
        assert.ok(values.obs)
        assert.ok(values.obs.count > 0)
        assert.ok(values.obs.max > values.obs.min)
        assert.ok(values.obs.mean > values.obs.min)
        assert.equal(values.obs.nulls, 0)
        assert.ok(values.obs.timestart > ts.toISOString())
        assert.ok(values.obs.timeend < te.toISOString())
        assert.ok(values.prono)
        assert.ok(values.prono.min <= values.prono.max)
        assert.ok(values.prono.mean <= values.prono.max)
        assert.equal(values.prono.count, 9)
        assert.equal(values.prono.nulls, 0)
        assert.equal([...values.prono.series_id].length,1)
        assert.equal([...values.prono.qualifiers].length,3)

    })
});