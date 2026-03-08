const { createClient } = require('@supabase/supabase-js');

const normalizeProject = (value) => (String(value || '').toUpperCase() === 'DUMMY' ? 'DUMMY' : 'REAL');

const getActiveSupabaseProject = () => normalizeProject(process.env.ACTIVE_SUPABASE_PROJECT || 'REAL');

const isPlaceholder = (value) => {
  if (!value) return true;
  const v = String(value).trim().toLowerCase();
  return v === '' || v.startsWith('your_') || v.startsWith('your-') || v === 'placeholder';
};

const readProjectConfig = (project) => {
  const prefix = project === 'DUMMY' ? 'DUMMY' : 'REAL';
  const url = process.env[`${prefix}_SUPABASE_URL`];
  const anonKey =
    process.env[`${prefix}_SUPABASE_ANON_KEY`] ||
    process.env[`${prefix}_SUPABASE_PUBLISHABLE_KEY`];
  let serviceKey =
    process.env[`${prefix}_SUPABASE_SERVICE_KEY`] ||
    process.env[`${prefix}_SUPABASE_SERVICE_ROLE_KEY`];

  // Treat placeholder values as missing
  if (isPlaceholder(serviceKey)) {
    serviceKey = null;
  }

  return {
    project: prefix,
    url,
    anonKey,
    serviceKey
  };
};

const clients = {
  DUMMY: { anon: null, admin: null },
  REAL: { anon: null, admin: null }
};

const createSupabaseClient = (config, key, options) => {
  if (!config?.url || !key) return null;
  return createClient(config.url, key, options);
};

const getSupabaseClient = ({ project } = {}) => {
  const resolvedProject = normalizeProject(project || getActiveSupabaseProject());
  const config = readProjectConfig(resolvedProject);

  if (clients[resolvedProject].anon) return clients[resolvedProject].anon;

  if (!config.url || !config.anonKey) {
    const message = `Supabase (${resolvedProject}) anon client cannot be created: missing ${resolvedProject}_SUPABASE_URL or ${resolvedProject}_SUPABASE_ANON_KEY`;
    console.error(`❌ ${message}`);
    throw new Error(message);
  }

  const client = createSupabaseClient(config, config.anonKey);
  clients[resolvedProject].anon = client;
  return client;
};

const getSupabaseAdminClient = ({ project, purpose = 'admin', allowDemo = false } = {}) => {
  const resolvedProject = normalizeProject(project || getActiveSupabaseProject());

  if (purpose === 'admin' && resolvedProject === 'DUMMY' && !allowDemo) {
    const error = new Error('Admin operations not available in demo database');
    error.code = 'DEMO_MODE';
    throw error;
  }

  const config = readProjectConfig(resolvedProject);

  if (clients[resolvedProject].admin) return clients[resolvedProject].admin;

  // Use service key if available, otherwise fall back to anon key with a warning
  let adminKey = config.serviceKey;
  if (!adminKey) {
    console.warn(`⚠️ Supabase (${resolvedProject}) service role key is missing — falling back to anon key for admin client. Some admin operations may fail due to RLS.`);
    adminKey = config.anonKey;
  }

  if (!config.url || !adminKey) {
    const message = `Supabase (${resolvedProject}) admin client cannot be created: missing ${resolvedProject}_SUPABASE_URL or ${resolvedProject}_SUPABASE_SERVICE_ROLE_KEY`;
    console.error(`❌ ${message}`);
    throw new Error(message);
  }

  const client = createSupabaseClient(config, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  clients[resolvedProject].admin = client;
  return client;
};

const initializeSupabase = () => {
  const activeProject = getActiveSupabaseProject();
  const config = readProjectConfig(activeProject);
  const missing = [];

  if (!config.url) missing.push(`${activeProject}_SUPABASE_URL`);
  if (!config.anonKey) missing.push(`${activeProject}_SUPABASE_ANON_KEY`);
  if (!config.serviceKey) missing.push(`${activeProject}_SUPABASE_SERVICE_KEY (admin operations may be limited)`);

  return { activeProject, missing };
};

const isDemoSupabaseProject = () => getActiveSupabaseProject() === 'DUMMY';

module.exports = {
  getSupabaseClient,
  getSupabaseAdminClient,
  getActiveSupabaseProject,
  isDemoSupabaseProject,
  initializeSupabase,
  readProjectConfig
};
