import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';

const { width, height } = Dimensions.get('window');

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
      router.replace('/home');
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Sign In Error', error.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignUp = () => {
    router.push('/signup');
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
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
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>VitalFlow</Text>
              <Text style={styles.subtitle}>Monitor your health, protect your future</Text>
            </View>

            <View style={styles.formContainer}>
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

              <TouchableOpacity 
                style={[styles.signInButton, isLoading && styles.disabledButton]}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isLoading ? ['#6C757D', '#495057'] : ['#28a745', '#20c997']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.signInButtonText}>
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{"Don't have an account? "}</Text>
              <TouchableOpacity onPress={navigateToSignUp} activeOpacity={0.7}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
    paddingTop: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 35,
    padding: 40,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 15,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
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
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingRight: 55,
    fontSize: 16,
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
    right: 15,
    padding: 10,
    zIndex: 1,
  },
  eyeIconText: {
    fontSize: 14,
    color: '#2a5298',
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 22,
    marginBottom: 20,
    shadowColor: '#28a745',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  disabledButton: {
    shadowOpacity: 0.1,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
  },
  forgotPassword: {
    color: '#2a5298',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  signUpLink: {
    fontSize: 16,
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
