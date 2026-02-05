import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

/**
 * Daily.co Video Call Component
 * Embeds a Daily.co video call room
 */
const DailyVideoFrame = ({
    roomUrl,
    userName,
    onJoined,
    onLeft,
    onParticipantJoined,
    onParticipantLeft,
    onError
}) => {
    const containerRef = useRef(null);
    const callRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!roomUrl || !containerRef.current) return;

        const initCall = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Create Daily.co call frame
                const callFrame = DailyIframe.createFrame(containerRef.current, {
                    iframeStyle: {
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        border: '0',
                        borderRadius: '12px'
                    },
                    showLeaveButton: true,
                    showFullscreenButton: true
                });

                callRef.current = callFrame;

                // Set up event handlers
                callFrame.on('joined-meeting', (event) => {
                    setIsLoading(false);
                    onJoined?.(event);
                });

                callFrame.on('left-meeting', (event) => {
                    onLeft?.(event);
                });

                callFrame.on('participant-joined', (event) => {
                    onParticipantJoined?.(event);
                });

                callFrame.on('participant-left', (event) => {
                    onParticipantLeft?.(event);
                });

                callFrame.on('error', (event) => {
                    setError(event.errorMsg);
                    onError?.(event);
                });

                // Join the room
                await callFrame.join({
                    url: roomUrl,
                    userName: userName || 'Guest'
                });

            } catch (err) {
                console.error('Failed to join Daily call:', err);
                setError(err.message);
                setIsLoading(false);
                onError?.(err);
            }
        };

        initCall();

        // Cleanup
        return () => {
            if (callRef.current) {
                callRef.current.destroy();
                callRef.current = null;
            }
        };
    }, [roomUrl]);

    return (
        <div className="daily-video-container">
            {isLoading && (
                <div className="video-loading">
                    <div className="loading-spinner"></div>
                    <p>Connecting to video call...</p>
                </div>
            )}

            {error && (
                <div className="video-error">
                    <span>⚠️</span>
                    <p>Failed to connect: {error}</p>
                </div>
            )}

            <div
                ref={containerRef}
                className="daily-frame-container"
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: '400px',
                    backgroundColor: '#1a1a2e',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}
            />
        </div>
    );
};

export default DailyVideoFrame;
