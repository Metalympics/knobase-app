import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReport } from "@/lib/reports/weekly";

/**
 * POST /api/reports/send
 *
 * Generates the weekly analytics report and "sends" it.
 *
 * In production, wire this up to your email provider (Resend, SendGrid, etc.).
 * Trigger via cron (e.g. Vercel Cron, GitHub Actions) every Monday morning:
 *   curl -X POST https://your-app.com/api/reports/send \
 *        -H "Authorization: Bearer $REPORT_SECRET"
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.REPORT_SECRET;

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await generateWeeklyReport();

    // TODO: Replace with real email sending — e.g. Resend, SendGrid, SES
    // await sendEmail({
    //   to: "team@knobase.com",
    //   subject: `Knobase Weekly Report: ${report.metrics.period.start} – ${report.metrics.period.end}`,
    //   html: report.html,
    // });

    return NextResponse.json({
      ok: true,
      period: report.metrics.period,
      summary: {
        pageViews: report.metrics.pageViews,
        signups: report.metrics.signups,
        documentsCreated: report.metrics.documentsCreated,
        insights: report.insights.length,
        actionItems: report.actionItems.length,
      },
      html: report.html,
    });
  } catch (error) {
    console.error("Failed to generate weekly report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
