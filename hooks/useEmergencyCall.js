import * as Location from 'expo-location';
import { useState, useEffect } from 'react';
import { Linking, Platform, Alert } from 'react-native';
import { getEmergencyNumber } from '../utils/emergencyNumbers';

export function useEmergencyCall() {
  const [emergencyNumber, setEmergencyNumber] = useState('112');
  const [location, setLocation] = useState(null);
  const [countryCode, setCountryCode] = useState(null);

  useEffect(() => {
    detectCountry();
  }, []);

  const detectCountry = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation(currentLocation);

      // Reverse geocode to get country
      const geocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (geocode && geocode[0]) {
        const detectedCountryCode = geocode[0].isoCountryCode;
        setCountryCode(detectedCountryCode);
        const number = getEmergencyNumber(detectedCountryCode);
        setEmergencyNumber(number);
        console.log(`Detected country: ${detectedCountryCode}, Emergency number: ${number}`);
      }
    } catch (error) {
      console.error('Error detecting country:', error);
      // Fallback to default emergency number
      setEmergencyNumber('112');
    }
  };

  const makeEmergencyCall = async () => {
    try {
      // Refresh location before calling
      await detectCountry();

      const phoneUrl = Platform.select({
        ios: `telprompt:${emergencyNumber}`,
        android: `tel:${emergencyNumber}`,
      });

      const canCall = await Linking.canOpenURL(phoneUrl);
      
      if (canCall) {
        Alert.alert(
          'Emergency Call',
          `Calling ${emergencyNumber} (${countryCode || 'Unknown location'})`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Call',
              style: 'destructive',
              onPress: () => Linking.openURL(phoneUrl),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    } catch (error) {
      console.error('Error making emergency call:', error);
      Alert.alert('Error', 'Failed to initiate emergency call');
    }
  };

  return {
    emergencyNumber,
    countryCode,
    location,
    makeEmergencyCall,
    detectCountry,
  };
}
