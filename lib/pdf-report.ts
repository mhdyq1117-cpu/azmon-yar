"use client";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import type { FullQuestion, Submission } from "@/lib/types";
import { computeStats, finalScore } from "@/lib/report-stats";
import { faDateTime, faDigits } from "@/lib/fa";

/**
 * تولید خروجی PDF نتایج آزمون — فارسی، راست‌چین، A4
 * محتوا با فونت وزیرمتن در DOM رندر و با html2canvas-pro تصویربرداری می‌شود
 * (پشتیبانی کامل از شکل‌دهی حروف فارسی و رنگ‌های مدرن Tailwind 4)
 */
export async function generateResultsPdf(opts: {
  quizTitle: string;
  submissions: Submission[];
  questions: FullQuestion[];
  reportEl: HTMLElement;
  fileName: string;
}): Promise<void> {
  const canvas = await html2canvas(opts.reportEl, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW;
  const imgHTotal = (canvas.height * imgW) / canvas.width;
  const pageSliceH = (pageH * canvas.width) / imgW; // ارتفاع هر صفحه به پیکسل بوم

  let rendered = 0;
  let pageIndex = 0;
  while (rendered < canvas.height - 2) {
    const sliceH = Math.min(pageSliceH, canvas.height - rendered);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.ceil(sliceH);
    const pctx = pageCanvas.getContext("2d");
    if (!pctx) break;
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(
      pageCanvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      imgW,
      (sliceH * imgW) / canvas.width,
      undefined,
      "FAST"
    );
    rendered += sliceH;
    pageIndex++;
    if (pageIndex > 60) break; // محافظت در برابر حلقه بی‌پایان
  }

  pdf.save(opts.fileName);
}

/** ردیف‌های گزارش به ترتیب شرکت (اولین شرکت‌کننده تا آخرین) */
export interface ReportRow {
  row: number;
  name: string;
  entryAt: string;
  submitAt: string;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number | null;
}

export function buildReportRows(submissions: Submission[], questions: FullQuestion[]): ReportRow[] {
  const chronological = [...submissions].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
  );
  return chronological.map((s, i) => {
    const stats = computeStats(s, questions);
    return {
      row: i + 1,
      name: s.student_name,
      entryAt: faDateTime(s.started_at ?? s.submitted_at),
      submitAt: faDateTime(s.submitted_at),
      correct: stats.correct,
      incorrect: stats.incorrect,
      unanswered: stats.unanswered,
      score: finalScore(s),
    };
  });
}

/** شماره فایل: عنوان آزمون + تاریخ شمسی خروجی */
export function pdfFileName(quizTitle: string): string {
  const date = new Date().toLocaleDateString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" });
  const safe = quizTitle.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60).trim();
  return `${safe} - نتایج ${faDigits(date)}.pdf`;
}
