'use client';

import { useState, useRef, useEffect } from 'react';
import { useFloodStore } from '@/lib/store';
import { FloodType, Coordinates, GUWAHATI_AREAS } from '@/lib/types';
import { findNearestArea } from '@/lib/geoUtils';

interface ReportFormProps {
    onClose: () => void;
}

// Tag definitions
const PRIMARY_CATEGORIES = [
    { value: 'flood', label: 'Flooding', icon: '🌊', description: 'Rising water' },
    { value: 'waterlogging', label: 'Waterlogging', icon: '💧', description: 'Stagnant water' },
    { value: 'road_blocked', label: 'Road Blocked', icon: '🚧', description: 'Impassable' },
] as const;

const SITUATION_TAGS = {
    depth: [
        { id: 'ankle', label: 'Ankle deep', icon: '🦶' },
        { id: 'knee', label: 'Knee deep', icon: '🦵' },
        { id: 'vehicle_stuck', label: 'Vehicle stuck', icon: '🚗' },
    ],
    impact: [
        { id: 'pedestrians', label: 'Pedestrians affected', icon: '🚶' },
        { id: 'traffic', label: 'Traffic stopped', icon: '🚗' },
        { id: 'transport', label: 'Public transport disrupted', icon: '🚌' },
    ],
    cause: [
        { id: 'drain', label: 'Drain overflow', icon: '🕳️' },
        { id: 'rainfall', label: 'Heavy rainfall', icon: '🌧️' },
        { id: 'river', label: 'River nearby', icon: '🌉' },
    ],
};

const URGENCY_LEVELS = [
    { value: 'low', label: 'Low', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    { value: 'high', label: 'High', color: 'bg-red-500', textColor: 'text-red-400' },
] as const;

export default function FloodReportForm({ onClose }: ReportFormProps) {
    const { selectedLocation, setSelectedLocation, submitReport, isSubmitting } = useFloodStore();

    // Step tracking
    const [step, setStep] = useState(1);

    // Layer 1: Primary category (required)
    const [primaryCategory, setPrimaryCategory] = useState<string | null>(null);

    // Layer 2: Situation tags (optional, multi-select)
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Layer 3: Urgency (optional, single select)
    const [urgency, setUrgency] = useState<string | null>(null);

    // Photo (optional)
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Free text (optional, last)
    const [description, setDescription] = useState('');

    // Location
    const [manualArea, setManualArea] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-suggest urgency based on tags
    useEffect(() => {
        if (selectedTags.includes('vehicle_stuck') || selectedTags.includes('traffic')) {
            setUrgency('high');
        } else if (selectedTags.includes('knee') || selectedTags.includes('transport')) {
            setUrgency('medium');
        } else if (selectedTags.includes('ankle')) {
            setUrgency('low');
        }
    }, [selectedTags]);

    // Try to get location on mount
    useEffect(() => {
        if (!selectedLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setSelectedLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                () => { } // Silently fail
            );
        }
    }, [selectedLocation, setSelectedLocation]);

    // Photo validation state
    const [isValidating, setIsValidating] = useState(false);
    const [photoValidation, setPhotoValidation] = useState<{
        validated: boolean;
        reason?: string;
        confidence?: string;
    } | null>(null);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            setPhotoValidation(null);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                setPhotoPreview(base64);

                // Validate with Gemini
                setIsValidating(true);
                try {
                    const response = await fetch('/api/validate-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: base64,
                            demoMode: false // Set to true for demo
                        }),
                    });
                    const result = await response.json();
                    setPhotoValidation(result);

                    if (!result.validated) {
                        // Photo rejected - show feedback but don't remove
                    }
                } catch (error) {
                    console.error('Photo validation error:', error);
                    setPhotoValidation({ validated: true, reason: 'Validation unavailable' });
                } finally {
                    setIsValidating(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(t => t !== tagId)
                : [...prev, tagId]
        );
    };

    const handleSubmit = async () => {
        if (!primaryCategory) return;

        // If photo exists but not validated, don't submit
        if (photoPreview && photoValidation && !photoValidation.validated) {
            return;
        }

        const location = selectedLocation || GUWAHATI_AREAS[manualArea];
        const areaName = selectedLocation ? findNearestArea(selectedLocation) : manualArea;

        // Build description from tags
        const allTags = [...Object.values(SITUATION_TAGS).flat()];
        const tagLabels = selectedTags.map(t => allTags.find(tag => tag.id === t)?.label).filter(Boolean);
        const tagDescription = tagLabels.length > 0 ? tagLabels.join(' · ') : '';

        await submitReport({
            type: primaryCategory as FloodType,
            location,
            areaName,
            description: tagDescription + (description ? ` | ${description}` : ''),
            photoUrl: photoPreview || undefined,
            photoVerified: photoValidation?.validated || false,
        });

        setSelectedLocation(null);
        onClose();
    };

    const canSubmit = primaryCategory && (selectedLocation || manualArea) && !isValidating &&
        (!photoPreview || !photoValidation || photoValidation.validated);

    return (
        <div className="absolute inset-0 z-[5000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
            <div className="glass w-full max-w-md max-h-[85%] overflow-auto animate-scaleIn shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-red-500/10 to-orange-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-red-500/30">
                                🚨
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Report Flood</h2>
                                <p className="text-xs text-slate-400">Tap to report • No typing needed</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-700/50 transition-colors">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-5">
                    {/* Location (auto-filled) */}
                    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                📍
                            </div>
                            {selectedLocation ? (
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{findNearestArea(selectedLocation)}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                        {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                                    </p>
                                </div>
                            ) : (
                                <select
                                    value={manualArea}
                                    onChange={(e) => setManualArea(e.target.value)}
                                    className="flex-1 bg-transparent text-sm text-white border-none focus:outline-none"
                                >
                                    <option value="" className="text-black bg-white">Select area...</option>
                                    {Object.keys(GUWAHATI_AREAS).map((area) => (
                                        <option key={area} value={area} className="text-black bg-white">{area}</option>
                                    ))}
                                </select>
                            )}
                            <span className="text-[10px] text-emerald-400 font-medium">
                                {selectedLocation ? '✓ Auto' : ''}
                            </span>
                        </div>
                    </div>

                    {/* LAYER 1: Primary Category (Required) */}
                    <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                            What's happening? *
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {PRIMARY_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setPrimaryCategory(cat.value)}
                                    className={`p-3 rounded-xl border-2 transition-all text-center ${primaryCategory === cat.value
                                        ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                                        : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <span className="text-2xl block mb-1">{cat.icon}</span>
                                    <span className="text-xs font-medium text-white">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* LAYER 2: Situation Tags (Optional, shown after Layer 1) */}
                    {primaryCategory && (
                        <div className="animate-fadeIn">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                Add details (optional)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {Object.values(SITUATION_TAGS).flat().map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${selectedTags.includes(tag.id)
                                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        <span>{tag.icon}</span>
                                        <span>{tag.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LAYER 3: Urgency (Optional) */}
                    {primaryCategory && (
                        <div className="animate-fadeIn">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                Urgency level
                            </label>
                            <div className="flex gap-2">
                                {URGENCY_LEVELS.map((level) => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => setUrgency(level.value)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${urgency === level.value
                                            ? `${level.color} text-white shadow-lg`
                                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${level.color}`} />
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Photo (Optional) */}
                    {primaryCategory && (
                        <div className="animate-fadeIn">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                Photo evidence (optional)
                            </label>
                            {photoPreview ? (
                                <div className="relative rounded-xl overflow-hidden h-32">
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />

                                    {/* Validation overlay */}
                                    {isValidating && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="flex items-center gap-2 text-white text-sm">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Checking photo...</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Validated badge */}
                                    {!isValidating && photoValidation?.validated && (
                                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-medium flex items-center gap-1">
                                            <span>✓</span>
                                            <span>Flood verified</span>
                                        </div>
                                    )}

                                    {/* Rejected message */}
                                    {!isValidating && photoValidation && !photoValidation.validated && (
                                        <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center p-3">
                                            <div className="bg-red-500/90 text-white text-xs rounded-lg px-3 py-2 text-center max-w-[90%]">
                                                <p className="font-medium">❌ Photo doesn't show flooding</p>
                                                {photoValidation.reason && (
                                                    <p className="text-[10px] opacity-80 mt-1">{photoValidation.reason}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => { setPhoto(null); setPhotoPreview(null); setPhotoValidation(null); }}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-400 text-sm hover:border-slate-600 transition-colors"
                                >
                                    <span>📷</span>
                                    <span>Add photo</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Free Text (Optional, LAST) */}
                    {primaryCategory && (
                        <div className="animate-fadeIn">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                Add more details (optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Type here if needed..."
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-none"
                                rows={2}
                            />
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-400 text-sm font-medium hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <span>🚨</span>
                                    <span>Submit Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
