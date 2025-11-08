import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  FlatList,
  Switch
} from "react-native";
import axios from "axios";
import { useAppTheme } from "../contexts/ThemeContext";

const API_URL = "https://diagnosis-api-xi36.onrender.com/predict-diagnosis";

// Predefined symptoms from your training dataset
const SYMPTOMS_LIST = [
  'Body ache', 'Cough', 'Fatigue', 'Fever', 'Headache', 
  'Runny nose', 'Shortness of breath', 'Sore throat'
];

// Default values for vital signs when not provided
const DEFAULT_VITALS = {
  Heart_Rate_bpm: 72,
  Body_Temperature_C: 36.6,
  Blood_Pressure_mmHg: "120/80",
  Oxygen_Saturation: 98
};

const DiagnosisScreen = () => {
  const { theme } = useAppTheme();
  const [form, setForm] = useState({
    Age: "",
    Gender: "",
    Symptom_1: "",
    Symptom_2: "",
    Symptom_3: "",
    Heart_Rate_bpm: "",
    Body_Temperature_C: "",
    Blood_Pressure_mmHg: "",
    Oxygen_Saturation: "",
    Severity: "",
    Treatment_Plan: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [activeSymptomField, setActiveSymptomField] = useState<string | null>(null);
  const [useDefaultVitals, setUseDefaultVitals] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSymptomSelect = (symptom: string) => {
    if (activeSymptomField) {
      handleChange(activeSymptomField, symptom);
    }
    setDropdownVisible(false);
    setActiveSymptomField(null);
  };

  const openSymptomDropdown = (field: string) => {
    setActiveSymptomField(field);
    setDropdownVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.Age || !form.Gender || !form.Symptom_1) {
      Alert.alert("Missing Information", "Please fill in required fields: Age, Gender, and at least one symptom.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Prepare payload with actual values or defaults
      const payload = {
        Age: parseInt(form.Age),
        Gender: form.Gender,
        Symptom_1: form.Symptom_1,
        Symptom_2: form.Symptom_2 || "None", // Send "None" if no additional symptom
        Symptom_3: form.Symptom_3 || "None",
        Heart_Rate_bpm: useDefaultVitals ? DEFAULT_VITALS.Heart_Rate_bpm : 
                         form.Heart_Rate_bpm ? parseFloat(form.Heart_Rate_bpm) : DEFAULT_VITALS.Heart_Rate_bpm,
        Body_Temperature_C: useDefaultVitals ? DEFAULT_VITALS.Body_Temperature_C : 
                           form.Body_Temperature_C ? parseFloat(form.Body_Temperature_C) : DEFAULT_VITALS.Body_Temperature_C,
        Blood_Pressure_mmHg: useDefaultVitals ? DEFAULT_VITALS.Blood_Pressure_mmHg : 
                            form.Blood_Pressure_mmHg || DEFAULT_VITALS.Blood_Pressure_mmHg,
        "Oxygen_Saturation_%": useDefaultVitals ? DEFAULT_VITALS.Oxygen_Saturation : 
                              form.Oxygen_Saturation ? parseFloat(form.Oxygen_Saturation) : DEFAULT_VITALS.Oxygen_Saturation,
        Severity: form.Severity || "Unknown",
        Treatment_Plan: form.Treatment_Plan || "None",
      };

      console.log("Submitting payload:", payload);

      const res = await axios.post(API_URL, payload);
      setResult(res.data.prediction);
    } catch (error: any) {
      console.error("Diagnosis error:", error);
      Alert.alert(
        "Diagnosis Error", 
        error.response?.data?.detail || "Unable to process diagnosis. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setForm({
      Age: "",
      Gender: "",
      Symptom_1: "",
      Symptom_2: "",
      Symptom_3: "",
      Heart_Rate_bpm: "",
      Body_Temperature_C: "",
      Blood_Pressure_mmHg: "",
      Oxygen_Saturation: "",
      Severity: "",
      Treatment_Plan: "",
    });
    setUseDefaultVitals(false);
    setResult(null);
  };

  const toggleDefaultVitals = (value: boolean) => {
    setUseDefaultVitals(value);
    if (value) {
      // Clear the vital inputs when using defaults
      setForm({
        ...form,
        Heart_Rate_bpm: "",
        Body_Temperature_C: "",
        Blood_Pressure_mmHg: "",
        Oxygen_Saturation: "",
      });
    }
  };

  const getSymptomFieldValue = (field: string) => {
    return (form as any)[field] || "";
  };

  const styles = createStyles(theme);

  const renderSymptomItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.symptomItem}
      onPress={() => handleSymptomSelect(item)}
    >
      <Text style={styles.symptomItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerCard}>
            <Text style={styles.headerEmoji}>🏥</Text>
            <View>
              <Text style={styles.headerTitle}>Diagnosis AI</Text>
              <Text style={styles.headerSubtitle}>Medical Diagnosis Assistant</Text>
            </View>
          </View>
        </View>

        {/* Patient Information Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.emoji}>👤</Text>
            Patient Information
          </Text>
          
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 35"
                value={form.Age}
                onChangeText={(text) => handleChange("Age", text)}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            
            <View style={styles.halfInputContainer}>
              <Text style={styles.label}>Gender *</Text>
              <TextInput
                style={styles.input}
                placeholder="Male/Female"
                value={form.Gender}
                onChangeText={(text) => handleChange("Gender", text)}
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Symptoms Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.emoji}>🤒</Text>
            Symptoms
          </Text>
          
          {["Symptom_1", "Symptom_2", "Symptom_3"].map((symptom, index) => (
            <View key={symptom} style={styles.inputContainer}>
              <Text style={styles.label}>
                {index === 0 ? "Primary Symptom *" : `Additional Symptom ${index}`}
                {index > 0 && <Text style={styles.optionalText}> (Optional)</Text>}
              </Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => openSymptomDropdown(symptom)}
              >
                <Text style={[
                  styles.dropdownTriggerText,
                  !getSymptomFieldValue(symptom) && styles.placeholderText
                ]}>
                  {getSymptomFieldValue(symptom) || 
                    (index === 0 ? "Select primary symptom" : "Select additional symptom (optional)")}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Vital Signs Section */}
        <View style={styles.sectionCard}>
          <View style={styles.vitalHeader}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.emoji}>💓</Text>
              Vital Signs
            </Text>
            <View style={styles.defaultToggle}>
              <Text style={styles.defaultToggleText}>Use normal defaults</Text>
              <Switch
                value={useDefaultVitals}
                onValueChange={toggleDefaultVitals}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.background}
              />
            </View>
          </View>

          {useDefaultVitals ? (
            <View style={styles.defaultVitalsCard}>
              <Text style={styles.defaultVitalsTitle}>Using Normal Vital Signs</Text>
              <View style={styles.defaultVitalsGrid}>
                <View style={styles.defaultVitalItem}>
                  <Text style={styles.defaultVitalLabel}>Heart Rate</Text>
                  <Text style={styles.defaultVitalValue}>{DEFAULT_VITALS.Heart_Rate_bpm} bpm</Text>
                </View>
                <View style={styles.defaultVitalItem}>
                  <Text style={styles.defaultVitalLabel}>Temperature</Text>
                  <Text style={styles.defaultVitalValue}>{DEFAULT_VITALS.Body_Temperature_C}°C</Text>
                </View>
                <View style={styles.defaultVitalItem}>
                  <Text style={styles.defaultVitalLabel}>Blood Pressure</Text>
                  <Text style={styles.defaultVitalValue}>{DEFAULT_VITALS.Blood_Pressure_mmHg}</Text>
                </View>
                <View style={styles.defaultVitalItem}>
                  <Text style={styles.defaultVitalLabel}>Oxygen</Text>
                  <Text style={styles.defaultVitalValue}>{DEFAULT_VITALS.Oxygen_Saturation}%</Text>
                </View>
              </View>
              <Text style={styles.defaultVitalsNote}>
                Normal adult values are being used. You can toggle off to enter specific measurements.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.vitalSubtitle}>
                Enter measurements if available, or leave blank for normal defaults
              </Text>
              
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Heart Rate (bpm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Normal: ${DEFAULT_VITALS.Heart_Rate_bpm}`}
                    value={form.Heart_Rate_bpm}
                    onChangeText={(text) => handleChange("Heart_Rate_bpm", text)}
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
                
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Temp (°C)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Normal: ${DEFAULT_VITALS.Body_Temperature_C}`}
                    value={form.Body_Temperature_C}
                    onChangeText={(text) => handleChange("Body_Temperature_C", text)}
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
                
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>Blood Pressure</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Normal: ${DEFAULT_VITALS.Blood_Pressure_mmHg}`}
                    value={form.Blood_Pressure_mmHg}
                    onChangeText={(text) => handleChange("Blood_Pressure_mmHg", text)}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
                
                <View style={styles.vitalItem}>
                  <Text style={styles.label}>O₂ Saturation (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Normal: ${DEFAULT_VITALS.Oxygen_Saturation}`}
                    value={form.Oxygen_Saturation}
                    onChangeText={(text) => handleChange("Oxygen_Saturation", text)}
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Additional Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.emoji}>📋</Text>
            Additional Information
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Severity Level
              <Text style={styles.optionalText}> (Optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mild, Moderate, Severe"
              value={form.Severity}
              onChangeText={(text) => handleChange("Severity", text)}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Current Treatment
              <Text style={styles.optionalText}> (Optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any current medications or treatments..."
              value={form.Treatment_Plan}
              onChangeText={(text) => handleChange("Treatment_Plan", text)}
              multiline
              textAlignVertical="top"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={clearForm}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear Form</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={styles.submitButtonText}>Get Diagnosis</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>🎯</Text>
              <Text style={styles.resultTitle}>AI Diagnosis Result</Text>
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{result}</Text>
            </View>
            <Text style={styles.resultDisclaimer}>
              Please consult with a healthcare professional for proper medical advice.
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            ⚠️ This AI assistant provides preliminary analysis only. Always consult with qualified healthcare providers for medical diagnosis and treatment.
          </Text>
        </View>
      </ScrollView>

      {/* Symptoms Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Symptom</Text>
              <TouchableOpacity 
                onPress={() => setDropdownVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={SYMPTOMS_LIST}
              renderItem={renderSymptomItem}
              keyExtractor={(item) => item}
              style={styles.symptomsList}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  emoji: {
    marginRight: 8,
  },
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultToggleText: {
    color: theme.colors.textSecondary,
    marginRight: 8,
    fontSize: 14,
  },
  vitalSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  defaultVitalsCard: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  defaultVitalsTitle: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  defaultVitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  defaultVitalItem: {
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  defaultVitalLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  defaultVitalValue: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  defaultVitalsNote: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputContainer: {
    marginBottom: 12,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vitalItem: {
    width: '48%',
    marginBottom: 12,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  optionalText: {
    color: theme.colors.textSecondary,
    fontWeight: 'normal',
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.inputBackground || theme.colors.background,
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  // Dropdown Styles
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: theme.colors.inputBackground || theme.colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
  },
  dropdownArrow: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.textSecondary,
  },
  symptomsList: {
    maxHeight: 400,
  },
  symptomItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  symptomItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: theme.colors.success + '20',
    borderWidth: 1,
    borderColor: theme.colors.success,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.success,
    textAlign: 'center',
  },
  resultBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.success,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  resultDisclaimer: {
    color: theme.colors.success,
    textAlign: 'center',
    fontSize: 14,
  },
  disclaimerCard: {
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  disclaimerText: {
    color: theme.colors.warning,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default DiagnosisScreen;