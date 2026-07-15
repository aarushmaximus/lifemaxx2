import React, { useState, useEffect, useRef } from 'react';
import { store } from '../lib/store';
import { marked } from 'marked';
import ForceGraph2D from 'react-force-graph-2d';

// Custom marked renderer for Wiki-links [[Link]]
const renderer = new marked.Renderer();
const originalText = renderer.text.bind(renderer);
renderer.text = (text) => {
  let modifiedText = text.text; // Ensure we get the string
  if (typeof text === 'string') modifiedText = text;
  else if (text.text) modifiedText = text.text;
  
  if (typeof modifiedText === 'string') {
    modifiedText = modifiedText.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
      return `<a href="#note/${encodeURIComponent(p1)}" class="text-[#00E5FF] hover:underline cursor-pointer" data-wikilink="${p1}">${p1}</a>`;
    });
  }
  return modifiedText;
};
marked.setOptions({ renderer });

export default function Codex() {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [macros, setMacros] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentNote, setCurrentNote] = useState({ title: '', content: '' });

  useEffect(() => {
    const update = () => {
      setNotes(store.getNotes() || []);
      setMacros(store.getMacros() || []);
    };
    update();
    store.on('change', update);
    
    // Hash routing for wiki links
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#note/')) {
        const title = decodeURIComponent(hash.replace('#note/', ''));
        openNoteByTitle(title);
        // Clear hash so it can be clicked again
        window.location.hash = '';
      }
    };
    window.addEventListener('hashchange', handleHash);
    
    return () => {
      store.off('change', update);
      window.removeEventListener('hashchange', handleHash);
    };
  }, []);

  const openNoteByTitle = (title) => {
    const allNotes = store.getNotes() || [];
    let note = allNotes.find(n => n.title.toLowerCase() === title.toLowerCase());
    
    // Check if it's a macro
    const allMacros = store.getMacros() || [];
    const macro = allMacros.find(m => m.name.toLowerCase() === title.toLowerCase());
    
    if (macro) {
      window.location.hash = `#skill-hub`; // Navigate to skill hub
      return;
    }

    if (!note) {
      // Create new note
      note = {
        id: store.uid(),
        title: title,
        content: `# ${title}\n\nStart typing...`
      };
      store.upsertNote(note);
    }
    
    setShowGraph(false);
    setActiveNoteId(note.id);
    setCurrentNote({ title: note.title, content: note.content });
    setIsEditing(true);
  };

  const handleSelectNote = (note) => {
    setShowGraph(false);
    setActiveNoteId(note.id);
    setCurrentNote({ title: note.title, content: note.content });
    setIsEditing(false);
  };

  const handleCreateNote = () => {
    const id = store.uid();
    const note = {
      id,
      title: 'Untitled Note',
      content: ''
    };
    store.upsertNote(note);
    setActiveNoteId(id);
    setCurrentNote(note);
    setIsEditing(true);
    setShowGraph(false);
  };

  const handleSave = () => {
    if (!activeNoteId) return;
    store.upsertNote({
      id: activeNoteId,
      title: currentNote.title || 'Untitled Note',
      content: currentNote.content
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this note?")) {
      store.deleteNote(activeNoteId);
      setActiveNoteId(null);
    }
  };

  // Backlinks
  const getBacklinks = (title) => {
    if (!title) return [];
    return notes.filter(n => n.id !== activeNoteId && n.content.includes(`[[${title}]]`));
  };

  const backlinks = activeNoteId ? getBacklinks(currentNote.title) : [];
  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // Graph Data
  const getGraphData = () => {
    const nodes = [];
    const links = [];
    const nodeMap = new Set();

    notes.forEach(n => {
      nodes.push({ id: n.id, name: n.title, group: 'note', val: 2 });
      nodeMap.add(n.title.toLowerCase());
    });

    macros.forEach(m => {
      nodes.push({ id: m.id, name: m.name, group: 'macro', val: 5, color: m.accentColor });
      nodeMap.add(m.name.toLowerCase());
    });

    notes.forEach(n => {
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(n.content)) !== null) {
        const targetTitle = match[1].toLowerCase();
        let targetNode = nodes.find(node => node.name.toLowerCase() === targetTitle);
        
        if (targetNode) {
          links.push({ source: n.id, target: targetNode.id });
        } else {
          // Create ghost node
          const ghostId = store.uid();
          nodes.push({ id: ghostId, name: match[1], group: 'ghost', val: 1 });
          links.push({ source: n.id, target: ghostId });
        }
      }
    });

    return { nodes, links };
  };

  return (
    <div className="flex h-full text-[#e8e8f0] bg-black">
      {/* Sidebar */}
      <div className={`${(activeNoteId || showGraph) ? 'hidden md:flex' : 'flex'} w-full md:w-64 border-r border-[#1a1a1a] flex-col bg-[#050505]`}>
        <div className="p-4 border-b border-[#1a1a1a]">
          <h2 className="text-lg font-bold tracking-widest font-display mb-4">CODEX</h2>
          <button 
            onClick={handleCreateNote}
            className="w-full py-2 bg-[#00E5FF] text-black font-bold rounded-lg mb-2 text-sm hover:brightness-110 transition"
          >
            + New Note
          </button>
          <button 
            onClick={() => setShowGraph(true)}
            className="w-full py-2 bg-transparent border border-[#2a2a2a] text-gray-300 font-bold rounded-lg text-sm hover:bg-[#1a1a1a] transition flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">hub</span> Graph View
          </button>
        </div>
        
        <div className="p-2 border-b border-[#1a1a1a]">
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#121212] border border-[#222] rounded px-3 py-1.5 text-sm outline-none focus:border-[#00E5FF]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleSelectNote(n)}
              className={`p-2 rounded cursor-pointer text-sm truncate ${activeNoteId === n.id && !showGraph ? 'bg-[#1a1a1a] text-[#00E5FF] font-medium' : 'text-gray-400 hover:bg-[#121212] hover:text-gray-200'}`}
            >
              {n.title}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={`${!(activeNoteId || showGraph) ? 'hidden md:flex' : 'flex'} flex-1 flex-col relative overflow-hidden`}>
        {showGraph ? (
          <div className="w-full h-full relative flex flex-col">
            <button 
              onClick={() => setShowGraph(false)}
              className="md:hidden absolute top-4 right-4 z-10 px-3 py-1.5 bg-[#1a1a1a] text-white rounded text-sm shadow"
            >
              Close
            </button>
            <ForceGraph2D
              graphData={getGraphData()}
              nodeLabel="name"
              nodeColor={node => {
                if (node.group === 'macro') return node.color || '#ff00ff';
                if (node.group === 'ghost') return '#555555';
                return '#00E5FF';
              }}
              linkColor={() => 'rgba(255,255,255,0.2)'}
              backgroundColor="#000000"
              onNodeClick={node => {
                openNoteByTitle(node.name);
              }}
            />
            <div className="absolute top-4 left-4 text-gray-500 text-xs pointer-events-none">
              Scroll to zoom, drag to pan. Click nodes to open.
            </div>
          </div>
        ) : activeNoteId ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
            <button 
              onClick={() => { setActiveNoteId(null); setShowGraph(false); }}
              className="md:hidden flex items-center gap-1 text-gray-400 mb-6 hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back
            </button>
            
            <div className="flex justify-between items-start mb-6">
              {isEditing ? (
                <input 
                  type="text" 
                  value={currentNote.title} 
                  onChange={e => setCurrentNote({...currentNote, title: e.target.value})}
                  className="text-4xl font-bold bg-transparent outline-none border-b border-[#333] focus:border-[#00E5FF] w-full mr-4"
                  placeholder="Note Title"
                />
              ) : (
                <h1 className="text-4xl font-bold text-white">{currentNote.title}</h1>
              )}
              
              <div className="flex gap-2">
                {isEditing ? (
                  <button onClick={handleSave} className="px-4 py-1.5 bg-[#00E5FF] text-black font-bold rounded text-sm hover:brightness-110">Save</button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 border border-[#333] text-gray-300 font-bold rounded text-sm hover:bg-[#1a1a1a]">Edit</button>
                )}
                <button onClick={handleDelete} className="px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded text-sm border border-transparent">Delete</button>
              </div>
            </div>

            {isEditing ? (
              <textarea 
                value={currentNote.content}
                onChange={e => setCurrentNote({...currentNote, content: e.target.value})}
                className="w-full h-[60vh] bg-transparent outline-none resize-none text-base leading-relaxed font-mono"
                placeholder="Start typing... use [[Links]] to connect."
              />
            ) : (
              <div 
                className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-[#00E5FF] prose-a:no-underline hover:prose-a:underline max-w-none"
                dangerouslySetInnerHTML={{ __html: marked.parse(currentNote.content || '') }}
              />
            )}

            {!isEditing && backlinks.length > 0 && (
              <div className="mt-16 pt-8 border-t border-[#1a1a1a]">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Linked Mentions</h3>
                <div className="space-y-2">
                  {backlinks.map(b => (
                    <div 
                      key={b.id} 
                      onClick={() => handleSelectNote(b)}
                      className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded cursor-pointer hover:border-[#333]"
                    >
                      <div className="text-[#00E5FF] text-sm font-bold mb-1">{b.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{b.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            Select or create a note.
          </div>
        )}
      </div>
    </div>
  );
}
