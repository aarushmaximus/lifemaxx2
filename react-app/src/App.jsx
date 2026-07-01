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
    <div className="flex h-screen bg-[#08080c] text-white font-['Geist',sans-serif] overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} overall={overall} />
      
      <main className="flex-1 overflow-y-auto relative z-10">
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
        {activeTab === 'skills' && <SkillHub />}
        {activeTab === 'analysis' && <Analysis />}
        {activeTab === 'coach' && <Coach />}
      </main>
    </div>
  );
}

export default App;
