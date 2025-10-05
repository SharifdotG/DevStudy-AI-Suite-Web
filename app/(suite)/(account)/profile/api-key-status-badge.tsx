"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/app/_components/settings-context";

type ApiKeyStatusBadgeProps = {
  initialStatus: "present" | "absent";
};

export function ApiKeyStatusBadge({ initialStatus }: ApiKeyStatusBadgeProps) {
  const { apiKey } = useSettings();
  const [status, setStatus] = useState<"present" | "absent">(initialStatus);

  useEffect(() => {
    const hasKey = apiKey.trim().length > 0;
    setStatus(hasKey ? "present" : "absent");
  }, [apiKey]);

  const className =
    status === "present"
      ? "rounded-full border border-emerald-400 px-3 py-1 text-emerald-400"
      : "rounded-full border border-amber-400 px-3 py-1 text-amber-500";

  return <span className={className}>{status === "present" ? "API key linked" : "API key needed"}</span>;
}
