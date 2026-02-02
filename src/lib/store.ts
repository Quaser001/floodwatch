// Zustand Store for FloodWatch Guwahati

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
    FloodReport,
    Alert,
    User,
    WeatherData,
    BlockedRoad,
    Coordinates,
    FloodType,
    GUWAHATI_CENTER,
    SensorNode,
    SensorReading,
    MLPrediction
} from './types';
import { processReportsForAlerts } from './alertEngine';
import { findNearestArea, generateRandomOffset } from './geoUtils';
import { predictFloodRisk } from './mlModel';

interface FloodStore {
    // State
    reports: FloodReport[];
    alerts: Alert[];
    users: User[];
    currentUser: User | null;
    weather: WeatherData;
    blockedRoads: BlockedRoad[];
    selectedLocation: Coordinates | null;
    isSubmitting: boolean;
    notifications: string[];
    followUpPrompts: Map<string, Date>;
    sensors: SensorNode[];
    alertHistory: Alert[]; // [NEW] Past alerts
    cityWideAlerts: Alert[]; // [NEW] Mock alerts for other regions

    // Actions
    initializeUser: () => void;
    updateUserLocation: (location: Coordinates) => void;
    submitReport: (report: Omit<FloodReport, 'id' | 'timestamp' | 'userId' | 'isActive'>) => Promise<void>;
    processAlerts: () => void;
    setSelectedLocation: (location: Coordinates | null) => void;
    addNotification: (message: string) => void;
    clearNotification: (index: number) => void;
    updateWeather: (weather: Partial<WeatherData>) => void;
    sendFollowUp: (alertId: string) => void;
    respondToFollowUp: (alertId: string, stillOngoing: boolean) => void;

    // Demo actions
    seedDemoData: () => void;
    simulateIncomingReport: () => void;
    simulateSensorEvent: (sensorId: string) => void;
}

// Initial Sensor Configuration
const DEFAULT_SENSORS: SensorNode[] = [
    {
        id: 'sensor-1',
        location: { lat: 26.1638, lng: 91.7674 }, // Zoo Road
        areaName: 'Zoo Road (Drain 4)',
        status: 'normal',
        isSimulated: true,
        lastReading: {
            waterLevelCm: 15,
            rainfallMmPerHour: 5,
            batteryLevel: 98,
            timestamp: new Date()
        }
    },
    {
        id: 'sensor-2',
        location: { lat: 26.1445, lng: 91.7362 }, // GS Road
        areaName: 'GS Road (Bhangagarh)',
        status: 'normal',
        isSimulated: true,
        lastReading: {
            waterLevelCm: 10,
            rainfallMmPerHour: 2,
            batteryLevel: 95,
            timestamp: new Date()
        }
    },
    {
        id: 'sensor-3',
        location: { lat: 26.1872, lng: 91.7384 }, // Fancy Bazar
        areaName: 'Fancy Bazar Pump House',
        status: 'normal',
        isSimulated: true,
        lastReading: {
            waterLevelCm: 45, // Slightly high
            rainfallMmPerHour: 12,
            batteryLevel: 88,
            timestamp: new Date()
        }
    }
];

// Mock weather data for demo
const DEFAULT_WEATHER: WeatherData = {
    isRaining: true,
    rainfallMm: 12.5,
    lastUpdated: new Date(),
    description: 'Light to moderate rain',
    temperature: 28,
    humidity: 85,
};

// Key Guwahati locations for city-wide mock data
const CITY_WIDE_MOCK_LOCATIONS = [
    { name: 'Anil Nagar', coords: { lat: 26.1754, lng: 91.7766 }, type: 'flood', severity: 'critical' },
    { name: 'Nabin Nagar', coords: { lat: 26.1732, lng: 91.7744 }, type: 'flood', severity: 'critical' },
    { name: 'Hatigaon', coords: { lat: 26.1402, lng: 91.7909 }, type: 'waterlogging', severity: 'medium' },
    { name: 'Rukminigaon', coords: { lat: 26.1364, lng: 91.7963 }, type: 'waterlogging', severity: 'high' }
];

export const useFloodStore = create<FloodStore>((set, get) => ({
    // Initial state
    reports: [],
    alerts: [],
    users: [],
    currentUser: null,
    weather: DEFAULT_WEATHER,
    blockedRoads: [],
    selectedLocation: null,
    isSubmitting: false,
    notifications: [],
    followUpPrompts: new Map(),
    sensors: DEFAULT_SENSORS,
    alertHistory: [], // [NEW]
    cityWideAlerts: [], // [NEW]

    // Initialize user on first interaction
    initializeUser: () => {
        const existingUser = get().currentUser;
        if (existingUser) return;

        const newUser: User = {
            id: uuidv4(),
            sessionId: uuidv4(),
            location: GUWAHATI_CENTER,
            subscriptionRadius: 1000, // 1km default
            createdAt: new Date(),
            lastActive: new Date(),
        };

        set((state) => ({
            currentUser: newUser,
            users: [...state.users, newUser],
        }));
    },

    // Update current user's location
    updateUserLocation: (location: Coordinates) => {
        set((state) => ({
            currentUser: state.currentUser
                ? { ...state.currentUser, location, lastActive: new Date() }
                : null,
        }));
    },

    // Submit a new flood report
    submitReport: async (reportData) => {
        set({ isSubmitting: true });

        const user = get().currentUser;
        if (!user) {
            get().initializeUser();
        }

        const newReport: FloodReport = {
            id: uuidv4(),
            ...reportData,
            areaName: reportData.areaName || findNearestArea(reportData.location),
            timestamp: new Date(),
            userId: get().currentUser?.id || uuidv4(),
            isActive: true,
        };

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        set((state) => ({
            reports: [...state.reports, newReport],
            isSubmitting: false,
        }));

        // Add blocked road if this is a flood or drain overflow
        if (newReport.type === 'flood' || newReport.type === 'drain_overflow') {
            const blockedRoad: BlockedRoad = {
                id: uuidv4(),
                start: newReport.location,
                end: generateRandomOffset(newReport.location, 200),
                reason: `${newReport.type === 'flood' ? 'Flooding' : 'Drain overflow'} reported`,
                reportId: newReport.id,
                severity: 'high',
            };

            set((state) => ({
                blockedRoads: [...state.blockedRoads, blockedRoad],
            }));
        }

        // Process alerts after new report
        get().processAlerts();

        // Add notification
        get().addNotification(`✅ Report submitted for ${newReport.areaName}`);
    },

    // Process reports and generate alerts
    processAlerts: () => {
        const { reports, weather, alerts, sensors, cityWideAlerts } = get();
        const generatedAlerts = processReportsForAlerts(reports, weather, alerts, sensors);

        // Combine generated alerts (from user reports) with permanent mock city-wide alerts
        const currentGeneratedIds = new Set(generatedAlerts.map(a => a.id));
        const activeCityWide = cityWideAlerts.filter(a => !currentGeneratedIds.has(a.id));

        // Use a set to avoid duplicates based on ID or Area Name
        // (Simple merge for now)
        const allActiveAlerts = [...generatedAlerts, ...activeCityWide];

        const prevAlertCount = alerts.length;

        // Notify for NEW generated alerts only
        const oldAlertIds = new Set(alerts.map(a => a.id));

        set((state) => ({
            alerts: allActiveAlerts,
        }));

        for (const alert of generatedAlerts) {
            if (!oldAlertIds.has(alert.id)) {
                get().addNotification(
                    `🚨 ALERT: ${alert.type.replace('_', ' ')} in ${alert.areaName}! ${alert.notifiedUsers} nearby users notified.`
                );

                setTimeout(() => {
                    get().sendFollowUp(alert.id);
                }, 60000);
            }
        }
    },

    // Set selected location on map
    setSelectedLocation: (location: Coordinates | null) => {
        set({ selectedLocation: location });
    },

    // Add notification
    addNotification: (message: string) => {
        set((state) => ({
            notifications: [...state.notifications, message],
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
            set((state) => ({
                notifications: state.notifications.slice(1),
            }));
        }, 5000);
    },

    // Clear specific notification
    clearNotification: (index: number) => {
        set((state) => ({
            notifications: state.notifications.filter((_, i) => i !== index),
        }));
    },

    // Update weather data
    updateWeather: (weatherUpdate: Partial<WeatherData>) => {
        set((state) => ({
            weather: { ...state.weather, ...weatherUpdate, lastUpdated: new Date() },
        }));
    },

    // Send follow-up prompt
    sendFollowUp: (alertId: string) => {
        const alert = get().alerts.find((a) => a.id === alertId);
        if (!alert || !alert.isActive) return;

        get().addNotification(
            `🔔 Is flooding still ongoing near ${alert.areaName}? Tap to update.`
        );

        set((state) => ({
            followUpPrompts: new Map(state.followUpPrompts).set(alertId, new Date()),
        }));
    },

    // Respond to follow-up
    respondToFollowUp: (alertId: string, stillOngoing: boolean) => {
        set((state) => {
            const alerts = state.alerts.map((a) => {
                if (a.id === alertId) {
                    if (!stillOngoing) {
                        return { ...a, isActive: false };
                    }
                    // Extend alert duration
                    return {
                        ...a,
                        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                    };
                }
                return a;
            });

            return { alerts };
        });

        get().addNotification(
            stillOngoing
                ? '📍 Thank you! Alert extended for 30 more minutes.'
                : '✅ Thank you! Alert has been resolved.'
        );
    },

    // Seed demo data
    seedDemoData: () => {
        // Generate Mock City-Wide Alerts
        const mockAlerts: Alert[] = CITY_WIDE_MOCK_LOCATIONS.map((loc, i) => ({
            id: `mock-city-alert-${i}`,
            type: loc.type as FloodType,
            location: loc.coords,
            radius: 400, // 400m radius
            severity: loc.severity as any,
            triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * (i + 1)), // Started hours ago
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4), // Expires in 4 hours
            reportCount: 15 + i * 5, // Fake report counts
            confidenceScore: 0.9,
            areaName: loc.name,
            notifiedUsers: 200 + i * 50,
            isActive: true,
            suggestedActions: [
                'Avoid this area',
                'Take alternative route',
                'Monitor water levels'
            ]
        }));

        // Generate History (Past Alerts)
        const pastAlerts: Alert[] = [
            {
                id: 'history-1',
                type: 'waterlogging',
                location: { lat: 26.1638, lng: 91.7674 }, // Zoo Road
                radius: 300,
                severity: 'medium',
                triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
                expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
                areaName: 'Zoo Road',
                isActive: false,
                reportCount: 12,
                confidenceScore: 0.85,
                notifiedUsers: 150,
                suggestedActions: []
            },
            {
                id: 'history-2',
                type: 'drain_overflow',
                location: { lat: 26.1445, lng: 91.7362 }, // GS Road
                radius: 200,
                severity: 'medium', // Changed from low to medium as low might not exist
                triggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
                expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 40),
                areaName: 'GS Road (Bhangagarh)',
                isActive: false,
                reportCount: 8,
                confidenceScore: 0.7,
                notifiedUsers: 80,
                suggestedActions: []
            }
        ];

        set({
            reports: [],
            alerts: mockAlerts, // Initialize active alerts with city-wide mocks
            cityWideAlerts: mockAlerts,
            alertHistory: pastAlerts
        });
    },

    // Simulate incoming report for demo
    simulateIncomingReport: () => {
        const areas = ['Fancy Bazar', 'Paltan Bazar', 'Chandmari', 'Beltola'];
        const types: FloodType[] = ['flood', 'waterlogging', 'drain_overflow'];

        const randomArea = areas[Math.floor(Math.random() * areas.length)];
        const randomType = types[Math.floor(Math.random() * types.length)];

        const areaCoords = {
            'Fancy Bazar': { lat: 26.1872, lng: 91.7384 },
            'Paltan Bazar': { lat: 26.1803, lng: 91.7538 },
            'Chandmari': { lat: 26.1648, lng: 91.7741 },
            'Beltola': { lat: 26.1298, lng: 91.7869 },
        };

        const baseLocation = areaCoords[randomArea as keyof typeof areaCoords];
        const location = generateRandomOffset(baseLocation, 100);

        get().submitReport({
            type: randomType,
            location,
            areaName: randomArea,
            description: `Simulated ${randomType.replace('_', ' ')} report`,
            photoUrl: Math.random() > 0.5 ? '/demo/sample.jpg' : undefined,
            photoVerified: Math.random() > 0.7,
        });
    },

    // Simulate IoT Sensor Event (Demo Feature)
    simulateSensorEvent: (sensorId: string) => {
        const { sensors } = get();

        // 1. Find Sensor
        const targetSensorIndex = sensors.findIndex(s => s.id === sensorId);
        if (targetSensorIndex === -1) return;

        // 2. Simulate Water Rise (Critical Reading)
        const reading: SensorReading = {
            waterLevelCm: 65 + Math.random() * 20, // Critical (>50cm)
            rainfallMmPerHour: 45 + Math.random() * 10, // Heavy Rain
            batteryLevel: 90 - Math.random() * 5,
            timestamp: new Date()
        };

        // 3. Run ML Prediction
        const prediction = predictFloodRisk(reading);

        // 4. Update Store
        set(state => {
            const updatedSensors = [...state.sensors];
            updatedSensors[targetSensorIndex] = {
                ...updatedSensors[targetSensorIndex],
                status: prediction.isFlooding ? 'critical' : 'warning',
                lastReading: reading
            };
            return { sensors: updatedSensors };
        });

        // 5. Notify
        const sensor = sensors[targetSensorIndex];
        const riskLevel = (prediction.floodProbability * 100).toFixed(0);

        get().addNotification(
            `📡 IoT ALERT: Sensor at ${sensor.areaName} detects rising water. ML Risk: ${riskLevel}%`
        );

        // 6. Trigger Backend Re-evaluation
        if (prediction.isFlooding) {
            get().submitReport({
                type: 'flood',
                location: sensor.location,
                areaName: sensor.areaName,
                description: `[IoT AUTO-REPORT] Critical water level ${reading.waterLevelCm.toFixed(1)}cm detected. ML Confidence: ${riskLevel}%`,
                photoVerified: true, // Treat sensor data as "verified"
            });
        }
    },
}));
