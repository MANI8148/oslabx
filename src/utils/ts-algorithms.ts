// CPU Scheduling Algorithms
export class Scheduler {
    fcfs(processes: any): any {
        // Sort by arrival
        const sorted = [...processes.data].sort((a, b) => a.arrival_time - b.arrival_time);
        let currentTime = 0;

        for (const p of sorted) {
            if (currentTime < p.arrival_time) {
                currentTime = p.arrival_time;
            }
            currentTime += p.burst_time;
            p.completion_time = currentTime;
            p.turn_around_time = p.completion_time - p.arrival_time;
            p.waiting_time = p.turn_around_time - p.burst_time;
        }
        return new Vector(sorted);
    }

    sjf(processes: any): any {
        const n = processes.data.length;
        let completed = 0;
        let currentTime = 0;
        const result = [...processes.data]; // Cloned array to mutate
        const isCompleted = new Array(n).fill(false);

        // This simple SJF (Non-preemptive) logic matching C++
        while (completed < n) {
            let idx = -1;
            let minBurst = Number.MAX_VALUE;

            for (let i = 0; i < n; i++) {
                if (!isCompleted[i] && result[i].arrival_time <= currentTime) {
                    if (result[i].burst_time < minBurst) {
                        minBurst = result[i].burst_time;
                        idx = i;
                    }
                    else if (result[i].burst_time === minBurst) {
                        if (result[i].arrival_time < result[idx].arrival_time) idx = i;
                    }
                }
            }

            if (idx !== -1) {
                currentTime += result[idx].burst_time;
                result[idx].completion_time = currentTime;
                result[idx].turn_around_time = result[idx].completion_time - result[idx].arrival_time;
                result[idx].waiting_time = result[idx].turn_around_time - result[idx].burst_time;
                isCompleted[idx] = true;
                completed++;
            } else {
                let nextArrival = Number.MAX_VALUE;
                for (let i = 0; i < n; i++) {
                    if (!isCompleted[i] && result[i].arrival_time < nextArrival) {
                        nextArrival = result[i].arrival_time;
                    }
                }
                if (nextArrival !== Number.MAX_VALUE) currentTime = nextArrival;
            }
        }
        return new Vector(result);
    }

    priority_scheduling(processes: any): any {
        const n = processes.data.length;
        let completed = 0;
        let currentTime = 0;
        const result = [...processes.data];
        const isCompleted = new Array(n).fill(false);

        while (completed < n) {
            let idx = -1;
            let highestPriority = Number.MAX_VALUE; // Lower is higher

            for (let i = 0; i < n; i++) {
                if (!isCompleted[i] && result[i].arrival_time <= currentTime) {
                    if (result[i].priority < highestPriority) {
                        highestPriority = result[i].priority;
                        idx = i;
                    } else if (result[i].priority === highestPriority) {
                        if (result[i].arrival_time < result[idx].arrival_time) idx = i;
                    }
                }
            }

            if (idx !== -1) {
                currentTime += result[idx].burst_time;
                result[idx].completion_time = currentTime;
                result[idx].turn_around_time = result[idx].completion_time - result[idx].arrival_time;
                result[idx].waiting_time = result[idx].turn_around_time - result[idx].burst_time;
                isCompleted[idx] = true;
                completed++;
            } else {
                let nextArrival = Number.MAX_VALUE;
                for (let i = 0; i < n; i++) {
                    if (!isCompleted[i] && result[i].arrival_time < nextArrival) {
                        nextArrival = result[i].arrival_time;
                    }
                }
                if (nextArrival !== Number.MAX_VALUE) currentTime = nextArrival;
            }
        }
        return new Vector(result);
    }

    round_robin(processes: any, quantum: number): any {
        const sorted = [...processes.data].sort((a, b) => a.arrival_time - b.arrival_time);
        const n = sorted.length;
        const rem_bt = sorted.map(p => p.burst_time);
        let currentTime = 0;
        let completed = 0;
        const result = sorted.map(p => ({ ...p })); // Clone for result

        const queue: number[] = [];
        const inQueue = new Array(n).fill(false);

        // Push initial
        if (n > 0) {
            if (sorted[0].arrival_time > currentTime) currentTime = sorted[0].arrival_time;
            for (let i = 0; i < n; i++) {
                if (sorted[i].arrival_time <= currentTime) {
                    queue.push(i);
                    inQueue[i] = true;
                }
            }
        }

        while (completed < n) {
            if (queue.length === 0) {
                // Jump to next arrival
                let nextIdx = -1;
                for (let i = 0; i < n; i++) {
                    if (!inQueue[i] && rem_bt[i] > 0) {
                        nextIdx = i;
                        break;
                    } // Only check strictly not visited? 
                    // Actually logic should be simple: find min arrival > current
                }
                // Simplification: just find next process that hasn't finished
                let minArr = Number.MAX_VALUE;
                let found = -1;
                for (let i = 0; i < n; i++) {
                    if (rem_bt[i] > 0 && !inQueue[i] && result[i].arrival_time < minArr) {
                        minArr = result[i].arrival_time;
                        found = i;
                    }
                }

                if (found !== -1) {
                    currentTime = minArr;
                    queue.push(found);
                    inQueue[found] = true;
                    // Add others arriving at same time?
                    for (let i = 0; i < n; i++) {
                        if (!inQueue[i] && rem_bt[i] > 0 && result[i].arrival_time <= currentTime) {
                            if (i !== found) {
                                queue.push(i);
                                inQueue[i] = true;
                            }
                        }
                    }
                } else {
                    break; // All done
                }
            }

            const idx = queue.shift()!;
            const execTime = Math.min(quantum, rem_bt[idx]);
            rem_bt[idx] -= execTime;
            currentTime += execTime;

            // Check for new arrivals
            for (let i = 0; i < n; i++) {
                if (!inQueue[i] && rem_bt[i] > 0 && result[i].arrival_time <= currentTime) {
                    queue.push(i);
                    inQueue[i] = true;
                }
            }

            if (rem_bt[idx] > 0) {
                queue.push(idx);
            } else {
                result[idx].completion_time = currentTime;
                result[idx].turn_around_time = result[idx].completion_time - result[idx].arrival_time;
                result[idx].waiting_time = result[idx].turn_around_time - result[idx].burst_time;
                completed++;
            }
        }

        return new Vector(result);
    }

    delete() { }
}

// Memory Algorithms
export class MemoryManager {
    first_fit(blocks: any, processes: any): any {
        const blks = [...blocks.data];
        const procs = [...processes.data];

        for (const p of procs) {
            for (const b of blks) {
                if (!b.allocated && b.size >= p.size) {
                    b.allocated = true;
                    b.process_id = p.id;
                    p.allocated = true;
                    p.block_id = b.id;
                    break;
                }
            }
        }
        return { blocks: new Vector(blks), processes: new Vector(procs) };
    }

    best_fit(blocks: any, processes: any): any {
        const blks = [...blocks.data];
        const procs = [...processes.data];

        for (const p of procs) {
            let bestIdx = -1;
            let minFrag = Number.MAX_VALUE;

            for (let i = 0; i < blks.length; i++) {
                if (!blks[i].allocated && blks[i].size >= p.size) {
                    const frag = blks[i].size - p.size;
                    if (frag < minFrag) {
                        minFrag = frag;
                        bestIdx = i;
                    }
                }
            }
            if (bestIdx !== -1) {
                blks[bestIdx].allocated = true;
                blks[bestIdx].process_id = p.id;
                p.allocated = true;
                p.block_id = blks[bestIdx].id;
            }
        }
        return { blocks: new Vector(blks), processes: new Vector(procs) };
    }

    worst_fit(blocks: any, processes: any): any {
        const blks = [...blocks.data];
        const procs = [...processes.data];

        for (const p of procs) {
            let worstIdx = -1;
            let maxFrag = -1;

            for (let i = 0; i < blks.length; i++) {
                if (!blks[i].allocated && blks[i].size >= p.size) {
                    const frag = blks[i].size - p.size;
                    if (frag > maxFrag) {
                        maxFrag = frag;
                        worstIdx = i;
                    }
                }
            }
            if (worstIdx !== -1) {
                blks[worstIdx].allocated = true;
                blks[worstIdx].process_id = p.id;
                p.allocated = true;
                p.block_id = blks[worstIdx].id;
            }
        }
        return { blocks: new Vector(blks), processes: new Vector(procs) };
    }
    delete() { }
}

export class PageReplacement {
    fifo(pages: any, capacity: number): any {
        const p = pages.data;
        const steps: any[] = [];
        const frames: number[] = [];
        const set = new Set<number>();
        const queue: number[] = []; // for FIFO order logic

        for (let i = 0; i < p.length; i++) {
            const page = p[i];
            let fault = false;

            if (!set.has(page)) {
                fault = true;
                if (set.size < capacity) {
                    set.add(page);
                    queue.push(page);
                    frames.push(page);
                } else {
                    const val = queue.shift()!;
                    set.delete(val);
                    set.add(page);
                    queue.push(page);
                    // Replace in frames visualization
                    const idx = frames.indexOf(val);
                    if (idx !== -1) frames[idx] = page;
                }
            }
            steps.push({ page, step: i, frames: new Vector([...frames]), fault });
        }
        return new Vector(steps);
    }

    lru(pages: any, capacity: number): any {
        const p = pages.data;
        const steps: any[] = [];
        const frames: number[] = [];

        for (let i = 0; i < p.length; i++) {
            const page = p[i];
            let fault = false;

            if (!frames.includes(page)) {
                fault = true;
                if (frames.length < capacity) {
                    frames.push(page);
                } else {
                    // Find LRU
                    let lruIdx = -1;
                    let earliest = i;

                    for (let fIdx = 0; fIdx < frames.length; fIdx++) {
                        let lastUse = -1;
                        for (let j = i - 1; j >= 0; j--) {
                            if (p[j] === frames[fIdx]) {
                                lastUse = j;
                                break;
                            }
                        }
                        if (lastUse < earliest) {
                            earliest = lastUse;
                            lruIdx = fIdx;
                        }
                    }
                    frames[lruIdx] = page;
                }
            }
            steps.push({ page, step: i, frames: new Vector([...frames]), fault });
        }
        return new Vector(steps);
    }

    optimal(pages: any, capacity: number): any {
        // ... Similar implementation logic as C++ but TS
        const p = pages.data;
        const steps: any[] = [];
        const frames: number[] = [];

        for (let i = 0; i < p.length; i++) {
            const page = p[i];
            let fault = false;

            if (!frames.includes(page)) {
                fault = true;
                if (frames.length < capacity) {
                    frames.push(page);
                } else {
                    let replaceIdx = -1;
                    let latest = -1;

                    for (let fIdx = 0; fIdx < frames.length; fIdx++) {
                        let nextUse = Number.MAX_VALUE;
                        for (let j = i + 1; j < p.length; j++) {
                            if (p[j] === frames[fIdx]) {
                                nextUse = j;
                                break;
                            }
                        }
                        if (nextUse > latest) {
                            latest = nextUse;
                            replaceIdx = fIdx;
                        }
                    }
                    frames[replaceIdx] = page;
                }
            }
            steps.push({ page, step: i, frames: new Vector([...frames]), fault });
        }
        return new Vector(steps);
    }
    delete() { }
}

// Disk Algorithms
export class DiskScheduler {
    fcfs(reqs: any, head: number): any {
        const r = reqs.data;
        let total = 0;
        const seq = [head];
        let curr = head;
        for (const val of r) {
            total += Math.abs(val - curr);
            curr = val;
            seq.push(curr);
        }
        return { seek_sequence: new Vector(seq), total_seek_count: total };
    }

    sstf(reqs: any, head: number): any {
        // ...
        const r = [...reqs.data];
        let total = 0;
        const seq = [head];
        let curr = head;
        const visited = new Array(r.length).fill(false);
        let count = 0;

        while (count < r.length) {
            let min = Number.MAX_VALUE;
            let idx = -1;
            for (let i = 0; i < r.length; i++) {
                if (!visited[i]) {
                    const dist = Math.abs(r[i] - curr);
                    if (dist < min) {
                        min = dist;
                        idx = i;
                    }
                }
            }
            if (idx !== -1) {
                visited[idx] = true;
                total += min;
                curr = r[idx];
                seq.push(curr);
                count++;
            }
        }
        return { seek_sequence: new Vector(seq), total_seek_count: total };
    }

    scan(reqs: any, head: number, size: number, dir: number): any {
        const r = [...reqs.data];
        let total = 0;
        const seq = [head];
        let curr = head;

        const left = [0];
        const right = [size - 1];

        for (const val of r) {
            if (val < head) left.push(val);
            else right.push(val);
        }
        left.sort((a, b) => a - b);
        right.sort((a, b) => a - b);

        let run = 2;
        while (run--) {
            if (dir === 1) { // Right
                for (const val of right) {
                    total += Math.abs(val - curr);
                    curr = val;
                    seq.push(curr);
                }
                dir = 0;
            } else {
                for (let i = left.length - 1; i >= 0; i--) {
                    total += Math.abs(left[i] - curr);
                    curr = left[i];
                    seq.push(curr);
                }
                dir = 1;
            }
        }
        return { seek_sequence: new Vector(seq), total_seek_count: total };
    }

    c_scan(reqs: any, head: number, size: number): any {
        const r = [...reqs.data];
        let total = 0;
        const seq = [head];
        let curr = head;

        const left = [0];
        const right = [size - 1];

        for (const val of r) {
            if (val < head) left.push(val);
            else right.push(val);
        }
        left.sort((a, b) => a - b);
        right.sort((a, b) => a - b);

        // head -> end
        for (const val of right) {
            total += Math.abs(val - curr);
            curr = val;
            seq.push(curr);
        }
        // jump to 0
        total += (size - 1);
        curr = 0;
        seq.push(curr);

        // 0 -> remaining
        for (const val of left) {
            total += Math.abs(val - curr);
            curr = val;
            seq.push(curr);
        }

        return { seek_sequence: new Vector(seq), total_seek_count: total };
    }
    delete() { }
}

// Deadlock
export class Banker {
    solve(n: number, m: number, alloc: any, max: any, avail: any): any {
        const allocData = alloc.data;
        const maxData = max.data;
        const availData = [...avail.data];

        const work = [...availData];
        const finish = new Array(n).fill(false);
        const safeSeq: number[] = [];

        const need = [];
        for (let i = 0; i < n; i++) {
            const row = [];
            for (let j = 0; j < m; j++) {
                // index = i*m + j
                row.push(maxData[i * m + j] - allocData[i * m + j]);
            }
            need.push(row);
        }

        let count = 0;
        while (count < n) {
            let found = false;
            for (let p = 0; p < n; p++) {
                if (!finish[p]) {
                    let j;
                    for (j = 0; j < m; j++) {
                        if (need[p][j] > work[j]) break;
                    }
                    if (j === m) {
                        for (let k = 0; k < m; k++) {
                            work[k] += allocData[p * m + k];
                        }
                        safeSeq.push(p);
                        finish[p] = true;
                        found = true;
                        count++;
                    }
                }
            }
            if (!found) return { is_safe: false, safe_sequence: new Vector([]) };
        }

        return { is_safe: true, safe_sequence: new Vector(safeSeq) };
    }
    delete() { }
}

// Mocks for Vector/Process
export class Vector {
    data: any[];
    constructor(initial: any[] = []) {
        this.data = initial;
    }
    push_back(val: any) { this.data.push(val); }
    size() { return this.data.length; }
    get(i: number) { return this.data[i]; }
    delete() { }
}

export class Process {
    id = 0; burst_time = 0; arrival_time = 0;
    priority = 0; remaining_time = 0; completion_time = 0;
    waiting_time = 0; turn_around_time = 0;
}

export class MemoryBlock { id = 0; size = 0; allocated = false; process_id = 0; }
export class ProcessRequest { id = 0; size = 0; allocated = false; block_id = 0; }
