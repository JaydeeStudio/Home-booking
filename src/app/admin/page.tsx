"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return null;

  return (
    <div className="p-10 font-sans">
      <h1 className="text-2xl font-black mb-4">PANEL ADMINISTRATION</h1>
      <div className="bg-white p-8 rounded-2xl border shadow-sm text-gray-500">
        Le panel est en cours de configuration.
      </div>
    </div>
  );
}
