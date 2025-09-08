let map;
let routeLayers = {};
let mobilityLayer = null;
let selectedMobilityNodes = new Set();
let mobilityMatrix = null;
let mobilityNodesData = [];
let ptEncodingLayer = null;
let ptEncodingEnabled = false;
let loadedRoutes = new Map(); // Track loaded route data
// Layout variables removed
let allRoutesChecked = false;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet map with a slight delay to ensure container is ready
  setTimeout(() => {
    map = L.map('map').setView([33.6844, 73.0479], 13); // Default to Islamabad
    initializeMap();
  }, 100);
});

function initializeMap() {

  // Define tile layers for different views
  var earthView = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var satelliteView = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  });

  var openCycleMap = L.tileLayer('https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var transportView = L.tileLayer('https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var landscapeView = L.tileLayer('https://tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var outdoorsView = L.tileLayer('https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var transportDarkView = L.tileLayer('https://tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var spinalMapView = L.tileLayer('https://tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var pioneerView = L.tileLayer('https://tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var mobileAtlasView = L.tileLayer('https://tile.thunderforest.com/mobile-atlas/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var neighbourhoodView = L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  var atlasView = L.tileLayer('https://tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
    maxZoom: 22,
    attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });

  // Add the default layer (Earth view) to the map
  earthView.addTo(map);

  // Create a FeatureGroup to store drawn shapes
  var drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // Initialize the Draw Control with options for drawing tools
  var drawControl = new L.Control.Draw({
    draw: {
      polyline: true,    // Enable polyline drawing
      polygon: true,     // Enable polygon drawing
      rectangle: true,   // Enable rectangle drawing
      circle: true,      // Enable circle drawing
      marker: true,      // Enable marker drawing
      circlemarker: false // Disable circlemarker
    },
    edit: {
      featureGroup: drawnItems, // Allow editing of drawn shapes
      remove: true             // Enable deleting shapes
    }
  });

  // Add the Draw Control to the map
  map.addControl(drawControl);

  // Add Layer Control to switch between views
  var baseMaps = {
    "Earth View": earthView,
    "Satellite View": satelliteView,
    "OpenCycleMap": openCycleMap,
    "Transport View": transportView,
    "Landscape View": landscapeView,
    "Outdoors View": outdoorsView,
    "Transport Dark View": transportDarkView,
    "Spinal Map View": spinalMapView,
    "Pioneer View": pioneerView,
    "Mobile Atlas View": mobileAtlasView,
    "Neighbourhood View": neighbourhoodView,
    "Atlas View": atlasView
  };
  L.control.layers(baseMaps, null, { collapsed: false }).addTo(map); // Set collapsed: false to show the control open by default

  // Event listener for when a shape is created
  map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;
    drawnItems.addLayer(layer); // Add the drawn shape to the map
  });

  console.log('Map initialized'); // Debug log
}

function fetchFiles(region) {
  const transportRoutesContainer = document.getElementById('transportRoutesContainer');
  const mobilityNodesContainer = document.getElementById('mobilityNodesContainer');
  const mobilityMatrixSelect = document.getElementById('mobilityMatrixSelect');

  if (!transportRoutesContainer || !mobilityNodesContainer || !mobilityMatrixSelect) {
    console.error('One or more DOM elements not found');
    return;
  }

  if (!region) {
    transportRoutesContainer.innerHTML = `
      <div class="text-muted text-center py-3">
        <i class="bi bi-info-circle"></i> Select a region to load routes
      </div>
    `;
    mobilityNodesContainer.innerHTML = `
      <div class="text-muted text-center py-3">
        <i class="bi bi-info-circle"></i> Select a region to load mobility areas
      </div>
    `;
    mobilityMatrixSelect.innerHTML = '<option value="" selected disabled>Choose matrix file...</option>';
    updateDistanceInfo();
    updateAreaEncodingButton();
    return;
  }

  // Show loading state
  transportRoutesContainer.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
      <div class="small mt-1">Loading routes...</div>
    </div>
  `;
  mobilityNodesContainer.innerHTML = `
    <div class="text-center py-3">
      <div class="spinner-border spinner-border-sm text-success" role="status"></div>
      <div class="small mt-1">Loading areas...</div>
    </div>
  `;

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
        // Helper function to clean file names
        const cleanFileName = (fileName) => {
          return fileName.replace(/\.csv$/i, '').replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        };

        // Professional color scheme for routes
        const routeColors = [
          '#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12', 
          '#1ABC9C', '#E67E22', '#34495E', '#8E44AD', '#27AE60',
          '#D35400', '#2980B9', '#C0392B', '#16A085', '#F1C40F'
        ];

        // Update transport routes
        if (data.files.transportFiles && data.files.transportFiles.length > 0) {
          transportRoutesContainer.innerHTML = data.files.transportFiles.map((file, index) => `
            <div class="form-check mb-2">
              <input 
                class="form-check-input route-checkbox" 
                type="checkbox" 
                id="route${index}" 
                data-file="${file.fileName}" 
                data-color="${routeColors[index % routeColors.length]}" 
                onchange="toggleRoute(this); updateCheckAllButton();" 
              />
              <label class="form-check-label fw-medium" for="route${index}">
                <span class="route-color-indicator d-inline-block me-2" 
                      style="width: 12px; height: 12px; background-color: ${routeColors[index % routeColors.length]}; border-radius: 2px;"></span>
                ${cleanFileName(file.fileName)}
              </label>
            </div>
          `).join('');
          
          // Show Check All button
          const checkAllBtn = document.getElementById('checkAllRoutesBtn');
          if (checkAllBtn) {
            checkAllBtn.style.display = 'block';
          }
        } else {
          transportRoutesContainer.innerHTML = `
            <div class="text-muted text-center py-3">
              <i class="bi bi-exclamation-circle"></i> No transport routes available
            </div>
          `;
          
          // Hide Check All button
          const checkAllBtn = document.getElementById('checkAllRoutesBtn');
          if (checkAllBtn) {
            checkAllBtn.style.display = 'none';
          }
        }

        // Update mobility nodes
        if (data.files.mobilityFile) {
          mobilityNodesContainer.innerHTML = `
            <div class="form-check mb-2">
              <input 
                class="form-check-input mobility-checkbox" 
                type="checkbox" 
                id="mobility" 
                data-file="${data.files.mobilityFile.fileName}" 
                onchange="toggleMobility(this)" 
              />
              <label class="form-check-label fw-medium" for="mobility">
                <i class="bi bi-geo-alt-fill text-success me-2"></i>
                ${cleanFileName(data.files.mobilityFile.fileName)}
              </label>
            </div>
            <div class="small text-muted mt-2">
              <i class="bi bi-info-circle"></i> Click areas to analyze connections
            </div>
          `;
        } else {
          mobilityNodesContainer.innerHTML = `
            <div class="text-muted text-center py-3">
              <i class="bi bi-exclamation-circle"></i> No mobility areas available
            </div>
          `;
        }

        // Update mobility matrix select
        mobilityMatrixSelect.innerHTML = '<option value="" selected disabled>Choose matrix file...</option>';
        if (data.files.mobilityMatrixFiles && data.files.mobilityMatrixFiles.length > 0) {
          data.files.mobilityMatrixFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file.fileName;
            option.textContent = cleanFileName(file.fileName);
            mobilityMatrixSelect.appendChild(option);
          });
        }
        map.setView(getRegionCenter(region), 13);
        
        // Update button state after content is loaded
        updateAreaEncodingButton();
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
            lat: parseFloat(stop.latitude || stop.Latitude),
            lng: parseFloat(stop.longitude || stop.Longitude),
            name: stop['Stop Name'] || stop['Stop_Name'] || stop.name
          }));

          // Store route data for PT encoding
          loadedRoutes.set(fileName, { stops, color });

          // Fetch and draw road-following route instead of direct lines
          const routeCoordinates = await getRoutePath(stops);
          const polyline = L.polyline(routeCoordinates, { color })
            .bindPopup(`Route: ${fileName}`)
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
          
          // Update PT encoding if enabled
          if (ptEncodingEnabled) {
            updatePTEncoding();
          }
          
          // Update button state
          updateAreaEncodingButton();
        } else {
          console.error(data.message);
        }
      });
  } else {
    if (routeLayers[fileName]) {
      map.removeLayer(routeLayers[fileName]);
      delete routeLayers[fileName];
    }
    
    // Remove route data
    loadedRoutes.delete(fileName);
    
    // Update PT encoding if enabled
    if (ptEncodingEnabled) {
      updatePTEncoding();
    }
    
    // Update button state
    updateAreaEncodingButton();
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
          
          // Update button state
          updateAreaEncodingButton();
        }
      });
  } else {
    if (mobilityLayer) {
      map.removeLayer(mobilityLayer);
      mobilityLayer = null;
      selectedMobilityNodes.clear();
      mobilityNodesData = [];
      updateDistanceInfo();
      
      // Disable PT encoding and update button
      if (ptEncodingEnabled) {
        toggleAreaEncoding();
      }
      updateAreaEncodingButton();
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

  // Calculate direct distance instantly using Haversine formula
  const directDist = calculateHaversineDistance(lat1, lon1, lat2, lon2);

  // Get mobility percentage instantly from cached matrix
  let mobilityPercentage = 'N/A';
  if (mobilityMatrix) {
    console.log('Checking mobilityMatrix for:', { node1, node2, mobilityMatrix });
    if (mobilityMatrix[node1] && mobilityMatrix[node1][node2] !== undefined) {
      mobilityPercentage = parseFloat(mobilityMatrix[node1][node2]) * 100;
    } else if (mobilityMatrix[node2] && mobilityMatrix[node2][node1] !== undefined) {
      mobilityPercentage = parseFloat(mobilityMatrix[node2][node1]) * 100;
    } else {
      console.warn('No mobility data found for:', { node1, node2 });
    }
  }

  // Show instant results first with direct distance and mobility percentage
  updateDistanceInfo(nodes, mobilityPercentage, 'Loading...', directDist.toFixed(2));
  
  // Then try to get road distance asynchronously for enhanced data
  getRoadDistanceFromEnrichedData(node1, node2).then(roadDistance => {
    if (roadDistance !== null && roadDistance !== 'N/A') {
      console.log('Using road distance from enriched mobility data:', roadDistance, 'km');
      updateDistanceInfo(nodes, mobilityPercentage, roadDistance, directDist.toFixed(2));
    } else {
      console.log('No road distance in enriched data, falling back to API');
      // Quick fallback to API if not found in enriched data
      getGoogleDistance(lat1, lon1, lat2, lon2).then(googleDist => {
        updateDistanceInfo(nodes, mobilityPercentage, googleDist, directDist.toFixed(2));
      }).catch(error => {
        console.warn('API fallback failed:', error);
        updateDistanceInfo(nodes, mobilityPercentage, 'N/A', directDist.toFixed(2));
      });
    }
  }).catch(error => {
    console.warn('Enriched data fetch failed:', error);
    // If enriched data fails, try API directly
    getGoogleDistance(lat1, lon1, lat2, lon2).then(googleDist => {
      updateDistanceInfo(nodes, mobilityPercentage, googleDist, directDist.toFixed(2));
    }).catch(apiError => {
      console.warn('Both enriched data and API failed:', apiError);
      updateDistanceInfo(nodes, mobilityPercentage, 'N/A', directDist.toFixed(2));
    });
  });
}


// New function to get road distance from enriched mobility data
async function getRoadDistanceFromEnrichedData(origin, destination) {
  try {
    const region = document.getElementById('regionSelect').value;
    if (!region) return null;
    
    console.log('Fetching enriched distance data for:', origin, '->', destination);
    const response = await fetch(`/api/mobility/distance?region=${encodeURIComponent(region)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`);
    
    if (!response.ok) {
      console.warn('Failed to fetch distance from enriched data:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('Enriched distance data response:', data);
    
    if (data.success && data.road_distance_km !== null && data.road_distance_km !== undefined) {
      return data.road_distance_km;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching distance from enriched data:', error);
    return null;
  }
}

async function getGoogleDistance(lat1, lon1, lat2, lon2) {
  const apiKey = "5b3ce3597851110001cf624887d2455f8705477789fba235d303e0db"; // Replace with your ORS API Key
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${lon1},${lat1}&end=${lon2},${lat2}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.features[0].properties.segments[0].distance / 1000; // Convert to km
  } catch (error) {
    console.error('Error fetching API distance:', error);
    return 'N/A';
  }
}

function updateDistanceInfo(nodes = [], mobilityPercentage = 'N/A', googleDist = 'N/A', directDist = 'N/A') {
  const selectedNodesSpan = document.getElementById('selectedNodes');
  const mobilityPercentageSpan = document.getElementById('mobilityPercentage');
  const googleDistanceSpan = document.getElementById('googleDistance');
  const directDistanceSpan = document.getElementById('directDistance');

  if (selectedNodesSpan) selectedNodesSpan.textContent = nodes.length > 0 ? nodes.join(' and ') : 'None';
  if (mobilityPercentageSpan) mobilityPercentageSpan.textContent = mobilityPercentage !== 'N/A' ? `${mobilityPercentage.toFixed(2)}%` : 'N/A';
  
  // Handle different states for travel distance
  if (googleDistanceSpan) {
    if (googleDist === 'Loading...') {
      googleDistanceSpan.innerHTML = '<i class="bi bi-hourglass-split text-info"></i> Loading...';
    } else if (googleDist !== 'N/A' && typeof googleDist === 'number') {
      googleDistanceSpan.textContent = `${googleDist.toFixed(2)} km`;
    } else {
      googleDistanceSpan.textContent = 'N/A';
    }
  }
  
  if (directDistanceSpan) directDistanceSpan.textContent = directDist !== 'N/A' ? `${directDist} km` : 'N/A';
}

async function getRoutePath(stops) {
  const apiKey = "5b3ce3597851110001cf624887d2455f8705477789fba235d303e0db"; // Replace with your ORS API Key
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

// PT-Region Encoding Functions
function updateAreaEncodingButton() {
  const button = document.getElementById('areaEncodingBtn');
  const status = document.getElementById('encodingStatus');
  const hasMobilityNodes = mobilityNodesData && mobilityNodesData.length > 0;
  const hasRoutes = loadedRoutes && loadedRoutes.size > 0;
  
  if (hasMobilityNodes && hasRoutes) {
    button.disabled = false;
    button.title = 'Click to connect mobility areas served by the same PT routes';
    status.textContent = `Ready: ${mobilityNodesData.length} nodes, ${loadedRoutes.size} routes loaded`;
    status.className = 'small text-success';
  } else {
    button.disabled = true;
    if (!hasMobilityNodes && !hasRoutes) {
      button.title = 'Load mobility nodes and transport routes first';
      status.textContent = 'Load mobility nodes and transport routes to start';
      status.className = 'small text-muted';
    } else if (!hasMobilityNodes) {
      button.title = 'Load mobility nodes first';
      status.textContent = 'Load mobility nodes to continue';
      status.className = 'small text-warning';
    } else if (!hasRoutes) {
      button.title = 'Load transport routes first';
      status.textContent = 'Load transport routes to continue';
      status.className = 'small text-warning';
    }
  }
}

function updateThresholdValue(value) {
  const thresholdSpan = document.getElementById('thresholdValue');
  thresholdSpan.textContent = parseFloat(value).toFixed(1);
  
  // Update encoding if it's currently active
  if (ptEncodingEnabled) {
    updatePTEncoding();
  }
}

function toggleAreaEncoding() {
  const button = document.getElementById('areaEncodingBtn');
  const btnText = document.getElementById('encodingBtnText');
  const status = document.getElementById('encodingStatus');
  const stats = document.getElementById('encodingStats');
  
  if (ptEncodingEnabled) {
    // Disable PT encoding
    ptEncodingEnabled = false;
    button.classList.remove('btn-info');
    button.classList.add('btn-outline-info');
    btnText.textContent = 'Start Area Encoding';
    
    status.textContent = `Ready: ${mobilityNodesData.length} nodes, ${loadedRoutes.size} routes loaded`;
    status.className = 'small text-success';
    stats.textContent = '';
    
    // Remove PT encoding layer
    if (ptEncodingLayer) {
      map.removeLayer(ptEncodingLayer);
      ptEncodingLayer = null;
    }
  } else {
    // Enable PT encoding
    ptEncodingEnabled = true;
    button.classList.remove('btn-outline-info');
    button.classList.add('btn-info');
    btnText.textContent = 'Stop Encoding';
    
    status.textContent = 'Generating PT connections...';
    status.className = 'small text-info';
    
    // Generate PT encoding
    updatePTEncoding();
  }
}

function updatePTEncoding() {
  if (!ptEncodingEnabled || !mobilityNodesData || !loadedRoutes) {
    return;
  }
  
  console.log('🚀 Generating PT-Region encoding...');
  
  // Get threshold from slider
  const thresholdSlider = document.getElementById('thresholdSlider');
  const distanceThreshold = parseFloat(thresholdSlider.value);
  
  const status = document.getElementById('encodingStatus');
  const stats = document.getElementById('encodingStats');
  
  // Remove existing encoding layer
  if (ptEncodingLayer) {
    map.removeLayer(ptEncodingLayer);
  }
  
  ptEncodingLayer = L.layerGroup();
  const edges = new Set(); // To avoid duplicate edges
  const routeConnectionCounts = new Map();
  
  // Process each loaded route
  loadedRoutes.forEach((routeData, routeName) => {
    console.log(`🚌 Processing route: ${routeName}`);
    
    const routeNodes = new Set(); // Mobility nodes connected to this route
    
    // For each stop in this route
    routeData.stops.forEach(stop => {
      // Check distance to all mobility nodes
      mobilityNodesData.forEach(node => {
        const distance = calculateHaversineDistance(
          stop.lat, stop.lng, 
          node.lat, node.lng
        );
        
        if (distance <= distanceThreshold) {
          routeNodes.add(node.area);
        }
      });
    });
    
    // Store connection count for this route
    routeConnectionCounts.set(routeName, routeNodes.size);
    
    // Create edges between all pairs of nodes in this route
    const routeNodesList = Array.from(routeNodes);
    console.log(`   🔗 Connected areas: [${routeNodesList.join(', ')}]`);
    
    for (let i = 0; i < routeNodesList.length; i++) {
      for (let j = i + 1; j < routeNodesList.length; j++) {
        const node1 = routeNodesList[i];
        const node2 = routeNodesList[j];
        const edgeKey = [node1, node2].sort().join('|');
        
        if (!edges.has(edgeKey)) {
          edges.add(edgeKey);
          
          // Find the coordinates of the nodes
          const node1Data = mobilityNodesData.find(n => n.area === node1);
          const node2Data = mobilityNodesData.find(n => n.area === node2);
          
          if (node1Data && node2Data) {
            // Calculate distance between nodes for popup
            const nodeDistance = calculateHaversineDistance(
              node1Data.lat, node1Data.lng,
              node2Data.lat, node2Data.lng
            );
            
            // Draw edge as a dark, visible line
            const edge = L.polyline(
              [[node1Data.lat, node1Data.lng], [node2Data.lat, node2Data.lng]], 
              {
                color: '#1a1a1a',      // Dark color for visibility
                weight: 3,             // Thicker line
                opacity: 0.8,          // High opacity
                dashArray: '8, 4'      // Distinct dashed pattern
              }
            ).bindPopup(`
              <strong>PT Connection</strong><br>
              <strong>${node1}</strong> ↔ <strong>${node2}</strong><br>
              <small>
                • Connected by public transport<br>
                • Distance: ${nodeDistance.toFixed(2)} km<br>
                • Threshold: ${distanceThreshold} km
              </small>
            `);
            
            edge.addTo(ptEncodingLayer);
          }
        }
      }
    }
  });
  
  // Add the encoding layer to the map
  ptEncodingLayer.addTo(map);
  
  // Update status and stats
  status.textContent = 'PT connections generated successfully!';
  status.className = 'small text-success';
  
  const totalConnectedAreas = new Set();
  edges.forEach(edge => {
    const [area1, area2] = edge.split('|');
    totalConnectedAreas.add(area1);
    totalConnectedAreas.add(area2);
  });
  
  stats.innerHTML = `
    <i class="bi bi-check-circle-fill"></i> 
    ${edges.size} connections • 
    ${totalConnectedAreas.size} areas connected • 
    ${distanceThreshold}km threshold
  `;
  
  console.log(`✅ Generated ${edges.size} PT connections with ${distanceThreshold}km threshold`);
}

// Helper function for distance calculation (Haversine formula)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Toggle functions removed - using standard Bootstrap layout

// Handle window resize to properly resize map
window.addEventListener('resize', () => {
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }
});

// Toggle all routes function
function toggleAllRoutes() {
  const routeCheckboxes = document.querySelectorAll('.route-checkbox');
  const checkAllBtn = document.getElementById('checkAllRoutesBtn');
  const btnIcon = checkAllBtn.querySelector('i');
  
  allRoutesChecked = !allRoutesChecked;
  
  routeCheckboxes.forEach(checkbox => {
    if (checkbox.checked !== allRoutesChecked) {
      checkbox.checked = allRoutesChecked;
      toggleRoute(checkbox);
    }
  });
  
  // Update button appearance
  if (allRoutesChecked) {
    btnIcon.className = 'bi bi-check-square';
    checkAllBtn.title = 'Uncheck all routes';
  } else {
    btnIcon.className = 'bi bi-check-all';
    checkAllBtn.title = 'Check all routes';
  }
}

// Update Check All button state
function updateCheckAllButton() {
  const routeCheckboxes = document.querySelectorAll('.route-checkbox');
  const checkedCount = Array.from(routeCheckboxes).filter(cb => cb.checked).length;
  const totalCount = routeCheckboxes.length;
  const checkAllBtn = document.getElementById('checkAllRoutesBtn');
  const btnIcon = checkAllBtn ? checkAllBtn.querySelector('i') : null;
  
  if (btnIcon) {
    if (checkedCount === totalCount && totalCount > 0) {
      allRoutesChecked = true;
      btnIcon.className = 'bi bi-check-square';
      checkAllBtn.title = 'Uncheck all routes';
    } else {
      allRoutesChecked = false;
      btnIcon.className = 'bi bi-check-all';
      checkAllBtn.title = 'Check all routes';
    }
  }
}

