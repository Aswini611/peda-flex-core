import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NormalizedGainBadgeProps {
  gain: number | null;
  showValue?: boolean;
  className?: string;
}

export function NormalizedGainBadge({ gain, showValue = true, className }: NormalizedGainBadgeProps) {
  if (gain === null || gain === undefined) {
    return <Badge variant="outline" className={cn("text-muted-foreground", className)}>Pending</Badge>;
  }

  const label = gain >= 0.7 ? "High Gain 🟢" : gain >= 0.3 ? "Medium Gain 🟡" : "Low Gain 🔴";
  const colorClass =
    gain >= 0.7
      ? "bg-success/15 text-success border-success/30"
      : gain >= 0.3
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-danger/15 text-danger border-danger/30";

  return (
    <Badge variant="outline" className={cn(colorClass, className)}>
      {showValue ? `${gain.toFixed(2)} — ${label}` : label}
    </Badge>
  );
}
