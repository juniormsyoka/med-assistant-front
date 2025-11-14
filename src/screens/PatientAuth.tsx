// src/screens/PatientAuthScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { supabase } from '@/Services/supabaseClient';
import { signUpUser, signInUser, signUpUserWithInvitation, checkUserExists } from '@/Services/authService';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { useRoleNavigation } from '@/hooks/useRoleNavigation';
import { resendVerificationEmail } from '@/Services/authService';

import { toast } from '../Services/toastService';

type UserRole = 'super_admin' | 'admin' | 'doctor' | 'patient';

export default function PatientAuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [loading, setLoading] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [isDoctorSignup, setIsDoctorSignup] = useState(false);
  const [invitationToken, setInvitationToken] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const navigation = useNavigation();
  const { navigateByRole } = useRoleNavigation();

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;

      console.log('🔗 [AUTH] Handling URL:', url);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ [AUTH] Error fetching session after link:', error);
      } else if (session) {
        console.log('✅ [AUTH] Email verified, session created');
        Alert.alert('Email Verified', 'Your email is confirmed! You are now logged in.');
        await navigateByRole();
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));

    return () => subscription.remove();
  }, []);

  const handleSubmit = async () => {
    console.log('🎯 [UI] Form submitted:', { 
      mode, 
      email, 
      isDoctorSignup, 
      invitationToken: invitationToken ? '***' : 'empty',
      timestamp: new Date().toISOString()
    });

    if (!email || !password || (mode === 'signup' && !fullName)) {
      toast.error('Please fill all required fields.');
      return;
    }

    // Validate doctor signup
    if (mode === 'signup' && isDoctorSignup && !invitationToken) {
      toast.error('Please enter your invitation token to sign up as a doctor.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        if (isDoctorSignup) {
         // console.log('👨‍⚕️ [UI] Starting doctor signup process...');
          
          // Doctor signup with invitation token
          const result = await signUpUserWithInvitation({ 
            email, 
            password, 
            fullName, 
            invitationToken 
          });
          
          console.log('📨 [UI] Doctor signup result:', {
            user: result?.user?.id,
            session: !!result?.session
          });

          // SIMPLIFIED: Just show success message for doctors
          toast.success(
            'Your doctor account has been created successfully. Please wait for admin verification before you can access the system.'
          );
          
        } else {
          // Regular patient signup (keep email confirmation for patients)
          console.log('👤 [UI] Starting patient signup process...');
          const result = await signUpUser({ email, password, fullName });
          
        /*  console.log('📨 [UI] Patient signup result:', {
            user: result?.user?.id,
            session: !!result?.session,
            emailConfirmed: result?.user?.email_confirmed_at
          });*/

          if (result.user && !result.session) {
            toast.info(
              'Check Your Email confirmation link has been sent. Please verify your email before logging in.'
            );
            setShowResendOption(true);
          } else {
            toast.success(
              'Account Created successfully!',
            );
          }
        }
      } else {
        // Login (same for both)
      //  console.log('🔐 [UI] Starting login process...');
        const result = await signInUser(email, password);
     /*   console.log('✅ [UI] Login successful:', {
          role: result.role,
          email: result.user.email
        });*/
        await navigateByRole();
        const roleMessage = getRoleWelcomeMessage(result.role);
        toast.success(roleMessage);
        
        
      }
    } catch (err: any) {
      console.error('💥 [UI] Auth error:', err);
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRoleWelcomeMessage = (role: UserRole): string => {
    switch (role) {
      case 'super_admin':
        return 'Welcome Super Admin! Full system access granted.';
      case 'admin':
        return 'Welcome Admin! Hospital management dashboard ready.';
      case 'doctor':
        return 'Welcome Doctor! Patient management tools available.';
      case 'patient':
        return 'Welcome! Your health dashboard is ready.';
      default:
        return 'You are logged in!';
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Please enter your email to resend confirmation.');
      return;
    }

    setLoading(true);
    try {
      await resendVerificationEmail(email);
      toast.success('A new confirmation link has been sent to your email.');
      setShowResendOption(false);
    } catch (err: any) {
      console.error('❌ [UI] Resend email error:', err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugCheck = async () => {
    if (!email) {
      toast.info('Please enter an email first');
      return;
    }

    console.log('🐛 [DEBUG] Checking user existence for:', email);
    const result = await checkUserExists(email);
    toast.info(`User exists: ${result.exists}\nRole: ${result.data?.role}\nVerified: ${result.data?.is_verified}`);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: "white" }}>
        {mode === 'signup' 
          ? (isDoctorSignup ? 'Doctor Sign Up' : 'Patient Sign Up') 
          : 'Login'
        }
      </Text>

      {mode === 'signup' && (
        <>
          <TextInput
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              padding: 10,
              borderRadius: 8,
              marginBottom: 15,
              backgroundColor: 'white'
            }}
          />

          {/* Doctor Signup Toggle */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 15,
            padding: 12,
            backgroundColor: 'white',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#ccc'
          }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>
              Sign up as Doctor
            </Text>
            <Switch
              value={isDoctorSignup}
              onValueChange={setIsDoctorSignup}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isDoctorSignup ? '#4361EE' : '#f4f3f4'}
            />
          </View>

          {/* Invitation Token Input (only for doctors) */}
          {isDoctorSignup && (
            <TextInput
              placeholder="Enter invitation token"
              value={invitationToken}
              onChangeText={setInvitationToken}
              style={{
                borderWidth: 1,
                borderColor: '#4361EE',
                padding: 10,
                borderRadius: 8,
                marginBottom: 15,
                backgroundColor: 'white'
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        </>
      )}

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 8,
          marginBottom: 15,
          backgroundColor: 'white'
        }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          borderRadius: 8,
          marginBottom: 15,
          backgroundColor: 'white'
        }}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        style={{
          backgroundColor: isDoctorSignup ? '#4361EE' : '#4CAF50',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 15,
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            {mode === 'signup' 
              ? (isDoctorSignup ? 'Create Doctor Account' : 'Sign Up') 
              : 'Login'
            }
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          console.log('🔄 [UI] Switching mode from', mode, 'to', mode === 'signup' ? 'login' : 'signup');
          setMode(mode === 'signup' ? 'login' : 'signup');
          setIsDoctorSignup(false); // Reset doctor mode when switching
          setInvitationToken(''); // Clear token
          setShowResendOption(false); // Reset resend option
        }}
        style={{ alignItems: 'center', marginBottom: 15 }}
      >
        <Text style={{ color: '#007BFF' }}>
          {mode === 'signup'
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>

      {/* Debug Section */}
      <TouchableOpacity
        onPress={() => setDebugMode(!debugMode)}
        style={{ alignItems: 'center', marginBottom: 10 }}
      >
        <Text style={{ color: '#666', fontSize: 12 }}>
          {debugMode ? '▼ Debug' : '▶ Debug'}
        </Text>
      </TouchableOpacity>

      {debugMode && (
        <View style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, marginBottom: 15 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Debug Tools:</Text>
          <TouchableOpacity
            onPress={handleDebugCheck}
            style={{ backgroundColor: '#666', padding: 8, borderRadius: 4, marginBottom: 5 }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>Check User Existence</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Mode: {mode} | Doctor: {isDoctorSignup.toString()} | Token: {invitationToken ? '***' : 'empty'}
          </Text>
        </View>
      )}

      {mode === 'signup' && !isDoctorSignup && (
        <Text style={{ marginTop: 20, textAlign: 'center', color: '#555' }}>
          You are signing up as a **patient**. This is your safe space to communicate with
          your doctors and manage your health records.
        </Text>
      )}

      {mode === 'signup' && isDoctorSignup && (
        <Text style={{ marginTop: 20, textAlign: 'center', color: '#4361EE' }}>
          You are signing up as a **doctor**. Please use the invitation token sent by your hospital administrator.
        </Text>
      )}

      {/* Only show resend option for PATIENTS, not doctors */}
      {showResendOption && mode === 'signup' && !isDoctorSignup && (
        <TouchableOpacity
          onPress={handleResendEmail}
          style={{
            backgroundColor: '#FFA000',
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 15,
          }}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            Resend Verification Email
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}