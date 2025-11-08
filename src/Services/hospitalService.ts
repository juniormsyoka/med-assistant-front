import { supabase } from './supabaseClient';

/**
 * Fetch all hospitals.
 * Returns an array of hospitals with `id` and `name`.
 */
export const fetchHospitals = async (): Promise<{ id: string; name: string }[]> => {
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching hospitals:', error.message);
    throw new Error(error.message);
  }

  if (!data) return [];

  return data;
};
