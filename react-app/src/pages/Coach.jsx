import React, { useState, useEffect, useRef, useCallback } from 'react';
import { store } from '../lib/store';
import { aiEngine } from '../lib/ai-engine';
import { Menu, Timer, Trash2, Edit, Flag, Link as LinkIcon, AlarmClock, ArrowUp } from 'lucide-react';

import { timerService } from '../lib/timer-service';

function useTimers() {
  const [timers, setTimers] = useState(timerService.timers);
  useEffect(() => {
    return timerService.subscribe(setTimers);
  }, []);
  return {
    timers,
    addTimer: (label, ms) => timerService.addTimer(label, ms),
    deleteTimer: (id) => timerService.deleteTimer(id)
  };
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const AVAILABLE_COMMANDS = [
  { cmd: '/bulkquest', icon: '📋', desc: 'Import quests via syntax (Offline)' },
  { cmd: '/quest', icon: '🚩', desc: 'Generate a single quest' },
  { cmd: '/timer', icon: '⏱', desc: 'Set a countdown timer (no AI call)' },
  { cmd: '/ftimer', icon: '⏰', desc: 'Set a daily recurring notification' },
];

const FLETCHER_SYSTEM_INSTRUCTION =
  `You are Fletcher, an elite, data-obsessed productivity analyst and harsh coach. ` +
  `You have ZERO tolerance for wasted hours or generic motivational speeches. ` +
  `You have full access to the user's past 7 days of log grid data and stats. ` +
  `If the user asks you to analyze a day, a specific cell, or a weekly trend, YOU MUST provide a highly detailed, analytical breakdown of that data. Point out exact hours they slacked off, summarize their logged hours, and demand efficiency. ` +
  `You keep your answers highly analytical, concise (4 sentences max). Never break character.\n` +
  `QUEST CREATION PROTOCOL: The user can ask you to create a regular quest (using /quest) OR a chain quest (using /cquest).\n` +
  `- For /quest: ask for specifics, then set "action" to "propose_quest" and provide "questData": { "title": "...", "description": "...", "xp": 100 }.\n` +
  `- For /cquest: a chain quest is a multi-step project. Ask for specifics, break it down into steps, then set "action" to "propose_chain" and provide "chainData": { "title": "...", "description": "...", "steps": [ { "name": "...", "xp": 50 }, ... ] }.\n` +
  `Once you have concrete details, DO NOT CREATE IT DIRECTLY. You must PROPOSE it to the user. ` +
  `The user will then see a UI card and can either Accept it or ask you to Modify it. ` +
  `If the user asks you to modify a proposed quest/chain, tweak the data and propose it again.\n` +
  `YOU MUST ALWAYS RESPOND IN STRICT JSON FORMAT:\n` +
  `{\n` +
  `  "message": "Your actual chat response to the user",\n` +
  `  "action": null | "propose_quest" | "propose_chain",\n` +
  `  "questData": { ... },\n` +
  `  "chainData": { ... }\n` +
  `}`;

// ── BulkQuest Parser ─────────────────────────────────────────────────────────
function parseBulkQuest(textBlock) {
  const lines = textBlock.split('\n');
  const macros = store.getMacros();
  let currentChain = null;
  let addedCount = 0;
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('>') && !line.startsWith('>>')) {
      let nameStr = line.replace(/^>\s*/, '');

      const typeMatch = nameStr.match(/#(habit|project|boss|chain|research|daily)/i);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'daily';

      const xpMatch = nameStr.match(/\$(\d+)/);
      const xp = xpMatch ? parseInt(xpMatch[1], 10) : 50;

      const timeMatch = nameStr.match(/~(\d{2}:\d{2}-\d{2}:\d{2})/);
      const timeWindow = timeMatch ? timeMatch[1] : null;

      const isNegative = /!negative/i.test(nameStr);

      const skillRegex = /@(\w+)/g;
      let targetSkills = [];
      let match;
      while ((match = skillRegex.exec(nameStr)) !== null) {
        const t = match[1].toLowerCase();
        const macro = macros.find(m => m.name.toLowerCase() === t);
        if (macro) {
          targetSkills.push({ macroSkillId: macro.id, microSkillId: null, xpAmount: xp });
        }
      }

      if (targetSkills.length === 0 && macros.length > 0) {
        targetSkills.push({ macroSkillId: macros[0].id, microSkillId: null, xpAmount: xp });
      }

      let cleanName = nameStr
        .replace(/#\w+/g, '')
        .replace(/\$\d+[xXpP]*/g, '')
        .replace(/~\d{2}:\d{2}-\d{2}:\d{2}/g, '')
        .replace(/!negative/gi, '')
        .replace(/@\w+/g, '')
        .trim();

      if (type === 'chain') {
        currentChain = {
          id: store.uid(),
          name: cleanName,
          macroId: targetSkills.length > 0 ? targetSkills[0].macroSkillId : (macros.length > 0 ? macros[0].id : null),
          steps: [],
          createdAt: Date.now()
        };
        store.upsertChain(currentChain);
        addedCount++;
        results.push(`✓ Chain: "${cleanName}"`);
      } else {
        currentChain = null;
        store.upsertQuest({
          id: store.uid(),
          name: cleanName,
          description: '',
          type: type,
          status: 'active',
          isNegative: isNegative,
          timeWindow: timeWindow,
          targetSkills: targetSkills,
          createdAt: Date.now(),
          isCustom: true
        });
        addedCount++;
        results.push(`✓ Quest: "${cleanName}" [${type}] +${xp}xp`);
      }
    } else if (line.startsWith('>>') && currentChain) {
      let stepStr = line.replace(/^>>\s*/, '').trim();
      const xpMatch = stepStr.match(/\$(\d+)/);
      const stepXp = xpMatch ? parseInt(xpMatch[1], 10) : 50;
      let cleanStep = stepStr.replace(/\$\d+[xXpP]*/g, '').trim();

      currentChain.steps.push({
        id: store.uid(),
        name: cleanStep,
        xpAmount: stepXp,
        completedAt: null
      });
      store.upsertChain(currentChain);
      results.push(`  → Step: "${cleanStep}" +${stepXp}xp`);
    }
  }

  return { addedCount, summary: results.join('\n') || 'No quests parsed.' };
}

// ── Syntax Highlight Builder ─────────────────────────────────────────────────
function buildHighlightHTML(text) {
  const COLORS = [
    'rgba(59,130,246,0.18)',
    'rgba(16,185,129,0.18)',
    'rgba(245,158,11,0.18)',
    'rgba(139,92,246,0.18)',
    'rgba(239,68,68,0.18)',
  ];

  if (text.startsWith('/bulkquest')) {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const lines = escaped.split('\n');
    let res = [];
    let inQuest = false;
    let colorIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      let l = lines[i];
      if (i === 0) {
        res.push(`<span style="background:rgba(255,255,255,0.1);display:inline-block;width:100%;border-radius:4px;">${l || ' '}</span>`);
        continue;
      }
      const trimmed = l.trim();
      if (trimmed.startsWith('&gt;') && !trimmed.startsWith('&gt;&gt;')) {
        if (inQuest) {
          res.push(`</span>`);
          colorIdx = (colorIdx + 1) % COLORS.length;
        }
        inQuest = true;
        res.push(`<span style="background:${COLORS[colorIdx]};display:inline-block;width:100%;border-radius:4px;">${l || ' '}`);
      } else if (trimmed === '' && inQuest) {
        res.push((l || ' ') + `</span>`);
        inQuest = false;
        colorIdx = (colorIdx + 1) % COLORS.length;
      } else {
        res.push(l || ' ');
      }
    }
    if (inQuest) res.push(`</span>`);
    return res.join('\n') + (text.endsWith('\n') ? '<br>' : '');
  }

  return '';
}

export default function Coach() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [macros, setMacros] = useState(() => store.getMacros());

  // Popup state
  const [showCommandPopup, setShowCommandPopup] = useState(false);
  const [showMacroPopup, setShowMacroPopup] = useState(false);
  const [macroSearch, setMacroSearch] = useState('');
  const [isCommandMode, setIsCommandMode] = useState(false); // green border

  const textareaRef = useRef(null);
  const backdropRef = useRef(null);
  const scrollRef = useRef(null);
  const inputTextRef = useRef(inputText);
  useEffect(() => { inputTextRef.current = inputText; }, [inputText]);

  const { timers, addTimer, deleteTimer } = useTimers();

  useEffect(() => {
    const update = () => {
      setChats(store.getCoachChats() || []);
      setMacros(store.getMacros());
    };
    update();
    store.on('change', update);
    return () => store.off('change', update);
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages]);

  // ── Input handling ────────────────────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInputText(val);

    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }

    // Sync backdrop scroll
    if (backdropRef.current && ta) {
      backdropRef.current.scrollTop = ta.scrollTop;
    }

    // Update backdrop HTML
    if (backdropRef.current) {
      if (val.startsWith('/bulkquest')) {
        backdropRef.current.innerHTML = buildHighlightHTML(val);
      } else {
        backdropRef.current.innerHTML = '';
      }
    }

    // Command popup: show when typing "/" and no space/newline yet
    if (val === '/' || (val.startsWith('/') && !val.includes(' ') && !val.includes('\n'))) {
      setShowCommandPopup(true);
    } else {
      setShowCommandPopup(false);
    }

    // Green border for any command mode
    setIsCommandMode(val.startsWith('/'));

    // Macro popup: show when typing "@something" at end
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && !val.substring(lastAt).includes(' ') && !val.substring(lastAt).includes('\n')) {
      setMacroSearch(val.substring(lastAt + 1).toLowerCase());
      setShowMacroPopup(true);
    } else {
      setShowMacroPopup(false);
      setMacroSearch('');
    }
  }, []);

  const handleScroll = useCallback((e) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.target.scrollTop;
    }
  }, []);

  // ── Insert command into input ─────────────────────────────────────────────
  const insertCommand = useCallback((cmd) => {
    setInputText(cmd);
    setShowCommandPopup(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        // Update backdrop for bulkquest template
        if (backdropRef.current) {
          backdropRef.current.innerHTML = buildHighlightHTML(cmd);
        }
        setIsCommandMode(cmd.startsWith('/'));
      }
    }, 0);
  }, []);

  // ── Insert macro at cursor ────────────────────────────────────────────────
  const insertMacro = useCallback((name) => {
    const val = inputTextRef.current;
    const lastAt = val.lastIndexOf('@');
    let newVal;
    if (lastAt >= 0) {
      newVal = val.substring(0, lastAt) + '@' + name.toLowerCase() + ' ';
    } else {
      newVal = val + '@' + name.toLowerCase() + ' ';
    }
    setInputText(newVal);
    setShowMacroPopup(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (backdropRef.current) {
          backdropRef.current.innerHTML = buildHighlightHTML(newVal);
        }
      }
    }, 0);
  }, []);

  // ── Store helpers ─────────────────────────────────────────────────────────
  const pushMessage = useCallback((chatId, msg) => {
    const currentChats = store.getCoachChats() || [];
    let chat = currentChats.find(c => c.id === chatId);
    if (!chat) {
      chat = { id: chatId, title: 'New Conversation', createdAt: Date.now(), messages: [] };
    }
    chat.messages.push({ ...msg, timestamp: Date.now() });
    if (msg.sender === 'user' && chat.messages.filter(m => m.sender === 'user').length === 1 && chat.title === 'New Conversation') {
      const text = (msg.text || '').replace(/<[^>]+>/g, '');
      chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
    }
    store.upsertCoachChat(chat);
    setChats(store.getCoachChats() || []);
  }, []);

  const removeLoadingMessage = useCallback((chatId) => {
    const chat = store.getCoachChat(chatId);
    if (chat) {
      chat.messages = chat.messages.filter(m => !m.isLoading);
      store.upsertCoachChat(chat);
      setChats(store.getCoachChats() || []);
    }
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (text) => {
    const plainText = text.trim();
    if (!plainText) return;

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = uid();
      setActiveChatId(currentChatId);
    }

    // /bulkquest command - offline parser
    if (plainText.toLowerCase().startsWith('/bulkquest')) {
      pushMessage(currentChatId, { sender: 'user', text: plainText });
      const textBlock = plainText.substring('/bulkquest'.length).trim();
      const { addedCount, summary } = parseBulkQuest(textBlock);
      pushMessage(currentChatId, {
        sender: 'fletcher',
        text: `Successfully parsed and created ${addedCount} main quests/chains.\n\n${summary}`
      });
      return;
    }

    // /timer command
    if (plainText.toLowerCase() === '/timer') {
      pushMessage(currentChatId, { sender: 'fletcher', text: 'How long should the timer run? Use the picker below.' });
      pushMessage(currentChatId, { sender: 'timer_setter', text: '' });
      return;
    }

    // /ftimer command
    if (plainText.toLowerCase() === '/ftimer') {
      pushMessage(currentChatId, { sender: 'fletcher', text: 'When should I remind you every day?' });
      pushMessage(currentChatId, { sender: 'ftimer_setter', text: '' });
      return;
    }

    pushMessage(currentChatId, { sender: 'user', text: plainText });
    pushMessage(currentChatId, { sender: 'system', text: 'Analyzing data...', isLoading: true });

    const todayStr = new Date().toDateString();
    const stats = store.getStatistics();

    let logsCtx = '';
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dailyLog = store.getDailyLog(dateStr);
      const cells = dailyLog.cells || Array(24).fill({ status: null, note: '' });
      const dayLogStr = cells.map((c, idx) => `H${idx}:${c.status || 'E'}${c.note ? '(' + c.note + ')' : ''}`).join(', ');
      logsCtx += `${dateStr}: [ ${dayLogStr} ]\n`;
    }

    const statsCtx = stats.map(s => {
      const sLogs = store.getStatLogs().filter(l => l.statId === s.id && l.dateStr === todayStr);
      sLogs.sort((a, b) => b.timestamp - a.timestamp);
      const val = sLogs.length ? sLogs[0].value : 0;
      return `${s.name}: ${val}/${s.goalValue} ${s.unit || ''}`;
    }).join('\n');

    const chat = store.getCoachChat(currentChatId);
    const contextMessages = (chat?.messages || []).slice(-10).filter(m => m.sender !== 'system');
    const conversationContext = contextMessages.map(m => {
      if (m.sender === 'fletcher_proposal') {
        const data = m.chainData ? m.chainData : m.questData;
        return `Fletcher (Proposed ${m.chainData ? 'Chain' : 'Quest'}): ${JSON.stringify(data)}`;
      }
      return `${m.sender === 'user' ? 'User' : 'Fletcher'}: ${(m.text || '').replace(/<[^>]+>/g, '')}`;
    }).join('\n');

    const prompt =
      `USER'S LAST 7 DAYS OF LOGS (H0-H23, E=Empty):\n${logsCtx}\n` +
      `USER'S STATISTIC PROGRESS TODAY (${todayStr}):\n${statsCtx || 'No stats tracked today.'}\n\n` +
      `CONVERSATION HISTORY:\n${conversationContext}\n\n` +
      `Respond directly to the user's latest message based on this data. Output JSON format as specified in instructions.`;

    const response = await aiEngine.generateContent(prompt, FLETCHER_SYSTEM_INSTRUCTION);
    removeLoadingMessage(currentChatId);

    if (response.error) {
      pushMessage(currentChatId, { sender: 'fletcher', text: `API Error: ${response.error}` });
    } else {
      try {
        let respText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!respText) throw new Error('Empty content in API response.');
        respText = respText.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(respText);

        if (parsed.message) {
          pushMessage(currentChatId, { sender: 'fletcher', text: parsed.message });
        }
        if (parsed.action === 'propose_quest' && parsed.questData) {
          pushMessage(currentChatId, { sender: 'fletcher_proposal', text: '', questData: parsed.questData });
        } else if (parsed.action === 'propose_chain' && parsed.chainData) {
          pushMessage(currentChatId, { sender: 'fletcher_proposal', text: '', chainData: parsed.chainData });
        }
      } catch (e) {
        pushMessage(currentChatId, { sender: 'fletcher', text: 'Data corrupted. Stop making excuses and fix the JSON parsing error.' });
      }
    }
  }, [activeChatId, pushMessage, removeLoadingMessage]);

  const handleSend = useCallback(() => {
    const text = inputTextRef.current;
    if (!text.trim()) return;
    setInputText('');
    setShowCommandPopup(false);
    setShowMacroPopup(false);
    setIsCommandMode(false);
    if (backdropRef.current) backdropRef.current.innerHTML = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    handleSendMessage(text);
  }, [handleSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape closes popups
    if (e.key === 'Escape') {
      setShowCommandPopup(false);
      setShowMacroPopup(false);
    }
  }, [handleSend]);

  // ── Timer & Proposal actions ──────────────────────────────────────────────
  const startTimer = useCallback((h, m, s, label, msgIndex) => {
    const totalMs = (h * 3600 + m * 60 + s) * 1000;
    if (!(totalMs > 0)) return;
    addTimer(label, totalMs);
    setIsTimerPanelOpen(true);
    const chat = store.getCoachChat(activeChatId);
    if (chat && chat.messages[msgIndex]) {
      chat.messages[msgIndex] = { sender: 'fletcher', text: `Timer set: "${label}". Clock is ticking. Don't waste it.`, timestamp: Date.now() };
      store.upsertCoachChat(chat);
      setChats(store.getCoachChats() || []);
    }
  }, [activeChatId, addTimer]);

  const setFixedTimer = useCallback((timeVal, label, msgIndex) => {
    if (!timeVal) return;
    const st = store.getSettings();
    st.fixedTimers = st.fixedTimers || [];
    st.fixedTimers.push({ id: uid(), timeStr: timeVal, label, enabled: true });
    store.saveSettings(st);
    const chat = store.getCoachChat(activeChatId);
    if (chat && chat.messages[msgIndex]) {
      chat.messages[msgIndex] = { sender: 'fletcher', text: `Daily fixed timer set: "${label}" at ${timeVal}. I'll remind you every day.`, timestamp: Date.now() };
      store.upsertCoachChat(chat);
      setChats(store.getCoachChats() || []);
    }
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }, [activeChatId]);

  const handleProposalAction = useCallback((action, msgIndex) => {
    const chat = store.getCoachChat(activeChatId);
    if (!chat) return;
    const msg = chat.messages[msgIndex];
    if (action === 'accept') {
      const isChain = !!msg.chainData;
      const allMacros = store.getMacros();
      let macroId = allMacros[0]?.id || 'overall';
      if (isChain) {
        const newChain = {
          id: uid(),
          name: msg.chainData.title,
          description: msg.chainData.description,
          macroId: macroId,
          status: 'active',
          createdAt: Date.now(),
          steps: (msg.chainData.steps || []).map(s => ({
            id: uid(),
            name: s.name,
            targetSkills: [{ macroSkillId: macroId, microSkillId: null, xpAmount: s.xp || 50 }]
          }))
        };
        store.upsertChain(newChain);
      } else {
        store.upsertQuest({
          id: uid(),
          name: msg.questData.title,
          description: msg.questData.description,
          status: 'active',
          scheduledDate: new Date().toDateString(),
          createdAt: Date.now(),
          targetSkills: [{ macroSkillId: macroId, microSkillId: null, xpAmount: msg.questData.xp || 100 }]
        });
      }
      msg.accepted = true;
      store.upsertCoachChat(chat);
      setChats(store.getCoachChats() || []);
      pushMessage(activeChatId, { sender: 'system', text: 'Added to your Dashboard.' });
    } else {
      const title = msg.chainData ? msg.chainData.title : msg.questData?.title;
      setInputText(`Please modify the proposed ${msg.chainData ? 'chain' : 'quest'}: "${title}". Change it so that: `);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [activeChatId, pushMessage]);

  // ── Filtered macros for popup ─────────────────────────────────────────────
  const filteredMacros = macros.filter(m => m && m.name && m.name.toLowerCase().includes(macroSearch));

  // ── Container border style ────────────────────────────────────────────────
  const containerStyle = isCommandMode
    ? { background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.3)' }
    : { background: '#121212', borderColor: '#1a1a1a' };

  return (
    <div className="absolute inset-0 flex bg-black z-20">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#050505] border-r border-[#121212] flex flex-col transition-transform duration-250 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-3 border-b border-[#121212]">
          <button
            onClick={() => { setActiveChatId(null); setIsSidebarOpen(false); }}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#e8e8e8] text-black font-bold text-[13px] tracking-wide uppercase"
          >
            <Edit size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 ? (
            <div className="text-xs text-[#7a7a85] p-4 text-center">No conversations yet.</div>
          ) : (
            chats.sort((a, b) => b.createdAt - a.createdAt).map(c => (
              <div
                key={c.id}
                onClick={() => { setActiveChatId(c.id); setIsSidebarOpen(false); }}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${activeChatId === c.id ? 'bg-[#1a1a1a]' : 'hover:bg-[#121212]'}`}
              >
                <span className="text-[13px] font-medium text-[#e8e8f0] truncate max-w-[160px]">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete?')) {
                      store.deleteCoachChat(c.id);
                      setChats(store.getCoachChats() || []);
                      if (activeChatId === c.id) setActiveChatId(null);
                    }
                  }}
                  className="text-[#ef4444] opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 h-14 bg-black border-b border-[#121212] shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-1 text-[#e8e8f0]">
            <Menu size={24} />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#121212] border border-[#1a1a1a] flex items-center justify-center font-bold text-[13px] text-[#e8e8f0]">F</div>
          <span className="text-sm font-semibold text-[#e8e8f0] flex-1">Coach Fletcher</span>
          <button
            onClick={() => setIsTimerPanelOpen(!isTimerPanelOpen)}
            className="relative p-1 text-[#7a7a85] hover:text-[#e8e8e8] transition-colors"
          >
            <Timer size={22} />
            {timers.filter(t => !t.done).length > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#e8e8e8] text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                {timers.filter(t => !t.done).length}
              </span>
            )}
          </button>
        </header>

        {/* Timer Panel */}
        {isTimerPanelOpen && timers.length > 0 && (
          <div className="flex gap-4 p-3 overflow-x-auto border-b border-[#121212] bg-[#050505]">
            {timers.map(t => {
              const remaining = Math.max(0, t.endsAt - Date.now());
              const pct = t.done ? 100 : Math.min(100, ((t.durationMs - remaining) / t.durationMs) * 100);
              const color = t.done ? '#10b981' : '#e8e8e8';
              const m = Math.floor(remaining / 60000);
              const s = Math.floor((remaining % 60000) / 1000);
              const timeText = t.done ? 'DONE' : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

              return (
                <div key={t.id} className="flex flex-col items-center gap-1 group relative flex-shrink-0">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90 absolute top-0 left-0">
                      <circle cx="24" cy="24" r="18" fill="none" stroke="#1a1a1a" strokeWidth="2" />
                      <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="2"
                        strokeDasharray={2 * Math.PI * 18} strokeDashoffset={(2 * Math.PI * 18) * (1 - pct / 100)} strokeLinecap="round"
                        className="transition-all duration-1000 ease-linear" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold font-mono tracking-tighter" style={{ color }}>{timeText}</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-[#7a7a85] max-w-[48px] text-center truncate">{t.label}</div>
                  <button onClick={() => deleteTimer(t.id)} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-[#ef4444] text-white rounded-full p-0.5 transition-opacity">
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
          {!activeChat ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full border border-[#1a1a1a] bg-[#121212] flex items-center justify-center mb-3">
                <span className="text-xl font-bold text-[#e8e8f0]">F</span>
              </div>
              <h2 className="text-base font-semibold text-[#e8e8f0] mb-1">Coach Fletcher</h2>
              <p className="text-[13px] text-[#7a7a85] mb-6">What do you need today?</p>
              <div className="flex flex-col gap-2 w-full">
                <button onClick={() => handleSendMessage('Analyze my logging for today')} className="flex items-center gap-3 p-3 rounded-xl border border-[#1a1a1a] bg-[#121212] hover:bg-[#1a1a1a] transition-colors text-left w-full">
                  <span className="text-[13px] font-medium text-[#e8e8f0] flex-1">Analyze my logging for today</span>
                </button>
                <button onClick={() => handleSendMessage('Review my performance this week')} className="flex items-center gap-3 p-3 rounded-xl border border-[#1a1a1a] bg-[#121212] hover:bg-[#1a1a1a] transition-colors text-left w-full">
                  <span className="text-[13px] font-medium text-[#e8e8f0] flex-1">Review my performance this week</span>
                </button>
                <button onClick={() => insertCommand('/bulkquest\n> My Quest @macro #habit $50\n')} className="flex items-center gap-3 p-3 rounded-xl border border-[#1a1a1a] bg-[#121212] hover:bg-[#1a1a1a] transition-colors text-left w-full">
                  <span className="text-[13px] font-medium text-[#e8e8f0] flex-1">Import quests with /bulkquest</span>
                </button>
              </div>
            </div>
          ) : (
            activeChat.messages.map((m, idx) => (
              <ChatMessage
                key={idx}
                msg={m}
                index={idx}
                onStartTimer={(h, min, s, l) => startTimer(h, min, s, l, idx)}
                onSetFixedTimer={(t, l) => setFixedTimer(t, l, idx)}
                onProposalAction={handleProposalAction}
              />
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 bg-black border-t border-[#121212] relative">
          {/* Macro Autocomplete Popup */}
          {showMacroPopup && filteredMacros.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#121212] border border-[#1a1a1a] rounded-xl p-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] max-h-48 overflow-y-auto">
              {filteredMacros.map(m => (
                <button
                  key={m.id}
                  onClick={() => insertMacro(m.name)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: m.accentColor || '#fff' }} />
                  <span className="text-[13px] font-semibold text-white">@{m.name.toLowerCase()}</span>
                </button>
              ))}
            </div>
          )}

          {/* Command Popup */}
          {showCommandPopup && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#121212] border border-[#1a1a1a] rounded-xl p-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
              {AVAILABLE_COMMANDS.map(cmd => (
                <button
                  key={cmd.cmd}
                  onClick={() => insertCommand(cmd.cmd === '/bulkquest' ? '/bulkquest\n> My Quest @macro #habit $50\n' : cmd.cmd + ' ')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
                >
                  <span className="text-lg w-6 flex-shrink-0">{cmd.icon}</span>
                  <div>
                    <div className="text-[13px] font-semibold text-white">{cmd.cmd}</div>
                    <div className="text-[11px] text-[#7a7a85] mt-0.5">{cmd.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Input container with backdrop */}
          <div
            className="flex items-end gap-2 rounded-[16px] p-1.5 relative border transition-colors duration-200"
            style={containerStyle}
          >
            <div className="flex-1 relative">
              {/* Syntax highlight backdrop */}
              <div
                ref={backdropRef}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  fontSize: '14px',
                  lineHeight: '1.5',
                  padding: '10px',
                  fontFamily: 'inherit',
                  color: 'transparent',
                  pointerEvents: 'none',
                  whiteSpace: 'pre-wrap',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  zIndex: 1,
                }}
              />
              {/* Actual textarea */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                rows={1}
                placeholder="Message Fletcher..."
                style={{
                  position: 'relative',
                  zIndex: 2,
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '14px',
                  color: '#e8e8f0',
                  maxHeight: '120px',
                  minHeight: '44px',
                  lineHeight: '1.5',
                  padding: '10px',
                  fontFamily: 'inherit',
                  margin: 0,
                  wordBreak: 'break-word',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="w-[34px] h-[34px] shrink-0 rounded-full bg-white flex items-center justify-center disabled:opacity-50 transition-opacity mb-1 mr-1"
            >
              <ArrowUp size={18} color="#000" />
            </button>
          </div>

          {/* Syntax hint for bulkquest */}
          {inputText.startsWith('/bulkquest') && (
            <div className="mt-2 px-2 text-[11px] text-[#555] leading-relaxed">
              <span className="text-[#7a7a85]">Syntax: </span>
              <code className="text-[#888]">&gt;Quest @skill #type $xp</code>
              <span className="mx-1 text-[#555]">|</span>
              <code className="text-[#888]">&gt;&gt;Step $xp</code>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── ChatMessage component ──────────────────────────────────────────────────
function ChatMessage({ msg, index, onStartTimer, onSetFixedTimer, onProposalAction }) {
  if (msg.sender === 'system') {
    return (
      <div className={`text-center font-mono text-xs text-[#7c3aed]/50 my-4 tracking-widest ${msg.isLoading ? 'animate-pulse' : ''}`}>
        {msg.text}
      </div>
    );
  }

  if (msg.sender === 'timer_setter') {
    return <TimerSetterCard onStart={onStartTimer} />;
  }

  if (msg.sender === 'ftimer_setter') {
    return <FTimerSetterCard onStart={onSetFixedTimer} />;
  }

  if (msg.sender === 'fletcher_proposal') {
    return <ProposalCard msg={msg} index={index} onAction={onProposalAction} />;
  }

  const isUser = msg.sender === 'user';
  // Format newlines
  const formattedText = (msg.text || '').replace(/\n/g, '<br>');

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full shrink-0 bg-[#121212] border border-[#1a1a1a] flex items-center justify-center font-bold text-sm text-[#e8e8f0] mb-1">
            F
          </div>
        )}
        <div className={`rounded-2xl px-5 py-4 shadow-md ${isUser
          ? 'bg-gradient-to-br from-[#d0d0d0] to-[#ffffff] text-black rounded-br-sm'
          : 'bg-[#121212] border border-[#1a1a1a] text-[#e8e8f0] rounded-bl-sm'
        }`}>
          <div
            className="font-medium tracking-wide leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
          <span className={`text-[10px] mt-2 block ${isUser ? 'text-black/60' : 'text-[#7a7a85]'}`}>
            {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── TimerSetterCard ────────────────────────────────────────────────────────
function TimerSetterCard({ onStart }) {
  const [h, setH] = useState(0);
  const [m, setM] = useState(25);
  const [s, setS] = useState(0);
  const [label, setLabel] = useState('Focus');

  const presets = [
    ['5m', 0, 5, 0], ['10m', 0, 10, 0], ['15m', 0, 15, 0],
    ['25m', 0, 25, 0], ['45m', 0, 45, 0], ['1h', 1, 0, 0]
  ];

  return (
    <div className="flex justify-start w-full">
      <div className="flex items-end gap-3 w-full max-w-[340px]">
        <div className="w-8 h-8 rounded-full shrink-0 bg-[#121212] border border-[#1a1a1a] flex items-center justify-center font-bold text-sm text-[#e8e8f0] mb-1">F</div>
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-[18px] rounded-bl-sm p-4 w-full">
          <div className="text-[11px] font-bold tracking-[.1em] text-[#7a7a85] mb-3 uppercase">⏱ Set Timer</div>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Label" className="w-full bg-[#121212] border border-[#222] rounded-lg px-3 py-2 text-[13px] text-[#e8e8f0] outline-none mb-3" />
          <div className="flex gap-2 mb-3 items-center">
            <TimeInput label="HH" max={23} val={h} set={setH} />
            <span className="text-[#444] pt-3">:</span>
            <TimeInput label="MM" max={59} val={m} set={setM} />
            <span className="text-[#444] pt-3">:</span>
            <TimeInput label="SS" max={59} val={s} set={setS} />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {presets.map(([lbl, ph, pm, ps]) => (
              <button
                key={lbl}
                onClick={() => { setH(ph); setM(pm); setS(ps); setLabel(lbl + ' Focus'); }}
                className="px-2.5 py-1 rounded-full border border-[#222] bg-[#121212] text-[#aaa] text-[11px] font-semibold hover:border-[#e8e8e8] hover:text-[#e8e8e8] transition-colors"
              >
                {lbl}
              </button>
            ))}
          </div>
          <button onClick={() => onStart(h, m, s, label)} className="w-full p-2.5 rounded-lg bg-[#e8e8e8] text-black font-bold text-[13px] hover:opacity-90 transition-opacity">START TIMER</button>
        </div>
      </div>
    </div>
  );
}

// ── FTimerSetterCard ──────────────────────────────────────────────────────
function FTimerSetterCard({ onStart }) {
  const [time, setTime] = useState('08:00');
  const [label, setLabel] = useState('Reminder');

  return (
    <div className="flex justify-start w-full">
      <div className="flex items-end gap-3 w-full max-w-[340px]">
        <div className="w-8 h-8 rounded-full shrink-0 bg-[#121212] border border-[#1a1a1a] flex items-center justify-center font-bold text-sm text-[#e8e8f0] mb-1">F</div>
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] rounded-[18px] rounded-bl-sm p-4 w-full">
          <div className="text-[11px] font-bold tracking-[.1em] text-[#7a7a85] mb-3 uppercase">⏰ Set Daily Timer</div>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Label" className="w-full bg-[#121212] border border-[#222] rounded-lg px-3 py-2 text-[13px] text-[#e8e8f0] outline-none mb-3" />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-[#121212] border border-[#222] rounded-lg p-2 text-lg font-bold text-[#e8e8f0] text-center outline-none mb-3" />
          <button onClick={() => onStart(time, label)} className="w-full p-2.5 rounded-lg bg-[#e8e8e8] text-black font-bold text-[13px] hover:opacity-90 transition-opacity">SET DAILY TIMER</button>
        </div>
      </div>
    </div>
  );
}

// ── TimeInput ─────────────────────────────────────────────────────────────
function TimeInput({ label, max, val, set }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <span className="text-[10px] text-[#555] mb-1">{label}</span>
      <input type="number" min="0" max={max} value={val} onChange={e => set(Number(e.target.value))} className="w-full bg-[#121212] border border-[#222] rounded-lg p-2 text-lg font-bold text-[#e8e8f0] text-center outline-none" />
    </div>
  );
}

// ── ProposalCard ──────────────────────────────────────────────────────────
function ProposalCard({ msg, index, onAction }) {
  const isChain = !!msg.chainData;
  const q = msg.chainData || msg.questData;
  return (
    <div className="flex justify-start w-full">
      <div className="flex items-end gap-3 w-full max-w-sm">
        <div className="w-8 h-8 rounded-full shrink-0 bg-[#121212] border border-[#1a1a1a] flex items-center justify-center font-bold text-sm text-[#e8e8f0] mb-1">F</div>
        <div className="bg-[#121212] border border-[#1a1a1a] rounded-[16px] rounded-bl-sm p-4 w-full shadow-md">
          <div className="text-[10px] font-bold text-[#e8e8e8] mb-2 flex items-center gap-1 tracking-widest uppercase">
            {isChain ? <LinkIcon size={12} /> : <Flag size={12} />} PROPOSED {isChain ? 'CHAIN' : 'QUEST'}
          </div>
          <div className="text-base font-bold text-[#e8e8f0] mb-1">{q.title}</div>
          <div className="text-[13px] text-[#7a7a85] mb-3">{q.description}</div>
          {isChain && q.steps && (
            <div className="mt-2 mb-3 space-y-1">
              {q.steps.map((s, idx) => (
                <div key={idx} className="text-xs text-[#a0a0a8] flex justify-between bg-[#1a1a1a] p-1.5 rounded border border-[#2a2a2a]">
                  <span className="truncate pr-2">{idx + 1}. {s.name}</span>
                  <span className="text-[#7c3aed] whitespace-nowrap">+{s.xp} XP</span>
                </div>
              ))}
            </div>
          )}
          {!isChain && (
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#1a1a1a] text-[#e8e8e8] px-2 py-1 rounded text-xs font-bold border border-[#2a2a2a]">+{q.xp} XP</span>
            </div>
          )}

          {msg.accepted ? (
            <div className="text-center font-bold text-xs text-[#7c3aed]/70 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl uppercase">
              {isChain ? 'CHAIN' : 'QUEST'} ACCEPTED
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <button onClick={() => onAction('modify', index)} className="flex-1 py-2 rounded-xl bg-transparent border border-[#2a2a2a] text-[#e8e8f0] font-bold text-xs hover:bg-[#1a1a1a] transition-colors">MODIFY</button>
              <button onClick={() => onAction('accept', index)} className="flex-1 py-2 rounded-xl bg-[#7c3aed] text-white font-bold text-xs hover:opacity-90 transition-opacity">ACCEPT</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
