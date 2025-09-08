// Route Creation Application
let routeMap;
let currentRegion = '';
let currentRoute = null;
let routeStops = [];
let routeMarkers = [];
let routePolyline = null;
let isEditing = false;
let currentStopIndex = -1;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Leaflet map with a slight delay to ensure container is ready
    setTimeout(() => {
        // Check if map container exists
        const mapContainer = document.getElementById('routeMap');
        if (!mapContainer) {
            console.log('Route creation map container not found, skipping initialization');
            return;
        }
        
        routeMap = L.map('routeMap').setView([33.6844, 73.0479], 10);
        initializeRouteMap();
        initializeDragAndDrop();
        initializeEventListeners();
    }, 100);
});

// Initialize Leaflet map
function initializeRouteMap() {

    // Define tile layers for different views
    var earthView = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var satelliteView = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    var transportView = L.tileLayer('https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=1f417382cadc4e97a390d059234f6707', {
        maxZoom: 22,
        attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // Add the default layer (Earth view) to the map
    earthView.addTo(routeMap);

    // Add Layer Control to switch between views
    var baseMaps = {
        "Earth View": earthView,
        "Satellite View": satelliteView,
        "Transport View": transportView
    };
    L.control.layers(baseMaps, null, { collapsed: true }).addTo(routeMap);

    // Hide the loading overlay after a short delay to ensure tiles load
    setTimeout(() => {
        const mapOverlay = document.getElementById('mapOverlay');
        if (mapOverlay) {
            mapOverlay.style.display = 'none';
            mapOverlay.style.visibility = 'hidden';
            mapOverlay.style.opacity = '0';
            mapOverlay.classList.add('d-none');
        }
    }, 500);
    
    // Also hide it immediately
    const mapOverlay = document.getElementById('mapOverlay');
    if (mapOverlay) {
        mapOverlay.style.display = 'none';
        mapOverlay.style.visibility = 'hidden';
        mapOverlay.style.opacity = '0';
        mapOverlay.classList.add('d-none');
    }

    // Add click event to map for adding stops
    routeMap.on('click', function(e) {
        if (isEditing && currentRoute) {
            addStopAtLocation(e.latlng);
        }
    });

    console.log('Route creation map initialized');
}

// Initialize drag and drop functionality
function initializeDragAndDrop() {
    $('#sortableStopsList').sortable({
        placeholder: 'sortable-placeholder',
        cursor: 'grabbing',
        opacity: 0.8,
        tolerance: 'pointer',
        update: function(event, ui) {
            updateStopOrder();
        }
    }).disableSelection();
}

// Initialize event listeners
function initializeEventListeners() {
    // Route name input change
    $('#routeNameInput').on('input', function() {
        const routeName = $(this).val().trim();
        if (routeName && currentRoute) {
            $('#currentRouteTitle').text(routeName);
            enableSaveButton();
        }
    });

    // Manual stop inputs
    $('#manualStopName, #manualStopLat, #manualStopLng').on('input', function() {
        const name = $('#manualStopName').val().trim();
        const lat = parseFloat($('#manualStopLat').val());
        const lng = parseFloat($('#manualStopLng').val());
        
        $('#addManualStopBtn').prop('disabled', !name || isNaN(lat) || isNaN(lng));
    });

    // Modal stop name input
    $('#modalStopName').on('input', function() {
        const name = $(this).val().trim();
        $('.modal-footer .btn-primary').prop('disabled', !name);
    });
}

// Load routes for selected region
function loadRoutesForRegion(region) {
    if (!region) return;
    
    currentRegion = region;
    $('#currentRegionDisplay').text(region);
    
    // Clear current route
    clearCurrentRoute();
    
    // Show loading state
    $('#routesListContainer').html(`
        <div class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <div class="small mt-1">Loading routes...</div>
        </div>
    `);

    // Center map on region
    const regionCenter = getRegionCenter(region);
    routeMap.setView(regionCenter, 12);

    // Fetch routes from API
    fetch(`/route-creation/routes?region=${encodeURIComponent(region)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayRoutes(data.routes);
            } else {
                showError('Failed to load routes: ' + data.message);
                $('#routesListContainer').html(`
                    <div class="text-muted text-center py-3">
                        <i class="bi bi-exclamation-circle"></i> Failed to load routes
                    </div>
                `);
            }
        })
        .catch(error => {
            console.error('Error loading routes:', error);
            showError('Network error while loading routes');
            $('#routesListContainer').html(`
                <div class="text-muted text-center py-3">
                    <i class="bi bi-wifi-off"></i> Network error
                </div>
            `);
        });
}

// Display routes in the list
function displayRoutes(routes) {
    if (routes.length === 0) {
        $('#routesListContainer').html(`
            <div class="text-muted text-center py-3">
                <i class="bi bi-inbox"></i> No routes found for this region
                <div class="small mt-1">Click "New" to create your first route</div>
            </div>
        `);
        return;
    }

    let routesHtml = '';
    routes.forEach(route => {
        routesHtml += `
            <div class="route-item fade-in-up" data-route-id="${route._id}">
                <div class="route-name">${route.fileName}</div>
                <div class="route-info">
                    <span class="status-indicator inactive"></span>
                    ${route.stopCount} stops
                    <small class="text-muted">• Created ${formatDate(route.createdAt)}</small>
                </div>
                <div class="route-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="editRoute('${route._id}')" title="Edit Route">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="duplicateRoute('${route._id}')" title="Duplicate Route">
                        <i class="bi bi-files"></i> Copy
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="confirmDeleteRoute('${route._id}')" title="Delete Route">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });

    $('#routesListContainer').html(routesHtml);
}

// Create new route
function createNewRoute() {
    if (!currentRegion) {
        showError('Please select a region first');
        return;
    }

    $('#routeNameModalTitle').text('Create New Route');
    $('#modalRouteName').val('');
    $('#routeNameModal').modal('show');
}

// Confirm route creation
function confirmCreateRoute() {
    const routeName = $('#modalRouteName').val().trim();
    if (!routeName) {
        showError('Please enter a route name');
        return;
    }

    // Clear any existing route
    clearCurrentRoute();

    // Create new route object
    currentRoute = {
        _id: null,
        fileName: routeName,
        region: currentRegion,
        isNew: true
    };

    routeStops = [];
    isEditing = true;

    // Update UI
    $('#routeNameInput').val(routeName).prop('disabled', false);
    $('#currentRouteTitle').text(routeName);
    enableEditingMode();
    
    $('#routeNameModal').modal('hide');
    showSuccess('New route created! Click on the map to add stops.');
}

// Edit existing route
function editRoute(routeId) {
    fetch(`/route-creation/route/${routeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadRouteForEditing(data.route);
            } else {
                showError('Failed to load route: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error loading route:', error);
            showError('Network error while loading route');
        });
}

// Load route for editing
function loadRouteForEditing(route) {
    clearCurrentRoute();
    
    currentRoute = route;
    routeStops = route.data.map(stop => {
        const lat = parseFloat(stop.latitude);
        const lng = parseFloat(stop.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.warn('Invalid coordinates for stop:', stop);
            return {
                name: stop['Stop Name'] || 'Unknown Stop',
                latitude: 33.6844, // Default to Islamabad
                longitude: 73.0479
            };
        }
        
        return {
            name: stop['Stop Name'] || 'Unknown Stop',
            latitude: lat,
            longitude: lng
        };
    });
    
    isEditing = true;
    
    // Update UI
    $('#routeNameInput').val(route.fileName).prop('disabled', false);
    $('#currentRouteTitle').text(route.fileName);
    
    // Mark route as active in list
    $('.route-item').removeClass('active');
    $(`.route-item[data-route-id="${route._id}"]`).addClass('active');
    
    // Display stops on map and in list
    displayStopsOnMap();
    updateStopsList();
    enableEditingMode();
    updateExportButton();
    
    showInfo(`Editing route: ${route.fileName}`);
}

// Add stop at clicked location
function addStopAtLocation(latlng) {
    currentStopIndex = routeStops.length;
    
    // Show modal for stop name input
    $('#modalStopName').val('');
    $('#modalStopLat').val(latlng.lat.toFixed(6));
    $('#modalStopLng').val(latlng.lng.toFixed(6));
    $('#stopDetailsModal').modal('show');
    
    // Temporarily add marker
    const tempMarker = L.marker([latlng.lat, latlng.lng], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<i class="bi bi-geo-alt-fill"></i>',
            iconSize: [30, 40],
            iconAnchor: [15, 40]
        })
    }).addTo(routeMap);
    
    // Store temp marker for cleanup
    window.tempMarker = tempMarker;
}

// Save stop details from modal
function saveStopDetails() {
    const name = $('#modalStopName').val().trim();
    const lat = parseFloat($('#modalStopLat').val());
    const lng = parseFloat($('#modalStopLng').val());
    
    if (!name) {
        showError('Please enter a stop name');
        return;
    }
    
    // Remove temp marker
    if (window.tempMarker) {
        routeMap.removeLayer(window.tempMarker);
        delete window.tempMarker;
    }
    
    if (currentStopIndex >= 0 && currentStopIndex < routeStops.length) {
        // Editing existing stop
        routeStops[currentStopIndex] = { name, latitude: lat, longitude: lng };
    } else {
        // Adding new stop
        routeStops.push({ name, latitude: lat, longitude: lng });
    }
    
    // Update displays
    displayStopsOnMap();
    updateStopsList();
    enableSaveButton();
    
    $('#stopDetailsModal').modal('hide');
    showSuccess(`Stop "${name}" ${currentStopIndex >= 0 && currentStopIndex < routeStops.length ? 'updated' : 'added'}`);
}

// Display stops on map
function displayStopsOnMap() {
    // Clear existing markers and polyline
    routeMarkers.forEach(marker => routeMap.removeLayer(marker));
    routeMarkers = [];
    
    if (routePolyline) {
        routeMap.removeLayer(routePolyline);
        routePolyline = null;
    }
    
    if (routeStops.length === 0) return;
    
    // Add markers for each stop
    const polylinePoints = [];
    
    routeStops.forEach((stop, index) => {
        const isFirst = index === 0;
        const isLast = index === routeStops.length - 1;
        
        let markerClass = 'custom-marker';
        if (isFirst) markerClass += ' start-marker';
        if (isLast && routeStops.length > 1) markerClass += ' end-marker';
        
        const marker = L.marker([stop.latitude, stop.longitude], {
            draggable: isEditing,
            icon: L.divIcon({
                className: markerClass,
                html: `<span class="marker-number">${index + 1}</span>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(routeMap);
        
        // Add popup with safe coordinate formatting
        const latText = typeof stop.latitude === 'number' ? stop.latitude.toFixed(6) : stop.latitude;
        const lngText = typeof stop.longitude === 'number' ? stop.longitude.toFixed(6) : stop.longitude;
        
        marker.bindPopup(`
            <div class="text-center">
                <strong>${stop.name || 'Unknown Stop'}</strong><br>
                <small>Stop ${index + 1}</small><br>
                <small>${latText}, ${lngText}</small>
            </div>
        `);
        
        // Add drag event
        if (isEditing) {
            marker.on('dragend', function(e) {
                const newPos = e.target.getLatLng();
                routeStops[index].latitude = newPos.lat;
                routeStops[index].longitude = newPos.lng;
                displayStopsOnMap();
                updateStopsList();
                enableSaveButton();
            });
            
            // Add click event for editing
            marker.on('click', function(e) {
                e.originalEvent.stopPropagation();
                editStopAtIndex(index);
            });
        }
        
        routeMarkers.push(marker);
        polylinePoints.push([stop.latitude, stop.longitude]);
    });
    
    // Draw route polyline
    if (polylinePoints.length > 1) {
        routePolyline = L.polyline(polylinePoints, {
            color: '#17a2b8',
            weight: 4,
            opacity: 0.7
        }).addTo(routeMap);
        
        // Fit map to show all stops
        routeMap.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
    }
    
    updateRouteStats();
}

// Update stops list
function updateStopsList() {
    if (routeStops.length === 0) {
        $('#emptyStopsMessage').show();
        $('#sortableStopsList').hide().empty();
        return;
    }
    
    $('#emptyStopsMessage').hide();
    $('#sortableStopsList').show();
    
    let stopsHtml = '';
    routeStops.forEach((stop, index) => {
        stopsHtml += `
            <li class="stop-item" data-stop-index="${index}">
                <div class="stop-number">${index + 1}</div>
                <div class="stop-content">
                    <div class="stop-name">${stop.name || 'Unknown Stop'}</div>
                    <div class="stop-coordinates">${typeof stop.latitude === 'number' ? stop.latitude.toFixed(6) : stop.latitude}, ${typeof stop.longitude === 'number' ? stop.longitude.toFixed(6) : stop.longitude}</div>
                </div>
                <div class="stop-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="editStopAtIndex(${index})" title="Edit Stop">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="removeStopAtIndex(${index})" title="Remove Stop">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </li>
        `;
    });
    
    $('#sortableStopsList').html(stopsHtml);
    updateRouteStats();
}

// Update stop order after drag and drop
function updateStopOrder() {
    const newOrder = [];
    $('#sortableStopsList .stop-item').each(function() {
        const index = parseInt($(this).data('stop-index'));
        newOrder.push(routeStops[index]);
    });
    
    routeStops = newOrder;
    displayStopsOnMap();
    updateStopsList();
    enableSaveButton();
}

// Edit stop at specific index
function editStopAtIndex(index) {
    if (index < 0 || index >= routeStops.length) return;
    
    currentStopIndex = index;
    const stop = routeStops[index];
    
    $('#modalStopName').val(stop.name || 'Unknown Stop');
    $('#modalStopLat').val(typeof stop.latitude === 'number' ? stop.latitude.toFixed(6) : stop.latitude);
    $('#modalStopLng').val(typeof stop.longitude === 'number' ? stop.longitude.toFixed(6) : stop.longitude);
    $('#stopDetailsModal').modal('show');
}

// Remove stop at specific index
function removeStopAtIndex(index) {
    if (index < 0 || index >= routeStops.length) return;
    
    const stopName = routeStops[index].name;
    
    // Show confirmation
    showConfirmation(
        'Remove Stop',
        `Are you sure you want to remove "${stopName}" from this route?`,
        () => {
            routeStops.splice(index, 1);
            displayStopsOnMap();
            updateStopsList();
            enableSaveButton();
            showSuccess(`Stop "${stopName}" removed`);
        }
    );
}

// Add stop manually
function addManualStop() {
    const name = $('#manualStopName').val().trim();
    const lat = parseFloat($('#manualStopLat').val());
    const lng = parseFloat($('#manualStopLng').val());
    
    if (!name || isNaN(lat) || isNaN(lng)) {
        showError('Please fill in all stop details');
        return;
    }
    
    routeStops.push({ name, latitude: lat, longitude: lng });
    
    // Clear inputs
    $('#manualStopName, #manualStopLat, #manualStopLng').val('');
    $('#addManualStopBtn').prop('disabled', true);
    
    displayStopsOnMap();
    updateStopsList();
    enableSaveButton();
    
    showSuccess(`Stop "${name}" added manually`);
}

// Clear all stops
function clearAllStops() {
    if (routeStops.length === 0) return;
    
    showConfirmation(
        'Clear All Stops',
        'Are you sure you want to remove all stops from this route?',
        () => {
            routeStops = [];
            displayStopsOnMap();
            updateStopsList();
            enableSaveButton();
            showSuccess('All stops cleared');
        }
    );
}

// Save current route
function saveCurrentRoute() {
    if (!currentRoute || !isEditing) return;
    
    const routeName = $('#routeNameInput').val().trim();
    if (!routeName) {
        showError('Please enter a route name');
        return;
    }
    
    if (routeStops.length === 0) {
        showError('Please add at least one stop to the route');
        return;
    }
    
    // Prepare data for saving
    const routeData = {
        fileName: routeName,
        region: currentRegion,
        stops: routeStops
    };
    
    // Show loading state
    $('#saveRouteBtn').prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Saving...');
    
    const url = currentRoute.isNew ? '/route-creation/create' : `/route-creation/update/${currentRoute._id}`;
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(routeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(data.message);
            currentRoute = { ...currentRoute, ...data.route, isNew: false };
            disableEditingMode();
            updateExportButton(); // Enable export after saving
            loadRoutesForRegion(currentRegion); // Refresh routes list
        } else {
            showError('Failed to save route: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error saving route:', error);
        showError('Network error while saving route');
    })
    .finally(() => {
        $('#saveRouteBtn').prop('disabled', false).html('<i class="bi bi-save"></i> Save Route');
    });
}

// Cancel route editing
function cancelRouteEditing() {
    showConfirmation(
        'Cancel Editing',
        'Are you sure you want to cancel? Any unsaved changes will be lost.',
        () => {
            clearCurrentRoute();
            showInfo('Editing cancelled');
        }
    );
}

// Duplicate route
function duplicateRoute(routeId) {
    const newName = prompt('Enter a name for the duplicated route:');
    if (!newName || !newName.trim()) return;
    
    fetch(`/route-creation/duplicate/${routeId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName: newName.trim() })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(data.message);
            loadRoutesForRegion(currentRegion);
        } else {
            showError('Failed to duplicate route: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error duplicating route:', error);
        showError('Network error while duplicating route');
    });
}

// Confirm delete route
function confirmDeleteRoute(routeId) {
    const routeItem = $(`.route-item[data-route-id="${routeId}"]`);
    const routeName = routeItem.find('.route-name').text();
    
    showConfirmation(
        'Delete Route',
        `Are you sure you want to permanently delete "${routeName}"? This action cannot be undone.`,
        () => deleteRoute(routeId)
    );
}

// Delete route
function deleteRoute(routeId) {
    fetch(`/route-creation/delete/${routeId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess(data.message);
            loadRoutesForRegion(currentRegion);
            
            // If currently editing this route, clear it
            if (currentRoute && currentRoute._id === routeId) {
                clearCurrentRoute();
            }
        } else {
            showError('Failed to delete route: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting route:', error);
        showError('Network error while deleting route');
    });
}

// Export current route
function exportCurrentRoute() {
    if (!currentRoute || !currentRoute._id) {
        showError('No route selected for export');
        return;
    }
    
    if (currentRoute.isNew) {
        showError('Please save the route before exporting');
        return;
    }
    
    console.log('Exporting route:', currentRoute._id);
    
    // Create a temporary link for download
    const downloadLink = document.createElement('a');
    downloadLink.href = `/route-creation/export/${currentRoute._id}`;
    downloadLink.download = `${currentRoute.fileName}.csv`;
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showSuccess('Route exported successfully!');
}

// Clear current route
function clearCurrentRoute() {
    currentRoute = null;
    routeStops = [];
    isEditing = false;
    currentStopIndex = -1;
    
    // Clear markers and polyline
    routeMarkers.forEach(marker => routeMap.removeLayer(marker));
    routeMarkers = [];
    
    if (routePolyline) {
        routeMap.removeLayer(routePolyline);
        routePolyline = null;
    }
    
    // Clear UI
    $('#routeNameInput').val('').prop('disabled', true);
    $('#currentRouteTitle').text('No route selected');
    $('#emptyStopsMessage').show();
    $('#sortableStopsList').hide().empty();
    
    // Remove active state from route list
    $('.route-item').removeClass('active');
    
    disableEditingMode();
    updateRouteStats();
    updateExportButton();
}

// Enable editing mode
function enableEditingMode() {
    isEditing = true;
    
    // Enable controls
    $('#routeNameInput').prop('disabled', false);
    $('#manualStopName, #manualStopLat, #manualStopLng').prop('disabled', false);
    $('#clearStopsBtn').prop('disabled', false);
    
    enableSaveButton();
}

// Disable editing mode
function disableEditingMode() {
    isEditing = false;
    
    // Disable controls
    $('#routeNameInput').prop('disabled', true);
    $('#manualStopName, #manualStopLat, #manualStopLng').prop('disabled', true).val('');
    $('#addManualStopBtn').prop('disabled', true);
    $('#clearStopsBtn').prop('disabled', true);
    
    // Disable action buttons
    $('#saveRouteBtn, #cancelRouteBtn').prop('disabled', true);
    
    // Update export button - should be enabled if route exists and is not new
    updateExportButton();
    
    // Update markers to be non-draggable
    displayStopsOnMap();
}

// Enable save button
function enableSaveButton() {
    if (isEditing && currentRoute) {
        $('#saveRouteBtn, #cancelRouteBtn').prop('disabled', false);
    }
}

// Update export button state
function updateExportButton() {
    const canExport = currentRoute && currentRoute._id && !currentRoute.isNew;
    $('#exportRouteBtn').prop('disabled', !canExport);
}

// Update route statistics
function updateRouteStats() {
    $('#totalStopsCount').text(routeStops.length);
    
    let routeLength = 0;
    if (routeStops.length > 1) {
        for (let i = 0; i < routeStops.length - 1; i++) {
            const distance = calculateDistance(
                routeStops[i].latitude, routeStops[i].longitude,
                routeStops[i + 1].latitude, routeStops[i + 1].longitude
            );
            routeLength += distance;
        }
    }
    
    $('#routeLength').text(routeLength.toFixed(2) + ' km');
}

// Utility Functions

// Get region center coordinates
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

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Show success message
function showSuccess(message) {
    showToast(message, 'success');
}

// Show error message
function showError(message) {
    showToast(message, 'error');
}

// Show info message
function showInfo(message) {
    showToast(message, 'info');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastHtml = `
        <div class="toast toast-${type} show" role="alert">
            <div class="toast-body">
                <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    // Add toast container if it doesn't exist
    if (!$('.toast-container').length) {
        $('body').append('<div class="toast-container"></div>');
    }
    
    const $toast = $(toastHtml);
    $('.toast-container').append($toast);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        $toast.fadeOut(() => $toast.remove());
    }, 5000);
}

// Show confirmation dialog
function showConfirmation(title, message, onConfirm) {
    $('#confirmationTitle').text(title);
    $('#confirmationMessage').text(message);
    
    $('#confirmActionBtn').off('click').on('click', function() {
        onConfirm();
        $('#confirmationModal').modal('hide');
    });
    
    $('#confirmationModal').modal('show');
}
