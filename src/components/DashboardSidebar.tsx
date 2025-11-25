import { ReactNode, useState, useEffect } from "react";
import { X, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import schoolLogo from "../assets/0f38946e273b623e7cb0b865c2f2fe194a9e92ea.png";
import { preloadImage } from "../utils/imageOptimizer";

interface SidebarItem {
  icon: ReactNode;
  label: string;
  id: string;
}

interface DashboardSidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  schoolName?: string;
  themeColor?: string;
}

export function DashboardSidebar({ items, activeItem, onItemClick, schoolName = "Graceland Royal Academy", themeColor = "#3B82F6" }: DashboardSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { preloadImage(schoolLogo); }, []);

  const SidebarContent = () => (
    <>
      {/* Sidebar Header - Enhanced */}
      <div className="p-5 border-b border-[#334155]/50 bg-gradient-to-b from-[#1E293B] to-[#1E293B]/95">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-gray-100 flex items-center justify-center flex-shrink-0 shadow-xl p-2 ring-4 ring-[#3B82F6]/30 hover:ring-[#3B82F6]/50 transition-all">
            <img 
              src={schoolLogo} 
              alt="Graceland Royal Academy Logo" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white truncate">
              {schoolName}
            </h3>
            <p className="text-[#FFD700] text-xs italic">Wisdom & Illumination</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-[#94A3B8] hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sidebar Items - Enhanced */}
      <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onItemClick(item.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm group relative overflow-hidden",
                activeItem === item.id
                  ? "text-white shadow-lg"
                  : "text-[#CBD5E1] hover:bg-[#334155] hover:text-white hover:translate-x-1"
              )}
              style={activeItem === item.id ? {
                background: `linear-gradient(to right, ${themeColor}, ${themeColor}dd)`,
                boxShadow: `0 10px 15px -3px ${themeColor}30`
              } : {}}
            >
              <span className={cn(
                "flex-shrink-0 w-5 h-5 transition-transform",
                activeItem === item.id ? "scale-110" : "group-hover:scale-110"
              )}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {activeItem === item.id && (
                <span className="absolute right-3 w-2 h-2 rounded-full bg-white shadow-lg animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg w-10 h-10 p-0 shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-[#1E293B] z-50 flex flex-col transition-transform duration-300 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-[#1E293B] flex-col shadow-xl z-30 border-r border-[#334155]">
        <SidebarContent />
      </aside>
    </>
  );
}
