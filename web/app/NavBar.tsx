"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const isAdmin = pathname?.startsWith("/admin");

  return (
    <nav>
      <Link href="/" className="brand">BSA Gallery</Link>
      <Link href="/">Gallery</Link>
      <Link href="/map">Map</Link>
      <Link href="/admin">Admin</Link>
      {isAdmin && <Link href="/admin/tags">Tags</Link>}
      {isAdmin && (
        <button
          onClick={handleLogout}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "1px solid #444",
            color: "#ccc",
            padding: "0.3rem 0.8rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
}
