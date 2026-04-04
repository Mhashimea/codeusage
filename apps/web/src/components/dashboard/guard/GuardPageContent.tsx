"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Lock,
  Cloud,
  Database,
  Key,
  Ticket,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { BUILT_IN_PATTERNS, CATEGORY_NAMES, type Pattern } from "@codeusage/shared";

interface GuardPageContentProps {
  enabled: boolean;
  canEdit: boolean;
  disabledPatterns: string[];
  disabledCategories: string[];
  updatedAt?: string;
}

// Category icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  aws: Cloud,
  database: Database,
  keys: Key,
  tokens: Ticket,
  env: FileText,
};

// Category colors for icons
const CATEGORY_COLORS: Record<string, string> = {
  aws: "text-orange-500 bg-orange-500/10",
  database: "text-blue-500 bg-blue-500/10",
  keys: "text-red-500 bg-red-500/10",
  tokens: "text-purple-500 bg-purple-500/10",
  env: "text-green-500 bg-green-500/10",
};

// Group patterns by category
function getPatternsByCategory(): Record<string, Pattern[]> {
  const grouped: Record<string, Pattern[]> = {};
  for (const pattern of BUILT_IN_PATTERNS) {
    if (!grouped[pattern.category]) {
      grouped[pattern.category] = [];
    }
    grouped[pattern.category].push(pattern);
  }
  return grouped;
}

// Example formats for each pattern
function getExampleForPattern(patternId: string): string {
  const examples: Record<string, string> = {
    // AWS
    "aws-access-key": "AKIA4EXAMPLE12345",
    "aws-secret-key": "aws_secret_access_key=wJal...",
    // Database
    "postgres-url": "postgresql://user:pass@host/db",
    "mysql-url": "mysql://user:pass@host/db",
    "mongodb-url": "mongodb+srv://user:pass@cluster",
    "redis-url": "redis://user:pass@host:6379",
    "planetscale-password": "pscale_pw_xxxxxxxxxx...",
    "cockroachdb-url": "cockroachdb://user:pass@host/db",
    // Keys
    "private-rsa-key": "-----BEGIN RSA PRIVATE KEY-----",
    "private-ec-key": "-----BEGIN EC PRIVATE KEY-----",
    "private-key-generic": "-----BEGIN PRIVATE KEY-----",
    "gcp-service-account": '"type": "service_account"',
    // Tokens - GitHub & Git
    "github-pat": "ghp_xxxxxxxxxxxxxxxxxxxx",
    "github-oauth": "gho_xxxxxxxxxxxxxxxxxxxx",
    "gitlab-token": "glpat-xxxxxxxxxxxxxxxxxxxx",
    "bitbucket-token": "ATBBxxxxxxxxxxxxxxxx",
    // Tokens - Communication
    "slack-bot": "xoxb-xxxxxxxxxxxx",
    "slack-user": "xoxp-xxxxxxxxxxxx",
    "discord-bot-token": "MTxxxxxxxx.xxxxxx.xxxxxxxxxx",
    "discord-webhook": "https://discord.com/api/webhooks/...",
    "telegram-bot-token": "123456789:ABC-DEF1234...",
    "twilio-api-key": "SKxxxxxxxxxxxxxxxxxxxxxxxx",
    "twilio-auth-token": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "sendgrid-api-key": "SG.xxxxxx.xxxxxxxxxx",
    "mailchimp-api-key": "xxxxxxxxxxxxxxxx-us1",
    "mailgun-api-key": "key-xxxxxxxxxxxxxxxx",
    // Tokens - Payment
    "stripe-secret": "sk_live_xxxxxxxxxxxx",
    "stripe-publishable": "pk_live_xxxxxxxxxxxx",
    "paypal-client-id": "Axxxxxxxxxxxxxxxxxxxxxxxx",
    "square-access-token": "sq0atp-xxxxxxxxxxxx",
    // Tokens - AI/ML
    "openai-key": "sk-xxxxxxxxxxxxxxxxxxxx",
    "anthropic-key": "sk-ant-xxxxxxxxxxxx",
    "openrouter-key": "sk-or-v1-xxxxxxxxxxxx...",
    "huggingface-token": "hf_xxxxxxxxxxxxxxxxxxxx",
    "cohere-api-key": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "replicate-api-token": "r8_xxxxxxxxxxxxxxxxxxxx",
    "stability-api-key": "sk-xxxxxxxxxxxxxxxxxxxx",
    "pinecone-api-key": "xxxxxxxx-xxxx-xxxx-xxxx",
    // Tokens - Cloud & Hosting
    "google-api-key": "AIzaSyXXXXXXXXXXXX",
    "firebase-api-key": "AIzaXXXXXXXXXXXXXXX",
    "azure-subscription-key": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "digitalocean-token": "dop_v1_xxxxxxxxxxxx...",
    "heroku-api-key": "xxxxxxxx-xxxx-xxxx-xxxx",
    "vercel-token": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "netlify-token": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "supabase-key": "sbp_xxxxxxxxxxxxxxxx",
    // Tokens - CI/CD
    "npm-token": "npm_xxxxxxxxxxxxxxxxxxxx",
    "pypi-token": "pypi-xxxxxxxxxxxxxxxxxxxx",
    "docker-hub-token": "dckr_pat_xxxxxxxxxxxx",
    "circleci-token": "circle-token-xxxxxxxxxx",
    "travis-ci-token": "travis-ci-token-xxxxxxxx",
    // Tokens - Analytics
    "sentry-dsn": "https://xxx@xxx.ingest.sentry.io/xxx",
    "datadog-api-key": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "new-relic-key": "NRAK-XXXXXXXXXXXXXXXXXXX",
    "mixpanel-token": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "segment-write-key": "xxxxxxxxxxxxxxxxxxxxxxxx",
    // Tokens - Social
    "facebook-access-token": "EAAxxxxxxxxxxxxxxxx",
    "twitter-bearer-token": "AAAAAAAAAAAAAAAAAxx...",
    "twitter-api-key": "xxxxxxxxxxxxxxxxxxxxxxxxx",
    "linkedin-client-secret": "xxxxxxxxxxxxxxxx",
    // Other
    "jwt-token": "eyJhbGciOiJIUzI1NiJ9...",
    // Env
    "env-secret": "DATABASE_PASSWORD=secret",
    "high-entropy-secret": "api_key=4f9a2c1d8e3b7f0a...",
  };
  return examples[patternId] || "...";
}

export function GuardPageContent({
  enabled,
  canEdit,
  disabledPatterns: initialDisabledPatterns,
  disabledCategories: initialDisabledCategories,
}: GuardPageContentProps) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isUpdating, setIsUpdating] = useState(false);
  const [disabledPatterns, setDisabledPatterns] = useState<string[]>(initialDisabledPatterns);
  const [disabledCategories, setDisabledCategories] = useState<string[]>(initialDisabledCategories);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const patternsByCategory = getPatternsByCategory();
  const categories = Object.keys(patternsByCategory);

  // Count active patterns
  const activePatternCount = BUILT_IN_PATTERNS.filter(p => {
    if (disabledCategories.includes(p.category)) return false;
    if (disabledPatterns.includes(p.id)) return false;
    return true;
  }).length;

  // Filter patterns by search
  const filteredPatternsByCategory = Object.entries(patternsByCategory).reduce(
    (acc, [category, patterns]) => {
      if (searchQuery) {
        const filtered = patterns.filter(
          p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
      } else {
        acc[category] = patterns;
      }
      return acc;
    },
    {} as Record<string, Pattern[]>
  );

  // Toggle master switch
  async function handleMasterToggle(newValue: boolean) {
    if (!canEdit) return;
    setIsUpdating(true);
    try {
      const response = await fetch("/api/v1/prompt-guard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newValue }),
      });
      if (response.ok) {
        setIsEnabled(newValue);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update Prompt Guard settings:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  // Toggle individual pattern
  const handlePatternToggle = useCallback(
    async (patternId: string, enabled: boolean) => {
      if (!canEdit) return;

      // Optimistic update
      setDisabledPatterns(prev =>
        enabled ? prev.filter(id => id !== patternId) : [...prev, patternId]
      );

      try {
        const response = await fetch("/api/v1/prompt-guard/patterns", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pattern_id: patternId, enabled }),
        });

        if (!response.ok) {
          // Revert on error
          setDisabledPatterns(prev =>
            enabled ? [...prev, patternId] : prev.filter(id => id !== patternId)
          );
        }
      } catch (error) {
        console.error("Failed to toggle pattern:", error);
        // Revert on error
        setDisabledPatterns(prev =>
          enabled ? [...prev, patternId] : prev.filter(id => id !== patternId)
        );
      }
    },
    [canEdit]
  );

  // Toggle entire category
  const handleCategoryToggle = useCallback(
    async (category: string, enabled: boolean) => {
      if (!canEdit) return;

      const categoryPatternIds = patternsByCategory[category].map(p => p.id);

      // Optimistic update
      if (enabled) {
        setDisabledCategories(prev => prev.filter(c => c !== category));
        setDisabledPatterns(prev => prev.filter(id => !categoryPatternIds.includes(id)));
      } else {
        setDisabledCategories(prev => [...prev, category]);
        setDisabledPatterns(prev => prev.filter(id => !categoryPatternIds.includes(id)));
      }

      try {
        const response = await fetch("/api/v1/prompt-guard/patterns", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, enabled }),
        });

        if (!response.ok) {
          // Revert on error - reload the page to get fresh state
          router.refresh();
        }
      } catch (error) {
        console.error("Failed to toggle category:", error);
        router.refresh();
      }
    },
    [canEdit, patternsByCategory, router]
  );

  // Check if category is fully enabled, partially enabled, or fully disabled
  const getCategoryState = (category: string) => {
    if (disabledCategories.includes(category)) {
      return "disabled";
    }
    const categoryPatterns = patternsByCategory[category];
    const disabledCount = categoryPatterns.filter(p => disabledPatterns.includes(p.id)).length;
    if (disabledCount === 0) return "enabled";
    if (disabledCount === categoryPatterns.length) return "disabled";
    return "partial";
  };

  // Check if pattern is enabled
  const isPatternEnabled = (pattern: Pattern) => {
    if (disabledCategories.includes(pattern.category)) return false;
    return !disabledPatterns.includes(pattern.id);
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Expand all if searching
  const effectiveExpandedCategories = searchQuery
    ? new Set(Object.keys(filteredPatternsByCategory))
    : expandedCategories;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Prompt Guard
            </h1>
            <Badge
              variant={isEnabled ? "default" : "secondary"}
              className={isEnabled ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}
            >
              {isEnabled ? "Active" : "Disabled"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Automatically detect and block prompts containing credentials before they reach Claude
            Code. All checks run locally on developer machines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleMasterToggle}
            disabled={!canEdit || isUpdating}
          />
          <span className="text-sm text-muted-foreground">{isEnabled ? "Enabled" : "Disabled"}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activePatternCount}
              <span className="text-lg text-muted-foreground font-normal">
                /{BUILT_IN_PATTERNS.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Across {categories.length} categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pattern Version</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">v0.3.0</div>
            <p className="text-sm text-muted-foreground">Shipped with CLI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Privacy Mode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">100%</div>
            <p className="text-sm text-muted-foreground">Local processing only</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patterns..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pattern Categories - Collapsible */}
      <div className="space-y-2">
        {Object.entries(filteredPatternsByCategory).map(([category, patterns]) => {
          const Icon = CATEGORY_ICONS[category] || Shield;
          const colorClass = CATEGORY_COLORS[category] || "text-gray-500 bg-gray-500/10";
          const isExpanded = effectiveExpandedCategories.has(category);
          const categoryState = getCategoryState(category);
          const enabledCount = patterns.filter(p => isPatternEnabled(p)).length;

          return (
            <Card key={category} className="overflow-hidden">
              {/* Category Header - Always visible */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategoryExpansion(category)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-medium">{CATEGORY_NAMES[category] || category}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {enabledCount}/{patterns.length} active
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                  <Checkbox
                    checked={categoryState === "enabled"}
                    ref={(el: HTMLButtonElement | null) => {
                      if (el) {
                        (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate =
                          categoryState === "partial";
                      }
                    }}
                    onCheckedChange={(checked: boolean | "indeterminate") => handleCategoryToggle(category, !!checked)}
                    disabled={!canEdit}
                    className={cn(
                      "h-5 w-5",
                      categoryState === "partial" && "data-[state=checked]:bg-primary/50"
                    )}
                  />
                </div>
              </div>

              {/* Pattern List - Collapsible */}
              {isExpanded && (
                <div className="border-t">
                  {patterns.map(pattern => {
                    const patternEnabled = isPatternEnabled(pattern);
                    return (
                      <div
                        key={pattern.id}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors",
                          !patternEnabled && "opacity-50"
                        )}
                      >
                        <div className="flex-1 min-w-0 pl-11">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{pattern.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {pattern.description}
                          </p>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">
                            {getExampleForPattern(pattern.id)}
                          </code>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Switch
                            checked={patternEnabled}
                            onCheckedChange={checked => handlePatternToggle(pattern.id, checked)}
                            disabled={!canEdit || disabledCategories.includes(pattern.category)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info Boxes */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Privacy-First Design</AlertTitle>
        <AlertDescription>
          Prompt content never leaves developer machines. Blocked prompts are not logged or reported
          to Afterburn. This feature protects developers from accidental credential exposure —
          it&apos;s not a monitoring or compliance tool.
        </AlertDescription>
      </Alert>

      <Alert className="border-yellow-500/30 bg-yellow-500/5">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Coming in v0.4</AlertTitle>
        <AlertDescription>
          Custom patterns — define your own regex patterns for organization-specific credentials.
        </AlertDescription>
      </Alert>

      {!canEdit && (
        <Alert variant="destructive" className="border-muted bg-muted/50">
          <AlertDescription>
            Only workspace admins and owners can enable or disable Prompt Guard patterns.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
