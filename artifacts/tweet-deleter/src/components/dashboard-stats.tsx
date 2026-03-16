import { motion } from "framer-motion";
import { FileText, Users, UserPlus, Heart } from "lucide-react";
import type { UserInfo } from "@workspace/api-client-react/src/generated/api.schemas";

export function DashboardStats({ user }: { user: UserInfo }) {
  const metrics = user.public_metrics || { tweet_count: 0, followers_count: 0, following_count: 0, like_count: 0 };
  
  const stats = [
    { label: "Total Tweets", value: metrics.tweet_count, icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Followers", value: metrics.followers_count, icon: Users, color: "text-purple-400", bg: "bg-purple-400/10" },
    { label: "Following", value: metrics.following_count, icon: UserPlus, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { label: "Likes", value: metrics.like_count ?? 'N/A', icon: Heart, color: "text-rose-400", bg: "bg-rose-400/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-panel p-5 rounded-2xl"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-2xl sm:text-3xl font-display font-bold">
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
