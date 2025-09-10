/**
 * Service Planning JavaScript
 * Handles interactive functionality for the service planning interface
 * Integrates with Route Optimization results for decision support
 */

class ServicePlanningManager {
    constructor() {
        this.currentSessionId = null;
        this.currentOptimizationData = null;
        this.currentSession = null;
        this.selectedScenarioId = null;
        this.scenarios = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('Service Planning Manager initialized');
    }

    bindEvents() {
        // Optimization selection
        document.getElementById('optimizationSelect').addEventListener('change', (e) => {
            this.onOptimizationChange(e.target.value);
        });

        // Session management
        document.getElementById('newPlanningSessionBtn').addEventListener('click', () => {
            this.showNewSessionModal();
        });

        document.getElementById('createSessionBtn').addEventListener('click', () => {
            this.createPlanningSession();
        });

        document.getElementById('saveSessionBtn').addEventListener('click', () => {
            this.saveCurrentSession();
        });

        document.getElementById('loadSessionBtn').addEventListener('click', () => {
            this.loadSessionDialog();
        });

        // Scenario management
        document.getElementById('addScenarioBtn').addEventListener('click', () => {
            this.showScenarioModal();
        });

        document.getElementById('saveScenarioBtn').addEventListener('click', () => {
            this.saveScenario();
        });

        document.getElementById('simulateScenarioBtn').addEventListener('click', () => {
            this.simulateScenario();
        });

        // Decision tools
        document.getElementById('finalizeDecisionBtn').addEventListener('click', () => {
            this.finalizeDecision();
        });

        document.getElementById('exportPlanBtn').addEventListener('click', () => {
            this.exportPlan();
        });

        // Recent sessions
        document.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const sessionId = e.currentTarget.dataset.sessionId;
                this.loadSession(sessionId);
            });
        });

        // Help
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showHelp();
        });

        // Route change management will be handled by bindDynamicEvents()
    }

    // Bind events for dynamically created elements
    bindDynamicEvents() {
        // Remove existing event listeners to prevent duplicates
        this.removeDynamicEventListeners();
        
        // Route change management
        const addRouteChangeBtn = document.getElementById('addRouteChangeBtn');
        if (addRouteChangeBtn && !addRouteChangeBtn.hasAttribute('data-listener-attached')) {
            addRouteChangeBtn.addEventListener('click', () => {
                this.addRouteChangeForm();
            });
            addRouteChangeBtn.setAttribute('data-listener-attached', 'true');
            console.log('Route change button event listener attached');
        }

        const addScheduleAdjustmentBtn = document.getElementById('addScheduleAdjustmentBtn');
        if (addScheduleAdjustmentBtn && !addScheduleAdjustmentBtn.hasAttribute('data-listener-attached')) {
            addScheduleAdjustmentBtn.addEventListener('click', () => {
                this.addScheduleAdjustmentForm();
            });
            addScheduleAdjustmentBtn.setAttribute('data-listener-attached', 'true');
            console.log('Schedule adjustment button event listener attached');
        }
    }
    
    // Remove dynamic event listeners to prevent duplicates
    removeDynamicEventListeners() {
        const addRouteChangeBtn = document.getElementById('addRouteChangeBtn');
        if (addRouteChangeBtn) {
            addRouteChangeBtn.removeAttribute('data-listener-attached');
        }
        
        const addScheduleAdjustmentBtn = document.getElementById('addScheduleAdjustmentBtn');
        if (addScheduleAdjustmentBtn) {
            addScheduleAdjustmentBtn.removeAttribute('data-listener-attached');
        }
    }

    async onOptimizationChange(optimizationSessionId) {
        if (!optimizationSessionId) {
            document.getElementById('optimizationSummary').style.display = 'none';
            return;
        }

        try {
            this.showLoading('Loading optimization data...');
            
            const response = await fetch(`/service-planning/api/optimization-data?optimizationSessionId=${encodeURIComponent(optimizationSessionId)}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentOptimizationData = data.data;
                this.displayOptimizationSummary(data.data);
                this.enableNewSessionButton();
            } else {
                this.showError('Failed to load optimization data: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading optimization data:', error);
            this.showError('Failed to load optimization data');
        } finally {
            this.hideLoading();
        }
    }

    displayOptimizationSummary(data) {
        document.getElementById('summaryRegion').textContent = data.region;
        document.getElementById('summaryDistanceReduction').textContent = 
            data.baselineMetrics.optimizationImprovements.distanceReduction.toFixed(1) + '%';
        document.getElementById('summaryMobilityIncrease').textContent = 
            data.baselineMetrics.optimizationImprovements.mobilityIncrease.toFixed(1) + '%';
        document.getElementById('summaryEfficiencyGain').textContent = 
            data.baselineMetrics.optimizationImprovements.efficiencyGain.toFixed(1) + '%';
        
        document.getElementById('optimizationSummary').style.display = 'block';
    }

    enableNewSessionButton() {
        document.getElementById('newPlanningSessionBtn').disabled = false;
    }

    showNewSessionModal() {
        if (!this.currentOptimizationData) {
            this.showError('Please select an optimization session first');
            return;
        }

        document.getElementById('modalOptimizationSessionId').value = this.currentOptimizationData.optimizationSessionId;
        document.getElementById('modalOptimizationInfo').value = 
            `${this.currentOptimizationData.region} - ${new Date(this.currentOptimizationData.completedAt).toLocaleDateString()}`;
        
        document.getElementById('sessionTitle').value = 
            `Service Planning - ${this.currentOptimizationData.region}`;
        document.getElementById('sessionDescription').value = '';
        
        const modal = new bootstrap.Modal(document.getElementById('newSessionModal'));
        modal.show();
    }

    async createPlanningSession() {
        const optimizationSessionId = document.getElementById('modalOptimizationSessionId').value;
        const title = document.getElementById('sessionTitle').value;
        const description = document.getElementById('sessionDescription').value;

        if (!title.trim()) {
            this.showError('Please enter a session title');
            return;
        }

        try {
            this.showLoading('Creating planning session...');
            
            const response = await fetch('/service-planning/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    optimizationSessionId,
                    title: title.trim(),
                    description: description.trim()
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentSessionId = data.sessionId;
                bootstrap.Modal.getInstance(document.getElementById('newSessionModal')).hide();
                await this.loadSession(data.sessionId);
                this.showSuccess('Planning session created successfully');
            } else {
                this.showError('Failed to create session: ' + data.message);
            }
        } catch (error) {
            console.error('Error creating session:', error);
            this.showError('Failed to create planning session');
        } finally {
            this.hideLoading();
        }
    }

    async loadSession(sessionId) {
        try {
            this.showLoading('Loading session...');
            
            const response = await fetch(`/service-planning/api/sessions/${sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentSession = data.session;
                this.currentSessionId = sessionId;
                this.scenarios = data.session.scenarios || [];
                
                this.displaySession(data.session);
                this.showPlanningDashboard();
                this.displayMetrics(data.session.baselineMetrics);
                this.displayScenarios(this.scenarios);
                this.enableDecisionTools();
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

    displaySession(session) {
        document.getElementById('currentSessionTitle').textContent = session.title;
        document.getElementById('currentSessionRegion').textContent = session.region;
        document.getElementById('currentSessionStatus').textContent = session.status;
        document.getElementById('currentSessionStatus').className = `badge badge-${session.status}`;
        
        document.getElementById('activeSessionCard').style.display = 'block';
    }

    showPlanningDashboard() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('planningDashboard').style.display = 'block';
    }

    displayMetrics(baselineMetrics) {
        document.getElementById('metricDistance').textContent = baselineMetrics.totalDistance.toFixed(1);
        document.getElementById('metricMobility').textContent = baselineMetrics.totalMobility.toFixed(2);
        document.getElementById('metricEfficiency').textContent = baselineMetrics.networkEfficiency.toFixed(4);
        document.getElementById('metricCost').textContent = 'PKR ' + baselineMetrics.estimatedCost.toLocaleString();
        
        // Display optimization improvements as changes
        document.getElementById('metricDistanceChange').textContent = 
            baselineMetrics.optimizationImprovements.distanceReduction.toFixed(1) + '% reduction';
        document.getElementById('metricMobilityChange').textContent = 
            '+' + baselineMetrics.optimizationImprovements.mobilityIncrease.toFixed(1) + '%';
        document.getElementById('metricEfficiencyChange').textContent = 
            '+' + baselineMetrics.optimizationImprovements.efficiencyGain.toFixed(1) + '%';
        document.getElementById('metricCostChange').textContent = 'Optimized baseline';
        
        // Style the change indicators
        document.getElementById('metricDistanceChange').className = 'metric-change text-success';
        document.getElementById('metricMobilityChange').className = 'metric-change text-success';
        document.getElementById('metricEfficiencyChange').className = 'metric-change text-success';
        document.getElementById('metricCostChange').className = 'metric-change text-info';
    }

    displayScenarios(scenarios) {
        const container = document.getElementById('scenariosList');
        container.innerHTML = '';

        if (scenarios.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-layer-group fa-2x mb-2"></i>
                    <p class="mb-0">No scenarios created yet</p>
                    <small>Click "Add Scenario" to start exploring alternatives</small>
                </div>
            `;
            return;
        }

        scenarios.forEach((scenario, index) => {
            const scenarioElement = document.createElement('div');
            scenarioElement.className = 'scenario-item';
            scenarioElement.dataset.scenarioId = scenario.scenarioId;
            
            const isBaseline = scenario.isBaseline;
            const badgeClass = isBaseline ? 'bg-primary' : 'bg-secondary';
            const badgeText = isBaseline ? 'Baseline' : 'Scenario';
            
            scenarioElement.innerHTML = `
                <div class="scenario-header">
                    <div class="scenario-info">
                        <div class="scenario-name">${scenario.name}</div>
                        <div class="scenario-description">${scenario.description || 'No description'}</div>
                    </div>
                    <div class="scenario-badge">
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                </div>
                <div class="scenario-metrics">
                    ${scenario.predictedImpacts ? this.renderScenarioMetrics(scenario.predictedImpacts.metrics) : ''}
                </div>
                <div class="scenario-actions">
                    <button class="btn btn-outline-primary btn-sm" onclick="servicePlanningManager.selectScenario('${scenario.scenarioId}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    ${!isBaseline ? `
                        <button class="btn btn-outline-secondary btn-sm" onclick="servicePlanningManager.editScenario('${scenario.scenarioId}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="servicePlanningManager.deleteScenario('${scenario.scenarioId}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                </div>
            `;
            
            container.appendChild(scenarioElement);
        });
    }

    renderScenarioMetrics(metrics) {
        if (!metrics) return '<div class="text-muted">No metrics calculated</div>';
        
        return `
            <div class="row">
                <div class="col-6">
                    <small class="text-muted">Distance:</small> ${metrics.totalDistance?.toFixed(1) || '-'} km
                </div>
                <div class="col-6">
                    <small class="text-muted">Mobility:</small> ${metrics.totalMobility?.toFixed(1) || '-'}
                </div>
                <div class="col-6">
                    <small class="text-muted">Cost:</small> PKR ${metrics.estimatedCost?.toLocaleString() || '-'}
                </div>
                <div class="col-6">
                    <small class="text-muted">Ridership:</small> ${metrics.ridership?.toLocaleString() || '-'}
                </div>
            </div>
        `;
    }

    selectScenario(scenarioId) {
        this.selectedScenarioId = scenarioId;
        const scenario = this.scenarios.find(s => s.scenarioId === scenarioId);
        
        if (scenario) {
            this.displayImpactAnalysis(scenario);
            this.highlightSelectedScenario(scenarioId);
        }
    }

    highlightSelectedScenario(scenarioId) {
        // Remove previous selections
        document.querySelectorAll('.scenario-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Highlight selected scenario
        const selectedElement = document.querySelector(`[data-scenario-id="${scenarioId}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
    }

    displayImpactAnalysis(scenario) {
        const container = document.getElementById('impactAnalysis');
        
        if (!scenario.predictedImpacts) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-calculator fa-2x mb-2"></i>
                    <p class="mb-0">No impact analysis available</p>
                </div>
            `;
            return;
        }

        const impacts = scenario.predictedImpacts;
        
        container.innerHTML = `
            <div class="impact-section">
                <h6><i class="fas fa-chart-bar me-2"></i>Predicted Changes</h6>
                <div class="row">
                    <div class="col-6">
                        <div class="impact-metric">
                            <span class="impact-label">Distance Change:</span>
                            <span class="impact-value ${impacts.improvements.distanceChange >= 0 ? 'text-success' : 'text-danger'}">
                                ${impacts.improvements.distanceChange >= 0 ? '+' : ''}${impacts.improvements.distanceChange?.toFixed(1) || 0}%
                            </span>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="impact-metric">
                            <span class="impact-label">Mobility Change:</span>
                            <span class="impact-value ${impacts.improvements.mobilityChange >= 0 ? 'text-success' : 'text-danger'}">
                                ${impacts.improvements.mobilityChange >= 0 ? '+' : ''}${impacts.improvements.mobilityChange?.toFixed(1) || 0}%
                            </span>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="impact-metric">
                            <span class="impact-label">Cost Change:</span>
                            <span class="impact-value ${impacts.improvements.costChange >= 0 ? 'text-danger' : 'text-success'}">
                                PKR ${impacts.improvements.costChange >= 0 ? '+' : ''}${impacts.improvements.costChange?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="impact-metric">
                            <span class="impact-label">Ridership:</span>
                            <span class="impact-value ${impacts.improvements.ridership >= 0 ? 'text-success' : 'text-danger'}">
                                ${impacts.improvements.ridership >= 0 ? '+' : ''}${impacts.improvements.ridership?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${impacts.risks && impacts.risks.length > 0 ? this.renderRiskAssessment(impacts.risks) : ''}
            
            <div class="impact-section">
                <h6><i class="fas fa-shield-alt me-2"></i>Confidence Levels</h6>
                <div class="confidence-bars">
                    ${this.renderConfidenceBar('Overall', impacts.confidence.overall)}
                    ${this.renderConfidenceBar('Ridership', impacts.confidence.ridership)}
                    ${this.renderConfidenceBar('Cost', impacts.confidence.cost)}
                    ${this.renderConfidenceBar('Efficiency', impacts.confidence.efficiency)}
                </div>
            </div>
        `;
    }

    renderRiskAssessment(risks) {
        const riskItems = risks.map(risk => {
            const levelClass = {
                'low': 'text-success',
                'medium': 'text-warning', 
                'high': 'text-danger',
                'critical': 'text-danger fw-bold'
            }[risk.level] || 'text-muted';
            
            return `
                <div class="risk-item">
                    <div class="risk-header">
                        <span class="risk-category badge bg-${risk.category === 'financial' ? 'warning' : risk.category === 'operational' ? 'info' : risk.category === 'social' ? 'success' : 'secondary'}">${risk.category}</span>
                        <span class="risk-level ${levelClass}">${risk.level.toUpperCase()}</span>
                    </div>
                    <div class="risk-description">${risk.description}</div>
                    ${risk.mitigation ? `<div class="risk-mitigation"><strong>Mitigation:</strong> ${risk.mitigation}</div>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="impact-section">
                <h6><i class="fas fa-exclamation-triangle me-2"></i>Risk Assessment</h6>
                <div class="risk-list">
                    ${riskItems}
                </div>
            </div>
        `;
    }

    renderConfidenceBar(label, value) {
        const percentage = Math.round(value || 0);
        const colorClass = percentage >= 80 ? 'bg-success' : percentage >= 60 ? 'bg-warning' : 'bg-danger';
        
        return `
            <div class="confidence-item">
                <div class="d-flex justify-content-between mb-1">
                    <span class="confidence-label">${label}</span>
                    <span class="confidence-value">${percentage}%</span>
                </div>
                <div class="progress progress-sm">
                    <div class="progress-bar ${colorClass}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }

    showScenarioModal() {
        if (!this.currentSession) {
            this.showError('No active planning session');
            return;
        }

        document.getElementById('scenarioName').value = '';
        document.getElementById('scenarioDescription').value = '';
        this.clearScenarioForms();
        
        const modal = new bootstrap.Modal(document.getElementById('scenarioModal'));
        modal.show();
        
        // Ensure dynamic events are bound after modal is shown
        setTimeout(() => this.bindDynamicEvents(), 100);
    }

    clearScenarioForms() {
        document.getElementById('routeChanges').innerHTML = `
            <button type="button" class="btn btn-outline-primary btn-sm" id="addRouteChangeBtn">
                <i class="fas fa-plus"></i> Add Route Change
            </button>
        `;
        document.getElementById('scheduleAdjustments').innerHTML = `
            <button type="button" class="btn btn-outline-secondary btn-sm" id="addScheduleAdjustmentBtn">
                <i class="fas fa-clock"></i> Add Schedule Change
            </button>
        `;
        
        // Re-bind event listeners for the newly created buttons
        this.bindDynamicEvents();
    }

    addRouteChangeForm() {
        const container = document.getElementById('routeChanges');
        const formId = 'routeChange_' + Date.now();
        
        const formDiv = document.createElement('div');
        formDiv.className = 'route-change-form border p-3 mb-2';
        formDiv.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <label class="form-label">Action</label>
                    <select class="form-select" name="action">
                        <option value="add">Add Route</option>
                        <option value="remove">Remove Route</option>
                        <option value="modify">Modify Route</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Route Name</label>
                    <input type="text" class="form-control" name="routeName" placeholder="Route name...">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Distance (km)</label>
                    <input type="number" class="form-control" name="distance" placeholder="0" step="0.1">
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-md-6">
                    <label class="form-label">From Area</label>
                    <input type="text" class="form-control" name="fromArea" placeholder="Origin area...">
                </div>
                <div class="col-md-6">
                    <label class="form-label">To Area</label>
                    <input type="text" class="form-control" name="toArea" placeholder="Destination area...">
                </div>
            </div>
            <div class="mt-2">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        
        container.insertBefore(formDiv, container.lastElementChild);
        
        // Re-bind events for the add button in case it was recreated
        this.bindDynamicEvents();
    }

    addScheduleAdjustmentForm() {
        const container = document.getElementById('scheduleAdjustments');
        
        const formDiv = document.createElement('div');
        formDiv.className = 'schedule-adjustment-form border p-3 mb-2';
        formDiv.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <label class="form-label">Route Name</label>
                    <input type="text" class="form-control" name="routeName" placeholder="Route name...">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Current Frequency</label>
                    <input type="text" class="form-control" name="currentFrequency" placeholder="e.g., Every 15 minutes">
                </div>
                <div class="col-md-4">
                    <label class="form-label">New Frequency</label>
                    <input type="text" class="form-control" name="newFrequency" placeholder="e.g., Every 10 minutes">
                </div>
            </div>
            <div class="mt-2">
                <label class="form-label">Impact Description</label>
                <textarea class="form-control" name="impactDescription" rows="2" placeholder="Describe the expected impact..."></textarea>
            </div>
            <div class="mt-2">
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        
        container.insertBefore(formDiv, container.lastElementChild);
    }

    async simulateScenario() {
        console.log('Starting scenario simulation...');
        
        // Validate session
        if (!this.currentSessionId) {
            this.showError('No active planning session. Please create or load a session first.');
            return;
        }
        
        // Collect and validate modifications
        const modifications = this.collectScenarioModifications();
        
        if (!modifications.routeChanges.length && !modifications.scheduleAdjustments.length) {
            this.showError('Please add some route changes or schedule adjustments to simulate');
            return;
        }
        
        console.log('Modifications to simulate:', modifications);

        try {
            this.showLoading('Simulating scenario...');
            
            const response = await fetch(`/service-planning/api/sessions/${this.currentSessionId}/simulate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ modifications })
            });
            
            console.log('Simulation response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Simulation response data:', data);
            
            if (data.success) {
                // Show simulation results
                this.displaySimulationResults(data.predictedImpacts);
                this.showSuccess('Scenario simulation completed successfully');
            } else {
                this.showError(`Simulation failed: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error simulating scenario:', error);
            this.showError(`Simulation failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    collectScenarioModifications() {
        const modifications = {
            routeChanges: [],
            scheduleAdjustments: [],
            capacityChanges: []
        };

        console.log('Collecting scenario modifications...');

        // Collect route changes
        const routeChangeForms = document.querySelectorAll('.route-change-form');
        console.log(`Found ${routeChangeForms.length} route change forms`);
        
        routeChangeForms.forEach((form, index) => {
            try {
                const actionElement = form.querySelector('[name="action"]');
                const routeNameElement = form.querySelector('[name="routeName"]');
                const fromAreaElement = form.querySelector('[name="fromArea"]');
                const toAreaElement = form.querySelector('[name="toArea"]');
                const distanceElement = form.querySelector('[name="distance"]');
                
                if (!actionElement || !routeNameElement) {
                    console.warn(`Route change form ${index} missing required elements`);
                    return;
                }
                
                const routeChange = {
                    action: actionElement.value || 'add',
                    routeName: routeNameElement.value || '',
                    routeDetails: {
                        fromArea: fromAreaElement ? fromAreaElement.value : '',
                        toArea: toAreaElement ? toAreaElement.value : '',
                        distance: distanceElement ? parseFloat(distanceElement.value) || 0 : 0,
                        estimatedCost: distanceElement ? (parseFloat(distanceElement.value) || 0) * 50000 : 0 // PKR per km
                    }
                };
                
                console.log(`Route change ${index}:`, routeChange);
                
                if (routeChange.routeName.trim()) {
                    modifications.routeChanges.push(routeChange);
                }
            } catch (error) {
                console.error(`Error processing route change form ${index}:`, error);
            }
        });

        // Collect schedule adjustments
        const scheduleAdjustmentForms = document.querySelectorAll('.schedule-adjustment-form');
        console.log(`Found ${scheduleAdjustmentForms.length} schedule adjustment forms`);
        
        scheduleAdjustmentForms.forEach((form, index) => {
            try {
                const routeNameElement = form.querySelector('[name="routeName"]');
                const currentFrequencyElement = form.querySelector('[name="currentFrequency"]');
                const newFrequencyElement = form.querySelector('[name="newFrequency"]');
                const impactDescriptionElement = form.querySelector('[name="impactDescription"]');
                
                if (!routeNameElement) {
                    console.warn(`Schedule adjustment form ${index} missing route name element`);
                    return;
                }
                
                const adjustment = {
                    routeName: routeNameElement.value || '',
                    currentFrequency: currentFrequencyElement ? currentFrequencyElement.value : '',
                    newFrequency: newFrequencyElement ? newFrequencyElement.value : '',
                    impactDescription: impactDescriptionElement ? impactDescriptionElement.value : ''
                };
                
                console.log(`Schedule adjustment ${index}:`, adjustment);
                
                if (adjustment.routeName.trim()) {
                    modifications.scheduleAdjustments.push(adjustment);
                }
            } catch (error) {
                console.error(`Error processing schedule adjustment form ${index}:`, error);
            }
        });

        console.log('Final modifications:', modifications);
        return modifications;
    }

    displaySimulationResults(predictedImpacts) {
        console.log('Displaying simulation results:', predictedImpacts);
        
        if (!predictedImpacts) {
            this.showError('No simulation results received');
            return;
        }
        
        try {
            // Create a more detailed results display
            let resultsText = 'Simulation Results:\n\n';
            
            // Format improvements
            if (predictedImpacts.improvements) {
                const improvements = predictedImpacts.improvements;
                resultsText += `📊 PREDICTED CHANGES:\n`;
                resultsText += `• Distance Change: ${(improvements.distanceChange || 0).toFixed(1)}%\n`;
                resultsText += `• Mobility Change: ${(improvements.mobilityChange || 0).toFixed(1)}%\n`;
                resultsText += `• Cost Change: PKR ${(improvements.costChange || 0).toLocaleString()}\n`;
                resultsText += `• Efficiency Change: ${(improvements.efficiencyChange || 0).toFixed(1)}%\n`;
                resultsText += `• Ridership Change: ${(improvements.ridership || 0).toLocaleString()} passengers\n\n`;
            }
            
            // Format risks
            if (predictedImpacts.risks && predictedImpacts.risks.length > 0) {
                resultsText += `⚠️ IDENTIFIED RISKS (${predictedImpacts.risks.length})::\n`;
                predictedImpacts.risks.forEach((risk, index) => {
                    resultsText += `${index + 1}. [${risk.level.toUpperCase()}] ${risk.description}\n`;
                    if (risk.mitigation) {
                        resultsText += `   Mitigation: ${risk.mitigation}\n`;
                    }
                });
                resultsText += '\n';
            }
            
            // Format confidence
            if (predictedImpacts.confidence) {
                const confidence = predictedImpacts.confidence;
                resultsText += `🎯 CONFIDENCE LEVELS:\n`;
                resultsText += `• Overall: ${confidence.overall || 0}%\n`;
                resultsText += `• Ridership: ${confidence.ridership || 0}%\n`;
                resultsText += `• Cost: ${confidence.cost || 0}%\n`;
                resultsText += `• Efficiency: ${confidence.efficiency || 0}%`;
            }
            
            // Show results in alert (could be enhanced to use a modal)
            alert(resultsText);
            
        } catch (error) {
            console.error('Error displaying simulation results:', error);
            this.showError('Failed to display simulation results');
        }
    }

    async saveScenario() {
        const name = document.getElementById('scenarioName').value.trim();
        const description = document.getElementById('scenarioDescription').value.trim();
        
        if (!name) {
            this.showError('Please enter a scenario name');
            return;
        }

        const modifications = this.collectScenarioModifications();
        
        try {
            this.showLoading('Saving scenario...');
            
            const response = await fetch(`/service-planning/api/sessions/${this.currentSessionId}/scenarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    description,
                    modifications
                })
            });

            const data = await response.json();
            
            if (data.success) {
                bootstrap.Modal.getInstance(document.getElementById('scenarioModal')).hide();
                
                // Reload session to get updated scenarios
                await this.loadSession(this.currentSessionId);
                this.showSuccess('Scenario saved successfully');
            } else {
                this.showError('Failed to save scenario: ' + data.message);
            }
        } catch (error) {
            console.error('Error saving scenario:', error);
            this.showError('Failed to save scenario');
        } finally {
            this.hideLoading();
        }
    }

    enableDecisionTools() {
        document.getElementById('finalizeDecisionBtn').disabled = false;
        document.getElementById('exportPlanBtn').disabled = false;
        
        document.getElementById('decisionTools').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="decision-info">
                        <h6><i class="fas fa-check-circle me-2 text-success"></i>Ready for Decision</h6>
                        <p class="text-muted">You have created scenarios and can now finalize implementation decisions.</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="export-options">
                        <h6><i class="fas fa-download me-2 text-info"></i>Export Options</h6>
                        <div class="btn-group-vertical w-100">
                            <button class="btn btn-outline-secondary btn-sm" onclick="servicePlanningManager.exportData('summary_report')">
                                <i class="fas fa-file-alt"></i> Summary Report
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="servicePlanningManager.exportData('scenarios_comparison')">
                                <i class="fas fa-balance-scale"></i> Scenarios Comparison
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="servicePlanningManager.exportData('implementation_plan')">
                                <i class="fas fa-tasks"></i> Implementation Plan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async finalizeDecision() {
        if (!this.selectedScenarioId) {
            this.showError('Please select a scenario to finalize');
            return;
        }

        const rationale = prompt('Please provide rationale for this decision:');
        if (!rationale) return;

        try {
            this.showLoading('Finalizing decision...');
            
            const response = await fetch(`/service-planning/api/sessions/${this.currentSessionId}/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scenarioId: this.selectedScenarioId,
                    rationale: rationale,
                    implementationPlan: {
                        phases: [],
                        totalBudget: 0,
                        totalTimeframe: 'TBD',
                        priority: 'medium'
                    }
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Decision finalized successfully');
                // Reload session to show updated status
                await this.loadSession(this.currentSessionId);
            } else {
                this.showError('Failed to finalize decision: ' + data.message);
            }
        } catch (error) {
            console.error('Error finalizing decision:', error);
            this.showError('Failed to finalize decision');
        } finally {
            this.hideLoading();
        }
    }

    async exportData(exportType) {
        if (!this.currentSessionId) {
            this.showError('No active session to export');
            return;
        }

        try {
            const response = await fetch(`/service-planning/api/sessions/${this.currentSessionId}/export?exportType=${exportType}&format=csv`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                
                const contentDisposition = response.headers.get('Content-Disposition');
                const filename = contentDisposition 
                    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                    : `service_planning_${exportType}_${this.currentSessionId}.csv`;
                
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess(`${exportType.replace('_', ' ')} exported successfully`);
            } else {
                const data = await response.json();
                this.showError('Export failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showError('Export failed');
        }
    }

    async saveCurrentSession() {
        if (!this.currentSession) {
            this.showError('No active session to save');
            return;
        }

        this.showSuccess('Session auto-saved');
    }

    loadSessionDialog() {
        // This could be enhanced with a proper dialog
        const sessionId = prompt('Enter session ID to load:');
        if (sessionId) {
            this.loadSession(sessionId);
        }
    }

    editScenario(scenarioId) {
        // This could be enhanced to load scenario data into the modal
        this.showScenarioModal();
    }

    async deleteScenario(scenarioId) {
        if (!confirm('Are you sure you want to delete this scenario?')) return;
        
        // This would require an API endpoint to delete scenarios
        this.showError('Delete scenario functionality needs to be implemented');
    }

    exportPlan() {
        this.exportData('implementation_plan');
    }

    showHelp() {
        alert('Service Planning Help:\n\n1. Select a completed optimization session to load baseline data\n2. Create a new planning session\n3. Add scenarios to test different configurations\n4. Analyze impacts and risks\n5. Finalize decisions and export implementation plans');
    }

    // Utility methods
    showLoading(message = 'Loading...') {
        console.log('Loading:', message);
        
        // Show loading indicator if available
        const loadingElement = document.getElementById('loadingIndicator');
        if (loadingElement) {
            loadingElement.style.display = 'block';
            const loadingText = loadingElement.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
        
        // Disable simulation button
        const simulateBtn = document.getElementById('simulateScenarioBtn');
        if (simulateBtn) {
            simulateBtn.disabled = true;
            simulateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + message;
        }
    }

    hideLoading() {
        console.log('Loading hidden');
        
        // Hide loading indicator
        const loadingElement = document.getElementById('loadingIndicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Re-enable simulation button
        const simulateBtn = document.getElementById('simulateScenarioBtn');
        if (simulateBtn) {
            simulateBtn.disabled = false;
            simulateBtn.innerHTML = '<i class="fas fa-play"></i> Simulate';
        }
    }

    showError(message) {
        console.error('Error:', message);
        
        // Enhanced error display
        const timestamp = new Date().toLocaleTimeString();
        const fullMessage = `[${timestamp}] Error: ${message}`;
        
        alert(fullMessage);
        
        // Could also show in a dedicated error panel
        const errorPanel = document.getElementById('errorPanel');
        if (errorPanel) {
            errorPanel.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <strong>Error:</strong> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            errorPanel.style.display = 'block';
        }
    }

    showSuccess(message) {
        console.log('Success:', message);
        
        // Enhanced success display
        const timestamp = new Date().toLocaleTimeString();
        const fullMessage = `[${timestamp}] Success: ${message}`;
        
        // Could implement toast notifications here
        const successPanel = document.getElementById('successPanel');
        if (successPanel) {
            successPanel.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <strong>Success:</strong> ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            successPanel.style.display = 'block';
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (successPanel) {
                    successPanel.style.display = 'none';
                }
            }, 3000);
        } else {
            // Fallback to console and temporary alert
            console.log(fullMessage);
        }
    }
}

// Initialize the service planning manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the service planning page
    if (document.querySelector('.service-planning-container')) {
        window.servicePlanningManager = new ServicePlanningManager();
    }
});
