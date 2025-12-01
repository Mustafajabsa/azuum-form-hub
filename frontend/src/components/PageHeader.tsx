import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="lg:hidden" />
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          </div>
          {children}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground pl-11">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
