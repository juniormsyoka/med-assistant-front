import { supabase } from '@/Services/supabaseClient'; 

// 1️⃣ Get all doctors for a hospital
export async function getDoctors(hospitalId?: string) {
  let query = supabase.from('users').select('*').eq('role', 'doctor');
  if (hospitalId) query = query.eq('hospital_id', hospitalId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

// 2️⃣ Delete a doctor by id
export async function deleteDoctor(doctorId: string) {
  const { error } = await supabase.from('users').delete().eq('id', doctorId).eq('role', 'doctor');
  if (error) throw new Error(error.message);
  return true;
}

export async function getAppointments(hospitalId?: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('hospital_id', hospitalId);
  if (error) throw new Error(error.message);
  return data || [];
}


// 4️⃣ Get pending patients (patients without assigned doctor)
export async function getPendingPatients(hospitalId?: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'patient')
    .not('id', 'in', supabase.from('patient_doctor').select('patient_id'));

  if (error) throw new Error(error.message);
  if (hospitalId) return data?.filter((p) => p.hospital_id === hospitalId) || [];
  return data || [];
}

// 5️⃣ Assign a patient to a doctor
export async function assignPatientToDoctor(patientId: string, doctorId: string) {
  const { data, error } = await supabase.from('patient_doctor').insert([{ patient_id: patientId, doctor_id: doctorId }]);
  if (error) throw new Error(error.message);
  return data;
}
