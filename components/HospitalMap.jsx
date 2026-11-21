import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// Custom map style (dark mode)
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi.medical",
    "elementType": "geometry",
    "stylers": [{ "color": "#e74c3c" }]
  },
  {
    "featureType": "poi.medical",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#ff6b6b" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#17263c" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  }
];

export default function HospitalMap({ hospitals, loading, mapRegion, location, mapRef }) {
  if (loading) {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapLoadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.mapLoadingText}>Loading nearby hospitals...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        initialRegion={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        loadingEnabled={true}
      >
        {/* Current location marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: mapRegion.latitude,
              longitude: mapRegion.longitude,
            }}
            title="Your Location"
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.markerDot} />
              <View style={styles.markerRing} />
            </View>
          </Marker>
        )}

        {/* Hospital Markers */}
        {hospitals && hospitals.length > 0 && hospitals.map((hospital) => (
          hospital.latitude && hospital.longitude && (
            <Marker
              key={hospital.id}
              coordinate={{
                latitude: hospital.latitude,
                longitude: hospital.longitude,
              }}
              title={hospital.name}
              description={`${hospital.distance} away • ETA: ${hospital.eta}`}
              onPress={() => {
                // Zoom to hospital when tapped
                if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
                  mapRef.current.animateToRegion({
                    latitude: hospital.latitude,
                    longitude: hospital.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 1000);
                }
              }}
            >
              <View style={styles.hospitalMarker}>
                <Text style={styles.hospitalMarkerEmoji}>🏥</Text>
              </View>
            </Marker>
          )
        ))}
      </MapView>
      <View style={styles.mapOverlay}>
        <Text style={styles.mapOverlayText}>📍 {hospitals.length} hospitals nearby</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
