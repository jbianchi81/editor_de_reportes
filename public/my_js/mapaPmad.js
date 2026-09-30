function cargarMapaPmad(container) {
    var map = L.map(container).setView([-27.5, -56.5], 6);

    // 2. Cargar el mapa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    const timestart = new Date()
    timestart.setDate(timestart.getDate() - 7)
    const timeend = new Date()
    const ts_formatted = timestart.toLocaleDateString('en-CA');
    const te_formatted = timeend.toLocaleDateString('en-CA');

    L.tileLayer.wms('https://alerta.ina.gob.ar/geoserver/wms', {
        attribution: 'INA',
        maxZoom: 18,
        layers: "public2:timeseries_areal",
        VIEWPARAMS: `timeStart:${ts_formatted};timeEnd:${te_formatted};function:sum;sourceId:7`
    }).addTo(map);

    // 3. Cargar el GeoJSON de las Cuencas
    fetch('geojson/ccas.geojson')
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: function (feature) {
                    // let nombreCuenca = feature.properties.nombre; 
                        return {
                            color: "#555555", 
                            weight: 1,        
                            fillColor: null, 
                            fillOpacity: 0
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
}
cargarMapaPmad("mapa_pmad")