"use client";

/**
 * Layout autenticado: guard de sesión + BottomNav (móvil) / Sidebar
 * (tablet/desktop). Contenido max-w 960px centrado en desktop.
 */
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomNav, Sidebar } from "@/components/AppNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/features/auth-rut/ProfileProvider";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) router.replace("/login");
  }, [loading, profile, router]);

  if (loading || !profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-3 p-4 pt-8">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-background md:pl-[68px] lg:pl-56">
      <Sidebar />
      <main className="mx-auto max-w-[960px] px-4 pt-4 pb-24 md:pt-6 md:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
