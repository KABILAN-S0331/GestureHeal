import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    endEmergencyCall,
    sendMessage,
    getCallMessages,
    subscribeToMessages,
    getSignVideos,
    subscribeToSignals,
    sendSignal
} from '../../lib/supabase';

// Quick response buttons with associated sign videos
const QUICK_RESPONSES = {
    questions: [
        { id: 1, text: '❓ Where is the pain?', phrase: 'Where is the pain?' },
        { id: 2, text: '❓ Can you breathe?', phrase: 'Can you breathe?' },
        { id: 3, text: '❓ Are you bleeding?', phrase: 'Are you bleeding?' },
        { id: 4, text: '❓ Is the pain severe?', phrase: 'Is the pain severe?' },
        { id: 5, text: '❓ Do you have fever?', phrase: 'Do you have fever?' },
        { id: 6, text: '❓ Show me the wound', phrase: 'Show me the wound' }
    ],
    instructions: [
        { id: 7, text: '📢 Help is coming', phrase: 'Help is coming' },
        { id: 8, text: '📢 Stay calm', phrase: 'Stay calm' },
        { id: 9, text: '📢 Take deep breaths', phrase: 'Take deep breaths' },
        { id: 10, text: '📢 Drink some water', phrase: 'Drink some water' },
        { id: 11, text: '📢 Keep pressure on wound', phrase: 'Keep pressure on wound' },
        { id: 12, text: '📢 Ambulance on the way', phrase: 'Ambulance on the way' }
    ]
};

const DoctorVideoCall = ({ callData, onEnd }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [signVideos, setSignVideos] = useState([]);
    const [playingVideo, setPlayingVideo] = useState(null);
    const [callDuration, setCallDuration] = useState(0);

    const videoRef = useRef(null);
    const signVideoRef = useRef(null);
    const messagesEndRef = useRef(null);
    const timerRef = useRef(null);

    // Load messages and sign videos
    useEffect(() => {
        const init = async () => {
            // Get existing messages
            if (callData?.id) {
                const { data } = await getCallMessages(callData.id);
                if (data) setMessages(data);

                // Subscribe to new messages
                const subscription = subscribeToMessages(callData.id, (payload) => {
                    if (payload.new) {
                        setMessages(prev => [...prev, payload.new]);
                    }
                });

                return () => subscription.unsubscribe();
            }

            // Load sign videos
            const { data: videos } = await getSignVideos();
            if (videos) setSignVideos(videos);
        };

        init();
    }, [callData]);

    // Call duration timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Auto-scroll disabled - was causing page to jump on new gestures
    // useEffect(() => {
    //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // }, [messages]);

    // Format duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Poll for messages as fallback (fix for missing Realtime events)
    useEffect(() => {
        if (!callData?.id) return;

        const fetchMessages = async () => {
            const { data } = await getCallMessages(callData.id);
            if (data) {
                // Merge with existing to avoid jitter, or just replace if simple
                // For safety/simplicity, we just replace since list is append-only usually
                setMessages(data);
            }
        };

        // Poll every 2 seconds
        const pollInterval = setInterval(fetchMessages, 2000);
        return () => clearInterval(pollInterval);
    }, [callData?.id]);

    // Send quick response
    const handleQuickResponse = async (response) => {
        if (!callData?.id) return;

        // Send message
        await sendMessage(callData.id, user.id, response.phrase, 'quick_response');
        setMessages(prev => [...prev, {
            id: Date.now(),
            sender_id: user.id,
            content: response.phrase,
            message_type: 'quick_response',
            created_at: new Date().toISOString()
        }]);

        // Find and play sign video
        const video = signVideos.find(v => v.phrase === response.phrase);
        if (video) {
            setPlayingVideo(video);
        }
    };

    // End call
    const handleEndCall = async () => {
        if (callData?.id) {
            await endEmergencyCall(callData.id);
        }
        if (timerRef.current) clearInterval(timerRef.current);
        onEnd();
    };

    // Filter patient messages (gestures and text)
    const patientMessages = messages.filter(m => m.sender_id !== user?.id);
    console.log('📨 Messages State:', {
        total: messages.length,
        filtered: patientMessages.length,
        userId: user?.id
    });
    if (messages.length > 0 && patientMessages.length === 0) {
        console.warn('⚠️ All messages filtered out! Check sender_ids:', messages.map(m => m.sender_id));
    }

    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const candidateQueue = useRef([]); // Buffer for ICE candidates
    const offerSent = useRef(false);

    // WebRTC Signaling (Offer side - waits for patient ready)
    useEffect(() => {
        console.log('🔄 DoctorVideoCall Effect Triggered. CallData:', callData);
        if (!callData?.id) {
            console.error('❌ No Call ID provided!');
            return;
        }

        let pc = null;
        let localStream = null;
        let offerInterval = null;

        const initCall = async () => {
            console.log('📞 Initializing WebRTC call...');
            pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            peerConnection.current = pc;

            // Get local stream (Doctor)
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                console.log('📹 Doctor camera acquired');

                // Add tracks to PC
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });
            } catch (err) {
                console.error('❌ Error accessing media devices:', err);
            }

            // Handle incoming stream (Patient Video)
            pc.ontrack = (event) => {
                console.log('🎥 Received remote stream');
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    sendSignal(callData.id, { type: 'ice-candidate', candidate: event.candidate });
                }
            };

            // Function to send offer
            const sendOffer = async () => {
                if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
                    console.log('⚠️ Cannot send offer in state:', pc.signalingState);
                    return;
                }

                try {
                    const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
                    await pc.setLocalDescription(offer);
                    await sendSignal(callData.id, { type: 'offer', offer });
                    console.log('✅ Offer sent');
                    offerSent.current = true;
                } catch (e) {
                    console.error('Error creating offer:', e);
                }
            };

            // Subscribe to signals FIRST (before sending offer)
            const subscription = subscribeToSignals(callData.id, async (data) => {
                console.log('📡 Doctor received signal:', data.type);

                if (data.type === 'patient-ready') {
                    // Patient is ready, send offer now
                    console.log('👋 Patient ready signal received, sending offer...');
                    await sendOffer();
                } else if (data.type === 'answer') {
                    console.log('✅ Received answer, stopping offer resend');
                    // Stop resending offers - connection established
                    if (offerInterval) {
                        clearInterval(offerInterval);
                        offerInterval = null;
                    }
                    if (pc.signalingState === 'have-local-offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

                        // Drain candidate queue
                        while (candidateQueue.current.length > 0) {
                            const candidate = candidateQueue.current.shift();
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error('Error adding buffered candidate', e);
                            }
                        }
                    }
                } else if (data.type === 'ice-candidate') {
                    if (pc.remoteDescription) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch (e) {
                            console.error('Error adding ice candidate', e);
                        }
                    } else {
                        candidateQueue.current.push(data.candidate);
                    }
                }
            });

            // Also periodically send offer in case patient missed it (reduced frequency)
            offerInterval = setInterval(async () => {
                if (!offerSent.current || pc.connectionState === 'disconnected') {
                    console.log('🔄 Re-sending offer...');
                    await sendOffer();
                }
            }, 5000); // 5 seconds to reduce overhead

            // Send initial offer immediately too (for patients already waiting)
            setTimeout(() => sendOffer(), 500);

            return subscription;
        };

        const subscriptionPromise = initCall();

        return () => {
            subscriptionPromise.then(sub => sub?.unsubscribe?.());
            if (offerInterval) clearInterval(offerInterval);
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, [callData?.id]);

    return (
        <div className="video-call-container doctor-call">
            {/* Header */}
            <header className="call-header">
                <div className="call-info">
                    <span className="patient-name">
                        🤟 Patient: {callData?.patient_name || 'Unknown'}
                    </span>
                    <span className="call-timer">
                        ⏱️ {formatDuration(callDuration)}
                    </span>
                </div>
                <button className="btn btn-danger" onClick={handleEndCall}>
                    End Call
                </button>
            </header>


            {/* Main Content */}
            <div className="call-content">
                {/* Left: Patient Video & Gestures */}
                <div className="video-section">
                    {/* Patient Video Feed */}
                    <div className="video-wrapper patient-video">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="remote-video"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#222' }}
                        />
                    </div>

                    {/* Detected Gestures */}
                    <div className="gestures-panel">
                        <h3>🤟 Detected Signs</h3>
                        <div className="gesture-list">
                            {/* SHOW ALL GESTURES (Ignore Sender ID) */}
                            {(() => {
                                // Get all gesture messages
                                const gestures = messages.filter(m => m.message_type === 'gesture');

                                // Deduplicate consecutive identical gestures
                                const uniqueGestures = gestures.reduce((acc, curr) => {
                                    const last = acc[acc.length - 1];
                                    if (!last || last.content !== curr.content) {
                                        acc.push(curr);
                                    }
                                    return acc;
                                }, []);

                                if (uniqueGestures.length === 0) {
                                    return <p className="no-gestures">Waiting for patient signs...</p>;
                                }

                                // Show last 10 gestures (increased from 5)
                                return uniqueGestures.slice(-10).reverse().map((msg, idx) => (
                                    <div key={`gesture-${msg.id}-${idx}-${msg.created_at}`} className={`gesture-item ${idx === 0 ? 'latest' : ''}`}>
                                        <span className="gesture-label">🤟 {msg.content}</span>
                                        <span className="gesture-time">
                                            {new Date(msg.created_at).toLocaleTimeString([], {
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                {/* Right: Controls & Chat */}
                <div className="controls-section">
                    {/* Quick Response Buttons */}
                    <div className="quick-responses">
                        <h3>❓ Ask Patient</h3>
                        <div className="response-grid">
                            {QUICK_RESPONSES.questions.map(response => (
                                <button
                                    key={response.id}
                                    className="response-btn question"
                                    onClick={() => handleQuickResponse(response)}
                                >
                                    {response.text}
                                </button>
                            ))}
                        </div>

                        <h3>📢 Give Instruction</h3>
                        <div className="response-grid">
                            {QUICK_RESPONSES.instructions.map(response => (
                                <button
                                    key={response.id}
                                    className="response-btn instruction"
                                    onClick={() => handleQuickResponse(response)}
                                >
                                    {response.text}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat History */}
                    <div className="chat-panel">
                        <h3>💬 Conversation</h3>
                        <div className="chat-messages">
                            {messages.length === 0 ? (
                                <p className="no-messages">No messages yet</p>
                            ) : (
                                messages.map((msg, index) => (
                                    <div
                                        key={`msg-${msg.id}-${index}-${msg.created_at}`}
                                        className={`chat-message ${msg.sender_id === user.id ? 'sent' : 'received'} ${msg.message_type}`}
                                    >
                                        <span className="message-type-icon">
                                            {msg.message_type === 'gesture' && '🤟'}
                                            {msg.message_type === 'text' && '💬'}
                                            {msg.message_type === 'quick_response' && '📢'}
                                        </span>
                                        <span className="message-content">{msg.content}</span>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sign Video Overlay */}
            {
                playingVideo && (
                    <div className="sign-video-overlay" onClick={() => setPlayingVideo(null)}>
                        <div className="sign-video-modal" onClick={e => e.stopPropagation()}>
                            <div className="video-header">
                                <span>🤟 Sign: "{playingVideo.phrase}"</span>
                                <button className="close-btn" onClick={() => setPlayingVideo(null)}>✕</button>
                            </div>
                            <div className="video-container">
                                {playingVideo.video_url ? (
                                    <video
                                        ref={signVideoRef}
                                        src={playingVideo.video_url}
                                        autoPlay
                                        onEnded={() => setPlayingVideo(null)}
                                        controls
                                    />
                                ) : (
                                    <div className="video-placeholder">
                                        <span>🎬</span>
                                        <p>Sign video for: "{playingVideo.phrase}"</p>
                                        <span className="subtitle">Video file not available</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DoctorVideoCall;
