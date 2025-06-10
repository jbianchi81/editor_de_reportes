import express, { static as express_static } from 'express';
const app = express();
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express_static(path.join(__dirname,'..','public')));

app.use('/',(req, res) => {
  res.redirect('reporte_diario.html')
})

export default app;
