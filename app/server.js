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

app.use(express_static(path.join(__dirname,'..','public')));
// app.use('/js',express_static('public'));
app.use(json({ limit: '5mb' }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname,'..','views'));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  console.log('Cookies:', req.headers.cookie);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  next();
});

import {getValuesDiario} from '../dist/utils.js'

// authentication
async function isWriter(req,res,next) {
		if(config.skip_authentication) {
			  return next()
		}
		try {
        var respon   = await axios.get(`${config.authentication_url}`, {
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

// Save new HTML content
app.post('/save', isWriter, (req, res) => {
  const html = req.body.html;
  writeFile(path.join(__dirname,'../public/saved.html'), html, err => {
    if (err) return res.status(500).send('Error al guardar');
    res.send('Se guardó exitosamente!');
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