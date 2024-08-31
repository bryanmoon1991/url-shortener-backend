import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

const connectSupabase = (): SupabaseClient<Database> => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
};

export default connectSupabase;