import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { MockBanner } from "@/components/blog/MockBanner";

export const metadata: Metadata = {
  title: "Blog | Codeusage",
  description: "Updates and thoughts from the Codeusage team on AI coding tools, developer productivity, and engineering management.",
  openGraph: {
    title: "Blog | Codeusage",
    description: "Updates and thoughts from the Codeusage team on AI coding tools, developer productivity, and engineering management.",
    url: "https://codeusage.dev/blog",
    siteName: "Codeusage",
    type: "website",
  },
  alternates: {
    canonical: "https://codeusage.dev/blog",
  },
};

const posts = [
  {
    slug: "ai-coding-tool-tracking-teams",
    title:
      "We Built Codeusage Because Nobody Knows How Their Team Uses AI Coding Tools",
    excerpt:
      "Teams are rolling out AI coding tools fast. But there's no dashboard, no tracking, no way to know who's using them or on which projects. We built Codeusage to fix that.",
    date: "2026-04-06",
    readTime: "4 min read",
    tags: ["launch", "developer-tools", "ai"],
  },
];

export default function BlogPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-3xl font-bold mb-2">Blog</h1>
        <p className="text-muted-foreground">
          Updates and thoughts from the Codeusage team.
        </p>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}>
            <article className="group rounded-xl border border-border/50 bg-card overflow-hidden hover:border-[#D97757]/30 transition-all">
              <div className="border-b border-border/30">
                <MockBanner />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
                <h2 className="text-xl font-semibold mb-2 group-hover:text-[#D97757] transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-muted/50 border border-border/50 rounded-full px-3 py-1 text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
