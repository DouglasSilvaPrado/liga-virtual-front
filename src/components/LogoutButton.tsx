"use client";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/logout", {
      method: "POST",
    });

    // redireciona após sair
    window.location.href = "/login";
  }

  return (
    <Button variant="destructive" onClick={handleLogout}>
      Sair
    </Button>
  );
}
