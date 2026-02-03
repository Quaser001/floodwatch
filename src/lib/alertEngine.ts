// Rule-Based Alert Engine for FloodWatch Guwahati
// Transparent, explainable logic - no ML for decisions

import {
    FloodReport,
    Alert,
    AlertSeverity,
    WeatherData,
    CommunityAction,
    Coordinates,
    SensorNode // [NEW] Import SensorNode
} from './types';
import {
    groupByProximity,
    calculateCentroid,
    findNearestArea,
    estimatePopulationDensity
} from './geoUtils';
import { v4 as uuidv4 } from 'uuid';

// Alert configuration thresholds
const CONFIG = {
    CLUSTER_RADIUS_METERS: 500,
    MIN_REPORTS_FOR_ALERT: 2,
    CONFIDENCE_THRESHOLD: 3,
    ALERT_DURATION_MINUTES: 60,
    ALERT_RADIUS_METERS: 800,
};

// Confidence scoring weights
const WEIGHTS = {
    TEXT_REPORT: 1,
    PHOTO_ATTACHED: 1,
    PHOTO_VERIFIED_FLOOD: 1,
    RAINFALL_FLAG: 1,
    MULTIPLE_REPORTS: 2,
    RECENT_REPORT_BONUS: 1,
    SENSOR_CONFIRMED: 3, // [NEW] High weight for sensor confirmation
};

interface ConfidenceBreakdown {
    totalScore: number;
    textReports: number;
    photosAttached: number;
    photosVerified: number;
    rainfallBonus: number;
    multipleReportsBonus: number;
    recencyBonus: number;
    sensorBonus: number; // [NEW]
    explanation: string;
}

/**
 * Calculate confidence score for a group of reports
 */
export function calculateConfidence(
    reports: FloodReport[],
    weather: WeatherData,
    sensors: SensorNode[] = [] // [NEW] Optional sensors input
): ConfidenceBreakdown {
    let score = 0;
    let textReports = 0;
    let photosAttached = 0;
    let photosVerified = 0;
    let rainfallBonus = 0;
    let multipleReportsBonus = 0;
    let recencyBonus = 0;
    let sensorBonus = 0; // [NEW]

    // ... existing report loop ...
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    for (const report of reports) {
        textReports += WEIGHTS.TEXT_REPORT;
        score += WEIGHTS.TEXT_REPORT;

        if (report.photoUrl) {
            photosAttached += WEIGHTS.PHOTO_ATTACHED;
            score += WEIGHTS.PHOTO_ATTACHED;

            if (report.photoVerified) {
                photosVerified += WEIGHTS.PHOTO_VERIFIED_FLOOD;
                score += WEIGHTS.PHOTO_VERIFIED_FLOOD;
            }
        }

        if (new Date(report.timestamp) > tenMinutesAgo) {
            recencyBonus += WEIGHTS.RECENT_REPORT_BONUS;
            score += WEIGHTS.RECENT_REPORT_BONUS;
        }
    }

    // Check for nearby sensors with critical status
    // Logic: If any report in the cluster is near a CRITICAL sensor
    const clusterCenter = calculateCentroid(reports.map(r => r.location));
    const nearbyCriticalSensor = sensors.find(s =>
        s.status === 'critical' &&
        // Simple distance check (approx 500m)
        Math.abs(s.location.lat - clusterCenter.lat) < 0.005 &&
        Math.abs(s.location.lng - clusterCenter.lng) < 0.005
    );

    if (nearbyCriticalSensor) {
        sensorBonus = WEIGHTS.SENSOR_CONFIRMED;
        score += WEIGHTS.SENSOR_CONFIRMED;
    }

    if (weather.isRaining) {
        rainfallBonus = WEIGHTS.RAINFALL_FLAG;
        score += WEIGHTS.RAINFALL_FLAG;
    }

    if (reports.length >= 2) {
        multipleReportsBonus = WEIGHTS.MULTIPLE_REPORTS;
        score += WEIGHTS.MULTIPLE_REPORTS;
    }

    const explanationParts: string[] = [];
    explanationParts.push(`${reports.length} report(s)`);
    if (sensorBonus > 0) explanationParts.push(`Confirmed by IoT Sensor (${nearbyCriticalSensor?.areaName})`);
    if (photosAttached > 0) explanationParts.push(`${photosAttached} photo(s)`);
    if (photosVerified > 0) explanationParts.push(`AI Verified`);
    if (weather.isRaining) explanationParts.push(`Rainfall active`);

    return {
        totalScore: score,
        textReports,
        photosAttached,
        photosVerified,
        rainfallBonus,
        multipleReportsBonus,
        recencyBonus,
        sensorBonus,
        explanation: explanationParts.join(' • '),
    };
}

// ... existing helper functions ...

/**
 * Determine alert severity based on confidence score and report count
 */
export function determineSeverity(
    confidence: number,
    reportCount: number
): AlertSeverity {
    if (confidence >= 6 || reportCount >= 4) {
        return 'critical';
    }
    if (confidence >= 4 || reportCount >= 3) {
        return 'high';
    }
    return 'medium';
}

/**
 * Generate community action suggestions based on alert
 */
export function generateCommunityActions(
    severity: AlertSeverity,
    areaName: string
): CommunityAction[] {
    const actions: CommunityAction[] = [];

    if (severity === 'critical') {
        actions.push({
            id: uuidv4(),
            type: 'avoid',
            message: `⚠️ Avoid ${areaName} - severe flooding reported`,
            icon: '🚫',
            priority: 1,
        });
        actions.push({
            id: uuidv4(),
            type: 'alternate',
            message: 'Use alternate routes via elevated roads',
            icon: '🛣️',
            priority: 2,
        });
    }

    if (severity === 'high' || severity === 'critical') {
        actions.push({
            id: uuidv4(),
            type: 'caution',
            message: 'Pedestrians: Exercise extreme caution near drains',
            icon: '👟',
            priority: 3,
        });
    }

    actions.push({
        id: uuidv4(),
        type: 'tip',
        message: 'Check water level before crossing low-lying areas',
        icon: '💡',
        priority: 4,
    });

    actions.push({
        id: uuidv4(),
        type: 'tip',
        message: 'Report updates to help your community',
        icon: '📱',
        priority: 5,
    });

    return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * Main alert processing function
 */
export function processReportsForAlerts(
    reports: FloodReport[],
    weather: WeatherData,
    existingAlerts: Alert[],
    sensors: SensorNode[] = [] // [NEW] Added sensors param
): Alert[] {

    // Filter only active reports from the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const activeReports = reports.filter(
        (r) => r.isActive && new Date(r.timestamp) > twoHoursAgo
    );

    if (activeReports.length === 0) {
        return [];
    }

    // Group reports by proximity
    const clusters = groupByProximity(activeReports, CONFIG.CLUSTER_RADIUS_METERS);
    const newAlerts: Alert[] = [];

    for (const cluster of clusters) {
        // Skip if not enough reports for an alert
        if (cluster.length < CONFIG.MIN_REPORTS_FOR_ALERT) {
            continue;
        }

        // Calculate confidence
        const confidence = calculateConfidence(cluster, weather, sensors);

        // Check if confidence meets threshold
        if (confidence.totalScore < CONFIG.CONFIDENCE_THRESHOLD) {
            continue;
        }

        // Calculate cluster centroid
        const centroid = calculateCentroid(cluster.map((r) => r.location));
        const areaName = findNearestArea(centroid);

        // Check if an alert already exists for this area
        const existingAlert = existingAlerts.find(
            (a) => a.areaName === areaName && a.isActive
        );

        if (existingAlert) {
            // Update existing alert instead of creating new
            existingAlert.confidenceScore = confidence.totalScore;
            existingAlert.reportCount = cluster.length;
            existingAlert.severity = determineSeverity(confidence.totalScore, cluster.length);
            continue;
        }

        // Determine severity
        const severity = determineSeverity(confidence.totalScore, cluster.length);

        // Get dominant flood type from cluster
        const typeCount: Record<string, number> = {};
        for (const report of cluster) {
            typeCount[report.type] = (typeCount[report.type] || 0) + 1;
        }
        const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0] as FloodReport['type'];

        // Generate community actions
        const suggestedActions = generateCommunityActions(severity, areaName);

        // Estimate notification count
        const notifiedUsers = estimatePopulationDensity(centroid);

        // Create new alert
        const alert: Alert = {
            id: uuidv4(),
            type: dominantType,
            severity,
            location: centroid,
            areaName,
            radius: CONFIG.ALERT_RADIUS_METERS,
            confidenceScore: confidence.totalScore,
            reportCount: cluster.length,
            triggeredAt: new Date(),
            expiresAt: new Date(Date.now() + CONFIG.ALERT_DURATION_MINUTES * 60 * 1000),
            notifiedUsers,
            isActive: true,
            suggestedActions: suggestedActions.map((a) => a.message),

            // Initial Road State
            roadState: severity === 'critical' || severity === 'high' ? 'flooded' : 'monitoring',
            resolvedCount: 0,
            confirmedCount: 0,
        };

        newAlerts.push(alert);
    }

    return newAlerts;
}

/**
 * Check if it's time to send a follow-up prompt for an alert
 */
export function shouldSendFollowUp(alert: Alert, lastPromptTime?: Date): boolean {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const alertAge = Date.now() - new Date(alert.triggeredAt).getTime();

    // Send follow-up if alert is at least 1 minute old
    if (alertAge < 60 * 1000) {
        return false;
    }

    // If we've never sent a prompt, send one
    if (!lastPromptTime) {
        return true;
    }

    // Don't send more than once per minute
    return new Date(lastPromptTime) < oneMinuteAgo;
}

/**
 * Generate follow-up prompt message
 */
export function generateFollowUpPrompt(alert: Alert): string {
    return `🔔 Update Request: Is flooding still ongoing near ${alert.areaName}? Your response helps keep the community informed.`;
}
