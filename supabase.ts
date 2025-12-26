
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfrtyuzcnpukcjncgawx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcnR5dXpjbnB1a2NqbmNnYXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDY1MDgsImV4cCI6MjA4MTgyMjUwOH0.GHufzZYMZBNgKjm0uug9NuyGiP_yAFim_Lp9gzG5ZBw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
