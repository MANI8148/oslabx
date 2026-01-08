'use client';

import React from 'react';

interface MemoryBlock {
    id: string;
    size: number;
    type: 'process' | 'system' | 'free';
    label: string;
}

export default function MemoryMap({ blocks }: { blocks: MemoryBlock[] }) {
    return (
        <div className="w-full">
            <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">RAM Allocation Map</h4>
            <div className="flex w-full h-12 bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                {blocks.map((block) => (
                    <div
                        key={block.id}
                        style={{ width: `${block.size}%` }}
                        className={`h-full relative group flex items-center justify-center text-[10px] font-mono border-r border-slate-900 last:border-0 ${block.type === 'process' ? 'bg-amber-600/40 text-amber-200' :
                            block.type === 'system' ? 'bg-slate-700 text-slate-400' :
                                'bg-slate-900'
                            }`}
                    >
                        <span className="truncate px-1 uppercase">{block.label}</span>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-950 border border-slate-800 p-2 rounded text-xs whitespace-nowrap z-50">
                            {block.label} ({block.size}%)
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-600/40 rounded" />
                    <span className="text-[10px] text-slate-500 uppercase">Process</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-700 rounded" />
                    <span className="text-[10px] text-slate-500 uppercase">System</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-900 border border-slate-800 rounded" />
                    <span className="text-[10px] text-slate-500 uppercase">Free</span>
                </div>
            </div>
        </div>
    );
}
