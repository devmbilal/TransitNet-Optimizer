let map;
let routeLayers = {};
let mobilityLayer = null;
let selectedMobilityNodes = new Set();
let mobilityMatrix = null;
let mobilityNodesData = [];

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet map
  map = L.map('map').setView([33.6844, 73.0479], 13); // Default to Islamabad
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  console.log('Map initialized'); // Debug log

  // Initialize mobilityCoord div with default message
  const mobilityCoordDiv = document.getElementById('mobilityCoord');
  if (mobilityCoordDiv) {
    mobilityCoordDiv.innerHTML = '<p class="text-muted">No mobility file available. Please select a region.</p>';
  } else {
    console.error('mobilityCoord div not found');
  }
});

function fetchFiles(region) {
  const transportFilesDiv = document.getElementById('transportFiles');
  const mobilityCoordDiv = document.getElementById('mobilityCoord');
  const mobilityMatrixSelect = document.getElementById('mobilityMatrixSelect');

  if (!transportFilesDiv || !mobilityCoordDiv || !mobilityMatrixSelect) {
    console.error('One or more DOM elements not found:', { transportFilesDiv, mobilityCoordDiv, mobilityMatrixSelect });
    return;
  }

  if (!region) {
    transportFilesDiv.innerHTML = `
      <h6 class="mt-0 fw-bold">Public Routes</h6>
      <p class="text-muted">No transport files available. Please select a region.</p>
      <h6 class="mt-3 fw-bold">Mobility Nodes</h6>
      <div id="mobilityCoord" class="overflow-auto" style="max-height: 150px; width: 100%">
        <p class="text-muted">No mobility file available. Please select a region.</p>
      </div>
    `;
    mobilityMatrixSelect.innerHTML = '<option value="" selected disabled>Choose a mobility file...</option>';
    updateDistanceInfo();
    return;
  }

  console.log('Fetching files for region:', region); // Debug log
  fetch(`/visualization/files?region=${region}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Fetched data:', data); // Debug log
      if (data.success) {
        transportFilesDiv.innerHTML = `
          <h6 class="mt-0 fw-bold">Public Routes</h6>
          ${data.files.transportFiles && data.files.transportFiles.length > 0 ? 
            data.files.transportFiles.map((file, index) => `
              <div class="form-check mb-2 w-100">
                <input class="form-check-input route-checkbox" type="checkbox" id="route${index}" data-file="${file.fileName}" data-color="${['#FF0000', '#0000FF', '#008000', '#800080', '#FFA500', '#00CED1', '#FF4500', '#FFD700', '#6A5ACD', '#20B2AA', '#DC143C', '#32CD32', '#9932CC', '#FF69B4', '#00FF7F', '#4682B4', '#DAA520', '#8B008B', '#ADFF2F', '#4169E1'][index % 20]}" onchange="toggleRoute(this)" />
                <label class="form-check-label w-100" for="route${index}">${file.fileName}</label>
              </div>
            `).join('') : '<p class="text-muted">No transport files available.</p>'}
          <h6 class="mt-3 fw-bold">Mobility Nodes</h6>
          <div id="mobilityCoord" class="overflow-auto" style="max-height: 150px; width: 100%">
            ${data.files.mobilityFile ? `
              <div class="form-check mb-2 w-100">
                <input class="form-check-input mobility-checkbox" type="checkbox" id="mobility" data-file="${data.files.mobilityFile.fileName}" onchange="toggleMobility(this)" />
                <label class="form-check-label w-100" for="mobility">${data.files.mobilityFile.fileName}</label>
              </div>
            ` : '<p class="text-muted">No mobility file available.</p>'}
          </div>
        `;
        mobilityMatrixSelect.innerHTML = '<option value="" selected disabled>Choose a mobility file...</option>';
        if (data.files.mobilityMatrixFiles && data.files.mobilityMatrixFiles.length > 0) {
          data.files.mobilityMatrixFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file.fileName;
            option.textContent = file.fileName;
            mobilityMatrixSelect.appendChild(option);
          });
        }
        map.setView(getRegionCenter(region), 13);
      } else {
        console.error('Fetch failed:', data.message);
      }
    })
    .catch(error => console.error('Error fetching files:', error));
}

function loadMobilityMatrix(fileName) {
  if (!fileName) {
    mobilityMatrix = null;
    updateDistanceInfo();
    return;
  }
  const region = document.getElementById('regionSelect').value;
  fetch(`/visualization/mobility-matrix?fileName=${encodeURIComponent(fileName)}&region=${encodeURIComponent(region)}`)
    .then(response => {
      console.log('Response status:', response.status); // Log status code
      console.log('Response text:', response.statusText); // Log status text
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        // Convert the array of objects into a nested object for easier lookup
        const matrix = {};
        data.matrix.forEach(row => {
          const homeArea = row.HOME_AREA;
          matrix[homeArea] = {};
          Object.keys(row).forEach(key => {
            if (key !== 'HOME_AREA') {
              matrix[homeArea][key] = row[key] === "" ? "0" : row[key]; // Handle empty strings as 0
            }
          });
        });
        mobilityMatrix = matrix;
        console.log('Transformed mobilityMatrix:', mobilityMatrix); // Debug log
        updateDistanceInfo([...selectedMobilityNodes]);
      } else {
        console.error('Failed to load matrix:', data.message);
      }
    })
    .catch(error => console.error('Error loading mobility matrix:', error));
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
        }
      });
  } else {
    if (routeLayers[fileName]) {
      map.removeLayer(routeLayers[fileName]);
      delete routeLayers[fileName];
    }
  }
}

function toggleMobility(checkbox) {
  const fileName = checkbox.getAttribute('data-file');
  const region = document.getElementById('regionSelect').value;

  if (checkbox.checked) {
    fetch(`/visualization/mobility?fileName=${encodeURIComponent(fileName)}&region=${encodeURIComponent(region)}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.nodes && data.nodes.length > 0) {
          mobilityNodesData = data.nodes.map(node => {
            const lat = parseFloat(node.latitude);
            const lng = parseFloat(node.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            return { lat, lng, area: node.area };
          }).filter(node => node !== null);

          if (mobilityLayer) map.removeLayer(mobilityLayer);

          mobilityLayer = L.layerGroup();
          mobilityNodesData.forEach(node => {
            const marker = L.circleMarker([node.lat, node.lng], {
              radius: 10,
              fillColor: '#FF5733',
              color: '#FF5733',
              fillOpacity: 0.7,
              weight: 2
            })
              .bindPopup(`Area: ${node.area}<br>Lat: ${node.lat}<br>Lng: ${node.lng}`);
            marker.nodeArea = node.area;
            marker.on('click', () => selectMobilityNode(marker, node));
            marker.addTo(mobilityLayer);
          });

          if (mobilityNodesData.length > 0) {
            mobilityLayer.addTo(map);
            map.fitBounds(mobilityLayer.getBounds());
          }
        }
      });
  } else {
    if (mobilityLayer) {
      map.removeLayer(mobilityLayer);
      mobilityLayer = null;
      selectedMobilityNodes.clear();
      mobilityNodesData = [];
      updateDistanceInfo();
    }
  }
}

function selectMobilityNode(marker, node) {
  if (selectedMobilityNodes.has(node.area)) {
    selectedMobilityNodes.delete(node.area);
    marker.setStyle({ fillColor: '#FF5733', color: '#FF5733' });
  } else {
    if (selectedMobilityNodes.size >= 2) {
      alert('You can only select up to 2 mobility nodes at a time.');
      return;
    }
    selectedMobilityNodes.add(node.area);
    marker.setStyle({ fillColor: '#00FF00', color: '#00FF00' });
  }

  if (selectedMobilityNodes.size === 2) {
    calculateMetrics([...selectedMobilityNodes]);
  } else {
    updateDistanceInfo([...selectedMobilityNodes]);
  }
}

function calculateMetrics(nodes) {
  if (nodes.length !== 2) return;

  const [node1, node2] = nodes;
  const node1Data = mobilityNodesData.find(n => n.area === node1);
  const node2Data = mobilityNodesData.find(n => n.area === node2);
  if (!node1Data || !node2Data) {
    console.error('Node data not found:', { node1, node2, mobilityNodesData });
    return;
  }

  const lat1 = node1Data.lat;
  const lon1 = node1Data.lng;
  const lat2 = node2Data.lat;
  const lon2 = node2Data.lng;

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDist = R * c;

  let mobilityPercentage = 'N/A';
  if (mobilityMatrix) {
    console.log('Checking mobilityMatrix for:', { node1, node2, mobilityMatrix }); // Debug log
    if (mobilityMatrix[node1] && mobilityMatrix[node1][node2] !== undefined) {
      mobilityPercentage = parseFloat(mobilityMatrix[node1][node2]) * 100; // Convert to percentage
    } else if (mobilityMatrix[node2] && mobilityMatrix[node2][node1] !== undefined) {
      mobilityPercentage = parseFloat(mobilityMatrix[node2][node1]) * 100; // Convert to percentage
    } else {
      console.warn('No mobility data found for:', { node1, node2 });
    }
  }

  getGoogleDistance(lat1, lon1, lat2, lon2).then(googleDist => {
    updateDistanceInfo(nodes, mobilityPercentage, googleDist, directDist.toFixed(2));
  });
}

async function getGoogleDistance(lat1, lon1, lat2, lon2) {
  const apiKey = "5b3ce3597851110001cf624887d2455f8705477789fba235d303e0db"; // Replace with your ORS API Key
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.features[0].properties.segments[0].distance / 1000; // Convert to km
  } catch (error) {
    console.error('Error fetching Google distance:', error);
    return 'N/A';
  }
}

function updateDistanceInfo(nodes = [], mobilityPercentage = 'N/A', googleDist = 'N/A', directDist = 'N/A') {
  const selectedNodesSpan = document.getElementById('selectedNodes');
  const mobilityPercentageSpan = document.getElementById('mobilityPercentage');
  const googleDistanceSpan = document.getElementById('googleDistance');
  const directDistanceSpan = document.getElementById('directDistance');

  selectedNodesSpan.textContent = nodes.length > 0 ? nodes.join(' and ') : 'None';
  mobilityPercentageSpan.textContent = mobilityPercentage !== 'N/A' ? `${mobilityPercentage}%` : 'N/A';
  googleDistanceSpan.textContent = googleDist !== 'N/A' ? `${googleDist.toFixed(2)} km` : 'N/A';
  directDistanceSpan.textContent = directDist !== 'N/A' ? `${directDist} km` : 'N/A';
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

function getRegionCenter(region) {
  const centers = {
    'Islamabad': [33.6844, 73.0479],
    'Lahore': [31.5204, 74.3587],
    'Karachi': [24.8607, 67.0011],
    'Rawalpindi': [33.5651, 73.0169],
    'Faisalabad': [31.4504, 73.1350]
  };
  return centers[region] || [33.6844, 73.0479];
}