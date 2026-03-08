import { createClient } from '@supabase/supabase-js';

// Cache for the clients
const clients = {
    real: null,
    dummy: null,
};

export const getRealSupabase = () => {
    if (clients.real) return clients.real;

    const url = import.meta.env.VITE_REAL_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_REAL_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.error('Missing REAL Supabase environment variables');
        return null;
    }

    clients.real = createClient(url, anonKey);
    return clients.real;
};

export const getDummySupabase = () => {
    if (clients.dummy) return clients.dummy;

    const url = import.meta.env.VITE_DUMMY_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_DUMMY_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        console.error('Missing DUMMY Supabase environment variables');
        return null;
    }

    clients.dummy = createClient(url, anonKey);
    return clients.dummy;
};

export const getSupabaseByType = (type) => {
    if (type === 'dummy') {
        return getDummySupabase();
    }
    return getRealSupabase();
};

export const getSupabaseByTypeWithAuth = (type, token) => {
    if (!token) return null;
    const prefix = type === 'dummy' ? 'VITE_DUMMY' : 'VITE_REAL';
    const url = import.meta.env[`${prefix}_SUPABASE_URL`];
    const anonKey = import.meta.env[`${prefix}_SUPABASE_ANON_KEY`];
    if (!url || !anonKey) return null;

    return createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
};
