export interface WeeklyMetrics {
  period: { start: string; end: string };
  pageViews: number;
  uniqueVisitors: number;
  signups: number;
  documentsCreated: number;
  agentInteractions: number;
  upgradeClicks: number;
  topPages: { path: string; views: number }[];
  conversionRate: number;
}

export interface WeeklyReport {
  metrics: WeeklyMetrics;
  insights: string[];
  actionItems: string[];
  html: string;
}

function weekRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/**
 * Replace this stub with real queries against your analytics store
 * (e.g. PostHog API, GA4 Data API, or your own DB).
 */
async function fetchMetrics(): Promise<WeeklyMetrics> {
  const period = weekRange();

  // TODO: wire up real data sources
  return {
    period,
    pageViews: 0,
    uniqueVisitors: 0,
    signups: 0,
    documentsCreated: 0,
    agentInteractions: 0,
    upgradeClicks: 0,
    topPages: [],
    conversionRate: 0,
  };
}

function deriveInsights(m: WeeklyMetrics): string[] {
  const insights: string[] = [];

  if (m.signups > 0 && m.uniqueVisitors > 0) {
    const rate = ((m.signups / m.uniqueVisitors) * 100).toFixed(1);
    insights.push(`Visitor-to-signup conversion rate: ${rate}%`);
  }

  if (m.agentInteractions > 0 && m.signups > 0) {
    const ratio = (m.agentInteractions / m.signups).toFixed(1);
    insights.push(
      `Average agent interactions per new signup: ${ratio}`
    );
  }

  if (m.topPages.length > 0) {
    insights.push(
      `Top page: ${m.topPages[0].path} (${m.topPages[0].views} views)`
    );
  }

  if (insights.length === 0) {
    insights.push("No data collected yet — verify analytics integration.");
  }

  return insights;
}

function deriveActionItems(m: WeeklyMetrics): string[] {
  const items: string[] = [];

  if (m.signups === 0) {
    items.push("Investigate zero signups — check funnel for drop-off.");
  }
  if (m.upgradeClicks === 0 && m.signups > 5) {
    items.push(
      "No upgrade clicks despite signups — consider improving upgrade prompts."
    );
  }
  if (m.documentsCreated === 0 && m.signups > 0) {
    items.push(
      "Users signing up but not creating documents — review onboarding flow."
    );
  }
  if (items.length === 0) {
    items.push("All metrics healthy — keep monitoring.");
  }

  return items;
}

function renderHtml(report: Omit<WeeklyReport, "html">): string {
  const { metrics: m, insights, actionItems } = report;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h1 style="font-size: 22px; margin-bottom: 4px;">Knobase Weekly Report</h1>
  <p style="color: #666; margin-top: 0;">${m.period.start} &mdash; ${m.period.end}</p>

  <h2 style="font-size: 16px; margin-top: 28px;">Key Metrics</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">Page Views</td><td style="text-align: right; border-bottom: 1px solid #eee;"><strong>${m.pageViews.toLocaleString()}</strong></td></tr>
    <tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">Unique Visitors</td><td style="text-align: right; border-bottom: 1px solid #eee;"><strong>${m.uniqueVisitors.toLocaleString()}</strong></td></tr>
    <tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">Signups</td><td style="text-align: right; border-bottom: 1px solid #eee;"><strong>${m.signups}</strong></td></tr>
    <tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">Documents Created</td><td style="text-align: right; border-bottom: 1px solid #eee;"><strong>${m.documentsCreated}</strong></td></tr>
    <tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">Agent Interactions</td><td style="text-align: right; border-bottom: 1px solid #eee;"><strong>${m.agentInteractions}</strong></td></tr>
    <tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">Upgrade Clicks</td><td style="text-align: right; border-bottom: 1px solid #eee;"><strong>${m.upgradeClicks}</strong></td></tr>
    <tr><td style="padding: 6px 0;">Conversion Rate</td><td style="text-align: right;"><strong>${m.conversionRate.toFixed(1)}%</strong></td></tr>
  </table>

  ${m.topPages.length > 0 ? `
  <h2 style="font-size: 16px; margin-top: 28px;">Top Pages</h2>
  <ol style="padding-left: 20px;">
    ${m.topPages.map((p) => `<li>${p.path} &mdash; ${p.views} views</li>`).join("\n    ")}
  </ol>` : ""}

  <h2 style="font-size: 16px; margin-top: 28px;">Insights</h2>
  <ul style="padding-left: 20px;">
    ${insights.map((i) => `<li>${i}</li>`).join("\n    ")}
  </ul>

  <h2 style="font-size: 16px; margin-top: 28px;">Action Items</h2>
  <ul style="padding-left: 20px;">
    ${actionItems.map((a) => `<li>${a}</li>`).join("\n    ")}
  </ul>

  <p style="color: #999; font-size: 12px; margin-top: 32px;">Sent by Knobase Analytics</p>
</body>
</html>`.trim();
}

export async function generateWeeklyReport(): Promise<WeeklyReport> {
  const metrics = await fetchMetrics();
  const insights = deriveInsights(metrics);
  const actionItems = deriveActionItems(metrics);
  const html = renderHtml({ metrics, insights, actionItems });

  return { metrics, insights, actionItems, html };
}
