import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function EmergencyInfoModal({ visible, onClose, profile }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📝 Emergency Information</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#ecf0f1" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="information" size={24} color="#3498db" />
              <Text style={styles.infoText}>
                To edit emergency information, please go to your Profile settings.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Information:</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Insurance Provider:</Text>
                <Text style={styles.value}>{profile?.insurance_provider || 'Not set'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Policy Number:</Text>
                <Text style={styles.value}>{profile?.insurance_number || 'Not set'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Organ Donor:</Text>
                <Text style={styles.value}>{profile?.organ_donor ? 'Yes' : 'No'}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.navigateButton}
              onPress={() => {
                onClose();
                Alert.alert('Navigate to Profile', 'Please navigate to the Profile tab to edit this information.');
              }}
            >
              <Text style={styles.navigateButtonText}>Go to Profile Settings</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a252f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ecf0f1',
  },
  modalBody: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#bdc3c7',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ecf0f1',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  label: {
    fontSize: 14,
    color: '#bdc3c7',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#ecf0f1',
    fontWeight: '700',
  },
  navigateButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  navigateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});