import express, { static as express_static } from 'express';
import { engine } from 'express-handlebars';
import pkg from 'body-parser';
const { json } = pkg;
import { readFile, writeFile } from 'fs';
import axios from 'axios';
import {config} from './config.js'
const app = express();
const PORT = config.port || 3000;
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {getYMDstrings} from '../dist/utils.js'

app.use(express_static(path.join(__dirname,'..','public')));
// app.use('/js',express_static('public'));
app.use(json({ limit: '5mb' }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname,'..','views'));

// app.use((req, res, next) => {
//   console.log(`[${req.method}] ${req.originalUrl}`);
//   console.log('Cookies:', req.headers.cookie);
//   console.log('Session ID:', req.sessionID);
//   console.log('Session data:', req.session);
//   next();
// });

import {getValuesDiario} from '../dist/utils.js'
import downloadPdf from '../dist/downloadPdf.js'

// authentication
async function isWriter(req,res,next) {
		if(config.skip_authentication) {
			  return next()
		}
		try {
        var response = await axios.get(`${config.authentication_url}`, {
            headers: {
                Cookie: req.headers.cookie // Forward cookies from the client
            }
        })       
        if (response.status == 200) {
            console.log("Authenticated")
            next()
        } else {
            console.error(`Authentication failed. Response status: ${response.status}`);
            // res.redirect(redirect_url)
            res.status(401).send("Unauthorized")
        }
    } catch (e) {
			console.error(e)
      res.status(401).send("Unauthorized")
		}		
}

async function isWriterRedirect(req,res,next) {
		if(config.skip_authentication) {
			  return next()
		}
    const redirect_url = `${config.login_url}?redirected=true&path=${req.path}&unauthorized=true`
		try {
        var response = await axios.get(`${config.authentication_url}`, {
            headers: {
                Cookie: req.headers.cookie // Forward cookies from the client
            }
        })       
        if (response.status == 200) {
            console.log("Authenticated")
            next()
        } else {
            console.error(`Authentication failed. Response status: ${response.status}`);
            res.redirect(redirect_url)
            // res.status(401).send("Unauthorized")
        }
    } catch (e) {
			console.error(e)
      res.redirect(redirect_url)
		}		
}


// app.use(isWriter)
// app.use(isWriterRedirect)

// Serve the saved HTML content
app.get('/content', isWriter, (req, res) => {
  readFile(path.join(__dirname, '..','public','saved.html'), 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return res.status(504).send('Server error');
    }
    res.send(data);
  });
});

// app.get('/template', (req, res) => {
//   fs.readFile('public/template.html', 'utf8', (err, data) => {
//     if (err) return res.send('');
//     res.send(data);
//   });
// });

app.get('/template', isWriter, async (req, res) => {
  try {
    const values = await getValuesDiario(config.station_ids, config.station_ids_caudal)
    res.render('template_diario', values)
  } catch(e) {
    console.error(e)
    res.status(500).send({ error: e.message || 'Internal Server Error' })
  }
})

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

// Save new HTML content
app.post('/publish', isWriter, (req, res) => {
  const html = req.body.html;
  writeFile(path.join(__dirname,'../public/saved.html'), html, async err => {
    if (err) return res.status(500).send('Error al guardar');
    res.send('Se guardó exitosamente!');
    // download pdf
    try {
      await downloadPdf((config.public_url) ? `${config.public_url}/reporte_diario_local` : undefined)
    } catch(e) {
      console.error(e)
    }
    const date = new Date()
    const ymd = getYMDstrings(date)
    writeFile(
      path.join(__dirname,'../public/json/reporte_diario.json'), 
      JSON.stringify(
        {
          "url": "https://alerta.ina.gob.ar/a5/diario/reporte_diario",
          "fecha": `${ymd.day}-${ymd.month}-${ymd.year}`,
          "date": date.toISOString()
        }
      ),
      async err => {
        if(err) console.log("Error al guardar reporte_diario.json: " + e.toString())
      }
    )
    
  });
});

// Save draft
app.post('/draft', isWriter, (req, res) => {
  const html = req.body.html;
  writeFile(path.join(__dirname,'../public/draft.html'), html, async err => {
    if (err) return res.status(500).send('Error al guardar borrador');
    res.send('Se guardó el borrador exitosamente!');
  });
});


app.get('/', isWriterRedirect, (req, res) => {
  res.render('index',
    {
      layout: 'index'
  })
})

export default app;
// router.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));