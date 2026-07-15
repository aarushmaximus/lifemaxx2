import React, { useState } from 'react';
import SkillHubComponent from '../components/SkillHub';
import { store } from '../lib/store';
import { formulas as F } from '../lib/formulas';

export default function SkillHub() {
  const [selectedMacroId, setSelectedMacroId] = useState(null);
  const macros = store.getMacros();

  if (selectedMacroId) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 pt-6 pb-2">
          <button 
            onClick={() => setSelectedMacroId(null)}
            className="text-gray-400 hover:text-white flex items-center text-sm font-display tracking-widest transition-colors"
          >
            ← BACK TO SKILLS
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SkillHubComponent macroId={selectedMacroId} />
        </div>
      </div>
    );
  }

  return (
    <div className="skills-view pb-24">
      <div className="skills-view-header flex justify-between items-center">
        <div>
          <h1 className="font-display">SKILLS & STATS</h1>
          <p className="skills-view-sub">Manage macros, micros &amp; stats</p>
        </div>
      </div>
      <div className="skills-grid">
        {macros.map(m => {
          const pct = F.progressPercent(m.currentXP || 0, m);
          const into = F.xpIntoCurrentLevel(m.currentXP || 0, m);
          const req = F.xpRequiredForNextLevel(m.currentXP || 0, m);
          
          return (
            <div 
              key={m.id}
              className="skill-card"
              style={{ '--sk-accent': m.accentColor, position: 'relative' }}
              onClick={() => setSelectedMacroId(m.id)}
            >
              <div className="skill-card-shine"></div>
              <div className="skill-card-inner">
                <div className="skill-card-top">
                  <div className="skill-card-dot" style={{ background: m.accentColor, boxShadow: `0 0 10px ${m.accentColor}88` }}></div>
                  <div className="skill-card-level font-display" style={{ color: m.accentColor }}>
                    <span className="skill-card-lvnum">{m.currentLevel || 0}</span>
                    <span className="skill-card-lvlabel">LV</span>
                  </div>
                </div>
                <div className="skill-card-name">{m.name}</div>
                <div className="skill-card-xp">{F.formatXP(into)} / {F.formatXP(req)} XP</div>
                <div className="skill-card-bar-track">
                  <div className="skill-card-bar-fill" style={{ width: `${pct}%`, background: m.accentColor }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
