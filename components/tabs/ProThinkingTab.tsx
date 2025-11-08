
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Spinner } from '../ui/icons';

const ProThinkingTab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setResponse('');
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const genAIResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
        }
      });
      setResponse(genAIResponse.text);
    } catch (err: any) {
      console.error('Error with Pro Thinking:', err);
      setError('An error occurred. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Pro Thinking Mode</h2>
        <p className="text-gray-400">
          Tackle your most complex problems. This mode uses gemini-2.5-pro with its maximum reasoning budget for deep analysis and comprehensive answers.
        </p>
      </div>
      
      <div className="flex flex-col space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a complex prompt, e.g., 'Develop a multi-stage business plan for a sustainable energy startup in emerging markets...'"
          className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          disabled={isLoading}
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="bg-cyan-600 text-white font-semibold py-2 px-6 rounded-lg self-start hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? <><Spinner /> Generating...</> : 'Generate Response'}
        </button>
      </div>

      {(isLoading || response || error) && (
        <div className="mt-6 flex-1 bg-gray-800/50 rounded-lg p-4 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Spinner className="w-8 h-8 mb-2" />
              <p>Thinking...</p>
              <p className="text-sm">This may take a moment for complex queries.</p>
            </div>
          )}
          {error && <p className="text-red-400">{error}</p>}
          {response && (
            <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white">
              <pre className="whitespace-pre-wrap font-sans text-gray-200">{response}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProThinkingTab;
