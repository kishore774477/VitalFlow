import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'];

export default function AllergiesModal({ visible, onClose, allergies, onAdd, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    severity: '',
    reaction: '',
  });
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setFormData({
      name: '',
      severity: '',
      reaction: '',
    });
    setIsAdding(false);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Allergy name is required';
    if (!formData.severity) newErrors.severity = 'Severity is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      await onAdd(formData);
      Alert.alert('Success', 'Allergy added successfully');
      resetForm();
    } catch (_error) {
      Alert.alert('Error', 'Failed to add allergy');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Allergy',
      'Are you sure you want to remove this allergy?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await onDelete(id);
              Alert.alert('Success', 'Allergy deleted successfully');
            } catch (_error) {
              Alert.alert('Error', 'Failed to delete allergy');
            }
          }
        }
      ]
    );
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'mild': return '#f39c12';
      case 'moderate': return '#e67e22';
      case 'severe': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚠️ Allergies</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#ecf0f1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {!isAdding ? (
                <>
                  {allergies.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#34495e" />
                      <Text style={styles.emptyText}>No allergies recorded</Text>
                      <Text style={styles.emptySubtext}>Add your allergies to stay safe</Text>
                    </View>
                  ) : (
                    allergies.map((allergy) => (
                      <View key={allergy.id} style={styles.itemCard}>
                        <View style={styles.itemInfo}>
                          <View style={styles.allergyHeader}>
                            <Text style={styles.itemName}>{allergy.name}</Text>
                            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(allergy.severity) }]}>
                              <Text style={styles.severityText}>{allergy.severity}</Text>
                            </View>
                          </View>
                          {allergy.reaction && (
                            <Text style={styles.itemDetails}>Reaction: {allergy.reaction}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(allergy.id)}
                        >
                          <MaterialCommunityIcons name="delete" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.formTitle}>Add New Allergy</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Allergy Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.name && styles.inputError]}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="e.g., Peanuts, Penicillin, Shellfish"
                      placeholderTextColor="#7f8c8d"
                    />
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Severity <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.dropdownButton, errors.severity && styles.inputError]}
                      onPress={() => setShowSeverityDropdown(!showSeverityDropdown)}
                    >
                      <Text style={[styles.dropdownButtonText, !formData.severity && styles.placeholderText]}>
                        {formData.severity || 'Select severity level'}
                      </Text>
                      <MaterialCommunityIcons 
                        name={showSeverityDropdown ? "chevron-up" : "chevron-down"} 
                        size={24} 
                        color="#7f8c8d" 
                      />
                    </TouchableOpacity>
                    {errors.severity && <Text style={styles.errorText}>{errors.severity}</Text>}

                    {showSeverityDropdown && (
                      <View style={styles.dropdownList}>
                        {SEVERITY_OPTIONS.map((option, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData({ ...formData, severity: option });
                              setShowSeverityDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{option}</Text>
                            <View style={[styles.severityIndicator, { backgroundColor: getSeverityColor(option) }]} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Reaction (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.reaction}
                      onChangeText={(text) => setFormData({ ...formData, reaction: text })}
                      placeholder="Describe typical reaction..."
                      placeholderTextColor="#7f8c8d"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <View style={{ height: 20 }} />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {!isAdding ? (
                <TouchableOpacity 
                  style={styles.addButtonFull}
                  onPress={() => setIsAdding(true)}
                >
                  <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
                  <Text style={styles.addButtonText}>Add Allergy</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={resetForm}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSave}
                  >
                    <Text style={styles.saveButtonText}>Add</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a252f',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ecf0f1',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#5a6c7d',
    marginTop: 5,
  },
  itemCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  allergyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ecf0f1',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemDetails: {
    fontSize: 14,
    color: '#bdc3c7',
  },
  deleteBtn: {
    padding: 8,
  },
  form: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bdc3c7',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#34495e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#ecf0f1',
  },
  placeholderText: {
    color: '#7f8c8d',
  },
  dropdownList: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#34495e',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#ecf0f1',
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#2c3e50',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ecf0f1',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#3498db',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  addButtonFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
});