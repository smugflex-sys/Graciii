import { School, Bell, User, LogOut } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface DashboardTopBarProps {
  userName: string;
  userRole: string;
  notificationCount?: number;
  onLogout?: () => void;
  onNotificationClick?: () => void;
}

export function DashboardTopBar({ userName, userRole, notificationCount = 0, onLogout, onNotificationClick }: DashboardTopBarProps) {
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] border-b border-[#1E40AF]/50 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        {/* Logo - Mobile */}
        <div className="lg:hidden flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20 shadow-lg">
            <School className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-white text-sm block">GRA Portal</span>
            <span className="text-white/70 text-xs">{userRole}</span>
          </div>
        </div>

        {/* Welcome Message - Desktop */}
        <div className="hidden lg:block">
          <p className="text-white text-sm mb-0.5">
            Welcome back, <span className="font-semibold text-white">{userName}</span>! 👋
          </p>
          <p className="text-white/70 text-xs">{userRole}</p>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative cursor-pointer group"
            title="View Notifications"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all shadow-sm ring-1 ring-white/10 hover:ring-white/20">
              <Bell className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </div>
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-[#EF4444] text-white border-2 border-[#2563EB] rounded-full text-xs animate-pulse shadow-lg">
                {notificationCount > 9 ? '9+' : notificationCount}
              </Badge>
            )}
          </button>

          {/* User Profile */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:from-white/30 hover:to-white/20 transition-all shadow-sm ring-1 ring-white/20 group">
              <User className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* Logout Button - Now visible on mobile */}
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="ghost"
              className="flex items-center gap-2 text-white hover:text-white hover:bg-white/20 rounded-xl px-3 md:px-4 py-2 h-10 transition-all ring-1 ring-white/10 hover:ring-white/20 backdrop-blur-sm shadow-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
