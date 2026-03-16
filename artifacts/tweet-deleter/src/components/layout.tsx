import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuthMe, useAuthLogout } from "@workspace/api-client-react";
import { LogOut, Trash2, Github } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getAuthMeQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useAuthMe({ query: { retry: false } });
  
  const { mutate: logout, isPending: isLoggingOut } = useAuthLogout({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(getAuthMeQueryKey(), null);
        setLocation("/");
      }
    }
  });

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
              <Trash2 className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              X<span className="text-primary">Deleter</span>
            </span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-white/10">
                <div className="text-right">
                  <p className="text-sm font-semibold leading-none">{user.name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
                {user.profile_image_url ? (
                  <img src={user.profile_image_url} alt={user.name} className="w-9 h-9 rounded-full border border-white/10" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                )}
              </div>
              <button
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl relative z-10 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-1 flex flex-col"
        >
          {children}
        </motion.div>
      </main>
      
      <footer className="py-6 border-t border-white/5 text-center text-sm text-muted-foreground relative z-10">
        <p>No data is stored permanently. Tweets are deleted securely via official API.</p>
      </footer>
    </div>
  );
}
