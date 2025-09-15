// 'use client';

// import { useEffect, useMemo, useState } from 'react';
// import { createClient, Session, User } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// // All-in-one client for this POC. (We'll factor this out later.)
// const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: true,
//   },
// });

// // Helpers to decode the JWT so you can inspect it on the page
// function base64UrlDecode(input: string) {
//   // Convert from base64url to base64
//   let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
//   // Pad if needed
//   const pad = b64.length % 4;
//   if (pad) b64 += '='.repeat(4 - pad);
//   try {
//     return decodeURIComponent(
//       atob(b64)
//         .split('')
//         .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
//         .join('')
//     );
//   } catch {
//     return '';
//   }
// }

// function decodeJwt(token?: string) {
//   if (!token) return { header: null, payload: null };
//   const parts = token.split('.');
//   if (parts.length !== 3) return { header: null, payload: null };
//   try {
//     const header = JSON.parse(base64UrlDecode(parts[0]));
//     const payload = JSON.parse(base64UrlDecode(parts[1]));
//     return { header, payload };
//   } catch {
//     return { header: null, payload: null };
//   }
// }

// export default function DebugAuthPage() {
//   const [session, setSession] = useState<Session | null>(null);
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);

//   // Grab the session on mount and listen for changes
//   useEffect(() => {
//     let isMounted = true;

//     (async () => {
//       const { data } = await supabase.auth.getSession();
//       if (!isMounted) return;
//       setSession(data.session ?? null);
//       setUser(data.session?.user ?? null);
//       setLoading(false);
//     })();

//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((_event, newSession) => {
//       setSession(newSession);
//       setUser(newSession?.user ?? null);
//     });

//     return () => {
//       isMounted = false;
//       subscription.unsubscribe();
//     };
//   }, []);

//   const accessToken = session?.access_token;
//   const decoded = useMemo(() => decodeJwt(accessToken), [accessToken]);

//   // Actions
//   const signInWithGoogle = async () => {
//     await supabase.auth.signInWithOAuth({
//       provider: 'google',
//       options: {
//         redirectTo: `${window.location.origin}/debug`, // returns here
//         // If you want a popup instead of full redirect, remove redirectTo and add `queryParams: { prompt: 'select_account' }`
//       },
//     });
//   };

//   const signOut = async () => {
//     await supabase.auth.signOut();
//   };

//   // UI
//   return (
//     <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 920, margin: '48px auto', padding: 24 }}>
//       <h1 style={{ fontSize: 28, marginBottom: 12 }}>Supabase Auth Debug</h1>
//       <p style={{ color: '#666', marginBottom: 24 }}>
//         Sign in with Google and inspect your Supabase session and JWT (access_token).
//       </p>

//       {!user ? (
//         <button
//           onClick={signInWithGoogle}
//           style={{
//             padding: '10px 14px',
//             borderRadius: 12,
//             border: '1px solid #ddd',
//             cursor: 'pointer',
//             fontSize: 16,
//           }}
//           disabled={loading}
//         >
//           {loading ? 'Checking session…' : 'Sign in with Google'}
//         </button>
//       ) : (
//         <div
//           style={{
//             display: 'grid',
//             gap: 16,
//             gridTemplateColumns: '1fr',
//             alignItems: 'start',
//           }}
//         >
//           <div
//             style={{
//               border: '1px solid #eee',
//               borderRadius: 12,
//               padding: 16,
//             }}
//           >
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
//               <h2 style={{ margin: 0, fontSize: 20 }}>Authenticated User</h2>
//               <button
//                 onClick={signOut}
//                 style={{
//                   padding: '8px 12px',
//                   borderRadius: 10,
//                   border: '1px solid #ddd',
//                   cursor: 'pointer',
//                   fontSize: 14,
//                   background: 'white',
//                 }}
//               >
//                 Sign out
//               </button>
//             </div>
//             <div style={{ marginTop: 12, lineHeight: 1.5 }}>
//               <div><strong>ID:</strong> {user.id}</div>
//               {user.email && <div><strong>Email:</strong> {user.email}</div>}
//               {user.user_metadata?.full_name && (
//                 <div><strong>Name:</strong> {user.user_metadata.full_name}</div>
//               )}
//               {user.user_metadata?.avatar_url && (
//                 <div style={{ marginTop: 8 }}>
//                   <img
//                     src={user.user_metadata.avatar_url}
//                     alt="avatar"
//                     width={56}
//                     height={56}
//                     style={{ borderRadius: '50%' }}
//                   />
//                 </div>
//               )}
//             </div>
//           </div>

//           <div
//             style={{
//               border: '1px solid #eee',
//               borderRadius: 12,
//               padding: 16,
//             }}
//           >
//             <h2 style={{ marginTop: 0, fontSize: 20 }}>Session</h2>
//             {session ? (
//               <>
//                 <div style={{ marginBottom: 8 }}>
//                   <strong>Expires At (unix):</strong> {session.expires_at}
//                 </div>
//                 <div style={{ marginBottom: 8 }}>
//                   <strong>Token Type:</strong> {session.token_type}
//                 </div>
//                 <div style={{ marginBottom: 12 }}>
//                   <strong>Provider Token Present:</strong>{' '}
//                   {session.provider_token ? 'yes' : 'no'}
//                 </div>

//                 <div style={{ marginTop: 12 }}>
//                   <h3 style={{ margin: '12px 0 6px' }}>Access Token (JWT)</h3>
//                   <textarea
//                     readOnly
//                     value={accessToken ?? ''}
//                     placeholder="No access token"
//                     style={{ width: '100%', minHeight: 110, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}
//                   />
//                 </div>

//                 <div style={{ marginTop: 12 }}>
//                   <h3 style={{ margin: '12px 0 6px' }}>Decoded JWT Payload</h3>
//                   <pre
//                     style={{
//                       background: '#fafafa',
//                       border: '1px solid #eee',
//                       borderRadius: 8,
//                       padding: 12,
//                       overflowX: 'auto',
//                       fontSize: 12,
//                     }}
//                   >
// {JSON.stringify(decoded.payload, null, 2)}
//                   </pre>
//                   <details style={{ marginTop: 8 }}>
//                     <summary style={{ cursor: 'pointer' }}>Show JWT Header</summary>
//                     <pre
//                       style={{
//                         background: '#fafafa',
//                         border: '1px solid #eee',
//                         borderRadius: 8,
//                         padding: 12,
//                         overflowX: 'auto',
//                         fontSize: 12,
//                         marginTop: 8,
//                       }}
//                     >
// {JSON.stringify(decoded.header, null, 2)}
//                     </pre>
//                   </details>
//                 </div>
//               </>
//             ) : (
//               <div>No active session.</div>
//             )}
//           </div>
//         </div>
//       )}

//       <hr style={{ margin: '28px 0' }} />
//       <p style={{ fontSize: 13, color: '#888' }}>
//         ⚠️ For debugging only: showing JWTs in the UI is fine in dev, but don’t display them in production.
//       </p>
//     </main>
//   );
// }
