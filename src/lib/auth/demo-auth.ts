// ─────────────────────────────────────────────────────────────
// CHRONOS — Demo Auth (modo localStorage sem Supabase)
// Quando NEXT_PUBLIC_SUPABASE_URL não está configurado, usamos
// este sistema pra permitir testar o app sem backend.
// ─────────────────────────────────────────────────────────────

const DEMO_USERS_KEY = "***";
const DEMO_SESSION_KEY = "***";

export type DemoUser = {
  id: string;
  email: string;
  password: string; // hashed (in a real app this would be bcrypt)
  created_at: string;
};

export type DemoSession = {
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  expires_at: number;
};

function getUsers(): DemoUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_USERS_KEY);
    return raw ? (JSON.parse(raw) as DemoUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: DemoUser[]) {
  window.localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

function hashPassword(password: string): string {
  // Demo apenas — não usar em produção real!
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `demo_${hash.toString(36)}_${password.length}`;
}

function generateUserId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function demoSignUp(email: string, password: string): DemoSession {
  const users = getUsers();

  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Este email já está cadastrado");
  }

  if (password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres");
  }

  const newUser: DemoUser = {
    id: generateUserId(),
    email,
    password: hashPassword(password),
    created_at: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  const session: DemoSession = {
    user: {
      id: newUser.id,
      email: newUser.email,
      created_at: newUser.created_at,
    },
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 dias
  };

  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function demoSignIn(email: string, password: string): DemoSession {
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new Error("Email não cadastrado");
  }

  if (user.password !== hashPassword(password)) {
    throw new Error("Senha incorreta");
  }

  const session: DemoSession = {
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };

  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function demoGetSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as DemoSession;
    if (session.expires_at < Date.now()) {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function demoSignOut() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
  }
}