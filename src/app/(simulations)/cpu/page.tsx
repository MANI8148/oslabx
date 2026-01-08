'use client';

import React, { useState, useEffect } from 'react';
import GanttChart from '@/components/simulations/cpu/GanttChart';
import { Play, RotateCcw, Plus, Trash2, Cpu, Activity, Wand2 } from 'lucide-react';
import { simulationData } from '@/data/simulation_datasets';
import Link from 'next/link';
import { useWasmModule } from '@/hooks/useWasmModule';
import { SchedulerModule, Process } from '@/types/wasm';

type AlgoType = 'fcfs' | 'sjf' | 'rr' | 'priority';

const INITIAL_PROCESSES: Process[] = [
    { id: 1, arrival_time: 0, burst_time: 4, priority: 1, remaining_time: 4 },
    { id: 2, arrival_time: 1, burst_time: 2, priority: 2, remaining_time: 2 },
    { id: 3, arrival_time: 2, burst_time: 3, priority: 1, remaining_time: 3 },
];

export default function CPUPage() {
    const [algorithm, setAlgorithm] = useState<AlgoType>('fcfs');
    const [processes, setProcesses] = useState<Process[]>(INITIAL_PROCESSES);
    const [quantum, setQuantum] = useState(2);
    const [simulationResults, setSimulationResults] = useState<any[]>([]);
    const [rawResults, setRawResults] = useState<Process[]>([]);
    const [stats, setStats] = useState({ avgWait: 0, avgTurnaround: 0, utilization: 0 });
    const [nextId, setNextId] = useState(4);
    const [newProcess, setNewProcess] = useState({ arrival: 0, burst: 1, priority: 1 });

    // Load ALL modules (in a real app, load on demand or parallel)
    const fcfsModule = useWasmModule<SchedulerModule>('/wasm/fcfs.js', 'createFCFSModule');
    const sjfModule = useWasmModule<SchedulerModule>('/wasm/sjf.js', 'createSJFModule');
    const rrModule = useWasmModule<SchedulerModule>('/wasm/round_robin.js', 'createRRModule');
    const priorityModule = useWasmModule<SchedulerModule>('/wasm/priority.js', 'createPriorityModule');

    const getCurrentModule = () => {
        switch (algorithm) {
            case 'fcfs': return fcfsModule;
            case 'sjf': return sjfModule;
            case 'rr': return rrModule;
            case 'priority': return priorityModule;
        }
    };

    const currentModule = getCurrentModule();

    const randomizeProcesses = () => {
        const data = simulationData.cpu[Math.floor(Math.random() * 200)];
        setProcesses(data);
    };

    const handleAddProcess = () => {
        setProcesses([...processes, {
            id: nextId,
            arrival_time: Number(newProcess.arrival),
            burst_time: Number(newProcess.burst),
            priority: Number(newProcess.priority),
            remaining_time: Number(newProcess.burst)
        }]);
        setNextId(nextId + 1);
    };

    const handleRemoveProcess = (id: number) => {
        setProcesses(processes.filter(p => p.id !== id));
    };

    const runSimulation = () => {
        if (!currentModule.module) {
            alert("Module not loaded yet!");
            return;
        }

        try {
            const { Scheduler, Process: WasmProcess, 'vector<Process>': ProcessVector } = currentModule.module;

            const scheduler = new Scheduler();
            const vec = new ProcessVector();

            // Populate vector
            processes.forEach(p => {
                const wp = new WasmProcess();
                wp.id = p.id;
                wp.burst_time = p.burst_time;
                wp.arrival_time = p.arrival_time;
                wp.priority = p.priority || 0;
                wp.remaining_time = p.burst_time;
                wp.completion_time = 0;
                wp.waiting_time = 0;
                wp.turn_around_time = 0;
                vec.push_back(wp);
            });

            // Execute
            let resultVec;
            if (algorithm === 'rr') {
                resultVec = scheduler.round_robin(vec, quantum);
            } else if (algorithm === 'sjf') {
                resultVec = scheduler.sjf(vec);
            } else if (algorithm === 'priority') {
                resultVec = scheduler.priority_scheduling(vec);
            } else {
                resultVec = scheduler.fcfs(vec);
            }

            // Extract results
            const results: Process[] = [];
            let totalWait = 0;
            let totalTurnaround = 0;
            let maxCompletion = 0;

            for (let i = 0; i < resultVec.size(); i++) {
                const p = resultVec.get(i);
                // We need to clone the properties because the Wasm object might be deleted or memory changes
                results.push({
                    id: p.id,
                    burst_time: p.burst_time,
                    arrival_time: p.arrival_time,
                    priority: p.priority,
                    completion_time: p.completion_time,
                    waiting_time: p.waiting_time,
                    turn_around_time: p.turn_around_time
                });

                totalWait += p.waiting_time || 0;
                totalTurnaround += p.turn_around_time || 0;
                if ((p.completion_time || 0) > maxCompletion) maxCompletion = p.completion_time || 0;
            }

            // Calculate Utilization (Total Burst / Max Completion)
            const totalBurst = processes.reduce((acc, curr) => acc + curr.burst_time, 0);
            const util = maxCompletion > 0 ? (totalBurst / maxCompletion) * 100 : 0;

            setStats({
                avgWait: totalWait / results.length,
                avgTurnaround: totalTurnaround / results.length,
                utilization: util
            });

            // Map results to GanttChart format
            // Note: WASM returns Process with completion times.
            // Ideally Gantt needs start/end segments. 
            // For FCFS/SJF/Priority (Non-preemptive), Start = Completion - Burst.
            // For RR, the C++ code returns FINAL completion. It doesn't trace execution steps.
            // To visualize Preemptive properly in Gantt, C++ code needs to return a schedule log.
            // Current C++ implementation only returns final Process struct. 
            // Visualization will be simplified: Show final blocks sorted by completion time.

            const ganttData = results
                .sort((a, b) => (a.completion_time || 0) - (b.completion_time || 0))
                .map((p, idx, arr) => {
                    const end = p.completion_time || 0;
                    const start = end - p.burst_time;
                    return {
                        name: `P${p.id}`,
                        start: start,
                        duration: p.burst_time,
                        color: ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'][p.id % 5]
                    };
                });

            setSimulationResults(ganttData);
            setRawResults(results);

            // Cleanup
            vec.delete();
            scheduler.delete();

        } catch (e) {
            console.error("Simulation failed:", e);
        }
    };

    return (
        <div className="p-8 max-w-full mx-auto min-h-screen bg-slate-950 text-slate-200">
            <header className="mb-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity size={18} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-widest uppercase text-white">OSLabX</h1>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <Cpu className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 tracking-tight">Scheduler Lab</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">CPU Allocation</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Algorithm Selection */}
                    <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-xl">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Policy Selection</label>
                        <select
                            value={algorithm}
                            onChange={(e) => setAlgorithm(e.target.value as AlgoType)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-bold focus:ring-1 focus:ring-emerald-500 outline-none mb-4"
                        >
                            <option value="fcfs">First Come First Serve (FCFS)</option>
                            <option value="sjf">Shortest Job First (SJF)</option>
                            <option value="priority">Priority Scheduling</option>
                            <option value="rr">Round Robin</option>
                        </select>

                        {algorithm === 'rr' && (
                            <div className="mt-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Time Quantum</label>
                                <input
                                    type="number"
                                    value={quantum}
                                    onChange={(e) => setQuantum(Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-bold"
                                />
                            </div>
                        )}
                    </div>

                    {/* Process Input */}
                    <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-xl">
                        <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400 mb-4 px-1">Register Job</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Arrival</label>
                                    <input
                                        type="number"
                                        value={newProcess.arrival}
                                        onChange={e => setNewProcess({ ...newProcess, arrival: Number(e.target.value) })}
                                        className="w-full bg-slate-950 rounded-xl p-3 text-[11px] font-bold border border-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Burst</label>
                                    <input
                                        type="number"
                                        value={newProcess.burst}
                                        onChange={e => setNewProcess({ ...newProcess, burst: Number(e.target.value) })}
                                        className="w-full bg-slate-950 rounded-xl p-3 text-[11px] font-bold border border-slate-800"
                                    />
                                </div>
                            </div>
                            {algorithm === 'priority' && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Priority</label>
                                    <input
                                        type="number"
                                        value={newProcess.priority}
                                        onChange={e => setNewProcess({ ...newProcess, priority: Number(e.target.value) })}
                                        className="w-full bg-slate-950 rounded-xl p-3 text-[11px] font-bold border border-slate-800"
                                    />
                                </div>
                            )}
                            <button
                                onClick={handleAddProcess}
                                className="w-full py-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest text-slate-300"
                            >
                                <Plus size={14} /> Commit Entry
                            </button>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-xl">
                        <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-4 px-1 flex justify-between items-center">
                            Job Queue ({processes.length})
                            <button onClick={randomizeProcesses} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all"><Wand2 size={10} /> Randomize</button>
                        </h3>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {processes.map((p, idx) => (
                                <div key={p.id} className="p-3 bg-slate-950/50 rounded-xl border border-white/5 flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: ['#60a5fa', '#fbbf24', '#f97316', '#34d399'][p.id % 4] }} />
                                        <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <div className="text-slate-300">P{p.id}</div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <span>A:</span>
                                                <input
                                                    type="number"
                                                    className="bg-transparent text-slate-300 w-8 outline-none border-b border-white/5 focus:border-emerald-500/50"
                                                    value={p.arrival_time}
                                                    onChange={(e) => {
                                                        const newProcs = [...processes];
                                                        newProcs[idx] = { ...p, arrival_time: Number(e.target.value) };
                                                        setProcesses(newProcs);
                                                    }}
                                                />
                                                <span>B:</span>
                                                <input
                                                    type="number"
                                                    className="bg-transparent text-slate-300 w-8 outline-none border-b border-white/5 focus:border-emerald-500/50"
                                                    value={p.burst_time}
                                                    onChange={(e) => {
                                                        const newProcs = [...processes];
                                                        newProcs[idx] = { ...p, burst_time: Number(e.target.value) };
                                                        setProcesses(newProcs);
                                                    }}
                                                />
                                                {algorithm === 'priority' && (
                                                    <>
                                                        <span>P:</span>
                                                        <input
                                                            type="number"
                                                            className="bg-transparent text-slate-300 w-8 outline-none border-b border-white/5 focus:border-emerald-500/50"
                                                            value={p.priority}
                                                            onChange={(e) => {
                                                                const newProcs = [...processes];
                                                                newProcs[idx] = { ...p, priority: Number(e.target.value) };
                                                                setProcesses(newProcs);
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveProcess(p.id)} className="text-red-500/50 hover:text-red-500 transition-opacity">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={runSimulation}
                        disabled={currentModule.isLoading || processes.length === 0}
                        className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${currentModule.isLoading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'}`}
                    >
                        {currentModule.isLoading ? 'Loading Kernel...' : <><Play size={16} /> Execute Routine</>}
                    </button>
                </div>

                {/* Visualizer */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-8 rounded-3xl bg-slate-900/20 border border-slate-800/60 min-h-[400px] backdrop-blur-sm relative overflow-hidden">
                        <h3 className="text-xl font-black mb-10 uppercase tracking-tight">Execution Visualization</h3>

                        {simulationResults.length > 0 ? (
                            <>
                                <GanttChart data={simulationResults} />

                                <div className="mt-12 overflow-x-auto">
                                    <h4 className="text-[10px] font-black text-slate-500 mb-6 uppercase tracking-widest px-1">Register Table</h4>
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-950/50 text-[10px] uppercase font-black tracking-widest text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-xl">PID</th>
                                                <th className="px-4 py-3">AT</th>
                                                <th className="px-4 py-3">BT</th>
                                                <th className="px-4 py-3">CT</th>
                                                <th className="px-4 py-3 text-amber-400">TAT</th>
                                                <th className="px-4 py-3 rounded-r-xl text-emerald-400">WT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-bold">
                                            {rawResults.sort((a, b) => (a.completion_time || 0) - (b.completion_time || 0)).map((p) => (
                                                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-slate-200">P{p.id}</td>
                                                    <td className="px-4 py-3 text-slate-500">{p.arrival_time}</td>
                                                    <td className="px-4 py-3 text-slate-500">{p.burst_time}</td>
                                                    <td className="px-4 py-3 text-emerald-400">{p.completion_time}</td>
                                                    <td className="px-4 py-3 text-amber-400">{p.turn_around_time}</td>
                                                    <td className="px-4 py-3 text-emerald-400">{p.waiting_time}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-800 border-2 border-dashed border-slate-800/40 rounded-2xl">
                                <span className="font-black uppercase tracking-widest text-[10px] opacity-20">Idle</span>
                            </div>
                        )}

                        <div className="mt-12">
                            <h4 className="text-[10px] font-black text-slate-500 mb-6 uppercase tracking-widest px-1">Kernel Metrics</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-6 bg-slate-950/40 rounded-2xl border border-white/5 flex flex-col items-center">
                                    <div className="text-2xl font-black text-emerald-400">{stats.avgWait.toFixed(1)}</div>
                                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Wait</div>
                                </div>
                                <div className="p-6 bg-slate-950/40 rounded-2xl border border-white/5 flex flex-col items-center">
                                    <div className="text-2xl font-black text-amber-400">{stats.avgTurnaround.toFixed(1)}</div>
                                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">TAT</div>
                                </div>
                                <div className="p-6 bg-slate-950/40 rounded-2xl border border-white/5 flex flex-col items-center">
                                    <div className="text-2xl font-black text-emerald-400">{stats.utilization.toFixed(1)}%</div>
                                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Util</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
