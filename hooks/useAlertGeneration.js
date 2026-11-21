import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useAlertGeneration(userId) {
  const lastCheckRef = useRef(new Date());
  // Readings already evaluated (realtime and polling can both deliver the same row)
  const processedIdsRef = useRef(new Set());
  // Last time each alert title was raised, so a sustained abnormal value
  // produces one alert instead of one every few seconds
  const lastAlertAtRef = useRef(new Map());
  const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

  // Alert thresholds and rules
  const ALERT_RULES = {
    heartRate: {
      critical: { min: 40, max: 180 },
      high: { min: 50, max: 150 },
      medium: { min: 60, max: 130 },
    },
    spo2: {
      critical: { min: 85, max: 100 },
      high: { min: 90, max: 100 },
      medium: { min: 92, max: 100 },
    },
    temperature: {
      critical: { min: 35.0, max: 40.0 },
      high: { min: 35.5, max: 39.0 },
      medium: { min: 36.0, max: 38.5 },
    },
    gsrValue: {
      critical: { min: 0, max: 900 },
      high: { min: 0, max: 750 },
      medium: { min: 0, max: 600 },
    },
    heartAttackRisk: {
      critical: { min: 0.80, max: 1.0 },
      high: { min: 0.65, max: 0.79 },
      medium: { min: 0.50, max: 0.64 },
    },
  };

  const createAlert = async (alertData) => {
    const lastAt = lastAlertAtRef.current.get(alertData.title);
    if (lastAt && Date.now() - lastAt < ALERT_COOLDOWN_MS) return null;
    lastAlertAtRef.current.set(alertData.title, Date.now());
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([
          {
            user_id: userId,
            type: alertData.type,
            title: alertData.title,
            message: alertData.message,
            severity: alertData.severity,
            source: alertData.source,
            tags: alertData.tags || [],
            data: alertData.data || {},
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error creating alert:', error);
      return null;
    }
  };

  const checkHeartRate = (reading) => {
    const hr = reading.heart_rate;
    if (!hr) return null;

    const rules = ALERT_RULES.heartRate;

    if (hr < rules.critical.min || hr > rules.critical.max) {
      return {
        type: 'vital',
        title: 'Critical Heart Rate Detected',
        message: `Your heart rate is ${hr} BPM, which is ${hr < rules.critical.min ? 'dangerously low' : 'dangerously high'}. Seek immediate medical attention.`,
        severity: 'critical',
        source: 'health_monitor',
        tags: ['heart_rate', 'critical', 'vital_signs'],
        data: {
          heart_rate: hr,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (hr < rules.high.min || hr > rules.high.max) {
      return {
        type: 'vital',
        title: 'Abnormal Heart Rate',
        message: `Your heart rate is ${hr} BPM. This is outside the normal range.`,
        severity: 'high',
        source: 'health_monitor',
        tags: ['heart_rate', 'abnormal'],
        data: {
          heart_rate: hr,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (hr < rules.medium.min || hr > rules.medium.max) {
      return {
        type: 'vital',
        title: 'Heart Rate Alert',
        message: `Your heart rate is ${hr} BPM. Monitor yourself and rest if needed.`,
        severity: 'medium',
        source: 'health_monitor',
        tags: ['heart_rate', 'monitor'],
        data: {
          heart_rate: hr,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    }

    return null;
  };

  const checkOxygenSaturation = (reading) => {
    const spo2 = reading.spo2;
    if (!spo2) return null;

    const rules = ALERT_RULES.spo2;

    if (spo2 < rules.critical.min) {
      return {
        type: 'emergency',
        title: 'Critical Oxygen Level',
        message: `Oxygen saturation ${spo2}% is critically low. Seek emergency medical care immediately.`,
        severity: 'critical',
        source: 'health_monitor',
        tags: ['oxygen', 'critical', 'emergency', 'hypoxia'],
        data: {
          spo2,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (spo2 < rules.high.min) {
      return {
        type: 'vital',
        title: 'Low Oxygen Saturation',
        message: `Oxygen saturation ${spo2}% is low. Contact your healthcare provider.`,
        severity: 'high',
        source: 'health_monitor',
        tags: ['oxygen', 'low'],
        data: {
          spo2,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (spo2 < rules.medium.min) {
      return {
        type: 'vital',
        title: 'Oxygen Level Warning',
        message: `Oxygen saturation ${spo2}% is below ideal. Monitor closely.`,
        severity: 'medium',
        source: 'health_monitor',
        tags: ['oxygen', 'monitor'],
        data: {
          spo2,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    }

    return null;
  };

  const checkTemperature = (reading) => {
    const temp = reading.temperature;
    if (!temp) return null;

    const rules = ALERT_RULES.temperature;

    if (temp < rules.critical.min || temp > rules.critical.max) {
      return {
        type: 'vital',
        title: 'Critical Body Temperature',
        message: `Temperature ${temp}°C is ${temp < rules.critical.min ? 'critically low (hypothermia)' : 'critically high (hyperthermia)'}. Get medical help immediately.`,
        severity: 'critical',
        source: 'health_monitor',
        tags: ['temperature', 'critical', temp < rules.critical.min ? 'hypothermia' : 'hyperthermia'],
        data: {
          temperature: temp,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (temp < rules.high.min || temp > rules.high.max) {
      return {
        type: 'vital',
        title: 'Abnormal Temperature',
        message: `Temperature ${temp}°C is ${temp > rules.high.max ? 'elevated (fever)' : 'low'}. Monitor and consult doctor if persists.`,
        severity: 'high',
        source: 'health_monitor',
        tags: ['temperature', temp > rules.high.max ? 'fever' : 'low_temp'],
        data: {
          temperature: temp,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (temp < rules.medium.min || temp > rules.medium.max) {
      return {
        type: 'vital',
        title: 'Temperature Warning',
        message: `Temperature ${temp}°C is slightly ${temp > rules.medium.max ? 'elevated' : 'low'}. Keep monitoring.`,
        severity: 'medium',
        source: 'health_monitor',
        tags: ['temperature', 'monitor'],
        data: {
          temperature: temp,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    }

    return null;
  };

  const checkGSRValue = (reading) => {
    const gsr = reading.gsr_value;
    if (!gsr) return null;

    const rules = ALERT_RULES.gsrValue;

    if (gsr > rules.critical.max) {
      return {
        type: 'vital',
        title: 'Critical Stress Level',
        message: `GSR value ${gsr} indicates extremely high stress. Please rest and seek support.`,
        severity: 'critical',
        source: 'health_monitor',
        tags: ['stress', 'gsr', 'critical'],
        data: {
          gsr_value: gsr,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (gsr > rules.high.max) {
      return {
        type: 'vital',
        title: 'High Stress Detected',
        message: `GSR value ${gsr} shows elevated stress levels. Consider relaxation techniques.`,
        severity: 'high',
        source: 'health_monitor',
        tags: ['stress', 'gsr', 'high'],
        data: {
          gsr_value: gsr,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (gsr > rules.medium.max) {
      return {
        type: 'vital',
        title: 'Moderate Stress Level',
        message: `GSR value ${gsr} indicates moderate stress. Take breaks and practice deep breathing.`,
        severity: 'medium',
        source: 'health_monitor',
        tags: ['stress', 'gsr', 'moderate'],
        data: {
          gsr_value: gsr,
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    }

    return null;
  };

  const checkHeartAttackRisk = (reading) => {
    const risk = reading.heart_attack_risk;
    if (risk === null || risk === undefined) return null;

    const rules = ALERT_RULES.heartAttackRisk;

    if (risk >= rules.critical.min) {
      return {
        type: 'emergency',
        title: '🚨 CRITICAL: High Heart Attack Risk',
        message: `Heart attack risk is ${(risk * 100).toFixed(0)}%. This is CRITICAL. Call emergency services (911) immediately!`,
        severity: 'critical',
        source: 'ai_prediction',
        tags: ['heart_attack', 'critical', 'emergency', 'ai_alert'],
        data: {
          heart_attack_risk: risk,
          risk_percentage: (risk * 100).toFixed(2) + '%',
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
          heart_rate: reading.heart_rate,
          spo2: reading.spo2,
          temperature: reading.temperature,
          gsr_value: reading.gsr_value,
        },
      };
    } else if (risk >= rules.high.min) {
      return {
        type: 'risk',
        title: '⚠️ Elevated Heart Attack Risk',
        message: `Heart attack risk is ${(risk * 100).toFixed(0)}%. Seek medical attention soon and avoid strenuous activities.`,
        severity: 'high',
        source: 'ai_prediction',
        tags: ['heart_attack', 'high_risk', 'ai_alert'],
        data: {
          heart_attack_risk: risk,
          risk_percentage: (risk * 100).toFixed(2) + '%',
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    } else if (risk >= rules.medium.min) {
      return {
        type: 'risk',
        title: 'Moderate Heart Attack Risk',
        message: `Heart attack risk is ${(risk * 100).toFixed(0)}%. Monitor symptoms and consult your doctor.`,
        severity: 'medium',
        source: 'ai_prediction',
        tags: ['heart_attack', 'moderate_risk', 'ai_alert'],
        data: {
          heart_attack_risk: risk,
          risk_percentage: (risk * 100).toFixed(2) + '%',
          reading_id: reading.id,
          timestamp: reading.created_at,
          latitude: reading.latitude,
          longitude: reading.longitude,
        },
      };
    }

    return null;
  };

  const checkReading = async (reading) => {
    const alerts = [];
    if (!reading) return alerts;
    if (reading.id) {
      if (processedIdsRef.current.has(reading.id)) return alerts;
      processedIdsRef.current.add(reading.id);
      if (processedIdsRef.current.size > 500) {
        processedIdsRef.current = new Set([...processedIdsRef.current].slice(-250));
      }
    }

    const hrAlert = checkHeartRate(reading);
    if (hrAlert) alerts.push(hrAlert);

    const spo2Alert = checkOxygenSaturation(reading);
    if (spo2Alert) alerts.push(spo2Alert);

    const tempAlert = checkTemperature(reading);
    if (tempAlert) alerts.push(tempAlert);

    const gsrAlert = checkGSRValue(reading);
    if (gsrAlert) alerts.push(gsrAlert);

    const riskAlert = checkHeartAttackRisk(reading);
    if (riskAlert) alerts.push(riskAlert);

    for (const alert of alerts) {
      await createAlert(alert);
    }

    return alerts;
  };

  const checkNewReadings = async () => {
    if (!userId) return;

    try {
      const { data: readings, error } = await supabase
        .from('health_readings')
        .select('*')
        .eq('user_id', userId)
        .gt('created_at', lastCheckRef.current.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (readings && readings.length > 0) {
        for (const reading of readings) {
          await checkReading(reading);
        }

        lastCheckRef.current = new Date(readings[0].created_at);
      }
    } catch (error) {
      console.error('❌ Error checking readings:', error);
    }
  };

  useEffect(() => {
    if (!userId) return;

    checkNewReadings();

    const interval = setInterval(checkNewReadings, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('health_readings_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_readings',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          await checkReading(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    checkReading,
    checkNewReadings,
  };
}