const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

const env = { ...process.env };

env.EXPO_PUBLIC_SUPABASE_URL =
  env.EXPO_PUBLIC_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  '';

env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase public environment variables for Expo web export.');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'node_modules\\.bin\\expo.cmd' : 'node_modules/.bin/expo';
const result = spawnSync(command, ['export', '--platform', 'web', '--output-dir', 'web-build'], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0 || !existsSync('web-build/index.html')) {
  console.error('Expo web export did not produce web-build/index.html.');
  process.exit(result.status || 1);
}
