import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'healthguard_session';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        console.log('useAuth: Initializing...');
        
        // Get session from Supabase
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useAuth: Error getting session:', error);
          throw error;
        }

        if (!mountedRef.current) return;
        
        if (currentSession) {
          console.log('useAuth: Found active session');
          setSession(currentSession);
          setUser(currentSession.user);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
        } else {
          console.log('useAuth: No active session, checking cache...');
          // Try to restore from cache
          const cachedSession = await AsyncStorage.getItem(SESSION_KEY);
          if (cachedSession) {
            console.log('useAuth: Found cached session, validating...');
            const parsedSession = JSON.parse(cachedSession);
            
            const { data: { session: validSession }, error: sessionError } = await supabase.auth.setSession({
              access_token: parsedSession.access_token,
              refresh_token: parsedSession.refresh_token,
            });
            
            if (sessionError) {
              console.error('useAuth: Cached session invalid:', sessionError);
              await AsyncStorage.removeItem(SESSION_KEY);
              if (mountedRef.current) {
                setSession(null);
                setUser(null);
              }
            } else if (validSession && mountedRef.current) {
              console.log('useAuth: Cached session restored');
              setSession(validSession);
              setUser(validSession.user);
            }
          } else {
            console.log('useAuth: No cached session found');
          }
        }
      } catch (error) {
        console.error('useAuth: Error initializing auth:', error);
        await AsyncStorage.removeItem(SESSION_KEY);
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mountedRef.current) {
          console.log('useAuth: Initialization complete');
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('useAuth: Auth state changed:', event);
      
      if (!mountedRef.current) return;

      // Prevent loops by only updating if session actually changed
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (newSession && mountedRef.current) {
          setSession(newSession);
          setUser(newSession.user);
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
        }
      } else if (event === 'SIGNED_OUT') {
        if (mountedRef.current) {
          setSession(null);
          setUser(null);
          await AsyncStorage.removeItem(SESSION_KEY);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  const signIn = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.session) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
      }
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: undefined,
        },
      });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please disable email confirmation in Supabase Dashboard: Authentication → Providers → Email → Uncheck "Enable email confirmations"');
        }
        throw error;
      }
      
      if (data.user) {
        if (data.session) {
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
          return data;
        }
        
        // If no session, try to sign in
        try {
          const signInResult = await signIn(email, password);
          return signInResult;
        } catch (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Account created but email confirmation is required. Please check your email or disable email confirmation in Supabase settings.');
          }
          throw signInError;
        }
      }
      
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }, [signIn]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      await AsyncStorage.removeItem(SESSION_KEY);
      
      if (mountedRef.current) {
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  return {
    user,
    session,
    loading,
    initialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}