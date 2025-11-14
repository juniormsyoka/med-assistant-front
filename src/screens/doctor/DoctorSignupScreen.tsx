import { supabase } from '@/Services/supabaseClient';
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { signUpUser } from '@/Services/authService'; 
//import { StackScreenProps } from '@react-navigation/stack';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { markInvitationUsed } from '@/Services/authService';
import {toast} from '../../Services/toastService';

type RootStackParamList = {
  DoctorSignup: { token: string }; // or { someParam: string }
    Login: undefined;
};

type DoctorSignupProps = NativeStackScreenProps<RootStackParamList, 'DoctorSignup'>;

//export default function DoctorSignupScreen({ route, navigation }: DoctorSignupProps) {
export default function DoctorSignupScreen({ route, navigation }: DoctorSignupProps) {
  const { token } = route.params || {};
  const [validInvite, setValidInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const checkInvite = async () => {
      const { data, error } = await supabase
        .from('doctor_invitations')
        .select('email')
        .eq('token', token)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error('Invalid or expired invite');
      } else {
        setValidInvite(true);
        setEmail(data.email);
      }
    };

    checkInvite();
  }, [token]);

const handleSignUp = async () => {
  try {
    // Use invitation token instead of role parameter
    await signUpUser({ 
      email, 
      password, 
      fullName, 
      invitationToken: token 
    });
    
    await markInvitationUsed(token);
    toast.info('Account created succesfully! Await admin verification.');
    navigation.navigate('Login' as never);
  } catch (err: any) {
    toast.error( err.message);
  }
};

  if (!validInvite) return <Text>Checking invite...</Text>;

  return (
    <View style={{ padding: 20 }}>
      <Text>Email: {email}</Text>
      <TextInput placeholder="Full Name" value={fullName} onChangeText={setFullName} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Create Doctor Account" onPress={handleSignUp} />
    </View>
  );
}
