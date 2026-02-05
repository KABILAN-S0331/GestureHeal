/**
 * useMediaPipe Hook
 * Initializes MediaPipe Hands and provides landmark detection
 * 
 * This hook handles:
 * - Loading MediaPipe Hands
 * - Camera setup
 * - Continuous landmark detection
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// MediaPipe CDN URLs
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands';

/**
 * Hook to manage MediaPipe Hands detection
 * @param {Object} options - Configuration
 * @returns {Object} - { landmarks, isReady, error, videoRef, startCamera, stopCamera }
 */
export function useMediaPipe(options = {}) {
    const {
        maxNumHands = 1,
        modelComplexity = 1,
        minDetectionConfidence = 0.7,
        minTrackingConfidence = 0.5,
        onLandmarksDetected = null
    } = options;

    // State
    const [landmarks, setLandmarks] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [error, setError] = useState(null);

    // Refs
    const videoRef = useRef(null);
    const handsRef = useRef(null);
    const streamRef = useRef(null);
    const animationRef = useRef(null);

    // Initialize MediaPipe Hands
    const initializeHands = useCallback(async () => {
        try {
            // Dynamically load MediaPipe
            const { Hands } = await import('@mediapipe/hands');

            handsRef.current = new Hands({
                locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`
            });

            handsRef.current.setOptions({
                maxNumHands,
                modelComplexity,
                minDetectionConfidence,
                minTrackingConfidence
            });

            handsRef.current.onResults((results) => {
                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    const detectedLandmarks = results.multiHandLandmarks[0];
                    setLandmarks(detectedLandmarks);

                    if (onLandmarksDetected) {
                        onLandmarksDetected(detectedLandmarks);
                    }
                } else {
                    setLandmarks(null);
                }
            });

            await handsRef.current.initialize();
            setIsReady(true);
            console.log('✅ MediaPipe Hands initialized');
        } catch (err) {
            console.error('MediaPipe initialization error:', err);
            setError('Failed to initialize hand detection');
        }
    }, [maxNumHands, modelComplexity, minDetectionConfidence, minTrackingConfidence, onLandmarksDetected]);

    // Start camera and detection
    const startCamera = useCallback(async (videoElement) => {
        if (!videoElement) {
            setError('No video element provided');
            return false;
        }

        videoRef.current = videoElement;

        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            streamRef.current = stream;
            videoElement.srcObject = stream;
            await videoElement.play();

            setIsCameraActive(true);
            console.log('📷 Camera started');

            // Start detection loop
            const detect = async () => {
                if (handsRef.current && videoElement.readyState >= 2) {
                    await handsRef.current.send({ image: videoElement });
                }
                animationRef.current = requestAnimationFrame(detect);
            };

            detect();
            return true;
        } catch (err) {
            console.error('Camera error:', err);
            setError('Failed to access camera');
            return false;
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setIsCameraActive(false);
        setLandmarks(null);
        console.log('📷 Camera stopped');
    }, []);

    // Initialize on mount
    useEffect(() => {
        initializeHands();

        return () => {
            stopCamera();
            if (handsRef.current) {
                handsRef.current.close();
            }
        };
    }, [initializeHands, stopCamera]);

    return {
        landmarks,
        isReady,
        isCameraActive,
        error,
        videoRef,
        startCamera,
        stopCamera
    };
}

export default useMediaPipe;
