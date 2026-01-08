'use client';

import React, { useState } from 'react';
import { useWasmModule } from '@/hooks/useWasmModule';
import { DiskSchedulerModule, DiskResult, FileAllocationModule, FileAllocationResult, FileInfo, DiskBlock } from '@/types/wasm';
import { HardDrive, Play, RotateCcw, Database, Layers, Share2, Activity, Wand2 } from 'lucide-react';
import { simulationData } from '@/data/simulation_datasets';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FileSystemPage() {
    const [activeTab, setActiveTab] = useState<'scheduling' | 'allocation'>('scheduling');

    // --- DISK SCHEDULING STATE ---
    const [algo, setAlgo] = useState<'fcfs' | 'sstf' | 'scan' | 'c_scan'>('fcfs');
    const [head, setHead] = useState(50);
    const [diskSize, setDiskSize] = useState(200);
    const [requestString, setRequestString] = useState('82,170,43,140,24,16,190');
    const [result, setResult] = useState<DiskResult | null>(null);
    const [graphData, setGraphData] = useState<any[]>([]);

    const diskModule = useWasmModule<DiskSchedulerModule>('/wasm/disk_scheduling.js', 'createDiskSchedulingModule');

    const runSimulation = () => {
        if (!diskModule.module) {
            // Mock Fallback
            const seq = requestString.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            let current = head;
            let total = 0;
            const fullSeq = [head, ...seq];
            for (let i = 1; i < fullSeq.length; i++) {
                total += Math.abs(fullSeq[i] - fullSeq[i - 1]);
            }
            setResult({ seek_sequence: fullSeq, total_seek_count: total });
            setGraphData(fullSeq.map((track, i) => ({ step: i, track })));
            return;
        }
        try {
            // ... WASM logic remains ...
            const { DiskScheduler, 'vector<int>': VecInt } = diskModule.module;
            const scheduler = new DiskScheduler();
            const vec = new VecInt();
            const requests = requestString.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));

            requests.forEach(r => vec.push_back(r));

            let res: DiskResult;
            if (algo === 'fcfs') res = scheduler.fcfs(vec, head);
            else if (algo === 'sstf') res = scheduler.sstf(vec, head);
            else if (algo === 'scan') res = scheduler.scan(vec, head, diskSize, 1);
            else res = scheduler.c_scan(vec, head, diskSize);

            const sequence: number[] = [];
            const wasmSeq = res.seek_sequence;
            for (let i = 0; i < wasmSeq.size(); i++) sequence.push(wasmSeq.get(i));

            setResult({
                seek_sequence: sequence,
                total_seek_count: res.total_seek_count
            });

            const data = sequence.map((track, i) => ({ step: i, track }));
            setGraphData(data);

            scheduler.delete();
            vec.delete();
        } catch (e) { console.error(e); }
    };

    const randomizeDisk = () => {
        const rand = simulationData.disk[Math.floor(Math.random() * 200)];
        setRequestString(rand);
        setHead(Math.floor(Math.random() * 100));
    };

    // --- FILE ALLOCATION STATE ---
    const [allocAlgo, setAllocAlgo] = useState<'contiguous' | 'linked' | 'indexed'>('contiguous');
    const [totalBlocks, setTotalBlocks] = useState(50);
    const [files, setFiles] = useState<Array<{ id: number, size: number }>>([
        { id: 1, size: 5 }, { id: 2, size: 3 }, { id: 3, size: 4 }
    ]);
    const [allocResult, setAllocResult] = useState<{ disk: DiskBlock[], fileInfos: FileInfo[] } | null>(null);

    const allocModule = useWasmModule<FileAllocationModule>('/wasm/file_allocation.js', 'createFileAllocationModule');

    const runAllocation = () => {
        if (!allocModule.module) {
            // Mock Fallback for Allocation
            const disk: DiskBlock[] = Array.from({ length: totalBlocks }, (_, i) => ({
                id: i,
                fileId: -1,
                nextBlock: -1
            }));
            const fileInfos: FileInfo[] = [];
            let currentBlock = 0;

            files.forEach((f) => {
                const blks: number[] = [];
                if (currentBlock + f.size <= totalBlocks) {
                    for (let i = 0; i < f.size; i++) {
                        disk[currentBlock + i].fileId = f.id;
                        blks.push(currentBlock + i);
                        if (i < f.size - 1) disk[currentBlock + i].nextBlock = currentBlock + i + 1;
                    }
                    fileInfos.push({
                        id: f.id,
                        size: f.size,
                        startBlock: currentBlock,
                        length: f.size,
                        blocks: null,
                        blockArray: blks
                    });
                    currentBlock += f.size;
                }
            });

            setAllocResult({ disk, fileInfos });
            return;
        }
        try {
            const { FileAllocationManager, 'vector<FileInfo>': VecFiles } = allocModule.module;
            const manager = new FileAllocationManager();
            const vecFiles = new VecFiles();

            const wasm = allocModule.module;
            files.forEach(f => {
                const info = {
                    id: f.id,
                    size: f.size,
                    startBlock: -1,
                    length: 0
                } as any;
                if (!info.blocks) info.blocks = new wasm!['vector<int>']();
                vecFiles.push_back(info);
            });

            let res: FileAllocationResult;
            if (allocAlgo === 'contiguous') res = manager.contiguous(totalBlocks, vecFiles);
            else if (allocAlgo === 'linked') res = manager.linked(totalBlocks, vecFiles);
            else res = manager.indexed(totalBlocks, vecFiles);

            // Convert result to JS arrays
            const diskBlocks: DiskBlock[] = [];
            const diskVec = res.disk;
            for (let i = 0; i < diskVec.size(); i++) {
                const b = diskVec.get(i);
                diskBlocks.push({
                    id: b.id,
                    fileId: b.fileId,
                    nextBlock: b.nextBlock
                });
            }

            const fileInfos: FileInfo[] = [];
            const filesVec = res.files;
            for (let i = 0; i < filesVec.size(); i++) {
                const f = filesVec.get(i);

                // Extract inner vector
                const blks: number[] = [];
                const bVec = f.blocks;
                for (let k = 0; k < bVec.size(); k++) blks.push(bVec.get(k));

                fileInfos.push({
                    id: f.id,
                    size: f.size,
                    startBlock: f.startBlock,
                    length: f.length,
                    blocks: f.blocks,
                    blockArray: blks
                });
            }

            setAllocResult({
                disk: diskBlocks,
                fileInfos: fileInfos
            });

            manager.delete();
            vecFiles.delete();

        } catch (e) { console.error(e); }
    };

    const randomizeAlloc = () => {
        const sizes = simulationData.files[Math.floor(Math.random() * 200)];
        setFiles(sizes.map((s, i) => ({ id: i + 1, size: s })));
    };

    const getBlockColor = (fileId: number) => {
        if (fileId === -1) return 'bg-slate-800/50 border-slate-700';
        const colors = [
            'bg-emerald-500 border-emerald-400',
            'bg-orange-500 border-orange-400',
            'bg-cyan-500 border-cyan-400',
            'bg-amber-500 border-amber-400',
            'bg-lime-500 border-lime-400',
            'bg-sky-500 border-sky-400',
        ];
        return colors[(fileId - 1) % colors.length];
    };

    return (
        <div className="p-8 max-w-full mx-auto min-h-screen bg-slate-950 text-slate-200">
            <header className="mb-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity size={18} className="text-white" />
                    </div>
                    <h1 className="text-xl font-black tracking-widest uppercase">OSLabX</h1>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <HardDrive className="text-emerald-500 w-5 h-5" />
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 tracking-tight">File System Lab</h2>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Disk & Storage</p>
                    </div>
                </div>
                {/* Tabs */}
                <div className="flex bg-slate-900/40 p-1 rounded-xl border border-slate-800/80 w-fit backdrop-blur-3xl shadow-xl">
                    {[
                        { id: 'scheduling', label: 'Disk', icon: <Layers size={16} /> },
                        { id: 'allocation', label: 'Allocation', icon: <Database size={16} /> },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => setActiveTab(btn.id as any)}
                            className={`px-6 py-2.5 rounded-lg font-black transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest ${activeTab === btn.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {btn.icon} {btn.label}
                        </button>
                    ))}
                </div>
            </header>

            {activeTab === 'scheduling' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-xl">
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400 mb-4">Settings</h3>

                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Algorithm</label>
                            <select className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-bold mb-4 focus:ring-1 focus:ring-emerald-500/50 outline-none" value={algo} onChange={(e: any) => setAlgo(e.target.value)}>
                                <option value="fcfs">FCFS</option>
                                <option value="sstf">SSTF</option>
                                <option value="scan">SCAN</option>
                                <option value="c_scan">C-SCAN</option>
                            </select>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Head</label>
                                    <input type="number" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]" value={head} onChange={(e) => setHead(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Size</label>
                                    <input type="number" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]" value={diskSize} onChange={(e) => setDiskSize(Number(e.target.value))} />
                                </div>
                            </div>

                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 flex justify-between">Queue <button onClick={randomizeDisk} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all"><Wand2 size={10} /> Randomize</button></label>
                            <input className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] mb-6" value={requestString} onChange={(e) => setRequestString(e.target.value)} />

                            <button onClick={runSimulation} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2">
                                <Play size={16} /> SCHEDULE DISK
                            </button>
                        </div>

                        {result && (
                            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 transition-all">
                                <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-4">Results</h3>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seek Count</span>
                                    <span className="text-xl font-black text-emerald-400 tabular-nums">{result.total_seek_count}</span>
                                </div>
                                <div className="text-[9px] text-slate-600 mt-4 break-words font-mono font-bold uppercase tracking-widest">
                                    SEQ: {JSON.stringify(result.seek_sequence)}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-2">
                        <div className="p-8 rounded-3xl bg-slate-900/20 border border-slate-800/60 min-h-[500px] flex flex-col backdrop-blur-sm relative">
                            <h3 className="text-xl font-black mb-6 uppercase tracking-tight">Seek Graph</h3>
                            {graphData.length > 0 ? (
                                <div style={{ width: '100%', height: '350px' }}>
                                    <ResponsiveContainer width="99%" height="100%">
                                        <LineChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="step" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={{ stroke: '#1e293b' }} />
                                            <YAxis domain={[0, diskSize]} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={{ stroke: '#1e293b' }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#020617', borderRadius: '1rem', border: '1px solid #1e293b' }}
                                                itemStyle={{ color: '#818cf8', fontWeight: 900, fontSize: 10 }}
                                            />
                                            <Line type="monotone" dataKey="track" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#818cf8', r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-800 border-2 border-dashed border-slate-800/40 rounded-2xl">
                                    <span className="font-black uppercase tracking-widest text-[10px] opacity-20">Idle</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // --- FILE ALLOCATION TAB ---
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 backdrop-blur-xl">
                            <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400 mb-4">Allocation Policy</h3>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Strategy</label>
                            <select className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-bold mb-4 focus:ring-1 focus:ring-emerald-500/50 outline-none" value={allocAlgo} onChange={(e: any) => setAllocAlgo(e.target.value)}>
                                <option value="contiguous">Contiguous Allocation</option>
                                <option value="linked">Linked Allocation</option>
                                <option value="indexed">Indexed Allocation</option>
                            </select>

                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Disk Blocks</label>
                            <input type="number" className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] mb-6" value={totalBlocks} onChange={(e) => setTotalBlocks(Number(e.target.value))} />

                            <div className="mb-6">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 flex justify-between">Queue (Size) <button onClick={randomizeAlloc} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-all"><Wand2 size={10} /> Randomize</button></label>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="number"
                                        placeholder="Add File"
                                        className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = parseInt(e.currentTarget.value);
                                                if (!isNaN(val) && val > 0) {
                                                    setFiles([...files, { id: files.length + 1, size: val }]);
                                                    e.currentTarget.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button onClick={() => setFiles([])} className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20"><RotateCcw size={16} /></button>
                                </div>
                                <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                                    {files.map((f, idx) => (
                                        <div key={f.id} className="flex justify-between text-[10px] bg-slate-950 p-2.5 rounded-lg items-center font-bold border border-white/5 group">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 uppercase">File {f.id}</span>
                                                <input
                                                    type="number"
                                                    className="bg-transparent text-white font-bold w-12 text-[10px] outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-1"
                                                    value={f.size}
                                                    onChange={(e) => {
                                                        const newFiles = [...files];
                                                        newFiles[idx] = { ...f, size: Number(e.target.value) };
                                                        setFiles(newFiles);
                                                    }}
                                                />
                                                <span className="text-slate-600">B</span>
                                            </div>
                                            <button onClick={() => setFiles(files.filter(x => x.id !== f.id))} className="text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button onClick={runAllocation} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-xl font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2">
                                <Play size={16} /> ALLOCATE FILES
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 min-h-[500px]">
                            <h3 className="font-bold mb-6">Disk Block Map</h3>
                            {allocResult ? (
                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-1">
                                        {allocResult.disk.map((block) => (
                                            <div
                                                key={block.id}
                                                className={`w-8 h-8 rounded-sm flex flex-col items-center justify-center border text-[9px] relative group transition-all hover:scale-110 z-0 hover:z-10 ${getBlockColor(block.fileId)}`}
                                            >
                                                <span className="font-black opacity-40">{block.id}</span>
                                                {block.fileId !== -1 && <span className="font-black">F{block.fileId}</span>}

                                                {/* Tooltip */}
                                                {(allocAlgo === 'linked' && block.nextBlock !== -1) && (
                                                    <div className="absolute -top-8 bg-slate-950 border border-slate-800 text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 font-mono">
                                                        NEXT -&gt; {block.nextBlock}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* FAT / Index Table visualization */}
                                    <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800">
                                        <h4 className="font-black text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                                            <Share2 size={14} className="text-emerald-500" /> FAT / INDEX REGISTRY
                                        </h4>
                                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                            {allocResult.fileInfos.map(f => (
                                                <div key={f.id} className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                                    <div className="w-20 shrink-0 font-black text-[9px] uppercase text-emerald-400">File {f.id}</div>
                                                    <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                                                        {f.blockArray?.map((blk, idx) => (
                                                            <React.Fragment key={idx}>
                                                                <div className="px-2 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-sm">
                                                                    {blk}
                                                                </div>
                                                                {idx < (f.blockArray?.length || 0) - 1 && <span className="text-slate-700">→</span>}
                                                            </React.Fragment>
                                                        ))}
                                                        {(!f.blockArray || f.blockArray.length === 0) && <span className="text-slate-700 italic">No Blocks</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                                    Run allocation to see disk map
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
