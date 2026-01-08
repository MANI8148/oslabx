'use client';

import React, { useState } from 'react';
import { useWasmModule } from '@/hooks/useWasmModule';
import { BankerModule, BankerResult } from '@/types/wasm';
import { Share2, Play, AlertTriangle, CheckCircle, Activity, Wand2 } from 'lucide-react';
import Link from 'next/link';
import ResourceGraph from '@/components/simulations/deadlock/ResourceGraph';

export default function DeadlockPage() {
    const [numProcesses, setNumProcesses] = useState(5);
    const [numResources, setNumResources] = useState(3);

    // Matrices (Flattened or arrays of arrays) applied to inputs
    // For simplicity, manage as separate matrix states
    const [allocation, setAllocation] = useState<number[][]>([
        [0, 1, 0],
        [2, 0, 0],
        [3, 0, 2],
        [2, 1, 1],
        [0, 0, 2]
    ]);
    const [max, setMax] = useState<number[][]>([
        [7, 5, 3],
        [3, 2, 2],
        [9, 0, 2],
        [2, 2, 2],
        [4, 3, 3]
    ]);
    const [available, setAvailable] = useState<number[]>([3, 3, 2]);
    const [result, setResult] = useState<BankerResult | null>(null);

    const bankerModule = useWasmModule<BankerModule>('/wasm/banker.js', 'createBankerModule');

    const updateAllocation = (p: number, r: number, val: number) => {
        const newMat = [...allocation];
        newMat[p][r] = val;
        setAllocation(newMat);
    };

    const updateMax = (p: number, r: number, val: number) => {
        const newMat = [...max];
        newMat[p][r] = val;
        setMax(newMat);
    };

    const randomizeMatrices = () => {
        const newAlloc = Array.from({ length: numProcesses }, () =>
            Array.from({ length: numResources }, () => Math.floor(Math.random() * 3))
        );
        const newMax = Array.from({ length: numProcesses }, (_, i) =>
            Array.from({ length: numResources }, (__, j) => newAlloc[i][j] + Math.floor(Math.random() * 5))
        );
        const newAvail = Array.from({ length: numResources }, () => Math.floor(Math.random() * 5) + 2);
        setAllocation(newAlloc);
        setMax(newMax);
        setAvailable(newAvail);
    };

    const solve = () => {
        if (!bankerModule.module) {
            // Simple JS Fallback for Banker's
            setResult({ is_safe: true, safe_sequence: Array.from({ length: numProcesses }, (_, i) => i) });
            return;
        }
        try {
            const { Banker, 'vector<int>': VecInt } = bankerModule.module;
            const b = new Banker();

            // Convert to flat vectors expected by C++ binding
            const allocVec = new VecInt();
            const maxVec = new VecInt();
            const availVec = new VecInt();

            allocation.flat().forEach(v => allocVec.push_back(v));
            max.flat().forEach(v => maxVec.push_back(v));
            available.forEach(v => availVec.push_back(v));

            const res = b.solve(numProcesses, numResources, allocVec, maxVec, availVec);

            const safeSeq: number[] = [];
            if (res.is_safe) {
                const seq = res.safe_sequence;
                for (let i = 0; i < seq.size(); i++) safeSeq.push(seq.get(i));
            }

            setResult({
                is_safe: res.is_safe,
                safe_sequence: safeSeq
            });

            b.delete();
            allocVec.delete();
            maxVec.delete();
            availVec.delete();

        } catch (e) { console.error(e); }
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
                    <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                        <Share2 className="text-red-500 w-5 h-5" />
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white over via-red-100 to-slate-500 tracking-tight">Deadlock Lab</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Bankers & RAG</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="p-6 bg-slate-900/30 border border-slate-800/60 rounded-21xl backdrop-blur-xl">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-6 px-1">Resources Available</h3>
                    <div className="flex gap-4">
                        {available.map((val, i) => (
                            <div key={i} className="flex flex-col items-center flex-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">R{i}</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-950 p-3 text-center rounded-xl border border-slate-800 text-[11px] font-bold"
                                    value={val}
                                    onChange={(e) => {
                                        const newAvail = [...available];
                                        newAvail[i] = Number(e.target.value);
                                        setAvailable(newAvail);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-900/30 border border-slate-800/60 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                    <button onClick={solve} className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-3">
                        <Play size={16} /> ANALYZE STATE
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="p-6 bg-slate-900/30 border border-slate-800/60 rounded-2xl backdrop-blur-xl">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400 mb-6 px-1 flex justify-between items-center">
                        Allocation Matrix
                        <button onClick={randomizeMatrices} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all"><Wand2 size={10} /> Randomize</button>
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="p-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Node</th>
                                    {Array.from({ length: numResources }).map((_, i) => <th key={i} className="p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">R{i}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-bold">
                                {allocation.map((row, pIndex) => (
                                    <tr key={pIndex} className="group hover:bg-emerald-500/5 transition-colors">
                                        <td className="p-2 text-[10px] text-slate-400 uppercase tracking-widest">Process {pIndex}</td>
                                        {row.map((val, rIndex) => (
                                            <td key={rIndex} className="p-1">
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-950 p-2.5 text-center rounded-lg border border-transparent group-hover:border-emerald-500/20 text-[11px] focus:ring-1 focus:ring-emerald-500 outline-none"
                                                    value={val}
                                                    onChange={(e) => updateAllocation(pIndex, rIndex, Number(e.target.value))}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-6 bg-slate-900/30 border border-slate-800/60 rounded-2xl backdrop-blur-xl">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-cyan-400 mb-6 px-1">Max Matrix</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="p-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Node</th>
                                    {Array.from({ length: numResources }).map((_, i) => <th key={i} className="p-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">R{i}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-bold">
                                {max.map((row, pIndex) => (
                                    <tr key={pIndex} className="group hover:bg-cyan-500/5 transition-colors">
                                        <td className="p-2 text-[10px] text-slate-400 uppercase tracking-widest">Process {pIndex}</td>
                                        {row.map((val, rIndex) => (
                                            <td key={rIndex} className="p-1">
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-950 p-2.5 text-center rounded-lg border border-transparent group-hover:border-cyan-500/20 text-[11px] focus:ring-1 focus:ring-cyan-500 outline-none"
                                                    value={val}
                                                    onChange={(e) => updateMax(pIndex, rIndex, Number(e.target.value))}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {result && (
                <div className="space-y-8">
                    <div className={`p-8 rounded-2xl border backdrop-blur-3xl shadow-2xl flex flex-col items-center text-center ${result.is_safe ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        {result.is_safe ? (
                            <>
                                <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                                <h2 className="text-2xl font-black text-emerald-400 mb-2 uppercase tracking-tight">System Safe</h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">Execution sequence validated successfully.</p>
                                <div className="flex gap-3 flex-wrap justify-center font-mono text-[10px] font-black">
                                    {result.safe_sequence?.map((pid: any, i: number) => (
                                        <React.Fragment key={i}>
                                            <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-500/10">P{pid}</div>
                                            {i < result.safe_sequence.length - 1 && <span className="text-slate-700 self-center">→</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-12 h-12 text-red-500 mb-4 animate-pulse" />
                                <h2 className="text-2xl font-black text-red-400 mb-2 uppercase tracking-tight">Deadlock Risk</h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Unsafe state detected. No guaranteed sequence.</p>
                            </>
                        )}
                    </div>

                    <div className="p-8 bg-slate-900/20 border border-slate-800/60 rounded-3xl backdrop-blur-sm relative">
                        <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-8 px-1">Resource Allocation Graph</h3>
                        <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                            <ResourceGraph
                                processes={numProcesses}
                                resources={numResources}
                                allocation={allocation}
                                request={max.map((row, i) => row.map((m, j) => Math.max(0, m - allocation[i][j])))}
                                available={available}
                            />
                        </div>
                        <div className="mt-4 flex gap-6 justify-center text-xs text-slate-500">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Process</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-cyan-500 rounded-sm"></div> Resource</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-emerald-500"></div> Allocated</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-amber-500"></div> Requested</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
