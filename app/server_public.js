import {config} from './config.js'
import express, { static as express_static } from 'express';
import { engine } from 'express-handlebars';
const app = express();
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express_static(path.join(__dirname,'..','public')));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname,'..','views'));

app.get('/reporte_diario', async (req,res) => {
  res.render(
    'reporte_diario', {
      landscape_warning_class: (config.allow_portrait) ? "" : "enabled"
    })
})

app.use('/',(req, res) => {
  res.redirect('reporte_diario')
})

export default app;
