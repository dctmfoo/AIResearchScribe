import useSWR from "swr";
import type { User, InsertUser } from "../../../db/schema";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) {
      throw { info: r.json(), status: r.status };
    }
    return r.json();
  });

export function useUser() {
  const { data, error, mutate } = useSWR<User, Error>("/api/user", fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
    onError: (err) => {
      if (err?.status === 401) {
        // Ignore unauthorized errors as they're expected when not logged in
        return;
      }
      console.error("User fetch error:", err);
    }
  });

  return {
    user: data,
    isLoading: !error && !data,
    error,
    login: async (user: InsertUser) => {
      const result = await handleRequest("/login", "POST", user);
      if (result.ok && result.user) {
        await mutate(result.user);
      }
      return result;
    },
    logout: async () => {
      const result = await handleRequest("/logout", "POST");
      if (result.ok) {
        await mutate(undefined);
      }
      return result;
    },
    register: async (user: InsertUser) => {
      const result = await handleRequest("/register", "POST", user);
      if (result.ok && result.user) {
        await mutate(result.user);
      }
      return result;
    },
  };
}

type RequestResult =
  | {
      ok: true;
      user?: User;
      message?: string;
    }
  | {
      ok: false;
      message: string;
    };

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data.message };
    }

    return { 
      ok: true,
      user: data.user,
      message: data.message
    };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}
