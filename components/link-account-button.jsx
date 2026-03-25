"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LinkAccountButton() {
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/aa/consent", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to initiate consent");
      }

      const { redirectUrl } = await response.json();
      
      toast.success("Redirecting to Bank (Mock)...");
      
      // Artificial delay to simulate actual redirection
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      // We don't set loading to false because we're redirecting
    }
  };

  return (
    <Card 
      onClick={handleLink}
      className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 bg-blue-50/50 group"
    >
      <CardContent className="flex flex-col items-center justify-center h-full pt-5 min-h-[140px]">
        {loading ? (
          <Loader2 className="h-10 w-10 mb-2 animate-spin text-blue-600" />
        ) : (
          <Link2 className="h-10 w-10 mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
        )}
        <p className="text-sm font-semibold text-blue-900">Link Bank Account</p>
        <p className="text-xs text-blue-600 mt-1">Automate with AA Framework</p>
      </CardContent>
    </Card>
  );
}
