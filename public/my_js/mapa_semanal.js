// --- FUNCIÓN DE COLORES PARA LAS CUENCAS ---
function getColorCuenca(nombre) {
    switch (nombre) {
        case 'Parana':
            return '#e6ccff';    // Violeta
        case 'Paraguay':
            return '#ffcce6';    // Rosa
        case 'Uruguay':
            return '#ccffcc';    // Verde
        case 'Iguazu':
            return '#cce6ff';    // Celeste
        case 'Aportes Estuario Margen Izquierdo':
            return '#ffebb3';    // Naranja
        case 'Alto Paraná':
            return '#d5e8d4';    // Verde grisáceo
        case 'Paraná en Territorio Argentino':
            return '#fff2cc';    // Amarillo
        case 'Aportes Paraná Margen Derecha':
            return '#f8cecc';    // Coral
        case 'Paraná Tramo Argentino - Paraguayo':
            return '#dae8fc';    // Azul
        default:
            return '#cccccc';    // Gris por defecto para cuencas sin nombre
    }
}


function cargarMapaCaudales() {
    var map = L.map(
        'mapa',{
        scrollWheelZoom: false
    }).setView([-27.9, -55.9], 7);

    const mapContainer = map.getContainer();

    mapContainer.addEventListener('wheel', (event) => {
        // Check for Ctrl key (Windows/Linux) or Meta key (Mac)
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault(); // Prevent browser/page zoom
            
            if (event.deltaY < 0) {
            map.zoomIn();
            } else if (event.deltaY > 0) {
            map.zoomOut();
            }
        }
    }, { passive: false });

    // 2. Cargar el mapa base https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/5/9/9.png
    L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png', {
    // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© IGN Argentina',
        maxZoom: 18
    }).addTo(map);



    // 3. Cargar el GeoJSON de las Cuencas
    fetch('geojson/ccas.geojson')
        .then(response => response.json())
        .then(data => {
            L.geoJSON(data, {
                style: function (feature) {
                    let nombreCuenca = feature.properties.nombre;

                    return {
                        color: "#555555",
                        weight: 1,
                        fillColor: getColorCuenca(nombreCuenca),
                        fillOpacity: 0.5
                    };
                }
            }).addTo(map);
        })
        .catch(err => console.error("Error cargando cuencas:", err));

    // 4. Cargar el GeoJSON de los Ríos Principales
    fetch('geojson/rios.geojson')
        .then(response => response.json())
        .then(data => {
            L.geoJSON(data, {
                style: function (feature) {
                    return {
                        color: "#0033cc",
                        weight: 2,
                        opacity: 0.8
                    };
                }
            }).addTo(map);
        })
        .catch(err => console.error("Error cargando ríos:", err));

    // 5. Coordenadas
    const coordenadas = {
        "paraguay": [-25.3249, -57.6719],      // Asuncion
        "corrientes": [-27.4667, -58.8333],    // Corrientes
        "yacyreta": [-27.4833, -56.7333],      // Yacyretá
        "salto_grande": [-31.2667, -57.9333],  // Represa Salto Grande
        "itaipu": [-25.4000, -54.5833],        // Represa Itaipú
        "iguazu": [-25.6069, -53.7977],        // Andresito
        "alto_uruguay": [-27.2833, -54.2000]   // El Soberbio
    };

    const label_options = {
        "paraguay": {direction: "left",offset: [-30, 20]},      // Asuncion
        "corrientes": {direction: "top",offset: [-30, 0]},    // Corrientes
        "yacyreta": {direction: "bottom",offset: [0, 30]},      // Yacyretá
        "salto_grande": {direction: "right",offset: [5, -20]},  // Represa Salto Grande
        "itaipu": {direction: "top",offset: [-30, 0]},        // Represa Itaipú
        "iguazu": {direction: "bottom",offset: [20, 30]},        // Andresito
        "alto_uruguay": {direction: "bottom",offset: [0, 30]}
    }

    // 6. Cargar los datos dinámicos desde el JSON
    fetch('json/datos_mapa_semanal.json')
        .then(response => response.json())
        .then(datosSemana => {

            if (datosSemana.fecha) {
                let fechaDiv = document.createElement('div');
                fechaDiv.className = 'fecha-box';
                fechaDiv.innerHTML = datosSemana.fecha;
                document.getElementById("mapa").appendChild(fechaDiv);
            }

            // Generar los marcadores
            for (const [clave, coord] of Object.entries(coordenadas)) {
                if (datosSemana[clave]) {
                    let textoHTML = datosSemana[clave].replace(/\n/g, '<br>');
                    let titulo = clave.replace("_", " ").toUpperCase();

                    let contenidoPopup = `<b>${titulo}</b><br>${textoHTML}`;

                    let direction = (label_options[clave]) ? label_options[clave].direction : 'right'

                    let offset = (label_options[clave]) ? L.point(label_options[clave].offset[0], label_options[clave].offset[1]) : L.point(10, -20)

                    L.marker(coord).addTo(map).bindTooltip(
                        contenidoPopup,
                        {
                            permanent: true,
                            direction: direction,
                            offset: offset, // [x, y] pixel shift
                            className: 'info-estacion'
                        });
                }
            }
        })
        .catch(err => console.error("Error cargando el JSON de datos:", err));
}

cargarMapaCaudales()