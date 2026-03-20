import type { AgeGroupReport, DimensionScore } from "@/data/reportTheories";

interface ReportData {
  studentName: string;
  studentAge: number;
  ageGroup: number;
  submittedAt: string;
  reportConfig: AgeGroupReport;
  scores: DimensionScore[];
}

export function generateReportHtml(data: ReportData): string {
  const { studentName, studentAge, ageGroup, submittedAt, reportConfig, scores } = data;

  const highCount = scores.filter((s) => s.level === "High").length;
  const moderateCount = scores.filter((s) => s.level === "Moderate").length;
  const developingCount = scores.filter((s) => s.level === "Developing").length;

  const formattedDate = new Date(submittedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const reportId = `APD-${new Date(submittedAt).getFullYear()}-${String(new Date(submittedAt).getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  const levelPill = (level: string) => {
    if (level === "High") return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-weight:600;font-size:12px;background:#dff0d8;color:#2d6a2d;">${level}</span>`;
    if (level === "Moderate") return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-weight:600;font-size:12px;background:#fef3c7;color:#92400e;">${level}</span>`;
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-weight:600;font-size:12px;background:#fee2e2;color:#991b1b;">${level}</span>`;
  };

  const barColor = (s: DimensionScore) => s.level === "High" ? "#0e9a7b" : s.level === "Moderate" ? "#d97706" : "#e55a3c";

  const dimensionRows = scores.map((s) => {
    const isTop = s.level === "High";
    return `<div style="background:${isTop ? "#f5f3ff" : "#fff"};border:1.5px solid ${isTop ? "#7c3aed" : "#e2e0d8"};border-radius:12px;padding:16px 20px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
        <div><div style="font-weight:600;font-size:14px;color:#1a1a2e;">${s.dimension}</div><div style="font-size:12px;color:#6b6b8a;">${s.theory}</div></div>
        ${levelPill(s.level)}
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="flex:1;height:8px;background:#e2e0d8;border-radius:4px;overflow:hidden;">
          <div style="width:${s.percentage}%;height:100%;background:${barColor(s)};border-radius:4px;"></div>
        </div>
        <span style="font-size:13px;font-weight:700;color:#3a3a5c;min-width:40px;text-align:right;">${s.percentage}%</span>
      </div>
      <p style="font-size:12px;color:#6b6b8a;margin:0 0 4px 0;">${s.description}</p>
      <p style="font-size:12px;color:#3a3a5c;margin:0;line-height:1.6;">${s.interpretation}</p>
    </div>`;
  }).join("");

  const tableRows = scores.map((s) => `
    <tr style="border-bottom:1px solid #e2e0d8;">
      <td style="padding:10px 12px;font-weight:500;color:#3a3a5c;">${s.dimension}</td>
      <td style="padding:10px 12px;color:#6b6b8a;font-size:12px;">${s.theory}</td>
      <td style="padding:10px 12px;text-align:center;font-weight:600;color:#3a3a5c;">${s.percentage}%</td>
      <td style="padding:10px 12px;text-align:center;">${levelPill(s.level)}</td>
    </tr>`).join("");

  // AI recommendations
  const devScores = scores.filter(s => s.level === "Developing");
  const modScores = scores.filter(s => s.level === "Moderate");
  const highScores = scores.filter(s => s.level === "High");

  let recItems = "";
  if (devScores.length > 0) {
    recItems += devScores.map(s => `<li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5;"><span style="color:#0e9a7b;font-weight:600;flex-shrink:0;">→</span><span><strong>${s.dimension}</strong> needs focused attention. ${s.interpretation}</span></li>`).join("");
  } else if (modScores.length > 0) {
    recItems += modScores.slice(0, 3).map(s => `<li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5;"><span style="color:#0e9a7b;font-weight:600;flex-shrink:0;">→</span><span><strong>${s.dimension}</strong> is at a moderate level. ${s.interpretation}</span></li>`).join("");
  } else {
    recItems += `<li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5;"><span style="color:#0e9a7b;font-weight:600;flex-shrink:0;">→</span><span>All dimensions are performing at a <strong>high level</strong>. Continue with enrichment activities and advanced challenges.</span></li>`;
  }
  if (highScores.length > 0) {
    recItems += `<li style="display:flex;gap:12px;align-items:flex-start;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5;"><span style="color:#0e9a7b;font-weight:600;flex-shrink:0;">→</span><span>Leverage strengths in <strong>${highScores.map(s => s.dimension).join(", ")}</strong> to scaffold weaker areas through cross-domain activities.</span></li>`;
  }

  const theoryTags = reportConfig.theories.map(t =>
    `<span style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.65);font-size:11px;font-weight:500;padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);">${t}</span>`
  ).join(" ");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>APAS Diagnostic Report - ${studentName}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#f7f5f0;font-family:'DM Sans',sans-serif;color:#1a1a2e;padding:0;}
  .report{max-width:780px;margin:0 auto;padding:32px 24px;}
  @media print{body{padding:0;background:#fff;}.report{padding:16px;}}
</style>
</head><body><div class="report">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #1a1a2e;">
    <div>
      <div style="font-family:'DM Serif Display',serif;font-size:28px;color:#1a1a2e;letter-spacing:-0.5px;">APAS <span style="color:#0e9a7b;font-style:italic;">Diagnostic</span></div>
      <div style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#6b6b8a;margin-top:4px;">Personalized Learner Report · Phase 1</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;color:#6b6b8a;font-weight:300;">Report ID: ${reportId}</div>
      <div style="font-size:13px;font-weight:500;color:#3a3a5c;margin-top:2px;">${formattedDate}</div>
      <span style="display:inline-block;background:#0e9a7b;color:white;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-top:6px;">Assessment Complete</span>
    </div>
  </div>

  <!-- LEARNER CARD -->
  <div style="background:#1a1a2e;color:white;border-radius:16px;padding:24px 28px;margin-bottom:28px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
    <div>
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:4px;">Learner</div>
      <div style="font-family:'DM Serif Display',serif;font-size:18px;">${studentName}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.55);">Age ${studentAge}</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:4px;">Age Group</div>
      <div style="font-family:'DM Serif Display',serif;font-size:18px;">${ageGroup}+ years</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.55);">${reportConfig.title}</div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:4px;">Theories Applied</div>
      <div style="font-family:'DM Serif Display',serif;font-size:18px;">${reportConfig.theories[0]}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.55);">${reportConfig.theories.slice(1).join(" · ")}</div>
    </div>
  </div>

  <!-- SUMMARY -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;">
    <div style="background:#dff0d8;border:1px solid rgba(45,106,45,0.2);border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#2d6a2d;">${highCount}</div>
      <div style="font-size:12px;font-weight:500;color:#2d6a2d;">Strong Areas</div>
    </div>
    <div style="background:#fef3c7;border:1px solid rgba(146,64,14,0.2);border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#92400e;">${moderateCount}</div>
      <div style="font-size:12px;font-weight:500;color:#92400e;">Moderate Areas</div>
    </div>
    <div style="background:#fee2e2;border:1px solid rgba(153,27,27,0.2);border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#991b1b;">${developingCount}</div>
      <div style="font-size:12px;font-weight:500;color:#991b1b;">Needs Attention</div>
    </div>
  </div>

  <!-- DIMENSION ANALYSIS -->
  <div style="margin-bottom:28px;">
    <h2 style="font-family:'DM Serif Display',serif;font-size:20px;color:#1a1a2e;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
      <span style="display:block;width:4px;height:22px;border-radius:2px;background:#0e9a7b;"></span>Dimension Analysis
    </h2>
    ${dimensionRows}
  </div>

  <!-- SCORE TABLE -->
  <div style="margin-bottom:28px;">
    <h2 style="font-family:'DM Serif Display',serif;font-size:20px;color:#1a1a2e;margin-bottom:16px;display:flex;align-items:center;gap:10px;">
      <span style="display:block;width:4px;height:22px;border-radius:2px;background:#0e9a7b;"></span>Assessment Score Breakdown
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;background:#fff;border:1px solid #e2e0d8;border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="border-bottom:2px solid #e2e0d8;">
          <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6b6b8a;padding:10px 12px;">Dimension</th>
          <th style="text-align:left;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6b6b8a;padding:10px 12px;">Theory</th>
          <th style="text-align:center;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6b6b8a;padding:10px 12px;">Score</th>
          <th style="text-align:center;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6b6b8a;padding:10px 12px;">Level</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <!-- AI RECOMMENDATIONS -->
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:24px 28px;color:white;margin-bottom:28px;">
    <div style="font-family:'DM Serif Display',serif;font-size:18px;color:white;margin-bottom:4px;">AI Instructional Recommendations</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:20px;letter-spacing:1px;text-transform:uppercase;">Generated by APAS Engine · Curative Phase Inputs</div>
    <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;padding:0;">${recItems}</ul>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
      ${theoryTags}
      <span style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.65);font-size:11px;font-weight:500;padding:4px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);">Age Group: ${ageGroup}+</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #e2e0d8;padding-top:16px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:11px;color:#6b6b8a;">This report is auto-generated by the APAS AI engine. For academic use only.</div>
    <div style="font-family:'DM Serif Display',serif;font-size:14px;color:#3a3a5c;font-style:italic;">APAS · ${new Date().getFullYear()}</div>
  </div>

</div></body></html>`;
}
