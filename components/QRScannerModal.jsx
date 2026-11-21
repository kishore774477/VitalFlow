import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function QRScannerModal({ visible, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [medicalData, setMedicalData] = useState(null);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    
    setScanned(true);
    try {
      const parsedData = JSON.parse(data);
      setMedicalData(parsedData);
    } catch (_error) {
      Alert.alert('Invalid QR Code', 'This QR code does not contain valid medical data.');
      setScanned(false);
    }
  };

  const handleClose = () => {
    setScanned(false);
    setMedicalData(null);
    onClose();
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <LinearGradient colors={['#0f1419', '#1a252f']} style={styles.container}>
          <View style={styles.permissionContainer}>
            <MaterialCommunityIcons name="camera-off" size={60} color="#e74c3c" />
            <Text style={styles.permissionText}>Camera permission is required</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Modal>
    );
  }

  if (medicalData) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <LinearGradient colors={['#0f1419', '#1a252f']} style={styles.container}>
          <ScrollView style={styles.dataContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Medical Information</Text>
              <TouchableOpacity onPress={handleClose}>
                <MaterialCommunityIcons name="close" size={28} color="#ecf0f1" />
              </TouchableOpacity>
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👤 Personal Details</Text>
              <InfoRow label="Name" value={medicalData.name} />
              <InfoRow label="Age" value={medicalData.age} />
              <InfoRow label="Gender" value={medicalData.gender} />
              <InfoRow label="Blood Type" value={medicalData.bloodType} important />
              <InfoRow label="Weight" value={`${medicalData.weight} kg`} />
              <InfoRow label="Height" value={`${medicalData.height} cm`} />
              <InfoRow label="Phone" value={medicalData.phone} />
            </View>

            {/* Emergency Contact */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📞 Emergency Contact</Text>
              <InfoRow label="Name" value={medicalData.emergencyContact.name} />
              <InfoRow label="Phone" value={medicalData.emergencyContact.phone} important />
              <InfoRow label="Relationship" value={medicalData.emergencyContact.relationship} />
            </View>

            {/* Allergies */}
            {medicalData.allergies && medicalData.allergies.length > 0 && (
              <View style={[styles.section, styles.alertSection]}>
                <Text style={styles.sectionTitle}>⚠️ ALLERGIES - CRITICAL</Text>
                {medicalData.allergies.map((allergy, index) => (
                  <View key={index} style={styles.allergyItem}>
                    <Text style={styles.allergyName}>{allergy.name}</Text>
                    <Text style={styles.allergySeverity}>{allergy.severity} - {allergy.reaction}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Medications */}
            {medicalData.medications && medicalData.medications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💊 Current Medications</Text>
                {medicalData.medications.map((med, index) => (
                  <View key={index} style={styles.medItem}>
                    <Text style={styles.medName}>{med.name} - {med.dosage}</Text>
                    <Text style={styles.medFrequency}>{med.frequency}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Medical Conditions */}
            {medicalData.conditions && medicalData.conditions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚕️ Medical Conditions</Text>
                {medicalData.conditions.map((condition, index) => (
                  <View key={index} style={styles.conditionItem}>
                    <Text style={styles.conditionName}>{condition.name}</Text>
                    <Text style={styles.conditionDetails}>{condition.severity}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Insurance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🛡️ Insurance</Text>
              <InfoRow label="Provider" value={medicalData.insurance.provider} />
              <InfoRow label="Policy Number" value={medicalData.insurance.policyNumber} />
            </View>

            {/* Organ Donor */}
            <View style={styles.section}>
              <View style={styles.donorRow}>
                <MaterialCommunityIcons 
                  name="heart-plus" 
                  size={24} 
                  color={medicalData.organDonor ? '#27ae60' : '#95a5a6'} 
                />
                <Text style={styles.donorText}>
                  {medicalData.organDonor ? 'ORGAN DONOR - YES' : 'Not an organ donor'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.scanAgainButton} onPress={() => {
              setScanned(false);
              setMedicalData(null);
            }}>
              <Text style={styles.scanAgainText}>Scan Another Code</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanHeader}>
              <Text style={styles.scanTitle}>Scan Medical ID QR Code</Text>
              <TouchableOpacity onPress={handleClose}>
                <MaterialCommunityIcons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.scanFrame}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            
            <Text style={styles.scanInstruction}>
              Position the QR code within the frame
            </Text>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const InfoRow = ({ label, value, important }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={[styles.infoValue, important && styles.importantValue]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  scanFrame: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3498db',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3498db',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#3498db',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#3498db',
  },
  scanInstruction: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 18,
    color: '#ecf0f1',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#95a5a6',
    fontSize: 14,
  },
  dataContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ecf0f1',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  alertSection: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 140, 141, 0.2)',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '700',
  },
  importantValue: {
    color: '#e74c3c',
    fontSize: 16,
  },
  allergyItem: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  allergyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e74c3c',
  },
  allergySeverity: {
    fontSize: 13,
    color: '#c0392b',
    marginTop: 2,
  },
  medItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 140, 141, 0.2)',
  },
  medName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
  },
  medFrequency: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  conditionItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 140, 141, 0.2)',
  },
  conditionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
  },
  conditionDetails: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  donorText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
  },
  scanAgainButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  scanAgainText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
