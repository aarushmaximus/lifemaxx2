import { useEffect, useState } from 'react';
import { store } from '../lib/store';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function Dashboard() {
  const [quests, setQuests] = useState([]);
  const [overall, setOverall] = useState(store.getOverall());

  // Load quests on mount and listen for store changes
  useEffect(() => {
    const load = () => setQuests(store.getQuests());
    load();
    const handler = () => {
      setQuests(store.getQuests());
      setOverall(store.getOverall());
    };
    store.on('change', handler);
    return () => {
      // No off implementation, but safe for now
    };
  }, []);

  // Toggle quest completion (simple version)
  const toggleQuest = (id) => {
    const q = store.getQuest(id);
    if (!q) return;
    if (q.status !== 'completed') {
      // Mark ready then complete to award XP
      store.markQuestReady(id);
      store.completeQuest(id);
    } else {
      // Re‑open quest (development convenience)
      q.status = 'active';
      store.upsertQuest(q);
    }
    // store emits change -> UI updates
  };

  // Drag & drop handling (react-beautiful-dnd)
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(quests);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    // Persist ordering back to store (simple ordering by array index)
    store.saveQuests(reordered);
  };

  return (
    <div className="p-4 glass-panel">
      <h2 className="text-xl font-bold mb-4">Daily Quest Board</h2>
      <div className="mb-2">
        <span className="font-medium">XP:</span> {overall.currentXP} / {overall.totalXPtoL100}
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="quest-list">
          {(provided) => (
            <ul
              className="space-y-2"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {quests.map((q, index) => (
                <Draggable key={q.id} draggableId={q.id} index={index}>
                  {(provided) => (
                    <li
                      className={`p-3 rounded cursor-pointer transition-colors ${q.status === 'completed' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => toggleQuest(q.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{q.name}</span>
                        <span className="text-sm opacity-75">{q.status}</span>
                      </div>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default Dashboard;
