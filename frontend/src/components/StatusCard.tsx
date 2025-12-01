import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  count: number;
  color: "blue" | "yellow" | "green" | "red";
  onClick?: () => void;
  isActive?: boolean;
}

const colorClasses = {
  blue: "border-l-4 border-l-blue-500",
  yellow: "border-l-4 border-l-yellow-500",
  green: "border-l-4 border-l-green-500",
  red: "border-l-4 border-l-red-500",
};

export function StatusCard({ title, count, color, onClick, isActive }: StatusCardProps) {
  return (
    <Card
      className={cn(
        "p-6 border border-border shadow-sm cursor-pointer hover:shadow-md transition-all",
        colorClasses[color],
        isActive && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-3xl font-bold text-foreground">{count}</p>
        <p className="text-sm text-muted-foreground">Total {title.toLowerCase()}</p>
      </div>
    </Card>
  );
}
