/**
 * Interactive Service Planning JavaScript
 * Handles region selection, optimization loading, interactive map, and route comparison
 */

class InteractiveServicePlanning {
    constructor() {
        this.map = null;
        this.selectedRegion = null;
        this.optimizationData = null;
        this.baselineRoutes = [];
        this.userRoutes = [];
        this.mapLayers = {
            baseline: null,
            user: null,
            markers: null
        };
        this.editMode = 'view'; // 'view', 'add', 'edit', 'delete'
        this.tempPolyline = null;
        this.tempPoints = [];
        this.tempControl = null;
        
        this.init();
    }

    init() {
        console.log('Initializing Interactive Service Planning...');
        this.bindEvents();
        this.initializeMap();
        this.loadRegions();
    }

    bindEvents() {
        // Region selection
        document.getElementById('regionSelect').addEventListener('change', (e) => {
            this.onRegionChange(e.target.value);
        });

        // Optimization selection
        document.getElementById('optimizationSelect').addEventListener('change', (e) => {
            this.onOptimizationChange(e.target.value);
        });

        // Load optimization button
        document.getElementById('loadOptimizationBtn').addEventListener('click', () => {
            this.loadOptimizationResults();
        });

        // Map mode controls
        document.getElementById('addRouteMode').addEventListener('click', () => {
            this.setEditMode('add');
        });
        
        document.getElementById('editRouteMode').addEventListener('click', () => {
            this.setEditMode('edit');
        });
        
        document.getElementById('deleteRouteMode').addEventListener('click', () => {
            this.setEditMode('delete');
        });
        
        document.getElementById('resetMapView').addEventListener('click', () => {
            this.resetMapView();
        });

        // Export buttons
        document.getElementById('exportRoutesBtn').addEventListener('click', () => {
            this.exportRoutes();
        });
        
        document.getElementById('exportSummaryBtn').addEventListener('click', () => {
            this.exportSummary();
        });
    }

    async loadRegions() {
        try {
            const response = await fetch('/optimization/api/regions');
            const data = await response.json();
            
            const select = document.getElementById('regionSelect');
            select.innerHTML = '<option value="">Select a region...</option>';
            
            if (data.success && data.regions.length > 0) {
                data.regions.forEach(region => {
                    const option = document.createElement('option');
                    option.value = region;
                    option.textContent = region;
                    select.appendChild(option);
                });
            } else {
                select.innerHTML = '<option value="">No regions available</option>';
                select.disabled = true;
            }
        } catch (error) {
            console.error('Error loading regions:', error);
            this.showError('Failed to load regions');
        }
    }

    async onRegionChange(region) {
        console.log('Region changed to:', region);
        this.selectedRegion = region;
        
        if (!region) {
            document.getElementById('optimizationSelect').disabled = true;
            document.getElementById('loadOptimizationBtn').disabled = true;
            return;
        }

        try {
            // Fetch optimization sessions for this region
            const response = await fetch(`/optimization/api/sessions?region=${encodeURIComponent(region)}&status=completed`);
            const data = await response.json();
            
            const select = document.getElementById('optimizationSelect');
            select.innerHTML = '<option value="">Select optimization session...</option>';
            
            if (data.success && data.sessions.length > 0) {
                data.sessions.forEach(session => {
                    const option = document.createElement('option');
                    option.value = session.sessionId;
                    option.textContent = `${session.region} - ${new Date(session.completedAt).toLocaleDateString()} (${session.results?.improvements?.distanceReduction?.toFixed(1) || 0}% improvement)`;
                    select.appendChild(option);
                });
                select.disabled = false;
            } else {
                select.innerHTML = '<option value="">No completed optimizations found</option>';
                select.disabled = true;
            }
        } catch (error) {
            console.error('Error fetching optimization sessions:', error);
            this.showError('Failed to load optimization sessions');
        }
    }

    onOptimizationChange(sessionId) {
        const loadBtn = document.getElementById('loadOptimizationBtn');
        loadBtn.disabled = !sessionId;
    }

    async loadOptimizationResults() {
        const sessionId = document.getElementById('optimizationSelect').value;
        if (!sessionId) return;

        try {
            this.showLoading('Loading optimization results...');
            
            // Fetch optimization results
            const response = await fetch(`/optimization/api/results/${sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                this.optimizationData = data.results; // Note: it's data.results, not data.session
                console.log('Loaded optimization data:', this.optimizationData);
                await this.displayOptimizationResults();
                this.enableMapControls();
                this.showSuccess('Optimization results loaded successfully');
            } else {
                this.showError('Failed to load optimization results: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading optimization results:', error);
            this.showError('Failed to load optimization results');
        } finally {
            this.hideLoading();
        }
    }

    async displayOptimizationResults() {
        if (!this.optimizationData) return;
        
        console.log('Displaying optimization results:', this.optimizationData);
        
        // Update baseline metrics
        this.updateBaselineMetrics();
        
        // Display baseline routes
        this.displayBaselineRoutes();
        
        // Load map data and show routes
        await this.loadMapVisualization();
        
        // Show panels
        document.getElementById('baselineContent').style.display = 'none';
        document.getElementById('baselineMetrics').style.display = 'block';
        document.getElementById('baselineRoutesList').style.display = 'block';
        document.getElementById('exportSection').style.display = 'block';
        
        // Initialize comparison panel
        this.updateComparison();
    }

    updateBaselineMetrics() {
        const results = this.optimizationData.results;
        const improvements = results.improvements;
        
        // Update baseline metrics
        document.getElementById('baselineDistance').textContent = results.optimizedNetwork.totalDistance.toFixed(1) + ' km';
        document.getElementById('baselineMobility').textContent = results.optimizedNetwork.totalMobility.toFixed(2);
        document.getElementById('baselineEfficiency').textContent = results.optimizedNetwork.networkEfficiency.toFixed(4);
        
        // Update change indicators
        document.getElementById('baselineDistanceChange').textContent = improvements.distanceReduction.toFixed(1) + '% reduction';
        document.getElementById('baselineMobilityChange').textContent = '+' + improvements.mobilityIncrease.toFixed(1) + '%';
        document.getElementById('baselineEfficiencyChange').textContent = '+' + improvements.efficiencyGain.toFixed(1) + '%';
        
        // Style changes
        document.getElementById('baselineDistanceChange').className = 'metric-change positive';
        document.getElementById('baselineMobilityChange').className = 'metric-change positive';
        document.getElementById('baselineEfficiencyChange').className = 'metric-change positive';
    }

    displayBaselineRoutes() {
        const routes = this.optimizationData.results.optimizedRoutes || [];
        const routesList = document.getElementById('optimizedRoutes');
        routesList.innerHTML = '';
        
        // Show top 10 routes by mobility
        const topRoutes = routes
            .filter(route => route.mobility > 1)
            .sort((a, b) => b.mobility - a.mobility)
            .slice(0, 10);
            
        this.baselineRoutes = topRoutes;
        
        topRoutes.forEach((route, index) => {
            const li = document.createElement('li');
            li.className = 'route-item';
            li.dataset.routeId = index;
            
            li.innerHTML = `
                <div class="route-name">${route.fromArea} → ${route.toArea}</div>
                <div class="route-details">
                    <span>${route.distance.toFixed(1)} km</span>
                    <span>Mobility: ${route.mobility.toFixed(2)}</span>
                </div>
            `;
            
            li.addEventListener('click', () => {
                this.selectRoute(index);
            });
            
            routesList.appendChild(li);
        });
    }

    selectRoute(routeIndex) {
        // Remove previous selection
        document.querySelectorAll('.route-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked route
        const selectedItem = document.querySelector(`[data-route-id="${routeIndex}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Highlight route on map
        this.highlightRouteOnMap(routeIndex);
    }

    initializeMap() {
        this.map = L.map('planningMap').setView([33.6844, 73.0479], 11); // Islamabad center
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Initialize layer groups
        this.mapLayers.baseline = L.layerGroup().addTo(this.map);
        this.mapLayers.user = L.layerGroup().addTo(this.map);
        this.mapLayers.markers = L.layerGroup().addTo(this.map);
        
        // Add map click handler for adding routes
        this.map.on('click', (e) => {
            if (this.editMode === 'add') {
                this.addPointToRoute(e.latlng);
            }
        });
    }

    async loadMapVisualization() {
        try {
            console.log('Loading visualization data for session:', this.optimizationData.sessionId);
            
            // Fetch visualization data - correct endpoint
            const response = await fetch(`/optimization/api/visualization/${this.optimizationData.sessionId}`);
            const data = await response.json();
            
            console.log('Visualization API response:', data);
            
            if (data.success) {
                this.displayRoutesOnMap(data.data); // Note: it's data.data, not data.visualization
            } else {
                console.error('Visualization API error:', data.message);
                this.showError('Failed to load map visualization: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading map visualization:', error);
            this.showError('Failed to load map visualization');
        }
    }

    displayRoutesOnMap(visualization) {
        if (!visualization) {
            console.error('No visualization data provided');
            return;
        }
        
        console.log('Displaying routes on map:', visualization);
        console.log('Number of optimized routes to process:', visualization.optimizedRoutes?.length || 0);
        
        // Clear existing routes
        this.mapLayers.baseline.clearLayers();
        this.mapLayers.markers.clearLayers();
        
        // Add mobility nodes
        if (visualization.mobilityNodes && visualization.mobilityNodes.length > 0) {
            console.log(`Adding ${visualization.mobilityNodes.length} mobility nodes`);
            visualization.mobilityNodes.forEach(node => {
                if (node.latitude && node.longitude && !isNaN(node.latitude) && !isNaN(node.longitude)) {
                    const marker = L.circleMarker([node.latitude, node.longitude], {
                        radius: 6,
                        fillColor: '#3b82f6',
                        color: 'white',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).bindPopup(`<strong>${node.name}</strong>`);
                    
                    this.mapLayers.markers.addLayer(marker);
                }
            });
        }
        
        // Add existing routes in light gray
        if (visualization.existingRoutes && visualization.existingRoutes.length > 0) {
            console.log(`Adding ${visualization.existingRoutes.length} existing routes`);
            visualization.existingRoutes.forEach((route, index) => {
                if (route.stops && route.stops.length > 1) {
                    const coordinates = route.stops.map(stop => {
                        if (stop.latitude && stop.longitude) {
                            return [stop.latitude, stop.longitude];
                        }
                        return null;
                    }).filter(coord => coord !== null);
                    
                    if (coordinates.length > 1) {
                        const polyline = L.polyline(coordinates, {
                            color: '#94a3b8',
                            weight: 2,
                            opacity: 0.5,
                            dashArray: '5, 5'
                        }).bindPopup(`
                            <strong>Existing Route: ${route.name}</strong><br>
                            Stops: ${route.stops.length}
                        `);
                        
                        this.mapLayers.baseline.addLayer(polyline);
                    }
                }
            });
        }
        
        // Add optimized routes
        if (visualization.optimizedRoutes && visualization.optimizedRoutes.length > 0) {
            console.log(`Adding ${visualization.optimizedRoutes.length} optimized routes`);
            const colors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6', '#a855f7'];
            
            let routesAdded = 0;
            visualization.optimizedRoutes.forEach((route, index) => {
                if (route.path && route.path.length > 1 && route.mobility > 1) {
                    console.log(`🔍 Processing route ${index + 1}: ${route.fromArea} → ${route.toArea}`);
                    console.log(`   Path data:`, route.path);
                    console.log(`   Full path:`, route.fullPath);
                    
                    // Convert path coordinates - handle both coordinate objects and area name strings
                    const coordinates = route.path.map(point => {
                        // If point is already a coordinate object with latitude/longitude
                        if (point && point.latitude && point.longitude) {
                            return [point.latitude, point.longitude];
                        }
                        // If point is just an area name string, find it in mobility nodes
                        if (typeof point === 'string') {
                            const node = visualization.mobilityNodes?.find(n => n.name === point);
                            if (node && node.latitude && node.longitude) {
                                return [node.latitude, node.longitude];
                            }
                        }
                        // If point has a name property, use that to find the node
                        if (point && point.name) {
                            const node = visualization.mobilityNodes?.find(n => n.name === point.name);
                            if (node && node.latitude && node.longitude) {
                                return [node.latitude, node.longitude];
                            }
                        }
                        return null;
                    }).filter(coord => coord !== null);
                    
                    console.log(`   Converted coordinates (${coordinates.length} points):`, coordinates);
                    
                    if (coordinates.length > 1) {
                        const polyline = L.polyline(coordinates, {
                            color: colors[index % colors.length],
                            weight: 4,
                            opacity: 0.8
                        }).bindPopup(`
                            <strong>${route.fromArea} → ${route.toArea}</strong><br>
                            Distance: ${route.distance.toFixed(1)} km<br>
                            Mobility: ${route.mobility.toFixed(2)}<br>
                            Efficiency: ${route.efficiency?.toFixed(3) || 'N/A'}<br>
                            <button onclick="servicePlanning.editRoute(${index})" class="btn btn-sm btn-primary mt-2">Edit</button>
                            <button onclick="servicePlanning.deleteRoute(${index})" class="btn btn-sm btn-danger mt-2 ms-1">Delete</button>
                        `);
                        
                        // Store route data for editing
                        polyline.routeData = {
                            index: index,
                            originalRoute: route,
                            coordinates: coordinates
                        };
                        
                        // Add click handler for route selection
                        polyline.on('click', () => {
                            this.handleRouteClick(polyline);
                        });
                        
                        // Add intermediate points as small markers for better visualization
                        if (coordinates.length > 2) {
                            const intermediatePoints = coordinates.slice(1, -1); // Exclude start and end
                            intermediatePoints.forEach((coord, pointIndex) => {
                                const intermediateMaker = L.circleMarker(coord, {
                                    radius: 3,
                                    fillColor: colors[index % colors.length],
                                    color: 'white',
                                    weight: 1,
                                    opacity: 0.8,
                                    fillOpacity: 0.6
                                }).bindPopup(`
                                    <strong>Intermediate Stop ${pointIndex + 1}</strong><br>
                                    Route: ${route.fromArea} → ${route.toArea}<br>
                                    Point: ${route.path[pointIndex + 1].name}
                                `);
                                
                                this.mapLayers.baseline.addLayer(intermediateMaker);
                            });
                        }
                        
                        this.mapLayers.baseline.addLayer(polyline);
                        routesAdded++;
                    }
                }
            });
            
            console.log(`Successfully added ${routesAdded} routes to map`);
            
            // Fit map to show all routes
            if (this.mapLayers.baseline.getLayers().length > 0 || this.mapLayers.markers.getLayers().length > 0) {
                try {
                    // Collect all individual layers instead of layer groups
                    const allLayers = [];
                    this.mapLayers.baseline.eachLayer(layer => allLayers.push(layer));
                    this.mapLayers.markers.eachLayer(layer => allLayers.push(layer));
                    
                    if (allLayers.length > 0) {
                        const group = new L.featureGroup(allLayers);
                        this.map.fitBounds(group.getBounds().pad(0.1));
                        document.getElementById('mapStatus').textContent = `${routesAdded} routes loaded`;
                    }
                } catch (error) {
                    console.error('Error fitting bounds:', error);
                    // Fallback to default view
                    this.map.setView([33.6844, 73.0479], 11);
                    document.getElementById('mapStatus').textContent = `${routesAdded} routes loaded`;
                }
            } else {
                // Default to Islamabad if no routes to show
                this.map.setView([33.6844, 73.0479], 11);
                document.getElementById('mapStatus').textContent = 'No routes to display';
            }
        } else {
            console.log('No optimized routes found');
            this.map.setView([33.6844, 73.0479], 11);
            document.getElementById('mapStatus').textContent = 'No routes available';
        }
    }
    
    enableMapControls() {
        // Enable map editing controls
        document.getElementById('addRouteMode').disabled = false;
        document.getElementById('editRouteMode').disabled = false;
        document.getElementById('deleteRouteMode').disabled = false;
        
        console.log('Map controls enabled');
    }

    setEditMode(mode) {
        this.editMode = mode;
        
        // Update button states
        document.querySelectorAll('#addRouteMode, #editRouteMode, #deleteRouteMode').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (mode !== 'view') {
            document.getElementById(mode + 'RouteMode').classList.add('active');
        }
        
        // Update cursor and instructions
        const mapElement = document.getElementById('planningMap');
        mapElement.style.cursor = mode === 'add' ? 'crosshair' : 'default';
        
        // Clear temporary drawing
        this.clearTempDrawing();
        
        // Show instructions
        this.showEditInstructions(mode);
    }

    showEditInstructions(mode) {
        const instructions = {
            'add': 'Click on the map to add points for a new route. Use the Finish button when done.',
            'edit': 'Click on a route to edit it. Drag the points to modify route path.',
            'delete': 'Click on a route to remove it from the plan.',
            'view': 'View mode - click routes to see details and select them.'
        };
        
        // Update status display
        document.getElementById('mapStatus').textContent = instructions[mode];
        console.log('Edit mode:', mode, '-', instructions[mode]);
    }

    addPointToRoute(latlng) {
        this.tempPoints.push(latlng);
        
        // Add marker for this point
        const marker = L.marker(latlng, {
            draggable: true,
            icon: L.divIcon({
                className: 'route-point-marker',
                html: `<div style="background: #ef4444; border-radius: 50%; width: 10px; height: 10px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
                iconSize: [10, 10]
            })
        }).addTo(this.map);
        
        marker.bindPopup(`Point ${this.tempPoints.length} - Drag to adjust`);
        
        // Update temp polyline
        if (this.tempPoints.length > 1) {
            if (this.tempPolyline) {
                this.map.removeLayer(this.tempPolyline);
            }
            
            this.tempPolyline = L.polyline(this.tempPoints, {
                color: '#ef4444',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(this.map);
        }
        
        // Add finish button after 2 points
        if (this.tempPoints.length >= 2 && !this.tempControl) {
            const finishButton = L.control({position: 'topright'});
            finishButton.onAdd = () => {
                const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                div.innerHTML = `
                    <button onclick="servicePlanning.finishRoute()" class="btn btn-success btn-sm">Finish Route</button>
                    <button onclick="servicePlanning.cancelRoute()" class="btn btn-secondary btn-sm ms-1">Cancel</button>
                `;
                return div;
            };
            finishButton.addTo(this.map);
            this.tempControl = finishButton;
        }
        
        // Update status
        document.getElementById('mapStatus').textContent = `Adding route: ${this.tempPoints.length} points added. Click to add more, then finish.`;
    }

    finishRoute() {
        if (this.tempPoints.length < 2) return;
        
        // Create permanent route
        const newRoute = {
            id: Date.now(),
            coordinates: [...this.tempPoints],
            distance: this.calculateRouteDistance(this.tempPoints),
            name: `User Route ${this.userRoutes.length + 1}`
        };
        
        this.userRoutes.push(newRoute);
        
        // Add to map
        const polyline = L.polyline(this.tempPoints, {
            color: '#10b981',
            weight: 4,
            opacity: 0.9
        }).bindPopup(`
            <strong>${newRoute.name}</strong><br>
            Distance: ${newRoute.distance.toFixed(1)} km<br>
            <button onclick="servicePlanning.deleteUserRoute(${newRoute.id})">Delete</button>
        `);
        
        this.mapLayers.user.addLayer(polyline);
        
        // Update comparison
        this.updateComparison();
        
        // Clear temp drawing
        this.clearTempDrawing();
        
        this.showSuccess('Route added successfully');
    }
    
    cancelRoute() {
        this.clearTempDrawing();
        this.setEditMode('view');
        document.getElementById('mapStatus').textContent = 'Route creation cancelled';
    }

    clearTempDrawing() {
        if (this.tempPolyline) {
            this.map.removeLayer(this.tempPolyline);
            this.tempPolyline = null;
        }
        
        // Clear temp markers
        if (this.tempPoints && this.tempPoints.length > 0) {
            this.tempPoints.forEach(marker => {
                if (marker && this.map.hasLayer(marker)) {
                    this.map.removeLayer(marker);
                }
            });
        }
        this.tempPoints = [];
        
        // Remove temp control
        if (this.tempControl) {
            this.map.removeControl(this.tempControl);
            this.tempControl = null;
        }
    }

    calculateRouteDistance(points) {
        let distance = 0;
        for (let i = 0; i < points.length - 1; i++) {
            distance += this.map.distance(points[i], points[i + 1]) / 1000; // km
        }
        return distance;
    }

    deleteUserRoute(routeId) {
        this.userRoutes = this.userRoutes.filter(route => route.id !== routeId);
        
        // Recreate user layer
        this.mapLayers.user.clearLayers();
        this.userRoutes.forEach(route => {
            const polyline = L.polyline(route.coordinates, {
                color: '#10b981',
                weight: 4,
                opacity: 0.9
            }).bindPopup(`
                <strong>${route.name}</strong><br>
                Distance: ${route.distance.toFixed(1)} km<br>
                <button onclick="servicePlanning.deleteUserRoute(${route.id})">Delete</button>
            `);
            
            this.mapLayers.user.addLayer(polyline);
        });
        
        this.updateComparison();
    }

    updateComparison() {
        if (this.userRoutes.length === 0) {
            document.getElementById('comparisonMetrics').style.display = 'none';
            document.getElementById('comparisonContent').innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-lightbulb me-2"></i>
                    Start modifying routes on the map to see comparisons
                </div>
            `;
            document.getElementById('comparisonContent').style.display = 'block';
            return;
        }
        
        // Calculate user plan metrics
        const userDistance = this.userRoutes.reduce((sum, route) => sum + route.distance, 0);
        const baselineDistance = this.optimizationData.results.optimizedNetwork.totalDistance;
        
        // Count removed baseline routes (those not visible anymore)
        let activeBaselineRoutes = 0;
        this.mapLayers.baseline.eachLayer(layer => {
            if (layer.routeData && layer.routeData.originalRoute) {
                activeBaselineRoutes++;
            }
        });
        
        const originalBaselineRoutes = this.baselineRoutes.length;
        const removedRoutes = originalBaselineRoutes - activeBaselineRoutes;
        
        const distanceChange = userDistance - baselineDistance;
        const distanceChangePercent = baselineDistance > 0 ? (distanceChange / baselineDistance) * 100 : 0;
        
        // Estimate cost change (assuming same cost per km)
        const costPerKm = this.optimizationData.algorithmParams?.costPerKm || 50000;
        const costChange = distanceChange * costPerKm;
        
        // Estimate mobility impact based on route changes
        const mobilityImpact = this.userRoutes.length > 0 ? (this.userRoutes.length * 2.5) - (removedRoutes * 1.8) : 0;
        
        // Update display
        document.getElementById('distanceChange').textContent = `${distanceChange >= 0 ? '+' : ''}${distanceChange.toFixed(1)} km`;
        document.getElementById('distanceChangePercent').textContent = `${distanceChangePercent >= 0 ? '+' : ''}${distanceChangePercent.toFixed(1)}%`;
        document.getElementById('distanceChangePercent').className = `metric-change ${distanceChangePercent <= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('mobilityChange').textContent = `${mobilityImpact >= 0 ? '+' : ''}${mobilityImpact.toFixed(1)}`;
        document.getElementById('mobilityChangePercent').textContent = `${mobilityImpact >= 0 ? '+' : ''}${(mobilityImpact * 0.8).toFixed(1)}%`;
        document.getElementById('mobilityChangePercent').className = `metric-change ${mobilityImpact >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('costChange').textContent = `PKR ${costChange >= 0 ? '+' : ''}${Math.abs(costChange).toLocaleString()}`;
        document.getElementById('costChangePercent').textContent = `${distanceChangePercent >= 0 ? '+' : ''}${distanceChangePercent.toFixed(1)}%`;
        document.getElementById('costChangePercent').className = `metric-change ${costChange <= 0 ? 'positive' : 'negative'}`;
        
        // Update route count summary
        const routesSummary = document.getElementById('routesSummary');
        if (routesSummary) {
            routesSummary.innerHTML = `
                <small class="text-muted">
                    <i class="fas fa-route me-1"></i>
                    ${this.userRoutes.length} added, ${removedRoutes} removed, ${activeBaselineRoutes} baseline active
                </small>
            `;
        }
        
        // Show comparison panel
        document.getElementById('comparisonContent').style.display = 'none';
        document.getElementById('comparisonMetrics').style.display = 'block';
        
        console.log(`Comparison updated: ${this.userRoutes.length} user routes, ${removedRoutes} removed, ${activeBaselineRoutes}/${originalBaselineRoutes} baseline routes`);
    }

    handleRouteClick(polyline) {
        if (this.editMode === 'edit') {
            this.startEditingRoute(polyline);
        } else if (this.editMode === 'delete') {
            this.deleteBaselineRoute(polyline);
        } else {
            // View mode - just highlight
            this.highlightRouteOnMap(polyline.routeData?.index || 0);
        }
    }
    
    startEditingRoute(polyline) {
        if (!polyline.routeData) return;
        
        // Create editable version of the route
        const coordinates = [...polyline.routeData.coordinates];
        
        // Remove original polyline
        this.mapLayers.baseline.removeLayer(polyline);
        
        // Create editable polyline
        this.tempPolyline = L.polyline(coordinates, {
            color: '#ef4444',
            weight: 4,
            opacity: 0.9,
            dashArray: '5, 5'
        }).addTo(this.map);
        
        // Add draggable markers for each point
        this.tempPoints = coordinates.map((coord, index) => {
            const marker = L.marker(coord, {
                draggable: true,
                icon: L.divIcon({
                    className: 'route-point-marker',
                    html: `<div style="background: #ef4444; border-radius: 50%; width: 12px; height: 12px; border: 2px solid white;"></div>`,
                    iconSize: [12, 12]
                })
            }).addTo(this.map);
            
            marker.on('drag', () => {
                coordinates[index] = marker.getLatLng();
                this.tempPolyline.setLatLngs(coordinates);
            });
            
            return marker;
        });
        
        // Add finish editing button
        const finishButton = L.control({position: 'topright'});
        finishButton.onAdd = () => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            div.innerHTML = '<button onclick="servicePlanning.finishEditingRoute()" class="btn btn-success btn-sm">Finish Editing</button>';
            return div;
        };
        finishButton.addTo(this.map);
        this.tempControl = finishButton;
        
        this.showSuccess('Route editing mode active. Drag points to modify the route.');
    }
    
    finishEditingRoute() {
        if (!this.tempPolyline || this.tempPoints.length === 0) return;
        
        // Get updated coordinates
        const newCoordinates = this.tempPoints.map(marker => marker.getLatLng());
        
        // Create new user route
        const newRoute = {
            id: Date.now(),
            coordinates: newCoordinates,
            distance: this.calculateRouteDistance(newCoordinates),
            name: `Edited Route ${this.userRoutes.length + 1}`,
            type: 'edited'
        };
        
        this.userRoutes.push(newRoute);
        
        // Add to user layer
        const polyline = L.polyline(newCoordinates, {
            color: '#10b981',
            weight: 4,
            opacity: 0.9
        }).bindPopup(`
            <strong>${newRoute.name}</strong><br>
            Distance: ${newRoute.distance.toFixed(1)} km<br>
            <button onclick="servicePlanning.deleteUserRoute(${newRoute.id})">Delete</button>
        `);
        
        this.mapLayers.user.addLayer(polyline);
        
        // Clean up editing
        this.clearTempDrawing();
        
        // Update comparison
        this.updateComparison();
        
        // Reset to view mode
        this.setEditMode('view');
        
        this.showSuccess('Route edited and saved successfully!');
    }
    
    editRoute(routeIndex) {
        // Find the route polyline and start editing
        let targetPolyline = null;
        this.mapLayers.baseline.eachLayer(layer => {
            if (layer.routeData && layer.routeData.index === routeIndex) {
                targetPolyline = layer;
            }
        });
        
        if (targetPolyline) {
            this.startEditingRoute(targetPolyline);
        }
    }
    
    deleteRoute(routeIndex) {
        // Find and remove the route
        let targetPolyline = null;
        this.mapLayers.baseline.eachLayer(layer => {
            if (layer.routeData && layer.routeData.index === routeIndex) {
                targetPolyline = layer;
            }
        });
        
        if (targetPolyline) {
            this.mapLayers.baseline.removeLayer(targetPolyline);
            this.updateComparison();
            this.showSuccess('Baseline route removed from view.');
        }
    }
    
    deleteBaselineRoute(polyline) {
        if (confirm('Remove this route from the plan?')) {
            this.mapLayers.baseline.removeLayer(polyline);
            this.showSuccess('Route removed from plan.');
            this.updateComparison();
        }
    }

    highlightRouteOnMap(routeIndex) {
        // Reset all route styles
        this.mapLayers.baseline.eachLayer(layer => {
            if (layer instanceof L.Polyline) {
                layer.setStyle({ weight: 4, opacity: 0.8 });
            }
        });
        
        // Highlight selected route
        let highlighted = false;
        this.mapLayers.baseline.eachLayer(layer => {
            if (layer.routeData && layer.routeData.index === routeIndex) {
                layer.setStyle({ weight: 6, opacity: 1.0 });
                highlighted = true;
            }
        });
        
        if (highlighted) {
            this.showSuccess('Route highlighted on map.');
        }
    }

    resetMapView() {
        try {
            if (this.mapLayers.baseline.getLayers().length > 0 || this.mapLayers.user.getLayers().length > 0) {
                const allLayers = [];
                this.mapLayers.baseline.eachLayer(layer => allLayers.push(layer));
                this.mapLayers.user.eachLayer(layer => allLayers.push(layer));
                this.mapLayers.markers.eachLayer(layer => allLayers.push(layer));
                
                if (allLayers.length > 0) {
                    const group = new L.featureGroup(allLayers);
                    this.map.fitBounds(group.getBounds().pad(0.1));
                } else {
                    this.map.setView([33.6844, 73.0479], 11);
                }
            } else {
                this.map.setView([33.6844, 73.0479], 11);
            }
        } catch (error) {
            console.error('Error resetting map view:', error);
            this.map.setView([33.6844, 73.0479], 11);
        }
        
        this.clearTempDrawing();
        this.setEditMode('view');
    }

    exportRoutes() {
        if (this.userRoutes.length === 0) {
            this.showError('No user routes to export');
            return;
        }
        
        const csvData = [
            ['Route Name', 'Start Lat', 'Start Lng', 'End Lat', 'End Lng', 'Distance (km)', 'Points Count']
        ];
        
        this.userRoutes.forEach(route => {
            const start = route.coordinates[0];
            const end = route.coordinates[route.coordinates.length - 1];
            
            csvData.push([
                route.name,
                start.lat.toFixed(6),
                start.lng.toFixed(6),
                end.lat.toFixed(6),
                end.lng.toFixed(6),
                route.distance.toFixed(2),
                route.coordinates.length
            ]);
        });
        
        this.downloadCSV(csvData, 'service_plan_routes.csv');
    }

    exportSummary() {
        if (!this.optimizationData) {
            this.showError('No optimization data to export');
            return;
        }
        
        const userDistance = this.userRoutes.reduce((sum, route) => sum + route.distance, 0);
        const baselineDistance = this.optimizationData.results.optimizedNetwork.totalDistance;
        
        const csvData = [
            ['Metric', 'Baseline', 'User Plan', 'Change', 'Change %'],
            ['Total Distance (km)', baselineDistance.toFixed(1), userDistance.toFixed(1), (userDistance - baselineDistance).toFixed(1), (((userDistance - baselineDistance) / baselineDistance) * 100).toFixed(1) + '%'],
            ['Number of Routes', this.baselineRoutes.length, this.userRoutes.length, this.userRoutes.length - this.baselineRoutes.length, ''],
            ['Region', this.selectedRegion, this.selectedRegion, '', ''],
            ['Export Date', new Date().toLocaleDateString(), '', '', '']
        ];
        
        this.downloadCSV(csvData, 'service_plan_summary.csv');
    }

    downloadCSV(data, filename) {
        const csvContent = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        this.showSuccess(`${filename} downloaded successfully`);
    }

    // Utility methods
    showLoading(message) {
        console.log('Loading:', message);
    }

    hideLoading() {
        console.log('Loading complete');
    }

    showError(message) {
        console.error('Error:', message);
        alert('Error: ' + message);
    }

    showSuccess(message) {
        console.log('Success:', message);
    }
}

// Initialize the service planning manager
let servicePlanning;
document.addEventListener('DOMContentLoaded', () => {
    servicePlanning = new InteractiveServicePlanning();
    
    // Make it globally available for inline event handlers
    window.servicePlanning = servicePlanning;
});
