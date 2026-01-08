'use client';

import React, { useState, useEffect } from 'react';
import MemoryMap from '@/components/simulations/ram/MemoryMap';
import { useWasmModule } from '@/hooks/useWasmModule';
import { MemoryFitModule, PageReplacementModule, AllocationResult, MemoryBlock, ProcessRequest, PageStep } from '@/types/wasm';
import { Plus, Play, RotateCcw, Activity, Layers, Cpu, Database, Server, Info, ArrowRight, Minus, Settings, Monitor, Shield, Zap, Wand2 } from 'lucide-react';
import { simulationData } from '@/data/simulation_datasets';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RAMPage() {
    const [activeTab, setActiveTab] = useState<'fit' | 'paging' | 'thrashing'>('paging');

    // Fit State
    const [fitAlgo, setFitAlgo] = useState<'first' | 'best' | 'worst'>('first');
    const [blocks, setBlocks] = useState<MemoryBlock[]>([
        { id: 1, size: 100, allocated: false, process_id: -1 },
        { id: 2, size: 500, allocated: false, process_id: -1 },
        { id: 3, size: 200, allocated: false, process_id: -1 },
        { id: 4, size: 300, allocated: false, process_id: -1 },
        { id: 5, size: 600, allocated: false, process_id: -1 },
    ]);
    const [requests, setRequests] = useState<ProcessRequest[]>([
        { id: 1, size: 212, allocated: false, block_id: -1 },
        { id: 2, size: 417, allocated: false, block_id: -1 },
        { id: 3, size: 112, allocated: false, block_id: -1 },
        { id: 4, size: 426, allocated: false, block_id: -1 },
    ]);

    // Page State
    const [pageAlgo, setPageAlgo] = useState<'fifo' | 'lru' | 'optimal' | 'lfu' | 'mfu'>('fifo');
    const [pageString, setPageString] = useState('1,3,0,3,5,6,3');
    const [framesCapacity, setFramesCapacity] = useState(3);
    const [pageSteps, setPageSteps] = useState<PageStep[]>([]);
    const [pageFaults, setPageFaults] = useState(0);
    const [activeStepIdx, setActiveStepIdx] = useState(0);

    // Thrashing State
    const [thrashingData, setThrashingData] = useState<any[]>([]);

    // Modules
    const fitModule = useWasmModule<MemoryFitModule>('/wasm/memory_fit.js', 'createMemoryFitModule');
    const pageModule = useWasmModule<PageReplacementModule>('/wasm/page_replacement.js', 'createPageReplacementModule');

    // Run Fit
    const runFit = async () => {
        if (!fitModule.module) return;
        try {
            const { MemoryManager, 'vector<MemoryBlock>': VecBlock, 'vector<ProcessRequest>': VecReq } = fitModule.module;
            const manager = new MemoryManager();
            const vecBlocks = new VecBlock();
            const vecReqs = new VecReq();

            blocks.forEach(b => vecBlocks.push_back({ ...b, allocated: false, process_id: -1 }));
            requests.forEach(r => vecReqs.push_back({ ...r, allocated: false, block_id: -1 }));

            let result: AllocationResult;
            if (fitAlgo === 'first') result = manager.first_fit(vecBlocks, vecReqs);
            else if (fitAlgo === 'best') result = manager.best_fit(vecBlocks, vecReqs);
            else result = manager.worst_fit(vecBlocks, vecReqs);

            const newBlocks: MemoryBlock[] = [];
            const newRequests: ProcessRequest[] = [];
            for (let i = 0; i < result.blocks.size(); i++) newBlocks.push(result.blocks.get(i));
            for (let i = 0; i < result.processes.size(); i++) newRequests.push(result.processes.get(i));

            setBlocks(newBlocks);
            setRequests(newRequests);
            manager.delete(); vecBlocks.delete(); vecReqs.delete();
        } catch (e) { console.error(e); }
    };

    // Run Page replacement
    const runPage = async () => {
        if (!pageModule.module) return;
        try {
            const { PageReplacement, 'vector<int>': VecInt } = pageModule.module;
            const pr = new PageReplacement();
            const pagesVec = new VecInt();
            const pages = pageString.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            pages.forEach(p => pagesVec.push_back(p));

            let resultVec;
            if (pageAlgo === 'fifo') resultVec = pr.fifo(pagesVec, framesCapacity);
            else if (pageAlgo === 'lru') resultVec = pr.lru(pagesVec, framesCapacity);
            else if (pageAlgo === 'lfu') resultVec = pr.lfu(pagesVec, framesCapacity);
            else if (pageAlgo === 'mfu') resultVec = pr.mfu(pagesVec, framesCapacity);
            else resultVec = pr.optimal(pagesVec, framesCapacity);

            const steps: PageStep[] = [];
            let faults = 0;
            for (let i = 0; i < resultVec.size(); i++) {
                const s = resultVec.get(i);
                const frames: number[] = [];
                for (let k = 0; k < s.frames.size(); k++) frames.push(s.frames.get(k));
                steps.push({ page: s.page, step: s.step, frames: frames, fault: s.fault });
                if (s.fault) faults++;
            }
            setPageSteps(steps);
            setPageFaults(faults);
            setActiveStepIdx(0);
            pr.delete(); pagesVec.delete();
        } catch (e) { console.error(e); }
    };

    const randomizePartitions = () => {
        const data = simulationData.files[Math.floor(Math.random() * 200)]; // Reusing file sizes for partitions
        setBlocks(data.map((s, i) => ({ id: i + 1, size: s * 50, allocated: false, process_id: -1 })));
    };

    const randomizePages = () => {
        const data = simulationData.pages[Math.floor(Math.random() * 200)];
        setPageString(data);
    };

    const runThrashing = () => {
        const data = [];
        for (let n = 1; n <= 20; n++) {
            let util = n <= 12 ? 10 * Math.log2(n + 1) + (n * 2) : (12 * 8) / (n - 10) + 10;
            data.push({ degree: n, cpu: Math.min(util, 95) });
        }
        setThrashingData(data);
    };

    const mappedBlocks = blocks.map(b => ({
        id: b.id.toString(),
        size: b.size,
        type: (b.allocated ? 'process' : 'free') as 'process' | 'free',
        label: b.allocated ? `P${b.process_id}` : `Free`
    }));

    return (
        <div className="p-8 max-w-full mx-auto min-h-screen bg-slate-950 text-slate-200 font-sans">
            <header className="mb-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity size={18} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-widest uppercase">OSLabX</h1>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-600/10 rounded-xl border border-emerald-500/20">
                        <Layers className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 tracking-tight">Memory Lab</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Paging & Allocation</p>
                    </div>
                </div>
            </header>

            <div className="flex bg-slate-900/40 p-1 rounded-xl border border-slate-800/80 w-fit mb-8 backdrop-blur-3xl shadow-xl">
                {[
                    { id: 'fit', label: 'Contiguous', icon: <Plus size={16} /> },
                    { id: 'paging', label: 'Paging', icon: <Database size={16} /> },
                    { id: 'thrashing', label: 'Thrashing', icon: <Activity size={16} /> },
                ].map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => setActiveTab(btn.id as any)}
                        className={`px-6 py-2.5 rounded-lg font-black transition-all flex items-center gap-3 text-[10px] uppercase tracking-widest ${activeTab === btn.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        {btn.icon} {btn.label}
                    </button>
                ))}
            </div>

            {activeTab === 'fit' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-xl">
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400 mb-4">Allocation Policy</h3>
                            <select className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-bold mb-4 focus:ring-1 focus:ring-emerald-500/50 outline-none" value={fitAlgo} onChange={(e: any) => setFitAlgo(e.target.value)}>
                                <option value="first">First Fit Policy</option>
                                <option value="best">Best Fit Policy</option>
                                <option value="worst">Worst Fit Policy</option>
                            </select>

                            <div className="mb-6">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2 flex justify-between">
                                    Memory Partitions
                                    <button onClick={randomizePartitions} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all"><Wand2 size={10} /> Randomize</button>
                                </label>
                                <div className="flex gap-2 mb-4">
                                    <input type="number" placeholder="Block Size (KB)" className="flex-1 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs focus:ring-1 focus:ring-emerald-500" onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = parseInt(e.currentTarget.value);
                                            if (val > 0) { setBlocks([...blocks, { id: blocks.length + 1, size: val, allocated: false, process_id: -1 }]); e.currentTarget.value = ''; }
                                        }
                                    }} />
                                    <button onClick={() => setBlocks([])} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"><RotateCcw size={18} /></button>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {blocks.map((b, idx) => (
                                        <div key={b.id} className="flex justify-between text-[11px] bg-slate-950/50 p-3 rounded-xl border border-white/5 items-center">
                                            <span className="text-slate-600 font-black">BLK_{b.id}</span>
                                            <input
                                                type="number"
                                                className="bg-transparent text-white font-bold w-16 outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-1"
                                                value={b.size}
                                                onChange={(e) => {
                                                    const newBlocks = [...blocks];
                                                    newBlocks[idx] = { ...b, size: Number(e.target.value) };
                                                    setBlocks(newBlocks);
                                                }}
                                            />
                                            <span className="text-slate-500 font-black">KB</span>
                                            <button onClick={() => setBlocks(blocks.filter(x => x.id !== b.id))} className="text-red-900 hover:text-red-500 text-lg">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button onClick={runFit} className="w-full py-4 bg-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center">
                                Execute Allocation
                            </button>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 transition-all">
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-4 px-1">Process Queue</h3>
                            <div className="flex gap-2 mb-4">
                                <input type="number" placeholder="Req Size (K)" className="flex-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs focus:ring-1 focus:ring-emerald-500" onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = parseInt(e.currentTarget.value);
                                        if (val > 0) { setRequests([...requests, { id: requests.length + 1, size: val, allocated: false, block_id: -1 }]); e.currentTarget.value = ''; }
                                    }
                                }} />
                                <button onClick={() => setRequests([])} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"><RotateCcw size={16} /></button>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {requests.map((r, idx) => (
                                    <div key={r.id} className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 flex justify-between items-center group">
                                        <div className="flex gap-4 items-center">
                                            <div className={`w-2 h-2 rounded-full ${r.allocated ? 'bg-emerald-500' : 'bg-slate-700 animate-pulse'}`} />
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-black uppercase text-slate-400">P_{r.id}</span>
                                                <input
                                                    type="number"
                                                    className="bg-transparent text-white font-bold w-12 text-xs outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-1"
                                                    value={r.size}
                                                    onChange={(e) => {
                                                        const newReqs = [...requests];
                                                        newReqs[idx] = { ...r, size: Number(e.target.value) };
                                                        setRequests(newReqs);
                                                    }}
                                                />
                                                <span className="text-[10px] text-slate-500 font-bold">K</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${r.allocated ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                                {r.allocated ? `Part_${r.block_id}` : 'Wait'}
                                            </span>
                                            <button onClick={() => setRequests(requests.filter(x => x.id !== r.id))} className="text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="p-8 rounded-3xl bg-slate-900/20 border border-slate-800/60 h-full backdrop-blur-sm relative overflow-hidden">
                            <h3 className="text-xl font-black mb-8 uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-800">Memory Mapping</h3>
                            <MemoryMap blocks={mappedBlocks} />
                        </div>
                    </div>
                </div>
            ) : activeTab === 'paging' ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 bg-slate-900/30 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-xl">
                        <div className="md:col-span-3">
                            <label className="block text-[8px] font-black uppercase text-emerald-500 mb-2 tracking-widest px-1">Policy</label>
                            <select className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] font-black outline-none" value={pageAlgo} onChange={(e: any) => setPageAlgo(e.target.value)}>
                                <option value="fifo">FIFO</option>
                                <option value="lru">LRU</option>
                                <option value="optimal">MIN</option>
                                <option value="lfu">LFU</option>
                            </select>
                        </div>
                        <div className="md:col-span-6">
                            <label className="block text-[8px] font-black uppercase text-slate-500 mb-2 tracking-widest px-1 flex justify-between">
                                Logical Stream
                                <button onClick={randomizePages} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all"><Wand2 size={10} /> Randomize</button>
                            </label>
                            <input className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-400" value={pageString} onChange={(e) => setPageString(e.target.value)} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[8px] font-black uppercase text-slate-500 mb-2 tracking-widest px-1">Frames</label>
                            <input className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-center font-black" type="number" value={framesCapacity} onChange={(e) => setFramesCapacity(Number(e.target.value))} />
                        </div>
                        <div className="md:col-span-2 flex items-end">
                            <button onClick={runPage} className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center">Simulate</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Visualization Core */}
                        <div className="lg:col-span-3 p-8 bg-slate-900/20 border border-slate-800/60 rounded-3xl min-h-[500px] flex flex-col backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Paging Registry</h3>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Full execution trace across logical time</p>
                                </div>
                                <div className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center">
                                    <span className="text-[7px] font-black text-red-500 uppercase tracking-widest mb-0.5">Total Faults</span>
                                    <span className="text-xl font-black text-white tabular-nums">{pageFaults}</span>
                                </div>
                            </div>

                            {pageSteps.length > 0 ? (
                                <div className="flex-1 overflow-x-auto custom-scrollbar">
                                    <div className="min-w-max pb-4">
                                        <div className="flex flex-col border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                                            {/* Header Row: Pages */}
                                            <div className="flex h-16 border-b border-slate-800 bg-slate-900/50">
                                                <div className="w-24 border-r border-slate-800 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 tracking-tighter">PAGE REQ</div>
                                                {pageSteps.map((s, i) => (
                                                    <div key={i} className={`flex-1 min-w-[60px] flex flex-col items-center justify-center border-r border-slate-800 last:border-0 ${s.fault ? 'bg-red-500/5' : 'bg-emerald-500/5'}`}>
                                                        <span className="text-[8px] opacity-40 font-black">T{i}</span>
                                                        <span className="text-lg font-black">{s.page}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Frame Rows */}
                                            {[...Array(framesCapacity)].map((_, frameIdx) => (
                                                <div key={frameIdx} className="flex h-14 border-b border-slate-800 last:border-b-0 group">
                                                    <div className="w-24 border-r border-slate-800 flex items-center justify-center text-[9px] font-black uppercase text-slate-600 group-hover:text-emerald-400 transition-colors">FRAME {frameIdx}</div>
                                                    {pageSteps.map((s, stepIdx) => (
                                                        <div key={stepIdx} className="flex-1 min-w-[60px] flex items-center justify-center border-r border-slate-800 last:border-0 font-black text-sm text-slate-300">
                                                            {s.frames[frameIdx] !== undefined ? s.frames[frameIdx] : '-'}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}

                                            {/* Status Row */}
                                            <div className="flex h-10 bg-slate-900/30">
                                                <div className="w-24 border-r border-slate-800 flex items-center justify-center text-[9px] font-black uppercase text-slate-700 tracking-widest">STATUS</div>
                                                {pageSteps.map((s, i) => (
                                                    <div key={i} className={`flex-1 min-w-[60px] flex items-center justify-center border-r border-slate-800 last:border-0 text-[8px] font-black uppercase tracking-tighter ${s.fault ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {s.fault ? 'MISS' : 'HIT'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/40 rounded-3xl text-slate-800">
                                    <Database size={48} className="mb-4 opacity-10" />
                                    <span className="font-black uppercase tracking-widest opacity-20 text-[10px]">Awaiting Trace</span>
                                </div>
                            )}
                        </div>

                        {/* Theory Content */}
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-900/30 border border-slate-800/60 rounded-2xl backdrop-blur-md">
                                <h4 className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest mb-4">
                                    <Zap size={16} className="text-emerald-500" /> Concept
                                </h4>
                                <div className="space-y-4">
                                    <div className="group">
                                        <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">What is Paging?</h5>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Scheme dividing memory into fixed-size <b>Frames</b> (Physical) and <b>Pages</b> (Logical).</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-emerald-600/5 border border-emerald-500/20 rounded-2xl relative overflow-hidden group">
                                <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">Fragmentation</h4>
                                <p className="text-[10px] text-slate-500 font-bold italic leading-relaxed">Internal fragmentation occurs when the final page of a process is not completely filled.</p>
                            </div>
                        </div>
                    </div>
                </div>

            ) : (
                <div className="space-y-8 animate-in fade-in duration-700">
                    <div className="p-8 bg-slate-900/20 border border-slate-800/60 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                        <div className="flex justify-between items-center mb-10 px-2">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Thrashing Analysis</h3>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Swapping Overflow</p>
                            </div>
                            <button onClick={runThrashing} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95">
                                <Activity size={16} /> STRESS TEST
                            </button>
                        </div>

                        {thrashingData.length > 0 ? (
                            <div className="h-[400px] w-full p-6 bg-slate-950/40 rounded-2xl border border-white/5 shadow-inner">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={thrashingData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="degree" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={{ stroke: '#1e293b' }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={{ stroke: '#1e293b' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#020617', borderRadius: '1rem', border: '1px solid #1e293b' }} />
                                        <Line type="monotone" dataKey="cpu" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800/40 rounded-3xl text-slate-800 bg-slate-950/20">
                                <Activity size={48} className="mb-4 opacity-10 animate-pulse" />
                                <span className="font-black uppercase tracking-widest opacity-20 text-[10px]">Ready</span>
                            </div>
                        )}

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-black/20 border border-white/5 rounded-2xl">
                                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Threshold</h4>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Point where swapping outweighs execution.</p>
                            </div>
                            <div className="p-6 bg-red-600/5 border border-red-500/20 rounded-2xl flex items-center gap-4">
                                <Shield className="text-red-500" size={24} />
                                <div>
                                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">Counter-Measure</h4>
                                    <p className="text-[10px] text-slate-500 font-bold italic leading-relaxed">Working Set Models & Page Fault Frequency.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
