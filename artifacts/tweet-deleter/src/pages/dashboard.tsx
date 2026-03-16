import { useState, useMemo } from "react";
import { useAuthMe, useTweetsList, useTweetsDeleteAll } from "@workspace/api-client-react";
import type { Tweet } from "@workspace/api-client-react/src/generated/api.schemas";
import { useLocation } from "wouter";
import { 
  BarChart3, Calendar, DownloadCloud, FileText, Search, Trash2, 
  AlertTriangle, CheckCircle2, RefreshCw, Filter, Heart 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays } from "date-fns";
import { useDeletionOrchestrator } from "../hooks/use-deletion-orchestrator";

// Components
import { DashboardStats } from "../components/dashboard-stats";
import { DeletionPanel } from "../components/deletion-panel";
import { ProgressOverlay } from "../components/progress-overlay";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading, error: userError } = useAuthMe({
    query: { retry: false }
  });

  const [localTweets, setLocalTweets] = useState<Tweet[]>([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ fetched: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<"bulk" | "filter">("bulk");

  const { refetch: fetchPage } = useTweetsList(
    { pagination_token: undefined }, 
    { query: { enabled: false } }
  );

  const orchestrator = useDeletionOrchestrator();

  if (userError) {
    setLocation("/");
    return null;
  }

  const handleFetchAll = async () => {
    setIsFetchingAll(true);
    setLocalTweets([]);
    let nextToken: string | undefined = undefined;
    let fetched = 0;
    const total = user?.public_metrics?.tweet_count || 0;
    
    setFetchProgress({ fetched: 0, total });

    try {
      do {
        // We have to build the URL or use a custom fetcher since the generated hook 
        // statically sets the params in its closure if we don't pass them to the query options.
        // As a workaround, we'll fetch manually using the base URL for pagination flexibility.
        const url = new URL("/api/tweets/list", window.location.origin);
        if (nextToken) url.searchParams.append("pagination_token", nextToken);
        
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to fetch page");
        const data = await res.json();
        
        if (data.tweets && data.tweets.length > 0) {
          setLocalTweets(prev => [...prev, ...data.tweets]);
          fetched += data.tweets.length;
          setFetchProgress({ fetched, total });
        }
        
        nextToken = data.next_token;
        
        // Minor delay to prevent aggressive UI blocking
        await new Promise(r => setTimeout(r, 200));
      } while (nextToken);
    } catch (err) {
      console.error("Error fetching all tweets", err);
    } finally {
      setIsFetchingAll(false);
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and clean your X timeline.</p>
        </div>
      </header>

      <DashboardStats user={user} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Data Source */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-lg">1. Load Data</h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Fetch your recent timeline locally to enable granular filtering before deletion.
            </p>

            <button
              onClick={handleFetchAll}
              disabled={isFetchingAll || orchestrator.status !== "idle"}
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isFetchingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Fetching {fetchProgress.fetched} / {fetchProgress.total || '?'}
                </>
              ) : (
                <>
                  <DownloadCloud className="w-4 h-4" />
                  Fetch My Tweets
                </>
              )}
            </button>

            <AnimatePresence>
              {localTweets.length > 0 && !isFetchingAll && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold">Ready for cleanup</p>
                    <p className="opacity-80 mt-1">{localTweets.length} tweets loaded locally.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h2 className="font-semibold text-lg">2. Deletion Actions</h2>
              </div>
            </div>

            <div className="flex-1 p-6">
              <DeletionPanel 
                tweets={localTweets} 
                orchestrator={orchestrator}
                onServerBulkDelete={() => {
                  // Fallback to server bulk if needed, implemented inside DeletionPanel
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {orchestrator.status !== "idle" && (
          <ProgressOverlay orchestrator={orchestrator} />
        )}
      </AnimatePresence>
    </div>
  );
}
