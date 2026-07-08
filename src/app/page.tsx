"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/features/auth-rut/ProfileProvider";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { profile, loading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(profile ? "/panel" : "/login");
  }, [profile, loading, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Skeleton className="h-10 w-40" />
    </main>
  );
}
