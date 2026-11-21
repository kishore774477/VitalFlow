import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAlertsSupabase(userId) {
  const [alerts, setAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState({});

  // Fetch alerts
  const fetchAlerts = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      let query = supabase
        .from('alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      const alertsData = data || [];
      setAllAlerts(alertsData);
      
      // Apply filters
      let filteredAlerts = [...alertsData];
      
      if (filters.severity && filters.severity.length > 0) {
        filteredAlerts = filteredAlerts.filter(a => filters.severity.includes(a.severity));
      }
      if (filters.type && filters.type.length > 0) {
        filteredAlerts = filteredAlerts.filter(a => filters.type.includes(a.type));
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filteredAlerts = filteredAlerts.filter(a => 
          a.title.toLowerCase().includes(query) || 
          a.message.toLowerCase().includes(query)
        );
      }
      
      setAlerts(filteredAlerts);
      
      // Count unread
      const unread = alertsData.filter(a => !a.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add alert - FIXED: changed timestamp to created_at
  const addAlert = async (alertData) => {
    if (!userId) return { error: 'No user logged in' };

    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert([{
          user_id: userId,
          created_at: new Date().toISOString(), // CHANGED from timestamp
          ...alertData
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchAlerts();
      return { data, error: null };
    } catch (err) {
      console.error('Error adding alert:', err);
      return { data: null, error: err.message };
    }
  };

  // Mark as read
  const markRead = async (alertId) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Delete alert
  const deleteAlert = async (alertId) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  // Clear all alerts
  const clearAll = async () => {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error clearing alerts:', err);
    }
  };

  // Snooze alert
  const snooze = async (alertId, duration) => {
    try {
      const snoozedUntil = new Date(Date.now() + duration);
      const { error } = await supabase
        .from('alerts')
        .update({ snoozed_until: snoozedUntil.toISOString() })
        .eq('id', alertId)
        .eq('user_id', userId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err) {
      console.error('Error snoozing alert:', err);
    }
  };

  // Update filters
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
  };

  // Load alerts (alias for fetchAlerts for compatibility)
  const loadAlerts = fetchAlerts;

  // Re-fetch when filters change
  useEffect(() => {
    if (userId) {
      fetchAlerts();
    }
  }, [filters, userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    fetchAlerts();

    const subscription = supabase
      .channel('alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Alert change:', payload);
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return {
    alerts,
    allAlerts,
    loading,
    unreadCount,
    filters,
    addAlert,
    markRead,
    markAllRead,
    deleteAlert,
    clearAll,
    snooze,
    updateFilter,
    resetFilters,
    refresh: fetchAlerts,
    loadAlerts,
  };
}