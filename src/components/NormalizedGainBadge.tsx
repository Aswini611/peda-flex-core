import { Badge } from "@/components/ui/badge";

interface NormalizedGainBadgeProps {
  gain: number;
  showLabel?: boolean;
}

export function NormalizedGainBadge({ gain, showLabel = true }: NormalizedGainBadgeProps) {
  const getGainColor = (g: number) => {
    if (g >= 0.7) return "bg-green-100 text-green-700";
    if (g >= 0.3) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const getGainLabel = (g: number) => {
    if (g >= 0.7) return "High";
    if (g >= 0.3) return "Med";
    return "Low";
  };

  const displayText = showLabel
    ? `${getGainLabel(gain)} ${gain.toFixed(2)}`
    : `${(gain * 100).toFixed(0)}%`;

  return (
    <Badge className={`font-mono ${getGainColor(gain)}`}>
      {displayText}
    </Badge>
  );
}
