export const simulationData = {
    disk: Array.from({ length: 200 }, () =>
        Array.from({ length: 12 }, () => Math.floor(Math.random() * 200)).join(',')
    ),
    files: Array.from({ length: 200 }, () =>
        Array.from({ length: 6 }, () => Math.floor(Math.random() * 15) + 1)
    ),
    cpu: Array.from({ length: 200 }, () =>
        Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            arrival_time: Math.floor(Math.random() * 10),
            burst_time: Math.floor(Math.random() * 15) + 1,
            priority: Math.floor(Math.random() * 10)
        }))
    ),
    pages: Array.from({ length: 200 }, () =>
        Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join(',')
    )
};
