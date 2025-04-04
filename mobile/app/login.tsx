import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ImageBackground,
  Dimensions,
  StyleProp,
  TextStyle,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { EhgezliButton } from '../components/EhgezliButton';
import Colors from '../constants/Colors';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Define the style types
type Styles = {
  container: ViewStyle;
  webContainer: ViewStyle;
  mobileContainer: ViewStyle;
  scrollContainer: ViewStyle;
  formSection: ViewStyle;
  imageSection: ViewStyle;
  imageContainer: ViewStyle;
  imageOverlay: ViewStyle;
  logoOnImage: TextStyle;
  taglineOnImage: TextStyle;
  header: ViewStyle;
  logo: TextStyle;
  tagline: TextStyle;
  formContainer: ViewStyle;
  tabs: ViewStyle;
  tab: ViewStyle;
  activeTab: ViewStyle;
  tabText: TextStyle;
  activeTabText: TextStyle;
  form: ViewStyle;
  welcomeText: TextStyle;
  subtitle: TextStyle;
  nameRow: ViewStyle;
  nameField: ViewStyle;
  label: TextStyle;
  input: TextStyle;
  button: ViewStyle;
  errorText: TextStyle;
  forgotPassword: ViewStyle;
  forgotPasswordText: TextStyle;
  imageBackground: ViewStyle;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const { login, register, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      console.log('Login form submitted with:', { email, password, isLogin });
      
      if (isLogin) {
        console.log('Attempting to login...');
        await login(email, password);
        console.log('Login successful');
      } else {
        if (!firstName || !lastName) {
          Alert.alert('Error', 'Please fill in all required fields');
          return;
        }
        console.log('Attempting to register...');
        await register({ firstName, lastName, email, password });
        console.log('Registration successful');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Error is already handled in the auth context
    }
  };

  const toggleMode = (mode: 'login' | 'register' | 'restaurant') => {
    clearError();
    setIsLogin(mode === 'login');
  };

  return (
    <View style={styles.container}>
      {isWeb ? (
        // Web layout - side by side
        <View style={styles.webContainer}>
          <View style={styles.formSection}>
            <View style={styles.formContainer}>
              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, isLogin ? styles.activeTab : null]} 
                  onPress={() => toggleMode('login')}
                >
                  <Text style={[styles.tabText, isLogin ? styles.activeTabText : null]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, !isLogin ? styles.activeTab : null]} 
                  onPress={() => toggleMode('register')}
                >
                  <Text style={[styles.tabText, !isLogin ? styles.activeTabText : null]}>Register</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab}>
                  <Text style={styles.tabText}>Restaurant</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.form}>
                <Text style={styles.welcomeText}>
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </Text>
                <Text style={styles.subtitle}>
                  {isLogin 
                    ? 'Login to manage your restaurant reservations' 
                    : 'Sign up to start booking restaurant reservations'}
                </Text>
                
                {!isLogin && (
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <Text style={styles.label}>First Name</Text>
                      <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                      />
                    </View>
                    
                    <View style={styles.nameField}>
                      <Text style={styles.label}>Last Name</Text>
                      <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}
                
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                
                <EhgezliButton
                  title={isLogin ? 'Login' : 'Register'}
                  onPress={handleSubmit}
                  variant="ehgezli"
                  loading={isLoading}
                  style={styles.button}
                />
                
                {isLogin && (
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.imageSection}>
            <View style={styles.imageContainer}>
              <View style={styles.imageOverlay}>
                <Text style={styles.logoOnImage}>Ehgezli</Text>
                <Text style={styles.taglineOnImage}>
                  Your gateway to exceptional dining experiences. Book tables at the finest restaurants with just a few clicks.
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        // Mobile layout - stacked
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.mobileContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <Text style={styles.logo}>Ehgezli</Text>
              <Text style={styles.tagline}>
                Your gateway to exceptional dining experiences.
              </Text>
            </View>
            
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000' }}
              style={styles.imageBackground}
              resizeMode="cover"
            >
              <View style={styles.imageOverlay}>
                <Text style={styles.logoOnImage}>Ehgezli</Text>
                <Text style={styles.taglineOnImage}>
                  Your gateway to exceptional dining experiences. Book tables at the finest restaurants with just a few clicks.
                </Text>
              </View>
            </ImageBackground>
            
            <View style={styles.formContainer}>
              <View style={styles.tabs}>
                <TouchableOpacity 
                  style={[styles.tab, isLogin ? styles.activeTab : null]} 
                  onPress={() => toggleMode('login')}
                >
                  <Text style={[styles.tabText, isLogin ? styles.activeTabText : null]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, !isLogin ? styles.activeTab : null]} 
                  onPress={() => toggleMode('register')}
                >
                  <Text style={[styles.tabText, !isLogin ? styles.activeTabText : null]}>Register</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab}>
                  <Text style={styles.tabText}>Restaurant</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.form}>
                <Text style={styles.welcomeText}>
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </Text>
                <Text style={styles.subtitle}>
                  {isLogin 
                    ? 'Login to manage your restaurant reservations' 
                    : 'Sign up to start booking restaurant reservations'}
                </Text>
                
                {!isLogin && (
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <Text style={styles.label}>First Name</Text>
                      <TextInput
                        style={styles.input}
                        value={firstName}
                        onChangeText={setFirstName}
                        autoCapitalize="words"
                      />
                    </View>
                    
                    <View style={styles.nameField}>
                      <Text style={styles.label}>Last Name</Text>
                      <TextInput
                        style={styles.input}
                        value={lastName}
                        onChangeText={setLastName}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}
                
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                
                {error && <Text style={styles.errorText}>{error}</Text>}
                
                <EhgezliButton
                  title={isLogin ? 'Login' : 'Register'}
                  onPress={handleSubmit}
                  variant="ehgezli"
                  loading={isLoading}
                  style={styles.button}
                />
                
                {isLogin && (
                  <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    height: Platform.OS === 'web' ? ('100vh' as unknown as number) : '100%',
  },
  mobileContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageSection: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#333',
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isWeb ? 40 : 20,
  },
  logoOnImage: {
    fontSize: isWeb ? 48 : 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: isWeb ? 20 : 10,
  },
  taglineOnImage: {
    fontSize: isWeb ? 18 : 14,
    color: '#fff',
    textAlign: 'center',
    lineHeight: isWeb ? 28 : 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
    overflow: 'hidden',
    width: isWeb ? 400 : '100%',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    color: '#666',
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  nameField: {
    width: '48%',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  button: {
    marginTop: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    color: Colors.light.primary,
    fontSize: 14,
  },
  imageBackground: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
});
