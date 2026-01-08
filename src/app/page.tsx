'use client';

import React from 'react';
import Link from 'next/link';
import { Cpu, MemoryStick, HardDrive, Share2, Activity, Play, BookOpen } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { startSimulation } from '@/store/slices/simulationSlice';

export default function Home() {
  const dispatch = useDispatch();
  const { isRunning } = useSelector((state: RootState) => state.simulation);

  const modules = [
    { title: 'OS Fundamentals', icon: <BookOpen className="w-8 h-8 text-emerald-400" />, href: '/fundamentals', desc: 'Basics, System Calls, and Process Management.' },
    { title: 'CPU Scheduling', icon: <Cpu className="w-8 h-8 text-cyan-400" />, href: '/cpu', desc: 'Simulate FCFS, Round Robin, SRTF with real-time Gantt charts.' },
    { title: 'Memory Management', icon: <MemoryStick className="w-8 h-8 text-amber-400" />, href: '/ram', desc: 'Visualize Paging, Allocation, and Thrashing.' },
    { title: 'File System', icon: <HardDrive className="w-8 h-8 text-lime-400" />, href: '/fs', desc: 'Explore Disk Scheduling and File Allocation.' },
    { title: 'Threads & Semaphores', icon: <Share2 className="w-8 h-8 text-orange-400" />, href: '/threads', desc: 'Producer-Consumer, Dining Philosophers & Synchronization.' },
    { title: 'Deadlock Detection', icon: <Share2 className="w-8 h-8 text-red-400" />, href: '/deadlock', desc: 'Banker\'s algorithm and Resource Allocation Graphs.' },
  ];

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header */}
      <nav className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-black tracking-widest uppercase">OSLabX</h1>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => dispatch(startSimulation())}
            disabled={isRunning}
            className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${isRunning
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
              }`}
          >
            {isRunning ? <> <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Live </> : <> <Play size={18} /> Run Simulator </>}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center mb-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-600/5 blur-[100px] -z-10 rounded-full" />
        <h2 className="text-5xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500 tracking-tight">
          Modern OS Lab <br /> Simulations.
        </h2>
        <p className="text-slate-500 text-sm max-w-xl mx-auto font-bold uppercase tracking-widest">
          Deep dive into the internals of modern Operating Systems with real-time WASM visualizations.
        </p>
      </section>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((m) => (
          <Link
            key={m.title}
            href={m.href}
            className="group p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/50 transition-all cursor-pointer shadow-xl backdrop-blur-sm"
          >
            <div className="mb-4 p-3 rounded-xl bg-slate-950 inline-block group-hover:scale-110 transition-transform border border-white/5">
              {m.icon}
            </div>
            <h3 className="text-lg font-black mb-1.5 uppercase tracking-tight">{m.title}</h3>
            <p className="text-slate-500 text-[11px] leading-relaxed font-bold">{m.desc}</p>
          </Link>
        ))}
      </div>

    </main>
  );
}
