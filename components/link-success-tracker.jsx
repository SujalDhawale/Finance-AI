"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function LinkSuccessTracker() {
  const searchParams = useSearchParams();
  const linked = searchParams.get("linked");

  useEffect(() => {
    if (linked === "true") {
      toast.success("Bank Account Linked Successfully!", {
        description: "Your transactions have been synchronized via the AA framework.",
        duration: 5000,
      });
      
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [linked]);

  return null;
}
