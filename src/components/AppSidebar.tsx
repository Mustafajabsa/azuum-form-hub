import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Settings,
  HardDrive,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "../hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/use-theme";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  { title: "Storage", url: "/storage", icon: HardDrive, adminOnly: false },
  { title: "Forms", url: "/forms", icon: FileText, adminOnly: false },
  {
    title: "Filled Forms",
    url: "/filled-forms",
    icon: FolderOpen,
    adminOnly: false,
  },
  { title: "Settings", url: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const userRole = "admin"; // TODO: Replace with actual user role from context
  const navigate = useNavigate();

  // Prevent hydration mismatch by only rendering on the client
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border flex flex-col h-full"
    >
      <SidebarContent className="flex-1">
        <div className="px-4 py-4 border-b border-border">
          <button
            onClick={toggleSidebar}
            className="flex items-center gap-2 w-full hover:opacity-80 transition-opacity"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Azuum Logo"
                className="w-8 h-8 object-contain"
              />
              {open && (
                <span className="font-semibold text-foreground">Azuum</span>
              )}
            </div>
          </button>
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => !item.adminOnly || userRole === "admin")
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-sidebar-accent 
                                transition-colors ${
                                  !open ? "justify-center" : ""
                                }`}
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <item.icon className="h-5 w-5 flex-shrink-0" />
                              {open && <span>{item.title}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {!open && (
                          <TooltipContent side="right" sideOffset={10}>
                            <p>{item.title}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Theme Toggle */}
      <div className="p-2 border-t border-border">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                aria-label={
                  isClient && theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                className={`flex items-center gap-3 w-full px-3 py-2 rounded
                  hover:bg-sidebar-accent hover:text-sidebar-primary
                  transition-colors text-muted-foreground
                  ${open ? "justify-start" : "justify-center"}
                `}
              >
                {isClient && theme === "dark" ? (
                  <Sun className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <Moon className="h-5 w-5 flex-shrink-0" />
                )}
              </button>
            </TooltipTrigger>
            {!open && (
              <TooltipContent side="right" sideOffset={10}>
                <p>
                  {isClient && theme === "dark" ? "Light Mode" : "Dark Mode"}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Logout Button */}
      <div className="p-2 border-t border-border">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={`
                  flex items-center gap-3 w-full px-3 py-2 rounded
                  hover:bg-sidebar-accent hover:text-sidebar-primary
                  transition-colors text-muted-foreground
                  ${open ? "justify-start" : "justify-center"}
                `}
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                {open && <span>Logout</span>}
              </button>
            </TooltipTrigger>
            {!open && (
              <TooltipContent side="right" sideOffset={10}>
                <p>Logout</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </Sidebar>
  );
}
