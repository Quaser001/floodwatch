/**
 * ML Model Simulation Service (XGBoost Proxy)
 * 
 * Simulates an XGBoost model trained on sensor data to predict flood risk.
 * In a real system, this would call a Python microservice serving the model.
 */

import { SensorReading, MLPrediction } from './types';

// Feature weights (simulating trained model coefficients)
const MODEL_WEIGHTS = {
    WATER_LEVEL: 0.6,
    RAINFALL_INTENSITY: 0.3,
    RATE_OF_RISE: 0.1, // Not fully implemented in simulation
};

const THRESHOLDS = {
    WATER_LEVEL_CRITICAL: 50, // cm
    WATER_LEVEL_WARNING: 30, // cm
    RAINFALL_HEAVY: 20, // mm/hr
    FLOOD_PROBABILITY_THRESHOLD: 0.75,
};

/**
 * Predict flood risk based on sensor reading
 * PSEUDO CODE:
 * 1. Normalize features (water level, rainfall)
 * 2. Calculate weighted score (Dot product)
 * 3. Apply sigmoid activation to get probability
 * 4. Determine class (Flood/No Flood) based on threshold
 * 5. Return prediction with explanation
 */
export function predictFloodRisk(reading: SensorReading): MLPrediction {
    // 1. Feature Engineering
    const waterLevelScore = Math.min(reading.waterLevelCm / 80, 1.2); // Cap at 1.2
    const rainfallScore = Math.min(reading.rainfallMmPerHour / 50, 1.0); // Cap at 1.0

    // 2. Inference (Simplified XGBoost Tree Path Simulation)
    let probability = 0;

    // Simulate decision trees
    if (reading.waterLevelCm > THRESHOLDS.WATER_LEVEL_CRITICAL) {
        probability += 0.8; // Strong leaf node
    } else if (reading.waterLevelCm > THRESHOLDS.WATER_LEVEL_WARNING) {
        probability += 0.4;
        if (reading.rainfallMmPerHour > THRESHOLDS.RAINFALL_HEAVY) {
            probability += 0.3; // Boost if raining heavily
        }
    } else {
        probability += 0.1; // Baseline risk
    }

    // Add noise to simulate model uncertainty
    const uncertainty = (Math.random() - 0.5) * 0.1;
    probability = Math.min(Math.max(probability + uncertainty, 0), 0.99);

    // 3. Explanation Generation (SHAP-like values)
    const factors: string[] = [];
    if (reading.waterLevelCm > 30) factors.push(`High Water Level (${reading.waterLevelCm}cm)`);
    if (reading.rainfallMmPerHour > 15) factors.push(`Intense Rainfall (${reading.rainfallMmPerHour}mm/hr)`);

    // 4. Output Generation
    return {
        timestamp: new Date(),
        floodProbability: probability,
        isFlooding: probability > THRESHOLDS.FLOOD_PROBABILITY_THRESHOLD,
        confidence: 0.85 + (Math.random() * 0.1), // Model is generally confident
        contributingFactors: factors,
    };
}
