import React from 'react';
import { MousePointer2, ChevronLeft, ChevronRight, TrendingUp, Sun, ChevronDown, Check, X, Calendar, RotateCcw, Trash2 } from 'lucide-react';

const LandingAnimation: React.FC = () => {
    return (
        <div className="w-full h-full bg-white relative overflow-hidden flex flex-col font-sans select-none border border-gray-200">
            {/* Animations */}
            <style>{`
                /* 
                   TIMELINE (Total 24s)
                   0-8s: Create & Drag
                   8-16s: Edit Modal
                   16-24s: Complete
                */

                @keyframes cursor-flow {
                    /* --- PHASE 1: CREATE & DRAG (0-35%) --- */
                    0% { transform: translate(400px, 320px); } /* Start: Hover Wed 11:00 slot */
                    
                    /* Click to create */
                    4% { transform: translate(400px, 320px) scale(0.9); }
                    5% { transform: translate(400px, 320px) scale(1); }
                    
                    /* Pause for typing (5-12%) */
                    5%, 12% { transform: translate(400px, 320px); }

                    /* Move to task handle for drag */
                    15% { transform: translate(400px, 320px); } 
                    
                    /* Click & Hold to Drag */
                    18% { transform: translate(400px, 320px) scale(0.9); }
                    
                    /* Dragging to Friday (approx +300px X, +100px Y) */
                    20% { transform: translate(400px, 320px) scale(0.9); }
                    30% { transform: translate(700px, 420px) scale(0.9); }
                    
                    /* Drop */
                    32% { transform: translate(700px, 420px) scale(1); }
                    35% { transform: translate(720px, 440px); } /* Rest */


                    /* --- PHASE 2: EDIT MODAL (35-70%) --- */
                    /* Click task to open modal */
                    40% { transform: translate(700px, 420px); }
                    42% { transform: translate(700px, 420px) scale(0.9); }
                    44% { transform: translate(700px, 420px) scale(1); }

                    /* Move to "Close" button on modal */
                    50% { transform: translate(780px, 180px); } 
                    
                    /* Click Close */
                    55% { transform: translate(780px, 180px) scale(0.9); }
                    57% { transform: translate(780px, 180px) scale(1); }
                    

                    /* --- PHASE 3: COMPLETE (70-100%) --- */
                    /* Move to Checkbox (Top left of task at Fri) */
                    65% { transform: translate(620px, 420px); } /* Approx checkbox pos */
                    
                    /* Click Checkbox */
                    70% { transform: translate(615px, 428px); }
                    72% { transform: translate(615px, 428px) scale(0.9); }
                    74% { transform: translate(615px, 428px) scale(1); }
                    
                    /* Move away */
                    85% { transform: translate(900px, 600px); opacity: 1; }
                    100% { transform: translate(400px, 320px); opacity: 0; }
                }

                @keyframes task-lifecycle {
                    /* Hidden initially */
                    0% { opacity: 0; transform: scale(0.9); }
                    
                    /* Appears after input (Simulated) */
                    5% { opacity: 1; transform: scale(1) translate(0, 0); }
                    
                    /* Static while typing */
                    18% { transform: translate(0, 0); z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                    
                    /* Dragging (Wed -> Fri) */
                    20% { transform: scale(1.05) translate(0, 0); z-index: 50; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                    30% { transform: scale(1.05) translate(300px, 100px); z-index: 50; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                    
                    /* Dropped at Fri */
                    32% { transform: scale(1) translate(300px, 100px); z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                    
                    /* Stays at Fri */
                    100% { transform: translate(300px, 100px); }
                }

                @keyframes task-color-shift {
                    0%, 72% { background-color: #FEF9C3; border-color: #FEF08A; } /* Yellow */
                    73%, 100% { background-color: #F8FAFC; border-color: #E2E8F0; opacity: 0.7; } /* Gray/Strike */
                }

                @keyframes text-strike {
                    0%, 72% { text-decoration: none; color: #1F2937; }
                    73%, 100% { text-decoration: line-through; color: #9CA3AF; }
                }
                
                @keyframes check-appear {
                    0%, 72% { transform: scale(0); opacity: 0; }
                    73% { transform: scale(1.2); opacity: 1; }
                    75% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }

                @keyframes modal-pop {
                    0%, 42% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); pointer-events: none; }
                    43% { opacity: 1; transform: translate(-50%, -50%) scale(1); pointer-events: auto; }
                    55% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    56% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); pointer-events: none; }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); pointer-events: none; }
                }

                @keyframes typing-effect {
                   0%, 5% { width: 0; }
                   12% { width: 100%; }
                   100% { width: 100%; }
                }

                .animate-cursor-complex { animation: cursor-flow 24s ease-in-out infinite; }
                .animate-task-complex { animation: task-lifecycle 24s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                .animate-color-complex { animation: task-color-shift 24s step-end infinite; }
                .animate-strike-complex { animation: text-strike 24s step-end infinite; }
                .animate-check-complex { animation: check-appear 24s step-end infinite; }
                .animate-modal-complex { animation: modal-pop 24s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
                .animate-typing-complex { animation: typing-effect 24s steps(20, end) infinite; }
            `}</style>

            {/* Header Mockup (Simplified) */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-transparent flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <div className="p-1.5 rounded-full bg-[#26A69A] text-white opacity-80"><ChevronLeft size={16} /></div>
                        <div className="p-1.5 rounded-full bg-[#26A69A] text-white opacity-80"><ChevronRight size={16} /></div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">M</div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 flex overflow-hidden pl-4 pb-4 bg-white relative">
                {/* Sidebar Mock */}
                <div className="w-12 pt-10 flex flex-col gap-8 border-r border-gray-100 text-[10px] text-gray-400 font-medium text-right pr-3">
                    {[8, 9, 10, 11, 12, 13, 14].map(h => <div key={h}>{h}:00</div>)}
                </div>

                {/* Days Columns */}
                <div className="flex-1 flex overflow-hidden">
                    {[
                        { d: '26 янв', w: 'ПН' },
                        { d: '27 янв', w: 'ВТ' },
                        { d: '28 янв', w: 'СР' }, // Wed is index 2
                        { d: '29 янв', w: 'ЧТ' },
                        { d: '30 янв', w: 'ПТ' }, // Fri is index 4
                        { d: '31 янв', w: 'СБ' },
                        { d: '1 фев', w: 'ВС' },
                    ].map((day, i) => (
                        <div key={i} className="flex-1 border-r border-gray-100 min-w-[130px] flex flex-col relative">
                            {/* Col Header */}
                            <div className="px-3 pb-2 border-b border-gray-100 mb-2 flex justify-between items-baseline">
                                <span className={`text-lg font-bold ${i === 2 ? 'text-[#26A69A]' : 'text-gray-900'}`}>{day.d}</span>
                                <span className="text-[10px] font-bold text-gray-300 uppercase">{day.w}</span>
                            </div>

                            {/* Tasks Area */}
                            <div className="flex-1 relative pt-2">
                                {/* Early Hours Mock */}
                                <div className="mx-2 mb-4 py-1 px-2 border border-blue-50 bg-blue-50/50 rounded-full flex justify-between items-center opacity-70">
                                    <div className="flex gap-1 items-center"><Sun size={10} className="text-blue-400" /><span className="text-[9px] text-gray-500">5:00 — 8:00</span></div>
                                    <ChevronDown size={10} className="text-gray-400" />
                                </div>

                                {/* Static Task (Mon) */}
                                {i === 0 && (
                                    <div className="mx-2 mt-4 p-2 rounded bg-red-50 border border-red-100 text-xs font-medium text-gray-800 shadow-sm flex gap-2">
                                        <div className="w-3 h-3 rounded-full border border-gray-400"></div>
                                        <span>Скорректировать код</span>
                                    </div>
                                )}

                                {/* Static Task (Mon 2) */}
                                {i === 0 && (
                                    <div className="mx-2 mt-1 p-2 rounded bg-purple-50 border border-purple-100 text-xs font-medium text-gray-800 shadow-sm flex gap-2">
                                        <div className="w-3 h-3 rounded-full border border-gray-400"></div>
                                        <span className="line-through text-gray-400">Встреча с партнером</span>
                                    </div>
                                )}

                                {/* ANIMATED TASK (Wed -> Fri) */}
                                {i === 2 && (
                                    <div className="animate-task-complex animate-color-complex absolute top-[100px] left-2 right-2 p-2 rounded bg-yellow-100 border border-yellow-200 text-xs font-medium text-gray-800 shadow-sm group">
                                        <div className="flex items-start gap-2">
                                            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border border-gray-400 bg-transparent flex items-center justify-center shrink-0`}>
                                                <Check size={10} className="text-gray-500 animate-check-complex" strokeWidth={3} />
                                            </div>
                                            <div className="overflow-hidden whitespace-nowrap animate-typing-complex animate-strike-complex">
                                                Записаться к доктору
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Grid Lines */}
                                {[0, 1, 2, 3, 4, 5].map(line => (
                                    <div key={line} className="h-20 border-b border-gray-50"></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAKE MODAL OVERLAY */}
            <div className="absolute top-1/2 left-1/2 w-[400px] bg-[#FEFCE8] rounded-2xl shadow-2xl border border-gray-100 p-6 z-[100] animate-modal-complex origin-center">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-200 opacity-50"></div>
                        <div className="w-4 h-4 rounded-full bg-green-200 opacity-50"></div>
                        <div className="w-4 h-4 rounded-full bg-yellow-400 ring-2 ring-gray-400 ring-offset-1"></div>
                        <div className="w-4 h-4 rounded-full bg-blue-200 opacity-50"></div>
                    </div>
                    <div className="flex gap-2 text-gray-400">
                        <Trash2 size={18} />
                        <X size={18} />
                    </div>
                </div>

                <div className="flex gap-3 mb-6">
                    <div className="px-3 py-1.5 border border-gray-300 rounded flex items-center gap-2 text-gray-600 text-sm bg-white">
                        <Calendar size={14} /> <span>30.01.2026</span>
                    </div>
                    <div className="px-3 py-1.5 border border-gray-300 rounded flex items-center gap-2 text-gray-600 text-sm bg-white">
                        <RotateCcw size={14} /> <span>Повторять</span>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-8">Записаться к доктору</h2>

                <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-auto">
                    <div className="text-gray-400 text-sm flex gap-2 items-center">+ Добавить шаг...</div>
                    <div className="px-4 py-1.5 bg-gray-200 text-gray-500 rounded text-sm font-bold uppercase tracking-wider">Добавить</div>
                </div>
            </div>

            {/* Bottom Panel Mock */}
            <div className="h-16 border-t border-gray-100 bg-white grid grid-cols-4 px-4 gap-4 items-center">
                <div className="bg-yellow-50/50 h-8 rounded border border-yellow-100 w-full animate-pulse"></div>
                <div className="bg-red-50/50 h-8 rounded border border-red-100 w-full"></div>
                <div className="bg-blue-50/50 h-8 rounded border border-blue-100 w-full"></div>
                <div className="border border-gray-100 h-8 rounded w-full"></div>
            </div>

            {/* Cursor */}
            <div className="absolute top-0 left-0 animate-cursor-complex z-[200] pointer-events-none drop-shadow-xl text-gray-900">
                <MousePointer2 size={24} fill="white" />
            </div>
        </div>
    );
};

export default LandingAnimation;
