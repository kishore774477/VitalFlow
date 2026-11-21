import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONSHIP_OPTIONS = [
  'Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter',
  'Friend', 'Driver', 'Colleague', 'Neighbor', 'Guardian', 'Other'
];
const INSURANCE_PROVIDERS = [
  'Life Insurance Corporation of India (LIC)', 'ICICI Prudential Life Insurance',
  'HDFC Life Insurance', 'SBI Life Insurance', 'Max Life Insurance',
  'Bajaj Allianz Life Insurance', 'Tata AIA Life Insurance',
  'Aditya Birla Sun Life Insurance', 'Kotak Mahindra Life Insurance',
  'Star Health Insurance', 'Apollo Munich Health Insurance',
  'Care Health Insurance', 'Niva Bupa Health Insurance',
  'Religare Health Insurance', 'National Insurance Company',
  'New India Assurance', 'United India Insurance', 'Oriental Insurance', 'Other'
];

export default function EditProfileModal({ visible, onClose, profile, onSave, onUploadAvatar }) {
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    weight: '',
    height: '',
    phone: '',
    country_code: '+91',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_country_code: '+91',
    emergency_contact_relationship: '',
    insurance_provider: '',
    insurance_number: '',
    organ_donor: false,
  });
  const [saving, setSaving] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showBloodTypeDropdown, setShowBloodTypeDropdown] = useState(false);
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);
  const [showInsuranceDropdown, setShowInsuranceDropdown] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());

  const toDBDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const onDobChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
      if (event.type === 'dismissed') return;
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date_of_birth: toDBDate(selectedDate) }));
    }
  };

  // Refs for phone inputs to maintain focus
  const phoneRef = useRef(null);
  const countryCodeRef = useRef(null);
  const emergencyPhoneRef = useRef(null);
  const emergencyCountryCodeRef = useRef(null);

  // Only reset formData when modal is opened for the first time after being closed
  useEffect(() => {
    if (visible && profile && !hasInitialized) {
      const parsePhone = (phone) => {
        if (!phone) return { code: '+91', number: '' };
        if (phone.startsWith('+')) {
          const match = phone.match(/^(\+\d{1,3})(.*)$/);
          if (match) return { code: match[1], number: match[2].trim() };
        }
        return { code: '+91', number: phone };
      };
      const userPhone = parsePhone(profile.phone);
      const emergencyPhone = parsePhone(profile.emergency_contact_phone);
      setFormData({
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        blood_type: profile.blood_type || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        phone: userPhone.number || '',
        country_code: userPhone.code || '+91',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: emergencyPhone.number || '',
        emergency_contact_country_code: emergencyPhone.code || '+91',
        emergency_contact_relationship: profile.emergency_contact_relationship || '',
        insurance_provider: profile.insurance_provider || '',
        insurance_number: profile.insurance_number || '',
        organ_donor: profile.organ_donor || false,
      });
      setHasInitialized(true);
    }
    if (!visible && hasInitialized) {
      setHasInitialized(false);
    }
  }, [visible, profile, hasInitialized]);

  // Update avatar key when profile.avatar_url changes
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarKey(Date.now());
    }
  }, [profile?.avatar_url]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Name is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.blood_type) newErrors.blood_type = 'Blood type is required';
    if (!formData.weight || parseFloat(formData.weight) < 1) newErrors.weight = 'Valid weight is required';
    if (!formData.height || parseFloat(formData.height) < 1) newErrors.height = 'Valid height is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.emergency_contact_name.trim()) newErrors.emergency_contact_name = 'Emergency contact name is required';
    if (!formData.emergency_contact_phone.trim()) newErrors.emergency_contact_phone = 'Emergency contact phone is required';
    if (!formData.emergency_contact_relationship.trim()) newErrors.emergency_contact_relationship = 'Relationship is required';
    if (!formData.insurance_provider) newErrors.insurance_provider = 'Insurance provider is required';
    if (!formData.insurance_number.trim()) newErrors.insurance_number = 'Insurance number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }
    setSaving(true);
    const updates = {
      full_name: formData.full_name.trim(),
      date_of_birth: formData.date_of_birth,
      age: calculateAge(formData.date_of_birth),
      gender: formData.gender,
      blood_type: formData.blood_type,
      weight: parseFloat(formData.weight),
      height: parseFloat(formData.height),
      phone: `${formData.country_code} ${formData.phone.trim()}`,
      emergency_contact_name: formData.emergency_contact_name.trim(),
      emergency_contact_phone: `${formData.emergency_contact_country_code} ${formData.emergency_contact_phone.trim()}`,
      emergency_contact_relationship: formData.emergency_contact_relationship.trim(),
      insurance_provider: formData.insurance_provider,
      insurance_number: formData.insurance_number.trim(),
      organ_donor: formData.organ_donor,
    };
    const success = await onSave(updates);
    setSaving(false);
    if (success) {
      onClose();
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && onUploadAvatar) {
        setUploadingImage(true);
        const { error } = await onUploadAvatar(result.assets[0].uri);
        setUploadingImage(false);
        if (error) {
          Alert.alert('Upload Failed', error);
        } else {
          setAvatarKey(Date.now());
        }
      }
    } catch (_error) {
      setUploadingImage(false);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const DropdownSelect = ({ label, value, options, onSelect, error, showDropdown, setShowDropdown }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <TouchableOpacity
        style={[styles.dropdownButton, error && styles.inputError]}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={[styles.dropdownButtonText, !value && styles.placeholderText]}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
        <MaterialCommunityIcons
          name={showDropdown ? "chevron-up" : "chevron-down"}
          size={24}
          color="#7f8c8d"
        />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {showDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(option);
                  setShowDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
                {value === option && (
                  <MaterialCommunityIcons name="check" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

    return (
    <Modal visible={visible} transparent animationType="slide">
      <LinearGradient colors={['#0f1419', '#1a252f']} style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color="#ecf0f1" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.formContainer}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Avatar Section */}
              <View style={styles.avatarSection}>
                <View style={styles.avatarWrapper}>
                  <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handlePickImage}
                    disabled={uploadingImage}
                  >
                    {profile?.avatar_url ? (
                      <Image 
                        source={{ uri: `${profile.avatar_url}?t=${avatarKey}` }} 
                        style={styles.avatarImage}
                        key={avatarKey}
                      />
                    ) : (
                      <MaterialCommunityIcons name="account" size={60} color="#3498db" />
                    )}
                    {uploadingImage && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.editAvatarBadge}>
                    <MaterialCommunityIcons name="camera" size={16} color="#ffffff" />
                  </View>
                </View>
                <Text style={styles.avatarHint}>Tap to change photo</Text>
              </View>
              {/* Personal Information */}
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.full_name && styles.inputError]}
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  placeholder="Enter your full name"
                  placeholderTextColor="#7f8c8d"
                  blurOnSubmit={false}
                />
                {errors.full_name && <Text style={styles.errorText}>{errors.full_name}</Text>}
              </View>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
                  {Platform.OS === 'web' ? (
                    <TextInput
                      style={[styles.input, errors.date_of_birth && styles.inputError, { color: '#ecf0f1' }]}
                      value={formData.date_of_birth}
                      onChangeText={(text) => setFormData({ ...formData, date_of_birth: text })}
                      type="date"
                    />
                  ) : (
                    <TouchableOpacity
                      style={[styles.input, styles.dateButton, errors.date_of_birth && styles.inputError]}
                      onPress={() => setShowDobPicker(true)}
                    >
                      <Text style={formData.date_of_birth ? styles.dateText : styles.datePlaceholder}>
                        {formData.date_of_birth || 'Select DOB'}
                      </Text>
                      <MaterialCommunityIcons name="calendar" size={20} color="#7f8c8d" />
                    </TouchableOpacity>
                  )}
                  {errors.date_of_birth && <Text style={styles.errorText}>{errors.date_of_birth}</Text>}
                  {formData.date_of_birth ? (
                    <Text style={styles.ageCalculated}>Age: {calculateAge(formData.date_of_birth)} years</Text>
                  ) : null}
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Weight (kg) <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, errors.weight && styles.inputError]}
                    value={formData.weight || ''}
                    onChangeText={(text) => setFormData({ ...formData, weight: (text || '').replace(/[^0-9.]/g, '') })}
                    placeholder="Weight"
                    placeholderTextColor="#7f8c8d"
                    keyboardType="decimal-pad"
                    blurOnSubmit={false}
                  />
                  {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Height (cm) <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.height && styles.inputError]}
                  value={formData.height || ''}
                  onChangeText={(text) => setFormData({ ...formData, height: (text || '').replace(/[^0-9.]/g, '') })}
                  placeholder="Height in centimeters"
                  placeholderTextColor="#7f8c8d"
                  keyboardType="decimal-pad"
                  blurOnSubmit={false}
                />
                {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
              </View>
              <DropdownSelect
                label="Gender"
                value={formData.gender}
                options={GENDER_OPTIONS}
                onSelect={(value) => setFormData({ ...formData, gender: value })}
                error={errors.gender}
                showDropdown={showGenderDropdown}
                setShowDropdown={setShowGenderDropdown}
              />
              <DropdownSelect
                label="Blood Type"
                value={formData.blood_type}
                options={BLOOD_TYPE_OPTIONS}
                onSelect={(value) => setFormData({ ...formData, blood_type: value })}
                error={errors.blood_type}
                showDropdown={showBloodTypeDropdown}
                setShowDropdown={setShowBloodTypeDropdown}
              />
              {/* Phone Number - Inline */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Phone Number <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    ref={countryCodeRef}
                    style={styles.countryCodeInput}
                    value={formData.country_code}
                    onChangeText={text => setFormData(prev => ({ ...prev, country_code: (text || '').replace(/[^+\d]/g, '') }))}
                    placeholder="+91"
                    placeholderTextColor="#7f8c8d"
                    keyboardType="phone-pad"
                    blurOnSubmit={false}
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                  />
                  <TextInput
                    ref={phoneRef}
                    style={[styles.phoneInput, errors.phone && styles.inputError]}
                    value={formData.phone}
                    onChangeText={text => setFormData(prev => ({ ...prev, phone: (text || '').replace(/[^0-9]/g, '') }))}
                    placeholder="Phone number"
                    placeholderTextColor="#7f8c8d"
                    keyboardType="phone-pad"
                    blurOnSubmit={false}
                    autoCorrect={false}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>
              {/* Emergency Contact */}
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.emergency_contact_name && styles.inputError]}
                  value={formData.emergency_contact_name}
                  onChangeText={(text) => setFormData({ ...formData, emergency_contact_name: text })}
                  placeholder="Emergency contact name"
                  placeholderTextColor="#7f8c8d"
                  blurOnSubmit={false}
                />
                {errors.emergency_contact_name && <Text style={styles.errorText}>{errors.emergency_contact_name}</Text>}
              </View>
              {/* Emergency Contact Phone - Inline */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Contact Phone <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.phoneInputContainer}>
                  <TextInput
                    ref={emergencyCountryCodeRef}
                    style={styles.countryCodeInput}
                    value={formData.emergency_contact_country_code}
                    onChangeText={text => setFormData(prev => ({ ...prev, emergency_contact_country_code: (text || '').replace(/[^+\d]/g, '') }))}
                    placeholder="+91"
                    placeholderTextColor="#7f8c8d"
                    keyboardType="phone-pad"
                    blurOnSubmit={false}
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => emergencyPhoneRef.current?.focus()}
                  />
                  <TextInput
                    ref={emergencyPhoneRef}
                    style={[styles.phoneInput, errors.emergency_contact_phone && styles.inputError]}
                    value={formData.emergency_contact_phone}
                    onChangeText={text => setFormData(prev => ({ ...prev, emergency_contact_phone: (text || '').replace(/[^0-9]/g, '') }))}
                    placeholder="Phone number"
                    placeholderTextColor="#7f8c8d"
                    keyboardType="phone-pad"
                    blurOnSubmit={false}
                    autoCorrect={false}
                  />
                </View>
                {errors.emergency_contact_phone && <Text style={styles.errorText}>{errors.emergency_contact_phone}</Text>}
              </View>
              <DropdownSelect
                label="Relationship"
                value={formData.emergency_contact_relationship}
                options={RELATIONSHIP_OPTIONS}
                onSelect={(value) => setFormData({ ...formData, emergency_contact_relationship: value })}
                error={errors.emergency_contact_relationship}
                showDropdown={showRelationshipDropdown}
                setShowDropdown={setShowRelationshipDropdown}
              />
              {/* Insurance */}
              <Text style={styles.sectionTitle}>Insurance Information</Text>
              <DropdownSelect
                label="Insurance Provider"
                value={formData.insurance_provider}
                options={INSURANCE_PROVIDERS}
                onSelect={(value) => setFormData({ ...formData, insurance_provider: value })}
                error={errors.insurance_provider}
                showDropdown={showInsuranceDropdown}
                setShowDropdown={setShowInsuranceDropdown}
              />
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Insurance/Policy Number <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, errors.insurance_number && styles.inputError]}
                  value={formData.insurance_number}
                  onChangeText={(text) => setFormData({ ...formData, insurance_number: text })}
                  placeholder="Policy number"
                  placeholderTextColor="#7f8c8d"
                  blurOnSubmit={false}
                />
                {errors.insurance_number && <Text style={styles.errorText}>{errors.insurance_number}</Text>}
              </View>
              {/* Organ Donor */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, organ_donor: !formData.organ_donor })}
              >
                <MaterialCommunityIcons
                  name={formData.organ_donor ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={24}
                  color="#3498db"
                />
                <Text style={styles.checkboxLabel}>I am an organ donor</Text>
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
            {showDobPicker && (
              Platform.OS === 'ios' ? (
                <Modal transparent visible={showDobPicker} animationType="fade">
                  <TouchableOpacity 
                    style={styles.datePickerOverlay} 
                    activeOpacity={1} 
                    onPress={() => setShowDobPicker(false)}
                  >
                    <View style={styles.datePickerContainer}>
                      <View style={styles.datePickerHeader}>
                        <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                          <Text style={styles.datePickerDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date(new Date().setFullYear(new Date().getFullYear() - 25))}
                        mode="date"
                        display="spinner"
                        maximumDate={new Date()}
                        minimumDate={new Date(1900, 0, 1)}
                        onChange={(e, d) => { if (d) setFormData(prev => ({ ...prev, date_of_birth: toDBDate(d) })); }}
                        textColor="#ecf0f1"
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              ) : (
                <DateTimePicker
                  value={formData.date_of_birth ? new Date(formData.date_of_birth + 'T12:00:00') : new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  onChange={onDobChange}
                />
              )
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
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
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#ecf0f1' },
  formContainer: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3498db',
    marginTop: 10,
    marginBottom: 15,
  },
  inputGroup: { marginBottom: 15 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#bdc3c7',
    marginBottom: 8,
  },
  required: { color: '#e74c3c', fontSize: 14 },
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
  inputError: { borderColor: '#e74c3c', borderWidth: 1 },
  errorText: { color: '#e74c3c', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row' },
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
  dropdownButtonText: { fontSize: 16, color: '#ecf0f1' },
  placeholderText: { color: '#7f8c8d' },
  dropdownList: {
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#34495e',
  },
  dropdownScroll: { maxHeight: 200 },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  dropdownItemText: { fontSize: 14, color: '#ecf0f1' },
  phoneInputContainer: { flexDirection: 'row', gap: 10 },
  countryCodeInput: {
    backgroundColor: '#2c3e50',
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
    backgroundColor: '#2c3e50',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ecf0f1',
    borderWidth: 1,
    borderColor: '#34495e',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#ecf0f1',
    marginLeft: 10,
    fontWeight: '600',
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
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%' },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3498db',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a252f',
  },
  avatarHint: { marginTop: 8, fontSize: 12, color: '#7f8c8d' },
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
  ageCalculated: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 5,
    fontWeight: '600',
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