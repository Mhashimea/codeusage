import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost, formatTokens, PROVIDERS, type ProviderId } from "@codeusage/shared";
import { ProviderIcon } from "@/components/shared/ProviderBadge";
import { Cpu } from "lucide-react";

interface ProviderCost {
  tool_source: string;
  total_cost: number;
  total_tokens: number;
  task_count: number;
  share_percentage: number;
}

interface CostByProviderProps {
  data: ProviderCost[];
}

export function CostByProvider({ data }: CostByProviderProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            By Provider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Cpu className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No provider data this month
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Provider colors
  const providerColors: Record<string, string> = {
    claude_code: "bg-orange-500/60",
    codex: "bg-violet-500/60",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Cpu className="h-5 w-5 text-muted-foreground" />
          By Provider
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {data.map((provider, index) => {
            const providerInfo = PROVIDERS[provider.tool_source as ProviderId];
            const barColor = providerColors[provider.tool_source] || "bg-primary/60";

            return (
              <div
                key={provider.tool_source}
                className="flex items-center gap-3 py-3 border-b border-border last:border-0"
              >
                {/* Icon */}
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  provider.tool_source === "claude_code"
                    ? "bg-orange-500/10"
                    : "bg-violet-500/10"
                }`}>
                  <ProviderIcon id={provider.tool_source} className="h-5 w-5" />
                </div>

                {/* Provider Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate pr-2">
                      {providerInfo?.displayName || provider.tool_source}
                    </span>
                    <span className="text-sm font-semibold text-emerald-500 whitespace-nowrap">
                      {formatCost(provider.total_cost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all`}
                        style={{ width: `${provider.share_percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {provider.share_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{provider.task_count} tasks</span>
                    <span>{formatTokens(provider.total_tokens)} tokens</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
