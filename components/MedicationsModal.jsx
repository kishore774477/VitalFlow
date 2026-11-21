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

const FREQUENCY_OPTIONS = ['Once daily', 'Twice daily', 'Three times daily', 'As needed'];

export default function MedicationsModal({ visible, onClose, medications, onAdd, onUpdate, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: '',
    startDate: '',
    endDate: '',
    notes: '',
  });
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);

  const toDBDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const openDatePicker = (field) => {
    setActiveDateField(field);
    setShowDatePicker(true);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'dismissed') return;
    }
    if (selectedDate && activeDateField) {
      setFormData(prev => ({ ...prev, [activeDateField]: toDBDate(selectedDate) }));
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
    setActiveDateField(null);
  };

  const resetForm = () => {
    const today = toDBDate(new Date());
    setFormData({
      name: '',
      dosage: '',
      frequency: '',
      time: '',
      startDate: Platform.OS === 'ios' ? today : '',
      endDate: Platform.OS === 'ios' ? today : '',
      notes: '',
    });
    setIsAdding(false);
    setEditingId(null);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Medication name is required';
    if (!formData.dosage.trim()) newErrors.dosage = 'Dosage is required';
    if (!formData.frequency) newErrors.frequency = 'Frequency is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.notes.trim()) newErrors.notes = 'Notes are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const dataToSave = {
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        time: formData.time,
        start_date: formData.startDate,
        end_date: formData.endDate,
        notes: formData.notes,
      };

      if (editingId) {
        await onUpdate(editingId, dataToSave);
        Alert.alert('Success', 'Medication updated successfully');
      } else {
        await onAdd(dataToSave);
        Alert.alert('Success', 'Medication added successfully');
      }
      resetForm();
    } catch (_error) {
      Alert.alert('Error', 'Failed to save medication');
    }
  };

  const handleEdit = (medication) => {
    setFormData({
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      time: medication.time || '',
      startDate: medication.start_date || '',
      endDate: medication.end_date || '',
      notes: medication.notes || '',
    });
    setEditingId(medication.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(id);
              Alert.alert('Success', 'Medication deleted successfully');
            } catch (_error) {
              Alert.alert('Error', 'Failed to delete medication');
            }
          },
        },
      ]
    );
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
              <Text style={styles.modalTitle}>💊 Medications</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#ecf0f1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {!isAdding ? (
                <>
                  {medications.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="pill" size={60} color="#34495e" />
                      <Text style={styles.emptyText}>No medications recorded</Text>
                      <Text style={styles.emptySubtext}>Add your current medications</Text>
                    </View>
                  ) : (
                    medications.map((med) => (
                      <View key={med.id} style={styles.itemCard}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{med.name} - {med.dosage}</Text>
                          <Text style={styles.itemDetails}>{med.frequency}</Text>
                          {med.time && <Text style={styles.itemDetails}>⏰ {med.time}</Text>}
                          {med.start_date && <Text style={styles.itemDetails}>📅 {med.start_date}{med.end_date ? ` → ${med.end_date}` : ''}</Text>}
                          {med.notes && <Text style={styles.itemDetails}>📝 {med.notes}</Text>}
                        </View>
                        <View style={styles.itemActions}>
                          <TouchableOpacity onPress={() => handleEdit(med)} style={styles.editBtn}>
                            <MaterialCommunityIcons name="pencil" size={20} color="#3498db" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(med.id)} style={styles.deleteBtn}>
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
                    {editingId ? 'Edit Medication' : 'Add New Medication'}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Medication Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.name && styles.inputError]}
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholder="e.g., Aspirin, Metformin"
                      placeholderTextColor="#7f8c8d"
                    />
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Dosage <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.dosage && styles.inputError]}
                      value={formData.dosage}
                      onChangeText={(text) => setFormData({ ...formData, dosage: text })}
                      placeholder="e.g., 100mg, 2 tablets"
                      placeholderTextColor="#7f8c8d"
                    />
                    {errors.dosage && <Text style={styles.errorText}>{errors.dosage}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Frequency <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.dropdownButton, errors.frequency && styles.inputError]}
                      onPress={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                    >
                      <Text style={[styles.dropdownButtonText, !formData.frequency && styles.placeholderText]}>
                        {formData.frequency || 'Select frequency'}
                      </Text>
                      <MaterialCommunityIcons 
                        name={showFrequencyDropdown ? "chevron-up" : "chevron-down"} 
                        size={24} 
                        color="#7f8c8d" 
                      />
                    </TouchableOpacity>
                    {errors.frequency && <Text style={styles.errorText}>{errors.frequency}</Text>}

                    {showFrequencyDropdown && (
                      <View style={styles.dropdownList}>
                        {FREQUENCY_OPTIONS.map((option, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData({ ...formData, frequency: option });
                              setShowFrequencyDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Time (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.time}
                      onChangeText={(text) => setFormData({ ...formData, time: text })}
                      placeholder="e.g., Morning and Evening"
                      placeholderTextColor="#7f8c8d"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Start Date <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, styles.dateButton, errors.startDate && styles.inputError]}
                      onPress={() => openDatePicker('startDate')}
                    >
                      <Text style={formData.startDate ? styles.dateText : styles.datePlaceholder}>
                        {formData.startDate || 'Select start date'}
                      </Text>
                      <MaterialCommunityIcons name="calendar" size={20} color="#7f8c8d" />
                    </TouchableOpacity>
                    {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      End Date <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={[styles.input, styles.dateButton, errors.endDate && styles.inputError]}
                      onPress={() => openDatePicker('endDate')}
                    >
                      <Text style={formData.endDate ? styles.dateText : styles.datePlaceholder}>
                        {formData.endDate || 'Select end date'}
                      </Text>
                      <MaterialCommunityIcons name="calendar" size={20} color="#7f8c8d" />
                    </TouchableOpacity>
                    {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Notes <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.notes && styles.inputError, { height: 80, textAlignVertical: 'top' }]}
                      value={formData.notes}
                      onChangeText={(text) => setFormData({ ...formData, notes: text })}
                      placeholder="e.g., Take with food"
                      placeholderTextColor="#7f8c8d"
                      multiline
                    />
                    {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
                  </View>

                  <View style={{ height: 20 }} />
                </View>
              )}
            </ScrollView>

            {/* Android: inline calendar that auto-closes on selection */}
            {showDatePicker && activeDateField && Platform.OS === 'android' && (
              <DateTimePicker
                value={formData[activeDateField] ? new Date(formData[activeDateField] + 'T12:00:00') : new Date()}
                mode="date"
                display="calendar"
                maximumDate={activeDateField === 'startDate' ? new Date() : undefined}
                minimumDate={activeDateField === 'endDate' ? new Date(new Date().setDate(new Date().getDate() + 1)) : new Date(new Date().getFullYear() - 10, 0, 1)}
                onChange={onDateChange}
              />
            )}

            {/* iOS: modal popup with spinner + Done button */}
            {Platform.OS === 'ios' && (
              <Modal
                visible={showDatePicker && !!activeDateField}
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
                    {activeDateField ? (
                      <DateTimePicker
                        value={formData[activeDateField] ? new Date(formData[activeDateField] + 'T12:00:00') : new Date()}
                        mode="date"
                        display="inline"
                        maximumDate={activeDateField === 'startDate' ? new Date() : undefined}
                        minimumDate={activeDateField === 'endDate' ? new Date(new Date().setDate(new Date().getDate() + 1)) : new Date(new Date().getFullYear() - 10, 0, 1)}
                        onChange={onDateChange}
                        style={{ backgroundColor: '#1a252f', alignSelf: 'center' }}
                      />
                    ) : null}
                  </View>
                </View>
              </Modal>
            )}
            <View style={styles.modalActions}>
              {!isAdding ? (
                <TouchableOpacity 
                  style={styles.addButtonFull}
                  onPress={() => setIsAdding(true)}
                >
                  <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
                  <Text style={styles.addButtonText}>Add Medication</Text>
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
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ecf0f1',
    marginBottom: 4,
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#ecf0f1',
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