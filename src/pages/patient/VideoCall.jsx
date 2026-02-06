
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    createEmergencyCall,
    endEmergencyCall,
    sendMessage,
    getCallMessages,
    subscribeToMessages,
    subscribeToSignals,
    sendSignal
} from '../../lib/supabase';
import { normalizeLandmarks } from '../../utils/landmarkNormalizer';
import { loadModel, predict, isModelLoaded } from '../../utils/gestureClassifier';

// Quick phrases for text fallback
const QUICK_PHRASES = [
    { text: 'Yes', icon: '✅' },
    { text: 'No', icon: '❌' },
    { text: 'Help', icon: '🆘' },
    { text: 'Pain', icon: '😣' },
    { text: 'Breathing Problem', icon: '😮‍💨' },
    { text: 'Fever', icon: '🤒' },
    { text: "I don't understand", icon: '❓' },
    { text: 'Repeat please', icon: '🔄' }
];

const PatientVideoCall = ({ callData, onEnd }) => {
    const { profile, user } = useAuth();
    const [callStatus, setCallStatus] = useState('connecting'); // connecting, waiting, active, ended
    const [callId, setCallId] = useState(null);
    const [roomUrl, setRoomUrl] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentGesture, setCurrentGesture] = useState(null);
    const [gestureConfidence, setGestureConfidence] = useState(0);
    const [cameraActive, setCameraActive] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const handsRef = useRef(null);
    const animationRef = useRef(null);
    const messagesEndRef = useRef(null);
    const isCreatingCall = useRef(false);

    // Initialize call (supports both emergency and scheduled appointment calls)
    useEffect(() => {
        const initCall = async () => {
            // Prevent double-invocation (React StrictMode or re-renders)
            if (!user?.id || isCreatingCall.current) return;

            // Check if this is a scheduled appointment call (has id but no location)
            const isAppointmentCall = callData?.id && !callData?.location;

            // For emergency calls, we need location
            if (!isAppointmentCall && !callData?.location) return;

            try {
                isCreatingCall.current = true;
                setCallStatus('connecting');

                if (isAppointmentCall) {
                    // Scheduled appointment call - use passed ID directly
                    console.log('📅 Joining scheduled appointment call:', callData.id);
                    setCallId(callData.id);
                    setCallStatus('active');

                    // Auto-start camera for appointment calls so WebRTC can connect
                    await autoStartCamera();

                    // Subscribe to messages for this call
                    const subscription = subscribeToMessages(callData.id, (payload) => {
                        if (payload.new) {
                            setMessages(prev => [...prev, payload.new]);
                        }
                    });

                    return () => {
                        subscription.unsubscribe();
                    };
                } else {
                    // Emergency call - create new call in database
                    console.log('🚨 Creating emergency call...');
                    const { data, error, isExisting } = await createEmergencyCall(
                        user.id,
                        callData.location,
                        profile?.full_name || 'Patient'
                    );

                    if (error) throw error;

                    if (isExisting) {
                        console.log('Rejoining existing call:', data.id);
                    }

                    setCallId(data.id);
                    setCallStatus(data.status === 'active' ? 'active' : 'waiting');

                    // Auto-start camera for emergency calls
                    await autoStartCamera();

                    // Subscribe to messages for this call
                    const subscription = subscribeToMessages(data.id, (payload) => {
                        if (payload.new) {
                            setMessages(prev => [...prev, payload.new]);
                        }
                    });

                    return () => {
                        subscription.unsubscribe();
                    };
                }
            } catch (err) {
                console.error('Failed to create/join call:', err);
                setCallStatus('error');
            }
        };

        initCall();
    }, [callData, user, profile]);

    // Scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Initialize MediaPipe Hands
    const [mediapipeReady, setMediapipeReady] = useState(false);

    useEffect(() => {
        const initHands = async () => {
            try {
                await loadModel();

                if (typeof window !== 'undefined' && window.Hands) {
                    try {
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
                        setMediapipeReady(true);
                        console.log('✅ MediaPipe Hands initialized');
                    } catch (handsErr) {
                        console.warn('⚠️ MediaPipe Hands failed to initialize:', handsErr.message);
                        // Continue without gesture detection
                    }
                } else {
                    console.warn('⚠️ MediaPipe Hands not available - gesture detection disabled');
                }
            } catch (err) {
                console.error('❌ MediaPipe initialization failed:', err);
            }
        };
        initHands();
    }, []);

    // WebRTC Signaling (Answer side)
    const peerConnection = useRef(null);
    const candidateQueue = useRef([]); // Buffer for ICE candidates
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (!callId || !cameraActive || !streamRef.current) return;

        console.log('📡 Subscribing to signals for call:', callId, 'Camera active:', cameraActive);

        // Send patient-ready signal to let doctor know we're ready
        let readyInterval = null;
        let connected = false;

        const sendReadySignal = async () => {
            if (connected) return; // Stop once connected
            console.log('👋 Sending patient-ready signal...');
            await sendSignal(callId, { type: 'patient-ready' });
        };

        // Send ready signal immediately and periodically (less frequent)
        sendReadySignal();
        readyInterval = setInterval(sendReadySignal, 5000); // Reduced frequency

        const subscription = subscribeToSignals(callId, async (data) => {
            console.log('📡 Patient received signal:', data.type);

            if (data.type === 'offer') {
                // Stop sending ready signals
                connected = true;
                if (readyInterval) clearInterval(readyInterval);
                console.log('📞 Received offer, creating answer...');
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                peerConnection.current = pc;

                // Add local stream tracks
                streamRef.current.getTracks().forEach(track => {
                    pc.addTrack(track, streamRef.current);
                });

                // Handle incoming stream (Doctor Video)
                pc.ontrack = (event) => {
                    console.log('🎥 Received Doctor stream', event.streams[0]);
                    event.streams[0].getTracks().forEach(t => console.log('   Track:', t.kind, t.enabled, t.muted));
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                };

                // Handle ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        sendSignal(callId, { type: 'ice-candidate', candidate: event.candidate });
                    }
                };

                // Set remote desc (offer)
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

                // Drain candidate queue (if any arrived before offer processing finished)
                while (candidateQueue.current.length > 0) {
                    const candidate = candidateQueue.current.shift();
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error('Error adding buffered candidate', e);
                    }
                }

                // Create answer
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // Send answer
                await sendSignal(callId, { type: 'answer', answer });
                console.log('✅ Answer sent!');
            } else if (data.type === 'ice-candidate') {
                if (peerConnection.current) {
                    if (peerConnection.current.remoteDescription) {
                        try {
                            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch (e) {
                            console.error('Error adding received ice candidate', e);
                        }
                    } else {
                        console.log('⏳ Buffering ICE candidate');
                        candidateQueue.current.push(data.candidate);
                    }
                }
            }
        });

        return () => {
            clearInterval(readyInterval);
            subscription.unsubscribe();
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, [callId, cameraActive]);

    // Use ref to access latest callId inside MediaPipe callback without re-binding
    const callIdRef = useRef(null);
    useEffect(() => { callIdRef.current = callId; }, [callId]);

    // Handle hand detection
    const handleHandResults = useCallback(async (results) => {
        if (!callIdRef.current) return; // Wait for call ID

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            if (isModelLoaded()) {
                const normalized = normalizeLandmarks(results.multiHandLandmarks[0]);
                const prediction = await predict(normalized);

                // Lower threshold to 0.5 and filter out NONE
                if (prediction && prediction.confidence > 0.90 && prediction.gesture !== 'NONE') {
                    console.log('🤟 Detected:', prediction.gesture);
                    setCurrentGesture(prediction.gesture);
                    setGestureConfidence(prediction.confidence);

                    // Send gesture as message
                    if (prediction.gesture !== currentGesture) {
                        console.log('🚀 Sending gesture:', prediction.gesture);
                        sendMessage(callIdRef.current, user.id, prediction.gesture, 'gesture');
                    }
                } else if (!prediction || prediction.gesture === 'NONE') {
                    if (prediction && prediction.confidence > 0.8) {
                        setCurrentGesture(null);
                        setGestureConfidence(0);
                    }
                }
            }
        } else {
            setCurrentGesture(null);
            setGestureConfidence(0);
        }
    }, [user, currentGesture]); // Removed callId from dependency to avoid re-binding loop

    // Auto-start camera (used when joining calls to activate WebRTC immediately)
    const autoStartCamera = async () => {
        try {
            console.log('📹 Auto-starting camera...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 },
                audio: true // Also get audio for call
            });

            streamRef.current = stream;

            // Wait for video element to be available and start detection
            const initVideo = () => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play()
                        .then(() => {
                            setCameraActive(true);
                            console.log('✅ Camera auto-started for call');
                            // Start gesture detection if hands are available
                            if (handsRef.current) {
                                startDetection();
                                console.log('✅ Gesture detection started');
                            } else {
                                console.log('ℹ️ Camera active, gesture detection not yet ready');
                                // Retry detection start after MediaPipe loads
                                setTimeout(() => {
                                    if (handsRef.current) {
                                        startDetection();
                                        console.log('✅ Gesture detection started (delayed)');
                                    }
                                }, 2000);
                            }
                        })
                        .catch(e => console.warn('Video play error:', e));
                } else {
                    // Video element not ready yet, retry
                    setTimeout(initVideo, 100);
                }
            };

            initVideo();
        } catch (err) {
            console.error('❌ Auto-start camera error:', err);
        }
    };

    // Start camera (manual button click)
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
                // Only start detection if hands are available
                if (handsRef.current) {
                    startDetection();
                } else {
                    console.log('ℹ️ Camera active, but gesture detection not available');
                }
            }
        } catch (err) {
            console.error('Camera error:', err);
        }
    };

    // Detection loop with error handling
    const startDetection = () => {
        const detect = async () => {
            try {
                if (videoRef.current &&
                    handsRef.current &&
                    videoRef.current.readyState >= 2 &&
                    videoRef.current.videoWidth > 0 &&
                    videoRef.current.videoHeight > 0
                ) {
                    await handsRef.current.send({ image: videoRef.current });
                }
            } catch (err) {
                // Silently handle detection errors - don't crash the app
                console.warn('Detection frame error:', err.message);
            }
            animationRef.current = requestAnimationFrame(detect);
        };
        detect();
    };

    // Send quick phrase
    const handleQuickPhrase = async (phrase) => {
        if (!callId) return;

        await sendMessage(callId, user.id, phrase, 'text');
        setMessages(prev => [...prev, {
            id: Date.now(),
            sender_id: user.id,
            content: phrase,
            message_type: 'text',
            created_at: new Date().toISOString()
        }]);
    };

    // End call
    const handleEndCall = async () => {
        if (callId) {
            await endEmergencyCall(callId);
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        onEnd();
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Start camera on mount
    useEffect(() => {
        startCamera();
    }, []);

    // Filter doctor messages
    const doctorMessages = messages.filter(m => m.sender_id !== user?.id);

    return (
        <div className="video-call-container patient-call">
            {/* Header */}
            <header className="call-header">
                <div className="call-status">
                    {callStatus === 'connecting' && <span className="status connecting">🔄 Connecting...</span>}
                    {callStatus === 'waiting' && <span className="status waiting">⏳ Waiting for doctor...</span>}
                    {callStatus === 'active' && <span className="status active">🟢 Call Active</span>}
                </div>
                <button className="btn btn-danger" onClick={handleEndCall}>
                    End Call
                </button>
            </header>

            {/* Main Content */}
            <div className="call-content">
                {/* Video Section */}
                <div className="video-section">
                    <div className="video-wrapper" style={{ position: 'relative', width: '100%', height: '300px', background: '#1a1a2e', borderRadius: '12px', overflow: 'hidden' }}>
                        {/* Doctor Video (Incoming) */}
                        <video
                            ref={remoteVideoRef}
                            className="doctor-video"
                            autoPlay
                            playsInline
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                zIndex: 1
                            }}
                        />
                        {/* Placeholder when no doctor video */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#666',
                            textAlign: 'center',
                            zIndex: 0
                        }}>
                            <span style={{ fontSize: '48px' }}>👨‍⚕️</span>
                            <p>Waiting for doctor video...</p>
                        </div>

                        {/* Self Video (Small overlay) */}
                        <video
                            ref={videoRef}
                            className="self-video"
                            playsInline
                            muted
                            style={{
                                transform: 'scaleX(-1)',
                                position: 'absolute',
                                bottom: '20px',
                                right: '20px',
                                width: '120px',
                                height: '160px',
                                borderRadius: '12px',
                                border: '2px solid rgba(255,255,255,0.2)',
                                zIndex: 2,
                                objectFit: 'cover'
                            }}
                        />

                        {/* Gesture Overlay */}
                        {currentGesture && (
                            <div className="gesture-overlay">
                                <span className="gesture-label">🤟 {currentGesture}</span>
                                <div className="gesture-confidence">
                                    <div
                                        className="confidence-bar"
                                        style={{ width: `${gestureConfidence * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Doctor Messages (Questions) */}
                <div className="messages-section">
                    <h3>👨‍⚕️ Doctor's Messages</h3>

                    <div className="messages-list">
                        {doctorMessages.length === 0 ? (
                            <div className="empty-messages">
                                <p>Waiting for doctor to connect...</p>
                            </div>
                        ) : (
                            doctorMessages.map((msg, index) => (
                                <div
                                    key={msg.id || index}
                                    className={`message doctor-message ${msg.message_type}`}
                                >
                                    <span className="message-content">{msg.content}</span>
                                    <span className="message-time">
                                        {new Date(msg.created_at).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Quick Phrases (Text Fallback) */}
                <div className="quick-phrases-section">
                    <h3>💬 Quick Response (Tap to Send)</h3>
                    <div className="quick-phrases-grid">
                        {QUICK_PHRASES.map((phrase, index) => (
                            <button
                                key={index}
                                className="quick-phrase-btn"
                                onClick={() => handleQuickPhrase(phrase.text)}
                            >
                                <span className="phrase-icon">{phrase.icon}</span>
                                <span className="phrase-text">{phrase.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientVideoCall;
