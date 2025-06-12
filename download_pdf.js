'use strict'

import downloadPdf from './dist/downloadPdf.js'
import {config} from './app/config.js'

try {
    await downloadPdf((config.public_url) ? `${config.public_url}/reporte_diario_local` : undefined)
} catch(e) {
    console.error(e)
}