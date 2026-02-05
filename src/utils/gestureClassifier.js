/**
 * Gesture Classifier
 * Loads TF.js Graph Model and runs inference on normalized landmarks
 * Matches the working vanilla JS implementation
 */

import * as tf from '@tensorflow/tfjs';

// Gesture class labels - MUST match training order exactly
// Gesture class labels - MUST match training order exactly
export const GESTURE_LABELS = [
    'Blood',
    'Cough',
    'Fever',
    'Help',
    'I need water',
    'NO',
    'NONE',
    'Pain',
    'YES',
    'breathe problem'
];

// Model reference (loaded once)
let model = null;
let isLoading = false;

/**
 * Load the TensorFlow.js Graph Model
 * @param {string} modelPath - Path to model.json
 * @returns {Promise<boolean>} - Success status
 */
export async function loadModel(modelPath = '/model.json') {
    if (model) return true;
    if (isLoading) return false;

    try {
        isLoading = true;

        // Load as Graph Model (not Layers Model)
        model = await tf.loadGraphModel(modelPath);
        console.log('✅ Gesture model loaded successfully');
        isLoading = false;
        return true;
    } catch (error) {
        console.error('❌ Failed to load gesture model:', error);
        isLoading = false;
        return false;
    }
}

/**
 * Check if model is loaded
 * @returns {boolean}
 */
export function isModelLoaded() {
    return model !== null;
}

/**
 * Run inference on normalized landmarks
 * Uses model.execute() for Graph Model (not predict)
 * @param {Array} features - 63 normalized features
 * @returns {Object|null} - {gesture, confidence, probabilities} or null
 */
export async function predict(features) {
    if (!model) {
        console.warn('Model not loaded. Call loadModel() first.');
        return null;
    }

    if (!features || features.length !== 63) {
        return null;
    }

    let inputTensor = null;
    let outputTensor = null;

    try {
        // Create input tensor [1, 63]
        inputTensor = tf.tensor2d([features], [1, 63]);

        // Use execute() for Graph Model (not predict())
        outputTensor = model.execute(inputTensor);
        const probabilities = await outputTensor.data();

        // Find max probability
        let maxIdx = 0;
        let maxProb = probabilities[0];
        for (let i = 1; i < probabilities.length; i++) {
            if (probabilities[i] > maxProb) {
                maxProb = probabilities[i];
                maxIdx = i;
            }
        }

        return {
            gesture: GESTURE_LABELS[maxIdx],
            confidence: maxProb,
            probabilities: Array.from(probabilities)
        };
    } catch (error) {
        console.error('Prediction error:', error);
        return null;
    } finally {
        // Clean up tensors to prevent memory leak
        if (inputTensor) tf.dispose(inputTensor);
        if (outputTensor) tf.dispose(outputTensor);
    }
}

/**
 * Cleanup model from memory
 */
export function disposeModel() {
    if (model) {
        model.dispose();
        model = null;
    }
}

export default { loadModel, isModelLoaded, predict, disposeModel, GESTURE_LABELS };
