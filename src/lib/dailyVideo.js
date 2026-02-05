// Daily.co Video Service Integration
// Uses Pipecat Cloud for room management

const PIPECAT_API_KEY = import.meta.env.VITE_PIPECAT_API_KEY;
const DAILY_DOMAIN = import.meta.env.VITE_DAILY_DOMAIN;

const PIPECAT_API_URL = 'https://api.pipecat.ai/v1';

/**
 * Create a new video room
 * @returns {Promise<{room_url: string, room_name: string}>}
 */
export const createVideoRoom = async (roomName = null) => {
    try {
        const name = roomName || `gestureheal-${Date.now()}`;

        const response = await fetch(`${PIPECAT_API_URL}/rooms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PIPECAT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                properties: {
                    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
                    enable_recording: false,
                    start_video_off: false,
                    start_audio_off: false
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create room');
        }

        const data = await response.json();
        return {
            room_url: data.url || `https://${DAILY_DOMAIN}.daily.co/${name}`,
            room_name: name
        };
    } catch (error) {
        console.error('Error creating video room:', error);
        // Fallback to direct Daily.co URL
        const fallbackName = `emergency-${Date.now()}`;
        return {
            room_url: `https://${DAILY_DOMAIN}.daily.co/${fallbackName}`,
            room_name: fallbackName
        };
    }
};

/**
 * Create a meeting token for a participant
 * @param {string} roomName 
 * @param {string} userName 
 * @param {boolean} isOwner 
 * @returns {Promise<string>}
 */
export const createMeetingToken = async (roomName, userName, isOwner = false) => {
    try {
        const response = await fetch(`${PIPECAT_API_URL}/meeting-tokens`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PIPECAT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: {
                    room_name: roomName,
                    user_name: userName,
                    is_owner: isOwner,
                    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create token');
        }

        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error creating meeting token:', error);
        return null;
    }
};

/**
 * Delete a video room
 * @param {string} roomName 
 */
export const deleteVideoRoom = async (roomName) => {
    try {
        await fetch(`${PIPECAT_API_URL}/rooms/${roomName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${PIPECAT_API_KEY}`
            }
        });
    } catch (error) {
        console.error('Error deleting room:', error);
    }
};

/**
 * Get Daily.co room URL helper
 */
export const getDailyRoomUrl = (roomName) => {
    return `https://${DAILY_DOMAIN}.daily.co/${roomName}`;
};

export default {
    createVideoRoom,
    createMeetingToken,
    deleteVideoRoom,
    getDailyRoomUrl
};
