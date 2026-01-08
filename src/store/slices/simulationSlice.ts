import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SimulationState {
    isRunning: boolean;
    cpuUsage: number;
    memoryUsage: number;
    activeProcesses: any[];
    logs: string[];
}

const initialState: SimulationState = {
    isRunning: false,
    cpuUsage: 0,
    memoryUsage: 0,
    activeProcesses: [],
    logs: [],
};

export const simulationSlice = createSlice({
    name: 'simulation',
    initialState,
    reducers: {
        startSimulation: (state) => {
            state.isRunning = true;
            state.logs.push('Simulation started...');
        },
        stopSimulation: (state) => {
            state.isRunning = false;
            state.logs.push('Simulation stopped.');
        },
        updateMetrics: (state, action: PayloadAction<{ cpu: number; ram: number }>) => {
            state.cpuUsage = action.payload.cpu;
            state.memoryUsage = action.payload.ram;
        },
        addLog: (state, action: PayloadAction<string>) => {
            state.logs.push(action.payload);
        },
    },
});

export const { startSimulation, stopSimulation, updateMetrics, addLog } = simulationSlice.actions;
export default simulationSlice.reducer;
