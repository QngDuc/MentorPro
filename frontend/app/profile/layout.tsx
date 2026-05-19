"use client";

import { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
