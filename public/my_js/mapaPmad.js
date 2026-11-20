

function cargarMapaPmad(container) {

    // remove placeholder
    const placeholder = document.querySelector("#pmad-placeholder");
    if(placeholder) {
        placeholder.remove();
    }

    // instantiate leaflet map
    window.pmad_map = L.map(
        container,
        {
            scrollWheelZoom: false
        }).setView([-27.5, -56.5], 6);

    const mapContainer = window.pmad_map.getContainer();

    mapContainer.addEventListener('wheel', (event) => {
        // Check for Ctrl key (Windows/Linux) or Meta key (Mac)
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault(); // Prevent browser/page zoom
            
            if (event.deltaY < 0) {
            window.pmad_map.zoomIn();
            } else if (event.deltaY > 0) {
            window.pmad_map.zoomOut();
            }
        }
    }, { passive: false });

    // 2. Cargar el mapa base (argenmap)
     L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png', {
        attribution: '© IGN Argentina',
        maxZoom: 18
    }).addTo(window.pmad_map);

    const timestart = new Date()
    timestart.setDate(timestart.getDate() - 7)
    const timeend = new Date()
    const ts_formatted = timestart.toLocaleDateString('en-CA');
    const te_formatted = timeend.toLocaleDateString('en-CA');

    const VIEWPARAMS = `timeStart:${ts_formatted};timeEnd:${te_formatted};function:sum;sourceId:7`

    // cargar capa pmad (geoserver INA)
    const pmad_layer = L.tileLayer.wms('https://alerta.ina.gob.ar/geoserver/wms', {
        attribution: 'INA',
        maxZoom: 18,
        layers: "public2:timeseries_areal",
        VIEWPARAMS: VIEWPARAMS,
        transparent: true,
        opacity: 0.6
    }).addTo(window.pmad_map);

    // agrega iteraccion query wms
    window.pmad_map.on('click', async function (e) {
        const url = new URL(pmad_layer._url); 

        const params = {
            request: 'GetFeatureInfo',
            service: 'WMS',
            version: '1.1.1',
            layers: 'public2:timeseries_areal',
            query_layers: 'public2:timeseries_areal',
            VIEWPARAMS: VIEWPARAMS,
            styles: '',
            format: 'image/png',
            info_format: 'application/json',
            feature_count: 5,
            srs: 'EPSG:4326',
            bbox: window.pmad_map.getBounds().toBBoxString(),
            width: window.pmad_map.getSize().x,
            height: window.pmad_map.getSize().y,
            x: Math.round(window.pmad_map.latLngToContainerPoint(e.latlng).x),
            y: Math.round(window.pmad_map.latLngToContainerPoint(e.latlng).y)
        };

        Object.entries(params).forEach(([k, v]) => {
            url.searchParams.set(k, v);
        });
        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.features?.length) {
                const feature = data.features[0];

                const props = feature.properties;

                const timestart = (props.timestart) ? new Date(props.timestart).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }) : "-"

                const timeend = (props.timeend) ? new Date(props.timeend).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }) : "-"

                L.popup()
                    .setLatLng(e.latlng)
                    .setContent(`
                        <b>${props.nombre ?? 'área sin nombre'}</b><br>
                        Valor: ${props.suma ?? '-'}<br>
                        Inicio: ${timestart}<br>
                        Fin: ${timeend}
                    `)
                    .openOn(pmad_map);
            }
        } catch (err) {
            console.error('GetFeatureInfo error:', err);
        }
    })

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
        }).addTo(window.pmad_map);
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
        }).addTo(window.pmad_map);
    })
    .catch(err => console.error("Error cargando ríos:", err));

    // agrega leyenda

    try {
        const url = new URL(pmad_layer._url); 
        
        const legendImage = document.getElementById("map-viewer-legend-image");
        const legendUnavailable = document.getElementById("map-viewer-legend-unavailable");

        const legend_seach_params = {
            SERVICE: "WMS",
            VERSION: "1.1.1",
            REQUEST: "GetLegendGraphic",
            FORMAT: "image/png",
            LAYER: "public2:timeseries_areal",
            VIEWPARAMS: VIEWPARAMS,
            STYLES: "pmad_int_m"
        };
        const legend_query = new URLSearchParams(legend_seach_params);
        legendImage.hidden = false;
        legendUnavailable.hidden = true;
        legendImage.src = `${url}?${legend_query.toString()}`;
        document.getElementById("map-viewer-legend-title").textContent = "PMAD [mm]";
        
        const slider = document.getElementById('pmad-opacity-slider');

        // opacity slider event listener
        slider.addEventListener('input', (e) => {
            const newOpacity = parseFloat(e.target.value) / 100;
            pmad_layer.setOpacity(newOpacity);
        });

    } catch(e) {
        console.error("No se encontró la leyenda de PMAD")
    }
}
