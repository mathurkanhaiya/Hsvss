import { useAuthLogin, useAuthMe } from "@workspace/api-client-react";
import { Twitter, ArrowRight, Shield, Zap, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isCheckingUser } = useAuthMe({ query: { retry: false } });
  const { refetch: getLoginUrl, isFetching: isGettingUrl } = useAuthLogin({
    query: { enabled: false }
  });

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleLogin = async () => {
    try {
      const { data } = await getLoginUrl();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to get login URL", error);
    }
  };

  if (isCheckingUser) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-3xl text-center space-y-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20"
        >
          <Twitter className="w-8 h-8" />
        </motion.div>
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
          Clean up your <span className="text-primary text-glow">X timeline</span><br />in seconds.
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Bulk delete your old tweets, replies, and likes securely using the official X API. 
          Filter by date or keyword. Zero data stored.
        </p>

        <div className="pt-8">
          <button
            onClick={handleLogin}
            disabled={isGettingUrl}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_40px_8px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:hover:scale-100"
          >
            {isGettingUrl ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Twitter className="w-5 h-5 fill-current" />
            )}
            <span>Connect X Account</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 mt-16 border-t border-white/5">
          <FeatureCard 
            icon={<Shield className="w-6 h-6 text-emerald-400" />}
            title="Privacy First"
            desc="We don't store your tweets or tokens. Everything happens in-memory."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-amber-400" />}
            title="Rate Limit Safe"
            desc="Intelligent batching avoids hitting X API rate limits."
          />
          <FeatureCard 
            icon={<Trash2 className="w-6 h-6 text-rose-400" />}
            title="Advanced Filters"
            desc="Delete all, or specifically target old tweets and keywords."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-panel p-6 rounded-2xl text-left hover:bg-white/[0.02] transition-colors">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
