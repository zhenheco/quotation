const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxlqtnnssfzzpbyfjnby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHF0bm5zc2Z6enBieWZqbmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODMwMTEsImV4cCI6MjA1OTY1OTAxMX0.nMSM3V16oNAEpK738c5SOQmMDL3kPpJSgsC71HppQrI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
  try {
    console.log('🔍 Checking Supabase auth users...\n');

    // Note: This won't work with anon key, but let's try
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log('⚠️  Cannot list users with anon key (expected)');
      console.log('Error:', error.message);
      console.log('\n💡 You need to provide your actual Supabase user UUID.');
      console.log('   You can find it by:');
      console.log('   1. Go to Supabase Dashboard → Authentication → Users');
      console.log('   2. Find your email and copy the UUID\n');
      console.log('   Or, if you\'re logged in to the app, check the browser console:');
      console.log('   supabase.auth.getUser().then(({data}) => console.log(data.user.id))');
    } else {
      console.log('✅ Users found:');
      data.users.forEach(user => {
        console.log(`  - ${user.email}: ${user.id}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUsers();
