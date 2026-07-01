import { useState, useEffect } from 'react';
import { store } from './lib/store';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SkillHub from './pages/SkillHub';
import Analysis from './pages/Analysis';
import Coach from './pages/Coach';

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
    <div className="flex flex-col md:flex-row h-screen bg-[#08080c] text-white font-['Geist',sans-serif] overflow-hidden">
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} overall={overall} />
      </div>
      
      <main className="flex-1 overflow-y-auto relative z-10 pb-16 md:pb-0">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'skills' && <SkillHub />}
        {activeTab === 'analysis' && <Analysis />}
        {activeTab === 'coach' && <Coach />}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0f] border-t border-[#1a1a24] flex items-center justify-around z-50">
        {[
          { id: 'dashboard', icon: 'home', label: 'Dash' },
          { id: 'skills', icon: 'auto_graph', label: 'Skills' },
          { id: 'analysis', icon: 'analytics', label: 'Analysis' },
          { id: 'coach', icon: 'chat', label: 'Coach' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full ${activeTab === tab.id ? 'text-[#3b82f6]' : 'text-gray-500'}`}
          >
            <span className="material-symbols-rounded text-2xl mb-1">{tab.icon}</span>
            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
