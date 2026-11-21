import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const getPeriodDate = (period) => {
  const now = new Date();
  switch (period) {
    case '24H': now.setHours(now.getHours() - 24); break;
    case '7D':  now.setDate(now.getDate() - 7); break;
    case '30D': now.setDate(now.getDate() - 30); break;
    case '3M':  now.setDate(now.getDate() - 90); break;
    default:    now.setDate(now.getDate() - 7);
  }
  return now.toISOString();
};

// period = '24H'|'7D'|'30D'|'3M' for time-windowed fetch
// recentCount = number → fetch last N valid readings regardless of date
export function useHealthData(userId, period = '7D', recentCount = null) {
  const [latestReading, setLatestReading] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the most recent row regardless of sensor completeness
  const fetchLatestReading = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('health_readings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching latest reading:', error);
      } else if (data) {
        setLatestReading(data);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  }, [userId]);

  // Fetch historical readings — either last N readings or within a time window
  const fetchReadings = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let query = supabase
        .from('health_readings')
        .select('*')
        .eq('user_id', userId)
        .gt('heart_rate', 0)
        .gt('spo2', 0)
        .gt('temperature', 0)
        .order('created_at', { ascending: true });

      if (recentCount) {
        // Fetch last N valid readings, most recent first, then reverse to chronological
        query = supabase
          .from('health_readings')
          .select('*')
          .eq('user_id', userId)
          .gt('heart_rate', 0)
          .gt('spo2', 0)
          .gt('temperature', 0)
          .order('created_at', { ascending: false })
          .limit(recentCount);
      } else {
        const since = getPeriodDate(period);
        query = query.gte('created_at', since);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching readings:', error);
      } else {
        // If recentCount, reverse so oldest→newest for chart ordering
        setReadings(recentCount ? [...(data || [])].reverse() : (data || []));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, period, recentCount]);

  // Subscribe to real-time updates and trigger initial fetches
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 5;
    let pollInterval = null;
    let realtimePollInterval = null;
    let subscriptionList = [];

    fetchLatestReading();
    fetchReadings();

    // Poll for the latest reading every 30 s as a safety net in case
    // real-time events are silently dropped (no CHANNEL_ERROR raised).
    realtimePollInterval = setInterval(fetchLatestReading, 30000);

    const subscribeToRealtime = () => {
      if (retryCount >= MAX_RETRIES) {
        console.warn(`Realtime subscription failed after ${MAX_RETRIES} attempts. Falling back to polling.`);
        // Aggressive polling fallback
        if (mounted && !pollInterval) {
          pollInterval = setInterval(() => {
            fetchLatestReading();
            fetchReadings();
          }, 10000);
        }
        return;
      }

      // Use a unique channel name per user to avoid subscription collisions on re-mount
      const channelName = `health_readings_${userId}_${retryCount}`;
      const subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'health_readings',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!mounted) return;
            if (payload.new) {
              // Always update the live display with the newest row
              setLatestReading(payload.new);
              // Only append to chart readings if all sensors have valid data
              if (payload.new.heart_rate > 0 && payload.new.spo2 > 0 && payload.new.temperature > 0) {
                setReadings((prev) => {
                  const updated = [...prev, payload.new];
                  const since = new Date(getPeriodDate(period)).getTime();
                  return updated.filter(r => new Date(r.created_at).getTime() >= since);
                });
              }
            }
          }
        )
        .subscribe(async (status) => {
          if (!mounted) return;

          console.log(`[${channelName}] Realtime status: ${status}`);

          if (status === 'SUBSCRIBED') {
            console.log(`✓ Realtime subscribed for user ${userId}`);
            retryCount = 0; // Reset on success
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`✗ Realtime channel error on attempt ${retryCount + 1}`);
            retryCount++;
            
            // Cleanup current subscription
            supabase.removeChannel(subscription);
            
            // Retry with exponential backoff
            const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
            console.log(`Retrying realtime connection in ${backoffMs}ms...`);
            
            setTimeout(() => {
              if (mounted) {
                subscribeToRealtime();
              }
            }, backoffMs);
          } else if (status === 'CLOSED') {
            console.log(`[${channelName}] Realtime connection closed`);
            retryCount++;
            
            setTimeout(() => {
              if (mounted) {
                subscribeToRealtime();
              }
            }, 2000);
          }
        });

      subscriptionList.push(subscription);
    };

    // Initial subscription attempt
    subscribeToRealtime();

    return () => {
      mounted = false;
      clearInterval(realtimePollInterval);
      clearInterval(pollInterval);
      subscriptionList.forEach(sub => supabase.removeChannel(sub));
      subscriptionList = [];
    };
  }, [userId, period, fetchLatestReading, fetchReadings]);

  return {
    latestReading,
    readings,
    loading,
    refresh: fetchReadings,
  };
}
