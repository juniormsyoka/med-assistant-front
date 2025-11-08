// src/Services/patientService.ts
import { supabase } from './supabaseClient';

export const assignDoctorToPatient = async (
  patientId: string, 
  doctorId: string, 
  hospitalId: string
) => {
  try {
    console.log('Assigning doctor to patient:', { patientId, doctorId, hospitalId });

    // First, check if the relationship already exists for this patient
    const { data: existing, error: checkError } = await supabase
      .from('patient_doctor')
      .select('*')
      .eq('patient_id', patientId);

    if (checkError) {
      console.error('Error checking existing relationship:', checkError);
      throw checkError;
    }

    if (existing && existing.length > 0) {
      // Update existing relationship for this patient
      const { error: updateError } = await supabase
        .from('patient_doctor')
        .update({ 
          doctor_id: doctorId,
          hospital_id: hospitalId
          // No updated_at column in your table
        })
        .eq('patient_id', patientId);

      if (updateError) {
        console.error('Error updating relationship:', updateError);
        throw updateError;
      }
      
      console.log('Updated existing patient-doctor relationship');
    } else {
      // Create new relationship
      const { error: insertError } = await supabase
        .from('patient_doctor')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          hospital_id: hospitalId
          // created_at will be automatically set by the database
        });

      if (insertError) {
        console.error('Error inserting new relationship:', insertError);
        throw insertError;
      }
      
      console.log('Created new patient-doctor relationship');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in assignDoctorToPatient:', error);
    throw new Error(error.message || 'Failed to assign doctor to patient');
  }
};

// In patientService.ts - add this function if you don't have it
export const getPatientDoctor = async (patientId: string) => {
  const { data, error } = await supabase
    .from('patient_doctor')
    .select(`
      *,
      doctor:users!patient_doctor_doctor_id_fkey (
        id,
        full_name,
        email
      ),
      hospital:hospitals (
        id,
        name
      )
    `)
    .eq('patient_id', patientId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }
  
  return data;
};