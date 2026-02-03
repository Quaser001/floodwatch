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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = language;
                recognition.interimResults = false;
                recognition.continuous = false;

                recognition.onstart = () => { setIsListening(true); setTranscript(''); };
                recognition.onend = () => { setIsListening(false); };
                recognition.onresult = async (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    handleVoiceQuery(text);
                };
                recognition.onerror = () => setIsListening(false);
                recognitionRef.current = recognition;
            }
        }
    }, [language]);

    const speak = (text: string) => {
        if (!text) return;
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.onend = () => setIsSpeaking(false);
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
            setLastReply("Connection Error.");
            setIsProcessing(false);
            speak("I couldn't reach the server.");
        }
    };

    const startListening = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        recognitionRef.current?.start();
    };

    if (typeof window === 'undefined') return null;

    // Use passed className for positioning
    return (
        <div className={`${position} ${className} z-[2000] flex flex-col items-end gap-4`}>

            {/* Transcript Bubble (only when active) */}
            {(transcript || lastReply) && (isListening || isProcessing || isSpeaking) && (
                <div className="absolute bottom-20 right-0 glass-card p-4 min-w-[200px] max-w-[280px] text-sm animate-in slide-in-from-bottom-2 fade-in shadow-2xl border border-white/15 bg-slate-900/95 rounded-2xl pointer-events-none mb-2">
                    {transcript && <div className="text-slate-400 mb-2 italic">"{transcript}"</div>}
                    {isProcessing && <div className="flex items-center gap-2 text-blue-400"><span className="spinner w-3 h-3" /> Thinking...</div>}
                    {lastReply && !isProcessing && <div className="text-white font-medium">✨ {lastReply}</div>}

                    {/* Speech Triangle */}
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-slate-900 border-r border-b border-white/15 transform rotate-45"></div>
                </div>
            )}

            {/* Main Voice FAB */}
            <div className="flex flex-col items-center gap-2 relative">

                <button
                    onClick={startListening}
                    className={`
                        w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 transform active:scale-90 border border-white/20 relative overflow-hidden group
                        ${isListening ? 'bg-rose-500 scale-110' : isSpeaking ? 'bg-emerald-500' : 'bg-slate-900/80 backdrop-blur-xl hover:bg-slate-800'}
                    `}
                >
                    {/* Pulse Effect */}
                    {isListening && <div className="absolute inset-0 rounded-full animate-ping bg-rose-500/50"></div>}

                    {/* Icon */}
                    <div className="relative z-10 transition-transform group-hover:scale-110">
                        {isListening ? (
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        ) : isSpeaking ? (
                            <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        ) : (
                            <svg className="w-6 h-6 text-blue-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
}
