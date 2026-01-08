'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Cpu, Zap, Activity, BookOpen, Layers, Settings, Terminal, Box, RefreshCw, GitBranch, Play, Square, Coffee, Skull, Share2, Plus, MessageSquare, List } from 'lucide-react';
import Link from 'next/link';

type TabType = 'basics' | 'process' | 'trace';

interface ThreadNode {
    id: string; // Unique ID
    tid: number;
    state: 'running' | 'sleeping' | 'terminated';
}

interface ProcessNode {
    id: string; // Unique ID
    pid: number;
    parent: string | null;
    state: 'running' | 'sleeping' | 'zombie' | 'terminated' | 'waiting';
    name: string;
    children: string[];
    threads: ThreadNode[];
    isMain?: boolean;
}

export default function FundamentalsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('basics');
    const [processState, setProcessState] = useState<'New' | 'Ready' | 'Running' | 'Waiting' | 'Terminated'>('New');

    // Robust unique identifier counters
    const idSeed = useRef(Date.now());
    const getUniqueId = (prefix: string) => {
        idSeed.current += 1;
        return `${prefix}-${idSeed.current}`;
    };

    // System Call Trace State
    const [processes, setProcesses] = useState<ProcessNode[]>([
        {
            id: 'p-init',
            pid: 1,
            parent: null,
            state: 'running',
            name: 'init (pid:1)',
            children: [],
            threads: [{ id: 't-init-1', tid: 1, state: 'running' }],
            isMain: true
        }
    ]);
    const [selectedId, setSelectedId] = useState<string>('p-init');
    const [logs, setLogs] = useState<Array<{ id: string, msg: string, time: string, pid?: number }>>([
        { id: 'log-start', msg: 'System boot: init process started.', time: new Date().toLocaleTimeString(), pid: 1 }
    ]);
    const [editableCode, setEditableCode] = useState<string>(`// System Call Trace Script
void main() {
    fork();
    pthread_create();
    sleep(2);
    wait();
    exit(0);
}`);

    const addLog = (msg: string, pid?: number) => {
        const entry = {
            id: getUniqueId('log'),
            msg,
            time: new Date().toLocaleTimeString(),
            pid
        };
        setLogs(prev => [entry, ...prev].slice(0, 15));
    };

    const getProcColor = (pid: number) => {
        const colors = ['text-emerald-400', 'text-cyan-400', 'text-amber-400', 'text-orange-400', 'text-lime-400', 'text-sky-400', 'text-red-400'];
        return colors[(pid - 1) % colors.length];
    };

    const getProcBg = (pid: number) => {
        const bgs = ['bg-emerald-500/20', 'bg-cyan-500/20', 'bg-amber-500/20', 'bg-orange-500/20', 'bg-lime-500/20', 'bg-sky-500/20', 'bg-red-500/20'];
        return bgs[(pid - 1) % bgs.length];
    };

    const getProcBorder = (pid: number) => {
        const borders = ['border-emerald-500/50', 'border-cyan-500/50', 'border-amber-500/50', 'border-orange-500/50', 'border-lime-500/50', 'border-sky-500/50', 'border-red-500/50'];
        return borders[(pid - 1) % borders.length];
    };

    const handleFork = () => {
        setProcesses(prev => {
            const parent = prev.find(p => p.id === selectedId);
            if (!parent || parent.state === 'terminated' || parent.state === 'zombie') return prev;

            const newPidNum = Math.max(...prev.map(p => p.pid)) + 1;
            const newId = getUniqueId('proc');
            const newProc: ProcessNode = {
                id: newId,
                pid: newPidNum,
                parent: selectedId,
                state: 'running',
                name: `child (pid:${newPidNum})`,
                children: [],
                threads: [{ id: getUniqueId('thread'), tid: 1, state: 'running' }]
            };

            addLog(`fork(): Process ${parent.pid} created child ${newPidNum}`, parent.pid);
            const updated = prev.map(p => p.id === selectedId ? { ...p, children: [...p.children, newId] } : p);
            return [...updated, newProc];
        });
    };

    const handleCreateThread = () => {
        setProcesses(prev => prev.map(p => {
            if (p.id === selectedId && p.state !== 'terminated' && p.state !== 'zombie') {
                const newTid = p.threads.length + 1;
                const newTidId = getUniqueId('thread');
                addLog(`pthread_create(): New thread T${newTid} in PID ${p.pid}`, p.pid);
                return {
                    ...p,
                    threads: [...p.threads, { id: newTidId, tid: newTid, state: 'running' }]
                };
            }
            return p;
        }));
    };

    const handleExit = () => {
        setProcesses(prev => {
            const target = prev.find(p => p.id === selectedId);
            if (!target || target.pid === 1) return prev;

            return prev.map(p => {
                if (p.id === selectedId) {
                    const parent = prev.find(par => par.id === p.parent);
                    if (parent && parent.state === 'waiting') {
                        addLog(`exit(): Process ${p.pid} terminated (parent was waiting)`, p.pid);
                        return { ...p, state: 'terminated' as const, threads: p.threads.map(t => ({ ...t, state: 'terminated' })) };
                    } else {
                        addLog(`exit(): Process ${p.pid} became ZOMBIE (parent not waiting)`, p.pid);
                        return { ...p, state: 'zombie' as const, threads: p.threads.map(t => ({ ...t, state: 'terminated' })) };
                    }
                }
                return p;
            });
        });
    };

    const handleWait = () => {
        setProcesses(prev => {
            const p = prev.find(proc => proc.id === selectedId);
            if (!p || p.state !== 'running') return prev;

            const zombieChild = prev.find(child => child.parent === selectedId && child.state === 'zombie');

            if (zombieChild) {
                addLog(`wait(): Process ${p.pid} collected zombie child ${zombieChild.pid}`, p.pid);
                return prev.map(proc =>
                    proc.id === zombieChild.id ? { ...proc, state: 'terminated' as const } : proc
                );
            } else {
                addLog(`wait(): Process ${p.pid} is now WAITING for children`, p.pid);
                return prev.map(proc => proc.id === selectedId ? { ...proc, state: 'waiting' as const } : proc);
            }
        });
    };

    const handleSleep = () => {
        setProcesses(prev => {
            const target = prev.find(p => p.id === selectedId);
            if (!target) return prev;
            addLog(`sleep(): Process ${target.pid} entering sleep state (3s)`, target.pid);

            setTimeout(() => {
                setProcesses(current => current.map(p =>
                    p.id === selectedId && p.state === 'sleeping' ? { ...p, state: 'running' as const } : p
                ));
            }, 3000);

            return prev.map(p => p.id === selectedId ? { ...p, state: 'sleeping' as const } : p);
        });
    };

    const runCustomCode = () => {
        const lines = editableCode.split('\n');
        let delay = 0;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('fork()')) {
                setTimeout(handleFork, delay);
                delay += 1000;
            } else if (trimmed.includes('pthread_create()')) {
                setTimeout(handleCreateThread, delay);
                delay += 1000;
            } else if (trimmed.includes('sleep(')) {
                setTimeout(handleSleep, delay);
                delay += 1000;
            } else if (trimmed.includes('wait()')) {
                setTimeout(handleWait, delay);
                delay += 1000;
            } else if (trimmed.includes('exit(')) {
                setTimeout(handleExit, delay);
                delay += 1000;
            }
        });
    };

    const handleReset = () => {
        setProcesses([
            {
                id: 'p-init',
                pid: 1,
                parent: null,
                state: 'running',
                name: 'init (pid:1)',
                children: [],
                threads: [{ id: 't-init-1', tid: 1, state: 'running' }],
                isMain: true
            }
        ]);
        setSelectedId('p-init');
        setLogs([{ id: 'log-start', msg: 'System reset: Returned to init.', time: new Date().toLocaleTimeString() }]);
    };

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto min-h-screen bg-slate-950 text-slate-200">
            <header className="mb-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity size={18} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-widest uppercase">OSLabX</h1>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <BookOpen className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white over via-blue-100 to-slate-500 tracking-tight">OS Architecture Lab</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest uppercase">Fundamentals</p>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-900/40 p-1 rounded-xl border border-slate-800/80 w-fit mb-8 overflow-x-auto max-w-full backdrop-blur-xl shadow-xl">
                {[
                    { id: 'basics', label: 'Theory', icon: <Layers size={16} /> },
                    { id: 'process', label: 'Lifecycle', icon: <Activity size={16} /> },
                    { id: 'trace', label: 'System Trace', icon: <Share2 size={16} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-6 py-2.5 rounded-lg font-black transition-all flex items-center gap-2 whitespace-nowrap text-[10px] uppercase tracking-widest ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="space-y-8">
                {activeTab === 'trace' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-700">
                        {/* Main Interaction Area */}
                        <div className="xl:col-span-9 space-y-6">
                            {/* Execution Visualizer Container */}
                            <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-3xl backdrop-blur-xl shadow-xl min-h-[500px] flex flex-col relative group">
                                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                                    <h3 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 flex items-center gap-2">
                                        <Share2 className="text-emerald-400" size={20} />
                                        Process & Thread Graph
                                    </h3>

                                    {/* Manual Ops Container Moved INSIDE Visualizer */}
                                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                        <button onClick={handleFork} className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 transition-all flex items-center gap-1.5 text-[10px] font-black px-3" title="fork()">
                                            <GitBranch size={14} /> fork
                                        </button>
                                        <button onClick={handleCreateThread} className="p-2 hover:bg-cyan-500/10 rounded-lg text-cyan-400 transition-all flex items-center gap-1.5 text-[10px] font-black px-3" title="pthread_create()">
                                            <Plus size={14} /> thread
                                        </button>
                                        <button onClick={handleSleep} className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-400 transition-all flex items-center gap-1.5 text-[10px] font-black px-3" title="sleep()">
                                            <Coffee size={14} /> sleep
                                        </button>
                                        <button onClick={handleWait} className="p-2 hover:bg-amber-500/10 rounded-lg text-amber-400 transition-all flex items-center gap-1.5 text-[10px] font-black px-3" title="wait()">
                                            <Square size={14} /> wait
                                        </button>
                                        <button onClick={handleExit} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-all flex items-center gap-1.5 text-[10px] font-black px-3" title="exit()">
                                            <Skull size={14} /> exit
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto overflow-y-hidden py-10 custom-scrollbar flex items-center">
                                    <div className="flex gap-20 items-center min-w-max px-8 relative">
                                        {processes.map((p) => {
                                            const isActive = selectedId === p.id;
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => setSelectedId(p.id)}
                                                    className={`relative p-4 w-48 rounded-2xl border transition-all cursor-pointer group
                                                        ${isActive ? `ring-2 ring-emerald-500/20 shadow-xl ${getProcBorder(p.pid).replace('/50', '/80')}` : 'border-slate-800'}
                                                        ${p.state === 'running' ? getProcBg(p.pid) : ''}
                                                        ${p.state === 'terminated' ? 'opacity-20 grayscale' : ''}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`text-[9px] font-black tracking-widest ${getProcColor(p.pid)}`}>PID:{p.pid}</span>
                                                        <div className={`text-[8px] font-black px-2 py-0.5 rounded-full ${p.state === 'running' ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                            {p.state.toUpperCase()}
                                                        </div>
                                                    </div>

                                                    <div className="font-black text-sm flex items-center gap-2 truncate mb-4">
                                                        {p.state === 'zombie' ? <Skull className="text-red-500" size={16} /> :
                                                            p.state === 'sleeping' ? <Coffee className={getProcColor(p.pid)} size={16} /> :
                                                                <Activity className={getProcColor(p.pid)} size={16} />}
                                                        {p.name}
                                                    </div>

                                                    {/* Compact Thread Visualization */}
                                                    <div className="space-y-2 pt-3 border-t border-white/5">
                                                        <div className="text-[9px] font-black text-slate-500 flex justify-between items-center">
                                                            T: {p.threads.filter(t => t.state !== 'terminated').length} / {p.threads.length}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {p.threads.map((t) => (
                                                                <div
                                                                    key={t.id}
                                                                    className={`w-2.5 h-2.5 rounded-sm transition-all duration-300 ${t.state === 'terminated' ? 'bg-slate-800 scale-75' : `shadow-[0_0_8px_rgba(59,130,246,0.2)] ${getProcColor(p.pid).replace('text-', 'bg-')}`} `}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Vertical Connector line to parent */}
                                                    {p.parent && (
                                                        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-20 h-0.5 bg-gradient-to-r from-transparent via-slate-800 to-slate-800" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Scripting Console */}
                                <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl flex flex-col shadow-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-black text-sm flex items-center gap-2 uppercase tracking-widest text-slate-500">
                                            <Terminal size={14} className="text-emerald-400" /> Routine
                                        </h4>
                                        <div className="flex gap-2">
                                            <button onClick={handleReset} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"><RefreshCw size={14} /></button>
                                            <button onClick={runCustomCode} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest">Execute</button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={editableCode}
                                        onChange={(e) => setEditableCode(e.target.value)}
                                        className="w-full h-64 bg-slate-950/50 border border-slate-800 rounded-xl p-4 font-mono text-[10px] text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none shadow-inner leading-relaxed"
                                        spellCheck={false}
                                    />
                                </div>

                                {/* Event Journal Container */}
                                <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl flex flex-col h-full shadow-xl">
                                    <h4 className="font-black text-sm flex items-center gap-2 mb-4 uppercase tracking-widest text-slate-500">
                                        <MessageSquare size={14} className="text-emerald-400" /> Kernel
                                    </h4>
                                    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2 h-[260px]">
                                        {logs.slice(0, 10).map((log) => (
                                            <div key={log.id} className={`p-3 bg-slate-950/40 border-l-2 rounded-xl text-[9px] font-mono leading-relaxed flex items-center gap-3 ${log.pid ? getProcBorder(log.pid).replace('border-', 'border-l-') : 'border-l-slate-800'}`}>
                                                <div className="flex-1">
                                                    <span className="text-slate-500">{log.time}: </span>
                                                    <span className={`uppercase font-bold ${log.pid ? getProcColor(log.pid) : 'text-slate-200'}`}>{log.msg}</span>
                                                </div>
                                                {log.pid && (
                                                    <div className={`px-2 py-0.5 rounded text-[7px] font-black text-white ${getProcBg(log.pid).replace('/20', '')}`}>P{log.pid}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Side Context Bar */}
                        <div className="xl:col-span-3 space-y-6">
                            <div className="p-6 bg-gradient-to-b from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-2xl shadow-xl">
                                <h4 className="font-black text-[10px] mb-4 flex items-center gap-2 text-emerald-400 uppercase tracking-widest">Internals</h4>
                                <div className="space-y-4 text-[11px] text-slate-400 leading-relaxed font-bold">
                                    <p>Parent processes enter <b>WAITING</b> mode to collect child signals. This prevents <b>ZOMBIES</b>.</p>
                                    <p>Threads share the same PID but have unique logic flows.</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl shadow-xl">
                                <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Trace Navigation</h4>
                                <div className="space-y-2">
                                    {[1, 2, 3].map(n => (
                                        <div key={n} className="flex items-center gap-2 p-3 bg-slate-950/50 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">n</div>
                                            Layer {n} Map
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center text-center">
                                <Activity className="text-emerald-400 mb-2" size={32} />
                                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Load</div>
                                <div className="text-xl font-black text-white">2.4%</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
                        <div className="lg:col-span-8 space-y-8">
                            {activeTab === 'basics' && (
                                <div className="p-10 bg-slate-900/40 border border-slate-800/80 rounded-[3rem] backdrop-blur-xl">
                                    <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-emerald-400"><Cpu size={28} /> Operating System Core</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { title: 'CPU Scheduling', desc: 'Managing process execution time efficiently.', icon: <Terminal className="text-emerald-400" size={16} /> },
                                            { title: 'Memory Management', desc: 'Allocating and protecting RAM for processes.', icon: <Layers className="text-amber-400" size={16} /> },
                                            { title: 'I/O Management', desc: 'Handling peripheral devices like disks and printers.', icon: <Zap className="text-amber-400" size={16} /> },
                                            { title: 'File Management', desc: 'Organizing persistent data in a structured way.', icon: <Box className="text-emerald-400" size={16} /> },
                                        ].map((item, i) => (
                                            <div key={i} className="p-6 bg-slate-950 border border-slate-800 rounded-3xl hover:border-emerald-500/30 transition-all hover:shadow-2xl">
                                                <div className="flex items-center gap-3 mb-3">
                                                    {item.icon}
                                                    <div className="font-black text-emerald-400 text-sm uppercase tracking-widest">{item.title}</div>
                                                </div>
                                                <div className="text-sm text-slate-400 font-medium">{item.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                            {activeTab === 'process' && (
                                <div className="p-10 bg-slate-900/40 border border-slate-800/80 rounded-[3rem] backdrop-blur-xl">
                                    <h3 className="text-2xl font-black mb-12 flex items-center gap-3 text-emerald-500"><Activity size={28} /> Process Lifecycle Simulator</h3>
                                    <div className="relative h-48 flex items-center justify-between px-10">
                                        {['New', 'Ready', 'Running', 'Waiting', 'Terminated'].map((s, i) => (
                                            <div key={i} className="flex flex-col items-center gap-4 relative z-10 group">
                                                <div
                                                    onClick={() => setProcessState(s as any)}
                                                    className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-500 border-4 shadow-xl ${processState === s ? `bg-gradient-to-br from-emerald-500 to-emerald-600 border-white scale-[1.3] shadow-emerald-500/40 z-20` : 'bg-slate-900 border-slate-800 hover:border-slate-500 hover:scale-110'}`}
                                                >
                                                    <div className="w-3 h-3 bg-white rounded-full group-hover:scale-150 transition-transform" />
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${processState === s ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'}`}>{s}</span>
                                            </div>
                                        ))}
                                        {/* Background connecting track */}
                                        <div className="absolute top-[2rem] left-16 right-16 h-1.5 bg-slate-950 rounded-full -z-1 border border-white/5" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[3rem] shadow-2xl">
                                <h3 className="font-black mb-8 flex items-center gap-3 text-emerald-400 uppercase tracking-widest text-sm"><Layers size={20} /> Architectural Stack</h3>
                                <div className="space-y-2">
                                    {['User Applications', 'Shell / GUI System', 'Standard Libraries', 'System Call Interface', 'Operating System Kernel', 'Hardware Abstraction', 'Physical Hardware'].map((layer, i) => (
                                        <div key={i} className="p-4 bg-slate-950 border border-slate-800/60 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 transition-all hover:bg-emerald-600/10 hover:border-emerald-500/50 hover:text-white" style={{ opacity: 1 - (i * 0.1) }}>
                                            {layer}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
