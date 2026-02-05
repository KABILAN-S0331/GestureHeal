/**
 * Prediction Stability Pipeline
 * Three-layer stabilization for gesture predictions
 * 
 * 1. Confidence Gate: Reject low-confidence predictions
 * 2. Temporal Smoothing: Majority vote over N frames
 * 3. Trigger Debounce: Prevent rapid re-triggering
 */

const DEFAULT_CONFIG = {
    confidenceThreshold: 0.85,   // Reject if below this
    windowSize: 5,               // Frames for smoothing
    debounceMs: 1000             // Cooldown after trigger
};

/**
 * Create a stability pipeline instance
 * @param {Object} config - Configuration options
 * @returns {Object} - Pipeline API
 */
export function createStabilityPipeline(config = {}) {
    const settings = { ...DEFAULT_CONFIG, ...config };

    // State
    let history = [];
    let lastTriggerTime = 0;
    let lastStableGesture = 'NONE';

    /**
     * Process a new prediction through the pipeline
     * @param {Object} prediction - {gesture, confidence} from classifier
     * @returns {Object} - {gesture, isStable, shouldTrigger}
     */
    function process(prediction) {
        if (!prediction) {
            return { gesture: 'NONE', isStable: false, shouldTrigger: false };
        }

        const { gesture, confidence } = prediction;
        const now = Date.now();

        // Layer 1: Confidence Gate
        const passedConfidence = confidence >= settings.confidenceThreshold;
        const gatedGesture = passedConfidence ? gesture : 'NONE';

        // Layer 2: Temporal Smoothing (Majority Vote)
        history.push(gatedGesture);
        if (history.length > settings.windowSize) {
            history.shift();
        }

        const stableGesture = getMajorityGesture(history);

        // Layer 3: Debounce Check
        const isNewGesture = stableGesture !== lastStableGesture;
        const cooldownPassed = (now - lastTriggerTime) >= settings.debounceMs;
        const shouldTrigger = isNewGesture && stableGesture !== 'NONE' && cooldownPassed;

        if (shouldTrigger) {
            lastTriggerTime = now;
            lastStableGesture = stableGesture;
        }

        return {
            gesture: stableGesture,
            confidence: confidence,
            isStable: history.length >= settings.windowSize && allSame(history),
            shouldTrigger
        };
    }

    /**
     * Reset the pipeline state
     */
    function reset() {
        history = [];
        lastTriggerTime = 0;
        lastStableGesture = 'NONE';
    }

    /**
     * Get current configuration
     */
    function getConfig() {
        return { ...settings };
    }

    return { process, reset, getConfig };
}

/**
 * Find most frequent gesture in array
 * @param {Array} arr - Array of gesture strings
 * @returns {string} - Most frequent gesture
 */
function getMajorityGesture(arr) {
    if (arr.length === 0) return 'NONE';

    const counts = {};
    for (const g of arr) {
        counts[g] = (counts[g] || 0) + 1;
    }

    let maxCount = 0;
    let majority = 'NONE';
    for (const [gesture, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            majority = gesture;
        }
    }

    return majority;
}

/**
 * Check if all elements in array are the same
 * @param {Array} arr
 * @returns {boolean}
 */
function allSame(arr) {
    if (arr.length === 0) return false;
    return arr.every(v => v === arr[0]);
}

export default { createStabilityPipeline };
