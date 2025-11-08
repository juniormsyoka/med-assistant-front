// src/services/doctorService.ts
import { supabase } from '@/Services/supabaseClient';

export const fetchDoctorsForHospital = async (hospitalId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'doctor')
    .eq('is_verified', true)
    .eq('hospital_id', hospitalId)
    .order('full_name');
  if (error) throw error;
  return data;
};
