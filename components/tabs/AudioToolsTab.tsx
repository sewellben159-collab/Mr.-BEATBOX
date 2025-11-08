import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData, fileToBase64 } from '../../utils/audioUtils';
import { Spinner } from '../ui/icons';

const AudioToolsTab: React.FC = () => {
  // TTS State
  const [ttsText, setTtsText] = useState('Hello! I am a friendly AI from Google.');
  const [voice, setVoice] = useState('Kore');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Transcription State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSpeak = async () => {
    if (!ttsText.trim() || isSpeaking) return;
    setIsSpeaking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          // Fix: Cast window to any to allow for webkitAudioContext
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioContext = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => setIsSpeaking(false);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
    }
  };
  
  const handleStartRecording = async () => {
    setAudioBlob(null);
    setTranscription('');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = event => {
            audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            audioChunksRef.current = [];
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (error) {
        console.error("Error accessing microphone:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };
  
  const handleTranscribe = async () => {
    if (!audioBlob || isTranscribing) return;
    setIsTranscribing(true);
    setTranscription('');
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const base64Audio = await fileToBase64(audioBlob);
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              { inlineData: { mimeType: audioBlob.type, data: base64Audio } },
              { text: 'Transcribe this audio recording.' }
            ]
          }
        });

        setTranscription(response.text);
    } catch (error) {
        console.error('Transcription error:', error);
        setTranscription('Failed to transcribe audio.');
    } finally {
        setIsTranscribing(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
      {/* Text-to-Speech Section */}
      <div className="bg-gray-800/50 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-purple-300">Text-to-Speech</h3>
        <textarea
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
          className="w-full h-32 bg-gray-700 border border-gray-600 rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Enter text to synthesize..."
        />
        <div className="flex items-center gap-4">
          <select value={voice} onChange={e => setVoice(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option>Kore</option>
            <option>Puck</option>
            <option>Charon</option>
            <option>Fenrir</option>
            <option>Zephyr</option>
          </select>
          <button onClick={handleSpeak} disabled={isSpeaking || !ttsText.trim()} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 flex items-center gap-2">
            {isSpeaking ? <Spinner/> : 'Speak'}
          </button>
        </div>
      </div>

      {/* Transcription Section */}
      <div className="bg-gray-800/50 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-green-300">Record & Transcribe</h3>
        <div className="flex items-center gap-4 mb-4">
            {!isRecording ? (
                <button onClick={handleStartRecording} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700">Start Recording</button>
            ) : (
                <button onClick={handleStopRecording} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">Stop Recording</button>
            )}
            {audioBlob && (
                <button onClick={handleTranscribe} disabled={isTranscribing} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 flex items-center gap-2">
                    {isTranscribing ? <Spinner/> : 'Transcribe'}
                </button>
            )}
        </div>
        {audioBlob && <p className="text-sm text-gray-400 mb-2">Recording ready. Press "Transcribe".</p>}
        {transcription && (
            <div className="bg-gray-700 p-3 rounded-lg">
                <p className="text-gray-200">{transcription}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AudioToolsTab;