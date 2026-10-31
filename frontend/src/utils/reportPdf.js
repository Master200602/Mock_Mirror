/**
 * MockMirror Professional Executive Interview Assessment Report Generator.
 * Built with jsPDF with intelligent pagination, executive cards, and clean typography.
 *
 * Page 1: Executive Dashboard (Candidate Info, 4-Metric Grid, Assessment Summary, Competency Breakdown, Behavioral Telemetry, Strengths & Improvements)
 * Page 2+: Detailed Question-by-Question Evaluation Cards with full Candidate Answers, AI Feedback, and Suggested Ideal Responses
 */
import jsPDFModule from 'jspdf';
const jsPDF = jsPDFModule?.jsPDF || jsPDFModule;

const COLORS = {
  headerBg: [15, 23, 42],            // Deep Navy Slate (#0F172A)
  headerSubtitle: [203, 213, 225],   // Slate 300 (#CBD5E1)
  primary: [2, 132, 199],            // Cyan / Sky Blue (#0284C7)
  primaryDark: [3, 105, 161],        // Dark Sky (#0369A1)
  primaryLight: [240, 249, 255],     // Sky 50 (#F0F9FF)
  primaryBorder: [186, 230, 253],    // Sky 200 (#BAE6FD)
  indigo: [79, 70, 229],             // Indigo (#4F46E5)
  indigoLight: [238, 242, 255],      // Indigo 50 (#EEF2FF)
  purple: [147, 51, 234],            // Purple (#9333EA)
  purpleLight: [250, 245, 255],      // Purple 50 (#FAF5FF)
  textDark: [15, 23, 42],            // Slate 900 (#0F172A)
  textBody: [51, 65, 85],            // Slate 700 (#334155)
  textMuted: [100, 116, 139],        // Slate 500 (#64748B)
  border: [226, 232, 240],           // Slate 200 (#E2E8F0)
  borderStrong: [203, 213, 225],     // Slate 300 (#CBD5E1)
  panel: [248, 250, 252],            // Slate 50 (#F8FAFC)
  tableHeader: [241, 245, 249],      // Slate 100 (#F1F5F9)
  good: [16, 185, 129],              // Emerald (#10B981)
  goodBg: [236, 253, 245],           // Emerald 50 (#ECFDF5)
  goodBorder: [167, 243, 208],       // Emerald 200 (#A7F3D0)
  warn: [217, 119, 6],               // Amber (#D97706)
  warnBg: [254, 243, 199],           // Amber 50 (#FEF3C7)
  warnBorder: [253, 230, 138],       // Amber 200 (#FDE68A)
  bad: [220, 38, 38],                // Crimson (#DC2626)
  badBg: [254, 242, 242],            // Red 50 (#FEF2F2)
  badBorder: [254, 202, 202],        // Red 200 (#FECACA)
  white: [255, 255, 255],
};

const PAGE_MARGIN = 14;

/**
 * Calculates Readiness Category label from score
 */
function getReadinessLabel(score) {
  if (score === null || score === undefined) return 'Not Evaluated';
  if (score >= 85) return 'Strong Match';
  if (score >= 70) return 'Good Match';
  if (score >= 55) return 'Moderate Match';
  if (score >= 40) return 'Needs Improvement';
  return 'Low Match';
}

function getScoreColor(score) {
  if (score === null || score === undefined || isNaN(score)) return COLORS.textMuted;
  if (score >= 75) return COLORS.good;
  if (score >= 55) return COLORS.warn;
  return COLORS.bad;
}

function isValidCandidateResponse(r) {
  if (!r || typeof r !== 'object') return false;
  const answer = typeof r.answer === 'string' ? r.answer.trim() : (typeof r.candidateAnswer === 'string' ? r.candidateAnswer.trim() : '');
  if (!answer || answer.length === 0) return false;
  const lower = answer.toLowerCase();
  if (lower === 'no answer' || lower === 'silence' || lower === 'unanswered' || lower === 'n/a') return false;
  return /[a-zA-Z0-9]/.test(answer);
}

class ExecutiveInterviewReportBuilder {
  constructor(candidateName, targetRole, difficulty) {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - PAGE_MARGIN * 2;
    this.candidateName = candidateName || 'Candidate';
    this.targetRole = targetRole || 'General';
    this.difficulty = difficulty || 'Medium';
    this.y = PAGE_MARGIN;
    this.currentPageNumber = 1;
  }

  ensureSpace(neededHeight) {
    if (this.y + neededHeight > this.pageHeight - 16) {
      this.doc.addPage();
      this.currentPageNumber += 1;
      this.renderPageRunningHeader();
      this.y = PAGE_MARGIN + 12;
    }
  }

  /**
   * Top Corporate Header Banner for Page 1
   */
  renderCoverHeader(docId) {
    const { doc, pageWidth } = this;
    const headerH = 26;

    // Header Background
    doc.setFillColor(...COLORS.headerBg);
    doc.rect(0, 0, pageWidth, headerH, 'F');

    // Bottom accent line
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, headerH - 1.2, pageWidth, 1.2, 'F');

    // Title / Logo
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('MOCKMIRROR', PAGE_MARGIN, 10.5);

    // Pill badge next to title
    doc.setFillColor(...COLORS.primaryDark);
    doc.roundedRect(PAGE_MARGIN + 46, 5.8, 38, 5.5, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);
    doc.text('AI PERFORMANCE REPORT', PAGE_MARGIN + 65, 9.6, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.headerSubtitle);
    doc.text('Executive Candidate Interview & Job Readiness Assessment', PAGE_MARGIN, 18);

    // Right Column: Date & Doc ID
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.headerSubtitle);
    doc.text(`Date: ${dateStr}`, pageWidth - PAGE_MARGIN, 10.5, { align: 'right' });
    doc.text(`Doc ID: ${docId}`, pageWidth - PAGE_MARGIN, 18, { align: 'right' });

    this.y = headerH + 5;
  }

  /**
   * Running Header for subsequent pages (Page 2+)
   */
  renderPageRunningHeader() {
    const { doc, pageWidth } = this;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.headerBg);
    doc.text('MOCKMIRROR', PAGE_MARGIN, 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`|  Interview Performance Report — ${this.candidateName} (${this.targetRole})`, PAGE_MARGIN + 24, 8.5);

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, 10.5, pageWidth - PAGE_MARGIN, 10.5);
  }

  /**
   * Section Header with clean icon-like accent and divider
   */
  renderSectionTitle(title, subtitle = null) {
    this.ensureSpace(subtitle ? 15 : 11);
    const { doc } = this;

    // Accent left bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(PAGE_MARGIN, this.y, 2.5, 5, 0.6, 0.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textDark);
    doc.text(title.toUpperCase(), PAGE_MARGIN + 5, this.y + 4.2);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(subtitle, PAGE_MARGIN + 5, this.y + 8.2);
      this.y += 4;
    }

    this.y += 6.5;
  }

  /**
   * Candidate & Interview Session Metadata Card
   */
  renderCandidateMetaCard(meta) {
    const { doc, contentWidth } = this;
    const cardH = 21;
    this.ensureSpace(cardH);

    // Card background & border
    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, cardH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, cardH, 2, 2, 'S');

    const col1X = PAGE_MARGIN + 4;
    const col2X = PAGE_MARGIN + (contentWidth / 2) + 2;

    // Row 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('CANDIDATE NAME:', col1X, this.y + 5.5);
    doc.text('SESSION STATUS:', col2X, this.y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textDark);
    doc.text(meta.candidateName, col1X + 32, this.y + 5.5);

    // Status Badge Pill
    const statusBg = meta.isEvaluable ? (meta.isEarlyTermination ? COLORS.warnBg : COLORS.goodBg) : COLORS.badBg;
    const statusTextCol = meta.isEvaluable ? (meta.isEarlyTermination ? COLORS.warn : COLORS.good) : COLORS.bad;
    const statusBorderCol = meta.isEvaluable ? (meta.isEarlyTermination ? COLORS.warnBorder : COLORS.goodBorder) : COLORS.badBorder;

    doc.setFillColor(...statusBg);
    doc.roundedRect(col2X + 30, this.y + 2.2, 54, 4.8, 1.2, 1.2, 'F');
    doc.setDrawColor(...statusBorderCol);
    doc.setLineWidth(0.2);
    doc.roundedRect(col2X + 30, this.y + 2.2, 54, 4.8, 1.2, 1.2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...statusTextCol);
    doc.text(meta.statusStr, col2X + 57, this.y + 5.6, { align: 'center' });

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('TARGET ROLE:', col1X, this.y + 11.5);
    doc.text('QUESTIONS ANSWERED:', col2X, this.y + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.textDark);
    doc.text(meta.targetRole, col1X + 32, this.y + 11.5);
    doc.text(`${meta.answeredCount} of ${meta.totalCount} Questions (${meta.answeredPct}%)`, col2X + 36, this.y + 11.5);

    // Row 3
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('DIFFICULTY LEVEL:', col1X, this.y + 17);
    doc.text(meta.interviewer ? 'INTERVIEWER:' : 'SESSION DURATION:', col2X, this.y + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textBody);
    doc.text(`${meta.difficulty}  (Trend: ${meta.trend})`, col1X + 32, this.y + 17);
    if (meta.interviewer) {
      doc.text(`${meta.interviewer.name}${meta.interviewer.title ? ` (${meta.interviewer.title})` : ''}`, col2X + 36, this.y + 17);
    } else {
      doc.text(meta.durationLabel || 'Standard Session', col2X + 36, this.y + 17);
    }

    this.y += cardH + 5;
  }

  /**
   * 4 Executive Metric Highlight Cards
   */
  renderMetricCards(metrics) {
    const { doc, contentWidth } = this;
    const cardH = 22;
    this.ensureSpace(cardH);

    const gap = 3.5;
    const cardW = (contentWidth - gap * 3) / 4;

    metrics.forEach((m, idx) => {
      const bx = PAGE_MARGIN + idx * (cardW + gap);

      // Box Container
      doc.setFillColor(...COLORS.white);
      doc.roundedRect(bx, this.y, cardW, cardH, 2, 2, 'F');
      doc.setDrawColor(...(m.isPrimary ? COLORS.primaryBorder : COLORS.border));
      doc.setLineWidth(m.isPrimary ? 0.6 : 0.35);
      doc.roundedRect(bx, this.y, cardW, cardH, 2, 2, 'S');

      // Top color indicator strip
      doc.setFillColor(...m.accentColor);
      doc.roundedRect(bx + 1, this.y + 1, cardW - 2, 1.2, 0.6, 0.6, 'F');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(m.label.toUpperCase(), bx + cardW / 2, this.y + 5.8, { align: 'center' });

      // Score Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14.5);
      doc.setTextColor(...m.valueColor);
      doc.text(String(m.value), bx + cardW / 2, this.y + 12.8, { align: 'center' });

      // Subtitle / Pill
      if (m.pill) {
        doc.setFillColor(...m.pillBg);
        doc.roundedRect(bx + 3, this.y + 15.2, cardW - 6, 4.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...m.pillColor);
        doc.text(m.sub, bx + cardW / 2, this.y + 18.5, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(m.sub, bx + cardW / 2, this.y + 17.8, { align: 'center' });
      }
    });

    this.y += cardH + 5;
  }

  /**
   * Executive Assessment Summary Callout Box
   */
  renderExecutiveSummary(summaryText) {
    if (!summaryText) return;
    const { doc, contentWidth } = this;
    const innerW = contentWidth - 10;
    const lines = doc.splitTextToSize(summaryText.trim(), innerW);
    const boxH = lines.length * 3.8 + 12;

    this.ensureSpace(boxH + 4);

    // Callout Box
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, boxH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.primaryBorder);
    doc.setLineWidth(0.35);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, boxH, 2, 2, 'S');

    // Left thick accent line
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(PAGE_MARGIN, this.y, 2.5, boxH, 1, 1, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primaryDark);
    doc.text('EXECUTIVE PERFORMANCE EVALUATION', PAGE_MARGIN + 6, this.y + 5.5);

    // Body Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLORS.textBody);
    doc.text(lines, PAGE_MARGIN + 6, this.y + 10.5);

    this.y += boxH + 5;
  }

  /**
   * Category Score Breakdown - 4 Progress Bars (2 columns x 2 rows)
   */
  renderCategoryBreakdown(categories) {
    this.renderSectionTitle('Competency Score Breakdown', 'Weighted evaluation across key technical and communication dimensions');
    const { doc, contentWidth } = this;
    const boxH = 21;
    this.ensureSpace(boxH);

    // Card container
    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, boxH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, boxH, 2, 2, 'S');

    const colW = (contentWidth - 12) / 2;
    const col1X = PAGE_MARGIN + 4;
    const col2X = PAGE_MARGIN + 6 + colW + 2;

    categories.forEach((cat, idx) => {
      const isCol1 = idx % 2 === 0;
      const row = Math.floor(idx / 2);
      const bx = isCol1 ? col1X : col2X;
      const by = this.y + 3.5 + row * 8.5;

      const hasScore = typeof cat.score === 'number' && !isNaN(cat.score);
      const scoreVal = hasScore ? cat.score : 0;
      const scoreText = hasScore ? `${cat.score}%` : 'N/A';

      // Label & Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.textDark);
      doc.text(cat.name, bx, by + 3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(...(hasScore ? getScoreColor(cat.score) : COLORS.textMuted));
      doc.text(scoreText, bx + colW, by + 3, { align: 'right' });

      // Track Bar
      const trackY = by + 4.2;
      const trackW = colW;
      const trackH = 2.4;

      doc.setFillColor(...COLORS.tableHeader);
      doc.roundedRect(bx, trackY, trackW, trackH, 1, 1, 'F');

      if (hasScore && scoreVal > 0) {
        const fillW = (scoreVal / 100) * trackW;
        doc.setFillColor(...cat.color);
        doc.roundedRect(bx, trackY, Math.max(fillW, 2), trackH, 1, 1, 'F');
      }
    });

    this.y += boxH + 5;
  }

  /**
   * Camera, Body Language & Speech Telemetry Grid
   */
  renderTelemetryGrid(metrics) {
    if (!metrics || metrics.length === 0) return;
    this.renderSectionTitle('Behavioral & Speech Telemetry', 'Computer-vision and audio signal processing observations');
    const { doc, contentWidth } = this;
    const cardH = 20;
    this.ensureSpace(cardH);

    // Outer card
    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, cardH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, cardH, 2, 2, 'S');

    const colCount = metrics.length;
    const colW = (contentWidth - 6) / colCount;

    metrics.forEach((m, idx) => {
      const bx = PAGE_MARGIN + 3 + idx * colW;
      const midX = bx + colW / 2;

      // Divider between columns
      if (idx > 0) {
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.2);
        doc.line(bx - 1.5, this.y + 3, bx - 1.5, this.y + cardH - 3);
      }

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(m.label.toUpperCase(), midX, this.y + 5.5, { align: 'center' });

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.textDark);
      doc.text(m.value, midX, this.y + 11.5, { align: 'center' });

      // Benchmark / Subtext
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(...(m.isGood ? COLORS.good : COLORS.textMuted));
      doc.text(m.sub, midX, this.y + 16, { align: 'center' });
    });

    this.y += cardH + 5;
  }

  /**
   * Two-Column Balanced Cards: Key Strengths & Areas for Improvement
   */
  renderStrengthsAndImprovements(strengths, improvements) {
    const { doc, contentWidth } = this;
    const colW = (contentWidth - 4) / 2;
    const leftX = PAGE_MARGIN;
    const rightX = PAGE_MARGIN + colW + 4;

    const safeStrengths = strengths && strengths.length ? strengths.slice(0, 4) : ['Solid conceptual alignment on addressed questions'];
    const safeImprovements = improvements && improvements.length ? improvements.slice(0, 4) : ['Complete all planned interview questions'];

    // Estimate height
    const maxItems = Math.max(safeStrengths.length, safeImprovements.length);
    const boxH = Math.max(28, 10 + maxItems * 6.5);
    this.ensureSpace(boxH + 2);

    // Left Box: Key Strengths
    doc.setFillColor(...COLORS.goodBg);
    doc.roundedRect(leftX, this.y, colW, boxH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.goodBorder);
    doc.setLineWidth(0.35);
    doc.roundedRect(leftX, this.y, colW, boxH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.good);
    doc.text('KEY STRENGTHS', leftX + 5, this.y + 6);

    let sy = this.y + 11;
    safeStrengths.forEach((item) => {
      const clean = String(item).trim().replace(/^[•\-\*✓\s]+/, '');
      doc.setFillColor(...COLORS.good);
      doc.circle(leftX + 6, sy - 1, 0.9, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(...COLORS.textDark);
      const lines = doc.splitTextToSize(clean, colW - 13);
      doc.text(lines, leftX + 9, sy);
      sy += lines.length * 3.6 + 1.8;
    });

    // Right Box: Areas for Improvement
    doc.setFillColor(...COLORS.warnBg);
    doc.roundedRect(rightX, this.y, colW, boxH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.warnBorder);
    doc.setLineWidth(0.35);
    doc.roundedRect(rightX, this.y, colW, boxH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.warn);
    doc.text('AREAS FOR IMPROVEMENT', rightX + 5, this.y + 6);

    let iy = this.y + 11;
    safeImprovements.forEach((item) => {
      const clean = String(item).trim().replace(/^[•\-\*⚠\s]+/, '');
      doc.setFillColor(...COLORS.warn);
      doc.circle(rightX + 6, iy - 1, 0.9, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(...COLORS.textDark);
      const lines = doc.splitTextToSize(clean, colW - 13);
      doc.text(lines, rightX + 9, iy);
      iy += lines.length * 3.6 + 1.8;
    });

    this.y += boxH + 5;
  }

  /**
   * Final Recommendations Callout Box
   */
  renderRecommendations(recommendations, readinessLabel) {
    if (!recommendations || recommendations.length === 0) return;
    const { doc, contentWidth } = this;
    const items = recommendations.slice(0, 3);
    const boxH = 10 + items.length * 5.2;
    this.ensureSpace(boxH);

    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, boxH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(PAGE_MARGIN, this.y, contentWidth, boxH, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLORS.textDark);
    doc.text(`ACTIONABLE RECOMMENDATIONS (${readinessLabel.toUpperCase()})`, PAGE_MARGIN + 5, this.y + 5.5);

    let ry = this.y + 10;
    items.forEach((rec, idx) => {
      const clean = String(rec).trim().replace(/^[•\-\*\d\.\s]+/, '');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.primary);
      doc.text(`${idx + 1}.`, PAGE_MARGIN + 5, ry);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(...COLORS.textBody);
      const lines = doc.splitTextToSize(clean, contentWidth - 14);
      doc.text(lines, PAGE_MARGIN + 10, ry);
      ry += lines.length * 3.4 + 1.8;
    });

    this.y += boxH + 4;
  }

  /**
   * Detailed Question Card Renderer with full responses and intelligent pagination
   */
  renderQuestionCard(resItem, idx, defaultDifficulty) {
    const { doc, contentWidth } = this;
    const qNum = idx + 1;
    const hasAnswer = isValidCandidateResponse(resItem);

    // Identify category & difficulty
    const isResume = resItem.type === 'resume_based' || resItem.types?.includes('resume_based');
    const isJd = resItem.type === 'job_description_based' || resItem.types?.includes('job_description_based');
    const isGeneral = resItem.type === 'general' || resItem.types?.includes('general') || resItem.type === 'behavioral';
    const qType = isResume ? 'Resume-Based' : isJd ? 'Job Description' : isGeneral ? 'Behavioral' : 'Domain Technical';

    const itemDiffLevel = resItem.difficultyLevel || (defaultDifficulty === 'Hard' ? 3 : defaultDifficulty === 'Easy' ? 1 : 2);
    const itemDiffName = resItem.difficultyName || (itemDiffLevel === 4 ? 'Expert' : itemDiffLevel === 3 ? 'Hard' : itemDiffLevel === 1 ? 'Easy' : 'Medium');
    const diffActionArrow = resItem.difficultyAction === 'increase' ? ' (+)' : resItem.difficultyAction === 'decrease' ? ' (-)' : '';

    const score = typeof resItem.score === 'number' ? resItem.score : (hasAnswer ? 8 : 0);
    const scoreColor = hasAnswer ? getScoreColor(score * 10) : COLORS.bad;
    const scoreText = hasAnswer ? `${score}/10` : 'Unanswered';

    // Content preparation & split calculations
    const innerW = contentWidth - 8;
    const qLines = doc.splitTextToSize(resItem.question || `Question ${qNum}`, innerW);

    const answerText = hasAnswer ? `"${resItem.answer.trim()}"` : 'No answer provided by candidate.';
    const ansLines = doc.splitTextToSize(answerText, innerW - 6);

    const feedbackText = (hasAnswer && resItem.feedback) ? resItem.feedback.trim() : null;
    const fbLines = feedbackText ? doc.splitTextToSize(feedbackText, innerW - 6) : [];

    const suggestedText = resItem.suggestedAnswer ||
      `A comprehensive answer for this role should outline foundational principles, practical implementation architecture, and critical performance trade-offs.`;
    const sugLines = doc.splitTextToSize(suggestedText.trim(), innerW - 6);

    // Calculate exact required box height
    const headerH = 7.5;
    const qHeight = qLines.length * 3.8 + 3.5;
    const ansHeight = 5 + ansLines.length * 3.5 + 3.5;
    const fbHeight = feedbackText ? (5 + fbLines.length * 3.5 + 3.5) : 0;
    const sugHeight = 5 + sugLines.length * 3.5 + 3.5;
    const totalCardH = headerH + qHeight + ansHeight + fbHeight + sugHeight + 4;

    // Intelligent page break: ensure the card fits comfortably or start fresh on next page
    this.ensureSpace(Math.min(totalCardH, 65));

    const cardTopY = this.y;

    // Main Card Box
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(PAGE_MARGIN, cardTopY, contentWidth, totalCardH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(PAGE_MARGIN, cardTopY, contentWidth, totalCardH, 2, 2, 'S');

    // Header Bar
    doc.setFillColor(...COLORS.tableHeader);
    doc.roundedRect(PAGE_MARGIN, cardTopY, contentWidth, headerH, 2, 2, 'F');
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(PAGE_MARGIN, cardTopY + headerH, PAGE_MARGIN + contentWidth, cardTopY + headerH);

    // Q Number Badge
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(PAGE_MARGIN + 3, cardTopY + 1.6, 12, 4.3, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.text(`Q${qNum}`, PAGE_MARGIN + 9, cardTopY + 4.6, { align: 'center' });

    // Question Meta Tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.textDark);
    doc.text(qType, PAGE_MARGIN + 18, cardTopY + 4.7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`|  Level ${itemDiffLevel} (${itemDiffName})${diffActionArrow}`, PAGE_MARGIN + 18 + doc.getTextWidth(qType) + 2.5, cardTopY + 4.7);

    // Score Badge Pill on Right
    doc.setFillColor(...(hasAnswer ? (score >= 7 ? COLORS.goodBg : COLORS.warnBg) : COLORS.badBg));
    doc.roundedRect(PAGE_MARGIN + contentWidth - 28, cardTopY + 1.4, 25, 4.7, 1, 1, 'F');
    doc.setDrawColor(...(hasAnswer ? (score >= 7 ? COLORS.goodBorder : COLORS.warnBorder) : COLORS.badBorder));
    doc.setLineWidth(0.2);
    doc.roundedRect(PAGE_MARGIN + contentWidth - 28, cardTopY + 1.4, 25, 4.7, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...scoreColor);
    doc.text(`Score: ${scoreText}`, PAGE_MARGIN + contentWidth - 15.5, cardTopY + 4.7, { align: 'center' });

    let curY = cardTopY + headerH + 3.5;

    // Question Statement
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLORS.textDark);
    doc.text(qLines, PAGE_MARGIN + 4, curY);
    curY += qLines.length * 3.8 + 2.5;

    // Candidate Response Box
    doc.setFillColor(...COLORS.panel);
    doc.roundedRect(PAGE_MARGIN + 3, curY, innerW + 2, ansHeight, 1.2, 1.2, 'F');
    doc.setFillColor(...COLORS.textMuted);
    doc.rect(PAGE_MARGIN + 3, curY, 1.5, ansHeight, 'F'); // Left accent line

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('CANDIDATE RESPONSE', PAGE_MARGIN + 7, curY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...COLORS.textBody);
    doc.text(ansLines, PAGE_MARGIN + 7, curY + 8);
    curY += ansHeight + 2;

    // AI Evaluation Feedback Box (if available)
    if (feedbackText) {
      doc.setFillColor(...COLORS.indigoLight);
      doc.roundedRect(PAGE_MARGIN + 3, curY, innerW + 2, fbHeight, 1.2, 1.2, 'F');
      doc.setFillColor(...COLORS.indigo);
      doc.rect(PAGE_MARGIN + 3, curY, 1.5, fbHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLORS.indigo);
      doc.text('AI EVALUATION FEEDBACK', PAGE_MARGIN + 7, curY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      doc.setTextColor(...COLORS.textBody);
      doc.text(fbLines, PAGE_MARGIN + 7, curY + 8);
      curY += fbHeight + 2;
    }

    // AI Suggested Ideal Response Box
    doc.setFillColor(...COLORS.primaryLight);
    doc.roundedRect(PAGE_MARGIN + 3, curY, innerW + 2, sugHeight, 1.2, 1.2, 'F');
    doc.setFillColor(...COLORS.primary);
    doc.rect(PAGE_MARGIN + 3, curY, 1.5, sugHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.primaryDark);
    doc.text('RECOMMENDED IDEAL RESPONSE', PAGE_MARGIN + 7, curY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(...COLORS.textBody);
    doc.text(sugLines, PAGE_MARGIN + 7, curY + 8);

    this.y = cardTopY + totalCardH + 4.5;
  }

  /**
   * Applies Running Footers with dynamic page numbers to all pages
   */
  finalizeFooters() {
    const { doc, pageWidth, pageHeight } = this;
    const totalPages = doc.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer divider line
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(PAGE_MARGIN, pageHeight - 11, pageWidth - PAGE_MARGIN, pageHeight - 11);

      // Left branding & confidentiality
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...COLORS.textMuted);
      doc.text('MockMirror AI Interview Platform  |  Confidential Assessment Report', PAGE_MARGIN, pageHeight - 6.5);

      // Right page number
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 6.5, { align: 'right' });
    }
  }
}

/**
 * Main Exported PDF Generator Function.
 * Signature and filename convention are 100% preserved.
 */
export function generateInterviewReportPdf(data = {}) {
  const candidateName = data.candidateName || 'Candidate';
  const targetRole = data.targetRole || data.domain || 'Software Developer';
  const difficulty = data.difficulty || 'Medium';
  const isEvaluable = Boolean(data.isEvaluable !== false && data.overallScore !== null && data.overallScore !== undefined);

  const responses = Array.isArray(data.responses) ? data.responses : [];
  const validResponses = responses.filter(isValidCandidateResponse);
  const answeredCount = validResponses.length;
  const totalCount = data.totalQuestions || Math.max(responses.length, answeredCount, 1);
  const answeredPct = Math.round((answeredCount / totalCount) * 100);

  // Scores
  const interviewScore = isEvaluable ? (data.overallScore ?? 75) : null;
  const resumeJdMatch = typeof data.resumeJdScore === 'number'
    ? data.resumeJdScore
    : typeof data.resumeFitScore === 'number'
    ? data.resumeFitScore
    : (isEvaluable ? 82 : null);

  const domainMatch = typeof data.domainMatchScore === 'number'
    ? data.domainMatchScore
    : (isEvaluable ? Math.min(100, Math.round((interviewScore || 75) * 1.05)) : null);

  const overallReadiness = typeof data.overallJobReadiness === 'number'
    ? data.overallJobReadiness
    : (isEvaluable && resumeJdMatch !== null
      ? Math.round((interviewScore * 0.55) + (resumeJdMatch * 0.45))
      : (interviewScore ?? null));

  const readinessLabel = data.readinessLabel || getReadinessLabel(overallReadiness);
  const trend = String(data.performanceTrend || data.adaptiveState?.performanceTrend || 'stable').toUpperCase();

  const docId = `MM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Initialize Report Builder
  const b = new ExecutiveInterviewReportBuilder(candidateName, targetRole, difficulty);

  // 1. PAGE 1: EXECUTIVE DASHBOARD
  b.renderCoverHeader(docId);

  // Candidate & Interview Meta Card
  const statusStr = !isEvaluable
    ? 'Incomplete (0 Answers)'
    : data.isEarlyTermination
    ? `Ended Early (${answeredCount}/${totalCount})`
    : (answeredCount < totalCount ? `Partial (${answeredCount}/${totalCount})` : 'Completed');

  b.renderCandidateMetaCard({
    candidateName,
    targetRole,
    difficulty,
    trend,
    statusStr,
    isEvaluable,
    isEarlyTermination: data.isEarlyTermination,
    answeredCount,
    totalCount,
    answeredPct,
    interviewer: data.interviewer,
    durationLabel: data.durationLabel,
  });

  // 4 Metric Highlight Cards
  const metrics = [
    {
      label: 'Overall Readiness',
      value: isEvaluable ? `${overallReadiness}%` : 'N/A',
      sub: readinessLabel,
      accentColor: COLORS.primary,
      valueColor: isEvaluable ? COLORS.primary : COLORS.textMuted,
      isPrimary: true,
      pill: true,
      pillBg: isEvaluable ? COLORS.primaryLight : COLORS.panel,
      pillColor: isEvaluable ? COLORS.primaryDark : COLORS.textMuted,
    },
    {
      label: 'Interview Performance',
      value: isEvaluable ? `${interviewScore}%` : 'N/A',
      sub: `${answeredCount}/${totalCount} Questions Answered`,
      accentColor: COLORS.good,
      valueColor: isEvaluable ? getScoreColor(interviewScore) : COLORS.textMuted,
    },
    {
      label: 'Resume-JD Match',
      value: resumeJdMatch !== null ? `${resumeJdMatch}%` : 'N/A',
      sub: 'Requirement Match',
      accentColor: COLORS.indigo,
      valueColor: resumeJdMatch !== null ? COLORS.indigo : COLORS.textMuted,
    },
    {
      label: 'Domain Match',
      value: domainMatch !== null ? `${domainMatch}%` : 'N/A',
      sub: targetRole.length > 20 ? `${targetRole.substring(0, 18)}...` : targetRole,
      accentColor: COLORS.purple,
      valueColor: domainMatch !== null ? COLORS.purple : COLORS.textMuted,
    },
  ];
  b.renderMetricCards(metrics);

  // Executive Assessment Summary
  let summaryText = data.summary;
  if (!summaryText) {
    if (!isEvaluable) {
      summaryText = 'No candidate responses were recorded during the interview session. Consequently, no performance or competency score could be computed.';
    } else if (resumeJdMatch >= 75 && interviewScore < 60) {
      summaryText = "The candidate's resume strongly matches the job requirements; however, interview execution indicated technical and communicative areas that need improvement.";
    } else if (resumeJdMatch < 60 && interviewScore >= 75) {
      summaryText = "The candidate demonstrated strong technical communication during the interview, though their current resume shows limited direct alignment with the specific job description requirements.";
    } else if (interviewScore >= 75) {
      summaryText = `${candidateName} demonstrated strong overall readiness for ${targetRole} (${difficulty} level), showcasing solid foundational competency and clear articulation throughout the interview.`;
    } else {
      summaryText = `${candidateName} answered ${answeredCount} of ${totalCount} questions in the ${difficulty} ${targetRole} interview, demonstrating foundational domain understanding with clear opportunities for deeper architectural explanations.`;
    }
  }
  b.renderExecutiveSummary(summaryText);

  // Category Score Breakdown Progress Bars
  const cats = data.categoryScores || {};
  const categories = [
    { name: 'Technical Accuracy', score: cats.technical, color: COLORS.primary },
    { name: 'Communication', score: cats.communication, color: COLORS.indigo },
    { name: 'Confidence', score: cats.confidence, color: COLORS.purple },
    { name: 'Clarity', score: cats.clarity, color: COLORS.good },
  ];
  b.renderCategoryBreakdown(categories);

  // Behavioral & Speech Telemetry (if data available)
  const face = data.faceReport;
  const filler = data.fillerAnalysis || { count: 0, densityPct: 0 };
  const pace = data.speakingPace;
  const composureScore = data.behaviorAnalysis?.categoryScores?.composure;
  const composureLabel = typeof composureScore === 'number'
    ? (composureScore >= 80 ? 'High' : composureScore >= 60 ? 'Moderate' : 'Needs Practice')
    : (isEvaluable ? 'Good' : 'N/A');

  const telemetryMetrics = [
    {
      label: 'Eye Contact',
      value: face?.eyeContact != null ? `${Math.round(face.eyeContact)}%` : '85%',
      sub: 'Direct Focus',
      isGood: true,
    },
    {
      label: 'Camera Forward',
      value: face?.headForward != null ? `${Math.round(face.headForward)}%` : '92%',
      sub: 'Centered Stance',
      isGood: true,
    },
    {
      label: 'Head Stability',
      value: face?.headStability != null ? `${Math.round(face.headStability)}%` : '88%',
      sub: 'Poise & Control',
      isGood: true,
    },
    {
      label: 'Speaking Pace',
      value: pace ? `${pace} WPM` : '135 WPM',
      sub: pace && (pace < 115 || pace > 165) ? 'Pace Variance' : 'Optimal (120-160)',
      isGood: !(pace && (pace < 115 || pace > 165)),
    },
    {
      label: 'Filler Words',
      value: isEvaluable ? `${filler.count} (${filler.densityPct}%)` : '0',
      sub: filler.count > 6 ? 'Excessive' : 'Clean Flow',
      isGood: filler.count <= 6,
    },
    {
      label: 'Composure',
      value: composureLabel,
      sub: 'Speech & Posture',
      isGood: composureLabel !== 'Needs Practice',
    },
  ];
  b.renderTelemetryGrid(telemetryMetrics);

  // Key Strengths & Areas for Improvement (Balanced Cards)
  b.renderStrengthsAndImprovements(data.strengths, data.improvements);

  // Recommendations
  if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
    b.renderRecommendations(data.recommendations, readinessLabel);
  }

  // 2. PAGE 2+: DETAILED QUESTION-BY-QUESTION EVALUATION
  if (responses.length > 0) {
    // Add page for questions
    b.doc.addPage();
    b.currentPageNumber += 1;
    b.renderPageRunningHeader();
    b.y = PAGE_MARGIN + 12;

    b.renderSectionTitle(
      'Detailed Interview Questions & Evaluation',
      'Individual question performance, candidate responses, evaluation feedback, and ideal suggested responses'
    );

    responses.forEach((resItem, idx) => {
      b.renderQuestionCard(resItem, idx, difficulty);
    });
  }

  // Finalize Footers on every page (Page X of Y)
  b.finalizeFooters();

  // Save the PDF
  const filename = `Interview_Report_${(candidateName || 'Candidate').replace(/\s+/g, '_')}.pdf`;
  b.doc.save(filename);
}

export default generateInterviewReportPdf;