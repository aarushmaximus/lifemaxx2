import { useState, useEffect } from 'react';
import { store } from './lib/store';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SkillHub from './pages/SkillHub';
import Analysis from './pages/Analysis';
import Coach from './pages/Coach';
import Settings from './pages/Settings';

import Quests from './pages/Quests';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overall, setOverall] = useState(store.getOverall());

  useEffect(() => {
    const handleStoreChange = () => {
      setOverall(store.getOverall());
    };
    store.on('change', handleStoreChange);
    return () => {
      store.off('change', handleStoreChange);
    };
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#000000] text-[#e8e8f0] font-['Geist',sans-serif] overflow-hidden relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:block z-50">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} overall={overall} />
      </div>

      {/* Mobile Top App Bar */}
      <nav className="md:hidden fixed top-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-[#141414]" style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}>
        <div className="flex justify-between items-center px-6 py-4 w-full">
          <div className="flex items-center gap-4">
            <h1 className="tracking-tighter text-[#e8e8f0]" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Lifemaxx</h1>
          </div>
        </div>
      </nav>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 pt-[72px] md:pt-0 pb-[90px] md:pb-0" id="main-content">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'quests' && <Quests setActiveTab={setActiveTab} />}
        {activeTab === 'skills' && <SkillHub />}
        {activeTab === 'analysis' && <Analysis />}
        {activeTab === 'coach' && <Coach />}
        {activeTab === 'settings' && <Settings />}
      </main>

      {/* Mobile Bottom NavBar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-3xl border-t border-[#141414]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        <div className="flex justify-around items-center px-4 pt-4 pb-2 w-full max-w-lg mx-auto">
          {[
            { id: 'dashboard', icon: 'grid_view', label: 'DASH' },
            { id: 'quests', icon: 'flag', label: 'QUESTS' },
            { id: 'skills', icon: 'apps', label: 'SKILLS' },
            { id: 'analysis', icon: 'query_stats', label: 'ANALYSIS' },
            { id: 'coach', icon: 'psychology', label: 'COACH' },
            { id: 'settings', icon: 'settings', label: 'SETTINGS' },
          ].map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${activeTab === tab.id ? 'text-[#E8E8E8]' : 'text-[#8a8a98]'}`}
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 100" }}>{tab.icon}</span>
              <span className="text-[9px] tracking-widest mt-1 font-medium">{tab.label}</span>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;

