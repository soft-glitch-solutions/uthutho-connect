import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Home, MapPin, Route, PlusCircle, LogOut, User, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Skeleton for User Points
const SkeletonUserPoints = () => (
  <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
);

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [loadingPoints, setLoadingPoints] = useState(true);

  const menuItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: MapPin, label: "Hubs", path: "/hubs" },
    { icon: Route, label: "Routes", path: "/routes" },
    { icon: Flag, label: "Stops", path: "/stops" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: PlusCircle, label: "Request Hub", path: "/hub-request" },
    { icon: PlusCircle, label: "Request Route", path: "/route-request" },
  ];

  // Fetch User Points
  useEffect(() => {
    const fetchUserPoints = async () => {
      try {
        const { data: userSession } = await supabase.auth.getSession();
        if (userSession?.session?.user.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('points')
            .eq('user_id', userSession.session.user.id)
            .single();

          if (error) throw error;
          setUserPoints(data?.points || 0);
        }
      } catch (error) {
        toast.error("Error fetching points.");
      } finally {
        setLoadingPoints(false);
      }
    };

    fetchUserPoints();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-card pt-16">
                <div className="flex flex-col gap-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                        location.pathname === item.path
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-primary/10"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-2 rounded-md text-destructive hover:bg-destructive/10 mt-4"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            <Link to="/home" className="flex items-center gap-2">
              <img src="/logo.png" alt="Uthutho" className="h-8 w-8" />
              <span className="font-semibold text-xl">Uthutho</span>
            </Link>
          </div>

          {/* User Points Section */}
          <div className="flex items-center gap-4">
            {loadingPoints ? (
              <SkeletonUserPoints />
            ) : (
              <>
                <span className="font-semibold text-lg">{userPoints}</span>
                <Button variant="ghost" size="icon" onClick={() => toast.success("Adding points feature coming soon!")}>
                  <PlusCircle className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container pt-20 pb-16">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-full">
          <div className="grid h-full grid-cols-5 items-center justify-items-center">
            {menuItems.slice(0, 5).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 ${
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
