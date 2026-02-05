/**
 * Landmark Normalizer
 * Matches the working vanilla JS implementation exactly
 */

/**
 * Normalize MediaPipe landmarks to ML-ready features
 * Translation-invariant (relative to wrist) and scale-normalized
 * @param {Array} lm - MediaPipe landmark array (21 points)
 * @returns {Array|null} - 63 normalized features or null
 */
export function normalizeLandmarks(lm) {
    if (!lm || lm.length !== 21) return null;

    const base = lm[0];
    if (!base) return null;

    let arr = [];

    // Translate relative to wrist (base point)
    for (let p of lm) {
        arr.push(p.x - base.x);
        arr.push(p.y - base.y);
        arr.push(p.z - base.z);
    }

    // Scale normalize by max absolute value
    const maxVal = Math.max(...arr.map(v => Math.abs(v))) || 1;
    return arr.map(v => v / maxVal);
}

/**
 * Validate landmark array format
 * @param {Array} landmarks 
 * @returns {boolean}
 */
export function validateLandmarks(landmarks) {
    if (!Array.isArray(landmarks)) return false;
    if (landmarks.length !== 21) return false;

    return landmarks.every(lm =>
        lm &&
        typeof lm.x === 'number' &&
        typeof lm.y === 'number' &&
        typeof lm.z === 'number'
    );
}

export default { normalizeLandmarks, validateLandmarks };
