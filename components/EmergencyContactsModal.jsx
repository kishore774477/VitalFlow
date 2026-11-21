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
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RELATIONSHIP_OPTIONS = [
  'Spouse', 'Father', 'Mother', 'Brother', 'Sister',
  'Son', 'Daughter', 'Friend', 'Driver', 'Colleague',
  'Neighbor', 'Guardian', 'Other'
];

// ...existing imports...
export default function EmergencyContactsModal({
  visible,
  onClose,
  contacts,
  onAdd,
  onUpdate,
  onDelete,
  profile,
  onEditPrimary, // not used anymore
  onUpdatePrimary, // <-- new prop
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPrimary, setEditingPrimary] = useState(false); // <-- new state
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    country_code: '+91',
    is_primary: false,
  });
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: '',
      phone: '',
      country_code: '+91',
      is_primary: false,
    });
    setIsAdding(false);
    setEditingId(null);
    setEditingPrimary(false); // <-- reset
  };

  const handleSave = async () => {
    if (!formData.name || !formData.relationship || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const contactData = {
      name: formData.name.trim(),
      relationship: formData.relationship,
      phone: formData.phone.trim(),
      country_code: formData.country_code,
      is_primary: formData.is_primary,
    };

    if (editingPrimary) {
      // Update profile's emergency contact fields
      await onUpdatePrimary({
        emergency_contact_name: contactData.name,
        emergency_contact_relationship: contactData.relationship,
        emergency_contact_phone: `${contactData.country_code} ${contactData.phone}`,
      });
      Alert.alert('Success', 'Primary contact updated successfully');
    } else if (editingId) {
      await onUpdate(editingId, contactData);
      Alert.alert('Success', 'Contact updated successfully');
    } else {
      await onAdd(contactData);
      Alert.alert('Success', 'Contact added successfully');
    }

    resetForm();
  };

  const handleEdit = (contact) => {
    const phoneWithoutCode = contact.phone.replace(contact.country_code, '').trim();
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: phoneWithoutCode,
      country_code: contact.country_code || '+91',
      is_primary: contact.is_primary || false,
    });
    setEditingId(contact.id);
    setIsAdding(true);
    setEditingPrimary(false);
  };

  const handleEditPrimary = () => {
    // Only proceed if profile exists
    if (!profile) {
      Alert.alert('Error', 'Profile not loaded. Please try again.');
      return;
    }
    // Parse country code and phone
    let code = '+91', number = '';
    if (profile.emergency_contact_phone) {
      const match = profile.emergency_contact_phone.match(/^(\+\d{1,3})\s*(.*)$/);
      if (match) {
        code = match[1];
        number = match[2];
      } else {
        number = profile.emergency_contact_phone;
      }
    }
    setFormData({
      name: profile.emergency_contact_name || '',
      relationship: profile.emergency_contact_relationship || '',
      phone: number,
      country_code: code,
      is_primary: true,
    });
    setEditingId(null);
    setIsAdding(true);
    setEditingPrimary(true);
  };
  
  // ...existing code...

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to delete this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            await onDelete(id);
            Alert.alert('Success', 'Contact deleted');
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Emergency Contacts</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#ecf0f1" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
              {/* Primary Emergency Contact from Profile */}
              {profile?.emergency_contact_name && profile?.emergency_contact_phone && (
                <View style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactHeader}>
                      <Text style={styles.contactName}>{profile.emergency_contact_name}</Text>
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                      </View>
                    </View>
                    <Text style={styles.contactRelation}>{profile.emergency_contact_relationship}</Text>
                    <Text style={styles.contactPhone}>{profile.emergency_contact_phone}</Text>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleEditPrimary}
                    >
                      <MaterialCommunityIcons name="pencil" size={20} color="#3498db" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Existing Additional Contacts */}
              {contacts && contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactHeader}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.is_primary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.contactRelation}>{contact.relationship}</Text>
                    <Text style={styles.contactPhone}>
                      {contact.country_code} {contact.phone}
                    </Text>
                  </View>
                  <View style={styles.contactActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(contact)}
                    >
                      <MaterialCommunityIcons name="pencil" size={20} color="#3498db" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(contact.id)}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Add/Edit Form */}
              {isAdding && (
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>
                    {editingPrimary
                      ? 'Edit Primary Contact'
                      : editingId
                        ? 'Edit Contact'
                        : 'Add New Contact'}
                  </Text>

                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Contact name"
                    placeholderTextColor="#7f8c8d"
                  />

                  <Text style={styles.inputLabel}>Relationship *</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowRelationshipDropdown(!showRelationshipDropdown)}
                  >
                    <Text style={[styles.dropdownButtonText, !formData.relationship && styles.placeholderText]}>
                      {formData.relationship || 'Select relationship'}
                    </Text>
                    <MaterialCommunityIcons 
                      name={showRelationshipDropdown ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color="#7f8c8d" 
                    />
                  </TouchableOpacity>

                  {showRelationshipDropdown && (
                    <View style={styles.dropdownList}>
                      <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                        {RELATIONSHIP_OPTIONS.map((option, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData({ ...formData, relationship: option });
                              setShowRelationshipDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{option}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <View style={styles.phoneInputContainer}>
                    <TextInput
                      style={styles.countryCodeInput}
                      value={formData.country_code}
                      onChangeText={(text) => setFormData({ ...formData, country_code: text })}
                      placeholder="+91"
                      placeholderTextColor="#7f8c8d"
                      keyboardType="phone-pad"
                    />
                    <TextInput
                      style={styles.phoneInput}
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      placeholder="Phone number"
                      placeholderTextColor="#7f8c8d"
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Hide "Set as primary" for editing primary */}
                  {!editingPrimary && (
                    <TouchableOpacity 
                      style={styles.checkboxRow}
                      onPress={() => setFormData({ ...formData, is_primary: !formData.is_primary })}
                    >
                      <MaterialCommunityIcons 
                        name={formData.is_primary ? "checkbox-marked" : "checkbox-blank-outline"} 
                        size={24} 
                        color="#3498db" 
                      />
                      <Text style={styles.checkboxLabel}>Set as primary contact</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                      <Text style={styles.saveButtonText}>
                        {editingPrimary
                          ? 'Update'
                          : editingId
                            ? 'Update'
                            : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {!isAdding && (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => {
                  setIsAdding(true);
                  setEditingId(null);
                  setEditingPrimary(false);
                }}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
                <Text style={styles.addButtonText}>Add Emergency Contact</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Added semi-transparent overlay
  },
  keyboardView: {
    maxHeight: '90%', // Moved maxHeight here
  },
  modalContent: {
    backgroundColor: '#1a252f',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '100%', // Changed from maxHeight to height
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
  contactsList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1, // Changed from maxHeight to flex
  },
  contactCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ecf0f1',
  },
  primaryBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  contactRelation: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 3,
  },
  contactPhone: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 8,
  },
  formCard: {
    backgroundColor: '#2c3e50',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ecf0f1',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bdc3c7',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#1a252f',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCodeInput: {
    backgroundColor: '#1a252f',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
    width: 80,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#1a252f',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
  },
  dropdownButton: {
    backgroundColor: '#1a252f',
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
    backgroundColor: '#1a252f',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#34495e',
  },
  dropdownScroll: {
    maxHeight: 150,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#ecf0f1',
    marginLeft: 10,
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#34495e',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ecf0f1',
    fontWeight: '700',
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#3498db',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 15,
    margin: 20,
    borderRadius: 15,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
});
