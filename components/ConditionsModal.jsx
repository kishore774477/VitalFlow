import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'];

export default function ConditionsModal({ visible, onClose, conditions, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    diagnosed_date: '',
    severity: 'Moderate',
    notes: '',
  });
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const toDBDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed') return;
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, diagnosed_date: toDBDate(selectedDate) }));
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      diagnosed_date: Platform.OS === 'ios' ? toDBDate(new Date()) : '',
      severity: 'Moderate',
      notes: '',
    });
    setIsAdding(false);
    setEditingId(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Condition name is required';
    if (!formData.diagnosed_date) newErrors.diagnosed_date = 'Diagnosed date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    try {
      if (editingId) {
        await onUpdate(editingId, formData);
        Alert.alert('Success', 'Condition updated successfully');
      } else {
        await onAdd(formData);
        Alert.alert('Success', 'Condition added successfully');
      }
      resetForm();
    } catch (_error) {
      Alert.alert('Error', 'Failed to save condition');
    }
  };

  const handleEdit = (condition) => {
    setFormData({
      name: condition.name,
      diagnosed_date: condition.diagnosed_date,
      severity: condition.severity,
      notes: condition.notes || '',
    });
    setEditingId(condition.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Condition',
      'Are you sure you want to delete this condition?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(id);
              Alert.alert('Success', 'Condition deleted successfully');
            } catch (_error) {
              Alert.alert('Error', 'Failed to delete condition');
            }
          },
        },
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
    <Modal visible={visible} animationType="slide" transparent={true}>
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
              <Text style={styles.modalTitle}>⚕️ Medical Conditions</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#ecf0f1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {!isAdding ? (
                <>
                  {conditions.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="heart-pulse" size={60} color="#34495e" />
                      <Text style={styles.emptyText}>No conditions recorded</Text>
                      <Text style={styles.emptySubtext}>Add your medical conditions to keep track</Text>
                    </View>
                  ) : (
                    conditions.map((condition) => (
                      <View key={condition.id} style={styles.itemCard}>
                        <View style={styles.itemInfo}>
                          <View style={styles.conditionHeader}>
                            <Text style={styles.itemName}>{condition.name}</Text>
                            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(condition.severity) }]}>
                              <Text style={styles.severityText}>{condition.severity}</Text>
                            </View>
                          </View>
                          <Text style={styles.itemDetails}>
                            Since {new Date(condition.diagnosed_date).getFullYear()}
                          </Text>
                          {condition.notes && <Text style={styles.itemDetails}>📝 {condition.notes}</Text>}
                        </View>
                        <View style={styles.itemActions}>
                          <TouchableOpacity onPress={() => handleEdit(condition)} style={styles.editBtn}>
                            <MaterialCommunityIcons name="pencil" size={20} color="#3498db" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(condition.id)} style={styles.deleteBtn}>
                            <MaterialCommunityIcons name="delete" size={20} color="#e74c3c" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : (
                <View style={styles.form}>
                  <Text style={styles.formTitle}>
                    {editingId ? 'Edit Condition' : 'Add New Condition'}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Condition Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.name && styles.inputError]}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="e.g., Diabetes Type 2, Hypertension"
                      placeholderTextColor="#7f8c8d"
                    />
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Diagnosed Date <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, styles.dateButton, errors.diagnosed_date && styles.inputError]}
                      onPress={() => setShowDatePicker(!showDatePicker)}
                    >
                      <Text style={formData.diagnosed_date ? styles.dateText : styles.datePlaceholder}>
                        {formData.diagnosed_date || 'Select diagnosed date'}
                      </Text>
                      <MaterialCommunityIcons name="calendar" size={20} color="#7f8c8d" />
                    </TouchableOpacity>
                    {errors.diagnosed_date && <Text style={styles.errorText}>{errors.diagnosed_date}</Text>}
                    {/* Android: inline calendar that auto-closes on selection */}
                    {showDatePicker && Platform.OS === 'android' && (
                      <DateTimePicker
                        value={formData.diagnosed_date ? new Date(formData.diagnosed_date + 'T12:00:00') : new Date()}
                        mode="date"
                        display="calendar"
                        maximumDate={new Date()}
                        minimumDate={new Date(1900, 0, 1)}
                        onChange={onDateChange}
                      />
                    )}

                    {/* iOS: modal popup with spinner + Done button */}
                    {Platform.OS === 'ios' && (
                      <Modal
                        visible={showDatePicker}
                        transparent
                        animationType="fade"
                      >
                        <View style={styles.datePickerOverlay}>
                          <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                              <TouchableOpacity onPress={closeDatePicker}>
                                <Text style={styles.datePickerDone}>Done</Text>
                              </TouchableOpacity>
                            </View>
                            <DateTimePicker
                              value={formData.diagnosed_date ? new Date(formData.diagnosed_date + 'T12:00:00') : new Date()}
                              mode="date"
                              display="inline"
                              maximumDate={new Date()}
                              minimumDate={new Date(1900, 0, 1)}
                              onChange={onDateChange}
                              style={{ alignSelf: 'center' }}
                            />
                          </View>
                        </View>
                      </Modal>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Severity <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowSeverityDropdown(!showSeverityDropdown)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        {formData.severity}
                      </Text>
                      <MaterialCommunityIcons 
                        name={showSeverityDropdown ? "chevron-up" : "chevron-down"} 
                        size={24} 
                        color="#7f8c8d" 
                      />
                    </TouchableOpacity>

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
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                      value={formData.notes}
                      onChangeText={(text) => setFormData({ ...formData, notes: text })}
                      placeholder="e.g., Managed with diet and exercise"
                      placeholderTextColor="#7f8c8d"
                      multiline
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
                  <Text style={styles.addButtonText}>Add Condition</Text>
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
                    <Text style={styles.saveButtonText}>
                      {editingId ? 'Update' : 'Add'}
                    </Text>
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
  conditionHeader: {
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
    fontSize: 13,
    color: '#bdc3c7',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  form: {
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ecf0f1',
    marginBottom: 20,
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
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#ecf0f1',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  datePickerContainer: {
    width: '100%',
    backgroundColor: '#1a252f',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2c3e50',
    alignSelf: 'stretch',
  },
  datePickerDone: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '700',
  },
});