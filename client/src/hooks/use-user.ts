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
      const res = await handleRequest("/login", "POST", user);
      await mutate();
      return res;
    },
    logout: async () => {
      const res = await handleRequest("/logout", "POST");
      await mutate(undefined);
      return res;
    },
    register: async (user: InsertUser) => {
      const res = await handleRequest("/register", "POST", user);
      await mutate();
      return res;
    },
  };
}

type RequestResult =
  | {
      ok: true;
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

    if (!response.ok) {
      const errorData = await response.json();
      return { ok: false, message: errorData.message };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}
