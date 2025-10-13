"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/app/_components/settings-context";
import { Lineicons } from "@lineiconshq/react-lineicons";
import {
  CheckCircle1Outlined,
  XmarkCircleOutlined,
} from "@lineiconshq/free-icons";

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
      ? "inline-flex items-center gap-2 rounded-full border border-emerald-400 px-3 py-1 text-emerald-400"
      : "inline-flex items-center gap-2 rounded-full border border-amber-400 px-3 py-1 text-amber-500";

  return (
    <span className={className}>
      <Lineicons
        icon={status === "present" ? CheckCircle1Outlined : XmarkCircleOutlined}
        size={12}
      />
      {status === "present" ? "API key linked" : "API key needed"}
    </span>
  );
}
