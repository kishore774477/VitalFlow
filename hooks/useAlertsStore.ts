import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'vital' | 'risk' | 'emergency' | 'system';

export interface AlertAction {
  label: string;
  handler: () => void;
}

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: number; // Date.now()
  read: boolean;
  source: 'local' | 'server';
  tags?: string[];
  actions?: AlertAction[];
  data?: Record<string, any>;
}

export interface AlertsFilters {
  severity?: AlertSeverity[];
  type?: AlertType[];
  unreadOnly?: boolean;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  searchQuery?: string;
}

const STORAGE_KEY = 'vitalflow_alerts';

export const useAlertsStore = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filters, setFilters] = useState<AlertsFilters>({ dateRange: 'all' });
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load alerts from AsyncStorage on mount
  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update unread count whenever alerts change
  useEffect(() => {
    const count = alerts.filter((a) => !a.read).length;
    setUnreadCount(count);
  }, [alerts]);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Alert[];
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAlerts = useCallback(async (newAlerts: Alert[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAlerts));
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }, []);

  const addAlert = useCallback(
    (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) => {
      const newAlert: Alert = {
        ...alert,
        id: `alert_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        read: false,
      };
      setAlerts((prevAlerts) => {
        const updated = [newAlert, ...prevAlerts];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((error) => {
          console.error('Failed to save alerts:', error);
        });
        return updated;
      });
      return newAlert;
    },
    []
  );

  const markRead = useCallback(
    (id: string) => {
      setAlerts((prevAlerts) => {
        const updated = prevAlerts.map((a) => (a.id === id ? { ...a, read: true } : a));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((error) => {
          console.error('Failed to save alerts:', error);
        });
        return updated;
      });
    },
    []
  );

  const markUnread = useCallback(
    (id: string) => {
      setAlerts((prevAlerts) => {
        const updated = prevAlerts.map((a) => (a.id === id ? { ...a, read: false } : a));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((error) => {
          console.error('Failed to save alerts:', error);
        });
        return updated;
      });
    },
    []
  );

  const markAllRead = useCallback(() => {
    setAlerts((prevAlerts) => {
      const updated = prevAlerts.map((a) => ({ ...a, read: true }));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((error) => {
        console.error('Failed to save alerts:', error);
      });
      return updated;
    });
  }, []);

  const deleteAlert = useCallback(
    (id: string) => {
      setAlerts((prevAlerts) => {
        const updated = prevAlerts.filter((a) => a.id !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((error) => {
          console.error('Failed to save alerts:', error);
        });
        return updated;
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    setAlerts([]);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([])).catch((error) => {
      console.error('Failed to clear alerts:', error);
    });
  }, []);

  const snooze = useCallback(
    (id: string, durationMs: number) => {
      const updated = alerts.map((a) =>
        a.id === id ? { ...a, read: true, data: { ...a.data, snoozedUntil: Date.now() + durationMs } } : a
      );
      saveAlerts(updated);
    },
    [alerts, saveAlerts]
  );

  const getFilteredAlerts = useCallback((): Alert[] => {
    let result = [...alerts];

    // Filter by unread
    if (filters.unreadOnly) {
      result = result.filter((a) => !a.read);
    }

    // Filter by severity
    if (filters.severity && filters.severity.length > 0) {
      result = result.filter((a) => filters.severity!.includes(a.severity));
    }

    // Filter by type
    if (filters.type && filters.type.length > 0) {
      result = result.filter((a) => filters.type!.includes(a.type));
    }

    // Filter by date range
    if (filters.dateRange) {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const sevenDays = 7 * oneDay;
      const thirtyDays = 30 * oneDay;

      if (filters.dateRange === 'today') {
        result = result.filter((a) => now - a.timestamp < oneDay);
      } else if (filters.dateRange === 'week') {
        result = result.filter((a) => now - a.timestamp < sevenDays);
      } else if (filters.dateRange === 'month') {
        result = result.filter((a) => now - a.timestamp < thirtyDays);
      }
    }

    // Search query
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.message.toLowerCase().includes(query) ||
          (a.tags && a.tags.some((t) => t.toLowerCase().includes(query)))
      );
    }

    return result;
  }, [alerts, filters]);

  const setFiltersState = useCallback((newFilters: AlertsFilters) => {
    setFilters(newFilters);
  }, []);

  const updateFilter = useCallback((key: keyof AlertsFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ dateRange: 'all' });
  }, []);

  return {
    alerts: getFilteredAlerts(),
    allAlerts: alerts,
    filters,
    loading,
    unreadCount,
    addAlert,
    markRead,
    markUnread,
    markAllRead,
    deleteAlert,
    clearAll,
    snooze,
    setFilters: setFiltersState,
    updateFilter,
    resetFilters,
    loadAlerts,
  };
};
