import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkView() {
  try {
    console.log('Checking if user_permissions view exists...');
    
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing user_permissions view:');
      console.error(JSON.stringify(error, null, 2));
      return;
    }
    
    console.log('✅ user_permissions view exists');
    console.log('Sample data:', data);
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkView();
