import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useMedicalRecords } from '../hooks/useMedicalRecords';
import { useUserProfile } from '../hooks/useUserProfile';
import EditProfileModal from './EditProfileModal';
import EmergencyContactsModal from './EmergencyContactsModal';
import Navbar from './navbar';

export default function Profile() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emergencyAlertsEnabled, setEmergencyAlertsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmergencyContactsModal, setShowEmergencyContactsModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const router = useRouter();
  const { user, signOut } = useAuth();

  // Persist settings toggles per user on this device
  const settingsKey = user?.id ? `vitalflow_settings_${user.id}` : null;
  useEffect(() => {
    if (!settingsKey) return;
    AsyncStorage.getItem(settingsKey)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (typeof saved.notifications === 'boolean') setNotificationsEnabled(saved.notifications);
        if (typeof saved.emergencyAlerts === 'boolean') setEmergencyAlertsEnabled(saved.emergencyAlerts);
        if (typeof saved.dataSharing === 'boolean') setDataSharing(saved.dataSharing);
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true));
  }, [settingsKey]);

  useEffect(() => {
    if (!settingsKey || !settingsLoaded) return;
    AsyncStorage.setItem(
      settingsKey,
      JSON.stringify({
        notifications: notificationsEnabled,
        emergencyAlerts: emergencyAlertsEnabled,
        dataSharing,
      })
    ).catch(() => {});
  }, [settingsKey, settingsLoaded, notificationsEnabled, emergencyAlertsEnabled, dataSharing]);
  const { profile: rawProfile, updateProfile, uploadAvatar, deleteAvatar } = useUserProfile(user?.id);
  const profile = React.useMemo(() => rawProfile, [rawProfile]);
  const {
    emergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
  } = useMedicalRecords(user?.id);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/signin');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  }, [router, signOut]);

  const handleSaveProfile = useCallback(async (updates) => {
    try {
      const result = await updateProfile(updates);
      if (result.error) {
        Alert.alert('Error', result.error);
        return false;
      }
      Alert.alert('Success', 'Profile updated successfully!');
      return true;
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error('Update profile error:', error);
      return false;
    }
  }, [updateProfile]);

  const handlePickImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to set your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        const { error } = await uploadAvatar(result.assets[0].uri);
        setUploadingImage(false);

        if (error) {
          Alert.alert('Upload Failed', error);
        } else {
          Alert.alert('Success', 'Profile photo updated!');
        }
      }
    } catch (error) {
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to pick image');
      console.error('Image picker error:', error);
    }
  }, [uploadAvatar]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take your photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        const { error } = await uploadAvatar(result.assets[0].uri);
        setUploadingImage(false);

        if (error) {
          Alert.alert('Upload Failed', error);
        } else {
          Alert.alert('Success', 'Profile photo updated!');
        }
      }
    } catch (error) {
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to take photo');
      console.error('Camera error:', error);
    }
  }, [uploadAvatar]);

  const handleChangePhoto = useCallback(() => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickImage },
        profile?.avatar_url && {
          text: 'Remove Photo',
          onPress: async () => {
            const { error } = await deleteAvatar();
            if (error) {
              Alert.alert('Error', 'Failed to remove photo');
            } else {
              Alert.alert('Success', 'Profile photo removed');
            }
          },
          style: 'destructive'
        },
        { text: 'Cancel', style: 'cancel' }
      ].filter(Boolean)
    );
  }, [handlePickImage, handleTakePhoto, deleteAvatar, profile?.avatar_url]);

  const handleCloseEditModal = useCallback(() => setShowEditModal(false), []);
  const handleOpenEditModal = useCallback(() => setShowEditModal(true), []);
  const handleCloseEmergencyContactsModal = useCallback(() => setShowEmergencyContactsModal(false), []);
  const handleOpenEmergencyContactsModal = useCallback(() => setShowEmergencyContactsModal(true), []);

  const ProfileCard = ({ icon, title, subtitle, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.profileCard} onPress={onPress}>
      <View style={styles.profileCardContent}>
        <View style={styles.profileCardLeft}>
          <View style={styles.iconContainer}>
            {icon}
          </View>
          <View style={styles.profileCardText}>
            <Text style={styles.profileCardTitle}>{title}</Text>
            {subtitle && <Text style={styles.profileCardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {showArrow && (
          <MaterialCommunityIcons name="chevron-right" size={24} color="#7f8c8d" />
        )}
      </View>
    </TouchableOpacity>
  );

  const ToggleCard = ({ icon, title, subtitle, value, onToggle }) => (
    <View style={styles.profileCard}>
      <View style={styles.profileCardContent}>
        <View style={styles.profileCardLeft}>
          <View style={styles.iconContainer}>
            {icon}
          </View>
          <View style={styles.profileCardText}>
            <Text style={styles.profileCardTitle}>{title}</Text>
            {subtitle && <Text style={styles.profileCardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#e0e0e0', true: '#3498db' }}
          thumbColor={value ? '#ffffff' : '#f4f3f4'}
        />
      </View>
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
          {/* Profile Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.profilePicture}
              onPress={handleChangePhoto}
              disabled={uploadingImage}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url, cache: 'reload' }}
                  style={styles.avatarImage}
                  key={profile.avatar_url}
                />
              ) : (
                <MaterialCommunityIcons name="account" size={60} color="#3498db" />
              )}
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#ffffff" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <MaterialCommunityIcons name="camera" size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>
              {profile?.full_name || user?.user_metadata?.full_name || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email || 'user@healthguard.com'}</Text>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={handleOpenEditModal}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="calendar" size={24} color="#3498db" />
                <Text style={styles.statValue}>{profile?.age || '--'}</Text>
                <Text style={styles.statLabel}>Age</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="gender-male-female" size={24} color="#e74c3c" />
                <Text style={styles.statValue}>{profile?.gender || '--'}</Text>
                <Text style={styles.statLabel}>Gender</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="water" size={24} color="#e74c3c" />
                <Text style={styles.statValue}>{profile?.blood_type || '--'}</Text>
                <Text style={styles.statLabel}>Blood Type</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="weight" size={24} color="#f39c12" />
                <Text style={styles.statValue}>
                  {profile?.weight ? `${profile.weight}kg` : '--'}
                </Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
            </View>
          </View>

          {/* Emergency Contact Info */}
          {profile?.emergency_contact_name && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account-alert" size={20} color="#e74c3c" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>{profile.emergency_contact_name}</Text>
                  </View>
                </View>
                {profile.emergency_contact_phone && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone" size={20} color="#27ae60" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{profile.emergency_contact_phone}</Text>
                    </View>
                  </View>
                )}
                {profile.emergency_contact_relationship && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-heart" size={20} color="#9b59b6" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Relationship</Text>
                      <Text style={styles.infoValue}>{profile.emergency_contact_relationship}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Insurance Info */}
          {profile?.insurance_provider && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Insurance</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="shield-check" size={20} color="#3498db" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Provider</Text>
                    <Text style={styles.infoValue}>{profile.insurance_provider}</Text>
                  </View>
                </View>
                {profile.insurance_number && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="card-account-details" size={20} color="#f39c12" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>Policy Number</Text>
                      <Text style={styles.infoValue}>{profile.insurance_number}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Emergency Contacts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              <TouchableOpacity onPress={handleOpenEmergencyContactsModal}>
                <MaterialCommunityIcons name="pencil" size={20} color="#3498db" />
              </TouchableOpacity>
            </View>

            {/* Primary Emergency Contact from Profile */}
            {profile?.emergency_contact_name && profile?.emergency_contact_phone && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account-alert" size={20} color="#e74c3c" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Primary Emergency Contact</Text>
                    <Text style={styles.infoValue}>{profile.emergency_contact_name}</Text>
                    <Text style={styles.infoSubValue}>{profile.emergency_contact_phone}</Text>
                  </View>
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Additional Emergency Contacts from Database */}
            {emergencyContacts && emergencyContacts.length > 0 ? (
              emergencyContacts.map((contact) => (
                <View key={contact.id} style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-alert" size={20} color="#e74c3c" />
                    <View style={styles.infoText}>
                      <Text style={styles.infoLabel}>{contact.relationship}</Text>
                      <Text style={styles.infoValue}>{contact.name}</Text>
                      <Text style={styles.infoSubValue}>
                        {contact.country_code} {contact.phone}
                      </Text>
                    </View>
                    {contact.is_primary && (
                      <View style={styles.secondaryBadge}>
                        <Text style={styles.secondaryBadgeText}>BACKUP</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : !profile?.emergency_contact_phone ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No emergency contacts added</Text>
                <TouchableOpacity
                  style={styles.addContactButton}
                  onPress={handleOpenEmergencyContactsModal}
                >
                  <Text style={styles.addContactButtonText}>+ Add Contact</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Add More Contacts Button */}
            {(profile?.emergency_contact_name && profile?.emergency_contact_phone) && (
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={handleOpenEmergencyContactsModal}
              >
                <MaterialCommunityIcons name="plus-circle" size={20} color="#3498db" />
                <Text style={styles.addMoreButtonText}>
                  Add Additional Emergency Contact
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Account Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <ProfileCard
              icon={<MaterialCommunityIcons name="account-edit" size={24} color="#3498db" />}
              title="Personal Information"
              subtitle="Manage your basic information"
              onPress={handleOpenEditModal}
            />

            <ProfileCard
              icon={<MaterialCommunityIcons name="medical-bag" size={24} color="#e74c3c" />}
              title="Medical History"
              subtitle="Medications, conditions and allergies"
              onPress={() => router.push('/health')}
            />
          </View>

          {/* App Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <ToggleCard
              icon={<Ionicons name="notifications" size={24} color="#9b59b6" />}
              title="Push Notifications"
              subtitle="Receive health alerts and updates"
              value={notificationsEnabled}
              onToggle={setNotificationsEnabled}
            />

            <ToggleCard
              icon={<MaterialCommunityIcons name="alert" size={24} color="#e74c3c" />}
              title="Emergency Alerts"
              subtitle="Critical health alert notifications"
              value={emergencyAlertsEnabled}
              onToggle={setEmergencyAlertsEnabled}
            />

            <ToggleCard
              icon={<MaterialCommunityIcons name="share-variant" size={24} color="#27ae60" />}
              title="Data Sharing"
              subtitle="Share health data with healthcare providers"
              value={dataSharing}
              onToggle={setDataSharing}
            />
          </View>

          {/* Support & Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>

            <ProfileCard
              icon={<MaterialCommunityIcons name="help-circle" size={24} color="#3498db" />}
              title="Help & Support"
              subtitle="Get help with app features"
              onPress={() => Alert.alert(
                'Help & Support',
                'Home: live vitals and risk level\nAnalytics: trends over time\nHealth: emergency SOS, contacts, medical records and Medical ID QR\nAlerts: notifications raised from abnormal readings'
              )}
            />

            <ProfileCard
              icon={<MaterialCommunityIcons name="information" size={24} color="#7f8c8d" />}
              title="About VitalFlow"
              subtitle="App version 1.0.0"
              onPress={() => Alert.alert('About', 'VitalFlow v1.0.0\nAI-assisted health monitoring and heart attack risk alerts.')}
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={24} color="#ffffff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={handleCloseEditModal}
        profile={profile}
        onSave={handleSaveProfile}
        onUploadAvatar={uploadAvatar}
      />

      {/* Emergency Contacts Modal */}
      <EmergencyContactsModal
        visible={showEmergencyContactsModal}
        onClose={handleCloseEmergencyContactsModal}
        contacts={emergencyContacts || []}
        onAdd={addEmergencyContact}
        onUpdate={updateEmergencyContact}
        onDelete={deleteEmergencyContact}
        profile={profile}
        onUpdatePrimary={async (fields) => {
          await updateProfile(fields);
        }}
      />

      <Navbar activeTab="Profile" />
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
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'visible',
    position: 'relative',
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 47,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#3498db',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f1419',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
  },
  editProfileButton: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  editProfileText: {
    color: '#3498db',
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileCardText: {
    flex: 1,
  },
  profileCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  profileCardSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 30,
  },
  logoutText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 10,
    fontSize: 16,
  },
  bottomPadding: {
    height: 120,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 140, 141, 0.2)',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryBadge: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  secondaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoSubValue: {
    fontSize: 13,
    color: '#3498db',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(127, 140, 141, 0.3)',
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  addContactButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addContactButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3498db',
    borderStyle: 'dashed',
    marginTop: 10,
  },
  addMoreButtonText: {
    color: '#3498db',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  sosButton: {
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#e74c3c',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  sosTextContainer: {
    marginLeft: 15,
    alignItems: 'flex-start',
  },
  sosButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
  sosNumberText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 2,
    opacity: 0.9,
  },
  sosHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});