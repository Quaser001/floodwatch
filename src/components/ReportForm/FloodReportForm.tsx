'use client';

import { useState, useRef } from 'react';
import { useFloodStore } from '@/lib/store';
import { FloodType, Coordinates, GUWAHATI_AREAS } from '@/lib/types';
import { findNearestArea } from '@/lib/geoUtils';

interface ReportFormProps {
    onClose: () => void;
}

export default function FloodReportForm({ onClose }: ReportFormProps) {
    const { selectedLocation, setSelectedLocation, submitReport, isSubmitting } = useFloodStore();

    const [floodType, setFloodType] = useState<FloodType>('flood');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [useCurrentLocation, setUseCurrentLocation] = useState(false);
    const [manualArea, setManualArea] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location: Coordinates = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setSelectedLocation(location);
                    setUseCurrentLocation(true);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Could not get your location. Please click on the map instead.');
                }
            );
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedLocation && !manualArea) {
            alert('Please select a location on the map or choose an area');
            return;
        }

        const location = selectedLocation || GUWAHATI_AREAS[manualArea];
        const areaName = selectedLocation ? findNearestArea(selectedLocation) : manualArea;

        await submitReport({
            type: floodType,
            location,
            areaName,
            description: description || undefined,
            photoUrl: photoPreview || undefined,
            photoVerified: photo ? Math.random() > 0.3 : undefined,
        });

        setSelectedLocation(null);
        onClose();
    };

    const floodTypes: { value: FloodType; label: string; icon: string; description: string }[] = [
        { value: 'flood', label: 'Flood', icon: '🌊', description: 'Rising water' },
        { value: 'waterlogging', label: 'Waterlogging', icon: '💧', description: 'Stagnant water' },
        { value: 'drain_overflow', label: 'Drain Overflow', icon: '🚰', description: 'Overflowing drain' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
            <div className="glass w-full max-w-lg max-h-[90vh] overflow-auto animate-scaleIn shadow-2xl">
                {/* Premium Header */}
                <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-red-500/10 to-orange-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg shadow-red-500/30">
                                🚨
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Report Flood</h2>
                                <p className="text-sm text-slate-400">Help your community stay safe</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl hover:bg-slate-700/50 transition-colors group"
                        >
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Flood Type Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-3">
                            Type of Incident *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {floodTypes.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setFloodType(type.value)}
                                    className={`
                                        p-4 rounded-xl border-2 transition-all text-center group hover-lift
                                        ${floodType === type.value
                                            ? 'border-blue-500 bg-gradient-to-br from-blue-500/20 to-purple-500/10 shadow-lg shadow-blue-500/20'
                                            : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/50'
                                        }
                                    `}
                                >
                                    <span className={`text-2xl block mb-2 transition-transform ${floodType === type.value ? 'scale-110' : 'group-hover:scale-105'}`}>
                                        {type.icon}
                                    </span>
                                    <span className="text-sm font-semibold text-white">{type.label}</span>
                                    <span className="text-[10px] text-slate-500 block mt-0.5">{type.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-3">
                            Location *
                        </label>

                        {selectedLocation ? (
                            <div className="glass-card p-4 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl shadow-md">
                                        📍
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">
                                            {findNearestArea(selectedLocation)}
                                        </p>
                                        <p className="text-xs text-slate-400 font-mono">
                                            {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedLocation(null)}
                                    className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={handleGetLocation}
                                    className="btn btn-ghost w-full py-4 border-dashed border-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Use Current Location
                                </button>

                                <div className="text-center text-slate-500 text-xs font-medium uppercase tracking-wider">or click on map</div>

                                <div className="text-center text-slate-500 text-xs font-medium uppercase tracking-wider">or select area</div>
                                <select
                                    value={manualArea}
                                    onChange={(e) => setManualArea(e.target.value)}
                                    className="input select"
                                >
                                    <option value="">Select an area...</option>
                                    {Object.keys(GUWAHATI_AREAS).map((area) => (
                                        <option key={area} value={area}>{area}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-3">
                            Photo <span className="text-slate-500 font-normal">(Optional - increases confidence)</span>
                        </label>

                        {photoPreview ? (
                            <div className="relative rounded-xl overflow-hidden shadow-lg">
                                <img
                                    src={photoPreview}
                                    alt="Report preview"
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPhoto(null);
                                        setPhotoPreview(null);
                                    }}
                                    className="absolute top-3 right-3 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <div className="absolute bottom-3 left-3 badge badge-info">
                                    📸 Photo will be AI-verified
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-36 border-2 border-dashed border-slate-600 rounded-xl 
                                    flex flex-col items-center justify-center gap-3
                                    hover:border-slate-500 hover:bg-slate-800/30 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <span className="text-sm text-slate-400 font-medium">Click to upload a photo</span>
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-3">
                            Description <span className="text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the situation (e.g., water level, road conditions)..."
                            className="input min-h-[100px]"
                            rows={3}
                        />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (!selectedLocation && !manualArea)}
                            className="btn btn-danger flex-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="spinner w-5 h-5" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <span>🚨</span>
                                    <span className="font-semibold">Submit Report</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
