import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldOff } from "lucide-react";

export const BreakGlassBanner = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchIt = async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "break_glass")
        .maybeSingle();
      if (active) setEnabled(!!(data?.value as any)?.enabled);
    };
    fetchIt();
    const ch = supabase
      .channel("break_glass")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "system_settings", filter: "key=eq.break_glass" },
        (p: any) => setEnabled(!!p.new?.value?.enabled))
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  if (!enabled) return null;
  return (
    <div className="border-b border-destructive/40 bg-destructive/10 px-6 py-2 text-destructive flex items-center gap-2 text-sm font-medium">
      <ShieldOff className="h-4 w-4" />
      Break-glass mode active — token issuance, AI calls, and downloads are frozen.
    </div>
  );
};
