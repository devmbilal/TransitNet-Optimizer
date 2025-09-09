/**
 * Route Optimization JavaScript
 * Handles interactive functionality for the route optimization interface
 */

class OptimizationManager {
    constructor() {
        this.currentSessionId = null;
        this.progressInterval = null;
        this.currentScreen = 'welcome';
        this.selectedRegion = null;
        this.resultsMap = null;
        this.charts = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
        console.log('Optimization Manager initialized');
    }

    bindEvents() {
        // Region selection
        document.getElementById('regionSelect').addEventListener('change', (e) => {
            this.onRegionChange(e.target.value);
        });

        // New optimization button
        document.getElementById('newOptimizationBtn').addEventListener('click', () => {
            this.startNewOptimization();
        });

        // Help button
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showHelp();
        });

        // Progress actions
        document.getElementById('cancelOptimization').addEventListener('click', () => {
            this.cancelOptimization();
        });

        document.getElementById('viewProgressDetails').addEventListener('click', () => {
            this.showProgressDetails();
        });

        // Export buttons
        document.getElementById('exportRecommendations').addEventListener('click', () => {
            this.exportData('recommendations');
        });

        document.getElementById('exportRoutes').addEventListener('click', () => {
            this.exportData('routes');
        });

        // Recent sessions
        document.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const sessionId = e.currentTarget.dataset.sessionId;
                this.loadSession(sessionId);
            });
        });
    }

    async loadInitialData() {
        // Check for any running sessions
        try {
            const response = await fetch('/optimization/api/sessions?status=running');
            const data = await response.json();
            
            if (data.success && data.sessions.length > 0) {
                // Resume the most recent running session
                const runningSession = data.sessions[0];
                this.currentSessionId = runningSession.sessionId;
                this.showProgressScreen();
                this.startProgressTracking();
            }
        } catch (error) {
            console.error('Error checking for running sessions:', error);
        }
    }

    async onRegionChange(region) {
        this.selectedRegion = region;
        
        if (!region) {
            document.getElementById('dataSummary').style.display = 'none';
            return;
        }

        try {
            // Show loading state
            this.showDataSummaryLoading();
            
            const response = await fetch(`/optimization/api/region-summary?region=${encodeURIComponent(region)}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayDataSummary(data.summary);
            } else {
                this.showError('Failed to load region data: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading region data:', error);
            this.showError('Failed to load region data');
        }
    }

    showDataSummaryLoading() {
        document.getElementById('dataSummary').style.display = 'block';
        document.getElementById('mobilityAreasCount').textContent = '...';
        document.getElementById('matrixFilesCount').textContent = '...';
        document.getElementById('transportRoutesCount').textContent = '...';
        document.getElementById('readinessStatus').textContent = 'Loading...';
        document.getElementById('readinessStatus').className = 'badge bg-secondary';
    }

    displayDataSummary(summary) {
        document.getElementById('dataSummary').style.display = 'block';
        document.getElementById('mobilityAreasCount').textContent = summary.mobilityAreas.count || 0;
        document.getElementById('matrixFilesCount').textContent = summary.mobilityMatrix.filesCount || 0;
        document.getElementById('transportRoutesCount').textContent = summary.existingRoutes.routesCount || 0;
        
        const readinessEl = document.getElementById('readinessStatus');
        if (summary.readyForOptimization) {
            readinessEl.textContent = 'Ready for Optimization';
            readinessEl.className = 'badge bg-success';
        } else {
            readinessEl.textContent = 'Missing Data';
            readinessEl.className = 'badge bg-warning';
        }
        
        // Handle mobility matrix file selection
        const mobilityMatrixSelection = document.getElementById('mobilityMatrixSelection');
        const mobilityMatrixSelect = document.getElementById('mobilityMatrixFileSelect');
        
        if (summary.mobilityMatrix.filesCount > 1) {
            // Show file selection if multiple files available
            mobilityMatrixSelection.style.display = 'block';
            
            // Clear existing options (except "Use all files")
            while (mobilityMatrixSelect.children.length > 1) {
                mobilityMatrixSelect.removeChild(mobilityMatrixSelect.lastChild);
            }
            
            // Add options for each file
            summary.mobilityMatrix.files.forEach(file => {
                const option = document.createElement('option');
                option.value = file._id;
                option.textContent = `${file.fileName} (${file.recordCount} records)`;
                mobilityMatrixSelect.appendChild(option);
            });
        } else {
            mobilityMatrixSelection.style.display = 'none';
        }
    }

    async startNewOptimization() {
        if (!this.selectedRegion) {
            this.showError('Please select a region first');
            return;
        }

        // Get algorithm parameters
        const algorithmParams = {
            distanceThreshold: parseFloat(document.getElementById('distanceThreshold').value) || null,
            mobilityConstant: parseFloat(document.getElementById('mobilityConstant').value) || 0.1,
            proximityRadius: parseInt(document.getElementById('proximityRadius').value) || 2000,
            costPerKm: parseFloat(document.getElementById('costPerKm').value) || 50000,
            // Recommendation filters
            recommendationFilters: {
                minMobility: parseFloat(document.getElementById('minMobility').value) || 0.5,
                maxDistance: parseFloat(document.getElementById('maxDistance').value) || 40,
                minEfficiency: parseFloat(document.getElementById('minEfficiency').value) || 0.01,
                maxRecommendations: 20
            }
        };
        
        // Get selected mobility matrix file if any
        const mobilityMatrixFileId = document.getElementById('mobilityMatrixFileSelect').value || null;

        try {
            this.showLoading('Starting optimization...');
            
            const response = await fetch('/optimization/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    region: this.selectedRegion,
                    algorithmParams: algorithmParams,
                    mobilityMatrixFileId: mobilityMatrixFileId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentSessionId = data.sessionId;
                this.showProgressScreen();
                this.startProgressTracking();
                this.showSuccess('Optimization started successfully');
            } else {
                this.showError('Failed to start optimization: ' + data.message);
            }
        } catch (error) {
            console.error('Error starting optimization:', error);
            this.showError('Failed to start optimization');
        } finally {
            this.hideLoading();
        }
    }

    showProgressScreen() {
        this.hideAllScreens();
        document.getElementById('progressScreen').style.display = 'block';
        this.currentScreen = 'progress';
        
        // Reset all phases to pending
        this.resetPhases();
    }

    resetPhases() {
        const phases = ['dataPreparation', 'networkConstruction', 'distanceFiltering', 'mobilityOptimization', 'resultsGeneration'];
        
        phases.forEach(phase => {
            const phaseEl = document.getElementById(`phase-${phase}`);
            phaseEl.className = 'phase-item';
            
            const statusBadge = phaseEl.querySelector('.status-badge');
            statusBadge.textContent = 'Pending';
            
            const progressBar = phaseEl.querySelector('.progress-bar');
            progressBar.style.width = '0%';
        });

        // Reset overall progress
        document.getElementById('overallProgress').textContent = '0%';
        document.getElementById('overallProgressBar').style.width = '0%';
    }

    startProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        this.progressInterval = setInterval(() => {
            this.updateProgress();
        }, 2000); // Check every 2 seconds

        // Initial update
        this.updateProgress();
    }

    async updateProgress() {
        if (!this.currentSessionId) return;

        try {
            const response = await fetch(`/optimization/api/status/${this.currentSessionId}`);
            const data = await response.json();

            if (data.success) {
                this.displayProgress(data.session);
                
                if (data.session.status === 'completed') {
                    this.stopProgressTracking();
                    this.loadResults(this.currentSessionId);
                } else if (data.session.status === 'failed') {
                    this.stopProgressTracking();
                    this.showError('Optimization failed: ' + data.session.errorMessage);
                }
            }
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    }

    displayProgress(session) {
        // Update overall progress
        document.getElementById('overallProgress').textContent = `${session.progress}%`;
        document.getElementById('overallProgressBar').style.width = `${session.progress}%`;

        // Update timing information
        this.updateTimingDisplay(session);

        // Update phases
        Object.keys(session.phases).forEach(phaseKey => {
            const phase = session.phases[phaseKey];
            const phaseEl = document.getElementById(`phase-${phaseKey}`);
            
            if (!phaseEl) return;

            // Update phase status
            phaseEl.className = `phase-item ${phase.status}`;
            
            const statusBadge = phaseEl.querySelector('.status-badge');
            statusBadge.textContent = this.capitalizeFirst(phase.status);
            
            const progressBar = phaseEl.querySelector('.progress-bar');
            progressBar.style.width = `${phase.progress || 0}%`;
        });
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    async loadResults(sessionId) {
        try {
            this.showLoading('Loading results...');
            
            const response = await fetch(`/optimization/api/results/${sessionId}`);
            const data = await response.json();

            if (data.success) {
                this.displayResults(data.results);
                this.showResultsScreen();
            } else {
                this.showError('Failed to load results: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading results:', error);
            this.showError('Failed to load results');
        } finally {
            this.hideLoading();
        }
    }

    showResultsScreen() {
        this.hideAllScreens();
        document.getElementById('resultsScreen').style.display = 'block';
        this.currentScreen = 'results';
    }

    displayResults(results) {
        // Update metrics
        document.getElementById('mobilityImprovement').textContent = 
            results.results.improvements.mobilityIncrease.toFixed(1);
        document.getElementById('distanceReduction').textContent = 
            results.results.improvements.distanceReduction.toFixed(1);
        document.getElementById('efficiencyGain').textContent = 
            results.results.improvements.efficiencyGain.toFixed(1);
        document.getElementById('recommendationsCount').textContent = 
            results.recommendations.length;

        // Display recommendations
        this.displayRecommendations(results.recommendations);
        
        // Load visualization data and create map
        this.loadVisualization(results.sessionId);
        
        // Create charts
        this.createCharts(results.results);
    }

    updateTimingDisplay(session) {
        // Add timing display if elements exist
        if (session.elapsedTimeMs) {
            const elapsedSeconds = Math.floor(session.elapsedTimeMs / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            const elapsedText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Try to find or create elapsed time display
            let elapsedTimeEl = document.getElementById('elapsedTime');
            if (!elapsedTimeEl) {
                // Create timing display if it doesn't exist
                const progressActions = document.querySelector('.progress-actions');
                if (progressActions) {
                    const timingDiv = document.createElement('div');
                    timingDiv.className = 'timing-info mt-2 text-center text-muted';
                    timingDiv.innerHTML = `<small>Elapsed Time: <span id="elapsedTime">${elapsedText}</span></small>`;
                    progressActions.parentNode.insertBefore(timingDiv, progressActions);
                }
            } else {
                elapsedTimeEl.textContent = elapsedText;
            }
        }
        
        // Display cost per km if available
        if (session.algorithmParams && session.algorithmParams.costPerKm) {
            let costInfoEl = document.getElementById('costPerKmDisplay');
            if (!costInfoEl) {
                const timingInfo = document.querySelector('.timing-info');
                if (timingInfo) {
                    const costDiv = document.createElement('div');
                    costDiv.className = 'cost-info text-center text-muted';
                    costDiv.innerHTML = `<small>Cost per km: <span id="costPerKmDisplay">PKR ${session.algorithmParams.costPerKm.toLocaleString()}</span></small>`;
                    timingInfo.appendChild(costDiv);
                }
            }
        }
    }

    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendationsList');
        container.innerHTML = '';

        recommendations.slice(0, 10).forEach(rec => {
            const recEl = document.createElement('div');
            recEl.className = 'recommendation-item';
            
            recEl.innerHTML = `
                <div class="recommendation-header">
                    <div class="recommendation-priority">${rec.priority}</div>
                    <div class="recommendation-info">
                        <div class="recommendation-route">
                            ${rec.fromArea} → ${rec.toArea}
                        </div>
                        <div class="recommendation-details">
                            ${rec.actionType} • ${rec.recommendationType.replace('_', ' ')}
                        </div>
                        <div class="recommendation-metrics">
                            <div class="recommendation-metric">
                                <span class="recommendation-metric-label">Distance:</span>
                                <span class="recommendation-metric-value">${rec.recommendedRoute.distance.toFixed(1)}km</span>
                            </div>
                            <div class="recommendation-metric">
                                <span class="recommendation-metric-label">Impact:</span>
                                <span class="recommendation-metric-value">${rec.expectedImprovement.impactScore}/100</span>
                            </div>
                            <div class="recommendation-metric">
                                <span class="recommendation-metric-label">Cost:</span>
                                <span class="recommendation-metric-value">PKR ${rec.implementationDetails.estimatedCost.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            container.appendChild(recEl);
        });
    }

    async loadVisualization(sessionId) {
        try {
            const response = await fetch(`/optimization/api/visualization/${sessionId}`);
            const data = await response.json();

            if (data.success) {
                this.createResultsMap(data.data);
            }
        } catch (error) {
            console.error('Error loading visualization data:', error);
        }
    }

    createResultsMap(visualizationData) {
        if (this.resultsMap) {
            this.resultsMap.remove();
        }

        this.resultsMap = L.map('resultsMap').setView([33.6844, 73.0479], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.resultsMap);

        // Add mobility nodes
        visualizationData.mobilityNodes.forEach(node => {
            L.circleMarker([node.latitude, node.longitude], {
                radius: 6,
                fillColor: '#2563eb',
                color: '#ffffff',
                weight: 2,
                fillOpacity: 0.8
            })
            .bindPopup(`<b>${node.name}</b><br>Mobility Node`)
            .addTo(this.resultsMap);
        });

        // Add existing routes
        visualizationData.existingRoutes.forEach(route => {
            const coordinates = route.stops.map(stop => [stop.latitude, stop.longitude]);
            L.polyline(coordinates, {
                color: '#64748b',
                weight: 3,
                opacity: 0.7,
                dashArray: '5,5'
            })
            .bindPopup(`<b>${route.name}</b><br>Existing Route`)
            .addTo(this.resultsMap);
        });

        // Add optimized routes (top 10)
        visualizationData.optimizedRoutes.slice(0, 10).forEach((route, index) => {
            const coordinates = route.path.map(point => [point.latitude, point.longitude]);
            const color = this.getRouteColor(index);
            
            L.polyline(coordinates, {
                color: color,
                weight: 4,
                opacity: 0.8
            })
            .bindPopup(`
                <b>Optimized Route ${index + 1}</b><br>
                ${route.fromArea} → ${route.toArea}<br>
                Distance: ${route.distance.toFixed(1)}km<br>
                Mobility: ${route.mobility.toFixed(1)}%<br>
                Efficiency: ${route.efficiency.toFixed(2)}
            `)
            .addTo(this.resultsMap);
        });

        // Fit map to show all data
        const allPoints = [
            ...visualizationData.mobilityNodes.map(n => [n.latitude, n.longitude]),
            ...visualizationData.existingRoutes.flatMap(r => 
                r.stops.map(s => [s.latitude, s.longitude])
            )
        ];

        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            this.resultsMap.fitBounds(bounds, { padding: [20, 20] });
        }
    }

    getRouteColor(index) {
        const colors = [
            '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
            '#06b6d4', '#84cc16', '#f97316', '#ec4899',
            '#14b8a6', '#a855f7'
        ];
        return colors[index % colors.length];
    }

    createCharts(results) {
        this.createSeparateNetworkCharts(results);
        this.createImprovementChart(results);
    }

    createSeparateNetworkCharts(results) {
        // Debug logging
        console.log('📊 Network Metrics Debug Info:', {
            'Original Network': {
                distance: results.originalNetwork.totalDistance + ' km',
                mobility: results.originalNetwork.totalMobility,
                efficiency: (results.originalNetwork.networkEfficiency * 100).toFixed(4) + '%'
            },
            'Optimized Network': {
                distance: results.optimizedNetwork.totalDistance + ' km', 
                mobility: results.optimizedNetwork.totalMobility,
                efficiency: (results.optimizedNetwork.networkEfficiency * 100).toFixed(4) + '%'
            }
        });
        
        // Create individual charts for better visibility
        this.createDistanceChart(results);
        this.createMobilityChart(results);
        this.createEfficiencyChart(results);
    }

    createDistanceChart(results) {
        const ctx = document.getElementById('distanceChart').getContext('2d');
        
        if (this.charts.distance) {
            this.charts.distance.destroy();
        }

        this.charts.distance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Original', 'Optimized'],
                datasets: [{
                    label: 'Total Distance (km)',
                    data: [
                        results.originalNetwork.totalDistance,
                        results.optimizedNetwork.totalDistance
                    ],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(16, 185, 129, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Total Distance Comparison'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toFixed(1) + ' km';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + ' km';
                            }
                        }
                    }
                }
            }
        });
    }

    createMobilityChart(results) {
        const ctx = document.getElementById('mobilityChart').getContext('2d');
        
        if (this.charts.mobility) {
            this.charts.mobility.destroy();
        }

        this.charts.mobility = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Original', 'Optimized'],
                datasets: [{
                    label: 'Total Mobility',
                    data: [
                        results.originalNetwork.totalMobility,
                        results.optimizedNetwork.totalMobility
                    ],
                    backgroundColor: [
                        'rgba(100, 116, 139, 0.8)',
                        'rgba(37, 99, 235, 0.8)'
                    ],
                    borderColor: [
                        'rgba(100, 116, 139, 1)',
                        'rgba(37, 99, 235, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Total Mobility Comparison'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                }
            }
        });
    }

    createEfficiencyChart(results) {
        const ctx = document.getElementById('efficiencyChart').getContext('2d');
        
        if (this.charts.efficiency) {
            this.charts.efficiency.destroy();
        }

        this.charts.efficiency = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Original', 'Optimized'],
                datasets: [{
                    label: 'Network Efficiency (%)',
                    data: [
                        results.originalNetwork.networkEfficiency * 100,
                        results.optimizedNetwork.networkEfficiency * 100
                    ],
                    backgroundColor: [
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgba(245, 158, 11, 1)',
                        'rgba(16, 185, 129, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Network Efficiency Comparison'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y.toFixed(4) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (value < 0.1) {
                                    return value.toFixed(4) + '%';
                                } else {
                                    return value.toFixed(2) + '%';
                                }
                            }
                        }
                    }
                }
            }
        });
    }


    createImprovementChart(results) {
        const ctx = document.getElementById('improvementChart').getContext('2d');
        
        if (this.charts.improvement) {
            this.charts.improvement.destroy();
        }

        this.charts.improvement = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Distance Reduction (%)', 'Mobility Increase (%)', 'Efficiency Gain (%)'],
                datasets: [{
                    data: [
                        Math.abs(results.improvements.distanceReduction),
                        results.improvements.mobilityIncrease,
                        results.improvements.efficiencyGain
                    ],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(37, 99, 235, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(37, 99, 235, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Improvement Metrics (%)'
                    },
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                return label + ': ' + value.toFixed(2) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    async exportData(type) {
        if (!this.currentSessionId) {
            this.showError('No session data to export');
            return;
        }

        try {
            const response = await fetch(`/optimization/api/export/${this.currentSessionId}?format=${type}`);
            
            if (response.ok) {
                // Create download link
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                
                const contentDisposition = response.headers.get('Content-Disposition');
                const filename = contentDisposition 
                    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                    : `optimization_${type}_${this.currentSessionId}.csv`;
                
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess(`${type} exported successfully`);
            } else {
                const data = await response.json();
                this.showError('Export failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showError('Export failed');
        }
    }

    async loadSession(sessionId) {
        try {
            this.showLoading('Loading session...');
            this.currentSessionId = sessionId;
            
            const response = await fetch(`/optimization/api/status/${sessionId}`);
            const data = await response.json();

            if (data.success) {
                const session = data.session;
                
                if (session.status === 'completed') {
                    this.loadResults(sessionId);
                } else if (session.status === 'running') {
                    this.showProgressScreen();
                    this.displayProgress(session);
                    this.startProgressTracking();
                } else if (session.status === 'failed') {
                    this.showError('Session failed: ' + session.errorMessage);
                } else {
                    this.showProgressScreen();
                    this.displayProgress(session);
                }
            } else {
                this.showError('Failed to load session: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading session:', error);
            this.showError('Failed to load session');
        } finally {
            this.hideLoading();
        }
    }

    cancelOptimization() {
        if (this.progressInterval) {
            this.stopProgressTracking();
        }
        this.currentSessionId = null;
        this.showWelcomeScreen();
    }

    showWelcomeScreen() {
        this.hideAllScreens();
        document.getElementById('welcomeScreen').style.display = 'block';
        this.currentScreen = 'welcome';
    }

    hideAllScreens() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('progressScreen').style.display = 'none';
        document.getElementById('resultsScreen').style.display = 'none';
    }

    showProgressDetails() {
        // Could implement a modal with detailed progress information
        console.log('Show progress details - to be implemented');
    }

    showHelp() {
        // Could implement a help modal or redirect to documentation
        alert('Help: Select a region with mobility and transport data, configure parameters, and start optimization.');
    }

    // Utility methods
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showLoading(message = 'Loading...') {
        // Implementation depends on your loading UI
        console.log('Loading:', message);
    }

    hideLoading() {
        console.log('Loading hidden');
    }

    showError(message) {
        console.error('Error:', message);
        alert('Error: ' + message);
    }

    showSuccess(message) {
        console.log('Success:', message);
        // Could implement a toast notification
    }
}

// Initialize the optimization manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.optimizationManager = new OptimizationManager();
});
