import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Linking, Animated, Easing } from 'react-native';

export default function HospitalMap({ hospitals, loading, mapRegion, location }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(0.4)).current;

  // Radar sweep animation
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [rotateAnim, blinkAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleOpenGoogleMaps = () => {
    const lat = location?.coords?.latitude || mapRegion.latitude;
    const lng = location?.coords?.longitude || mapRegion.longitude;
    const url = `https://www.google.com/maps/search/hospitals/@${lat},${lng},14z`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapLoadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.mapLoadingText}>Locating medical facilities...</Text>
        </View>
      </View>
    );
  }

  // Calculate relative coordinate placement for up to 3 hospitals to render on the radar screen
  const radarPoints = hospitals.slice(0, 3).map((h, index) => {
    // Generate deterministic relative coordinates around center (140, 140)
    const angles = [45, 135, 290];
    const distances = [50, 80, 100];
    const angle = angles[index % angles.length] * (Math.PI / 180);
    const dist = distances[index % distances.length];
    return {
      id: h.id,
      name: h.name,
      x: 140 + Math.cos(angle) * dist,
      y: 140 + Math.sin(angle) * dist,
    };
  });

  return (
    <View style={styles.mapContainer}>
      <View style={styles.dashboardContainer}>
        {/* Radar Scanner Visual representation */}
        <View style={styles.radarFrame}>
          {/* Circular grids */}
          <View style={[styles.radarCircle, { width: 240, height: 240, borderRadius: 120 }]} />
          <View style={[styles.radarCircle, { width: 170, height: 170, borderRadius: 85 }]} />
          <View style={[styles.radarCircle, { width: 100, height: 100, borderRadius: 50 }]} />
          
          {/* Axis lines */}
          <View style={[styles.axisLine, { transform: [{ rotate: '0deg' }] }]} />
          <View style={[styles.axisLine, { transform: [{ rotate: '90deg' }] }]} />

          {/* Sweeping Line */}
          <Animated.View style={[styles.radarSweep, { transform: [{ rotate: spin }] }]} />

          {/* User Marker Center */}
          <View style={styles.userCenterDot}>
            <View style={styles.userCore} />
            <Animated.View style={[styles.userPulse, { opacity: blinkAnim, transform: [{ scale: blinkAnim.interpolate({
              inputRange: [0.4, 1],
              outputRange: [1, 2.5]
            }) }] }]} />
          </View>

          {/* Nearest Hospitals detected on radar */}
          {radarPoints.map((point) => (
            <Animated.View 
              key={point.id} 
              style={[
                styles.radarTarget, 
                { left: point.x, top: point.y, opacity: blinkAnim }
              ]}
            >
              <View style={styles.targetCore} />
            </Animated.View>
          ))}
        </View>

        {/* Dashboard Right Info Panel */}
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>GPS Tracking Active</Text>
          <View style={styles.coordRow}>
            <Text style={styles.coordText}>LAT: {location?.coords?.latitude?.toFixed(5) || mapRegion.latitude.toFixed(5)}</Text>
            <Text style={styles.coordText}>LNG: {location?.coords?.longitude?.toFixed(5) || mapRegion.longitude.toFixed(5)}</Text>
          </View>
          
          <Text style={styles.infoDesc}>
            Found {hospitals.length} nearby medical facilities. 
          </Text>

          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenGoogleMaps}>
            <Text style={styles.actionBtnText}>🗺️ Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.mapOverlay}>
        <Text style={styles.mapOverlayText}>⚡ Web Monitoring Console</Text>
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
    backgroundColor: '#0d1117',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  mapLoadingContainer: {
    backgroundColor: '#0d1117',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    color: '#3498db',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 15,
  },
  radarFrame: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#0a0d14',
    borderWidth: 2,
    borderColor: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.12)',
  },
  axisLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
  },
  radarSweep: {
    position: 'absolute',
    width: 125,
    height: 125,
    borderTopWidth: 2,
    borderColor: 'rgba(52, 152, 219, 0.5)',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    transformOrigin: 'bottom right',
    bottom: '50%',
    right: '50%',
    backgroundColor: 'rgba(52, 152, 219, 0.03)',
  },
  userCenterDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  userCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
  },
  userPulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  radarTarget: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e74c3c',
  },
  infoPanel: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingRight: 10,
  },
  infoTitle: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  coordRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 12,
  },
  coordText: {
    fontFamily: 'monospace',
    color: '#8b949e',
    fontSize: 11,
    backgroundColor: '#161b22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoDesc: {
    color: '#c9d1d9',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderWidth: 1,
    borderColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    transitionDuration: '0.2s',
  },
  actionBtnText: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: 13,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: 11,
    color: '#8b949e',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontWeight: '500',
    borderColor: '#1f2937',
    borderWidth: 1,
  },
});
