import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function migrateUsers() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, auth_user_id')
    .is('auth_user_id', null);

  if (error) {
    console.error('❌ Fetch error:', error);
    return;
  }

  let created = 0;
  let skippedNoEmail = 0;
  let failed = 0;

  for (const profile of profiles) {
    if (!profile.email) {
      skippedNoEmail++;
      continue;
    }

    const { data, error: createError } =
      await supabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: false,
      });

    if (createError) {
      // duplicate email or other auth error → safe to skip
      console.log(`⚠️ skipped (${profile.email}): ${createError.message}`);
      failed++;
      continue;
    }

    await supabase
      .from('profiles')
      .update({ auth_user_id: data.user.id })
      .eq('id', profile.id);

    console.log(`✅ created: ${profile.email}`);
    created++;
  }

  console.log('--- MIGRATION SUMMARY ---');
  console.log('Created auth users:', created);
  console.log('Skipped (no email):', skippedNoEmail);
  console.log('Failed / already exists:', failed);
}

migrateUsers();
