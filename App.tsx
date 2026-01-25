import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INITIAL_GOALS } from './constants';
import { AppState, Goal, CoachInsights, DayData, SubTask } from './types';
import { getSmartCoachInsights, startCoachChat } from './services/geminiService';

const App: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'protocol' | 'intel'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const coachChatRef = useRef<any>(null);

  // 1. Initial Load from "Backend" (LocalStorage)
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('morenTrackerV8');
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (saved) {
      const parsed = JSON.parse(saved) as AppState;
      const history = parsed.history || {};
      const dayData = history[todayStr];

      return {
        ...parsed,
        goals: dayData?.goals || parsed.goals || INITIAL_GOALS,
        completedGoals: dayData?.completedGoals || {},
        subTaskCompletion: dayData?.subTaskCompletion || {},
        reflection: dayData?.reflection || '',
        history: history
      };
    }
    
    return {
      goals: INITIAL_GOALS,
      completedGoals: {},
      subTaskCompletion: {},
      reflection: '',
      lastResetDate: todayStr,
      streak: 0,
      alarmsEnabled: false,
      showMVDOnly: false,
      history: {}
    };
  });

  // 2. Persistence Engine: Watches EVERYTHING and writes to LocalStorage
  useEffect(() => {
    localStorage.setItem('morenTrackerV8', JSON.stringify(state));
    setIsSyncing(true);
    const timer = setTimeout(() => setIsSyncing(false), 800);
    return () => clearTimeout(timer);
  }, [state]);

  // 3. Date Switching: Load data for the selected day
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayData = state.history[dateStr];
    
    if (dayData) {
      // Don't trigger a circular state update if it's already current
      setState(prev => {
        if (prev.goals === dayData.goals && 
            prev.completedGoals === dayData.completedGoals && 
            prev.reflection === dayData.reflection) return prev;
            
        return {
          ...prev,
          goals: dayData.goals,
          completedGoals: dayData.completedGoals,
          subTaskCompletion: dayData.subTaskCompletion || {},
          reflection: dayData.reflection || ''
        };
      });
    } else {
      // If new day, use the most recent goals as a template
      setState(prev => ({
        ...prev,
        completedGoals: {},
        subTaskCompletion: {},
        reflection: ''
      }));
    }
  }, [selectedDate]);

  // 4. Update Handler: Ensures history is updated whenever something changes
  const updateDailyState = (updates: Partial<AppState>) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // Atomic Update: Mirror current live state into history
      const daySnapshot: DayData = {
        goals: newState.goals,
        completedGoals: newState.completedGoals,
        subTaskCompletion: newState.subTaskCompletion,
        reflection: newState.reflection
      };

      return {
        ...newState,
        history: {
          ...prev.history,
          [dateStr]: daySnapshot
        }
      };
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const currentTask = useMemo(() => {
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${h}:${m}`;
    return state.goals.find(g => {
      if (!g.startTime) return false;
      if (!g.endTime) return timeStr >= g.startTime;
      return timeStr >= g.startTime && timeStr <= g.endTime;
    }) || null;
  }, [now, state.goals]);

  const toggleGoal = (id: string) => {
    updateDailyState({
      completedGoals: { ...state.completedGoals, [id]: !state.completedGoals[id] }
    });
  };

  const handleAskCoach = async () => {
    setIsCoachLoading(true);
    const insights = await getSmartCoachInsights(state.goals, state.completedGoals, now.getHours(), state.reflection);
    if (insights) setCoachInsights(insights);
    setIsCoachLoading(false);
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return;
    const msg = chatMessage;
    setChatMessage("");
    setChatLog(prev => [...prev, { role: 'user', text: msg }]);
    if (!coachChatRef.current) coachChatRef.current = startCoachChat();
    try {
      const response = await coachChatRef.current.sendMessage({ message: msg });
      setChatLog(prev => [...prev, { role: 'model', text: response.text }]);
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'model', text: "Connection error." }]);
    }
  };

  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [coachInsights, setCoachInsights] = useState<CoachInsights | null>(null);

  const completionPercentage = state.goals.length > 0 
    ? Math.round((Object.values(state.completedGoals).filter(Boolean).length / state.goals.length) * 100)
    : 0;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      {/* Mesh Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 -left-20 w-72 h-72 bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 -right-20 w-72 h-72 bg-indigo-600 rounded-full blur-[120px]"></div>
      </div>

      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-2xl pt-10 pb-4 px-6 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Moren OS 2.8</span>
              <AnimatePresence>
                {isSyncing && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full"
                  >
                    <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[7px] font-black text-slate-500 uppercase">Live Sync</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <h1 className="text-2xl font-black tracking-tighter capitalize">{activeTab}</h1>
          </div>
          <div className="flex gap-2">
            <HeaderControl active={state.alarmsEnabled} icon={state.alarmsEnabled ? 'fa-bell' : 'fa-bell-slash'} onClick={() => updateDailyState({ alarmsEnabled: !state.alarmsEnabled })} />
            <HeaderControl icon="fa-calendar-days" onClick={() => setIsCalendarOpen(true)} />
          </div>
        </div>
        
        <div className="flex justify-between items-center overflow-x-auto no-scrollbar gap-2 pb-2">
          {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + offset);
            const isSelected = offset === 0;
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <button
                key={offset}
                onClick={() => setSelectedDate(new Date(d))}
                className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-2xl transition-all min-w-[45px] relative ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'text-slate-500 hover:text-white'}`}
              >
                <span className="text-[8px] font-black uppercase tracking-widest">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="text-sm font-black">{d.getDate()}</span>
                {isToday && !isSelected && <div className="absolute -bottom-0.5 w-1 h-1 bg-blue-500 rounded-full"></div>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 space-y-6">
              {/* Active Task Card */}
              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={() => currentTask && setIsFocusMode(true)}
                className="glass-card p-8 rounded-[40px] border border-white/10 overflow-hidden relative cursor-pointer group"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${currentTask ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`}></span>
                  {currentTask ? 'Protocol Active' : 'System Standby'}
                </p>
                <h2 className="text-3xl font-black tracking-tighter leading-none mb-3">
                  {currentTask ? currentTask.label : "Awaiting Launch"}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                    {currentTask ? currentTask.timeLabel : "00:00 - 00:00"}
                  </span>
                  <span className="text-slate-500 font-bold text-[10px] tracking-widest uppercase">
                    {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                <StatGlassCard icon="fa-fire" value={state.streak.toString()} label="Streak" accent="text-orange-500" />
                <StatGlassCard icon="fa-chart-pie" value={`${completionPercentage}%`} label="Done" accent="text-blue-500" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <ActionTile icon="fa-bolt" label="Wake" color="bg-blue-600" onClick={() => {
                   const wake = state.goals.find(g => g.id === 'wakeUp');
                   if (wake) toggleGoal(wake.id);
                }} />
                <ActionTile icon="fa-bullseye" label="MVD" color={state.showMVDOnly ? "bg-indigo-500" : "bg-white/5"} active={state.showMVDOnly} onClick={() => updateDailyState({ showMVDOnly: !state.showMVDOnly })} />
                <ActionTile icon="fa-rotate-right" label="Reset" color="bg-slate-800" onClick={() => {
                  if (window.confirm("Soft reset this snapshot?")) {
                    updateDailyState({
                       completedGoals: {},
                       subTaskCompletion: {},
                       reflection: ''
                    });
                  }
                }} />
              </div>
            </motion.div>
          )}

          {activeTab === 'protocol' && (
            <motion.div key="protocol" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Architecture</h3>
                <button onClick={() => {
                   setEditingGoal({ id: Math.random().toString(36).substr(2, 9), label: '', timeLabel: '', target: '', isMVD: false, startTime: '', endTime: '', subTasks: [] });
                   setIsModalOpen(true);
                }} className="text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-plus-circle"></i> Add Task
                </button>
              </div>
              
              <div className="space-y-3">
                {state.goals
                  .filter(g => state.showMVDOnly ? g.isMVD : true)
                  .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                  .map(goal => (
                  <TaskItem 
                    key={goal.id}
                    goal={goal}
                    completed={!!state.completedGoals[goal.id]}
                    isCurrent={goal.id === currentTask?.id}
                    isExpanded={!!expandedTasks[goal.id]}
                    subTaskCompletion={state.subTaskCompletion}
                    onToggle={() => toggleGoal(goal.id)}
                    onToggleSubTask={(subId: string) => {
                      const key = `${goal.id}-${subId}`;
                      updateDailyState({
                        subTaskCompletion: { ...state.subTaskCompletion, [key]: !state.subTaskCompletion[key] }
                      });
                    }}
                    onAddSubTask={(label: string) => {
                      const newSt: SubTask = { id: Math.random().toString(36).substr(2, 9), label, completed: false };
                      updateDailyState({
                        goals: state.goals.map(g => g.id === goal.id ? { ...g, subTasks: [...(g.subTasks || []), newSt] } : g)
                      });
                    }}
                    onRemoveSubTask={(subId: string) => {
                      updateDailyState({
                        goals: state.goals.map(g => g.id === goal.id ? { ...g, subTasks: g.subTasks?.filter(st => st.id !== subId) } : g)
                      });
                    }}
                    onToggleExpand={(e: any) => { e.stopPropagation(); setExpandedTasks(p => ({...p, [goal.id]: !p[goal.id]})); }}
                    onEdit={(e: any) => { e.stopPropagation(); setEditingGoal(goal); setIsModalOpen(true); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'intel' && (
            <motion.div key="intel" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 space-y-6">
              <div className="glass-card rounded-[40px] p-8 border border-white/10 space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
                      <i className="fa-solid fa-microchip text-white text-lg"></i>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Moren Coach</h3>
                  </div>
                  <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                    <i className={`fa-solid ${isChatOpen ? 'fa-chart-simple' : 'fa-comment-dots'}`}></i>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {isChatOpen ? (
                    <motion.div key="chat" className="space-y-4">
                      <div className="h-64 overflow-y-auto no-scrollbar space-y-3 p-3 bg-slate-950/50 rounded-3xl border border-white/5 text-[11px] font-medium leading-relaxed">
                        {chatLog.map((log, i) => (
                          <div key={i} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${log.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-200'}`}>
                              {log.text}
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="relative">
                        <input 
                          type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                          placeholder="Speak to coach..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white outline-none focus:border-indigo-500 pr-14"
                        />
                        <button onClick={handleSendChat} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white"><i className="fa-solid fa-arrow-up text-xs"></i></button>
                      </div>
                    </motion.div>
                  ) : coachInsights ? (
                    <motion.div key="insights" className="space-y-5">
                      <h4 className="text-indigo-400 font-black text-lg">{coachInsights.title}</h4>
                      <p className="text-slate-300 text-xs leading-relaxed">{coachInsights.analysis}</p>
                      <div className="space-y-2">
                        {coachInsights.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                            <i className="fa-solid fa-shield-halved text-emerald-500 text-xs mt-0.5"></i>
                            <span className="text-[10px] text-slate-200 font-semibold leading-relaxed uppercase tracking-tight">{rec}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setCoachInsights(null)} className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] pt-4 w-full">Dismiss session</button>
                    </motion.div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-slate-400 text-xs font-semibold leading-relaxed">System ready for intelligence processing. Analyze today's protocol execution to generate high-performance strategic adjustments.</p>
                      <button 
                        onClick={handleAskCoach} 
                        disabled={isCoachLoading} 
                        className="w-full py-5 bg-white text-slate-950 text-[10px] font-black rounded-2xl uppercase tracking-[0.3em] active:scale-95 transition-all"
                      >
                        {isCoachLoading ? 'PROFILING PROTOCOL...' : 'EXECUTE STRATEGY SYNC'}
                      </button>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="glass-card rounded-[40px] p-8 border border-white/10">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Protocol Debrief</h3>
                <textarea 
                  value={state.reflection}
                  onChange={(e) => updateDailyState({ reflection: e.target.value })}
                  placeholder="Wins, losses, or blockers..."
                  className="w-full h-32 bg-transparent text-slate-200 text-xs font-medium leading-relaxed outline-none resize-none placeholder:text-slate-800"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 px-10 pt-4 pb-10 flex justify-between items-center">
        <NavButton active={activeTab === 'dashboard'} icon="fa-chart-simple" label="Dashboard" onClick={() => setActiveTab('dashboard')} />
        <NavButton active={activeTab === 'protocol'} icon="fa-layer-group" label="Protocol" onClick={() => setActiveTab('protocol')} />
        <NavButton active={activeTab === 'intel'} icon="fa-brain" label="Intel" onClick={() => setActiveTab('intel')} />
      </nav>

      <AnimatePresence>
        {isFocusMode && currentTask && (
          <FocusOverlay task={currentTask} onClose={() => setIsFocusMode(false)} onComplete={() => { toggleGoal(currentTask.id); setIsFocusMode(false); }} />
        )}
        {isCalendarOpen && (
          <CalendarModal onSelectDate={(d) => { setSelectedDate(new Date(d)); setIsCalendarOpen(false); }} onClose={() => setIsCalendarOpen(false)} history={state.history} />
        )}
        {isModalOpen && editingGoal && (
          <GoalModal 
            goal={editingGoal} 
            onSave={(g) => {
              const exists = state.goals.find(x => x.id === g.id);
              updateDailyState({
                goals: exists ? state.goals.map(x => x.id === g.id ? g : x) : [...state.goals, g]
              });
              setIsModalOpen(false);
            }} 
            onDelete={() => {
              updateDailyState({ goals: state.goals.filter(x => x.id !== editingGoal.id) });
              setIsModalOpen(false);
            }}
            onClose={() => setIsModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Atomic Components ---

const NavButton: React.FC<any> = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all ${active ? 'text-blue-500' : 'text-slate-600'}`}>
    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${active ? 'bg-blue-600/10' : ''}`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <span className="text-[7px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const HeaderControl: React.FC<any> = ({ icon, onClick, active }) => (
  <button onClick={onClick} className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${active ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-white/5 text-slate-500 border-white/5 hover:text-white'}`}>
    <i className={`fa-solid ${icon} text-sm`}></i>
  </button>
);

const StatGlassCard: React.FC<any> = ({ icon, value, label, accent }) => (
  <div className="glass-card rounded-[32px] p-6">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${accent}`}>
        <i className={`fa-solid ${icon} text-xs`}></i>
      </div>
      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-3xl font-black tracking-tighter">{value}</div>
  </div>
);

const ActionTile: React.FC<any> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 p-5 rounded-[28px] border-2 transition-all active:scale-95 ${active ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-transparent'}`}>
    <i className={`fa-solid ${icon} text-sm ${active ? 'text-white' : 'text-slate-500'}`}></i>
    <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
  </button>
);

const TaskItem: React.FC<any> = ({ goal, completed, isCurrent, isExpanded, subTaskCompletion, onToggle, onToggleSubTask, onAddSubTask, onRemoveSubTask, onToggleExpand, onEdit }) => {
  const [newSubLabel, setNewSubLabel] = useState("");
  const hasSubTasks = goal.subTasks && goal.subTasks.length > 0;
  const completedSubTasks = goal.subTasks?.filter((st: SubTask) => subTaskCompletion[`${goal.id}-${st.id}`]).length || 0;
  
  return (
    <div className={`rounded-[32px] border-2 transition-all duration-300 overflow-hidden ${
      isCurrent ? 'bg-blue-600/10 border-blue-500/30' : completed ? 'bg-slate-900/40 border-emerald-500/10 opacity-70' : 'bg-white/5 border-transparent'
    }`}>
      <div className="p-5 flex items-center gap-4 cursor-pointer" onClick={onToggle}>
        <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${completed ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-700'}`}>
          {completed ? <i className="fa-solid fa-check text-base"></i> : <i className={`fa-solid ${isCurrent ? 'fa-bolt' : 'fa-circle'} text-[12px]`}></i>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h4 className={`text-[13px] font-black truncate tracking-tight uppercase ${isCurrent ? 'text-blue-400' : 'text-slate-200'}`}>{goal.label}</h4>
            <div className="flex items-center gap-3">
              <button onClick={onToggleExpand} className="p-2 text-slate-700 hover:text-white"><i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i></button>
              <button onClick={onEdit} className="p-2 text-slate-700 hover:text-white"><i className="fa-solid fa-ellipsis-vertical text-[10px]"></i></button>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-50">
            <p className="text-[9px] font-black uppercase tracking-widest">{goal.timeLabel}</p>
            {hasSubTasks && <span className="text-[8px] font-black text-blue-500">{completedSubTasks}/{goal.subTasks.length} Done</span>}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5 space-y-2 border-t border-white/5 pt-4">
            {goal.subTasks?.map((st: SubTask) => {
              const isSubCompleted = !!subTaskCompletion[`${goal.id}-${st.id}`];
              return (
                <div key={st.id} onClick={(e) => { e.stopPropagation(); onToggleSubTask(st.id); }} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-tight hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center ${isSubCompleted ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-800'}`}>
                      {isSubCompleted && <i className="fa-solid fa-check text-[8px]"></i>}
                    </div>
                    <span className={isSubCompleted ? 'line-through text-slate-600' : 'text-slate-300'}>{st.label}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveSubTask(st.id); }} className="text-red-500/20 hover:text-red-500 p-1"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                </div>
              );
            })}
            <form onSubmit={(e) => { e.preventDefault(); if(newSubLabel.trim()){ onAddSubTask(newSubLabel); setNewSubLabel(""); } }} className="relative mt-3">
              <input type="text" value={newSubLabel} onChange={e => setNewSubLabel(e.target.value)} placeholder="Write daily mini-task..." className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-3 text-[10px] font-black uppercase text-white outline-none focus:border-blue-500 transition-all pr-12 placeholder:text-slate-800" />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500"><i className="fa-solid fa-plus-circle text-lg"></i></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FocusOverlay: React.FC<any> = ({ task, onClose, onComplete }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
    <button onClick={onClose} className="absolute top-12 right-12 text-slate-600"><i className="fa-solid fa-xmark text-3xl"></i></button>
    <div className="space-y-4 mb-16">
      <span className="text-[10px] text-blue-500 font-black uppercase tracking-[0.5em] block animate-pulse">Deep Focus Active</span>
      <h2 className="text-5xl font-black leading-tight tracking-tighter">{task.label}</h2>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{task.target}</p>
    </div>
    <button onClick={onComplete} className="w-full max-w-xs py-6 bg-white text-slate-950 rounded-[40px] font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl active:scale-95 transition-all">TERMINATE PROTOCOL</button>
  </motion.div>
);

const CalendarModal: React.FC<any> = ({ onSelectDate, onClose, history }) => {
  const [viewMonth, setViewMonth] = useState(new Date());
  const daysInMonth = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  }, [viewMonth]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/98 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl">
      <div className="bg-slate-900 w-full max-w-sm rounded-[50px] p-10 border border-white/10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-600 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
        <div className="flex justify-between items-center mb-10">
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1))} className="text-slate-600 hover:text-white"><i className="fa-solid fa-chevron-left"></i></button>
          <h3 className="text-xs font-black uppercase tracking-[0.2em]">{viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1))} className="text-slate-600 hover:text-white"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-700">{d}</div>)}
          {daysInMonth.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const dateStr = d.toISOString().split('T')[0];
            const hasData = !!history[dateStr];
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <button key={i} onClick={() => onSelectDate(d)} className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : hasData ? 'bg-white/10 text-slate-200' : 'text-slate-600 hover:bg-white/5'}`}>{d.getDate()}</button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

const GoalModal: React.FC<any> = ({ goal, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState<Goal>({ ...goal, subTasks: goal.subTasks || [] });
  const formatTimeLabel = (start: string, end: string) => {
    if (!start) return "Static Protocol";
    const f = (t: string) => {
      const [h, m] = t.split(':');
      const hr = parseInt(h);
      return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
    };
    return end ? `${f(start)} - ${f(end)}` : f(start);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/95 z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-slate-900 w-full max-w-md rounded-t-[50px] sm:rounded-[50px] p-10 border-t border-white/10 max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <h3 className="text-2xl font-black uppercase tracking-tighter">Adjust Architecture</h3>
          <button onClick={onClose} className="p-2 text-slate-600 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Label</label>
            <input type="text" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-blue-500 transition-all outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Start</label>
              <input type="time" value={formData.startTime || ''} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">End</label>
              <input type="time" value={formData.endTime || ''} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
            </div>
          </div>
          <div className={`flex items-center gap-5 p-6 rounded-3xl cursor-pointer border-2 transition-all ${formData.isMVD ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-transparent'}`} onClick={() => setFormData({ ...formData, isMVD: !formData.isMVD })}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.isMVD ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40' : 'bg-slate-800 text-slate-600'}`}>
              <i className="fa-solid fa-triangle-exclamation text-xs"></i>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">MVD Protocol</span>
          </div>
        </div>
        <div className="flex gap-5 mt-12">
          <button onClick={onDelete} className="w-16 h-16 rounded-[24px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can"></i></button>
          <button onClick={() => onSave({ ...formData, timeLabel: formatTimeLabel(formData.startTime || '', formData.endTime || '') })} className="flex-1 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-[24px]">Commit Architecture</button>
        </div>
      </div>
    </motion.div>
  );
};

export default App;