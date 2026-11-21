import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import {
  alertTypeColors,
  alertTypeIcons,
  formatAlertTime,
  groupAlertsByDate,
  severityBackgrounds,
  severityColors,
  sortAlertsByDateAndSeverity,
} from '../lib/alert-utils';
import { setNotificationBadge } from '../lib/notifications';
import { useAlertsSupabase } from '../hooks/useAlertsSupabase';
import Navbar from './navbar';

const Alerts = () => {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [severityFilter, setSeverityFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get current user
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Use the custom hooks
  const {
    alerts,
    allAlerts,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    deleteAlert,
    clearAll,
    snooze,
    updateFilter,
    resetFilters: resetFiltersHook,
    refresh,
  } = useAlertsSupabase(userId);

  // Update notification badge count
  useEffect(() => {
    setNotificationBadge(unreadCount);
  }, [unreadCount]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleAlertPress = (alert) => {
    setSelectedAlert(alert);
    setShowDetail(true);
    if (!alert.read) {
      markRead(alert.id);
    }
  };

  const handleToggleSeverity = (severity) => {
    const updated = severityFilter.includes(severity)
      ? severityFilter.filter((s) => s !== severity)
      : [...severityFilter, severity];
    setSeverityFilter(updated);
    updateFilter('severity', updated.length > 0 ? updated : undefined);
  };

  const handleToggleType = (type) => {
    const updated = typeFilter.includes(type)
      ? typeFilter.filter((t) => t !== type)
      : [...typeFilter, type];
    setTypeFilter(updated);
    updateFilter('type', updated.length > 0 ? updated : undefined);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    updateFilter('searchQuery', text);
  };

  const resetFilters = () => {
    setSeverityFilter([]);
    setTypeFilter([]);
    setSearchQuery('');
    resetFiltersHook();
  };

  const handleResetFilters = () => {
    resetFilters();
  };

  const handleSnooze = async (duration) => {
    if (selectedAlert) {
      await snooze(selectedAlert.id, duration);
      setShowDetail(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteAlert(id);
    setShowDetail(false);
  };

  // Process alerts data
  const sortedAlerts = sortAlertsByDateAndSeverity(alerts);
  const groupedAlerts = groupAlertsByDate(sortedAlerts);
  const sections = Object.entries(groupedAlerts).map(([date, alerts]) => ({
    title: date,
    data: alerts,
  }));

  return (
    <LinearGradient colors={['#0f1419', '#1a252f', '#2c3e50']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Alerts</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={markAllRead}
            disabled={unreadCount === 0}
          >
            <MaterialIcons name="done-all" size={16} color="#3498db" />
            <Text style={styles.headerButtonText}>Mark Read</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={clearAll}
            disabled={allAlerts.length === 0}
          >
            <MaterialIcons name="delete-outline" size={16} color="#e74c3c" />
            <Text style={styles.headerButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowFilters(true)}
          >
            <MaterialIcons name="tune" size={16} color="#9b59b6" />
            <Text style={styles.headerButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#95a5a6" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search alerts..."
          placeholderTextColor="#7f8c8d"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <MaterialIcons name="close" size={20} color="#95a5a6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters Display */}
      {(severityFilter.length > 0 || typeFilter.length > 0) && (
        <ScrollView
          horizontal
          style={styles.activeFilters}
          showsHorizontalScrollIndicator={false}
        >
          {severityFilter.map((s) => (
            <TouchableOpacity
              key={`sev_${s}`}
              style={[styles.filterChip, { backgroundColor: severityBackgrounds[s] }]}
              onPress={() => handleToggleSeverity(s)}
            >
              <Text style={styles.filterChipText}>{s}</Text>
              <MaterialIcons name="close" size={14} color={severityColors[s]} />
            </TouchableOpacity>
          ))}
          {typeFilter.map((t) => (
            <TouchableOpacity
              key={`type_${t}`}
              style={[styles.filterChip, { backgroundColor: '#2c3e50' }]}
              onPress={() => handleToggleType(t)}
            >
              <Text style={styles.filterChipText}>{t}</Text>
              <MaterialIcons name="close" size={14} color={alertTypeColors[t]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Alerts List */}
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Loading...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="notifications-off" size={60} color="#7f8c8d" />
          <Text style={styles.emptyStateTitle}>No Alerts</Text>
          <Text style={styles.emptyStateMessage}>
            {searchQuery.length > 0 || severityFilter.length > 0 || typeFilter.length > 0
              ? 'No alerts match your filters. Try adjusting them.'
              : 'All clear! You have no alerts.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item: alert }) => (
            <TouchableOpacity
              style={styles.alertItem}
              onPress={() => handleAlertPress(alert)}
            >
              <View style={styles.alertIcon}>
                <MaterialIcons
                  name={alertTypeIcons[alert.type]}
                  size={24}
                  color={alertTypeColors[alert.type]}
                />
              </View>

              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertTitle} numberOfLines={1}>
                    {alert.title}
                  </Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: severityBackgrounds[alert.severity] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityBadgeText,
                        { color: severityColors[alert.severity] },
                      ]}
                    >
                      {alert.severity}
                    </Text>
                  </View>
                </View>

                <Text style={styles.alertMessage} numberOfLines={2}>
                  {alert.message}
                </Text>

                <Text style={styles.alertTime}>
                  {formatAlertTime(alert.created_at)}
                </Text>
              </View>

              <MaterialIcons name="chevron-right" size={24} color="#7f8c8d" />
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3498db"
            />
          }
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <LinearGradient colors={['#0f1419', '#1a252f']} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <MaterialIcons name="close" size={24} color="#ecf0f1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterList}>
              <Text style={styles.filterSectionTitle}>Severity</Text>
              {['critical', 'high', 'medium', 'low'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={styles.filterOption}
                  onPress={() => handleToggleSeverity(severity)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      severityFilter.includes(severity) && {
                        backgroundColor: severityColors[severity],
                      },
                    ]}
                  >
                    {severityFilter.includes(severity) && (
                      <MaterialIcons name="check" size={16} color="#ffffff" />
                    )}
                  </View>
                  <Text style={styles.filterOptionText}>{severity}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.filterSectionTitle, { marginTop: 20 }]}>Type</Text>
              {['vital', 'risk', 'emergency', 'system'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.filterOption}
                  onPress={() => handleToggleType(type)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      typeFilter.includes(type) && {
                        backgroundColor: alertTypeColors[type],
                      },
                    ]}
                  >
                    {typeFilter.includes(type) && (
                      <MaterialIcons name="check" size={16} color="#ffffff" />
                    )}
                  </View>
                  <Text style={styles.filterOptionText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.filterButtonSecondary}
                onPress={handleResetFilters}
              >
                <Text style={styles.filterButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterButtonPrimary}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.filterButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailContent}>
            {selectedAlert && (
              <>
                <View style={styles.detailHeader}>
                  <TouchableOpacity onPress={() => setShowDetail(false)}>
                    <MaterialIcons name="arrow-back" size={24} color="#ecf0f1" />
                  </TouchableOpacity>
                  <Text style={styles.detailTitle}>{selectedAlert.type}</Text>
                  <View style={{ width: 24 }} />
                </View>

                <ScrollView 
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailScrollContent}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.detailBody}>
                    <View style={styles.detailIconContainer}>
                      <MaterialIcons
                        name={alertTypeIcons[selectedAlert.type]}
                        size={48}
                        color={alertTypeColors[selectedAlert.type]}
                      />
                    </View>

                    <Text style={styles.detailAlertTitle}>{selectedAlert.title}</Text>

                    <View
                      style={[
                        styles.detailSeverity,
                        { backgroundColor: severityBackgrounds[selectedAlert.severity] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.detailSeverityText,
                          { color: severityColors[selectedAlert.severity] },
                        ]}
                      >
                        {selectedAlert.severity.toUpperCase()}
                      </Text>
                    </View>

                    <Text style={styles.detailTimestamp}>
                      {formatAlertTime(selectedAlert.created_at)}
                    </Text>

                    <Text style={styles.detailMessage}>{selectedAlert.message}</Text>

                    {/* Always show alert information */}
                    <View style={styles.detailDataContainer}>
                      <Text style={styles.detailDataTitle}>Alert Information</Text>
                      
                      <View style={styles.detailDataRow}>
                        <Text style={styles.detailDataLabel}>Type</Text>
                        <Text style={styles.detailDataValue}>{selectedAlert.type}</Text>
                      </View>

                      <View style={styles.detailDataRow}>
                        <Text style={styles.detailDataLabel}>Severity</Text>
                        <Text style={styles.detailDataValue}>{selectedAlert.severity}</Text>
                      </View>

                      <View style={styles.detailDataRow}>
                        <Text style={styles.detailDataLabel}>Status</Text>
                        <Text style={styles.detailDataValue}>
                          {selectedAlert.read ? 'Read' : 'Unread'}
                        </Text>
                      </View>

                      {/* Show custom data if exists */}
                      {selectedAlert.data && Object.keys(selectedAlert.data).length > 0 && (
                        <>
                          {Object.entries(selectedAlert.data).map(([key, value]) => (
                            <View key={key} style={styles.detailDataRow}>
                              <Text style={styles.detailDataLabel}>{key}</Text>
                              <Text style={styles.detailDataValue} numberOfLines={3}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </Text>
                            </View>
                          ))}
                        </>
                      )}

                      {/* Show metadata if exists */}
                      {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                        <>
                          {Object.entries(selectedAlert.metadata).map(([key, value]) => (
                            <View key={`meta_${key}`} style={styles.detailDataRow}>
                              <Text style={styles.detailDataLabel}>{key}</Text>
                              <Text style={styles.detailDataValue} numberOfLines={3}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </Text>
                            </View>
                          ))}
                        </>
                      )}

                      <View style={[styles.detailDataRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.detailDataLabel}>Created</Text>
                        <Text style={styles.detailDataValue} numberOfLines={2}>
                          {new Date(selectedAlert.created_at).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {selectedAlert.tags && selectedAlert.tags.length > 0 && (
                      <View style={styles.tagsContainer}>
                        {selectedAlert.tags.map((tag, index) => (
                          <View key={`${tag}_${index}`} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSnooze(60 * 60 * 1000)}
                  >
                    <MaterialIcons name="schedule" size={20} color="#3498db" />
                    <Text style={styles.actionButtonText}>Snooze 1h</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: '#e74c3c' }]}
                    onPress={() => handleDelete(selectedAlert.id)}
                  >
                    <MaterialIcons name="delete" size={20} color="#e74c3c" />
                    <Text style={[styles.actionButtonText, { color: '#e74c3c' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Navbar activeTab="Alerts" />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ecf0f1',
  },
  headerBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a252f',
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#ecf0f1',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#1a252f',
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#2c3e50',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    color: '#ecf0f1',
    fontSize: 14,
  },
  activeFilters: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipText: {
    color: '#ecf0f1',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ecf0f1',
    marginTop: 16,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3498db',
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#1a252f',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ecf0f1',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  alertMessage: {
    fontSize: 13,
    color: '#bdc3c7',
    marginBottom: 8,
    lineHeight: 18,
  },
  alertTime: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ecf0f1',
  },
  filterList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#bdc3c7',
    marginTop: 12,
    marginBottom: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2c3e50',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#ecf0f1',
    flex: 1,
    textTransform: 'capitalize',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2c3e50',
  },
  filterButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#3498db',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#ecf0f1',
    fontWeight: '700',
    fontSize: 14,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'flex-end',
    paddingTop: 40,
  },
  detailContent: {
    width: '100%',
    height: '91%',
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
    backgroundColor: '#1a252f',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ecf0f1',
    textTransform: 'capitalize',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 20,
  },
  detailBody: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  detailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  detailAlertTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ecf0f1',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
    paddingHorizontal: 10,
  },
  detailSeverity: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 8,
  },
  detailSeverityText: {
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailTimestamp: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 24,
  },
  detailMessage: {
    fontSize: 16,
    color: '#bdc3c7',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  detailDataContainer: {
    backgroundColor: '#1a252f',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2c3e50',
  },
  detailDataTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
  },
  detailDataLabel: {
    fontSize: 14,
    color: '#95a5a6',
    fontWeight: '600',
    textTransform: 'capitalize',
    flex: 1,
    marginRight: 12,
  },
  detailDataValue: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '700',
    flex: 1.5,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  tagText: {
    fontSize: 11,
    color: '#3498db',
    fontWeight: '600',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#2c3e50',
    backgroundColor: '#1a252f',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  actionButtonText: {
    color: '#3498db',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default Alerts;