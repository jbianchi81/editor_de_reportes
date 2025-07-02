import {config} from './config.js'
import express, { static as express_static } from 'express';
import { engine } from 'express-handlebars';
const app = express();
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { readFile } from 'fs';

app.use(express_static(path.join(__dirname,'..','public')));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname,'..','views'));

app.get('/reporte_diario', async (req,res) => {
  readFile(path.join(__dirname, '..','public','saved.html'), 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return res.status(504).send('Server error');
    }
    res.render(
      'reporte_diario', {
        landscape_warning_class: (config.allow_portrait) ? "" : "enabled",
        html_content: data,
        geoserver_url: "https://alerta.ina.gob.ar/geoserver",
        estacionId: [...config.station_ids, ...config.station_ids_caudal].join("_"),
        map_query_delay: config.map_query_delay || 1000
      })
  });
})

app.get('/reporte_diario_local', async (req,res) => {
  readFile(path.join(__dirname, '..','public','saved.html'), 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return res.status(504).send('Server error');
    }
    if(config.directory_listings_url) {
      data = data.replace(/https\:\/\/alerta.ina.gob.ar\/ina/g, `${config.directory_listings_url}/ina`)
    }
    if(config.geoserver_url) {
      data = data.replace(/https\:\/\/alerta.ina.gob.ar\/geoserver/g, `${config.geoserver_url}`)
    }
    res.render(
      'reporte_diario', {
        landscape_warning_class: (config.allow_portrait) ? "" : "enabled",
        html_content: data,
        geoserver_url: config.geoserver_url || "https://alerta.ina.gob.ar/geoserver",
        estacionId: [...config.station_ids, ...config.station_ids_caudal].join("_"),
        map_query_delay: config.map_query_delay || 1000
      })
  });
})



app.use('/',(req, res) => {
  res.redirect('reporte_diario')
})

export default app;
