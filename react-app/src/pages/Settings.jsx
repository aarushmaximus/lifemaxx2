import React from 'react';

export default function Settings() {
  return (
    <div className="p-4 md:p-8 pt-[88px] max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-['Geist',sans-serif] text-xl tracking-widest text-[#E8E8E8] uppercase font-bold">Settings</h1>
      </div>
      
      <div className="chrome-card p-5 mb-5 rounded-xl">
        <h2 className="chrome-header text-lg mb-2 font-semibold">Vanilla UI (Reliable Code)</h2>
        <p className="text-[#8a8a98] text-sm mb-4">
          Switch back to the original Vanilla JS interface. The React interface is still in Beta and being synced with the mobile layout.
        </p>
        <button 
          className="bg-gradient-to-br from-[#e0e0e0] to-[#ffffff] text-black font-bold py-2 px-5 rounded-lg border border-white/80 shadow-[0_3px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.8)] hover:scale-105 transition-transform uppercase tracking-wider text-sm"
          onClick={() => window.location.href = '/'}
        >
          Switch to Vanilla
        </button>
      </div>
      
      <div className="text-center pt-8 pb-12 text-[#52525e] font-['Geist',sans-serif] text-xs tracking-widest uppercase opacity-70">
        React System Version: Beta
      </div>
    </div>
  );
}
