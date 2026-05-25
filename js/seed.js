// LIFEMAXX — Seed Data (first-run defaults)
window.LM.seed = (function () {
  const S = window.LM.store;
  const F = window.LM.formulas;

  const MACROS = [
    { name: 'Physique',  exponent: 1.4, totalXPtoL100: 500000,  accentColor: '#ef4444', microSkills: ['Strength','Cardio','Flexibility','Recovery'] },
    { name: 'Looks',     exponent: 1.3, totalXPtoL100: 200000,  accentColor: '#f59e0b', microSkills: ['Skincare','Style','Grooming','Posture'] },
    { name: 'Education', exponent: 1.7, totalXPtoL100: 800000,  accentColor: '#3b82f6', microSkills: ['Coding','Mathematics','Writing','Domain Knowledge','Research'] },
    { name: 'Finance',   exponent: 2.0, totalXPtoL100: 700000,  accentColor: '#10b981', microSkills: ['Income','Investing','Budgeting','Financial Literacy'] },
    { name: 'Romance',   exponent: 1.6, totalXPtoL100: 400000,  accentColor: '#ec4899', microSkills: ['Dating','Communication','Emotional Intelligence'] },
    { name: 'Creative',  exponent: 1.8, totalXPtoL100: 900000,  accentColor: '#8b5cf6', microSkills: ['Music','Content','Design','Writing'] },
    { name: 'Founder',   exponent: 2.2, totalXPtoL100: 1000000, accentColor: '#f97316', microSkills: ['Ideation','Execution','Sales','Product','Fundraising'] },
    { name: 'Character', exponent: 1.9, totalXPtoL100: 600000,  accentColor: '#6366f1', microSkills: ['Discipline','Mindset','Habits','Resilience'] },
  ];

  function run() {
    if (S.getMacros().length > 0) return; // already seeded

    MACROS.forEach(m => {
      const id = S.uid();
      const macro = {
        id, name: m.name, accentColor: m.accentColor,
        exponent: m.exponent, totalXPtoL100: m.totalXPtoL100,
        currentXP: 0, currentLevel: 0,
        base: m.totalXPtoL100 / Math.pow(100, m.exponent),
        microSkills: m.microSkills.map(msName => {
          const e = m.exponent, t = m.totalXPtoL100 * 0.4;
          return {
            id: S.uid(), parentMacroId: id, name: msName,
            currentXP: 0, currentLevel: 0,
            exponent: e, totalXPtoL100: t,
            base: t / Math.pow(100, e)
          };
        })
      };
      S.upsertMacro(macro);
    });

    // Sample quests
    const macros = S.getMacros();
    const physId = macros.find(m => m.name === 'Physique')?.id;
    const eduId  = macros.find(m => m.name === 'Education')?.id;
    const physMs = physId ? S.getMicroSkills(physId) : [];
    const cardioId = physMs.find(ms => ms.name === 'Cardio')?.id || null;

    if (physId) {
      S.upsertQuest({
        id: S.uid(), name: 'Morning Run', description: 'Run at least 20 minutes every day',
        type: 'habit', status: 'active', isNegativeOnMiss: true, isNegativeOnComplete: false,
        targetSkills: [{ macroSkillId: physId, microSkillId: cardioId, xpAmount: 15 }],
        isCustom: false, scheduledDays: [0, 1, 2, 3, 4, 5, 6], createdAt: Date.now(), completedAt: null,
        streak: 3, lastCompletedDate: null, lastResetDate: null,
        researchLog: null, subTasks: null,
        timedResearch: { enabled: false }
      });
    }

    if (eduId) {
      const eduMs = S.getMicroSkills(eduId);
      const codingId = eduMs.find(ms => ms.name === 'Coding')?.id || null;
      S.upsertQuest({
        id: S.uid(), name: 'Build a Portfolio Project',
        description: 'Ship a complete project from idea to deployed product.',
        type: 'project', status: 'active', isNegativeOnMiss: false, isNegativeOnComplete: false,
        targetSkills: [{ macroSkillId: eduId, microSkillId: codingId, xpAmount: 400 }],
        isCustom: false, createdAt: Date.now(), completedAt: null,
        streak: null, lastCompletedDate: null, lastResetDate: null,
        researchLog: null,
        subTasks: [
          { id: S.uid(), name: 'Pick a project idea', completed: true },
          { id: S.uid(), name: 'Set up repo & tooling', completed: true },
          { id: S.uid(), name: 'Build core features', completed: false },
          { id: S.uid(), name: 'Deploy to production', completed: false },
        ],
        timedResearch: { enabled: false }
      });

      S.upsertQuest({
        id: S.uid(), name: 'Learn System Design',
        description: 'Study system design patterns with timed research sessions.',
        type: 'project', status: 'active', isNegativeOnMiss: false, isNegativeOnComplete: false,
        targetSkills: [{ macroSkillId: eduId, microSkillId: codingId, xpAmount: 300 }],
        isCustom: false, createdAt: Date.now(), completedAt: null,
        streak: null, lastCompletedDate: null, lastResetDate: null,
        researchLog: [],
        subTasks: null,
        timedResearch: { enabled: true, xpPerSecond: 0.05, sessionXPCap: 50, sessions: [] }
      });
    }
  }

  return { run };
})();
