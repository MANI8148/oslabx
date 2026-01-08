export interface Process {
    id: number;
    burst_time: number;
    arrival_time: number;
    priority?: number;
    remaining_time?: number;
    completion_time?: number;
    waiting_time?: number;
    turn_around_time?: number;
}

export interface SchedulerModule {
    Scheduler: new () => {
        fcfs: (processes: any) => any; // Returns vector<Process>
        sjf: (processes: any) => any;
        round_robin: (processes: any, quantum: number) => any;
        priority_scheduling: (processes: any) => any;
        delete: () => void;
    };
    Process: new () => Process;
    'vector<Process>': new () => {
        push_back: (p: Process) => void;
        size: () => number;
        get: (i: number) => Process;
        delete: () => void;
    };
}

// Memory Types
export interface MemoryBlock {
    id: number;
    size: number;
    allocated: boolean;
    process_id: number;
}

export interface ProcessRequest {
    id: number;
    size: number;
    allocated: boolean;
    block_id: number;
}

export interface AllocationResult {
    blocks: any; // vector<MemoryBlock>
    processes: any; // vector<ProcessRequest>
}

export interface MemoryFitModule {
    MemoryManager: new () => {
        first_fit: (blocks: any, processes: any) => AllocationResult;
        best_fit: (blocks: any, processes: any) => AllocationResult;
        worst_fit: (blocks: any, processes: any) => AllocationResult;
        delete: () => void;
    };
    'vector<MemoryBlock>': new () => any;
    'vector<ProcessRequest>': new () => any;
}

export interface PageStep {
    page: number;
    step: number;
    frames: any; // vector<int>
    fault: boolean;
}

export interface PageReplacementModule {
    PageReplacement: new () => {
        fifo: (pages: any, capacity: number) => any; // vector<PageStep>
        lru: (pages: any, capacity: number) => any;
        optimal: (pages: any, capacity: number) => any;
        lfu: (pages: any, capacity: number) => any;
        mfu: (pages: any, capacity: number) => any;
        delete: () => void;
    };
    'vector<int>': new () => any;
    'vector<PageStep>': new () => any;
}

// Disk Types
export interface DiskResult {
    seek_sequence: any; // vector<int>
    total_seek_count: number;
}

export interface DiskSchedulerModule {
    DiskScheduler: new () => {
        fcfs: (requests: any, head: number) => DiskResult;
        sstf: (requests: any, head: number) => DiskResult;
        scan: (requests: any, head: number, size: number, dir: number) => DiskResult;
        c_scan: (requests: any, head: number, size: number) => DiskResult;
        delete: () => void;
    };
    'vector<int>': new () => any;
}

// Deadlock Types
export interface BankerResult {
    is_safe: boolean;
    safe_sequence: any; // vector<int>
}

export interface BankerModule {
    Banker: new () => {
        solve: (n: number, m: number, alloc: any, max: any, avail: any) => BankerResult;
        delete: () => void;
    };
    'vector<int>': new () => any;
}

// File Allocation Types
export interface FileInfo {
    id: number;
    size: number;
    startBlock: number;
    length: number;
    blocks: any; // vector<int>
    // Converted for UI
    blockArray?: number[];
}

export interface DiskBlock {
    id: number;
    fileId: number;
    nextBlock: number;
}

export interface FileAllocationResult {
    disk: any; // vector<DiskBlock>
    files: any; // vector<FileInfo>
    success: boolean;
}

export interface FileAllocationModule {
    FileAllocationManager: new () => {
        contiguous: (totalBlocks: number, files: any) => FileAllocationResult;
        linked: (totalBlocks: number, files: any) => FileAllocationResult;
        indexed: (totalBlocks: number, files: any) => FileAllocationResult;
        delete: () => void;
    };
    'vector<FileInfo>': new () => any;
    'vector<DiskBlock>': new () => any;
    'vector<int>': new () => any;
}
