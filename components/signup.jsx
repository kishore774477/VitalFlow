import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

const { width, height } = Dimensions.get('window');

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, name);
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', error.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignIn = () => {
    router.push('/signin');
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const toggleConfirmPasswordVisibility = () => {
    setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f1419', '#1a252f', '#2c3e50']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Background Shapes */}
        <View style={styles.backgroundShapes}>
          <View style={[styles.shape, styles.shape1]} />
          <View style={[styles.shape, styles.shape2]} />
          <View style={[styles.shape, styles.shape3]} />
          <View style={[styles.shape, styles.shape4]} />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>VitalFlow</Text>
                <Text style={styles.subtitle}>Create your account and start monitoring your health</Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#8E8E93"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#8E8E93"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#8E8E93"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!isPasswordVisible}
                      autoCorrect={false}
                    />
                    <TouchableOpacity 
                      style={styles.eyeIcon}
                      onPress={togglePasswordVisibility}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eyeIconText}>
                        {isPasswordVisible ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirm your password"
                      placeholderTextColor="#8E8E93"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!isConfirmPasswordVisible}
                      autoCorrect={false}
                    />
                    <TouchableOpacity 
                      style={styles.eyeIcon}
                      onPress={toggleConfirmPasswordVisibility}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.eyeIconText}>
                        {isConfirmPasswordVisible ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.signUpButton, isLoading && styles.disabledButton]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isLoading ? ['#6C757D', '#495057'] : ['#28a745', '#20c997']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.signUpButtonText}>
                      {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={navigateToSignIn} activeOpacity={0.7}>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
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
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 30,
    padding: 28,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2C3E50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  passwordInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingRight: 70,
    fontSize: 15,
    color: '#2C3E50',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  eyeIconText: {
    fontSize: 13,
    color: '#2a5298',
    fontWeight: '600',
  },
  signUpButton: {
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  disabledButton: {
    shadowOpacity: 0.1,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
  },
  footerText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  signInLink: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backgroundShapes: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  shape: {
    position: 'absolute',
    borderRadius: 100,
  },
  shape1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    top: -50,
    right: -50,
    borderRadius: 100,
  },
  shape2: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
    bottom: 100,
    left: -30,
    borderRadius: 75,
  },
  shape3: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(155, 89, 182, 0.06)',
    top: height * 0.3,
    left: width * 0.8,
    borderRadius: 60,
  },
  shape4: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(241, 196, 15, 0.05)',
    bottom: height * 0.4,
    right: width * 0.8,
    borderRadius: 90,
    transform: [{ rotate: '45deg' }],
  },
});