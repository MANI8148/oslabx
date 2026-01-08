import { useState, useEffect } from 'react';

// Generic type for the module factory
type ModuleFactory<T> = () => Promise<T>;

interface WasmModuleState<T> {
    module: T | null;
    isLoading: boolean;
    error: Error | null;
}

export function useWasmModule<T>(scriptPath: string, moduleName: string): WasmModuleState<T> {
    const [state, setState] = useState<WasmModuleState<T>>({
        module: null,
        isLoading: true,
        error: null
    });

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                // DIRECT TS MOCK RETURN - BYPASSING WASM FOR LOCAL ENV
                let factory;
                const { Scheduler, MemoryManager, PageReplacement, DiskScheduler, Banker, Vector, Process, MemoryBlock, ProcessRequest } = await import('@/utils/ts-algorithms');

                if (moduleName.includes('FCFS') || moduleName.includes('SJF') || moduleName.includes('RR') || moduleName.includes('Priority')) {
                    factory = () => Promise.resolve({
                        Scheduler: Scheduler,
                        Process: Process,
                        'vector<Process>': Vector,
                        // Add delete methods to mock constructors/instances if needed by the caller code which calls delete()
                        // The TS classes have empty delete().
                    });
                }
                else if (moduleName.includes('MemoryFit')) {
                    factory = () => Promise.resolve({
                        MemoryManager: MemoryManager,
                        'vector<MemoryBlock>': Vector,
                        'vector<ProcessRequest>': Vector
                    });
                }
                else if (moduleName.includes('PageReplacement')) {
                    factory = () => Promise.resolve({
                        PageReplacement: PageReplacement,
                        'vector<int>': Vector,
                        'vector<PageStep>': Vector
                    });
                }
                else if (moduleName.includes('DiskScheduling')) {
                    factory = () => Promise.resolve({
                        DiskScheduler: DiskScheduler,
                        'vector<int>': Vector
                    });
                }
                else if (moduleName.includes('Banker')) {
                    factory = () => Promise.resolve({
                        Banker: Banker,
                        'vector<int>': Vector
                    });
                }

                if (!factory) throw new Error("Module not found");

                const instance = await factory();

                if (isMounted) {
                    setState({ module: instance as unknown as T, isLoading: false, error: null });
                }
            } catch (err) {
                if (isMounted) {
                    setState({
                        module: null,
                        isLoading: false,
                        error: err instanceof Error ? err : new Error('Unknown error loading WASM')
                    });
                }
            }
        };

        loadContent();

        return () => {
            isMounted = false;
        };
    }, [scriptPath, moduleName]);

    return state;
}
