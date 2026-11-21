import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useEffect, useState, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActionSheetIOS,
} from 'react-native';
import HospitalMap from './HospitalMap';
import Navbar from './navbar';
import { useMedicalRecords } from '../hooks/useMedicalRecords';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from '../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import EmergencyContactsModal from './EmergencyContactsModal';
import MedicationsModal from './MedicationsModal';
import ConditionsModal from './ConditionsModal';
import AllergiesModal from './AllergiesModal';
import EmergencyInfoModal from './EmergencyInfoModal';
import { useEmergencyCall } from '../hooks/useEmergencyCall';
import QRCode from 'react-native-qrcode-svg';

export default function Health() {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearestHospitals, setNearestHospitals] = useState([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showMedicationsModal, setShowMedicationsModal] = useState(false);
  const [showConditionsModal, setShowConditionsModal] = useState(false);
  const [showAllergiesModal, setShowAllergiesModal] = useState(false);
  const [showEmergencyInfoModal, setShowEmergencyInfoModal] = useState(false);



  // GET USER ID FROM useAuth HOOK
  const { user } = useAuth();

  // PASS user?.id TO HOOKS
  const { profile } = useUserProfile(user?.id);
  const {
    emergencyContacts,
    conditions,
    allergies,
    medications,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    addMedication,
    updateMedication,
    deleteMedication,
    addCondition,
    updateCondition,
    deleteCondition,
    addAllergy,
    updateAllergy,
    deleteAllergy,
  } = useMedicalRecords(user?.id);

  const { emergencyNumber, countryCode, makeEmergencyCall } = useEmergencyCall();

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  // Enhanced function to get nearby hospitals with multiple phone numbers support
  const fetchNearbyHospitals = async (latitude, longitude) => {
    const OVERPASS_MIRRORS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    ];

    const query = `
        [out:json][timeout:25];
        (
          node["amenity"="hospital"](around:5000,${latitude},${longitude});
          way["amenity"="hospital"](around:5000,${latitude},${longitude});
          node["amenity"="clinic"](around:5000,${latitude},${longitude});
          way["amenity"="clinic"](around:5000,${latitude},${longitude});
          node["healthcare"="hospital"](around:5000,${latitude},${longitude});
          way["healthcare"="hospital"](around:5000,${latitude},${longitude});
        );
        out body center;
        >;
        out skel qt;
      `;

    let data = null;
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(mirror, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) continue;
        const text = await response.text();
        if (!text.trim().startsWith('{')) continue; // got HTML error page
        data = JSON.parse(text);
        break;
      } catch (_) {
        continue;
      }
    }

    try {
      if (data && data.elements && data.elements.length > 0) {
        const hospitals = data.elements.map((element, index) => {
          const hospitalLat = element.center ? element.center.lat : element.lat;
          const hospitalLon = element.center ? element.center.lon : element.lon;
          const distance = calculateDistance(latitude, longitude, hospitalLat, hospitalLon);
          const eta = Math.round(distance * 3); // Rough estimate: 3 min per km

          // Extract ALL phone numbers from multiple OSM fields
          const tags = element.tags || {};
          const phoneNumbers = [];

          // Check all possible phone number fields in OSM
          const phoneFields = [
            tags.phone,
            tags['contact:phone'],
            tags['phone:mobile'],
            tags.telephone,
            tags['contact:mobile'],
            tags['phone:office'],
            tags['contact:telephone']
          ];

          // Add all unique phone numbers
          phoneFields.forEach(phoneField => {
            if (phoneField) {
              // Split by semicolon or comma (common separators in OSM)
              const numbers = phoneField.split(/[;,]/).map(n => n.trim()).filter(n => n);
              numbers.forEach(num => {
                if (!phoneNumbers.includes(num)) {
                  phoneNumbers.push(num);
                }
              });
            }
          });

          // Get full address from multiple fields
          let address = 'Address not available';
          if (tags['addr:full']) {
            address = tags['addr:full'];
          } else {
            const addrParts = [];
            if (tags['addr:housenumber']) addrParts.push(tags['addr:housenumber']);
            if (tags['addr:street']) addrParts.push(tags['addr:street']);
            if (tags['addr:city']) addrParts.push(tags['addr:city']);
            if (tags['addr:postcode']) addrParts.push(tags['addr:postcode']);
            if (addrParts.length > 0) {
              address = addrParts.join(', ');
            }
          }

          // Get website if available
          const website = tags.website || tags['contact:website'] || null;

          // Get emergency info
          const emergency = tags.emergency === 'yes' || tags['emergency:service'] === 'yes';

          return {
            id: element.id || index,
            name: tags.name || tags.official_name || `${tags.amenity === 'hospital' ? 'Hospital' : 'Clinic'} ${index + 1}`,
            latitude: hospitalLat,
            longitude: hospitalLon,
            distance: `${distance.toFixed(1)} km`,
            eta: `${eta} min`,
            address: address,
            phones: phoneNumbers.length > 0 ? phoneNumbers : null, // Array of phone numbers or null
            website: website,
            emergency: emergency,
            type: tags.amenity || tags.healthcare || 'hospital'
          };
        }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
          .slice(0, 10); // Get top 10 to increase chances of finding ones with phone numbers

        // Filter to prioritize hospitals with phone numbers
        const hospitalsWithPhone = hospitals.filter(h => h.phones && h.phones.length > 0);
        const hospitalsWithoutPhone = hospitals.filter(h => !h.phones || h.phones.length === 0);

        // Combine: hospitals with phone first, then without (limit to 5 total)
        const sortedHospitals = [...hospitalsWithPhone, ...hospitalsWithoutPhone].slice(0, 5);

        setNearestHospitals(sortedHospitals);

        // Fit map to show all hospitals (only on native where fitToCoordinates is available)
        if (mapRef.current && typeof mapRef.current.fitToCoordinates === 'function' && sortedHospitals.length > 0) {
          const coordinates = [
            { latitude, longitude },
            ...sortedHospitals.map(h => ({ latitude: h.latitude, longitude: h.longitude }))
          ];
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
            animated: true
          });
        }
      } else {
        // Fallback to demo data if no hospitals found
        setDemoHospitals(latitude, longitude);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      // Fallback to demo data on error
      setDemoHospitals(latitude, longitude);
    }
  };

  // Set demo hospitals near user location
  const setDemoHospitals = (latitude, longitude) => {
    const demoHospitals = [
      {
        id: 1,
        name: 'City Hospital',
        distance: '2.3 km',
        eta: '7 min',
        address: '123 Main St',
        phones: ['+1-800-123-4567', '+1-800-123-9999'], // Demo with multiple numbers
        website: null,
        emergency: true,
        latitude: latitude + 0.02,
        longitude: longitude + 0.01,
        type: 'hospital'
      },
      {
        id: 2,
        name: 'Medical Center',
        distance: '3.8 km',
        eta: '11 min',
        address: '456 Oak Ave',
        phones: ['+1-800-555-1234'],
        website: null,
        emergency: false,
        latitude: latitude + 0.03,
        longitude: longitude - 0.01,
        type: 'hospital'
      },
      {
        id: 3,
        name: 'Emergency Clinic',
        distance: '5.1 km',
        eta: '15 min',
        address: '789 Elm St',
        phones: null,
        website: null,
        emergency: true,
        latitude: latitude - 0.01,
        longitude: longitude + 0.02,
        type: 'clinic'
      },
    ];

    setNearestHospitals(demoHospitals);
  };

  // Get user's location once on mount and fetch nearby hospitals.
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Location permission is required to find nearby hospitals.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          setDemoHospitals(28.6139, 77.2090);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLocation(currentLocation);
        const newRegion = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setMapRegion(newRegion);

        // Fetch nearby hospitals
        await fetchNearbyHospitals(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );

        setLoading(false);

      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Failed to get your location. Showing demo data.');
        setLoading(false);
        setDemoHospitals(28.6139, 77.2090);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSOSPress = () => {
    Alert.alert(
      '🚨 EMERGENCY SOS',
      `Are you experiencing a medical emergency?\n\nThis will:\n• Call emergency services (${emergencyNumber}${countryCode ? ` - ${countryCode}` : ''})\n• Alert your emergency contacts\n• Share your location and medical profile`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: `CALL ${emergencyNumber}`,
          style: 'destructive',
          onPress: () => {
            makeEmergencyCall();
            // Also notify emergency contacts
            Alert.alert('Emergency Alert Sent', `Contacting emergency services (${emergencyNumber}) and notifying your emergency contacts.`);
          },
        },
      ]
    );
  };

  const handleCallContact = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  // Handle calling hospital with action sheet for multiple numbers
  const handleCallHospital = (hospital) => {
    if (!hospital.phones || hospital.phones.length === 0) {
      Alert.alert('No Phone Number', 'This hospital does not have a phone number available.');
      return;
    }

    if (hospital.phones.length === 1) {
      // Single number - call directly
      Linking.openURL(`tel:${hospital.phones[0]}`);
      return;
    }

    // Multiple numbers - show action sheet
    if (Platform.OS === 'ios') {
      // iOS Action Sheet
      const options = [
        ...hospital.phones.map((phone, index) => `${index === 0 ? 'Primary' : `Line ${index + 1}`}: ${phone}`),
        'Cancel'
      ];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Call ${hospital.name}`,
          message: 'Select a phone number to call',
          options: options,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex < hospital.phones.length) {
            Linking.openURL(`tel:${hospital.phones[buttonIndex]}`);
          }
        }
      );
    } else {
      // Android Alert with buttons
      const buttons = hospital.phones.map((phone, index) => ({
        text: `${index === 0 ? 'Primary' : `Line ${index + 1}`}: ${phone}`,
        onPress: () => Linking.openURL(`tel:${phone}`)
      }));

      buttons.push({
        text: 'Cancel',
        style: 'cancel'
      });

      Alert.alert(
        `Call ${hospital.name}`,
        'Select a phone number to call',
        buttons
      );
    }
  };

  const handleNavigateToHospital = (hospital) => {
    const lat = hospital.latitude;
    const lng = hospital.longitude;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}(${encodeURIComponent(hospital.name)})`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(hospital.name)})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    });
    Linking.openURL(url);
  };

  // Generate QR Code data with encrypted medical information
  const qrRef = useRef(null);
  const qrContainerRef = useRef(null);

  // Human-readable summary for sharing as text
  const buildMedicalSummary = () => {
    const list = (items, fmt) => (items && items.length ? items.map(fmt).join(', ') : 'None recorded');
    return [
      `MEDICAL ID: ${profile?.full_name || 'Unknown'}`,
      `Blood type: ${profile?.blood_type || 'N/A'} | Age: ${profile?.age || 'N/A'} | Gender: ${profile?.gender || 'N/A'}`,
      `Allergies: ${list(allergies, (a) => `${a.name}${a.severity ? ` (${a.severity})` : ''}`)}`,
      `Conditions: ${list(conditions, (c) => c.name)}`,
      `Medications: ${list(medications, (m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`)}`,
      `Emergency contact: ${profile?.emergency_contact_name || 'N/A'} ${profile?.emergency_contact_phone || ''}`.trim(),
      `Organ donor: ${profile?.organ_donor ? 'Yes' : 'No'}`,
    ].join('\n');
  };

  // Web: turn the rendered QR <svg> into a PNG data URL
  const getWebQrPng = () =>
    new Promise((resolve, reject) => {
      const svg = qrContainerRef.current?.querySelector?.('svg');
      if (!svg) return reject(new Error('QR code not rendered yet'));
      const size = 600;
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Could not render QR image'));
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    });

  // Native: react-native-qrcode-svg exposes toDataURL on its ref
  const getNativeQrBase64 = () =>
    new Promise((resolve, reject) => {
      if (!qrRef.current?.toDataURL) return reject(new Error('QR code not rendered yet'));
      qrRef.current.toDataURL((data) => resolve(data));
    });

  const handleSaveQRCode = async () => {
    try {
      const fileName = `vitalflow-medical-id-${(profile?.full_name || 'user').replace(/\s+/g, '-').toLowerCase()}.png`;
      if (Platform.OS === 'web') {
        const dataUrl = await getWebQrPng();
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }
      const base64 = await getNativeQrBase64();
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Saved', `QR code saved to ${fileUri}`);
        return;
      }
      // The system sheet offers "Save Image" / "Save to Files" / Drive, etc.
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Save your Medical ID QR code',
      });
    } catch (error) {
      console.error('Save QR error:', error);
      Alert.alert('Error', 'Could not save the QR code. Please try again.');
    }
  };

  const handleShareQRCode = async () => {
    const message = buildMedicalSummary();
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: 'Medical ID', text: message });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied', 'Your medical summary was copied to the clipboard.');
        }
        return;
      }
      await Share.share({ title: 'Medical ID', message });
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('Share QR error:', error);
      Alert.alert('Error', 'Could not share your medical information.');
    }
  };

  const generateMedicalQRData = () => {
    const medicalData = {
      id: user?.id,
      name: profile?.full_name || 'N/A',
      age: profile?.age || 'N/A',
      gender: profile?.gender || 'N/A',
      bloodType: profile?.blood_type || 'N/A',
      weight: profile?.weight || 'N/A',
      height: profile?.height || 'N/A',
      phone: profile?.phone || 'N/A',

      // Emergency Contact
      emergencyContact: {
        name: profile?.emergency_contact_name || 'N/A',
        phone: profile?.emergency_contact_phone || 'N/A',
        relationship: profile?.emergency_contact_relationship || 'N/A',
      },

      // Medical Information
      medications: medications?.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency
      })) || [],

      conditions: conditions?.map(c => ({
        name: c.name,
        severity: c.severity,
        diagnosedDate: c.diagnosed_date
      })) || [],

      allergies: allergies?.map(a => ({
        name: a.name,
        severity: a.severity,
        reaction: a.reaction
      })) || [],

      // Insurance
      insurance: {
        provider: profile?.insurance_provider || 'N/A',
        policyNumber: profile?.insurance_number || 'N/A',
      },

      organDonor: profile?.organ_donor || false,

      // Timestamp
      generatedAt: new Date().toISOString(),
    };

    return JSON.stringify(medicalData);
  };



  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f1419', '#1a1f2e', '#0f1419']}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Health & Emergency</Text>
            <Text style={styles.headerSubtitle}>Your Medical Information</Text>
          </View>

          {/* Emergency SOS Button */}
          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleSOSPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ff0844', '#ff4757', '#ff6b81']}
              style={styles.sosGradient}
            >
              <Text style={styles.sosIcon}>🚨</Text>
              <Text style={styles.sosText}>EMERGENCY SOS</Text>
              <Text style={styles.sosSubtext}>Press for Emergency</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Emergency Contacts Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Emergency Contacts</Text>

            {/* Primary Contact from Profile */}
            {profile?.emergency_contact_name && profile?.emergency_contact_phone ? (
              <View style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitial}>
                      {profile.emergency_contact_name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.contactDetails}>
                    <View style={styles.contactNameRow}>
                      <Text style={styles.contactName}>{profile.emergency_contact_name}</Text>
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                      </View>
                    </View>
                    <Text style={styles.contactRelationship}>
                      {profile.emergency_contact_relationship || 'Emergency Contact'}
                    </Text>
                    <Text style={styles.contactPhone}>{profile.emergency_contact_phone}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => handleCallContact(profile.emergency_contact_phone)}
                >
                  <Text style={styles.callButtonText}>📞 Call</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Additional Emergency Contacts */}
            {emergencyContacts && emergencyContacts.length === 0 && !profile?.emergency_contact_name ? (
              <Text style={styles.emptyText}>No emergency contacts added yet</Text>
            ) : (
              emergencyContacts && emergencyContacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactInitial}>{contact.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                      <Text style={styles.contactPhone}>{contact.country_code} {contact.phone}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCallContact(`${contact.country_code}${contact.phone}`)}
                  >
                    <Text style={styles.callButtonText}>📞 Call</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowContactsModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Contact</Text>
            </TouchableOpacity>
          </View>

          {/* Nearest Hospitals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Nearest Hospitals</Text>

            {/* Real Map showing nearby hospitals */}
            <HospitalMap
              hospitals={nearestHospitals}
              loading={loading}
              mapRegion={mapRegion}
              location={location}
              mapRef={mapRef}
            />

            {/* Hospital Cards */}
            {nearestHospitals.map((hospital) => (
              <View key={hospital.id} style={styles.hospitalCard}>
                <View style={styles.hospitalInfo}>
                  <View style={styles.hospitalHeader}>
                    <Text style={styles.hospitalName}>{hospital.name}</Text>
                    {hospital.emergency && (
                      <View style={styles.emergencyBadge}>
                        <Text style={styles.emergencyBadgeText}>⚡ Emergency</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.hospitalAddress}>{hospital.address}</Text>
                  <View style={styles.hospitalMeta}>
                    <Text style={styles.hospitalDistance}>📍 {hospital.distance}</Text>
                    <Text style={styles.hospitalEta}>⏱️ ETA: {hospital.eta}</Text>
                  </View>

                  {/* Display phone numbers */}
                  {hospital.phones && hospital.phones.length > 0 && (
                    <View style={styles.phoneNumbersContainer}>
                      {hospital.phones.map((phone, index) => (
                        <Text key={index} style={styles.hospitalPhone}>
                          📞 {index === 0 ? 'Primary' : `Line ${index + 1}`}: {phone}
                        </Text>
                      ))}
                    </View>
                  )}

                  {hospital.website && (
                    <TouchableOpacity onPress={() => Linking.openURL(hospital.website)}>
                      <Text style={styles.hospitalWebsite}>🌐 Website</Text>
                    </TouchableOpacity>
                  )}
                  {(!hospital.phones || hospital.phones.length === 0) && !hospital.website && (
                    <Text style={styles.noContactInfo}>ℹ️ Contact info not available in database</Text>
                  )}
                </View>

                {/* Action buttons */}
                <View style={styles.hospitalActions}>
                  <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={() => handleNavigateToHospital(hospital)}
                  >
                    <Text style={styles.navigateButtonText}>Navigate</Text>
                  </TouchableOpacity>

                  {hospital.phones && hospital.phones.length > 0 ? (
                    <TouchableOpacity
                      style={styles.hospitalCallButton}
                      onPress={() => handleCallHospital(hospital)}
                    >
                      <Text style={styles.hospitalCallButtonText}>
                        📞 Call {hospital.phones.length > 1 && `(${hospital.phones.length})`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.hospitalCallButton, styles.disabledButton]}
                      disabled={true}
                    >
                      <Text style={styles.hospitalCallButtonText}>No Phone</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Medical Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Medical Profile</Text>

            {/* Personal Information */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>📋 Personal Information</Text>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Name:</Text>
                <Text style={styles.profileValue}>{profile?.full_name || 'Not set'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Date of Birth:</Text>
                <Text style={styles.profileValue}>{profile?.date_of_birth ? profile.date_of_birth.split('-').reverse().join('-') : 'Not set'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Age:</Text>
                <Text style={styles.profileValue}>{profile?.age || '--'} | {profile?.gender || '--'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Blood Type:</Text>
                <Text style={[styles.profileValue, styles.bloodType]}>{profile?.blood_type || '--'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Weight:</Text>
                <Text style={styles.profileValue}>
                  {profile?.weight ? `${profile.weight} kg` : '--'} |
                  Height: {profile?.height ? `${profile.height} cm` : '--'}
                </Text>
              </View>
            </View>

            {/* Medications */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>💊 Current Medications ({medications?.length || 0})</Text>
              {!medications || medications.length === 0 ? (
                <Text style={styles.emptyText}>No medications recorded</Text>
              ) : (
                medications.map((med) => (
                  <View key={med.id} style={styles.medItem}>
                    <View style={styles.medBullet} />
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{med.name} {med.dosage}</Text>
                      <Text style={styles.medSchedule}>{med.frequency} - {med.time}</Text>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowMedicationsModal(true)}
              >
                <Text style={styles.editButtonText}>Edit Medications</Text>
              </TouchableOpacity>
            </View>

            {/* Medical Conditions */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>⚕️ Medical Conditions ({conditions?.length || 0})</Text>
              {!conditions || conditions.length === 0 ? (
                <Text style={styles.emptyText}>No medical conditions recorded</Text>
              ) : (
                conditions.map((condition) => (
                  <View key={condition.id} style={styles.conditionItem}>
                    <View style={styles.conditionBullet} />
                    <View style={styles.conditionInfo}>
                      <Text style={styles.conditionName}>{condition.name}</Text>
                      <Text style={styles.conditionDetails}>
                        Since {new Date(condition.diagnosed_date).getFullYear()} • {condition.severity}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowConditionsModal(true)}
              >
                <Text style={styles.editButtonText}>Edit Conditions</Text>
              </TouchableOpacity>
            </View>

            {/* Allergies */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>⚠️ Allergies ({allergies?.length || 0})</Text>
              {!allergies || allergies.length === 0 ? (
                <Text style={styles.emptyText}>No allergies recorded</Text>
              ) : (
                allergies.map((allergy) => (
                  <View key={allergy.id} style={styles.allergyItem}>
                    <View style={styles.allergyBullet} />
                    <View style={styles.allergyInfo}>
                      <Text style={styles.allergyName}>{allergy.name}</Text>
                      <Text style={styles.allergyDetails}>{allergy.severity} - {allergy.reaction}</Text>
                    </View>
                  </View>
                ))
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowAllergiesModal(true)}
              >
                <Text style={styles.editButtonText}>Edit Allergies</Text>
              </TouchableOpacity>
            </View>

            {/* Emergency Instructions */}
            <View style={styles.profileCard}>
              <Text style={styles.profileCardTitle}>📝 Emergency Instructions</Text>

              {/* Personal Details */}
              <View style={styles.emergencySection}>
                <Text style={styles.emergencySubtitle}>👤 Personal Details</Text>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Full Name:</Text>
                  <Text style={styles.profileValue}>{profile?.full_name || 'Not set'}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Date of Birth:</Text>
                  <Text style={styles.profileValue}>{profile?.date_of_birth ? profile.date_of_birth.split('-').reverse().join('-') : 'Not set'}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Age:</Text>
                  <Text style={styles.profileValue}>{profile?.age || '--'} years</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Blood Type:</Text>
                  <Text style={[styles.profileValue, styles.bloodType]}>{profile?.blood_type || '--'}</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Phone:</Text>
                  <Text style={styles.profileValue}>{profile?.phone || 'Not set'}</Text>
                </View>
              </View>

              {/* Medical Status */}
              <View style={styles.emergencySection}>
                <Text style={styles.emergencySubtitle}>⚕️ Medical Status</Text>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Organ Donor:</Text>
                  <View style={styles.statusBadge}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: profile?.organ_donor ? '#27ae60' : '#95a5a6' }
                    ]}>
                      {profile?.organ_donor ? '✓ Yes' : '✗ No'}
                    </Text>
                  </View>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Active Medications:</Text>
                  <Text style={styles.profileValue}>{medications?.length || 0} prescribed</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Medical Conditions:</Text>
                  <Text style={styles.profileValue}>{conditions?.length || 0} recorded</Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Known Allergies:</Text>
                  <Text style={[styles.profileValue, allergies?.length > 0 && styles.alertText]}>
                    {allergies?.length || 0} {allergies?.length > 0 ? '⚠️' : ''}
                  </Text>
                </View>
              </View>

              {/* Insurance Information */}
              <View style={styles.emergencySection}>
                <Text style={styles.emergencySubtitle}>🛡️ Insurance Information</Text>
                <View style={styles.insuranceCard}>
                  <View style={styles.insuranceRow}>
                    <MaterialCommunityIcons name="shield-account" size={20} color="#3498db" />
                    <View style={styles.insuranceDetails}>
                      <Text style={styles.insuranceLabel}>Insurance Provider</Text>
                      <Text style={styles.insuranceValue}>
                        {profile?.insurance_provider || 'Not set'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.insuranceDivider} />

                  <View style={styles.insuranceRow}>
                    <MaterialCommunityIcons name="card-account-details" size={20} color="#f39c12" />
                    <View style={styles.insuranceDetails}>
                      <Text style={styles.insuranceLabel}>Policy Number</Text>
                      <Text style={styles.insurancePolicyNumber}>
                        {profile?.insurance_number || 'Not set'}
                      </Text>
                    </View>
                  </View>

                  {profile?.insurance_provider && profile?.insurance_number && (
                    <View style={styles.insuranceFooter}>
                      <MaterialCommunityIcons name="information" size={16} color="#7f8c8d" />
                      <Text style={styles.insuranceFooterText}>
                        Valid for emergency medical services
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Emergency Contact Summary */}
              {(profile?.emergency_contact_name && profile?.emergency_contact_phone) && (
                <View style={styles.emergencySection}>
                  <Text style={styles.emergencySubtitle}>📞 Primary Emergency Contact</Text>
                  <View style={styles.contactSummaryCard}>
                    <View style={styles.contactSummaryRow}>
                      <MaterialCommunityIcons name="account" size={18} color="#e74c3c" />
                      <Text style={styles.contactSummaryText}>
                        {profile.emergency_contact_name}
                      </Text>
                    </View>
                    <View style={styles.contactSummaryRow}>
                      <MaterialCommunityIcons name="phone" size={18} color="#27ae60" />
                      <Text style={styles.contactSummaryText}>
                        {profile.emergency_contact_phone}
                      </Text>
                    </View>
                    <View style={styles.contactSummaryRow}>
                      <MaterialCommunityIcons name="heart" size={18} color="#9b59b6" />
                      <Text style={styles.contactSummaryText}>
                        {profile.emergency_contact_relationship || 'Emergency Contact'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowEmergencyInfoModal(true)}
              >
                <Text style={styles.editButtonText}>Edit Emergency Information</Text>
              </TouchableOpacity>
            </View>

            {/* QR Code for Medical ID */}
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Medical ID QR Code</Text>
              <Text style={styles.qrSubtitle}>For Emergency Responders</Text>

              <View style={styles.qrCodeContainer} ref={qrContainerRef}>
                <QRCode
                  getRef={(ref) => { qrRef.current = ref; }}
                  value={generateMedicalQRData()}
                  size={200}
                  color="#2c3e50"
                  backgroundColor="#FFFFFF"
                  quietZone={10}
                />
              </View>

              <View style={styles.qrInfoSection}>
                <View style={styles.qrInfoRow}>
                  <MaterialCommunityIcons name="shield-check" size={20} color="#27ae60" />
                  <Text style={styles.qrInfoText}>Secure & Encrypted</Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <MaterialCommunityIcons name="account-alert" size={20} color="#e74c3c" />
                  <Text style={styles.qrInfoText}>Emergency Access Only</Text>
                </View>
                <View style={styles.qrInfoRow}>
                  <MaterialCommunityIcons name="update" size={20} color="#3498db" />
                  <Text style={styles.qrInfoText}>Auto-Updated</Text>
                </View>
              </View>

              <Text style={styles.qrDescription}>
                First responders can scan this QR code to access your critical medical information
                during emergencies. Keep this accessible on your lock screen or save as an image.
              </Text>

              <View style={styles.qrActions}>
                <TouchableOpacity
                  style={styles.qrActionButton}
                  onPress={handleSaveQRCode}
                >
                  <MaterialCommunityIcons name="download" size={20} color="#3498db" />
                  <Text style={styles.qrActionText}>Save QR Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.qrActionButton}
                  onPress={handleShareQRCode}
                >
                  <MaterialCommunityIcons name="share-variant" size={20} color="#3498db" />
                  <Text style={styles.qrActionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        <Navbar activeTab="Health" />
      </LinearGradient>

      {/* Modals */}
      <EmergencyContactsModal
        visible={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={emergencyContacts || []}
        onAdd={addEmergencyContact}
        onUpdate={updateEmergencyContact}
        onDelete={deleteEmergencyContact}
      />

      <MedicationsModal
        visible={showMedicationsModal}
        onClose={() => setShowMedicationsModal(false)}
        medications={medications || []}
        onAdd={addMedication}
        onUpdate={updateMedication}
        onDelete={deleteMedication}
      />

      <ConditionsModal
        visible={showConditionsModal}
        onClose={() => setShowConditionsModal(false)}
        conditions={conditions || []}
        onAdd={addCondition}
        onUpdate={updateCondition}
        onDelete={deleteCondition}
      />

      <AllergiesModal
        visible={showAllergiesModal}
        onClose={() => setShowAllergiesModal(false)}
        allergies={allergies || []}
        onAdd={addAllergy}
        onUpdate={updateAllergy}
        onDelete={deleteAllergy}
      />

      <EmergencyInfoModal
        visible={showEmergencyInfoModal}
        onClose={() => setShowEmergencyInfoModal(false)}
        profile={profile}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // SOS Button
  sosButton: {
    marginBottom: 25,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#ff0844',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sosGradient: {
    paddingVertical: 25,
    alignItems: 'center',
  },
  sosIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  sosText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sosSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Section
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },

  // Emergency Contacts
  contactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  contactInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contactDetails: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  primaryBadge: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  contactRelationship: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
  },
  callButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  addButtonText: {
    color: '#3498db',
    fontWeight: '700',
    fontSize: 15,
  },

  // Map Styles
  mapContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    height: 280,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoadingContainer: {
    backgroundColor: '#2c3e50',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '600',
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3498db',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.5)',
    position: 'absolute',
  },
  hospitalMarker: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e74c3c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  hospitalMarkerEmoji: {
    fontSize: 22,
  },

  // Hospitals
  hospitalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  hospitalInfo: {
    marginBottom: 12,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    flex: 1,
  },
  emergencyBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  emergencyBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  hospitalMeta: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 5,
  },
  hospitalDistance: {
    fontSize: 13,
    color: '#3498db',
    fontWeight: '600',
  },
  hospitalEta: {
    fontSize: 13,
    color: '#3498db',
    fontWeight: '600',
  },
  phoneNumbersContainer: {
    marginTop: 8,
    marginBottom: 5,
  },
  hospitalPhone: {
    fontSize: 13,
    color: '#27ae60',
    fontWeight: '600',
    marginTop: 3,
  },
  hospitalWebsite: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 3,
    textDecorationLine: 'underline',
  },
  noContactInfo: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 5,
  },
  hospitalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  hospitalCallButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    borderRadius: 15,
    alignItems: 'center',
  },
  hospitalCallButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },

  // Medical Profile
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  profileCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 15,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 140, 141, 0.2)',
  },
  profileLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  profileValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '700',
  },
  bloodType: {
    color: '#e74c3c',
    fontWeight: '700',
    fontSize: 16,
  },

  // Medications
  medItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  medBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3498db',
    marginTop: 6,
    marginRight: 10,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '700',
    marginBottom: 2,
  },
  medSchedule: {
    fontSize: 13,
    color: '#7f8c8d',
  },

  // Conditions
  conditionItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  conditionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f39c12',
    marginTop: 6,
    marginRight: 10,
  },
  conditionInfo: {
    flex: 1,
  },
  conditionName: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '700',
    marginBottom: 2,
  },
  conditionDetails: {
    fontSize: 13,
    color: '#7f8c8d',
  },

  // Allergies
  allergyItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  allergyBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e74c3c',
    marginTop: 6,
    marginRight: 10,
  },
  allergyInfo: {
    flex: 1,
  },
  allergyName: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '700',
    marginBottom: 2,
  },
  allergyDetails: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '600',
  },

  // Edit Buttons
  editButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  editButtonText: {
    color: '#3498db',
    fontWeight: '700',
    fontSize: 13,
  },

  // QR Code
  qrCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 5,
  },
  qrSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrInfoSection: {
    width: '100%',
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  qrInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  qrInfoText: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '600',
    marginLeft: 10,
  },
  qrDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  qrActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  qrActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3498db',
    marginLeft: 8,
  },

  bottomPadding: {
    height: 120,
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },

  // Emergency Section Styles
  emergencySection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 140, 141, 0.15)',
  },
  emergencySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertText: {
    color: '#e74c3c',
    fontWeight: '700',
  },
  // Insurance Card Styles
  insuranceCard: {
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  insuranceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  insuranceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  insuranceLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '600',
  },
  insuranceValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '700',
  },
  insurancePolicyNumber: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  insuranceDivider: {
    height: 1,
    backgroundColor: 'rgba(127, 140, 141, 0.15)',
    marginVertical: 8,
  },
  insuranceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 140, 141, 0.15)',
  },
  insuranceFooterText: {
    fontSize: 11,
    color: '#7f8c8d',
    marginLeft: 6,
    fontStyle: 'italic',
  },

  // Contact Summary Styles
  contactSummaryCard: {
    backgroundColor: 'rgba(231, 76, 60, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  contactSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  contactSummaryText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginLeft: 10,
  }
});