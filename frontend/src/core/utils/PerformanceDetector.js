export class PerformanceDetector {
    static shouldPrefetch() {
        const minLogicalCores = 6;
        const minMemoryGigabytes = 8;

        const cores = navigator.hardwareConcurrency || 4;
        const memory = navigator.deviceMemory || 4;

        return cores >= minLogicalCores && memory >= minMemoryGigabytes;
    }
}
