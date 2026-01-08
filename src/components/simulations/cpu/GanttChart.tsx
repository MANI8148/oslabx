'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface GanttData {
    name: string;
    start: number;
    duration: number;
    color: string;
}

export default function GanttChart({ data }: { data: GanttData[] }) {
    // Pre-process data for stacked bar chart to look like a Gantt chart
    // Recharts doesn't have a native Gantt, so we use a stacked bar with a transparent base.

    return (
        <div className="h-48 w-full bg-slate-900/30 p-4 rounded-xl border border-slate-800">
            <h4 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">Gantt Visualizer</h4>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart
                    layout="vertical"
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    />
                    {/* Base bar (transparent) */}
                    <Bar dataKey="start" stackId="a" fill="transparent" />
                    {/* Process bar */}
                    <Bar dataKey="duration" stackId="a" radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
