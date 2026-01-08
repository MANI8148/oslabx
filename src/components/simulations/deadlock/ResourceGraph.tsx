import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
    processes: number;
    resources: number;
    allocation: number[][];
    request: number[][]; // Need: Request matrix = Max - Alloc
    available: number[];
}

export default function ResourceGraph({ processes, resources, allocation, request }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const width = 800;
        const height = 400;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous

        // Define Nodes
        const nodes: any[] = [];
        const links: any[] = [];

        // Process Nodes (Circles) - Left side (or Top)
        for (let i = 0; i < processes; i++) {
            nodes.push({ id: `P${i}`, type: 'process', x: width / 4, y: (height / (processes + 1)) * (i + 1) });
        }

        // Resource Nodes (Rectangles) - Right side (or Bottom)
        for (let j = 0; j < resources; j++) {
            nodes.push({ id: `R${j}`, type: 'resource', x: 3 * width / 4, y: (height / (resources + 1)) * (j + 1) });
        }

        // Edges
        // Allocation: Resource -> Process (Assignment Edge)
        for (let i = 0; i < processes; i++) {
            for (let j = 0; j < resources; j++) {
                if (allocation[i][j] > 0) {
                    // Create one link per instance or just one weighted link?
                    // RAG usually shows multiple arrows for multiple instances.
                    // For clarity, we'll draw one link with a label.
                    links.push({ source: `R${j}`, target: `P${i}`, type: 'allocation', weight: allocation[i][j] });
                }
            }
        }

        // Request: Process -> Resource (Request Edge)
        for (let i = 0; i < processes; i++) {
            for (let j = 0; j < resources; j++) {
                if (request[i][j] > 0) {
                    links.push({ source: `P${i}`, target: `R${j}`, type: 'request', weight: request[i][j] });
                }
            }
        }

        // Arrows
        svg.append("defs").selectAll("marker")
            .data(["end-allocation", "end-request"])
            .enter().append("marker")
            .attr("id", d => d)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 25)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", d => d === "end-allocation" ? "#10b981" : "#f59e0b");

        // Simulation for organic layout (optional, but fixed layout is clearer for RAG)
        // Let's stick to the grid layout calculated above for clarity.

        // Draw Links
        const link = svg.append("g")
            .selectAll("line")
            .data(links)
            .enter().append("g");

        link.append("line")
            .attr("x1", (d: any) => nodes.find(n => n.id === d.source).x)
            .attr("y1", (d: any) => nodes.find(n => n.id === d.source).y)
            .attr("x2", (d: any) => nodes.find(n => n.id === d.target).x)
            .attr("y2", (d: any) => nodes.find(n => n.id === d.target).y)
            .attr("stroke", (d: any) => d.type === 'allocation' ? "#10b981" : "#f59e0b") // Green for owned, Orange for requested
            .attr("stroke-width", 2)
            .attr("marker-end", (d: any) => `url(#end-${d.type})`);

        // Labels for links (weights)
        link.append("text")
            .attr("x", (d: any) => (nodes.find(n => n.id === d.source).x + nodes.find(n => n.id === d.target).x) / 2)
            .attr("y", (d: any) => (nodes.find(n => n.id === d.source).y + nodes.find(n => n.id === d.target).y) / 2 - 5)
            .text((d: any) => d.weight > 1 ? d.weight : "")
            .attr("fill", "#64748b")
            .attr("font-size", "10px")
            .attr("text-anchor", "middle");

        // Draw Nodes
        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .enter().append("g")
            .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

        // Circles for Processes
        node.filter((d: any) => d.type === 'process')
            .append("circle")
            .attr("r", 20)
            .attr("fill", "#10b981") // Emerald
            .attr("stroke", "#059669")
            .attr("stroke-width", 2);

        // Rects for Resources
        node.filter((d: any) => d.type === 'resource')
            .append("rect")
            .attr("x", -20)
            .attr("y", -20)
            .attr("width", 40)
            .attr("height", 40)
            .attr("rx", 4)
            .attr("fill", "#06b6d4") // Cyan
            .attr("stroke", "#0891b2")
            .attr("stroke-width", 2);

        // Labels
        node.append("text")
            .text((d: any) => d.id)
            .attr("dy", 5)
            .attr("text-anchor", "middle")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .attr("font-size", "12px");

    }, [processes, resources, allocation, request]);

    return (
        <div className="w-full flex justify-center bg-slate-950 rounded-xl border border-slate-800 p-4">
            <svg ref={svgRef} width="800" height="400" className="max-w-full" />
        </div>
    );
}
