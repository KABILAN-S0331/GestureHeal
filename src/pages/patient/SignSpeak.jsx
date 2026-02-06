import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeLandmarks } from '../../utils/landmarkNormalizer';
import { loadModel, predict, isModelLoaded, GESTURE_LABELS } from '../../utils/gestureClassifier';

// Phrase templates for gestures
const GESTURE_PHRASES = {
    'Help': 'I need help',
    'Pain': 'I am experiencing pain',
    'Fever': 'I am having fever',
    'Yes': 'Yes, that is correct',
    'No': 'No, that is not right',
    'Water': 'I need water',
    'Medicine': 'I need medicine',
    'Hospital': 'I need to go to the hospital',
    'Emergency': 'This is an emergency',
    'Thank You': 'Thank you for your help',
    'Hello': 'Hello, I need assistance',
    'Breathing': 'I am having trouble breathing',
    'Dizzy': 'I am feeling dizzy',
    'Blood': 'There is bleeding',
    'Cough': 'I have a cough'
};

const SignSpeak = ({ onBack }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [modelLoading, setModelLoading] = useState(true);
    const [currentGesture, setCurrentGesture] = useState(null);
    const [confidence, setConfidence] = useState(0);
    const [phraseHistory, setPhraseHistory] = useState([]);
    const [showPhrase, setShowPhrase] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const streamRef = useRef(null);
    const animationRef = useRef(null);

    // Load ML model
    useEffect(() => {
        const initModel = async () => {
            try {
                await loadModel();
                setModelLoading(false);
            } catch (err) {
                console.error('Model load error:', err);
                setModelLoading(false);
            }
        };
        initModel();
    }, []);

    // Initialize MediaPipe Hands
    useEffect(() => {
        const initHands = async () => {
            if (typeof window !== 'undefined' && window.Hands) {
                handsRef.current = new window.Hands({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                });

                handsRef.current.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                });

                handsRef.current.onResults(handleHandResults);
            }
        };
        initHands();
    }, []);

    // Handle hand detection results
    const lastGestureRef = useRef(null);

    const handleHandResults = useCallback(async (results) => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Draw landmarks
            for (const landmarks of results.multiHandLandmarks) {
                drawLandmarks(ctx, landmarks);
            }

            // Predict gesture
            if (isModelLoaded()) {
                const normalized = normalizeLandmarks(results.multiHandLandmarks[0]);
                const prediction = await predict(normalized);

                if (prediction && prediction.confidence > 0.85) {
                    // Only update if it's a NEW different gesture
                    if (prediction.gesture !== lastGestureRef.current) {
                        lastGestureRef.current = prediction.gesture;
                        setCurrentGesture(prediction.gesture);
                        setConfidence(prediction.confidence);

                        // Generate phrase
                        const phrase = GESTURE_PHRASES[prediction.gesture] || prediction.gesture;

                        // Add to history (already deduplicated by checking last entry)
                        setPhraseHistory(prev => {
                            // Don't add if same as last entry
                            if (prev.length > 0 && prev[prev.length - 1].gesture === prediction.gesture) {
                                return prev;
                            }
                            return [...prev, {
                                gesture: prediction.gesture,
                                phrase: phrase,
                                time: new Date().toLocaleTimeString()
                            }];
                        });
                        setShowPhrase(true);
                        setTimeout(() => setShowPhrase(false), 3000);
                    } else {
                        // Same gesture - just update confidence
                        setConfidence(prediction.confidence);
                    }
                }
            }
        }
        // Note: We do NOT clear currentGesture when hand is removed
        // The gesture stays visible until a new different gesture is detected
    }, []);

    // Draw hand landmarks
    const drawLandmarks = (ctx, landmarks) => {
        ctx.fillStyle = '#4CAF50';
        for (const landmark of landmarks) {
            const x = landmark.x * canvasRef.current.width;
            const y = landmark.y * canvasRef.current.height;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    };

    // Start camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraActive(true);
                startDetection();
            }
        } catch (err) {
            console.error('Camera error:', err);
            setCameraError('Camera access denied. Please allow camera permissions.');
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        setCameraActive(false);
    };

    // Detection loop
    const startDetection = () => {
        const detect = async () => {
            if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
                await handsRef.current.send({ image: videoRef.current });
            }
            animationRef.current = requestAnimationFrame(detect);
        };
        detect();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Speak phrase
    const speakPhrase = (phrase) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(phrase);
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="signspeak-container">
            {/* Header */}
            <header className="signspeak-header">
                <button className="btn btn-ghost" onClick={onBack}>
                    ← Back
                </button>
                <div className="header-title">
                    <span className="offline-badge">📴 Offline</span>
                    <h1>SignSpeak</h1>
                </div>
                <div className="header-spacer"></div>
            </header>

            {/* Main Content */}
            <div className="signspeak-content">
                {/* Camera Section */}
                <div className="camera-section">
                    <div className="video-container">
                        <video
                            ref={videoRef}
                            className="camera-feed"
                            playsInline
                            muted
                            style={{ transform: 'scaleX(-1)' }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="landmark-overlay"
                            width={640}
                            height={480}
                        />

                        {!cameraActive && (
                            <div className="camera-placeholder">
                                {cameraError ? (
                                    <div className="camera-error">
                                        <span>⚠️</span>
                                        <p>{cameraError}</p>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={startCamera}
                                        disabled={modelLoading}
                                    >
                                        {modelLoading ? (
                                            <>
                                                <span className="spinner"></span>
                                                Loading Model...
                                            </>
                                        ) : (
                                            <>📷 Start Camera</>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {cameraActive && (
                            <button
                                className="stop-camera-btn"
                                onClick={stopCamera}
                            >
                                ⏹ Stop
                            </button>
                        )}
                    </div>

                    {/* Current Detection */}
                    {currentGesture && (
                        <div className={`detection-result ${showPhrase ? 'show' : ''}`}>
                            <div className="gesture-badge">
                                🤟 {currentGesture}
                            </div>
                            <div className="phrase-output">
                                "{GESTURE_PHRASES[currentGesture] || currentGesture}"
                            </div>
                            <div className="confidence-bar">
                                <div
                                    className="confidence-fill"
                                    style={{ width: `${confidence * 100}%` }}
                                />
                            </div>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => speakPhrase(GESTURE_PHRASES[currentGesture] || currentGesture)}
                            >
                                🔊 Speak
                            </button>
                        </div>
                    )}
                </div>

                {/* Phrase History */}
                <div className="history-section">
                    <h2>📝 Phrase History</h2>

                    {phraseHistory.length === 0 ? (
                        <div className="empty-history">
                            <p>Show signs to the camera to generate phrases</p>
                        </div>
                    ) : (
                        <div className="phrase-list">
                            {[...phraseHistory].reverse().map((item, index) => (
                                <div key={index} className="phrase-item">
                                    <div className="phrase-gesture">{item.gesture}</div>
                                    <div className="phrase-text">"{item.phrase}"</div>
                                    <div className="phrase-actions">
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => speakPhrase(item.phrase)}
                                        >
                                            🔊
                                        </button>
                                        <span className="phrase-time">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {phraseHistory.length > 0 && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setPhraseHistory([])}
                        >
                            Clear History
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Signs Reference */}
            <div className="signs-reference">
                <h3>Quick Signs</h3>
                <div className="signs-grid">
                    {Object.entries(GESTURE_PHRASES).slice(0, 6).map(([gesture, phrase]) => (
                        <div key={gesture} className="sign-ref-item">
                            <span className="sign-name">{gesture}</span>
                            <span className="sign-phrase">→ {phrase}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SignSpeak;
