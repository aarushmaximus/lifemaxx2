import { LucideHome, LucideActivity, LucideTrendingUp, LucideMessageSquare } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, overall }) {
  const tabs = [
    { id: 'dashboard', icon: <LucideHome size={20} />, label: 'Dashboard' },
    { id: 'skills', icon: <LucideActivity size={20} />, label: 'Skill Hub' },
    { id: 'analysis', icon: <LucideTrendingUp size={20} />, label: 'Analysis' },
    { id: 'coach', icon: <LucideMessageSquare size={20} />, label: 'Coach' },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-widest text-center text-white">LIFEMAXX</h1>
        <div className="text-center mt-2 text-sm text-gray-400">
          Level {overall?.currentLevel || 0}
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
