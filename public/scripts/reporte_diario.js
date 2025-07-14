var map;
window.onload = function () {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      header.parentElement.classList.toggle('open');
    });
  });

  // document.querySelector(".mapa_caudales").style.display = "none"
  document.getElementById("mapa-row").style.display = "flex"
  map = load_map("mapa-condicion")
}

document.addEventListener("DOMContentLoaded", function () {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach(el => {
    const tooltip = new bootstrap.Tooltip(el)
    el.addEventListener('click', function (e) {
      e.preventDefault();
    });
  })
});

function closeModal() {
  const modalEl = document.getElementById('hidrolinksModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();
}

const hidrolinksModal = document.getElementById('hidrolinksModal');

hidrolinksModal.addEventListener('show.bs.modal', function (event) {
  const trigger = event.relatedTarget;
  const title = trigger.getAttribute('data-title');
  const id = trigger.getAttribute('data-id');
  const seccionesurl = trigger.getAttribute('data-seccionesurl');

  hidrolinksModal.querySelector('.modal-title').textContent = title;
  hidrolinksModal.querySelector('#hidrograma-link').setAttribute("href", `#hidrograma-${id}`)
  const hidrograma = document.getElementById(`hidrograma-${id}`)
  if (hidrograma) {
    hidrolinksModal.querySelector('#hidrograma-link').classList.remove("hidden")
  } else {
    hidrolinksModal.querySelector('#hidrograma-link').classList.add("hidden")
  }
  hidrolinksModal.querySelector('#secciones-link').setAttribute("href", seccionesurl);
});
const hidrograma_link = hidrolinksModal.querySelector('#hidrograma-link')
hidrograma_link.addEventListener("click", (event) => {
  event.preventDefault()
  const hidrograma_id = event.target.getAttribute("href").replace("#", "")
  const hidrograma = document.getElementById(hidrograma_id)
  if (hidrograma) {
    hidrograma.parentElement.parentElement.classList.add("open")
    hidrograma.parentElement.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
});

// MAPA CONDICION

const baseLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({ url: 'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png' })
});

var tramos_timestart = new Date(window.myData.tramos_timeend)
tramos_timestart.setDate(tramos_timestart.getDate() - 7)

const wmsLayer = new ol.layer.Tile({
  source: new ol.source.TileWMS({
    url: window.myData.wmsLayerUrl,
    params: {
      'LAYERS': 'public2:tramos_condicion_params',
      'TILED': true,
      'VIEWPARAMS': `timestart:${tramos_timestart.toISOString()};timeend:${window.myData.tramos_timeend.toISOString()}`
    },
    serverType: 'geoserver',
    transition: 0
  })
});

const estacionesLayerWMS = new ol.layer.Tile({
  source: new ol.source.TileWMS({
    url: "http://localhost:8080/geoserver/wms",
    params: {
      'LAYERS': 'main:ultimas_alturas_con_timeseries',
      'TILED': true,
      'VIEWPARAMS': `redId:10;estacionId:${window.myData.estacionId}`
    }
  })
})

const alturasSource = createVectorSourceFromTable("tabla-alturas")
const caudalesSource = createVectorSourceFromTable("tabla-caudales")

const faStyleFunction = function (feature) {
  const condicion = feature.get('status_text');
  const tendencia = feature.get('tendencia');
  const aviso = feature.get('aviso');

  // Choose color and shape based on status
  let fill_color = 'gray';
  let icon_unicode = '\uf111';

  if (condicion) {
    fill_color = getStatusColor(condicion)
  }

  switch (aviso) {
    case 'alerta':
      fill_color = 'yellow';
      icon_unicode = '\uf071';
      break;
    case 'evacuacion':
      fill_color = 'red';
      icon_unicode = '\uf071';
      break;
    default:
      switch (tendencia) {
        case 'crece':
        case 'sube':
          icon_unicode = '\uf35b'
          break;
        case 'baja':
          icon_unicode = '\uf358'
          break;
      }
  }

  return new ol.style.Style({
    text: new ol.style.Text({
      text: icon_unicode,
      font: '900 12px "Font Awesome 6 Free"', // adjust for FA version/weight
      fill: new ol.style.Fill({ color: fill_color }),
      stroke: new ol.style.Stroke({ color: 'black', width: 2 }),
      // backgroundFill: new ol.style.Fill({ color: 'white' }),
      // backgroundStroke: new ol.style.Stroke({ color: 'black', width: 1 }),
      offsetY: 0, // optional: raise the icon
    })
  });
}

const basicStyle = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 5,
    fill: new ol.style.Fill({ color: 'red' }),
    stroke: new ol.style.Stroke({ color: 'white', width: 1 })
  })
})

const alturasLayer = new ol.layer.Vector({
  source: alturasSource,
  style: faStyleFunction
});

const caudalesLayer = new ol.layer.Vector({
  source: caudalesSource,
  style: faStyleFunction
});


function load_map(target) {
  const map = new ol.Map({
    target: target || 'mapa-condicion',
    layers: [baseLayer, wmsLayer, alturasLayer, caudalesLayer],
    view: new ol.View({
      center: ol.proj.fromLonLat([-58.21, -31.58]),
      zoom: 5,
      projection: 'EPSG:3857'
    }),
    interactions: ol.interaction.defaults.defaults({ mouseWheelZoom: false }).extend([
      new ol.interaction.MouseWheelZoom({
        condition: ol.events.condition.platformModifierKeyOnly
      })
    ])
  });

  map.on('pointermove', mapQueryHandler);
  map.on('click', mapQueryHandler);

  return map
}

let hoverTimer = null;
let lastPixel = null;

function mapQueryHandler(e) {
  const modalcontainer = document.getElementById('map-modal-container')
  if(modalcontainer) {
    modalcontainer.remove()
  }

  const pixel = e.pixel;

  // Reset if pointer moved
  if (!lastPixel || pixel[0] !== lastPixel[0] || pixel[1] !== lastPixel[1]) {
    lastPixel = pixel;
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(async () => {

      const feature = map.forEachFeatureAtPixel(pixel, (feature, layer) => {
        if (layer == alturasLayer || layer == caudalesLayer) {
          return feature
        }
      }, {
        hitTolerance: 5 // optional: increases clickable radius
      }
      )

      if (feature) {
        // shows point data (estaciones alturas/caudales)
        showMapPopup(feature)
        return
      }

      //else, query lines (tramos)
      await queryWMSLayer(e)


    }, window.myData.map_query_delay); // 1 second still
  }
}

function mapPopupContent(response_type, props) {
  const feature_type = (response_type == "tramos") ? "tramo" : "estación"
  // const condicion = (response_type == "tramo") ? props.condicion : (props.estado && props.estado != "normal") ? props.estado : ""
  var content = `<span style="font-style: italic;">río: </span>${props.rio}<br><span style="font-style: italic;">${feature_type}: </span>${props.nombre}`
  if (props.condicion) {
    content = `${content}<br><strong>${props.condicion}</strong>`
  }
  if (props.aviso && props.aviso != "ok") {
    var aviso_color = "white";
    switch (props.aviso) {
      case 'alerta':
        aviso_color = 'yellow';
        break;
      case 'evacuacion':
        aviso_color = 'red';
        break;
    }
    content = `${content}<br><strong style="background-color: ${aviso_color};">${props.aviso}</strong>`
  }
  return content
}

function showMapPopup(feature, response_type = "estacion") {
  const props = feature.getProperties();
  console.log(props)
  const content = mapPopupContent(response_type, {
    rio: props.rio || props.Río,
    nombre: props.nombre || props.Estación,
    condicion: props.condicion || props.status_text,
    aviso: props.aviso
  })
  // const content = (response_type == "tramo") ? `<strong>tramo</strong><br>${props.rio}<br>${props.nombre}<br>${props.condicion}` : `<strong>estación</strong><br>${props.Río}<br>${props.Estación}<br>${props.status_text}`
  createModalContainer(content,(props.status_color) ? props.status_color : null)
}

function createModalContainer(content, bkgColor) {
  const modalContainer = document.createElement("div")
  modalContainer.id = 'map-modal-container'
  modalContainer.style.backgroundColor = bkgColor 
  modalContainer.style.display = "block"
  modalContainer.innerHTML = `<div id="map-modal-content">${content}</div>`
  document.getElementById('mapa-condicion').after(modalContainer)
}

function createVectorSourceFromTable(table_id = "tabla-alturas") {
  const rows = document.querySelectorAll(`#${table_id} tbody tr`);
  const headers = Array.from(document.querySelectorAll(`#${table_id} thead th`)).map(th => th.textContent.trim());

  const features = Array.from(rows).map(row => {
    const x = parseFloat(row.dataset.x);
    const y = parseFloat(row.dataset.y);
    const id = row.dataset.id;

    const props = {
      series_id: row.dataset.series_id,
      status_color: row.dataset.status_color,
      status_text: row.dataset.status_text,
      percentil: row.dataset.percentil,
      tendencia: row.dataset.tendencia,
      aviso: row.dataset.aviso
    };
    row.querySelectorAll('td').forEach((td, i) => {
      const key = headers[i];
      const value = td.textContent.trim();
      props[key] = value;
    });

    return new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([x, y])),
      ...props,
      id: id
    });
  });

  return new ol.source.Vector({
    features: features
  });

}

async function queryWMSLayer(e, layer = wmsLayer, response_type = "tramos") {
  const view = map.getView();
  const viewResolution = view.getResolution();
  const wmsSource = layer.getSource();  // Your TileWMS or ImageWMS source

  const url = wmsSource.getFeatureInfoUrl(
    e.coordinate,
    viewResolution,
    view.getProjection(),
    {
      'INFO_FORMAT': 'application/json',
      'QUERY_LAYERS': 'public2:tramos_condicion_params'
    }
  );

  const response = await fetch(url)
  if (response) {
    data = await response.json()
    if (data && data.features && data.features.length) {
      feature = data.features[0]
      console.log(feature.properties)
      const props = feature.properties;
      props.condicion = (response_type == "tramos") ? props.condicion : (props.estado && props.estado != "normal") ? props.estado : ""
      const content = mapPopupContent(response_type, props)
      // `<span style="font-style: italic;">río: </span>${props.rio}<br><span style="font-style: italic;">${feature_type}: </span>${props.nombre}<br><strong>${condicion}</strong>`
      createModalContainer(content,(props.condicion) ? getStatusColor(props.condicion) : null)
    }
  }
}

function getStatusColor(condicion) {
  if (!condicion) {
    return "#ffffff"
  }
  if (condicion in status_colors) {
    return status_colors[condicion]
  } else {
    return "#ffffff"
  }
}

const status_colors = {
  "aguas altas": "#6fa8dc",
  "aguas medias altas": "#cfe2f3",
  "aguas medias": "#fff2cc",
  "aguas medias bajas": "#f6b26b",
  "aguas bajas": "#ea9999"
}

