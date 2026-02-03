// FloodWatch Guwahati - Type Definitions

export type FloodType = 'flood' | 'waterlogging' | 'drain_overflow';
export type AlertSeverity = 'critical' | 'high' | 'medium';
export type RoadState = 'normal' | 'flooded' | 'monitoring'; // 3-state model

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface FloodReport {
  id: string;
  type: FloodType;
  location: Coordinates;
  areaName: string;
  description?: string;
  photoUrl?: string;
  photoVerified?: boolean;
  photoConfidence?: number;
  timestamp: Date;
  userId: string;
  isActive: boolean;
}

export interface Alert {
  id: string;
  type: FloodType;
  severity: AlertSeverity;
  location: Coordinates;
  areaName: string;
  radius: number; // meters
  confidenceScore: number;
  reportCount: number;
  triggeredAt: Date;
  expiresAt: Date;
  notifiedUsers: number;
  isActive: boolean;
  suggestedActions: string[];
  photoUrl?: string; // Ground evidence photo

  // Road state tracking
  roadState: RoadState; // flooded | monitoring | normal
  resolvedCount: number; // Number of "cleared" votes
  confirmedCount: number; // Number of "still flooded" votes  
  monitoringSince?: Date; // When entered monitoring state
  lastConfirmedAt?: Date; // Last "still flooded" report
}

export interface User {
  id: string;
  sessionId: string;
  location?: Coordinates;
  subscriptionRadius: number; // meters, default 1000
  createdAt: Date;
  lastActive: Date;
}

export interface WeatherData {
  isRaining: boolean;
  rainfallMm: number;
  lastUpdated: Date;
  description: string;
  temperature: number;
  humidity: number;
}

export interface BlockedRoad {
  id: string;
  start: Coordinates;
  end: Coordinates;
  reason: string;
  reportId: string;
  severity: AlertSeverity;
}

export interface AlternativeRoute {
  id: string;
  from: Coordinates;
  to: Coordinates;
  avoidArea: string;
  suggestion: string;
  estimatedDelay: number; // minutes
}

export interface CommunityAction {
  id: string;
  type: 'avoid' | 'caution' | 'alternate' | 'tip';
  message: string;
  icon: string;
  priority: number;
}

// API Response Types
export interface ReportSubmission {
  type: FloodType;
  location: Coordinates;
  areaName?: string;
  description?: string;
  photo?: File;
}

export interface AlertNotification {
  alertId: string;
  areaName: string;
  type: FloodType;
  severity: AlertSeverity;
  message: string;
  suggestedActions: string[];
  timestamp: Date;
}

// Guwahati specific areas for demo
export const GUWAHATI_AREAS: Record<string, Coordinates> = {
  'GS Road': { lat: 26.1445, lng: 91.7362 },
  'Zoo Road': { lat: 26.1638, lng: 91.7674 },
  'Panbazar': { lat: 26.1856, lng: 91.7451 },
  'Fancy Bazar': { lat: 26.1872, lng: 91.7384 },
  'Paltan Bazar': { lat: 26.1803, lng: 91.7538 },
  'Chandmari': { lat: 26.1648, lng: 91.7741 },
  'Beltola': { lat: 26.1298, lng: 91.7869 },
  'Basistha': { lat: 26.1208, lng: 91.8024 },
  'Dispur': { lat: 26.1402, lng: 91.7880 },
  'Guwahati Railway Station': { lat: 26.1791, lng: 91.7552 },
  'Khanapara': { lat: 26.1323, lng: 91.8198 },
  'Maligaon': { lat: 26.1556, lng: 91.6906 },
  'Bharalumukh': { lat: 26.1723, lng: 91.7329 },
  'Uzanbazar': { lat: 26.1902, lng: 91.7467 },
  'Lachit Nagar': { lat: 26.1585, lng: 91.7552 },
};

// Guwahati center coordinates
export const GUWAHATI_CENTER: Coordinates = {
  lat: 26.1445,
  lng: 91.7362
};

// Default map bounds for Guwahati
export const GUWAHATI_BOUNDS = {
  north: 26.22,
  south: 26.08,
  east: 91.88,
  west: 91.68
};
// IoT Sensor Types (Extension)
export interface SensorReading {
  waterLevelCm: number;
  rainfallMmPerHour: number;
  batteryLevel: number; // Percentage
  timestamp: Date;
}

export type SensorStatus = 'normal' | 'warning' | 'critical' | 'offline';

export interface SensorNode {
  id: string;
  location: Coordinates;
  areaName: string;
  status: SensorStatus;
  lastReading?: SensorReading;
  isSimulated: boolean;
}

export interface MLPrediction {
  timestamp: Date;
  floodProbability: number; // 0.0 to 1.0
  isFlooding: boolean; // Threshold based (e.g., > 0.8)
  confidence: number; // 0.0 to 1.0 (Model confidence)
  contributingFactors: string[];
}
