/**
 * Performance Monitoring Utilities
 * For testing and monitoring component performance improvements
 */

export class PerformanceMonitor {
    static measurements = new Map();

    /**
     * Start measuring performance for a component or operation
     * @param {string} label - Identifier for the measurement
     */
    static start(label) {
        this.measurements.set(label, {
            startTime: performance.now(),
            startMemory: performance.memory
                ? performance.memory.usedJSHeapSize
                : null,
        });
    }

    /**
     * End measurement and log results
     * @param {string} label - Identifier for the measurement
     */
    static end(label) {
        const measurement = this.measurements.get(label);
        if (!measurement) {
            console.warn(`Performance measurement '${label}' not found`);
            return;
        }

        const endTime = performance.now();
        const endMemory = performance.memory
            ? performance.memory.usedJSHeapSize
            : null;

        const duration = endTime - measurement.startTime;
        const memoryDelta =
            endMemory && measurement.startMemory
                ? endMemory - measurement.startMemory
                : null;

        console.log(`🚀 Performance: ${label}`, {
            duration: `${duration.toFixed(2)}ms`,
            memory: memoryDelta
                ? `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
                : "N/A",
        });

        this.measurements.delete(label);
    }

    /**
     * Measure component render time
     * @param {string} componentName - Name of the component
     * @param {Function} renderFunction - Function that triggers render
     */
    static async measureComponentRender(componentName, renderFunction) {
        this.start(`${componentName}-render`);
        await renderFunction();
        this.end(`${componentName}-render`);
    }

    /**
     * Monitor memory usage over time
     */
    static monitorMemory() {
        if (!performance.memory) {
            console.warn("Memory monitoring not available in this browser");
            return;
        }

        const logMemory = () => {
            const memory = performance.memory;
            console.log("📊 Memory Usage:", {
                used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
            });
        };

        // Log memory every 5 seconds
        setInterval(logMemory, 5000);

        // Log initial memory
        logMemory();
    }

    /**
     * Create a performance-wrapped component (requires React to be imported separately)
     * @param {React.Component} Component - Component to wrap
     * @param {string} name - Component name for logging
     */
    static wrapComponent(Component, name) {
        console.log(`📝 Performance wrapper available for ${name}`);
        return Component; // Simplified version - full implementation would require React import
    }
}

// Development mode utilities
export const DevTools = {
    /**
     * Log component re-renders
     * @param {string} componentName - Name of the component
     * @param {any} props - Component props
     */
    logRender: (componentName, props) => {
        if (process.env.NODE_ENV === "development") {
            console.log(`🔄 ${componentName} rendered with props:`, props);
        }
    },

    /**
     * Log when a component is lazy loaded
     * @param {string} componentName - Name of the component
     */
    logLazyLoad: (componentName) => {
        if (process.env.NODE_ENV === "development") {
            console.log(`⚡ ${componentName} lazy loaded`);
        }
    },

    /**
     * Measure bundle size impact
     */
    measureBundleSize: () => {
        if (process.env.NODE_ENV === "development") {
            const scripts = document.querySelectorAll("script[src]");

            scripts.forEach((script) => {
                // This is a rough estimate - in production you'd use webpack-bundle-analyzer
                console.log(`📦 Script: ${script.src}`);
            });

            console.log(`📦 Total scripts: ${scripts.length}`);
        }
    },
};

export default PerformanceMonitor;
