
import React, { useState, useMemo } from 'react';
import { BrainIcon, ChatIcon, LiveIcon, MusicIcon, SoundWaveIcon } from './components/ui/icons';
import ChatTab from './components/tabs/ChatTab';
import ProThinkingTab from './components/tabs/ProThinkingTab';
import LiveConversationTab from './components/tabs/LiveConversationTab';
import AudioToolsTab from './components/tabs/AudioToolsTab';
import MrBeatboxTab from './components/tabs/MrBeatboxTab';
import TabButton from './components/ui/TabButton';

type Tab = 'chat' | 'thinking' | 'live' | 'audio' | 'beatbox';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  const tabs = useMemo(() => [
    { id: 'chat', label: 'Chat', icon: <ChatIcon /> },
    { id: 'thinking', label: 'Pro Thinking', icon: <BrainIcon /> },
    { id: 'live', label: 'Live Conversation', icon: <LiveIcon /> },
    { id: 'audio', label: 'Audio Tools', icon: <SoundWaveIcon /> },
    { id: 'beatbox', label: 'Mr. BeatBox', icon: <MusicIcon /> },
  ], []);

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatTab />;
      case 'thinking':
        return <ProThinkingTab />;
      case 'live':
        return <LiveConversationTab />;
      case 'audio':
        return <AudioToolsTab />;
      case 'beatbox':
        return <MrBeatboxTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row">
      <nav className="bg-gray-950/50 backdrop-blur-sm border-b md:border-b-0 md:border-r border-gray-700 p-4 md:p-6 flex md:flex-col items-center md:items-start sticky top-0 md:sticky">
        <div className="flex items-center mb-0 md:mb-8">
          <svg className="w-10 h-10 text-cyan-400 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.75L15.3562 6.1125L18.7187 2.75L22.0812 6.1125L18.7187 9.475L22.0812 12.8375L18.7187 16.2L15.3562 12.8375L12 16.2L8.64375 12.8375L5.28125 16.2L1.91875 12.8375L5.28125 9.475L1.91875 6.1125L5.28125 2.75L8.64375 6.1125L12 2.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
          <h1 className="text-2xl font-bold text-white hidden md:block">AI Suite</h1>
        </div>
        <ul className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 w-full justify-center">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
            />
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
