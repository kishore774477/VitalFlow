import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAlertGeneration } from '../hooks/useAlertGeneration';
import { supabase } from '../lib/supabase';

// Polyfill Alert.alert for Web platform
if (Platform.OS === 'web' && typeof Alert.alert === 'function' && !Alert.alert.patched) {
  Alert.alert = (title, message, buttons) => {
    const fullMessage = title ? `${title}${message ? '\n\n' + message : ''}` : message || '';
    if (buttons && buttons.length > 0) {
      const destructiveButton = buttons.find(b => b.style === 'destructive');
      const standardButton = buttons.find(b => b.style !== 'cancel' && b.style !== 'destructive');
      const confirmButton = destructiveButton || standardButton || buttons[0];
      const hasCancel = buttons.some(b => b.style === 'cancel');
      
      if (hasCancel) {
        const result = window.confirm(fullMessage);
        if (result) {
          if (confirmButton && typeof confirmButton.onPress === 'function') {
            confirmButton.onPress();
          }
        } else {
          const cancelButton = buttons.find(b => b.style === 'cancel');
          if (cancelButton && typeof cancelButton.onPress === 'function') {
            cancelButton.onPress();
          }
        }
      } else {
        window.alert(fullMessage);
        if (confirmButton && typeof confirmButton.onPress === 'function') {
          confirmButton.onPress();
          return;
        }
      }
    } else {
      window.alert(fullMessage);
    }
  };
  Alert.alert.patched = true;
}

const APP_SCREENS = ['home', 'analytics', 'health', 'alerts', 'profile'];

// Watches incoming health readings and raises alerts while the user is signed in,
// whichever screen is open.
function AlertMonitor({ userId }) {
  useAlertGeneration(userId);
  return null;
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const [initialized, setInitialized] = useState(false);
  const [userId, setUserId] = useState(null);
  const hasSession = !!userId;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inApp = APP_SCREENS.includes(segments[0]);
    const inAuth = segments[0] === 'signin' || segments[0] === 'signup';

    if (!hasSession && !inAuth) {
      router.replace('/signin');
    } else if (hasSession && !inApp) {
      router.replace('/home');
    }
  }, [initialized, hasSession, router, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="signin" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="analytics" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="health" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="alerts" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="profile" options={{ headerShown: false, animation: 'none' }} />
      </Stack>
      {hasSession && <AlertMonitor userId={userId} />}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}
