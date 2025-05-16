import express, { static as express_static } from 'express';
import { engine } from 'express-handlebars';
import pkg from 'body-parser';
const { json } = pkg;
import { readFile, writeFile } from 'fs';
import {config} from './config.js'
const app = express();
const PORT = 3000;

app.use(express_static('public'));
app.use(json({ limit: '5mb' }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

import {getValuesDiario} from '../dist/utils.js'

// Serve the saved HTML content
app.get('/content', (req, res) => {
  readFile('public/saved.html', 'utf8', (err, data) => {
    if (err) return res.send('');
    res.send(data);
  });
});

// app.get('/template', (req, res) => {
//   fs.readFile('public/template.html', 'utf8', (err, data) => {
//     if (err) return res.send('');
//     res.send(data);
//   });
// });

app.get('/template', async (req, res) => {
  try {
    const values = await getValuesDiario(config.station_ids, config.station_ids_caudal)
    res.render('template_diario', values)
  } catch(e) {
    console.error(e)
    res.status(500).send({ error: e.message || 'Internal Server Error' })
  }
})

// Save new HTML content
app.post('/save', (req, res) => {
  const html = req.body.html;
  writeFile('public/saved.html', html, err => {
    if (err) return res.status(500).send('Error al guardar');
    res.send('Se guardó exitosamente!');
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));