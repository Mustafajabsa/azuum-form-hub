import { useState } from "react";
import { User, Circle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export function UserPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  if (!user) return null;

  const displayName = user.username
    ? user.username
    : user.first_name || user.last_name
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : user.email;

  const initials = user.username
    ? user.username.substring(0, 2).toUpperCase()
    : user.first_name && user.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : user.email.substring(0, 2).toUpperCase();

  return (
    <TooltipProvider delayDuration={100}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-sidebar-accent hover:text-sidebar-primary transition-colors text-muted-foreground"
                aria-label="User profile"
              >
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {initials}
                    </span>
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 w-2 h-2 fill-green-500 text-green-500" />
                </div>
                <span className="truncate text-sm">{displayName}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            <p>User Profile</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-80 p-0" align="start" side="right">
          <div className="p-4 space-y-4">
            {/* User Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-medium text-primary">
                  {initials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{displayName}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Role</span>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">User ID</span>
                <p className="text-sm text-muted-foreground font-mono">
                  {user.id}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Member Since</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* <div className="space-y-1">
                <span className="text-sm font-medium">Last Updated</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div> */}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
