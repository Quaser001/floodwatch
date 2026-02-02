'use client';

import { useState, useEffect, useRef } from 'react';

const LANGUAGES = [
    { code: 'en-IN', label: 'EN', name: 'English' },
    { code: 'as-IN', label: 'AS', name: 'Assamese' },
    { code: 'hi-IN', label: 'HI', name: 'Hindi' },
    { code: 'bn-IN', label: 'BN', name: 'Bengali' },
];

interface VoiceAssistantProps {
    position?: 'fixed' | 'absolute';
    className?: string;
}

export default function VoiceAssistant({ position = 'fixed', className = '' }: VoiceAssistantProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [lastReply, setLastReply] = useState('');
    const [language, setLanguage] = useState('en-IN');
    const [showLanguages, setShowLanguages] = useState(false);

    const recognitionRef = useRef<any>(null);

    // Initialize/Update recognition when language changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = language;
                recognition.interimResults = false;
                recognition.continuous = false;

                recognition.onstart = () => {
                    setIsListening(true);
                    setTranscript('');
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onresult = async (event: any) => {
                    const text = event.results[0][0].transcript;
                    console.log('User said:', text);
                    setTranscript(text);
                    handleVoiceQuery(text);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, [language]);

    const speak = (text: string) => {
        if (!text) return;
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;

        utterance.onend = () => {
            setIsSpeaking(false);
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    const handleVoiceQuery = async (text: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/voice-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language })
            });

            const data = await res.json();
            setLastReply(data.reply);
            setIsProcessing(false);
            speak(data.reply);
        } catch (error) {
            console.error('API Error:', error);
            const errorMsg = "I couldn't reach the server. Please check your connection.";
            setLastReply(errorMsg);
            setIsProcessing(false);
            speak(errorMsg);
        }
    };

    const startListening = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error(e);
            }
        } else {
            alert('Voice recognition not supported in this browser.');
        }
    };

    if (typeof window === 'undefined') {
        return null;
    }

    // Default positioning classes if generic 'fixed' or 'absolute' request without custom className overrides
    const baseClasses = position === 'fixed'
        ? "bottom-24 right-4 md:bottom-8 md:right-8"
        : "";

    return (
        <div className={`${position} ${baseClasses} ${className} z-[2000] flex flex-col items-end gap-3`}>

            {/* Transcript Bubble */}
            {(transcript || lastReply) && (isListening || isProcessing || isSpeaking) && (
                <div className="glass-card p-3 mb-2 max-w-[250px] text-xs animate-fadeIn shadow-xl border border-white/10 backdrop-blur-xl bg-slate-900/90">
                    {transcript && <div className="text-slate-400 mb-1">You: "{transcript}"</div>}
                    {isProcessing && <div className="text-blue-400 animate-pulse">Thinking...</div>}
                    {lastReply && !isProcessing && <div className="text-white font-medium">🤖 {lastReply}</div>}
                </div>
            )}

            {/* Language Selector */}
            <div className="flex flex-col items-end gap-2">
                {/* Expandable List */}
                {showLanguages && (
                    <div className="flex flex-col gap-1 mb-1 animate-fadeIn">
                        {LANGUAGES.filter(l => l.code !== language).map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => { setLanguage(lang.code); setShowLanguages(false); }}
                                className="w-10 h-10 rounded-full bg-slate-800 border border-slate-600 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white shadow-lg transition-all"
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Active Language / Toggle */}
                <button
                    onClick={() => setShowLanguages(!showLanguages)}
                    className="w-10 h-10 rounded-full bg-slate-800/80 backdrop-blur-md border border-slate-600 text-xs font-bold text-white shadow-lg hover:scale-105 transition-all"
                    title={`Current Language: ${LANGUAGES.find(l => l.code === language)?.name}`}
                >
                    {LANGUAGES.find(l => l.code === language)?.label}
                </button>
            </div>

            {/* Mic Button */}
            <button
                onClick={startListening}
                className={`
                    w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 border-2 border-white/10
                    ${isListening
                        ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30'
                        : isProcessing
                            ? 'bg-blue-600 animate-bounce'
                            : isSpeaking
                                ? 'bg-emerald-500 ring-4 ring-emerald-500/30'
                                : 'bg-gradient-to-br from-blue-600 to-indigo-700 hover:scale-110 hover:shadow-blue-500/50'
                    }
                `}
                title="Voice Assistant"
            >
                {isListening ? (
                    <span className="text-2xl">👂</span>
                ) : isSpeaking ? (
                    <span className="text-2xl animate-pulse">🔊</span>
                ) : (
                    <span className="text-2xl">🎤</span>
                )}
            </button>
        </div>
    );
}
