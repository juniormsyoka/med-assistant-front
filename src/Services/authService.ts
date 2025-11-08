// src/Services/authService.ts
import { supabase , supabaseAdmin} from '@/Services/supabaseClient';
import { settingsService } from '@/Services/Settings';

export type UserRole = 'patient' | 'doctor' | 'admin' | 'super_admin';

// Proper return type interfaces
interface BaseAuthResponse {
  user: any;
  session: any;
  weakPassword?: any;
}

export interface AuthResponseWithRole extends BaseAuthResponse {
  role: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_verified: boolean;
  hospital_id: string | null;
  created_at: string;
  doctor_id?: string | null;
}

interface SignUpParams {
  email: string;
  password: string;
  fullName?: string;
  invitationToken?: string | null;
}

interface InvitationData {
  role: UserRole;
  hospital_id?: string;
  expires_at: string;
  is_used: boolean;
}

/**
 * Enhanced invitation validation with comprehensive debugging
 */
// In authService.ts - update the validateInvitationToken function

const validateInvitationToken = async (token: string): Promise<{ 
  role: UserRole; 
  hospital_id?: string;
  email?: string;
} | null> => {
  try {
    console.log('🔍 [AUTH] Validating invitation token:', token);
    
    // Use service role client to bypass RLS
    const { data: tokenCheck, error: tokenError } = await supabaseAdmin
      .from('invitations')
      .select('token, role, hospital_id, expires_at, is_used, email')
      .eq('token', token);

    if (tokenError) {
      console.error('❌ [AUTH] Token query error:', tokenError);
      return null;
    }

    console.log('📊 [AUTH] Token check results:', tokenCheck);

    if (!tokenCheck || tokenCheck.length === 0) {
      console.error('❌ [AUTH] Token not found in database');
      return null;
    }

    const invitation = tokenCheck[0];
    console.log('📋 [AUTH] Found invitation:', invitation);

    // Check if invitation is already used
    if (invitation.is_used) {
      console.error('❌ [AUTH] Invitation already used');
      return null;
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt <= now) {
      console.error('❌ [AUTH] Invitation expired:', { expiresAt, now });
      return null;
    }

    // Check if hospital_id is required but missing (for doctors)
    if (invitation.role === 'doctor' && !invitation.hospital_id) {
      console.error('❌ [AUTH] Hospital ID is required for doctor invitations but is missing');
      return null;
    }

    console.log('✅ [AUTH] Invitation validation successful');
    return {
      role: invitation.role,
      hospital_id: invitation.hospital_id,
      email: invitation.email
    };
    
  } catch (error) {
    console.error('❌ [AUTH] Error validating invitation token:', error);
    return null;
  }
};

export const markInvitationUsed = async (token: string): Promise<void> => {
  console.log('📝 [AUTH] Marking invitation as used:', token);
  
  const { error } = await supabase
    .from('invitations')
    .update({ 
      is_used: true, 
      used_at: new Date().toISOString()
    })
    .eq('token', token);
    
  if (error) {
    console.error('❌ [AUTH] Error marking invitation as used:', error);
    throw error;
  }
  
  console.log('✅ [AUTH] Invitation token marked as used');
};


export const createPublicUserRecord = async (userData: {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  hospital_id?: string | null;
}): Promise<any> => {
  console.log('📝 [AUTH] Creating public user record:', userData);
  
  // Use service role to bypass RLS for user creation
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([
      {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name || '',
        role: userData.role,
        hospital_id: userData.hospital_id,
        is_verified: false,
        created_at: new Date().toISOString(),
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('❌ [AUTH] Error creating public user record:', error);
    throw error;
  }
  
  console.log('✅ [AUTH] Public user record created successfully:', data);
  return data;
};

export const signUpUserWithInvitation = async ({
  email,
  password,
  fullName,
  invitationToken,
}: SignUpParams): Promise<any> => {
  console.log('🚀 [AUTH] Starting doctor signup with invitation...', { 
    email, 
    invitationToken,
    timestamp: new Date().toISOString() 
  });
  
  try {
    if (!invitationToken) {
      const error = new Error('Invitation token is required for doctor signup');
      console.error('❌ [AUTH]', error.message);
      throw error;
    }

    // Validate the invitation token
    console.log('🔍 [AUTH] Validating invitation token...');
    const invitation = await validateInvitationToken(invitationToken);
    console.log('📋 [AUTH] Invitation validation result:', invitation);
    
    if (!invitation) {
      const error = new Error('Invalid or expired invitation token');
      console.error('❌ [AUTH]', error.message);
      throw error;
    }

    if (invitation.role !== 'doctor') {
      const error = new Error('This invitation is not for a doctor role');
      console.error('❌ [AUTH]', error.message);
      throw error;
    }

    console.log('✅ [AUTH] Invitation validated, creating auth user...');

    // Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName ?? '',
          role: 'doctor',
          hospital_id: invitation.hospital_id || null,
          emailRedirectTo: 'medassistant://login-callback'
        },
      },
    });

    console.log('📨 [AUTH] Supabase auth response:', { 
      user: data?.user?.id, 
      session: !!data?.session,
      error: authError 
    });

    if (authError) {
      console.error('❌ [AUTH] Auth signup error:', authError);
      throw authError;
    }

    if (!data.user) {
      const error = new Error('User creation failed - no user data returned');
      console.error('❌ [AUTH]', error.message);
      throw error;
    }

    console.log('✅ [AUTH] Auth user created:', data.user.id);

    // Create public user record
    try {
      await createPublicUserRecord({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        role: 'doctor',
        hospital_id: invitation.hospital_id
      });
      console.log('✅ [AUTH] Public user record created successfully');
    } catch (publicError) {
      console.error('❌ [AUTH] Failed to create public user record:', publicError);
      // Don't throw here - the auth user was created successfully
      // The admin can manually create the public record if needed
    }

    // Mark invitation as used
    try {
      await markInvitationUsed(invitationToken);
      console.log('✅ [AUTH] Invitation marked as used');
    } catch (inviteError) {
      console.error('⚠️ [AUTH] Failed to mark invitation as used:', inviteError);
      // Don't throw - the user was created successfully
    }

    console.log('🎉 [AUTH] Doctor signup completed successfully!');
    return data;
    
  } catch (error) {
    console.error('💥 [AUTH] Doctor signup failed completely:', error);
    throw error;
  }
};

/**
 * Patient signup with logging
 */
export const signUpUser = async ({
  email,
  password,
  fullName,
}: SignUpParams): Promise<any> => {
  console.log('🚀 [AUTH] Starting patient signup...', { email });
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName ?? '',
          role: 'patient',
          hospital_id: null,
          emailRedirectTo: 'medassistant://login-callback'
        },
      },
    });

    if (error) {
      console.error('❌ [AUTH] Patient auth signup error:', error);
      throw error;
    }

    console.log('📨 [AUTH] Patient auth response:', { 
      user: data?.user?.id, 
      session: !!data?.session 
    });

    // Create public user record for patients too
    if (data.user) {
      try {
        await createPublicUserRecord({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName,
          role: 'patient',
          hospital_id: null
        });
        console.log('✅ [AUTH] Public user record created for patient');
      } catch (publicError) {
        console.error('❌ [AUTH] Failed to create public user record for patient:', publicError);
      }
    }

    return data;
  } catch (error) {
    console.error('💥 [AUTH] Patient signup failed:', error);
    throw error;
  }
};

/**
 * Logs in a user with role information
 */
export const signInUser = async (email: string, password: string): Promise<AuthResponseWithRole> => {
  try {
    console.log('🔐 [AUTH] Attempting sign in for:', email);
    
    // First, sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error('❌ [AUTH] Auth error:', error);
      throw error;
    }
    
    if (!data.user) {
      const error = new Error('No user data returned from authentication');
      console.error('❌ [AUTH]', error.message);
      throw error;
    }

    console.log('✅ [AUTH] User authenticated:', data.user.id);
    
    try {
      // Initialize settings service which will handle profile sync
      await settingsService.initialize();
      
      // Force sync with Supabase to ensure profile is created/updated
      await settingsService.syncWithSupabase();
      
      // Get the final user profile with role
      const finalProfile = await fetchUserProfile();
      
      // Ensure the role is a valid UserRole
      const validRole: UserRole = isValidUserRole(finalProfile.role) 
        ? finalProfile.role 
        : 'patient'; // default fallback
      
      console.log('👤 [AUTH] User role determined:', validRole);
      
      return {
        ...data,
        role: validRole
      };
      
    } catch (profileError) {
      console.error('❌ [AUTH] Profile setup error:', profileError);
      // Use a safe default role
      return {
        ...data,
        role: 'patient' as UserRole
      };
    }
    
  } catch (error) {
    console.error('💥 [AUTH] Sign in process failed:', error);
    throw error;
  }
};

// Helper function to validate UserRole
const isValidUserRole = (role: string): role is UserRole => {
  return ['patient', 'doctor', 'admin', 'super_admin'].includes(role);
};

/**
 * Logs out the current session
 */
export const signOutUser = async (): Promise<void> => {
  console.log('🚪 [AUTH] Signing out user');
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('❌ [AUTH] Sign out error:', error);
    throw error;
  }
  console.log('✅ [AUTH] User signed out successfully');
};

/**
 * Fetches the logged-in user's profile from public.users
 */
export const fetchUserProfile = async (): Promise<UserProfile> => {
  console.log('📋 [AUTH] Fetching user profile');
  
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ [AUTH] No user session found:', authError);
    throw authError || new Error('No user session found');
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role, email, is_verified, hospital_id, doctor_id, created_at')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('❌ [AUTH] Error fetching user profile:', error);
    throw error;
  }
  
  console.log('✅ [AUTH] User profile fetched:', data);
  
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role as UserRole,
    is_verified: data.is_verified,
    hospital_id: data.hospital_id,
    doctor_id: data.doctor_id,
    created_at: data.created_at
  };
};

/**
 * Gets the current user's role
 */
export const getUserRole = async (): Promise<UserRole> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw authError || new Error('No user session found');
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  
  return data.role as UserRole;
};

/**
 * Updates user profile information
 */
export const updateUserProfile = async (updates: {
  full_name?: string;
  hospital_id?: string;
  doctor_id?: string;
}): Promise<any> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) throw new Error('No user session found');

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Resets user password
 */
export const resetPassword = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'medassistant://reset-password',
  });
  
  if (error) throw error;
};

/**
 * Updates user password (must be authenticated)
 */
export const updatePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  if (error) throw error;
};

/**
 * Gets the current session
 */
export const getCurrentSession = async (): Promise<any> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

/**
 * Refreshes the current session
 */
export const refreshSession = async (): Promise<any> => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data.session;
};

/**
 * Gets the current authenticated user
 */
export const getCurrentUser = async (): Promise<any> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  
  if (error) throw error;
  return user;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const session = await getCurrentSession();
    return !!session;
  } catch (error) {
    return false;
  }
};

/**
 * Get user profile with role - combined function for convenience
 */
export const getCurrentUserWithProfile = async (): Promise<{
  authUser: any;
  profile: UserProfile;
}> => {
  const authUser = await getCurrentUser();
  const profile = await fetchUserProfile();
  
  return {
    authUser,
    profile
  };
};

/**
 * Verify email address
 */
export const verifyEmail = async (): Promise<void> => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: (await getCurrentUser())?.email,
  });
  
  if (error) throw error;
};

/**
 * Update email address
 */
export const updateEmail = async (newEmail: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    email: newEmail
  });
  
  if (error) throw error;
};

/**
 * Resend email verification
 */
export const resendVerificationEmail = async (email: string): Promise<void> => {
  console.log('📧 [AUTH] Resending verification email to:', email);
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: 'medassistant://login-callback'
    }
  });
  
  if (error) {
    console.error('❌ [AUTH] Error resending verification email:', error);
    throw error;
  }
  
  console.log('✅ [AUTH] Verification email resent successfully');
};

/**
 * Resend magic link for passwordless login
 */
export const resendMagicLink = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'medassistant://login-callback'
    }
  });
  
  if (error) throw error;
};

/**
 * Resend confirmation email
 */
export const resendConfirmationEmail = async (email: string): Promise<void> => {
  console.log('📧 [AUTH] Resending confirmation email to:', email);
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: {
      emailRedirectTo: 'medassistant://login-callback'
    }
  });
  
  if (error) {
    console.error('❌ [AUTH] Error resending confirmation:', error);
    throw error;
  }
  
  console.log('✅ [AUTH] Confirmation email resent successfully');
};

// Debug function to check user existence
export const checkUserExists = async (email: string) => {
  console.log('👤 [AUTH] Checking if user exists:', email);
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, is_verified')
    .eq('email', email)
    .single();
  
  console.log('📊 [AUTH] User existence check result:', { data, error });
  return { exists: !!data, data, error };
};