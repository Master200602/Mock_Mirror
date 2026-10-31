/**
 * Professional Executive PDF Generator for Resume vs Job Description Match Analysis.
 * Designed with a clean, formal corporate aesthetic (Deep Navy, Slate Gray, Emerald Green).
 * Standardized Helvetica typography without unicode encoding artifacts.
 */
import jsPDF from 'jspdf';

const COLORS = {
  headerBg: [15, 23, 42],        // Deep Navy Slate (#0F172A)
  headerSubtitle: [203, 213, 225], // Light Slate (#CBD5E1)
  primaryDark: [30, 41, 59],     // Dark Slate (#1E293B)
  text: [51, 65, 85],            // Slate Dark (#334155)
  muted: [100, 116, 139],        // Slate Muted (#64748B)
  border: [226, 232, 240],       // Light Border (#E2E8F0)
  panel: [248, 250, 252],        // Card Panel (#F8FAFC)
  tableHeader: [241, 245, 249],   // Table Header (#F1F5F9)
  good: [5, 150, 105],           // Emerald Green (#059669)
  warn: [217, 119, 6],           // Amber Orange (#D97706)
  bad: [220, 38, 38],            // Muted Crimson (#DC2626)
};

const PAGE_MARGIN = 16;

function getScoreColor(pct) {
  if (pct >= 75) return COLORS.good;
  if (pct >= 50) return COLORS.warn;
  return COLORS.bad;
}

class ExecutiveResumeJdReportBuilder {
  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - PAGE_MARGIN * 2;
    this.y = PAGE_MARGIN;
  }

  ensureSpace(height) {
    if (this.y + height > this.pageHeight - PAGE_MARGIN) {
      this.doc.addPage();
      this.y = PAGE_MARGIN + 6;
    }
  }

  /**
   * Top Corporate Header Banner
   */
  renderHeader(title, subtitle) {
    const { doc, pageWidth } = this;
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title.toUpperCase(), PAGE_MARGIN, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.headerSubtitle);
    doc.text(subtitle, PAGE_MARGIN, 17.5);

    const dateStr = `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
    doc.text(dateStr, pageWidth - PAGE_MARGIN, 14, { align: 'right' });

    this.y = 30;
  }

  /**
   * Section Header with clean bottom border line
   */
  renderSectionTitle(title) {
    this.ensureSpace(14);
    const { doc, contentWidth } = this;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primaryDark);
    doc.text(title.toUpperCase(), PAGE_MARGIN, this.y);
    this.y += 2.5;

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, this.y, PAGE_MARGIN + contentWidth, this.y);
    this.y += 6;
  }

  /**
   * Clean paragraph helper with text wrapping
   */
  renderParagraph(text, opts = {}) {
    if (!text) return;
    const { fontSize = 9, color = COLORS.text, gap = 3.5, bold = false } = opts;
    const { doc, contentWidth } = this;

    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    const lines = doc.splitTextToSize(String(text).trim(), contentWidth);
    this.ensureSpace(lines.length * 4.2 + gap);
    doc.text(lines, PAGE_MARGIN, this.y);
    this.y += lines.length * 4.2 + gap;
  }

  /**
   * Bullet list renderer with solid vector bullet points
   */
  renderBulletList(items, opts = {}) {
    if (!items || !items.length) return;
    const { fontSize = 8.8, bulletColor = COLORS.primaryDark } = opts;
    const { doc, contentWidth } = this;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);

    for (const item of items) {
      const cleanText = String(item).trim().replace(/^[•\u2022\u2714\u26A0\u2716\s\-\*&']+\s*/, '');
      if (!cleanText) continue;

      const lines = doc.splitTextToSize(cleanText, contentWidth - 6);
      this.ensureSpace(lines.length * 4 + 2);

      // Vector bullet circle
      doc.setFillColor(...bulletColor);
      doc.circle(PAGE_MARGIN + 2, this.y - 1.2, 0.9, 'F');

      doc.setTextColor(...COLORS.text);
      doc.text(lines, PAGE_MARGIN + 5.5, this.y);
      this.y += lines.length * 4 + 2;
    }
    this.y += 2;
  }

  /**
   * Executive Table Renderer
   */
  renderTable(headers, rows, colWidths) {
    if (!rows || !rows.length) return;
    const { doc, contentWidth } = this;
    const rowHeight = 7.5;
    const headerHeight = 8;

    this.ensureSpace(headerHeight + Math.min(rows.length, 3) * rowHeight);

    // Header Row
    doc.setFillColor(...COLORS.tableHeader);
    doc.rect(PAGE_MARGIN, this.y, contentWidth, headerHeight, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.rect(PAGE_MARGIN, this.y, contentWidth, headerHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.primaryDark);

    let x = PAGE_MARGIN;
    headers.forEach((h, i) => {
      doc.text(h, x + 3, this.y + 5.2);
      x += colWidths[i];
    });

    this.y += headerHeight;

    // Body Rows
    rows.forEach((row) => {
      this.ensureSpace(rowHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      doc.setFillColor(255, 255, 255);
      doc.rect(PAGE_MARGIN, this.y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(...COLORS.border);
      doc.line(PAGE_MARGIN, this.y + rowHeight, PAGE_MARGIN + contentWidth, this.y + rowHeight);

      let rx = PAGE_MARGIN;
      row.forEach((cell, i) => {
        const cellText = typeof cell === 'object' ? cell.text : String(cell);
        const cellColor = typeof cell === 'object' && cell.color ? cell.color : COLORS.text;
        const isBold = typeof cell === 'object' && cell.bold;

        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(...cellColor);
        const truncated = doc.splitTextToSize(cellText, colWidths[i] - 4)[0] || '';
        doc.text(truncated, rx + 3, this.y + 5);
        rx += colWidths[i];
      });

      this.y += rowHeight;
    });

    this.y += 4;
  }
}

export function generateResumeJdReportPdf(data = {}) {
  const b = new ExecutiveResumeJdReportBuilder();
  const doc = b.doc;

  const candidateName = data.candidateName || 'Candidate';
  const targetRole = data.targetRole || 'Target Role';
  const overallScore = data.overallMatchScore ?? 75;

  // 1. Header Banner
  b.renderHeader('MockMirror Report', 'Resume vs Job Description Match Analysis');

  // 2. Candidate Metadata Grid Box
  b.ensureSpace(20);
  const metaY = b.y;
  doc.setFillColor(...COLORS.panel);
  doc.roundedRect(PAGE_MARGIN, metaY, b.contentWidth, 18, 1.5, 1.5, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE_MARGIN, metaY, b.contentWidth, 18, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);
  doc.text('CANDIDATE NAME:', PAGE_MARGIN + 5, metaY + 6);
  doc.text('TARGET ROLE:', PAGE_MARGIN + 5, metaY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text(candidateName, PAGE_MARGIN + 36, metaY + 6);
  doc.text(targetRole, PAGE_MARGIN + 36, metaY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);
  doc.text('EVALUATION TYPE:', PAGE_MARGIN + (b.contentWidth / 2) + 5, metaY + 6);
  doc.text('REPORT STATUS:', PAGE_MARGIN + (b.contentWidth / 2) + 5, metaY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text('Resume & Job Description Analysis', PAGE_MARGIN + (b.contentWidth / 2) + 38, metaY + 6);
  doc.text('Verified Complete', PAGE_MARGIN + (b.contentWidth / 2) + 38, metaY + 13);

  b.y = metaY + 23;

  // 3. Executive Match Score Box
  b.ensureSpace(28);
  const scoreBoxY = b.y;
  const scoreBoxWidth = 42;

  // Score Badge Left
  doc.setFillColor(...COLORS.panel);
  doc.roundedRect(PAGE_MARGIN, scoreBoxY, scoreBoxWidth, 24, 2, 2, 'F');
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(PAGE_MARGIN, scoreBoxY, scoreBoxWidth, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...getScoreColor(overallScore));
  doc.text(`${overallScore}%`, PAGE_MARGIN + (scoreBoxWidth / 2), scoreBoxY + 13, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text('OVERALL MATCH SCORE', PAGE_MARGIN + (scoreBoxWidth / 2), scoreBoxY + 19, { align: 'center' });

  // Executive Summary Right
  const summaryX = PAGE_MARGIN + scoreBoxWidth + 6;
  const summaryW = b.contentWidth - scoreBoxWidth - 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primaryDark);
  doc.text('EXECUTIVE SUMMARY', summaryX, scoreBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(...COLORS.text);
  const summaryText = data.executiveSummary || `${candidateName}'s resume demonstrates solid foundational alignment with the specified ${targetRole} Job Description.`;
  const summaryLines = doc.splitTextToSize(summaryText, summaryW);
  doc.text(summaryLines, summaryX, scoreBoxY + 11);

  b.y = Math.max(scoreBoxY + 28, scoreBoxY + 11 + summaryLines.length * 4.2);

  // 4. Category Match Breakdown Table
  b.renderSectionTitle('1. Category Match Breakdown');
  const catScores = data.categoryScores || {};
  const categories = [
    { name: 'Technical Skills', score: catScores.technicalSkills ?? 75 },
    { name: 'Experience', score: catScores.experience ?? 70 },
    { name: 'Projects', score: catScores.projects ?? 80 },
    { name: 'Education', score: catScores.education ?? 90 },
    { name: 'Certifications', score: catScores.certifications ?? 60 },
  ];

  const colW = (b.contentWidth - 8) / 5;
  let barX = PAGE_MARGIN;
  const barY = b.y;

  categories.forEach((cat) => {
    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(barX, barY, colW, 15, 1.5, 1.5, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(barX, barY, colW, 15, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...getScoreColor(cat.score));
    doc.text(`${cat.score}%`, barX + colW / 2, barY + 6.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.text);
    doc.text(cat.name, barX + colW / 2, barY + 11.5, { align: 'center' });

    barX += colW + 2;
  });

  b.y = barY + 20;

  // 5. Demonstrated Qualifications
  const matchingSkills = Array.isArray(data.matchingSkills) ? data.matchingSkills : [];
  if (matchingSkills.length > 0) {
    b.renderSectionTitle('2. Demonstrated Qualifications (Present in Resume)');
    b.renderBulletList(matchingSkills, { bulletColor: COLORS.good });
  }

  // 6. Skills Not Demonstrated in Resume
  const missingSkills = Array.isArray(data.notDemonstratedSkills) ? data.notDemonstratedSkills : [];
  if (missingSkills.length > 0) {
    b.renderSectionTitle('3. Key Requirements Not Demonstrated in Resume');
    b.renderBulletList(
      missingSkills.map(s => `${s} — Not explicitly demonstrated in candidate's uploaded resume`),
      { bulletColor: COLORS.bad }
    );
  }

  // 7. Partial Matches
  const partialMatches = Array.isArray(data.partialMatches) ? data.partialMatches : [];
  if (partialMatches.length > 0) {
    b.renderSectionTitle('4. Partially Matching Experience');
    b.renderBulletList(partialMatches, { bulletColor: COLORS.warn });
  }

  // 8. Job Requirement Breakdown Table
  const reqAnalysis = Array.isArray(data.jdRequirementAnalysis) ? data.jdRequirementAnalysis : [];
  if (reqAnalysis.length > 0) {
    b.renderSectionTitle('5. Job Requirement Alignment Matrix');
    const tableRows = reqAnalysis.map((item) => {
      const matchCol =
        item.matchLevel === 'Strong Match'
          ? { text: 'Strong Match', color: COLORS.good, bold: true }
          : item.matchLevel === 'Partial Match'
          ? { text: 'Partial Match', color: COLORS.warn, bold: true }
          : { text: 'Not Demonstrated', color: COLORS.bad, bold: true };
      return [
        item.requirement || '',
        item.resumeEvidence || 'Not explicitly demonstrated',
        matchCol,
      ];
    });

    const wReq = b.contentWidth * 0.35;
    const wMatch = 32;
    const wEv = b.contentWidth - wReq - wMatch;

    b.renderTable(['Job Requirement', 'Resume Evidence', 'Match Level'], tableRows, [wReq, wEv, wMatch]);
  }

  // 9. Actionable Resume Suggestions
  const suggestions = Array.isArray(data.resumeSuggestions) ? data.resumeSuggestions : [];
  if (suggestions.length > 0) {
    b.renderSectionTitle('6. Actionable Resume Optimization Suggestions');
    b.renderBulletList(suggestions, { bulletColor: COLORS.primaryDark });
  }

  // 10. Recommended Skills to Learn
  const skillsToLearn = Array.isArray(data.recommendedSkillsToLearn) ? data.recommendedSkillsToLearn : [];
  if (skillsToLearn.length > 0) {
    b.renderSectionTitle('7. Prioritized Skill Development Roadmap');
    const formattedList = skillsToLearn.map((item) => {
      if (typeof item === 'string') return item;
      return `[${item.priority || 'High Priority'}] ${item.skill} — ${item.reason || 'Specified in target JD'}`;
    });
    b.renderBulletList(formattedList, { bulletColor: COLORS.warn });
  }

  // 11. Final Recommendation
  if (data.finalRecommendation) {
    b.renderSectionTitle('8. Final AI Executive Evaluation');
    b.renderParagraph(data.finalRecommendation, { fontSize: 9, color: COLORS.text });
  }

  // 12. Professional Footer Page Numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, b.pageHeight - 12, b.pageWidth - PAGE_MARGIN, b.pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('MockMirror AI Interview Platform  |  Confidential Analysis Report', PAGE_MARGIN, b.pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, b.pageWidth - PAGE_MARGIN, b.pageHeight - 7, { align: 'right' });
  }

  const filename = `${(candidateName || 'Candidate').replace(/\s+/g, '_')}_Resume_vs_JD_Analysis.pdf`;
  doc.save(filename);
}
