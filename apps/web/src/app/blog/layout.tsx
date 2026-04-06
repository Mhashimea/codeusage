import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CodeusageLogoBrand } from "@/components/shared/CodeusageLogo";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/shared/SiteFooter";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <CodeusageLogoBrand size={32} />
              <span className="text-lg font-semibold">Codeusage</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
                Blog
              </Link>
              <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
                Docs
              </Link>
              <Link href="/login">
                <Button className="bg-[#D97757] hover:bg-[#c5684a] text-white">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 pt-24 pb-20">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
