import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuthCallback } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthMeQueryKey } from "@workspace/api-client-react";

export default function AuthCallback() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const isProcessed = useRef(false);

  // Parse URL manually to handle callback parameters
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const { data, error, isLoading } = useAuthCallback(
    { code: code || "", state: state || "" },
    { query: { enabled: !!code && !!state && !isProcessed.current, retry: false } }
  );

  useEffect(() => {
    if (errorParam) {
      setLocation("/?error=auth_denied");
      return;
    }

    if (!code || !state) {
      setLocation("/");
      return;
    }

    if (data && data.success && !isProcessed.current) {
      isProcessed.current = true;
      // Invalidate the 'me' query so dashboard fetches fresh user
      queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
      setLocation("/dashboard");
    } else if (error && !isProcessed.current) {
      console.error("Auth callback failed:", error);
      setLocation("/?error=auth_failed");
    }
  }, [data, error, code, state, errorParam, setLocation, queryClient]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="glass-panel p-12 rounded-3xl flex flex-col items-center text-center space-y-6 max-w-sm w-full">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-[spin_2s_linear_infinite]" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display">Authenticating...</h2>
          <p className="text-muted-foreground mt-2 text-sm">Connecting securely to X</p>
        </div>
      </div>
    </div>
  );
}
