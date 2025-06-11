'use strict'

import downloadPdf from './dist/downloadPdf.js'
import {config} from './app/config.js'

downloadPdf((config.public_url) ? `${config.public_url}/reporte_diario.html` : undefined)