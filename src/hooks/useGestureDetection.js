/**
 * useGestureDetection Hook
 * Combines MediaPipe, ML classifier, and stability pipeline
 * into a single React hook for easy integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeLandmarks } from '../utils/landmarkNormalizer';
import { loadModel, predict, isModelLoaded } from '../utils/gestureClassifier';
import { createStabilityPipeline } from '../utils/stabilityPipeline';

/**
 * Main gesture detection hook
 * @param {Object} options - Configuration options
 * @returns {Object} - { gesture, confidence, isDetecting, error, startDetection, stopDetection }
 */
export function useGestureDetection(options = {}) {
    const {
        modelPath = '/model.json',
        confidenceThreshold = 0.90,
        smoothingWindow = 5,
        debounceMs = 1000,
        onGestureDetected = null
    } = options;

    // State
    const [gesture, setGesture] = useState('NONE');
    const [confidence, setConfidence] = useState(0);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isModelReady, setIsModelReady] = useState(false);
    const [error, setError] = useState(null);

    // Refs for mutable state
    const handLandmarkerRef = useRef(null);
    const videoRef = useRef(null);
    const stabilityPipelineRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Initialize stability pipeline
    useEffect(() => {
        stabilityPipelineRef.current = createStabilityPipeline({
            confidenceThreshold,
            windowSize: smoothingWindow,
            debounceMs
        });
    }, [confidenceThreshold, smoothingWindow, debounceMs]);

    // Load ML model on mount
    useEffect(() => {
        async function init() {
            try {
                const success = await loadModel(modelPath);
                setIsModelReady(success);
                if (!success) {
                    setError('Failed to load gesture model');
                }
            } catch (err) {
                setError(err.message);
            }
        }
        init();
    }, [modelPath]);

    // Process hand landmarks from MediaPipe
    const processLandmarks = useCallback(async (landmarks) => {
        if (!landmarks || !isModelReady) return;

        try {
            // Normalize landmarks to ML features
            const features = normalizeLandmarks(landmarks);
            if (!features) return;

            // Run ML prediction
            const prediction = await predict(features);
            if (!prediction) return;

            // Apply stability pipeline
            const result = stabilityPipelineRef.current.process(prediction);

            // Update state
            setGesture(result.gesture);
            setConfidence(result.confidence);

            // Trigger callback if gesture is stable and actionable
            if (result.shouldTrigger && onGestureDetected) {
                onGestureDetected(result.gesture, result.confidence);
            }
        } catch (err) {
            console.error('Gesture processing error:', err);
        }
    }, [isModelReady, onGestureDetected]);

    // Start detection (placeholder for MediaPipe integration)
    const startDetection = useCallback(async (video) => {
        if (!isModelReady) {
            setError('Model not loaded yet');
            return false;
        }

        videoRef.current = video;
        setIsDetecting(true);
        setError(null);

        // TODO: Initialize MediaPipe Hands here
        // Example:
        // const hands = new Hands({ locateFile: (file) => `...` });
        // hands.onResults((results) => {
        //   if (results.multiHandLandmarks?.[0]) {
        //     processLandmarks(results.multiHandLandmarks[0]);
        //   }
        // });

        console.log('🎥 Gesture detection started (connect MediaPipe here)');
        return true;
    }, [isModelReady, processLandmarks]);

    // Stop detection
    const stopDetection = useCallback(() => {
        setIsDetecting(false);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        if (stabilityPipelineRef.current) {
            stabilityPipelineRef.current.reset();
        }

        setGesture('NONE');
        setConfidence(0);

        console.log('🛑 Gesture detection stopped');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopDetection();
        };
    }, [stopDetection]);

    return {
        gesture,
        confidence,
        isDetecting,
        isModelReady,
        error,
        startDetection,
        stopDetection,
        processLandmarks // Expose for manual landmark feeding
    };
}

export default useGestureDetection;
