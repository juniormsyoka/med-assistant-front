import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "@/Services/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

//
// ✅ Define typed navigation params for this screen
//
export type DoctorInviteSignupParamList = {
  DoctorInviteSignup: {
    invitationToken: string;
    hospitalId: string;
    hospitalName: string;
  };
};

type Props = NativeStackScreenProps<
  DoctorInviteSignupParamList,
  "DoctorInviteSignup"
>;

interface InvitationData {
  hospital_id: string;
  email: string;
  specialization: string;
  is_used: boolean;
  expires_at: string;
}

//
// ✅ Component
//
export default function DoctorInviteSignup({ route, navigation }: Props) {
  const { invitationToken, hospitalId, hospitalName } = route.params;

  const [invitationData, setInvitationData] = useState<InvitationData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });

  //
  // 🔄 Fetch invitation details on mount
  //
  useEffect(() => {
    loadInvitationDetails();
  }, [invitationToken]);

  const loadInvitationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("hospital_id, email, specialization, is_used, expires_at")
        .eq("token", invitationToken)
        .single();

      if (error) throw error;

      if (!data) {
        Alert.alert("Error", "Invitation not found.");
        navigation.goBack();
        return;
      }

      if (data.is_used) {
        Alert.alert("Invalid Invitation", "This invitation has already been used.");
        navigation.goBack();
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        Alert.alert("Expired Invitation", "This invitation has expired.");
        navigation.goBack();
        return;
      }

      setInvitationData(data);
    } catch (err) {
      console.error("Error loading invitation:", err);
      Alert.alert("Error", "Invalid or expired invitation link");
      navigation.goBack();
    }
  };

  //
  // 🧾 Signup handler
  //
  const handleSignup = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!invitationData) {
      Alert.alert("Error", "Invalid invitation data");
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Create the user account
      const { error: signUpError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            role: "doctor",
            hospital_id: hospitalId,
            phone_number: formData.phoneNumber || null,
            specialization: invitationData.specialization || null,
            is_verified: true,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2️⃣ Mark invitation as used
      const { error: inviteError } = await supabase
        .from("invitations")
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq("token", invitationToken);

      if (inviteError) throw inviteError;

      // 3️⃣ Success
      Alert.alert(
        "Welcome!",
        `You have successfully joined ${hospitalName}. You can now log in.`,
        [
          {
            text: "Continue to Login",
            onPress: () => navigation.navigate("PatientAuth" as never),
          },
        ]
      );
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert("Signup Failed", error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  //
  // ⏳ Loading state
  //
  if (!invitationData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
        <Text style={styles.loadingText}>Loading invitation...</Text>
      </View>
    );
  }

  //
  // 🎨 UI
  //
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="person-add" size={48} color="#4361EE" />
          <Text style={styles.title}>Join {hospitalName}</Text>
          <Text style={styles.subtitle}>
            Complete your doctor profile to get started
          </Text>
        </View>

        {/* Pre-filled Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="mail" size={20} color="#666" />
            <Text style={styles.infoText}>{invitationData.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="business" size={20} color="#666" />
            <Text style={styles.infoText}>{hospitalName}</Text>
          </View>
          {invitationData.specialization && (
            <View style={styles.infoItem}>
              <Ionicons name="medical" size={20} color="#666" />
              <Text style={styles.infoText}>
                {invitationData.specialization}
              </Text>
            </View>
          )}
        </View>

        {/* Signup Form */}
        <View style={styles.formContainer}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr. John Smith"
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
              autoCapitalize="words"
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              value={formData.phoneNumber}
              onChangeText={(text) =>
                setFormData({ ...formData, phoneNumber: text })
              }
              keyboardType="phone-pad"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              secureTextEntry
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, confirmPassword: text })
              }
              secureTextEntry
            />
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[
              styles.signupButton,
              (!formData.fullName ||
                !formData.password ||
                !formData.confirmPassword ||
                loading) && styles.buttonDisabled,
            ]}
            onPress={handleSignup}
            disabled={
              !formData.fullName ||
              !formData.password ||
              !formData.confirmPassword ||
              loading
            }
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.signupButtonText}>Complete Signup</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            By completing signup, you agree to join {hospitalName} and accept
            our terms of service.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

//
// 💅 Styles
//
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { flexGrow: 1, padding: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  header: { alignItems: "center", marginBottom: 24, marginTop: 20 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  infoText: { fontSize: 16, color: "#1a1a1a" },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  signupButton: {
    backgroundColor: "#4361EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  buttonDisabled: { backgroundColor: "#cccccc" },
  signupButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  termsText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
});
