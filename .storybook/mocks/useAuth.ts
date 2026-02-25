export function useAuth() {
    return {
        user: { id: 'mock-user-id', email: 'mock@example.com' },
        session: {
            access_token: 'mock-token',
            user: { id: 'mock-user-id', email: 'mock@example.com' }
        },
        loading: false,
        accessToken: 'mock-token',
        signIn: async () => ({ data: {}, error: null }),
        signUp: async () => ({ data: {}, error: null }),
        signOut: async () => ({ error: null }),
        refreshSession: async () => ({ data: {}, error: null }),
        fetchWithAuth: async () => new Response('{}', { status: 200 }),
    };
}
