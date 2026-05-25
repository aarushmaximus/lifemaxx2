// LIFEMAXX — Research Hub View
window.LM.views.researchHub = (function () {
  const S = window.LM.store;
  const RT = window.LM.components.researchTimer;
  const N = window.LM.components.notifications;

  let skillFilter = 'all';
  let quillInstance = null;
  let activeQuestForEntry = null;

  function render() {
    const macros = S.getMacros();
    const researchQuests = S.getQuests().filter(q => q.type === 'research');
    const filtered = skillFilter === 'all' ? researchQuests
      : researchQuests.filter(q => q.targetSkills.some(t => t.macroSkillId === skillFilter));

    return `
      <div class="view-container research-hub-view">
        <div class="view-header">
          <h1 class="font-display">RESEARCH HUB</h1>
          <button class="btn btn-primary" onclick="LM.components.questModal.open()">+ Research Quest</button>
        </div>

        <div class="filter-bar">
          <select class="form-input" id="research-skill-filter" style="width:180px">
            <option value="all">All Skills</option>
            ${macros.map(m=>`<option value="${m.id}" ${skillFilter===m.id?'selected':''}>${m.name}</option>`).join('')}
          </select>
        </div>

        <div class="research-grid" id="research-grid">
          ${filtered.length ? filtered.map(q => renderResearchCard(q, macros)).join('')
            : '<div class="empty-state"><p>No research quests yet.</p></div>'}
        </div>

        <!-- Inline Entry Editor -->
        <div id="research-entry-editor" class="research-editor" style="display:none">
          <div class="research-editor-header">
            <h3>Add Research Entry</h3>
            <button class="modal-close" onclick="LM.views.researchHub.closeEditor()">✕</button>
          </div>
          <input id="re-title" class="form-input" type="text" placeholder="Entry title...">
          <div id="re-quill-wrap">
            <div id="re-quill-editor" style="min-height:120px"></div>
          </div>
          <input id="re-tags" class="form-input" type="text" placeholder="Tags (comma separated)...">
          <div class="form-row" style="justify-content:flex-end;gap:8px;margin-top:12px">
            <button class="btn btn-ghost" onclick="LM.views.researchHub.closeEditor()">Cancel</button>
            <button class="btn btn-primary" onclick="LM.views.researchHub.saveEntry()">Save Entry</button>
          </div>
        </div>
      </div>`;
  }

  function renderResearchCard(quest, macros) {
    const skillTags = quest.targetSkills.map(t => {
      const m = macros.find(x=>x.id===t.macroSkillId);
      return m ? `<span class="skill-tag" style="color:${m.accentColor};border-color:${m.accentColor}33">${m.name}</span>` : '';
    }).join('');

    const entries = quest.researchLog || [];
    const sessions = quest.timedResearch?.sessions || [];
    const totalSessionXP = sessions.reduce((s,x)=>s+x.xpEarned,0);

    return `
      <div class="research-card" id="research-card-${quest.id}">
        <div class="research-card-header">
          <div>
            <h3 class="research-card-name">${quest.name}</h3>
            <div class="research-card-meta">${skillTags}</div>
          </div>
          <div class="research-card-stats">
            <span>${entries.length} entries</span>
            ${quest.timedResearch?.enabled ? `<span>${sessions.length} sessions · +${Math.round(totalSessionXP)} XP</span>` : ''}
          </div>
        </div>

        ${RT.renderButton(quest)}

        <div class="research-entries" id="entries-${quest.id}">
          ${entries.map(e => `
            <div class="research-entry-card">
              <div class="re-header">
                <span class="re-title">${e.title}</span>
                <span class="re-date">${new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
              <div class="re-content">${e.content}</div>
              <div class="re-tags">${(e.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
            </div>`).join('')}
        </div>

        <button class="btn btn-ghost btn-sm research-add-btn"
          onclick="LM.views.researchHub.openEditor('${quest.id}')">
          + Add Research Entry
        </button>

        ${quest.status !== 'completed' ? `
          <button class="btn btn-primary btn-sm" style="margin-top:8px"
            onclick="LM.views.researchHub.completeResearch('${quest.id}')">
            Mark Quest Complete
          </button>` : '<span class="quest-done-badge">✓ Complete</span>'}
      </div>`;
  }

  function openEditor(questId) {
    activeQuestForEntry = questId;
    const editor = document.getElementById('research-entry-editor');
    if (!editor) return;
    editor.style.display = 'block';
    document.getElementById('re-title').value = '';
    document.getElementById('re-tags').value = '';

    if (!quillInstance) {
      if (typeof Quill !== 'undefined') {
        quillInstance = new Quill('#re-quill-editor', { theme: 'snow', placeholder: 'Write your research notes here...' });
      }
    } else {
      quillInstance.setContents([]);
    }
    editor.scrollIntoView({ behavior: 'smooth' });
  }

  function closeEditor() {
    const editor = document.getElementById('research-entry-editor');
    if (editor) editor.style.display = 'none';
    activeQuestForEntry = null;
  }

  function saveEntry() {
    if (!activeQuestForEntry) return;
    const quest = S.getQuest(activeQuestForEntry);
    if (!quest) return;

    const title = document.getElementById('re-title')?.value?.trim() || 'Untitled Entry';
    const content = quillInstance ? quillInstance.root.innerHTML : (document.getElementById('re-quill-editor')?.innerText || '');
    const tags = (document.getElementById('re-tags')?.value||'').split(',').map(t=>t.trim()).filter(Boolean);

    quest.researchLog = quest.researchLog || [];
    quest.researchLog.unshift({ id: S.uid(), questId: activeQuestForEntry, title, content, createdAt: Date.now(), tags });
    S.upsertQuest(quest);
    N.show('Research entry saved!', 'success');
    closeEditor();
    // Refresh entries
    const entriesEl = document.getElementById(`entries-${activeQuestForEntry}`);
    if (entriesEl) {
      entriesEl.innerHTML = quest.researchLog.map(e => `
        <div class="research-entry-card">
          <div class="re-header"><span class="re-title">${e.title}</span><span class="re-date">${new Date(e.createdAt).toLocaleDateString()}</span></div>
          <div class="re-content">${e.content}</div>
          <div class="re-tags">${(e.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        </div>`).join('');
    }
  }

  function completeResearch(questId) {
    window.LM.components.wheel.handleDrop(questId);
  }

  function init() {
    document.getElementById('research-skill-filter')?.addEventListener('change', (e) => {
      skillFilter = e.target.value;
      const grid = document.getElementById('research-grid');
      const macros = S.getMacros();
      const researchQuests = S.getQuests().filter(q => q.type === 'research');
      const filtered = skillFilter === 'all' ? researchQuests
        : researchQuests.filter(q => q.targetSkills.some(t => t.macroSkillId === skillFilter));
      if (grid) grid.innerHTML = filtered.length ? filtered.map(q => renderResearchCard(q, macros)).join('') : '<div class="empty-state"><p>No results.</p></div>';
    });
  }

  return { render, init, openEditor, closeEditor, saveEntry, completeResearch };
})();
