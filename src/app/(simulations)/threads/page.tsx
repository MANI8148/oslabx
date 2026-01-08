'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GitMerge, Lock, Unlock, Minus, Plus, RefreshCw, Layers, Activity, Play, Terminal, MessageSquare, Coffee, Square, Skull, Share2, List } from 'lucide-react';
import Link from 'next/link';

// Types for our visual simulation
interface Thread {
    id: number;
    state: 'thinking' | 'waiting' | 'eating' | 'producing' | 'consuming' | 'running' | 'terminated';
    name: string;
}

interface BufferItem {
    id: number;
    value: string;
}

type ThreadLog = { id: string, msg: string, time: string };

type ProblemType = 'producer' | 'dining' | 'race' | 'executor';

export default function ThreadsPage() {
    const [problem, setProblem] = useState<ProblemType>('producer');
    const [isRunning, setIsRunning] = useState(false);

    // Isolated Logs for each page
    const [logsPC, setLogsPC] = useState<ThreadLog[]>([]);
    const [logsDining, setLogsDining] = useState<ThreadLog[]>([]);
    const [logsRace, setLogsRace] = useState<ThreadLog[]>([]);
    const [logsExec, setLogsExec] = useState<ThreadLog[]>([]);

    // PC State
    const [bufferSize, setBufferSize] = useState(5);
    const [buffer, setBuffer] = useState<BufferItem[]>([]);

    // Dining State
    const [philosophers, setPhilosophers] = useState<Thread[]>([
        { id: 0, state: 'thinking', name: 'Aristotle' },
        { id: 1, state: 'thinking', name: 'Plato' },
        { id: 2, state: 'thinking', name: 'Socrates' },
        { id: 3, state: 'thinking', name: 'Confucius' },
        { id: 4, state: 'thinking', name: 'Kant' },
    ]);
    const [forks, setForks] = useState<boolean[]>([true, true, true, true, true]);

    // Race Condition State
    const [counter, setCounter] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [raceType, setRaceType] = useState<'good' | 'bad'>('bad');
    const [activeThreads, setActiveThreads] = useState<number[]>([]);
    const [batchSize, setBatchSize] = useState(1);

    // Executor State
    const [execCode, setExecCode] = useState<string>(`// Thread Execution Script
void main() {
    pthread_create();
    pthread_create();
    sleep(2);
    pthread_join();
}`);
    const [simThreads, setSimThreads] = useState<Array<{ id: string, name: string, state: string }>>([]);
    const idSeed = useRef(Date.now());

    const addLog = (msg: string, probOverride?: ProblemType) => {
        const target = probOverride || problem;
        const entry = { id: `${Date.now()}-${Math.random()}`, msg, time: new Date().toLocaleTimeString() };

        if (target === 'producer') setLogsPC(prev => [entry, ...prev].slice(0, 20));
        if (target === 'dining') setLogsDining(prev => [entry, ...prev].slice(0, 20));
        if (target === 'race') setLogsRace(prev => [entry, ...prev].slice(0, 20));
        if (target === 'executor') setLogsExec(prev => [entry, ...prev].slice(0, 20));
    };

    const getUniqueId = (prefix: string) => {
        idSeed.current += 1;
        return `${prefix}-${idSeed.current}`;
    };

    // Producer Consumer Logic
    useEffect(() => {
        if (!isRunning || problem !== 'producer') return;
        const interval = setInterval(() => {
            const action = Math.random() > 0.5 ? 'produce' : 'consume';
            if (action === 'produce') {
                if (buffer.length < bufferSize) {
                    setBuffer(prev => {
                        const newItem = { id: Date.now(), value: Math.floor(Math.random() * 100).toString() };
                        addLog(`Producer: Created item ${newItem.value}`, 'producer');
                        return [...prev, newItem];
                    });
                } else addLog('Producer: Buffer Full (Blocked)', 'producer');
            } else {
                if (buffer.length > 0) {
                    setBuffer(prev => {
                        const item = prev[0];
                        addLog(`Consumer: Removed item ${item.value}`, 'producer');
                        return prev.slice(1);
                    });
                } else addLog('Consumer: Buffer Empty (Blocked)', 'producer');
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [isRunning, problem, buffer, bufferSize]);

    // Dining Philosophers Logic
    useEffect(() => {
        if (!isRunning || problem !== 'dining') return;
        const tick = setInterval(() => {
            const idx = Math.floor(Math.random() * 5);
            setPhilosophers(prevPhils => {
                const newPhils = [...prevPhils];
                const p = newPhils[idx];
                if (p.state === 'thinking') {
                    setForks(currForks => {
                        const left = idx, right = (idx + 1) % 5;
                        if (currForks[left] && currForks[right]) {
                            const newForks = [...currForks];
                            newForks[left] = false; newForks[right] = false;
                            newPhils[idx].state = 'eating';
                            addLog(`${p.name}: Eating...`, 'dining');
                            return newForks;
                        } else return currForks;
                    });
                } else if (p.state === 'eating') {
                    setForks(currForks => {
                        const left = idx, right = (idx + 1) % 5;
                        const newForks = [...currForks];
                        newForks[left] = true; newForks[right] = true;
                        return newForks;
                    });
                    newPhils[idx].state = 'thinking';
                    addLog(`${p.name}: Finished eating.`, 'dining');
                }
                return newPhils;
            });
        }, 2000);
        return () => clearInterval(tick);
    }, [isRunning, problem]);

    // Race Condition Logic Improved
    const runRaceStep = () => {
        for (let i = 0; i < batchSize; i++) {
            const tid = Math.floor(Math.random() * 10000);
            setTimeout(() => {
                setActiveThreads(prev => [...prev, tid]);
                addLog(`Thread ${tid}: Starting update cycle`, 'race');

                const delay = raceType === 'bad' ? Math.random() * 500 + 200 : 0;

                const processUpdate = () => {
                    if (raceType === 'good') {
                        if (isLocked) {
                            setTimeout(processUpdate, 200);
                            return;
                        }
                        setIsLocked(true);
                    }

                    // Simulate RMW (Read-Modify-Write)
                    setTimeout(() => {
                        setCounter(c => c + 1);
                        addLog(`Thread ${tid}: Counter incremented`, 'race');

                        if (raceType === 'good') {
                            setIsLocked(false);
                        }
                        setActiveThreads(prev => prev.filter(t => t !== tid));
                    }, delay);
                };

                processUpdate();
            }, i * 100);
        }
    };

    // Executor Logic
    const handleResetExec = () => {
        setSimThreads([]);
        setLogsExec([]);
        addLog("Executor: Trace state reset.", 'executor');
    };

    const runExecCode = () => {
        const lines = execCode.split('\n');
        let delay = 0;
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('pthread_create')) {
                setTimeout(() => {
                    const tid = getUniqueId('T');
                    setSimThreads(prev => [...prev, { id: tid, name: `Thread ${tid.split('-').pop()}`, state: 'running' }]);
                    addLog(`Sys: Spawned thread ${tid}`, 'executor');
                }, delay);
                delay += 1200;
            } else if (trimmed.includes('sleep')) {
                delay += 2500;
            } else if (trimmed.includes('pthread_join')) {
                setTimeout(() => {
                    setSimThreads(prev => prev.map(t => ({ ...t, state: 'terminated' })));
                    addLog("Sys: All threads joined/sync complete.", 'executor');
                }, delay);
                delay += 1200;
            }
        });
    };

    const getCurrentLogs = () => {
        if (problem === 'producer') return logsPC;
        if (problem === 'dining') return logsDining;
        if (problem === 'race') return logsRace;
        return logsExec;
    };

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto min-h-screen bg-slate-950 text-slate-200 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity size={18} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-widest uppercase">OSLabX</h1>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-600/10 rounded-xl border border-emerald-500/20">
                        <GitMerge className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 tracking-tight">Concurrency Lab</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Multi-Threading</p>
                    </div>
                </div>
            </header>

            <div className="flex bg-slate-900/40 p-1 rounded-xl border border-slate-800/80 w-fit mb-8 overflow-x-auto max-w-full backdrop-blur-3xl shadow-xl">
                {[
                    { id: 'producer', label: 'Prob 1: PC', icon: <Layers size={16} /> },
                    { id: 'dining', label: 'Prob 2: Dining', icon: <Coffee size={16} /> },
                    { id: 'race', label: 'Prob 3: Race', icon: <Activity size={16} /> },
                    { id: 'executor', label: 'Prob 4: Exec Trace', icon: <Share2 size={16} /> },
                ].map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => { setProblem(btn.id as ProblemType); setIsRunning(false); }}
                        className={`px-6 py-2.5 rounded-lg font-black transition-all flex items-center gap-3 text-[10px] uppercase tracking-widest ${problem === btn.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        {btn.icon} {btn.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-9 space-y-8">
                    {problem === 'producer' && (
                        <div className="p-8 bg-slate-900/30 border border-slate-800/60 rounded-3xl min-h-[500px] flex flex-col items-center justify-center animate-in zoom-in-95 duration-700 relative overflow-hidden backdrop-blur-sm">
                            <div className="flex items-center gap-12 w-full justify-between px-8">
                                <div className="text-center group">
                                    <div className={`p-6 rounded-2xl border-2 transition-all duration-500 ${isRunning ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xl' : 'bg-slate-950 border-slate-800'} group-hover:scale-105`}>
                                        <Plus size={32} className="text-emerald-500" />
                                    </div>
                                    <div className="mt-4 font-black text-[9px] uppercase tracking-widest text-slate-600">Producer Unit</div>
                                </div>
                                <div className="flex-1 max-w-lg">
                                    <div className="flex gap-4 mb-8 justify-center">
                                        {Array.from({ length: bufferSize }).map((_, i) => (
                                            <div key={i} className={`w-16 h-20 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${buffer[i] ? 'bg-emerald-600 border-emerald-400 shadow-2xl shadow-emerald-600/30 -translate-y-2' : 'bg-slate-950 border-dashed border-slate-800'}`}>
                                                {buffer[i] && <span className="font-black text-sm">{buffer[i].value}</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-1 bg-slate-800 rounded-full w-full relative">
                                        <div className="absolute inset-0 bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${(buffer.length / bufferSize) * 100}%` }} />
                                    </div>
                                    <div className="mt-4 text-center font-black text-[9px] text-slate-600 tracking-widest uppercase">Synchronized Buffer</div>
                                </div>
                                <div className="text-center group">
                                    <div className={`p-6 rounded-2xl border-2 transition-all duration-500 ${isRunning ? 'bg-red-500/10 border-red-500/40 shadow-xl' : 'bg-slate-950 border-slate-800'} group-hover:scale-105`}>
                                        <Minus size={32} className="text-red-500" />
                                    </div>
                                    <div className="mt-4 font-black text-[9px] uppercase tracking-widest text-slate-600">Consumer Unit</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {problem === 'dining' && (
                        <div className="p-8 bg-slate-900/30 border border-slate-800/60 rounded-3xl min-h-[500px] flex items-center justify-center animate-in zoom-in-95 duration-700 backdrop-blur-sm">
                            <div className="relative w-80 h-80">
                                {philosophers.map((p, i) => {
                                    const angle = (i * 72) - 90;
                                    const x = 50 + 36 * Math.cos(angle * Math.PI / 180);
                                    const y = 50 + 36 * Math.sin(angle * Math.PI / 180);
                                    return (
                                        <div
                                            key={p.id}
                                            className={`absolute w-24 h-24 -ml-12 -mt-12 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-1000 z-10
                                                ${p.state === 'eating' ? 'bg-emerald-600 border-indigo-300 scale-110 shadow-xl' : 'bg-slate-950 border-slate-800/50 grayscale opacity-80'}
                                            `}
                                            style={{ left: `${x}%`, top: `${y}%` }}
                                        >
                                            <div className="p-2 bg-black/20 rounded-xl mb-2">
                                                <Activity size={24} className={p.state === 'eating' ? 'text-white animate-pulse' : 'text-slate-600'} />
                                            </div>
                                            <span className="font-black text-xs tracking-tighter text-white">{p.name}</span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{p.state}</span>
                                        </div>
                                    );
                                })}
                                {forks.map((f, i) => {
                                    const angle = (i * 72) - 54;
                                    const x = 50 + 20 * Math.cos(angle * Math.PI / 180);
                                    const y = 50 + 20 * Math.sin(angle * Math.PI / 180);
                                    return (
                                        <div
                                            key={i}
                                            className={`absolute w-2 h-16 -ml-1 -mt-8 rounded-full transition-all duration-700 shadow-2xl
                                                ${f ? 'bg-slate-400 rotate-12' : 'bg-white/5 -translate-y-8 opacity-0'}
                                            `}
                                            style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${angle + 90}deg)` }}
                                        />
                                    );
                                })}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-white/5 bg-emerald-500/5 backdrop-blur-xl flex flex-col items-center justify-center">
                                </div>
                            </div>
                        </div>
                    )}

                    {problem === 'race' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="p-10 bg-slate-900/30 border border-slate-800/60 rounded-3xl flex flex-col items-center backdrop-blur-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Atomic Registry Value</div>
                                <h3 className="text-6xl font-black text-center mb-8 tabular-nums tracking-tighter">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-indigo-800">{counter}</span>
                                </h3>

                                <div className="flex bg-slate-950 p-2 rounded-[2rem] border border-slate-800 mb-12 shadow-2xl">
                                    <button
                                        onClick={() => { setRaceType('bad'); setCounter(0); setActiveThreads([]); }}
                                        className={`px-10 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${raceType === 'bad' ? 'bg-red-600/20 text-red-500 border border-red-500/30 shadow-lg' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}
                                    >
                                        Race Exposed (No Mutex)
                                    </button>
                                    <button
                                        onClick={() => { setRaceType('good'); setCounter(0); setActiveThreads([]); }}
                                        className={`px-10 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${raceType === 'good' ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 shadow-lg' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}
                                    >
                                        Memory Fixed (Mutex Lock)
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-8">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className={`p-6 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center gap-4 ${activeThreads.length >= i ? 'bg-emerald-600/10 border-emerald-500/50 shadow-lg scale-105' : 'bg-slate-950/50 border-slate-800/40 opacity-40'}`}>
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center shadow-inner">
                                                <Activity size={24} className={activeThreads.length >= i ? 'text-emerald-400 animate-pulse' : 'text-slate-700'} />
                                            </div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Worker_{i}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 items-center w-full max-w-xl">
                                    <div className="flex-1 w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col gap-3">
                                        <div className="flex justify-between items-center px-4">
                                            <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Batch Size</span>
                                            <span className="text-lg font-black text-emerald-400">{batchSize}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1" max="10000"
                                            value={batchSize}
                                            onChange={(e) => setBatchSize(parseInt(e.target.value))}
                                            className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <button
                                        onClick={runRaceStep}
                                        className="h-16 px-8 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95 group"
                                    >
                                        <Plus size={18} className="group-hover:rotate-90 transition-transform" /> RUN BATCH
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {problem === 'executor' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="p-8 bg-slate-900/30 border border-slate-800/60 rounded-3xl min-h-[500px] flex flex-col relative backdrop-blur-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-500 flex items-center gap-3">
                                        <Share2 className="text-emerald-400" size={24} /> Parallel Script Trace
                                    </h3>
                                    <div className="flex gap-3">
                                        <button onClick={handleResetExec} className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition-all shadow-xl group"><RefreshCw size={18} className="text-slate-400" /></button>
                                        <button onClick={runExecCode} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg group"><Play size={16} fill="white" /> COMPILE & RUN</button>
                                    </div>
                                </div>

                                <div className="flex-1 border border-white/5 rounded-2xl bg-slate-950/40 p-6 overflow-x-auto custom-scrollbar flex items-center">
                                    <div className="flex gap-10 min-w-max">
                                        <div className="w-48 p-6 bg-emerald-600/5 border-2 border-emerald-500/30 rounded-2xl flex flex-col items-center shadow-xl relative overflow-hidden">
                                            <div className="p-4 bg-emerald-500/20 rounded-xl mb-3"><Terminal size={24} className="text-emerald-400" /></div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-100">MAIN PROCESS</div>
                                        </div>

                                        {simThreads.map((t) => (
                                            <div key={t.id} className={`w-40 p-6 rounded-2xl border-2 transition-all duration-700 flex flex-col items-center shadow-lg ${t.state === 'running' ? 'bg-emerald-500/5 border-emerald-500/30 scale-105' : 'bg-slate-900/40 border-slate-800 opacity-20 grayscale'}`}>
                                                <div className={`p-3 rounded-xl mb-3 ${t.state === 'running' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-600'}`}>
                                                    <Activity size={20} className={t.state === 'running' ? 'animate-pulse' : ''} />
                                                </div>
                                                <div className="text-[9px] font-black uppercase truncate w-full text-center tracking-widest text-slate-300">{t.name}</div>
                                                <div className={`mt-2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${t.state === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>{t.state}</div>
                                            </div>
                                        ))}

                                        {simThreads.length === 0 && (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-700 font-black uppercase text-xs tracking-[0.5em] opacity-30 gap-6">
                                                <Layers size={60} className="mb-2" />
                                                Awaiting Syscalls
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 group">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 mb-3 px-4 tracking-widest">
                                        <span className="flex items-center gap-2">Runtime Shell</span>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            value={execCode}
                                            onChange={(e) => setExecCode(e.target.value)}
                                            className="relative w-full h-48 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 font-mono text-[11px] text-indigo-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none shadow-xl custom-scrollbar"
                                            spellCheck={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl shadow-xl backdrop-blur-md">
                        <h3 className="font-black mb-6 text-[9px] uppercase tracking-widest text-slate-500 border-b border-white/5 pb-3">Simulation Control</h3>

                        {(problem === 'producer' || problem === 'dining') && (
                            <button
                                onClick={() => setIsRunning(!isRunning)}
                                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl ${isRunning ? 'bg-red-500/20 text-red-500 border border-red-500/40' : 'bg-emerald-600 text-white shadow-emerald-600/30'}`}
                            >
                                {isRunning ? <><Skull size={16} /> STOP</> : <><RefreshCw size={16} /> START</>}
                            </button>
                        )}

                        <div className="mt-6 space-y-4">
                            <div className="space-y-2">
                                <h4 className="text-[8px] uppercase text-slate-600 font-black tracking-widest pl-2">System Status</h4>
                                <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 flex justify-between items-center group">
                                    <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-emerald-400 transition-colors">CPU</span>
                                    <span className="text-lg font-black text-white italic tabular-nums">0{Math.floor(Math.random() * 9)}%</span>
                                </div>
                                <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 flex justify-between items-center group">
                                    <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-amber-400 transition-colors">WAIT</span>
                                    <span className="text-lg font-black text-white italic tabular-nums">{Math.floor(Math.random() * 20)}MS</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl h-[450px] flex flex-col shadow-xl backdrop-blur-md relative overflow-hidden">
                        <h3 className="font-black mb-6 text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-3">
                            <MessageSquare size={16} className="text-emerald-500" /> Activity Stack
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[9px] pr-2 custom-scrollbar">
                            {getCurrentLogs().length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-800">
                                    <List size={32} className="mb-4 opacity-10" />
                                    <span className="font-black uppercase tracking-widest opacity-20">Idle</span>
                                </div>
                            )}
                            {getCurrentLogs().map((log) => (
                                <div key={log.id} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl animate-in slide-in-from-right-4 transition-all hover:bg-slate-900 group">
                                    <div className="flex justify-between items-center mb-1 pb-1 border-b border-white/5">
                                        <span className="text-emerald-500/50 font-black text-[7px] uppercase tracking-tighter">TR_{log.id.split('-')[0].slice(-4)}</span>
                                        <span className="text-slate-700 text-[7px] font-black">{log.time}</span>
                                    </div>
                                    <span className="text-slate-400 font-bold leading-relaxed tracking-tight group-hover:text-indigo-200">{log.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
