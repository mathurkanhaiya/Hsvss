import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "../lib/utils";

interface ProgressOverlayProps {
  orchestrator: any;
}

export function ProgressOverlay({ orchestrator }: ProgressOverlayProps) {
  const { status, progress, message, deleted, failed, total, reset } = orchestrator;

  const isDone = status === "success" || status === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg glass-panel rounded-2xl p-8 shadow-2xl relative"
      >
        {isDone && (
          <button 
            onClick={reset}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center space-y-6">
          
          <div className="relative w-24 h-24 flex items-center justify-center">
            {status === "deleting" && (
              <>
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle 
                    className="text-white/10 stroke-current" 
                    strokeWidth="8" 
                    cx="50" cy="50" r="40" fill="transparent" 
                  />
                  <circle 
                    className="text-primary stroke-current transition-all duration-500 ease-out" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    cx="50" cy="50" r="40" fill="transparent" 
                    strokeDasharray={`${progress * 2.51} 251.2`} 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold font-display">{progress}%</span>
                </div>
              </>
            )}
            
            {status === "success" && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-rose-400" />
                </div>
              </motion.div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold font-display">
              {status === "deleting" ? "Obliterating Tweets" : status === "success" ? "Done!" : "Process Failed"}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm max-w-[280px] mx-auto leading-relaxed">
              {message}
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 mt-4 pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Deleted</p>
              <p className="text-2xl font-bold text-emerald-400">{deleted}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Failed</p>
              <p className="text-2xl font-bold text-rose-400">{failed}</p>
            </div>
          </div>

          {isDone && (
            <button
              onClick={reset}
              className="w-full mt-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
