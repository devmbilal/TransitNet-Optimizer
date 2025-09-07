const TransportFile = require('../models/transportFile/TransportFile');
const RoadDistanceCache = require('../models/RoadDistanceCache');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

// Import fetch for Node.js versions < 18, use global fetch for >= 18
const fetch = globalThis.fetch || require('node-fetch');

// Global variable to store the distance matrix
let distanceMatrix = null;

/**
 * Load distance matrix from CSV file
 * @param {string} region - Region name (e.g., 'Islamabad')
 * @returns {Promise<Object>} Distance matrix object
 */
async function loadDistanceMatrixFromCSV(region = 'islamabad') {
  try {
    if (distanceMatrix) {
      return distanceMatrix; // Return cached matrix if already loaded
    }

    const csvPath = path.join(__dirname, `../../data/distance-matrices/${region.toLowerCase()}/travel-distance.csv`);
    
    if (!fs.existsSync(csvPath)) {
      console.warn(`Travel distance CSV file not found at: ${csvPath}`);
      console.log(`💡 CSV file not found for ${region}. Google Maps API will be used as backup.`);
      return null;
    }

    const csvData = fs.readFileSync(csvPath, 'utf8');
    const rows = parse(csvData, { columns: true, skip_empty_lines: true });
    
    // Convert CSV rows to distance matrix object
    const matrix = {};
    
    rows.forEach(row => {
      const homeArea = row.HOME_AREA;
      if (homeArea) {
        matrix[homeArea] = {};
        
        // Add all other columns as destinations with their distances
        Object.keys(row).forEach(key => {
          if (key !== 'HOME_AREA' && row[key] !== undefined && row[key] !== '') {
            const distance = parseFloat(row[key]);
            if (!isNaN(distance)) {
              matrix[homeArea][key] = distance;
            }
          }
        });
      }
    });
    
    distanceMatrix = matrix;
    console.log(`📊 Loaded distance matrix with ${Object.keys(matrix).length} areas from CSV`);
    return matrix;
    
  } catch (error) {
    console.error('Error loading distance matrix from CSV:', error.message);
    return null;
  }
}

/**
 * Get road distance from CSV matrix
 * @param {string} origin - Origin area name
 * @param {string} destination - Destination area name
 * @param {string} region - Region name
 * @returns {Promise<number|null>} Distance in kilometers or null if not found
 */
async function getRoadDistanceFromMatrix(origin, destination, region = 'islamabad') {
  try {
    const matrix = await loadDistanceMatrixFromCSV(region);
    if (!matrix) {
      return null;
    }
    
    // Try direct lookup: origin -> destination
    if (matrix[origin] && matrix[origin][destination] !== undefined) {
      return matrix[origin][destination];
    }
    
    // Try reverse lookup: destination -> origin (since matrix might be symmetric)
    if (matrix[destination] && matrix[destination][origin] !== undefined) {
      return matrix[destination][origin];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting distance from matrix:', error.message);
    return null;
  }
}

/**
 * Calculate haversine distance between two coordinates
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Get road distance using Google Maps Distance Matrix API
 * @param {string} origin - Origin area name
 * @param {string} destination - Destination area name  
 * @param {number} lat1 - Origin latitude
 * @param {number} lon1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @returns {Promise<number|null>} Distance in kilometers or null if failed
 */
async function getGoogleMapsDistance(origin, destination, lat1, lon1, lat2, lon2) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  Google Maps API key not found in environment variables');
      return null;
    }

    const origins = `${lat1},${lon1}`;
    const destinations = `${lat2},${lon2}`;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&units=metric&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows && data.rows.length > 0) {
      const element = data.rows[0].elements[0];
      
      if (element.status === 'OK' && element.distance) {
        const distanceKm = element.distance.value / 1000; // Convert meters to kilometers
        console.log(`🗺️  Google Maps API: ${origin} -> ${destination} = ${distanceKm}km`);
        return distanceKm;
      } else {
        console.warn(`⚠️  Google Maps API: No route found for ${origin} -> ${destination}`);
        return null;
      }
    } else {
      console.warn(`⚠️  Google Maps API error:`, data.status, data.error_message || '');
      return null;
    }
  } catch (error) {
    console.error(`❌ Error calling Google Maps API for ${origin} -> ${destination}:`, error.message);
    return null;
  }
}

// Batch processing removed - CSV lookups are instant and don't need batching

/**
 * Get road distance using CSV matrix with caching
 * @param {string} origin - Origin area name
 * @param {string} destination - Destination area name
 * @param {string} region - Region name
 * @param {number} lat1 - Origin latitude
 * @param {number} lon1 - Origin longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lon2 - Destination longitude
 * @returns {Promise<number|null>} Road distance in kilometers or null if failed
 */
async function getRoadDistanceWithCache(origin, destination, region, lat1, lon1, lat2, lon2) {
  try {
    // Check cache first
    const cached = await RoadDistanceCache.getCachedDistance(origin, destination, region);
    if (cached) {
      console.log(`Using cached road distance: ${origin} -> ${destination} = ${cached.road_distance_km}km`);
      return cached.road_distance_km;
    }

    // If not in cache, try CSV matrix first, then Google Maps API as backup
    let roadDistance = await getRoadDistanceFromMatrix(origin, destination, region);
    let source = 'CSV';
    
    // If CSV not available, use Google Maps API as backup
    if (roadDistance === null) {
      console.log(`📍 CSV not available, using Google Maps API for: ${origin} -> ${destination}`);
      roadDistance = await getGoogleMapsDistance(origin, destination, lat1, lon1, lat2, lon2);
      source = 'GoogleMaps';
    }
    
    // Cache the result (even if null)
    await RoadDistanceCache.cacheDistance(origin, destination, region, roadDistance, source);
    
    if (roadDistance !== null) {
      console.log(`Got road distance from CSV: ${origin} -> ${destination} = ${roadDistance}km`);
    } else {
      console.warn(`No distance found in CSV for: ${origin} -> ${destination}`);
    }
    
    return roadDistance;
  } catch (error) {
    console.error(`Error getting road distance for ${origin} -> ${destination}:`, error.message);
    return null;
  }
}

// Google Maps API functions removed - now using CSV matrix for instant lookups

/**
 * Enrich mobility areas with distance information
 * @param {string} region - Region name
 * @returns {Promise<Object>} Results summary
 */
async function enrichMobilityAreas(region) {
  console.log(`Starting mobility area enrichment for region: ${region}`);
  
  try {
    // Find the mobility-area file for the region
    const mobilityFile = await TransportFile.findOne({ 
      type: 'mobility-area', 
      region: region 
    });
    
    if (!mobilityFile || !mobilityFile.data || mobilityFile.data.length === 0) {
      console.log(`No mobility area file found for region: ${region}`);
      return { success: false, message: 'No mobility area file found' };
    }
    
    const nodes = mobilityFile.data;
    console.log(`Found ${nodes.length} mobility nodes to enrich`);
    
    let processedPairs = 0;
    let totalPairs = (nodes.length * (nodes.length - 1)) / 2; // n(n-1)/2 unique pairs
    
    // Create enriched data with DISTANCES array for each node
    // Process sequentially to better respect API rate limits
    const enrichedData = [];
    
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      const node = nodes[nodeIndex];
      const nodeArea = node.AREA;
      const nodeLat = parseFloat(node.LATITUDE);
      const nodeLon = parseFloat(node.LONGITUDE);
      
      if (!nodeArea || isNaN(nodeLat) || isNaN(nodeLon)) {
        console.warn(`Invalid node data:`, node);
        return {
          ...node,
          DISTANCES: []
        };
      }
      
      console.log(`Processing distances for node: ${nodeArea} (${nodeIndex + 1}/${nodes.length})`);
      
      // Calculate distances to all other nodes
      const distances = [];
      
      for (let i = 0; i < nodes.length; i++) {
        if (i === nodeIndex) continue; // Skip self
        
        const otherNode = nodes[i];
        const otherArea = otherNode.AREA;
        const otherLat = parseFloat(otherNode.LATITUDE);
        const otherLon = parseFloat(otherNode.LONGITUDE);
        
        if (!otherArea || isNaN(otherLat) || isNaN(otherLon)) {
          console.warn(`Invalid other node data:`, otherNode);
          continue;
        }
        
        // Calculate direct distance
        const directDistance = calculateHaversineDistance(nodeLat, nodeLon, otherLat, otherLon);
        
        // Get road distance with caching
        const roadDistance = await getRoadDistanceWithCache(
          nodeArea, otherArea, region,
          nodeLat, nodeLon, otherLat, otherLon
        );
        
        distances.push({
          to: otherArea,
          direct_distance_km: directDistance,
          road_distance_km: roadDistance
        });
        
        processedPairs++;
        if (processedPairs % 10 === 0) {
          console.log(`Progress: ${processedPairs}/${nodes.length * (nodes.length - 1)} pairs processed`);
        }
        
        // No delay needed for CSV lookups - they're instant!
        // await new Promise(resolve => setTimeout(resolve, 100)); // Removed delay for CSV
      }
      
      enrichedData.push({
        ...node,
        DISTANCES: distances
      });
      
      // No delays needed for CSV processing - much faster!
      // Processing continues immediately to next node
    }
    
    // Update the MongoDB document with enriched data
    mobilityFile.data = enrichedData;
    await mobilityFile.save();
    
    console.log(`Successfully enriched mobility areas for ${region}`);
    console.log(`- Total nodes: ${nodes.length}`);
    console.log(`- Total distance pairs: ${processedPairs}`);
    
    return {
      success: true,
      region,
      nodesEnriched: nodes.length,
      distancePairsProcessed: processedPairs,
      message: 'Mobility areas enriched successfully'
    };
    
  } catch (error) {
    console.error(`Error enriching mobility areas for ${region}:`, error.message);
    return {
      success: false,
      region,
      message: `Enrichment failed: ${error.message}`
    };
  }
}

/**
 * Get distance between two specific areas from enriched data
 * @param {string} region - Region name
 * @param {string} origin - Origin area name
 * @param {string} destination - Destination area name
 * @returns {Promise<Object|null>} Distance information or null if not found
 */
async function getDistanceBetweenAreas(region, origin, destination) {
  try {
    const mobilityFile = await TransportFile.findOne({ 
      type: 'mobility-area', 
      region: region 
    });
    
    if (!mobilityFile || !mobilityFile.data) {
      return null;
    }
    
    // Find the origin node
    const originNode = mobilityFile.data.find(node => node.AREA === origin);
    if (!originNode || !originNode.DISTANCES) {
      return null;
    }
    
    // Find the distance to destination
    const distanceInfo = originNode.DISTANCES.find(dist => dist.to === destination);
    if (!distanceInfo) {
      return null;
    }
    
    return {
      origin,
      destination,
      region,
      direct_distance_km: distanceInfo.direct_distance_km,
      road_distance_km: distanceInfo.road_distance_km
    };
  } catch (error) {
    console.error(`Error getting distance between ${origin} and ${destination}:`, error.message);
    return null;
  }
}

module.exports = {
  enrichMobilityAreas,
  getDistanceBetweenAreas,
  calculateHaversineDistance
};
