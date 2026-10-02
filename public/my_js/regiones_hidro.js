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
    },
    {
        "id": "parana-inferior",
        "titulo": "Paraná Inferior",
        "coords": [-30, -57],
        "zoom": 6
    },
    {
        "id": "uruguay",
        "titulo": "Uruguay",
        "coords": [-28, -53],
        "zoom": 6
    }
]


function selectRegion(index, focusTablist) {
    const region = regiones[index];
    if (!region) return;

    document.querySelectorAll(".pmad-tab").forEach(tab => {
        const selected = Number(tab.dataset.regionIndex) === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
    });

    if (focusTablist) {
        const focusTab = focusTablist.querySelector(`[data-region-index="${index}"]`);
        if (focusTab) focusTab.focus();
    }

    if (window.pmad_map) {
        window.pmad_map.setView(region.coords, region.zoom)
    }
    document.querySelectorAll(".pmad-text").forEach(element => {
        element.hidden = true;
    });
    const textPanel = document.getElementById(`pmad-${region.id}`);
    if (textPanel) textPanel.hidden = false;

    if(window.pmad_map) {
        window.pmad_map.invalidateSize()
    }
    document.querySelectorAll(".region-hidro").forEach(element => {
        element.hidden = true;
    })
    const hydroPanel = document.getElementById(`hidro-${region.id}`);
    if (hydroPanel) hydroPanel.hidden = false;
}

function setupTabs() {
    document.querySelectorAll(".pmad-tabs").forEach(tablist => {
        const tabs = Array.from(tablist.querySelectorAll(".pmad-tab"));
        tabs.forEach(tab => {
            const index = Number(tab.dataset.regionIndex);
            tab.addEventListener("click", () => selectRegion(index));
            tab.addEventListener("keydown", event => {
                let nextIndex;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % regiones.length;
                else if (event.key === "ArrowLeft") nextIndex = (index - 1 + regiones.length) % regiones.length;
                else if (event.key === "Home") nextIndex = 0;
                else if (event.key === "End") nextIndex = regiones.length - 1;
                else return;

                event.preventDefault();
                selectRegion(nextIndex, tablist);
            });
        });
    });

    selectRegion(0);
}