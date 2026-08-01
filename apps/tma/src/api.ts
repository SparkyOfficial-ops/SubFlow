const base = () => import.meta.env.VITE_API_URL?.replace(/\/$/, "");

export interface Session {
  token: string;
  user: { id: string; firstName: string; language: string };
}
