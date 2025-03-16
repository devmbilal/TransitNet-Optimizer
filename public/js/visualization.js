let map;
let routeLayers = {};
let mobilityLayer = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet map
  map = L.map('map').setView([33.6844, 73.0479], 13); // Default to Islamabad
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Initialize mobilityCoord div with default message when no region is selected
  const mobilityCoordDiv = document.getElementById('mobilityCoord');
  mobilityCoordDiv.innerHTML = `
    <p class="text-muted">No mobility file available.</p>
  `;
});

function fetchFiles(region) {
  const transportFilesDiv = document.getElementById('transportFiles');
  const mobilityCoordDiv = document.getElementById('mobilityCoord');

  // If no region is selected, show the default message
  if (!region) {
    transportFilesDiv.innerHTML = `
      <h6 class="mt-0  fw-bold">Public Routes</h6>
      <p class="text-muted">No transport files available. Please select a region.</p>
      <h6 class="mt-3  fw-bold">Mobility Nodes</h6>
      <div id="mobilityCoord" class="overflow-auto" style="max-height: 150px; width: 100%">
        <p class="text-muted">No mobility file available. Please select a region.</p>
      </div>
    `;
    return; // Exit the function early
  }

  fetch(`/visualization/files?region=${region}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Update Public Routes section (preserve heading)
        transportFilesDiv.innerHTML = `
          <h6 class="mt-0 fw-bold">Public Routes</h6>
          ${data.files.transportFiles.length > 0 ? 
            data.files.transportFiles.map((file, index) => `
              <div class="form-check mb-2 w-100">
                <input 
                  class="form-check-input route-checkbox" 
                  type="checkbox" 
                  id="route${index}" 
                  data-file="${file.fileName}" 
                  data-color="${['#FF0000', '#0000FF', '#008000', '#800080', '#FFA500', '#00CED1', '#FF4500', '#FFD700', '#6A5ACD', '#20B2AA', '#DC143C', '#32CD32', '#9932CC', '#FF69B4', '#00FF7F', '#4682B4', '#DAA520', '#8B008B', '#ADFF2F', '#4169E1'][index % 20]}" 
                  onchange="toggleRoute(this)"
                />
                <label class="form-check-label w-100" for="route${index}">${file.fileName}</label>
              </div>
            `).join('') : 
            '<p class="text-muted">No transport files available.</p>'
          }
          <h6 class="mt-3 fw-bold">Mobility Nodes</h6>
          <div id="mobilityCoord" class="overflow-auto" style="max-height: 150px; width: 100%">
            ${data.files.mobilityFile ? `
              <div class="form-check mb-2 w-100">
                <input class="form-check-input mobility-checkbox" type="checkbox" id="mobility" data-file="${data.files.mobilityFile.fileName}" onchange="toggleMobility(this)" />
                <label class="form-check-label w-100" for="mobility">${data.files.mobilityFile.fileName}</label>
              </div>
            ` : `
              <p class="text-muted">No mobility file available.</p>
            `}
          </div>
        `;
        map.setView(getRegionCenter(region), 13);
      }
    })
    .catch(error => console.error('Error fetching files:', error));
}

// Rest of the functions remain unchanged
function toggleRoute(checkbox) {
  const fileName = checkbox.getAttribute('data-file');
  const color = checkbox.getAttribute('data-color');
  const region = document.getElementById('regionSelect').value;

  if (checkbox.checked) {
    fetch(`/visualization/route?fileName=${fileName}&region=${region}`)
      .then(response => response.json())
      .then(async (data) => {
        if (data.success) {
          const layerGroup = L.layerGroup();
          const stops = data.stops.map(stop => ({
            lat: parseFloat(stop.latitude),
            lng: parseFloat(stop.longitude),
            name: stop['Stop Name']
          }));

          const routeCoordinates = await getRoutePath(stops);
          const polyline = L.polyline(routeCoordinates, { color })
            .bindPopup(`Route: ${fileName.replace('.csv', '')}`)
            .addTo(layerGroup);

          stops.forEach(stop => {
            L.circleMarker([stop.lat, stop.lng], { color, radius: 5, fillOpacity: 0.8 })
              .bindPopup(`Stop: ${stop.name}<br>Lat: ${stop.lat}<br>Lng: ${stop.lng}`)
              .addTo(layerGroup);
          });

          layerGroup.addTo(map);
          routeLayers[fileName] = layerGroup;
          map.fitBounds(polyline.getBounds());
        } else {
          console.error(data.message);
        }
      });
  } else {
    if (routeLayers[fileName]) {
      map.removeLayer(routeLayers[fileName]);
      delete routeLayers[fileName];
    }
  }
}

async function getRoutePath(stops) {
  const apiKey = "5b3ce3597851110001cf624887d2455f8705477789fba235d303e0db"; // Replace with your ORS API Key
  let coordinates = stops.map(stop => [stop.lng, stop.lat]);

  const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coordinates: coordinates,
        format: "geojson"
      })
    });

    const data = await response.json();

    if (data && data.features && data.features.length > 0) {
      return data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
    } else {
      console.error("Error fetching route from ORS:", data);
      return stops.map(s => [s.lat, s.lng]);
    }
  } catch (error) {
    console.error("Failed to fetch ORS route:", error);
    return stops.map(s => [s.lat, s.lng]);
  }
}

function toggleMobility(checkbox) {
  const fileName = checkbox.getAttribute('data-file');
  const region = document.getElementById('regionSelect').value;

  if (checkbox.checked) {
    fetch(`/visualization/mobility?fileName=${encodeURIComponent(fileName)}&region=${encodeURIComponent(region)}`)
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.success && data.nodes && data.nodes.length > 0) {
          const nodes = data.nodes.map(node => {
            const lat = parseFloat(node.latitude);
            const lng = parseFloat(node.longitude);
            if (isNaN(lat) || isNaN(lng)) {
              console.warn(`Invalid coordinates for area ${node.area}: lat=${node.latitude}, lng=${node.longitude}`);
              return null;
            }
            return {
              lat,
              lng,
              area: node.area
            };
          }).filter(node => node !== null);

          if (mobilityLayer) {
            map.removeLayer(mobilityLayer);
          }

          mobilityLayer = L.layerGroup();
          nodes.forEach(node => {
            const marker = L.circleMarker([node.lat, node.lng], {
              radius: 10,
              fillColor: '#FF5733',
              color: '#FF5733',
              fillOpacity: 0.7,
              weight: 2
            })
              .bindPopup(`Area: ${node.area}<br>Lat: ${node.lat}<br>Lng: ${node.lng}`);
            marker.addTo(mobilityLayer);
          });

          if (nodes.length > 0) {
            mobilityLayer.addTo(map);
            map.fitBounds(mobilityLayer.getBounds());
          }
        } else {
          console.error('Failed to load mobility data:', data.message || 'No nodes found');
        }
      })
      .catch(error => console.error('Error fetching or rendering mobility data:', error));
  } else {
    if (mobilityLayer) {
      map.removeLayer(mobilityLayer);
      mobilityLayer = null;
    }
  }
}

function getRegionCenter(region) {
  const centers = {
    'Islamabad': [33.6844, 73.0479],
    'Lahore': [31.5204, 74.3587],
    'Karachi': [24.8607, 67.0011],
    'Rawalpindi': [33.5651, 73.0169],
    'Faisalabad': [31.4504, 73.1350]
  };
  return centers[region] || [33.6844, 73.0479]; // Default to Islamabad
}