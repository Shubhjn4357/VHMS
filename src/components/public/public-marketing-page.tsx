import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PublicSiteChrome } from "@/components/public/public-site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { MarketingPageContent } from "@/lib/public-site/marketing-pages";

type PublicMarketingPageProps = {
  content: MarketingPageContent;
  supportCards?: Array<{
    label: string;
    value: string;
  }>;
};

export async function PublicMarketingPage({
  content,
  supportCards = [],
}: PublicMarketingPageProps) {
  return (
    <PublicSiteChrome>
      <div className="space-y-6">
        <section className="glass-panel-strong rounded-[36px] p-6 sm:p-8">
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <PageHeader
              actions={
                <Badge className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]">
                  {content.badge}
                </Badge>
              }
              className="border-none bg-transparent p-0 shadow-none"
              description={content.description}
              eyebrow={content.eyebrow}
              title={content.title}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              {content.metrics.map((metric) => (
                <SurfaceCard className="rounded-[26px]" key={metric.label}>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {metric.detail}
                  </p>
                </SurfaceCard>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            {content.sections.map((section, index) => (
              <SurfaceCard className="rounded-[30px]" key={section.title}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                      Section {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {section.title}
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
                      {section.detail}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {section.points.map((point) => (
                    <div
                      className="glass-panel-muted flex items-start gap-3 rounded-[22px] px-4 py-4"
                      key={point}
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <p className="text-sm leading-7 text-foreground">{point}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            ))}
          </div>

          <div className="space-y-6">
            <SurfaceCard className="rounded-[30px]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                Common questions
              </p>
              <div className="mt-5 space-y-4">
                {content.faqs.map((faq) => (
                  <div
                    className="glass-panel-muted rounded-[22px] px-4 py-4"
                    key={faq.question}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {faq.question}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            {supportCards.length > 0
              ? (
                <SurfaceCard className="rounded-[30px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                    Live contact data
                  </p>
                  <div className="mt-5 grid gap-3">
                    {supportCards.map((card) => (
                      <div
                        className="metric-tile rounded-[22px] px-4 py-4"
                        key={card.label}
                      >
                        <p className="text-sm text-muted-foreground">{card.label}</p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {card.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              )
              : null}

            <SurfaceCard className="grid-backdrop rounded-[30px]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                Next step
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {content.ctaTitle}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {content.ctaDetail}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={content.ctaPrimaryHref}>
                    {content.ctaPrimaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={content.ctaSecondaryHref}>
                    {content.ctaSecondaryLabel}
                  </Link>
                </Button>
              </div>
            </SurfaceCard>
          </div>
        </section>
      </div>
    </PublicSiteChrome>
  );
}
