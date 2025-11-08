
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../../types';
import { Spinner } from '../ui/icons';

const ChatTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const config: any = {};
      if (useGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: input,
        config: config
      });

      const modelMessage: ChatMessage = {
        role: 'model',
        text: response.text,
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            uri: chunk.web?.uri,
            title: chunk.web?.title,
        })).filter(source => source.uri) ?? [],
      };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, something went wrong. Please try again.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-800/50 rounded-lg">
        {messages.length === 0 && (
          <div className="text-center text-gray-400">
            <p className="text-lg">Ask me anything!</p>
            <p>Toggle "Use Search Grounding" for up-to-date information.</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-600' : 'bg-gray-700'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-600">
                  <h4 className="text-xs font-semibold text-gray-300 mb-1">Sources:</h4>
                  <ul className="text-xs space-y-1">
                    {msg.sources.map((source, i) => (
                      <li key={i}>
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">
                          {i+1}. {source.title || source.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center">
            <label htmlFor="grounding-toggle" className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" id="grounding-toggle" className="sr-only" checked={useGrounding} onChange={() => setUseGrounding(!useGrounding)} />
                <div className={`block w-12 h-6 rounded-full ${useGrounding ? 'bg-cyan-500' : 'bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useGrounding ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div className="ml-3 text-sm text-gray-300">
                Use Search Grounding
              </div>
            </label>
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {isLoading ? <Spinner /> : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatTab;
