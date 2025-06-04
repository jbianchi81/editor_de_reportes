'use strict'

import server from './app/server.js'
import {config} from './app/config.js'
const PORT = config.port || 3000;

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));