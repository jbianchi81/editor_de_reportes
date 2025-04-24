const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.json({ limit: '5mb' }));

// Serve the saved HTML content
app.get('/content', (req, res) => {
  fs.readFile('public/saved.html', 'utf8', (err, data) => {
    if (err) return res.send('');
    res.send(data);
  });
});

app.get('/template', (req, res) => {
  fs.readFile('public/template.html', 'utf8', (err, data) => {
    if (err) return res.send('');
    res.send(data);
  });
});

// Save new HTML content
app.post('/save', (req, res) => {
  const html = req.body.html;
  fs.writeFile('public/saved.html', html, err => {
    if (err) return res.status(500).send('Error al guardar');
    res.send('Se guardó exitosamente!');
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
