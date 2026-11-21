import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Navbar from './navbar';
import { useAuth } from '../hooks/useAuth';
import { useHealthData } from '../hooks/useHealthData';
import { useEmergencyCall } from '../hooks/useEmergencyCall';
import { isDemoMode } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { emergencyNumber, countryCode, makeEmergencyCall } = useEmergencyCall();

  // Use '3M' to match analytics page — same dataset, same computed values
  const { latestReading, readings, loading: healthLoading } = useHealthData(user?.id, '3M');
  
  // Track if we have real data from database
  const [hasRealData, setHasRealData] = useState(false);
  
  // Use real data from hardware if available, otherwise use simulated data
  const [healthData, setHealthData] = useState({
    heartRate: '—',
    spO2: '—',
    bodyTemp: '—',
    sweatLevel: 'Normal'
  });
  const [riskLevel, setRiskLevel] = useState('Low');
  const [chartData, setChartData] = useState({
    heartRateHistory: [68, 72, 75, 69, 71, 74, 72],
    spO2History: [96, 98, 97, 99, 98, 97, 98],
    tempHistory: [98.2, 98.6, 98.4, 98.8, 98.6, 98.5, 98.6]
  });
  const [summaryStats, setSummaryStats] = useState({
    avgHR: null,
    alerts: 0,
    healthScore: 95,
    hrTrend: null,
  });
  const heartBeatAnim = useRef(new Animated.Value(1)).current;
  const heartWaveAnim = useRef(new Animated.Value(0)).current;
  const spO2Anim = useRef(new Animated.Value(1)).current;
  const tempAnim = useRef(new Animated.Value(1)).current;
  const sweatAnim = useRef(new Animated.Value(1)).current;

  // Keep the heartbeat animation in sync with the latest BPM without restarting loops
  const bpmRef = useRef(72);
  useEffect(() => {
    bpmRef.current = typeof healthData.heartRate === 'number' ? healthData.heartRate : 72;
  }, [healthData.heartRate]);

  // Start the metric animations once and stop them on unmount
  useEffect(() => {
    let active = true;

    // Apple Watch style heart beat: re-schedules itself using the current BPM
    const beat = () => {
      if (!active) return;
      const beatInterval = (60 / Math.max(30, bpmRef.current)) * 1000;
      Animated.sequence([
        Animated.timing(heartBeatAnim, { toValue: 1.4, duration: 80, useNativeDriver: true }),
        Animated.timing(heartBeatAnim, { toValue: 0.9, duration: 60, useNativeDriver: true }),
        Animated.timing(heartBeatAnim, { toValue: 1.2, duration: 60, useNativeDriver: true }),
        Animated.timing(heartBeatAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(Math.max(0, beatInterval - 300)),
      ]).start(({ finished }) => {
        if (finished) beat();
      });
    };

    const pulse = (anim, toValue, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        ])
      );

    const loops = [
      Animated.loop(Animated.timing(heartWaveAnim, { toValue: 1, duration: 830, useNativeDriver: true })),
      pulse(spO2Anim, 1.1, 1000),
      pulse(tempAnim, 1.05, 2000),
      pulse(sweatAnim, 1.08, 1500),
    ];

    beat();
    loops.forEach((l) => l.start());

    return () => {
      active = false;
      heartBeatAnim.stopAnimation();
      loops.forEach((l) => l.stop());
    };
  }, [heartBeatAnim, heartWaveAnim, spO2Anim, sweatAnim, tempAnim]);

  // Update live metrics when latest reading arrives
  useEffect(() => {
    if (latestReading) {
      setHasRealData(true);
      setHealthData({
        heartRate: latestReading.heart_rate > 0 ? latestReading.heart_rate : '—',
        spO2: latestReading.spo2 > 0 ? latestReading.spo2 : '—',
        bodyTemp: latestReading.temperature > 0
          ? (latestReading.temperature * 9/5 + 32).toFixed(1)
          : '—',
        sweatLevel: latestReading.gsr_value > 1.2 ? 'High'
          : latestReading.gsr_value > 0.8 ? 'Elevated'
          : 'Normal'
      });
      if (latestReading.heart_attack_risk >= 0.8) {
        setRiskLevel('High');
      } else if (latestReading.heart_attack_risk >= 0.5) {
        setRiskLevel('Medium');
      } else {
        setRiskLevel('Low');
      }
    } else {
      setHasRealData(false);
    }
  }, [latestReading]);

  // Build chart history and summary — identical calculation to analytics page
  useEffect(() => {
    if (!readings || readings.length === 0) return;

    const avg = (arr) =>
      arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

    // Sample up to 7 evenly-spaced points for the bar charts
    const sample7 = (arr) => {
      if (arr.length <= 7) return arr;
      const result = [];
      const step = (arr.length - 1) / 6;
      for (let i = 0; i < 7; i++) result.push(arr[Math.round(i * step)]);
      return result;
    };

    const hrAll    = readings.map(r => r.heart_rate);
    const spo2All  = readings.map(r => r.spo2);
    const tempAllF = readings.map(r => parseFloat((r.temperature * 9/5 + 32).toFixed(1)));

    setChartData({
      heartRateHistory: sample7(hrAll),
      spO2History:      sample7(spo2All),
      tempHistory:      sample7(tempAllF),
    });

    // Summary stats — exact same logic as analytics page
    const riskVals    = readings.map(r => r.heart_attack_risk * 100);
    const avgRisk     = avg(riskVals);
    const alerts      = readings.filter(r => r.heart_attack_risk > 0.5).length;
    const avgHR       = avg(hrAll);
    const healthScore = Math.max(0, Math.round(100 - avgRisk));

    // HR Trend: first-half vs second-half average (same as analytics)
    const half       = Math.floor(hrAll.length / 2);
    const firstHalf  = avg(hrAll.slice(0, half));
    const secondHalf = avg(hrAll.slice(half));
    const hrTrend    = firstHalf > 0
      ? parseFloat(((secondHalf - firstHalf) / firstHalf * 100).toFixed(1))
      : 0;

    setSummaryStats({
      avgHR,
      alerts,
      healthScore,
      hrTrend,
    });
  }, [readings, latestReading]);

  // Handle Emergency Alert
  const handleEmergencyAlert = () => {
    Alert.alert(
      '🚨 EMERGENCY ALERT',
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
            Alert.alert('Emergency Alert Sent', `Contacting emergency services (${emergencyNumber}) and notifying your emergency contacts.`);
          },
        },
      ]
    );
  };

  const LineChart = ({ data, color, title }) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartArea}>
        <View style={styles.chartLine}>
          {data.map((point, index) => (
            <View key={index} style={styles.chartPointContainer}>
              <View 
                style={[
                  styles.chartPoint, 
                  { 
                    backgroundColor: color,
                    height: (point / Math.max(...data)) * 60 
                  }
                ]} 
              />
              <Text style={styles.chartValue}>{point}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const HeartRateDisplay = ({ value, animated = false }) => (
    <View style={styles.metricContainer}>
      <View style={styles.metricRow}>
        {animated && (
          <Animated.View 
            style={[
              styles.metricIconContainer,
              { transform: [{ scale: heartBeatAnim }] }
            ]}
          >
            <Text style={styles.heartIcon}>❤️</Text>
          </Animated.View>
        )}
        
        <View style={styles.metricInfo}>
          <Text style={styles.heartRateValue}>{value}</Text>
          <Text style={styles.metricUnit}>BPM</Text>
        </View>
      </View>
    </View>
  );

  const SpO2Display = ({ value, animated = false }) => (
    <View style={styles.metricContainer}>
      <View style={styles.metricRow}>
        {animated && (
          <Animated.View 
            style={[
              styles.metricIconContainer,
              { transform: [{ scale: spO2Anim }] }
            ]}
          >
            <Text style={styles.spO2Icon}>🫁</Text>
          </Animated.View>
        )}
        
        <View style={styles.metricInfo}>
          <Text style={styles.spO2Value}>{value}</Text>
          <Text style={styles.metricUnit}>SpO2 %</Text>
        </View>
      </View>
    </View>
  );

  const TemperatureDisplay = ({ value, animated = false }) => (
    <View style={styles.metricContainer}>
      <View style={styles.metricRow}>
        {animated && (
          <Animated.View 
            style={[
              styles.metricIconContainer,
              { transform: [{ scale: tempAnim }] }
            ]}
          >
            <Text style={styles.tempIcon}>🌡️</Text>
          </Animated.View>
        )}
        
        <View style={styles.metricInfo}>
          <Text style={styles.tempValue}>{value}</Text>
          <Text style={styles.metricUnit}>°F</Text>
        </View>
      </View>
    </View>
  );

  const SweatDisplay = ({ value, animated = false }) => (
    <View style={styles.metricContainer}>
      <View style={styles.metricRow}>
        {animated && (
          <Animated.View 
            style={[
              styles.metricIconContainer,
              { transform: [{ scale: sweatAnim }] }
            ]}
          >
            <Text style={styles.sweatIcon}>💧</Text>
          </Animated.View>
        )}
        
        <View style={styles.metricInfo}>
          <Text style={styles.sweatValue}>{value}</Text>
          <Text style={styles.metricUnit}>Level</Text>
        </View>
      </View>
    </View>
  );

  // Show loading ONLY while auth is loading
  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f1419', '#1a252f', '#2c3e50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.subtitle}>
              {healthLoading 
                ? 'Loading real-time data...' 
                : hasRealData 
                  ? 'Live health monitoring from your device' 
                  : 'No readings yet - connect your VitalFlow device to start monitoring'}
            </Text>
          </View>

          {/* Real-time Health Metrics */}
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Live Monitoring</Text>
            
            {/* 2x2 Grid for all metrics */}
            <View style={styles.metricsGrid}>
              <HeartRateDisplay value={healthData.heartRate} animated={true} />
              <SpO2Display value={healthData.spO2} animated={true} />
              <TemperatureDisplay value={healthData.bodyTemp} animated={true} />
              <SweatDisplay value={healthData.sweatLevel} animated={true} />
            </View>
            
            {/* Risk Level as 5th item */}
            <View style={styles.riskContainer}>
              <LinearGradient
                colors={
                  riskLevel === 'Low'
                    ? ['#28a745', '#20c997']
                    : riskLevel === 'Medium'
                      ? ['#f39c12', '#e67e22']
                      : ['#dc3545', '#c82333']
                }
                style={styles.riskDisplay}
              >
                <Text style={styles.riskIcon}>🛡️</Text>
                <View style={styles.riskInfo}>
                  <Text style={styles.riskTitle}>Risk Level</Text>
                  <Text style={styles.riskValue}>{riskLevel}</Text>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Historical Charts */}
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Health Trends</Text>
            
            <LineChart
              data={chartData.heartRateHistory}
              color="#e74c3c"
              title="Heart Rate Trend (BPM)"
            />
            
            <LineChart
              data={chartData.spO2History}
              color="#3498db"
              title="SpO2 Levels (%)"
            />
            
            <LineChart
              data={chartData.tempHistory}
              color="#f39c12"
              title="Body Temperature (°F)"
            />
          </View>

          {/* Health Summary Cards — identical to Analytics page */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Health Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>📊</Text>
                <Text style={styles.summaryTitle}>Avg Heart Rate</Text>
                <Text style={styles.summaryValue}>
                  {summaryStats.avgHR ? `${summaryStats.avgHR} BPM` : 'All Normal'}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>⚠️</Text>
                <Text style={styles.summaryTitle}>High-Risk Events</Text>
                <Text style={[styles.summaryValue, { color: summaryStats.alerts > 0 ? '#e74c3c' : '#27ae60' }]}>
                  {summaryStats.alerts} 3M
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>🎯</Text>
                <Text style={styles.summaryTitle}>Health Score</Text>
                <Text style={[styles.summaryValue, {
                  color: summaryStats.healthScore >= 75 ? '#27ae60' : summaryStats.healthScore >= 50 ? '#f39c12' : '#e74c3c'
                }]}>
                  {summaryStats.healthScore}/100
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryIcon}>📈</Text>
                <Text style={styles.summaryTitle}>HR Trend</Text>
                <Text style={[styles.summaryValue, {
                  color: summaryStats.hrTrend === null ? '#27ae60' : summaryStats.hrTrend <= 0 ? '#27ae60' : summaryStats.hrTrend < 10 ? '#f39c12' : '#e74c3c'
                }]}>
                  {summaryStats.hrTrend === null
                    ? '+0%'
                    : summaryStats.hrTrend >= 0 ? `+${summaryStats.hrTrend}%` : `${summaryStats.hrTrend}%`}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.actionButton} 
            activeOpacity={0.8}
            onPress={() => router.push('/analytics')}
          >
            <LinearGradient
              colors={['#28a745', '#20c997']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>View Detailed Analysis</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.emergencyButton} 
            activeOpacity={0.8}
            onPress={handleEmergencyAlert}
          >
            <LinearGradient
              colors={['#dc3545', '#c82333']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>🚨 Emergency Alert</Text>
            </LinearGradient>
          </TouchableOpacity>

          {hasRealData && latestReading && (
            <View style={styles.dataSourceBadge}>
              <Text style={styles.dataSourceText}>
                {isDemoMode ? '🧪 Demo mode (simulated sensor)' : '📡 Live data'} • Last update: {new Date(latestReading.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          )}

          {!hasRealData && (
            <View style={[styles.dataSourceBadge, styles.sampleDataBadge]}>
              <Text style={[styles.dataSourceText, styles.sampleDataText]}>
                📊 Waiting for readings from your device
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>
      
      <Navbar activeTab="Home" />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1419',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    width: '45%',
    height: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  metricIconContainer: {
    marginRight: 10,
  },
  heartIcon: {
    fontSize: 32,
  },
  spO2Icon: {
    fontSize: 32,
  },
  tempIcon: {
    fontSize: 32,
  },
  sweatIcon: {
    fontSize: 32,
  },
  metricInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  spO2Value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 2,
  },
  tempValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f39c12',
    marginBottom: 2,
  },
  sweatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9b59b6',
    marginBottom: 2,
  },
  heartRateValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  chartsSection: {
    marginBottom: 40,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  chartArea: {
    height: 100,
    justifyContent: 'flex-end',
  },
  chartLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  chartPointContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartPoint: {
    width: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  chartValue: {
    fontSize: 10,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  summarySection: {
    marginBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: (width - 50) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  summaryIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
    textAlign: 'center',
  },
  actionButton: {
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  emergencyButton: {
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: '#dc3545',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderRadius: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  progressSection: {
    marginBottom: 30,
  },
  riskContainer: {
    marginTop: 10,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  riskDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 25,
    width: '100%',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  riskIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  riskInfo: {
    alignItems: 'center',
  },
  riskTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  riskValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 120,
  },
  dataSourceBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  dataSourceText: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sampleDataBadge: {
    backgroundColor: 'rgba(241, 196, 15, 0.2)',
    borderColor: '#f1c40f',
  },
  sampleDataText: {
    color: '#f1c40f',
  },
});