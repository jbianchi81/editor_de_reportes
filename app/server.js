import express, { static as express_static } from 'express';
import { engine } from 'express-handlebars';
import pkg from 'body-parser';
const { json } = pkg;
import { readFile, writeFile, writeFileSync } from 'fs';
import axios from 'axios';
import {config} from './config.js'
const app = express();
const PORT = config.port || 3000;
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {getYMDstrings} from '../dist/utils.js'
import {getValuesDiario, getValuesSemanal} from '../dist/utils.js'
import downloadPdf from '../dist/downloadPdf.js'

app.use(express_static(path.join(__dirname,'..','public')));
// app.use('/js',express_static('public'));
app.use(express.json());

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
    readFile(path.join(__dirname, '..','public','json/reporte_diario.json'), 'utf8', (err, json_data) => {
      if (err) {
        console.error(err)
        return res.status(504).send('Server error');
      }
      try {
        var report_metadata = JSON.parse(json_data)
      } catch (e) {
        console.error("Failed to parse report metadata, using Defaults. \n" + e.toString())
        var report_metadata = {}
      }
      res.render(
        'reporte_diario', 
        {
          landscape_warning_class: (config.allow_portrait) ? "" : "enabled",
          html_content: data,
          geoserver_url: "https://alerta.ina.gob.ar/geoserver",
          estacionId: [...config.station_ids, ...config.station_ids_caudal].join("_"),
          map_query_delay: config.map_query_delay || 1000,
          date: report_metadata.date || new Date().toISOString()
        }
      )
    })      
  });
})

app.get('/reporte_diario_local', async (req,res) => {
  readFile(path.join(__dirname, '..','public','saved.html'), 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return res.status(504).send('Server error');
    }
    readFile(path.join(__dirname, '..','public','json/reporte_diario.json'), 'utf8', (err, json_data) => {
      if (err) {
        console.error(err)
        return res.status(504).send('Server error');
      }
      try {
        var report_metadata = JSON.parse(json_data)
      } catch (e) {
        console.error("Failed to parse report metadata, using Defaults. \n" + e.toString())
        var report_metadata = {}
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
          map_query_delay: config.map_query_delay || 1000,
          date: report_metadata.date || new Date().toISOString()
        })
    })
  });
})

app.get('/reporte_semanal_local', async (req,res) => {
  readFile(path.join(__dirname, '..','public','saved_semanal.html'), 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return res.status(504).send('Server error');
    }
    readFile(path.join(__dirname, '..','public','json/reporte_semanal.json'), 'utf8', (err, json_data) => {
      if (err) {
        console.error(err)
        return res.status(504).send('Server error');
      }
      try {
        var report_metadata = JSON.parse(json_data)
      } catch (e) {
        console.error("Failed to parse report metadata, using Defaults. \n" + e.toString())
        var report_metadata = {}
      }
      if(config.directory_listings_url) {
        data = data.replace(/https\:\/\/alerta.ina.gob.ar\/ina/g, `${config.directory_listings_url}/ina`)
      }
      if(config.geoserver_url) {
        data = data.replace(/https\:\/\/alerta.ina.gob.ar\/geoserver/g, `${config.geoserver_url}`)
      }
      res.render(
        'reporte_semanal', {
          html_content: data,
          fecha_emision: report_metadata.date || new Date().toISOString()
        })
    })
  });
})


// Save new HTML content
app.post('/publish', isWriter, (req, res) => {
  const reporte = (req.query && req.query.reporte && req.query.reporte == "semanal") ? "semanal" : "diario"
  const html = req.body.html;
  // write report (html)
  const filename = (reporte == "semanal") ? "../public/saved_semanal.html" : '../public/saved.html'
  writeFile(path.join(__dirname, filename), html, async err => {
    if (err) return res.status(500).send('Error al guardar');
    res.send('Se guardó exitosamente!');
    const date = new Date()
    const ymd = getYMDstrings(date)
    // write json (report metadata)
    const md_filename = (reporte == "semanal") ? '../public/json/reporte_semanal.json' : '../public/json/reporte_diario.json'
    const reporte_url = (reporte == "semanal") ? "https://alerta.ina.gob.ar/a5/diario/reporte_semanal" : "https://alerta.ina.gob.ar/a5/diario/reporte_diario"
    writeFile(
      path.join(__dirname,md_filename), 
      JSON.stringify(
        {
          "url": reporte_url,
          "fecha": `${ymd.day}-${ymd.month}-${ymd.year}`,
          "date": date.toISOString()
        }
      ),
      async err => {
        if(err) console.log("Error al guardar " + md_filename + ": " + e.toString())
      }
    )
    // download pdf
    const local_pdf = (config.public_url) ? (reporte == "semanal") ? `${config.public_url}/reporte_semanal_local` : `${config.public_url}/reporte_diario_local` : undefined
    try {
      await downloadPdf(local_pdf, (reporte == "semanal"))
    } catch(e) {
      console.error(e)
    } 
  });
});

// Save draft
app.post('/draft', isWriter, (req, res) => {
  const reporte = (req.query && req.query.reporte && req.query.reporte == "semanal") ? "semanal" : "diario"
  const html = req.body.html;
  const filename = (reporte == "semanal") ? '../public/draft_semanal.html' : '../public/draft.html'
  writeFile(path.join(__dirname,filename), html, async err => {
    if (err) return res.status(500).send('Error al guardar borrador');
    res.send('Se guardó el borrador exitosamente!');
  });
});

app.get('/template_semanal', isWriter, async (req, res) => {
  try {
    const values = await getValuesSemanal()
    writeFileSync("public/json/datos_mapa_semanal.json", JSON.stringify(values.datos_mapa_semanal))
    res.render('template_semanal', values)
  } catch(e) {
    console.error(e)
    res.status(500).send({ error: e.message || 'Internal Server Error' })
  }
})

app.get('/editor', isWriterRedirect, (req, res) => {
  const reporte = (req.query && req.query.reporte && req.query.reporte == "semanal") ? "semanal" : "diario"
  res.render('index',
    {
      reporte: reporte,
      isSemanal: (reporte == "semanal") ? true : false,
      layout: 'index'
  })
})

app.get('/reporte_semanal', async (req,res) => {
  readFile(path.join(__dirname, '..','public','saved_semanal.html'), 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return res.status(504).send('Server error');
    }
    readFile(path.join(__dirname, '..','public','json/reporte_semanal.json'), 'utf8', (err, json_data) => {
          if (err) {
            console.error(err)
            return res.status(504).send('Server error');
          }
          try {
            var report_metadata = JSON.parse(json_data)
          } catch (e) {
            console.error("Failed to parse report metadata, using Defaults. \n" + e.toString())
            var report_metadata = {}
        }
        res.render(
          'reporte_semanal', {
            html_content: data,
            fecha_emision: report_metadata.date || new Date().toISOString()
          })
        })
  });
})


app.get('/', isWriterRedirect, (req, res) => {
  res.render('index',
    {
      reporte: "diario",
      isSemanal: false,
      layout: 'index'
  })
})

export default app;
// router.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
