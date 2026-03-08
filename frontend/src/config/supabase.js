const normalizeProject = (value) => (String(value || '').toUpperCase() === 'DUMMY' ? 'DUMMY' : 'REAL');

export const getActiveSupabaseProject = () =>
  normalizeProject(import.meta.env.VITE_ACTIVE_SUPABASE_PROJECT || 'REAL');

const MAP_PROJECT_KEY = 'khojhub.mapSupabaseProject';

export const getMapSupabaseProject = () => {
  if (typeof window === 'undefined') return getActiveSupabaseProject();
  const stored = window.localStorage.getItem(MAP_PROJECT_KEY);
  return normalizeProject(stored || getActiveSupabaseProject());
};

export const setMapSupabaseProject = (project) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MAP_PROJECT_KEY, normalizeProject(project));
  }
  return normalizeProject(project);
};


const getProjectConfig = (project) => {
  const prefix = project === 'DUMMY' ? 'VITE_DUMMY' : 'VITE_REAL';
  const url = import.meta.env[`${prefix}_SUPABASE_URL`] || import.meta.env.VITE_SUPABASE_URL;
  const anonKey =
    import.meta.env[`${prefix}_SUPABASE_ANON_KEY`] ||
    import.meta.env[`${prefix}_SUPABASE_PUBLISHABLE_KEY`] ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return { project, url, anonKey };
};

export const getSupabaseConfig = () => {
  const project = getActiveSupabaseProject();
  return getProjectConfig(project);
};

export const isDemoMode = () => getActiveSupabaseProject() === 'DUMMY';

export const getSupabaseModeLabel = () => (isDemoMode() ? 'Demo (Dummy DB)' : 'Real Database');
