const regiones = [
    {
        "id": "alto-parana",
        "titulo": "Alto Paraná",
        "coords": [-20, -50],
        "zoom": 6
    },
    {
        "id": "iguazu",
        "titulo": "Iguazú",
        "coords": [-25, -50],
        "zoom": 7
    },
    {
        "id": "parana-medio",
        "titulo": "Paraná Medio",
        "coords": [-27, -55],
        "zoom": 7
    },
    {
        "id": "paraguay",
        "titulo": "Paraguay",
        "coords": [-25, -57],
        "zoom": 6
    }
]


function cargarMapaPmad(container) {
    var pmad_map = L.map(
        container,
        {
            scrollWheelZoom: false
        }).setView([-27.5, -56.5], 6);

    const mapContainer = pmad_map.getContainer();

    mapContainer.addEventListener('wheel', (event) => {
        // Check for Ctrl key (Windows/Linux) or Meta key (Mac)
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault(); // Prevent browser/page zoom
            
            if (event.deltaY < 0) {
            pmad_map.zoomIn();
            } else if (event.deltaY > 0) {
            pmad_map.zoomOut();
            }
        }
    }, { passive: false });

    // 2. Cargar el mapa base (argenmap)
     L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png', {
        attribution: '© IGN Argentina',
        maxZoom: 18
    }).addTo(pmad_map);

    const timestart = new Date()
    timestart.setDate(timestart.getDate() - 7)
    const timeend = new Date()
    const ts_formatted = timestart.toLocaleDateString('en-CA');
    const te_formatted = timeend.toLocaleDateString('en-CA');

    // cargar capa pmad (geoserver INA)
    const pmad_layer = L.tileLayer.wms('https://alerta.ina.gob.ar/geoserver/wms', {
        attribution: 'INA',
        maxZoom: 18,
        layers: "public2:timeseries_areal",
        VIEWPARAMS: `timeStart:${ts_formatted};timeEnd:${te_formatted};function:sum;sourceId:7`,
        transparent: true,
        opacity: 0.6
    }).addTo(pmad_map);

    // 3. Cargar el GeoJSON de las Cuencas
    fetch('geojson/ccas.geojson')
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: function (feature) {
                    // let nombreCuenca = feature.properties.nombre; 
                        return {
                            color: "#000000", 
                            weight: 2,        
                            fillColor: null, 
                            fillOpacity: 0
                        };
                    }
                }).addTo(pmad_map);
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
                }).addTo(pmad_map);
            })
            .catch(err => console.error("Error cargando ríos:", err));

    // set default view
    pmad_map.setView(regiones[0].coords, regiones[0].zoom);
    document.querySelectorAll(".pmad-text").forEach(element => {
        element.style.display = "none";
    })
    document.getElementById(regiones[0].id).style.display ="block";
    pmad_map.invalidateSize()

    // select view event listener
    document.getElementById('pmad-view-select').addEventListener('change', (e) => {
        const region = regiones[e.target.value];
        pmad_map.setView(region.coords, region.zoom);
        document.querySelectorAll(".pmad-text").forEach(element => {
            element.style.display = "none";
        })
        document.getElementById(region.id).style.display = "block";
        pmad_map.invalidateSize()
    });

    const slider = document.getElementById('pmad-opacity-slider');

    // opacity slider event listener
    slider.addEventListener('input', (e) => {
        const newOpacity = parseFloat(e.target.value) / 100;
        pmad_layer.setOpacity(newOpacity);
    });
}
cargarMapaPmad("mapa_pmad")