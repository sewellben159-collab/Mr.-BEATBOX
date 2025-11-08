import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, createLiveApiBlob } from '../../utils/audioUtils';

type TranscriptionEntry = {
    speaker: 'You' | 'Gemini';
    text: string;
};

const LiveConversationTab: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    
    const stopConversation = useCallback(() => {
        setStatus('idle');
        
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (inputAudioContextRef.current) {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }

        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        for (const source of sourcesRef.current.values()) {
          source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;

    }, []);

    const startConversation = async () => {
        setStatus('connecting');
        setTranscription([]);
        currentInputTranscription.current = '';
        currentOutputTranscription.current = '';

        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // Fix: Cast window to any to allow for webkitAudioContext
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            // Fix: Cast window to any to allow for webkitAudioContext
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('connected');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createLiveApiBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                        } else if (message.serverContent?.inputTranscription) {
                            currentInputTranscription.current += message.serverContent.inputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscription.current.trim();
                            const fullOutput = currentOutputTranscription.current.trim();
                            
                            setTranscription(prev => {
                                const newTranscription = [...prev];
                                if(fullInput) newTranscription.push({ speaker: 'You', text: fullInput });
                                if(fullOutput) newTranscription.push({ speaker: 'Gemini', text: fullOutput });
                                return newTranscription;
                            });

                            currentInputTranscription.current = '';
                            currentOutputTranscription.current = '';
                        }
                        
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            const outputCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                            }
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live API Error:', e);
                        setStatus('error');
                        stopConversation();
                    },
                    onclose: () => {
                        // This might be called on normal closure too.
                        if (status !== 'idle') {
                            stopConversation();
                        }
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                    systemInstruction: 'You are a friendly and helpful conversational AI. Keep your responses concise and natural.'
                }
            });

        } catch (error) {
            console.error('Failed to start conversation:', error);
            setStatus('error');
            stopConversation();
        }
    };
    
    return (
        <div className="h-full flex flex-col max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Live Conversation</h2>
            <p className="text-gray-400 mb-6">
                Speak directly with Gemini and get real-time audio responses.
            </p>

            <div className="flex justify-center mb-6">
                {status === 'idle' || status === 'error' ? (
                    <button onClick={startConversation} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full transition-colors">Start Conversation</button>
                ) : (
                    <button onClick={stopConversation} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full transition-colors">Stop Conversation</button>
                )}
            </div>

            <div className="w-full h-24 flex items-center justify-center bg-gray-800 rounded-lg mb-6">
                <p className="text-gray-300 text-lg font-medium">
                    {status === 'idle' && "Press 'Start' to begin"}
                    {status === 'connecting' && "Connecting..."}
                    {status === 'connected' && "Connected. Start speaking."}
                    {status === 'error' && "An error occurred. Please try again."}
                </p>
            </div>
            
            <div className="flex-1 bg-gray-800/50 rounded-lg p-4 overflow-y-auto space-y-3">
                {transcription.map((entry, index) => (
                    <div key={index}>
                        <p className={`font-bold ${entry.speaker === 'You' ? 'text-cyan-400' : 'text-purple-400'}`}>{entry.speaker}</p>
                        <p className="text-gray-200">{entry.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LiveConversationTab;