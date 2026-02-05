import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getProfile } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch user profile from database (or create default if missing)
    const fetchProfile = async (userId, userEmail = null, userMetadata = null) => {
        const role = userMetadata?.role || 'patient';
        const fullName = userMetadata?.full_name || 'User';
        const fallbackProfile = { id: userId, role: role, full_name: fullName, email: userEmail };

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );

        try {
            console.log('Fetching profile for:', userId);

            const fetchPromise = getProfile(userId);
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error || !data) {
                console.log('No profile found or error, using/creating default profile...');

                // Try to create profile
                try {
                    const { data: newProfile, error: createError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: userId,
                            full_name: fullName,
                            email: userEmail,
                            role: role
                        })
                        .select()
                        .single();

                    if (!createError && newProfile) {
                        console.log('Created profile:', newProfile);
                        setProfile(newProfile);
                        return;
                    }
                } catch (e) {
                    console.log('Profile creation failed, using fallback');
                }

                // Use fallback if creation fails
                setProfile(fallbackProfile);
            } else {
                console.log('Profile loaded:', data);
                setProfile(data);
            }
        } catch (err) {
            console.error('Error fetching profile (timeout?):', err);
            // Set fallback profile to prevent infinite loading
            setProfile(fallbackProfile);
        }
    };

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Sign up function with fallback profile creation
    const signUp = async (email, password, fullName, role, licenseNumber = null) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Starting signup for:', email, 'role:', role);

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        license_number: licenseNumber
                    }
                }
            });

            if (error) {
                console.error('Auth signup error:', error);
                throw error;
            }

            console.log('Auth signup successful, user:', data?.user?.id);

            // If signup successful, try to create profile manually as fallback
            if (data?.user) {
                console.log('Attempting to create profile for user:', data.user.id);

                // Try to create profile
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: data.user.id,
                    full_name: fullName,
                    email: email,
                    role: role,
                    license_number: licenseNumber,
                    specialization: role === 'doctor' ? 'General Physician' : null
                });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                    // Don't throw - signup still succeeded, user can login
                    // but show warning about profile
                    console.warn('Profile creation failed but auth succeeded');
                } else {
                    console.log('Profile created successfully');
                }
            }

            return { data, error: null };
        } catch (err) {
            console.error('SignUp error:', err);
            setError(err.message || 'Database error saving new user');
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    };

    // Sign in function
    const signIn = async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            setError(err.message);
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    };

    // Sign out function
    const signOut = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setUser(null);
            setProfile(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Update profile
    const updateUserProfile = async (updates) => {
        if (!user) {
            console.error('updateUserProfile: No user logged in');
            return { error: new Error('No user logged in') };
        }

        console.log('updateUserProfile: Updating with:', updates);

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) {
                // Ignore abort errors (caused by React StrictMode)
                if (error.message?.includes('abort') || error.name === 'AbortError') {
                    console.log('updateUserProfile: Ignoring abort error (StrictMode)');
                    // Update local state anyway since the request likely succeeded
                    setProfile(prev => ({ ...prev, ...updates }));
                    return { data: { ...profile, ...updates }, error: null };
                }
                console.error('updateUserProfile error:', error);
                throw error;
            }

            console.log('updateUserProfile success:', data);
            setProfile(data);
            return { data, error: null };
        } catch (err) {
            // Also catch abort errors here
            if (err.message?.includes('abort') || err.name === 'AbortError') {
                console.log('updateUserProfile: Ignoring caught abort error');
                setProfile(prev => ({ ...prev, ...updates }));
                return { data: { ...profile, ...updates }, error: null };
            }
            console.error('updateUserProfile catch:', err);
            setError(err.message);
            return { data: null, error: err };
        }
    };

    const value = {
        user,
        profile,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        updateUserProfile,
        isAuthenticated: !!user,
        isDoctor: profile?.role === 'doctor',
        isPatient: profile?.role === 'patient'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
