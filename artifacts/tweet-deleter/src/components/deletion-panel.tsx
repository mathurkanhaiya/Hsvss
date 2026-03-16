import { useState, useMemo } from "react";
import { Filter, Calendar, Search, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import type { Tweet } from "@workspace/api-client-react/src/generated/api.schemas";
import { useTweetsDeleteAll, useTweetsDeleteLikes } from "@workspace/api-client-react";
import { format, subDays, isBefore } from "date-fns";
import { cn } from "../lib/utils";

interface DeletionPanelProps {
  tweets: Tweet[];
  orchestrator: any; // Using any for brevity, defined in hook
  onServerBulkDelete: () => void;
}

export function DeletionPanel({ tweets, orchestrator }: DeletionPanelProps) {
  const [activeTab, setActiveTab] = useState<"filtered" | "server">("filtered");

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-white/5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("filtered")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            activeTab === "filtered" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
          )}
        >
          Targeted Deletion
        </button>
        <button
          onClick={() => setActiveTab("server")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            activeTab === "server" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"
          )}
        >
          Server Bulk Actions
        </button>
      </div>

      <div className="min-h-[300px]">
        {activeTab === "filtered" ? (
          <FilteredDeletion tweets={tweets} orchestrator={orchestrator} />
        ) : (
          <ServerBulkDeletion />
        )}
      </div>
    </div>
  );
}

function FilteredDeletion({ tweets, orchestrator }: { tweets: Tweet[], orchestrator: any }) {
  const [daysOld, setDaysOld] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  const filteredTweets = useMemo(() => {
    return tweets.filter(tweet => {
      let matches = true;
      if (daysOld && !isNaN(Number(daysOld))) {
        const thresholdDate = subDays(new Date(), Number(daysOld));
        matches = matches && isBefore(new Date(tweet.created_at), thresholdDate);
      }
      if (keyword.trim()) {
        matches = matches && tweet.text.toLowerCase().includes(keyword.toLowerCase());
      }
      return matches;
    });
  }, [tweets, daysOld, keyword]);

  const hasData = tweets.length > 0;

  return (
    <div className="space-y-6">
      {!hasData && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            You need to <strong>Load Data</strong> first to use targeted deletion. The frontend needs to know which tweets to delete.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Older than (days)
          </label>
          <input
            type="number"
            min="0"
            value={daysOld}
            onChange={(e) => setDaysOld(e.target.value)}
            disabled={!hasData}
            placeholder="e.g. 30"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Search className="w-4 h-4" />
            Contains keyword
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={!hasData}
            placeholder="e.g. promotion"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
          />
        </div>
      </div>

      <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Targeting</p>
          <p className="text-2xl font-display font-bold mt-1">
            {hasData ? filteredTweets.length : 0} <span className="text-base font-normal text-muted-foreground">tweets</span>
          </p>
        </div>
        <button
          onClick={() => orchestrator.startDeletion(filteredTweets)}
          disabled={!hasData || filteredTweets.length === 0}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          Delete Selected
        </button>
      </div>
    </div>
  );
}

function ServerBulkDeletion() {
  const { mutate: deleteAll, isPending: isDeletingAll } = useTweetsDeleteAll({
    mutation: {
      onSuccess: (data) => {
        alert(`Deletion submitted! Deleted: ${data.deleted}, Failed: ${data.failed}`);
      }
    }
  });

  const { mutate: deleteLikes, isPending: isDeletingLikes } = useTweetsDeleteLikes({
    mutation: {
      onSuccess: (data) => {
        alert(`Likes deleted: ${data.deleted}, Failed: ${data.failed}`);
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-start gap-3">
        <Filter className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">
          These actions run entirely on the server. They don't require loading data first, but they provide less granular progress feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 border border-rose-500/30 bg-rose-500/5 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-rose-500 text-lg flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Everything
            </h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Submits a request to delete all your tweets directly via the API endpoint. Irreversible.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("Are you absolutely sure you want to delete ALL your tweets?")) {
                deleteAll({ data: {} });
              }
            }}
            disabled={isDeletingAll}
            className="w-full py-3 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors disabled:opacity-50"
          >
            {isDeletingAll ? "Processing..." : "Nuke Account"}
          </button>
        </div>

        <div className="p-6 border border-white/10 bg-white/5 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" /> Unlike Everything
            </h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              Remove your likes from all tweets. This does not delete the tweets themselves.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("Remove all likes?")) {
                deleteLikes();
              }
            }}
            disabled={isDeletingLikes}
            className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors border border-white/5 disabled:opacity-50"
          >
            {isDeletingLikes ? "Processing..." : "Remove Likes"}
          </button>
        </div>
      </div>
    </div>
  );
}
