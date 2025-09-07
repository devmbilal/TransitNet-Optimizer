const { getDistanceBetweenAreas } = require('../../services/enrichMobilityAreas');

/**
 * Get distance between two mobility areas from enriched data
 * GET /api/distance?origin=A&destination=B&region=Islamabad
 */
exports.getCachedDistance = async (req, res) => {
  try {
    const { origin, destination, region } = req.query;
    
    // Validate required parameters
    if (!origin || !destination || !region) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters. Please provide origin, destination, and region.'
      });
    }

    // Get distance from enriched mobility area data
    const distance = await getDistanceBetweenAreas(region.trim(), origin.trim(), destination.trim());
    
    if (!distance) {
      return res.status(404).json({
        success: false,
        message: `Distance not found for ${origin} -> ${destination} in ${region}. Please ensure the mobility area file has been uploaded and enriched.`
      });
    }

    // Return the distance data
    res.json({
      success: true,
      origin: distance.origin,
      destination: distance.destination,
      region: distance.region,
      direct_distance_km: distance.direct_distance_km,
      road_distance_km: distance.road_distance_km
    });

  } catch (error) {
    console.error('Error retrieving distance from enriched data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving distance data.'
    });
  }
};
