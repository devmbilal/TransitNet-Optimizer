const TransportFile = require('../models/transportFile/TransportFile');
const RoadDistanceCache = require('../models/RoadDistanceCache');
const OptimizationSession = require('../models/optimization/OptimizationSession');
const RouteRecommendation = require('../models/optimization/RouteRecommendation');

/**
 * Route Optimization Service
 * Implements the research paper's algorithm for transit route optimization
 */
class RouteOptimizationService {
  constructor(session) {
    this.session = session;
    this.mobilityNodes = [];
    this.mobilityMatrix = {};
    this.distanceMatrix = {};
    this.completeGraph = {};
    this.filteredGraph = {};
    this.optimizedRoutes = [];
  }

  /**
   * Phase 1: Data Preparation & Network Construction
   */
  async dataPreparation() {
    await this.session.updatePhase('dataPreparation', {
      status: 'running',
      startTime: new Date()
    });

    try {
      // Load mobility areas (nodes)
      const mobilityAreasFile = await TransportFile.findOne({
        region: this.session.region,
        type: 'mobility-area'
      });

      if (!mobilityAreasFile) {
        throw new Error(`No mobility areas found for region: ${this.session.region}`);
      }

      // Parse mobility nodes
      this.mobilityNodes = mobilityAreasFile.data.map(area => ({
        name: area.AREA,
        latitude: parseFloat(area.LATITUDE),
        longitude: parseFloat(area.LONGITUDE)
      })).filter(node => !isNaN(node.latitude) && !isNaN(node.longitude));

      console.log(`✅ Loaded ${this.mobilityNodes.length} mobility nodes`);

      // Load mobility matrix - use selected file if specified
      let mobilityMatrixFiles;
      if (this.session.algorithmParams.mobilityMatrixFileId) {
        const selectedFile = await TransportFile.findById(this.session.algorithmParams.mobilityMatrixFileId);
        if (selectedFile) {
          mobilityMatrixFiles = [selectedFile];
        } else {
          throw new Error('Selected mobility matrix file not found');
        }
      } else {
        mobilityMatrixFiles = await TransportFile.find({
          region: this.session.region,
          type: 'mobility-matrix'
        });
      }

      // Build mobility matrix from files
      console.log(`🔍 DEBUG: Processing ${mobilityMatrixFiles.length} mobility matrix files`);
      
      for (const file of mobilityMatrixFiles) {
        console.log(`🔍 DEBUG: Processing file ${file.fileName} with ${file.data.length} rows`);
        let processedRows = 0;
        let validRows = 0;
        
        // Check if this is a matrix format (origin-destination pairs) or matrix format (pivot table)
        const firstRow = file.data[0];
        const columnHeaders = Object.keys(firstRow);
        
        // If it has both Origin/HOME_AREA AND Destination/WORK_AREA columns, it's origin-destination format
        // If it has only HOME_AREA (or similar) and multiple other columns, it's matrix format
        const hasOrigin = columnHeaders.includes('Origin') || columnHeaders.includes('HOME_AREA');
        const hasDestination = columnHeaders.includes('Destination') || columnHeaders.includes('WORK_AREA');
        const hasOriginDestination = hasOrigin && hasDestination;
        
        console.log(`🔍 DEBUG: Column headers:`, columnHeaders);
        console.log(`🔍 DEBUG: Has origin: ${hasOrigin}, Has destination: ${hasDestination}, O-D format: ${hasOriginDestination}`);
        
        if (hasOriginDestination) {
          // Standard origin-destination format
          console.log(`🔍 DEBUG: Using origin-destination format`);
          for (const row of file.data) {
            processedRows++;
            const origin = row.Origin || row.HOME_AREA;
            const destination = row.Destination || row.WORK_AREA;
            const mobility = parseFloat(row.Mobility_Percentage || row.mobility || row.percentage || 0);

            if (origin && destination && !isNaN(mobility) && mobility > 0) {
              validRows++;
              if (!this.mobilityMatrix[origin]) {
                this.mobilityMatrix[origin] = {};
              }
              this.mobilityMatrix[origin][destination] = mobility;
            }
          }
        } else {
          // Matrix/pivot format - first column is origin, subsequent columns are destinations
          console.log(`🔍 DEBUG: Using matrix format`);
          const columnHeaders = Object.keys(firstRow);
          const originColumn = columnHeaders[0]; // First column is origin
          const destinationColumns = columnHeaders.slice(1); // Rest are destinations
          
          console.log(`🔍 DEBUG: Origin column: ${originColumn}, Destination columns: ${destinationColumns.length}`);
          
          for (const row of file.data) {
            processedRows++;
            const origin = row[originColumn];
            
            if (origin) {
              for (const destColumn of destinationColumns) {
                const mobility = parseFloat(row[destColumn] || 0);
                
                if (!isNaN(mobility) && mobility > 0) {
                  validRows++;
                  if (!this.mobilityMatrix[origin]) {
                    this.mobilityMatrix[origin] = {};
                  }
                  this.mobilityMatrix[origin][destColumn] = mobility;
                }
              }
            }
          }
        }
        
        console.log(`🔍 DEBUG: File ${file.fileName}: ${processedRows} rows processed, ${validRows} valid entries`);
      }

      console.log(`✅ Built mobility matrix with ${Object.keys(this.mobilityMatrix).length} origins`);
      
      // Debug: Show sample of mobility matrix
      if (Object.keys(this.mobilityMatrix).length > 0) {
        const firstOrigin = Object.keys(this.mobilityMatrix)[0];
        const destinations = Object.keys(this.mobilityMatrix[firstOrigin]);
        console.log(`🔍 DEBUG: Sample mobility data - Origin: ${firstOrigin}, Destinations: ${destinations.length}`);
        if (destinations.length > 0) {
          console.log(`🔍 DEBUG: Sample mobility value: ${firstOrigin} → ${destinations[0]} = ${this.mobilityMatrix[firstOrigin][destinations[0]]}`);
        }
      } else {
        console.log(`🔍 DEBUG: Mobility matrix is empty!`);
      }

      // Load cached distances
      const cachedDistances = await RoadDistanceCache.find({
        region: this.session.region,
        road_distance_km: { $ne: null }
      });

      // Build distance matrix from cache
      for (const cache of cachedDistances) {
        if (!this.distanceMatrix[cache.origin]) {
          this.distanceMatrix[cache.origin] = {};
        }
        this.distanceMatrix[cache.origin][cache.destination] = cache.road_distance_km;
      }

      console.log(`✅ Loaded ${cachedDistances.length} cached distances`);

      // Complete missing distances with Haversine calculation
      await this.calculateMissingDistances();

      await this.session.updatePhase('dataPreparation', {
        status: 'completed',
        endTime: new Date(),
        mobilityNodesCount: this.mobilityNodes.length,
        mobilityMatrixSize: Object.keys(this.mobilityMatrix).length,
        cachedDistancesCount: cachedDistances.length
      });

      await this.session.updateProgress(20);

    } catch (error) {
      await this.session.updatePhase('dataPreparation', {
        status: 'failed',
        endTime: new Date()
      });
      throw error;
    }
  }

  /**
   * Phase 2: Network Construction - Create Complete Graph
   */
  async networkConstruction() {
    await this.session.updatePhase('networkConstruction', {
      status: 'running',
      startTime: new Date()
    });

    try {
      // Get areas that are actually served by existing transport routes
      const existingRoutes = await TransportFile.find({
        region: this.session.region,
        type: 'transport'
      });
      
      const servedAreas = new Set();
      for (const route of existingRoutes) {
        for (const stop of route.data) {
          if (stop.latitude && stop.longitude) {
            const nearestArea = this.findNearestMobilityArea(
              parseFloat(stop.latitude), 
              parseFloat(stop.longitude)
            );
            if (nearestArea) {
              servedAreas.add(nearestArea);
            }
          }
        }
      }
      
      // Only use mobility nodes that are served by existing transport
      let nodes = Array.from(servedAreas);
      
      // Fallback: if we have too few served areas, use high-mobility areas
      if (nodes.length < 5) {
        console.log(`🎯 DEBUG: Too few served areas (${nodes.length}), using high-mobility areas instead`);
        
        // Find areas with highest mobility values
        const mobilityTotals = {};
        for (const origin in this.mobilityMatrix) {
          mobilityTotals[origin] = Object.values(this.mobilityMatrix[origin]).reduce((sum, val) => sum + val, 0);
        }
        
        // Get top mobility areas
        nodes = Object.entries(mobilityTotals)
          .sort(([,a], [,b]) => b - a)
          .slice(0, Math.min(15, Object.keys(mobilityTotals).length))
          .map(([area]) => area);
          
        console.log(`🎯 DEBUG: Selected top ${nodes.length} mobility areas`);
      }
      
      console.log(`🎯 DEBUG: Scoping optimization to ${nodes.length} areas out of ${this.mobilityNodes.length} total areas`);
      console.log(`🎯 DEBUG: Target areas:`, nodes.slice(0, 10), nodes.length > 10 ? '...' : '');
      
      let totalEdges = 0;

      // Create bidirectional complete graph
      for (const origin of nodes) {
        this.completeGraph[origin] = {};
        
        for (const destination of nodes) {
          if (origin !== destination) {
            const distance = this.getDistance(origin, destination);
            const mobility = this.getMobility(origin, destination);

            if (distance && mobility !== null) {
              this.completeGraph[origin][destination] = {
                distance: distance,
                mobility: mobility,
                weight: null // Will be calculated in mobility optimization phase
              };
              totalEdges++;
            }
          }
        }
      }

      const connectedNodes = Object.keys(this.completeGraph).length;
      const maxPossibleEdges = connectedNodes * (connectedNodes - 1);
      const graphDensity = maxPossibleEdges > 0 ? (totalEdges / maxPossibleEdges) * 100 : 0;

      console.log(`✅ Created complete graph with ${totalEdges} edges, ${connectedNodes} nodes, density: ${graphDensity.toFixed(2)}%`);

      await this.session.updatePhase('networkConstruction', {
        status: 'completed',
        endTime: new Date(),
        totalEdges: totalEdges,
        connectedNodes: connectedNodes,
        graphDensity: parseFloat(graphDensity.toFixed(2))
      });

      await this.session.updateProgress(40);

    } catch (error) {
      await this.session.updatePhase('networkConstruction', {
        status: 'failed',
        endTime: new Date()
      });
      throw error;
    }
  }

  /**
   * Phase 3: Distance Filtering - Algorithm 1 from paper
   */
  async distanceFiltering() {
    await this.session.updatePhase('distanceFiltering', {
      status: 'running',
      startTime: new Date()
    });

    try {
      const nodes = Object.keys(this.completeGraph);
      
      // Calculate threshold: t = max(min_distances_from_each_node)
      let threshold;
      if (this.session.algorithmParams.distanceThreshold) {
        threshold = this.session.algorithmParams.distanceThreshold;
      } else {
        const minDistancesPerNode = [];
        
        for (const origin of nodes) {
          const distances = [];
          for (const destination of nodes) {
            if (origin !== destination && this.completeGraph[origin][destination]) {
              distances.push(this.completeGraph[origin][destination].distance);
            }
          }
          if (distances.length > 0) {
            minDistancesPerNode.push(Math.min(...distances));
          }
        }
        
        threshold = minDistancesPerNode.length > 0 ? Math.max(...minDistancesPerNode) : 50; // 50km default
      }

      console.log(`📏 Calculated distance threshold: ${threshold}km`);

      // Filter edges based on threshold
      this.filteredGraph = {};
      let edgesBefore = 0;
      let edgesAfter = 0;

      for (const origin of nodes) {
        edgesBefore += Object.keys(this.completeGraph[origin] || {}).length;
        this.filteredGraph[origin] = {};

        for (const destination in this.completeGraph[origin]) {
          const edge = this.completeGraph[origin][destination];
          if (edge.distance < threshold) {
            this.filteredGraph[origin][destination] = { ...edge };
            edgesAfter++;
          }
        }
      }

      const reductionPercentage = edgesBefore > 0 ? ((edgesBefore - edgesAfter) / edgesBefore) * 100 : 0;

      console.log(`✂️  Filtered edges: ${edgesBefore} → ${edgesAfter} (${reductionPercentage.toFixed(1)}% reduction)`);

      await this.session.updatePhase('distanceFiltering', {
        status: 'completed',
        endTime: new Date(),
        calculatedThreshold: threshold,
        edgesBefore: edgesBefore,
        edgesAfter: edgesAfter,
        reductionPercentage: parseFloat(reductionPercentage.toFixed(2))
      });

      await this.session.updateProgress(60);

    } catch (error) {
      await this.session.updatePhase('distanceFiltering', {
        status: 'failed',
        endTime: new Date()
      });
      throw error;
    }
  }

  /**
   * Phase 4: Mobility Optimization - Algorithm 2 from paper
   */
  async mobilityOptimization() {
    await this.session.updatePhase('mobilityOptimization', {
      status: 'running',
      startTime: new Date()
    });

    try {
      const nodes = Object.keys(this.filteredGraph);
      const c = this.session.algorithmParams.mobilityConstant || 0.1;

      // Find maximum mobility value
      let maxMobility = 0;
      for (const origin of nodes) {
        for (const destination in this.filteredGraph[origin]) {
          const mobility = this.filteredGraph[origin][destination].mobility;
          if (mobility > maxMobility) {
            maxMobility = mobility;
          }
        }
      }

      console.log(`📊 Maximum mobility value: ${maxMobility}`);

      // Transform weights: w_ij = max_mobility - mobility + c
      for (const origin of nodes) {
        for (const destination in this.filteredGraph[origin]) {
          const edge = this.filteredGraph[origin][destination];
          edge.weight = maxMobility - edge.mobility + c;
        }
      }

      // Apply Dijkstra's algorithm to find optimal paths
      const optimalPaths = {};
      let pathsCalculated = 0;
      let totalPathLength = 0;

      for (const startNode of nodes) {
        const { distances, previous } = this.dijkstra(this.filteredGraph, startNode);
        
        for (const endNode of nodes) {
          if (startNode !== endNode && distances[endNode] !== Infinity) {
            const path = this.reconstructPath(previous, endNode);
            const pathDistance = distances[endNode];
            
            optimalPaths[`${startNode}-${endNode}`] = {
              path: path,
              totalWeight: pathDistance,
              distance: this.calculatePathDistance(path),
              mobility: this.calculatePathMobility(path)
            };
            
            pathsCalculated++;
            totalPathLength += path.length;
          }
        }
      }

      this.optimizedRoutes = Object.entries(optimalPaths).map(([key, pathData]) => {
        const [fromArea, toArea] = key.split('-');
        return {
          fromArea,
          toArea,
          distance: pathData.distance,
          mobility: pathData.mobility,
          weight: pathData.totalWeight,
          path: pathData.path
        };
      });

      const averagePathLength = pathsCalculated > 0 ? totalPathLength / pathsCalculated : 0;

      console.log(`🛤️  Calculated ${pathsCalculated} optimal paths, average length: ${averagePathLength.toFixed(1)} nodes`);

      await this.session.updatePhase('mobilityOptimization', {
        status: 'completed',
        endTime: new Date(),
        maxMobility: maxMobility,
        pathsCalculated: pathsCalculated,
        averagePathLength: parseFloat(averagePathLength.toFixed(2))
      });

      await this.session.updateProgress(80);

    } catch (error) {
      await this.session.updatePhase('mobilityOptimization', {
        status: 'failed',
        endTime: new Date()
      });
      throw error;
    }
  }

  /**
   * Phase 5: Results Generation & Analysis
   */
  async resultsGeneration() {
    await this.session.updatePhase('resultsGeneration', {
      status: 'running',
      startTime: new Date()
    });

    try {
      // Analyze existing network
      const existingRoutes = await TransportFile.find({
        region: this.session.region,
        type: 'transport'
      });

      const originalNetworkMetrics = await this.analyzeNetwork(existingRoutes, 'original');
      const optimizedNetworkMetrics = await this.analyzeOptimizedNetwork();

      // Calculate improvements
      const improvements = {
        distanceReduction: originalNetworkMetrics.totalDistance > 0 ? 
          ((originalNetworkMetrics.totalDistance - optimizedNetworkMetrics.totalDistance) / originalNetworkMetrics.totalDistance) * 100 : 0,
        mobilityIncrease: originalNetworkMetrics.totalMobility > 0 ? 
          ((optimizedNetworkMetrics.totalMobility - originalNetworkMetrics.totalMobility) / originalNetworkMetrics.totalMobility) * 100 : 0,
        efficiencyGain: originalNetworkMetrics.networkEfficiency > 0 ? 
          ((optimizedNetworkMetrics.networkEfficiency - originalNetworkMetrics.networkEfficiency) / originalNetworkMetrics.networkEfficiency) * 100 : 0,
        connectivityImprovement: originalNetworkMetrics.connectivityIndex > 0 ? 
          ((optimizedNetworkMetrics.connectivityIndex - originalNetworkMetrics.connectivityIndex) / originalNetworkMetrics.connectivityIndex) * 100 : 0
      };

      // Generate route recommendations
      const recommendations = await this.generateRecommendations();

      console.log(`📈 Results: ${improvements.distanceReduction.toFixed(1)}% distance reduction, ${improvements.mobilityIncrease.toFixed(1)}% mobility increase`);
      console.log(`🎯 Generated ${recommendations.length} route recommendations`);

      // Update session with results
      this.session.results = {
        originalNetwork: originalNetworkMetrics,
        optimizedNetwork: optimizedNetworkMetrics,
        improvements: improvements,
        optimizedRoutes: this.optimizedRoutes
      };

      await this.session.updatePhase('resultsGeneration', {
        status: 'completed',
        endTime: new Date(),
        recommendationsCount: recommendations.length,
        totalDistanceImprovement: parseFloat(improvements.distanceReduction.toFixed(2)),
        mobilityImprovementPercentage: parseFloat(improvements.mobilityIncrease.toFixed(2))
      });

      await this.session.updateProgress(100, 'completed');
      const endTime = new Date();
      this.session.completedAt = endTime;
      this.session.endedAt = endTime;
      if (this.session.startedAt) {
        this.session.durationMs = endTime.getTime() - this.session.startedAt.getTime();
      }
      await this.session.save();

      return {
        success: true,
        results: this.session.results,
        recommendations: recommendations
      };

    } catch (error) {
      await this.session.updatePhase('resultsGeneration', {
        status: 'failed',
        endTime: new Date()
      });
      throw error;
    }
  }

  /**
   * Main optimization execution method
   */
  static async optimize(sessionId) {
    try {
      const session = await OptimizationSession.findOne({ sessionId });
      if (!session) {
        throw new Error('Optimization session not found');
      }

      await session.updateProgress(0, 'running');

      const optimizer = new RouteOptimizationService(session);

      // Execute optimization phases
      await optimizer.dataPreparation();
      await optimizer.networkConstruction();
      await optimizer.distanceFiltering();
      await optimizer.mobilityOptimization();
      const results = await optimizer.resultsGeneration();

      return results;

    } catch (error) {
      console.error('Optimization failed:', error);
      
      const session = await OptimizationSession.findOne({ sessionId });
      if (session) {
        session.status = 'failed';
        session.errorMessage = error.message;
        await session.save();
      }

      throw error;
    }
  }

  // Helper Methods
  
  async calculateMissingDistances() {
    for (let i = 0; i < this.mobilityNodes.length; i++) {
      const origin = this.mobilityNodes[i];
      if (!this.distanceMatrix[origin.name]) {
        this.distanceMatrix[origin.name] = {};
      }

      for (let j = 0; j < this.mobilityNodes.length; j++) {
        const destination = this.mobilityNodes[j];
        
        if (origin.name !== destination.name && !this.distanceMatrix[origin.name][destination.name]) {
          const distance = this.calculateHaversineDistance(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
          );
          this.distanceMatrix[origin.name][destination.name] = distance;
        }
      }
    }
  }

  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
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

  getDistance(origin, destination) {
    return this.distanceMatrix[origin] && this.distanceMatrix[origin][destination] 
      ? this.distanceMatrix[origin][destination] 
      : null;
  }

  getMobility(origin, destination) {
    return this.mobilityMatrix[origin] && this.mobilityMatrix[origin][destination] !== undefined
      ? this.mobilityMatrix[origin][destination]
      : 0;
  }
  
  findNearestMobilityArea(lat, lon) {
    let nearestArea = null;
    let minDistance = Infinity;
    
    for (const node of this.mobilityNodes) {
      const distance = this.calculateHaversineDistance(lat, lon, node.latitude, node.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestArea = node.name;
      }
    }
    
    // Only return if within reasonable distance (e.g., 2km)
    return minDistance <= 2 ? nearestArea : null;
  }

  // Dijkstra's Algorithm Implementation
  dijkstra(graph, startNode) {
    const distances = {};
    const previous = {};
    const unvisited = new Set();

    // Initialize distances
    for (const node in graph) {
      distances[node] = Infinity;
      previous[node] = null;
      unvisited.add(node);
    }
    distances[startNode] = 0;

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode = null;
      let minDistance = Infinity;
      
      for (const node of unvisited) {
        if (distances[node] < minDistance) {
          minDistance = distances[node];
          currentNode = node;
        }
      }

      if (!currentNode || minDistance === Infinity) break;

      unvisited.delete(currentNode);

      // Update distances to neighbors
      const neighbors = graph[currentNode] || {};
      for (const neighbor in neighbors) {
        if (unvisited.has(neighbor)) {
          const alt = distances[currentNode] + neighbors[neighbor].weight;
          if (alt < distances[neighbor]) {
            distances[neighbor] = alt;
            previous[neighbor] = currentNode;
          }
        }
      }
    }

    return { distances, previous };
  }

  reconstructPath(previous, endNode) {
    const path = [];
    let current = endNode;
    
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
    
    return path;
  }

  calculatePathDistance(path) {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const distance = this.getDistance(path[i], path[i + 1]);
      if (distance) {
        totalDistance += distance;
      }
    }
    return totalDistance;
  }

  calculatePathMobility(path) {
    let totalMobility = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const mobility = this.getMobility(path[i], path[i + 1]);
      totalMobility += mobility;
    }
    return totalMobility;
  }

  async analyzeNetwork(routes, type) {
    let totalDistance = 0;
    let totalMobility = 0;
    let routeCount = 0;
    
    console.log(`📊 DEBUG: Analyzing ${type} network with ${routes.length} routes`);

    for (const route of routes) {
      if (route.data && route.data.length > 1) {
        routeCount++;
        let routeDistance = 0;
        let routeMobility = 0;
        
        for (let i = 0; i < route.data.length - 1; i++) {
          const stop1 = route.data[i];
          const stop2 = route.data[i + 1];
          
          if (stop1.latitude && stop1.longitude && stop2.latitude && stop2.longitude) {
            const distance = this.calculateHaversineDistance(
              parseFloat(stop1.latitude), parseFloat(stop1.longitude),
              parseFloat(stop2.latitude), parseFloat(stop2.longitude)
            );
            routeDistance += distance;
            
            // Try to find corresponding mobility areas and get mobility
            const area1 = this.findNearestMobilityArea(parseFloat(stop1.latitude), parseFloat(stop1.longitude));
            const area2 = this.findNearestMobilityArea(parseFloat(stop2.latitude), parseFloat(stop2.longitude));
            
            if (area1 && area2) {
              const mobility = this.getMobility(area1, area2);
              routeMobility += mobility;
            }
          }
        }
        
        totalDistance += routeDistance;
        totalMobility += routeMobility;
        
        if (routeCount <= 3) {
          console.log(`📊 DEBUG: Route ${routeCount}: ${routeDistance.toFixed(2)}km, ${routeMobility.toFixed(2)} mobility`);
        }
      }
    }

    const networkEfficiency = totalDistance > 0 ? totalMobility / totalDistance : 0;

    console.log(`📊 DEBUG: ${type} network - Distance: ${totalDistance.toFixed(2)}km, Mobility: ${totalMobility.toFixed(2)}, Efficiency: ${networkEfficiency.toFixed(4)}`);

    return {
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      totalMobility: parseFloat(totalMobility.toFixed(2)),
      networkEfficiency: parseFloat(networkEfficiency.toFixed(4)),
      connectivityIndex: routeCount
    };
  }

  async analyzeOptimizedNetwork() {
    let totalDistance = 0;
    let totalMobility = 0;
    
    // Only consider routes with meaningful mobility (> 1) to match realistic transport routes
    const meaningfulRoutes = this.optimizedRoutes.filter(route => route.mobility > 1);
    
    console.log(`📊 DEBUG: Analyzing optimized network - ${meaningfulRoutes.length} meaningful routes out of ${this.optimizedRoutes.length} total`);
    
    let routeCount = 0;
    for (const route of meaningfulRoutes) {
      totalDistance += route.distance;
      totalMobility += route.mobility;
      routeCount++;
      
      if (routeCount <= 3) {
        console.log(`📊 DEBUG: Optimized route ${routeCount}: ${route.fromArea} → ${route.toArea}, ${route.distance.toFixed(2)}km, ${route.mobility.toFixed(2)} mobility`);
      }
    }

    const networkEfficiency = totalDistance > 0 ? totalMobility / totalDistance : 0;
    
    console.log(`📊 DEBUG: Optimized network - Distance: ${totalDistance.toFixed(2)}km, Mobility: ${totalMobility.toFixed(2)}, Efficiency: ${networkEfficiency.toFixed(4)}`);

    return {
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      totalMobility: parseFloat(totalMobility.toFixed(2)),
      networkEfficiency: parseFloat(networkEfficiency.toFixed(4)),
      connectivityIndex: meaningfulRoutes.length
    };
  }

  async generateRecommendations() {
    // Generate route recommendations based on optimization results
    const recommendations = [];
    let priority = 1;

    // Get recommendation filters from session parameters
    const filters = this.session.algorithmParams.recommendationFilters || {
      minMobility: 0.5,
      maxDistance: 40,
      minEfficiency: 0.01,
      maxRecommendations: 20
    };
    
    console.log(`🎯 DEBUG: Using recommendation filters:`, filters);
    
    // Sort routes by impact (high mobility, reasonable distance)
    const sortedRoutes = this.optimizedRoutes
      .filter(route => {
        const efficiency = route.distance > 0 ? route.mobility / route.distance : 0;
        const passesFilter = route.mobility >= filters.minMobility && 
                           route.distance > 1 && 
                           route.distance <= filters.maxDistance &&
                           efficiency >= filters.minEfficiency;
        
        if (!passesFilter && route.mobility > 1) {
          console.log(`🚿 DEBUG: Route ${route.fromArea} → ${route.toArea} filtered out: mob=${route.mobility.toFixed(3)}, dist=${route.distance.toFixed(1)}, eff=${efficiency.toFixed(3)}`);
        }
        
        return passesFilter;
      })
      .sort((a, b) => (b.mobility / b.distance) - (a.mobility / a.distance))
      .slice(0, filters.maxRecommendations);
      
    console.log(`🎯 DEBUG: Filtered to ${sortedRoutes.length} realistic route recommendations out of ${this.optimizedRoutes.length} total routes`);

    for (const route of sortedRoutes) {
      const impactScore = this.calculateImpactScore(route);
      
      const recommendation = new RouteRecommendation({
        sessionId: this.session.sessionId,
        priority: priority++,
        actionType: 'add',
        recommendationType: this.getRecommendationType(route),
        fromArea: route.fromArea,
        toArea: route.toArea,
        currentRoute: {
          exists: false,
          distance: null,
          mobility: null,
          routeNames: []
        },
        recommendedRoute: {
          distance: route.distance,
          mobility: route.mobility,
          weight: route.weight,
          path: route.path.map(area => ({
            area: area,
            coordinates: this.getAreaCoordinates(area),
            estimatedStops: [`${area} Terminal`, `${area} Center`]
          })),
          estimatedTravelTime: Math.round(route.distance * 2), // Rough estimate: 2 min per km
          frequency: this.getFrequencyRecommendation(route.mobility)
        },
        expectedImprovement: {
          distanceSaved: 0, // New route, so no savings
          mobilityIncrease: route.mobility,
          efficiencyGain: route.mobility / route.distance,
          peopleServed: Math.round(route.mobility * 100), // Rough estimate
          impactScore: impactScore
        },
        implementationDetails: {
          estimatedCost: this.estimateCost(route),
          difficulty: this.assessDifficulty(route),
          timeframe: this.getTimeframe(route),
          prerequisites: [],
          constraints: []
        }
      });

      await recommendation.save();
      recommendations.push(recommendation);
    }

    return recommendations;
  }

  calculateImpactScore(route) {
    // Score based on mobility-to-distance ratio, normalized to 0-100
    const efficiency = route.mobility / route.distance;
    return Math.min(100, Math.round(efficiency * 10));
  }

  getRecommendationType(route) {
    const efficiency = route.mobility / route.distance;
    if (efficiency > 2) return 'high_impact';
    if (efficiency > 1) return 'cost_effective';
    if (route.distance < 10) return 'quick_win';
    return 'long_term';
  }

  getAreaCoordinates(areaName) {
    const node = this.mobilityNodes.find(n => n.name === areaName);
    return node ? { latitude: node.latitude, longitude: node.longitude } : { latitude: 0, longitude: 0 };
  }

  getFrequencyRecommendation(mobility) {
    if (mobility > 10) return 'every 10 mins';
    if (mobility > 5) return 'every 15 mins';
    if (mobility > 2) return 'every 30 mins';
    return 'every 60 mins';
  }

  estimateCost(route) {
    // Rough cost estimation: $50,000 per km
    return Math.round(route.distance * 50000);
  }

  assessDifficulty(route) {
    if (route.distance < 5) return 'low';
    if (route.distance < 20) return 'medium';
    return 'high';
  }

  getTimeframe(route) {
    if (route.distance < 5) return 'short_term';
    if (route.distance < 15) return 'medium_term';
    return 'long_term';
  }
}

module.exports = RouteOptimizationService;
