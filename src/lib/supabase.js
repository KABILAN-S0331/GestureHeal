import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: userData
        }
    });
    return { data, error };
};

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Profile helpers
export const getProfile = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
};

export const updateProfile = async (userId, updates) => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    return { data, error };
};

export const getOnlineDoctors = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .eq('is_online', true);
    return { data, error };
};

// Appointment helpers
export const createAppointment = async (patientId, doctorId, scheduledAt, notes) => {
    const { data, error } = await supabase
        .from('appointments')
        .insert({
            patient_id: patientId,
            doctor_id: doctorId,
            scheduled_at: scheduledAt,
            notes: notes,
            status: 'pending'
        })
        .select()
        .single();
    return { data, error };
};

export const getAppointments = async (userId, role) => {
    const column = role === 'doctor' ? 'doctor_id' : 'patient_id';
    const { data, error } = await supabase
        .from('appointments')
        .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(id, full_name, avatar_url),
      doctor:profiles!appointments_doctor_id_fkey(id, full_name, specialization, avatar_url)
    `)
        .eq(column, userId)
        .order('scheduled_at', { ascending: true });
    return { data, error };
};

export const updateAppointmentStatus = async (appointmentId, status) => {
    const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)
        .select()
        .single();
    return { data, error };
};

// Emergency call helpers

// Check if patient has an active call
export const getActivePatientCall = async (patientId) => {
    const { data, error } = await supabase
        .from('emergency_calls')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    return { data, error };
};

export const createEmergencyCall = async (patientId, location, patientName = 'Patient') => {
    // First check if patient already has an active call
    const { data: existingCall } = await getActivePatientCall(patientId);

    if (existingCall) {
        console.log('Patient already has an active call:', existingCall.id);
        return { data: existingCall, error: null, isExisting: true };
    }

    // Create new call
    const { data, error } = await supabase
        .from('emergency_calls')
        .insert({
            patient_id: patientId,
            patient_name: patientName,
            patient_lat: location.lat,
            patient_lng: location.lng,
            status: 'waiting'
        })
        .select()
        .single();

    console.log('Emergency call created:', data?.id);
    return { data, error, isExisting: false };
};

export const getActiveDoctorCall = async (doctorId) => {
    const { data, error } = await supabase
        .from('emergency_calls')
        .select('*')
        .eq('doctor_id', doctorId)
        .in('status', ['active']) // Only get active calls
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    return { data, error };
};

export const getNearbyEmergencyCalls = async (doctorLocation, radiusKm = 50) => {
    console.log('Fetching emergency calls near:', doctorLocation);

    // Get all calls that need a doctor (doctor_id is null and not ended)
    const { data, error } = await supabase
        .from('emergency_calls')
        .select('*')
        .is('doctor_id', null)
        .neq('status', 'ended')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching emergency calls:', error);
        return { data: null, error };
    }

    console.log('Found emergency calls:', data?.length || 0, data);

    // Calculate distance (but don't filter by distance for now - show all)
    const nearbyData = data?.map(call => {
        let distance = 0;
        if (doctorLocation?.lat && call.patient_lat) {
            distance = calculateDistance(
                doctorLocation.lat, doctorLocation.lng,
                call.patient_lat, call.patient_lng
            );
        }
        return {
            ...call,
            patient_name: call.patient_name || 'Unknown Patient',
            distance_km: distance || 0
        };
    }) || [];

    console.log('Processed calls with distance:', nearbyData);
    return { data: nearbyData, error: null };
};

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const acceptEmergencyCall = async (callId, doctorId, roomUrl) => {
    const { data, error } = await supabase
        .from('emergency_calls')
        .update({
            doctor_id: doctorId,
            room_url: roomUrl,
            status: 'active'
        })
        .eq('id', callId)
        .select()
        .single();
    return { data, error };
};

export const endEmergencyCall = async (callId) => {
    const { data, error } = await supabase
        .from('emergency_calls')
        .update({ status: 'ended' })
        .eq('id', callId)
        .select()
        .single();
    return { data, error };
};

// Chat message helpers
export const sendMessage = async (callId, senderId, content, messageType = 'text') => {
    const { data, error } = await supabase
        .from('chat_messages')
        .insert({
            call_id: callId,
            sender_id: senderId,
            content,
            message_type: messageType
        })
        .select()
        .single();
    return { data, error };
};

export const getCallMessages = async (callId) => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('call_id', callId)
        .order('created_at', { ascending: true });
    return { data, error };
};

// Sign videos helpers
export const getSignVideos = async (category = null) => {
    let query = supabase.from('sign_videos').select('*');
    if (category) {
        query = query.eq('category', category);
    }
    const { data, error } = await query;
    return { data, error };
};

// Realtime subscriptions
export const subscribeToEmergencyCalls = (callback) => {
    return supabase
        .channel('emergency_calls')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'emergency_calls' },
            callback
        )
        .subscribe();
};

export const subscribeToMessages = (callId, callback) => {
    return supabase
        .channel(`messages:${callId}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
                if (payload.new && payload.new.call_id === callId) {
                    callback(payload);
                }
            }
        )
        .subscribe();
};

export const subscribeToAppointments = (userId, role, callback) => {
    const column = role === 'doctor' ? 'doctor_id' : 'patient_id';
    return supabase
        .channel(`appointments:${userId}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'appointments', filter: `${column}=eq.${userId}` },
            callback
        )
        .subscribe();
};

// WebRTC Signaling (using Broadcast channel)
export const subscribeToSignals = (callId, callback) => {
    return supabase
        .channel(`signaling:${callId}`)
        .on('broadcast', { event: 'signal' }, (payload) => callback(payload.payload))
        .subscribe();
};

export const sendSignal = async (callId, signalData) => {
    return supabase
        .channel(`signaling:${callId}`)
        .send({
            type: 'broadcast',
            event: 'signal',
            payload: signalData
        });
};
