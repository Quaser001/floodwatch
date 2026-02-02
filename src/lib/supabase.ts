// Supabase Client for FloodWatch Guwahati
// Handles user registration, report storage, and alert persistence

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FloodReport, Alert, User, Coordinates } from './types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return supabaseUrl !== '' && supabaseAnonKey !== '';
};

// ============================================
// User Management
// ============================================

interface DbUser {
    id: string;
    session_id: string;
    telegram_chat_id?: string;
    location_lat?: number;
    location_lng?: number;
    subscription_radius: number;
    created_at: string;
    last_active: string;
}

export async function createUser(
    sessionId: string,
    telegramChatId?: string,
    location?: Coordinates
): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
        .from('users')
        .insert({
            session_id: sessionId,
            telegram_chat_id: telegramChatId,
            location_lat: location?.lat,
            location_lng: location?.lng,
            subscription_radius: 1000, // Default 1km
        })
        .select()
        .single();

    if (error) {
        console.error('[Supabase] Create user error:', error);
        return null;
    }

    return mapDbUserToUser(data);
}

export async function updateUserLocation(
    userId: string,
    location: Coordinates
): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
        .from('users')
        .update({
            location_lat: location.lat,
            location_lng: location.lng,
            last_active: new Date().toISOString(),
        })
        .eq('id', userId);

    return !error;
}

export async function getUsersInRadius(
    center: Coordinates,
    radiusMeters: number
): Promise<User[]> {
    if (!isSupabaseConfigured()) return [];

    // Simple bounding box query (not exact radius, but close enough for demos)
    // For production, use PostGIS
    const latDelta = radiusMeters / 111000;
    const lngDelta = radiusMeters / (111000 * Math.cos((center.lat * Math.PI) / 180));

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .gte('location_lat', center.lat - latDelta)
        .lte('location_lat', center.lat + latDelta)
        .gte('location_lng', center.lng - lngDelta)
        .lte('location_lng', center.lng + lngDelta);

    if (error) {
        console.error('[Supabase] Get users in radius error:', error);
        return [];
    }

    return data.map(mapDbUserToUser);
}

function mapDbUserToUser(db: DbUser): User {
    return {
        id: db.id,
        sessionId: db.session_id,
        location: db.location_lat && db.location_lng
            ? { lat: db.location_lat, lng: db.location_lng }
            : undefined,
        subscriptionRadius: db.subscription_radius,
        createdAt: new Date(db.created_at),
        lastActive: new Date(db.last_active),
    };
}

// ============================================
// Flood Reports
// ============================================

interface DbReport {
    id: string;
    type: string;
    location_lat: number;
    location_lng: number;
    area_name: string;
    description?: string;
    photo_url?: string;
    photo_verified?: boolean;
    photo_confidence?: number;
    timestamp: string;
    user_id: string;
    is_active: boolean;
}

export async function saveReport(report: FloodReport): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.from('flood_reports').insert({
        id: report.id,
        type: report.type,
        location_lat: report.location.lat,
        location_lng: report.location.lng,
        area_name: report.areaName,
        description: report.description,
        photo_url: report.photoUrl,
        photo_verified: report.photoVerified,
        photo_confidence: report.photoConfidence,
        user_id: report.userId,
        is_active: report.isActive,
    });

    if (error) {
        console.error('[Supabase] Save report error:', error);
        return false;
    }

    return true;
}

export async function getActiveReports(): Promise<FloodReport[]> {
    if (!isSupabaseConfigured()) return [];

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('flood_reports')
        .select('*')
        .eq('is_active', true)
        .gte('timestamp', twoHoursAgo)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('[Supabase] Get reports error:', error);
        return [];
    }

    return data.map(mapDbReportToReport);
}

function mapDbReportToReport(db: DbReport): FloodReport {
    return {
        id: db.id,
        type: db.type as FloodReport['type'],
        location: { lat: db.location_lat, lng: db.location_lng },
        areaName: db.area_name,
        description: db.description,
        photoUrl: db.photo_url,
        photoVerified: db.photo_verified,
        photoConfidence: db.photo_confidence,
        timestamp: new Date(db.timestamp),
        userId: db.user_id,
        isActive: db.is_active,
    };
}

// ============================================
// Alerts
// ============================================

interface DbAlert {
    id: string;
    type: string;
    severity: string;
    location_lat: number;
    location_lng: number;
    area_name: string;
    radius: number;
    confidence_score: number;
    report_count: number;
    triggered_at: string;
    expires_at: string;
    notified_users: number;
    is_active: boolean;
    suggested_actions: string[];
}

export async function saveAlert(alert: Alert): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase.from('alerts').insert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        location_lat: alert.location.lat,
        location_lng: alert.location.lng,
        area_name: alert.areaName,
        radius: alert.radius,
        confidence_score: alert.confidenceScore,
        report_count: alert.reportCount,
        triggered_at: alert.triggeredAt,
        expires_at: alert.expiresAt,
        notified_users: alert.notifiedUsers,
        is_active: alert.isActive,
        suggested_actions: alert.suggestedActions,
    });

    if (error) {
        console.error('[Supabase] Save alert error:', error);
        return false;
    }

    return true;
}

export async function getActiveAlerts(): Promise<Alert[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .order('triggered_at', { ascending: false });

    if (error) {
        console.error('[Supabase] Get alerts error:', error);
        return [];
    }

    return data.map(mapDbAlertToAlert);
}

function mapDbAlertToAlert(db: DbAlert): Alert {
    return {
        id: db.id,
        type: db.type as Alert['type'],
        severity: db.severity as Alert['severity'],
        location: { lat: db.location_lat, lng: db.location_lng },
        areaName: db.area_name,
        radius: db.radius,
        confidenceScore: db.confidence_score,
        reportCount: db.report_count,
        triggeredAt: new Date(db.triggered_at),
        expiresAt: new Date(db.expires_at),
        notifiedUsers: db.notified_users,
        isActive: db.is_active,
        suggestedActions: db.suggested_actions,
    };
}

// ============================================
// Supabase Schema (for reference)
// ============================================

/*
SQL to create tables in Supabase:

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  telegram_chat_id TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  subscription_radius INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Flood reports table
CREATE TABLE flood_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('flood', 'waterlogging', 'drain_overflow')),
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  area_name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  photo_verified BOOLEAN DEFAULT FALSE,
  photo_confidence DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- Alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  area_name TEXT NOT NULL,
  radius INTEGER NOT NULL,
  confidence_score INTEGER NOT NULL,
  report_count INTEGER NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notified_users INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  suggested_actions TEXT[] DEFAULT '{}'
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE flood_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Public access policies (for hackathon demo)
CREATE POLICY "Public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON users FOR UPDATE USING (true);

CREATE POLICY "Public read access" ON flood_reports FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON flood_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read access" ON alerts FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON alerts FOR UPDATE USING (true);
*/
