let map;
let routeLayers = {}; // Store route layer groups (polyline + markers)

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet map
  map = L.map('map').setView([33.6844, 73.0479], 13); // Default to Islamabad
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
});

function fetchFiles(region) {
  fetch(`/visualization/files?region=${region}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const transportFilesDiv = document.getElementById('transportFiles');
        transportFilesDiv.innerHTML = `
          
          ${data.files.transportFiles.length > 0 ? 
            data.files.transportFiles.map((file, index) => `
              <div class="form-check mb-2">
                <input 
                  class="form-check-input route-checkbox" 
                  type="checkbox" 
                  id="route${index}" 
                  data-file="${file.fileName}" 
                  data-color="${['#FF0000', '#0000FF', '#008000', '#800080', '#FFA500', '#00CED1', '#FF4500', '#FFD700', '#6A5ACD', '#20B2AA', '#DC143C', '#32CD32', '#9932CC', '#FF69B4', '#00FF7F', '#4682B4', '#DAA520', '#8B008B', '#ADFF2F', '#4169E1'][index % 20]}" 
                  onchange="toggleRoute(this)"
                />
                <label class="form-check-label" for="route${index}">${file.fileName}</label>
              </div>
            `).join('') : 
            '<p class="text-muted">No transport files available.</p>'
          } 
        `;
        map.setView(getRegionCenter(region), 13);
      } else {
        console.error(data.message);
      }
    })
    .catch(error => console.error('Error fetching files:', error));
}

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

          // Fetch and draw road-following route instead of direct lines
          const routeCoordinates = await getRoutePath(stops);
          const polyline = L.polyline(routeCoordinates, { color })
            .bindPopup(`Route: ${fileName.replace('.csv', '')}`)
            .addTo(layerGroup);

          // Add stop markers
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
  const apiKey = process.env.ORS_KEY;
  let coordinates = stops.map(stop => [stop.lng, stop.lat]); // ORS expects [lng, lat]

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
      return data.features[0].geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert back to [lat, lng]
    } else {
      console.error("Error fetching route from ORS:", data);
      return stops.map(s => [s.lat, s.lng]); // Fallback to straight lines if ORS fails
    }
  } catch (error) {
    console.error("Failed to fetch ORS route:", error);
    return stops.map(s => [s.lat, s.lng]); // Fallback
  }
}

function toggleMobility(checkbox) {
  console.log(`${checkbox.getAttribute('data-file')} mobility ${checkbox.checked ? 'enabled' : 'disabled'}`);
}

function applyFilters() {
  const distanceChecked = document.getElementById('distance').checked;
  const region = document.getElementById('regionSelect').value;
  
  if (distanceChecked) {
    document.querySelectorAll('.route-checkbox:checked').forEach(checkbox => {
      const fileName = checkbox.getAttribute('data-file');
      fetch(`/visualization/distance?fileName=${fileName}&region=${region}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`${fileName} distance: ${data.distance} km`);
            // Optionally add to map popup in future
          } else {
            console.error(data.message);
          }
        });
    });
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