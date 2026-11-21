import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Navbar from './navbar';
import { useAuth } from '../hooks/useAuth';
import { useHealthData } from '../hooks/useHealthData';

export default function Analytics() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('3M');
  const { latestReading, readings, loading: healthLoading } = useHealthData(user?.id, selectedPeriod);

  const [hasRealData, setHasRealData] = useState(false);
  const [summaryStats, setSummaryStats] = useState({
    avgHR: null,
    alerts: 0,
    healthScore: 95,
    hrTrend: null,
  });
  const [healthMetrics, setHealthMetrics] = useState({
    heartRate: {
      current: 72,
      data: [68, 70, 72, 75, 69, 71, 74, 72, 68, 73, 76, 70],
      average: 71.2,
      trend: '+2.5%'
    },
    spO2: {
      current: 98,
      data: [96, 98, 97, 99, 98, 97, 98, 96, 99, 98, 97, 98],
      average: 97.6,
      trend: '+0.8%'
    },
    temperature: {
      current: 98.6,
      data: [98.2, 98.6, 98.4, 98.8, 98.6, 98.5, 98.6, 98.3, 98.7, 98.5, 98.4, 98.6],
      average: 98.5,
      trend: '+0.2%'
    },
    sweatLevel: {
      current: 'Normal',
      data: [1, 2, 1, 3, 2, 1, 2, 1, 2, 1, 3, 2], // 1=Normal, 2=Elevated, 3=High
      average: 1.7,
      trend: 'Stable'
    }
  });

  // Process historical readings into chart data, averages and trends
  useEffect(() => {
    if (!readings || readings.length === 0) {
      // Fall back to latestReading for the current value only
      if (latestReading) {
        setHasRealData(true);
        setHealthMetrics(prev => ({
          ...prev,
          heartRate:   { ...prev.heartRate,   current: latestReading.heart_rate || 72 },
          spO2:        { ...prev.spO2,        current: latestReading.spo2 || 98 },
          temperature: { ...prev.temperature, current: latestReading.temperature ? parseFloat((latestReading.temperature * 9/5 + 32).toFixed(1)) : 98.6 },
          sweatLevel:  { ...prev.sweatLevel,  current: latestReading.gsr_value > 1.2 ? 'High' : latestReading.gsr_value > 0.8 ? 'Elevated' : 'Normal' },
        }));
      } else {
        setHasRealData(false);
      }
      return;
    }

    setHasRealData(true);

    // Helper: sample up to 12 evenly-spaced values from an array
    const samplePoints = (arr) => {
      if (arr.length <= 12) return arr;
      const result = [];
      const step = (arr.length - 1) / 11;
      for (let i = 0; i < 12; i++) {
        result.push(arr[Math.round(i * step)]);
      }
      return result;
    };

    const avg = (arr) =>
      arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

    const calcTrend = (arr) => {
      if (arr.length < 2) return 'Stable';
      const half = Math.floor(arr.length / 2);
      const firstAvg = avg(arr.slice(0, half));
      const lastAvg  = avg(arr.slice(half));
      if (firstAvg === 0) return 'Stable';
      const pct = ((lastAvg - firstAvg) / firstAvg * 100).toFixed(1);
      return pct >= 0 ? `+${pct}%` : `${pct}%`;
    };

    const last = readings[readings.length - 1];

    const hrAll    = readings.map(r => r.heart_rate);
    const spo2All  = readings.map(r => r.spo2);
    const tempAllF = readings.map(r => parseFloat((r.temperature * 9/5 + 32).toFixed(1)));
    const gsrAll   = readings.map(r => r.gsr_value);

    const hrData   = samplePoints(hrAll);
    const spo2Data = samplePoints(spo2All);
    const tempData = samplePoints(tempAllF);
    const gsrData  = samplePoints(gsrAll);

    setHealthMetrics({
      heartRate: {
        current: last.heart_rate,
        data:    hrData,
        average: avg(hrAll),
        trend:   calcTrend(hrAll),
      },
      spO2: {
        current: last.spo2,
        data:    spo2Data,
        average: avg(spo2All),
        trend:   calcTrend(spo2All),
      },
      temperature: {
        current: parseFloat((last.temperature * 9/5 + 32).toFixed(1)),
        data:    tempData,
        average: avg(tempAllF),
        trend:   calcTrend(tempAllF),
      },
      sweatLevel: {
        current: last.gsr_value > 1.2 ? 'High' : last.gsr_value > 0.8 ? 'Elevated' : 'Normal',
        data:    gsrData,
        average: avg(gsrAll),
        trend:   calcTrend(gsrAll),
      },
    });

    // Summary stats
    const riskVals  = readings.map(r => r.heart_attack_risk * 100);
    const avgRisk   = avg(riskVals);
    const alerts    = readings.filter(r => r.heart_attack_risk > 0.5).length;
    const avgHR     = avg(hrAll);
    const healthScore = Math.max(0, Math.round(100 - avgRisk));

    // HR Trend: first-half vs second-half average
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

  const DetailedChart = ({ title, data, color, unit, current, average, trend }) => {
    const isPositive = trend.startsWith('+');
    const isNegative = trend.startsWith('-');
    const trendColor = isPositive ? '#27ae60' : isNegative ? '#e74c3c' : '#7f8c8d';

    return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={[styles.trendText, { color: trendColor }]}>
          {trend}
        </Text>
      </View>
      
      <View style={styles.currentValueRow}>
        <Text style={styles.currentLabel}>Current:</Text>
        <Text style={styles.currentValue}>{current} {unit}</Text>
      </View>
      
      <View style={styles.chartArea}>
        <View style={styles.chartGrid}>
          {data.map((point, index) => {
            const maxVal = Math.max(...data);
            const heightPct = maxVal > 0 ? (point / maxVal) * 80 : 5;
            return (
            <View key={index} style={styles.chartColumn}>
              <View 
                style={[
                  styles.chartBar,
                  { 
                    backgroundColor: color,
                    height: `${heightPct}%`,
                    opacity: index === data.length - 1 ? 1 : 0.7
                  }
                ]} 
              />
              <Text style={styles.chartLabel}>
                {index % 2 === 0 ? index + 1 : ''}
              </Text>
            </View>
            );
          })}
        </View>
      </View>
      
      <View style={styles.averageRow}>
        <Text style={styles.averageLabel}>Average: {average} {unit}</Text>
      </View>
    </View>
    );
  };

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['24H', '7D', '30D', '3M'].map((period) => (
        <TouchableOpacity
          key={period}
          style={[styles.periodButton, selectedPeriod === period && styles.activePeriodButton]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[styles.periodText, selectedPeriod === period && styles.activePeriodText]}>
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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
            <Text style={styles.title}>Health Analytics</Text>
            <Text style={styles.subtitle}>
              {healthLoading 
                ? 'Loading data...' 
                : hasRealData 
                  ? 'Detailed health metrics and trends' 
                  : 'Sample data - Connect device for live metrics'}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Health Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Avg Heart Rate</Text>
                <Text style={styles.summaryValue}>
                  {summaryStats.avgHR ? `${summaryStats.avgHR} BPM` : 'All Normal'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>High-Risk Events</Text>
                <Text style={[styles.summaryValue, { color: summaryStats.alerts > 0 ? '#e74c3c' : '#27ae60' }]}>
                  {summaryStats.alerts} {selectedPeriod}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Health Score</Text>
                <Text style={[styles.summaryValue, {
                  color: summaryStats.healthScore >= 75 ? '#27ae60' : summaryStats.healthScore >= 50 ? '#f39c12' : '#e74c3c'
                }]}>
                  {summaryStats.healthScore}/100
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>HR Trend</Text>
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

          <PeriodSelector />

          <DetailedChart
            title="Heart Rate"
            data={healthMetrics.heartRate.data}
            color="#e74c3c"
            unit="BPM"
            current={healthMetrics.heartRate.current}
            average={healthMetrics.heartRate.average}
            trend={healthMetrics.heartRate.trend}
          />

          <DetailedChart
            title="SpO2 Levels"
            data={healthMetrics.spO2.data}
            color="#3498db"
            unit="%"
            current={healthMetrics.spO2.current}
            average={healthMetrics.spO2.average}
            trend={healthMetrics.spO2.trend}
          />

          <DetailedChart
            title="Body Temperature"
            data={healthMetrics.temperature.data}
            color="#f39c12"
            unit="°F"
            current={healthMetrics.temperature.current}
            average={healthMetrics.temperature.average}
            trend={healthMetrics.temperature.trend}
          />

          {hasRealData && latestReading && (
            <View style={styles.dataSourceBadge}>
              <Text style={styles.dataSourceText}>
                📡 Live data • Last update: {new Date(latestReading.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          )}

          {!hasRealData && (
            <View style={[styles.dataSourceBadge, styles.sampleDataBadge]}>
              <Text style={[styles.dataSourceText, styles.sampleDataText]}>
                📊 Sample Data • Historical trends will appear when device is connected
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>
      
      <Navbar activeTab="Analytics" />
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
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
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
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activePeriodButton: {
    backgroundColor: '#3498db',
  },
  periodText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  activePeriodText: {
    color: '#FFFFFF',
  },
  chartCard: {
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  currentLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  currentValue: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '700',
  },
  chartArea: {
    height: 120,
    marginBottom: 15,
  },
  chartGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    justifyContent: 'space-between',
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '60%',
    borderRadius: 3,
    minHeight: 5,
  },
  chartLabel: {
    fontSize: 10,
    color: '#7f8c8d',
    marginTop: 5,
  },
  averageRow: {
    alignItems: 'center',
  },
  averageLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    color: '#27ae60',
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
