"use client";

import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return document.cookie
          .split("; ")
          .filter(Boolean)
          .map((c) => {
            const [name, ...v] = c.split("=");
            return { name, value: v.join("=") };
          });
      },
      setAll(cookies) {
        cookies.forEach(({ name, value }) => {
          document.cookie = `${name}=${value}; Path=/; SameSite=Lax`;
        });
      },
    },
  },
);
