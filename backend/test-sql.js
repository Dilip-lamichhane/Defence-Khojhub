

const runSql = async () => {
    const token = 'sbp_fe5213fd2b61aa15ce582a5e20cd3cb7982ffd87';
    const projectRef = 'wiaqtwmprwqxmyfptgsg';
    const query = 'SELECT 1 as connected;';

    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    const text = await res.text();
    console.log('Status', res.status);
    console.log('Response', text);
};

runSql().catch(console.error);
