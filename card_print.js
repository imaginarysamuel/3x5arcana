// 📌 card_print.js
// Clean jsPDF-based 3x5 card printing - no html2canvas, no screenshots

(function() {
  'use strict';

  // ============================================
  // 📐 CONSTANTS
  // ============================================
  
  const CARD_WIDTH = 5;      // inches
  const CARD_HEIGHT = 3;     // inches
  const MARGIN = 0.2;        // inches
  const CONTENT_WIDTH = CARD_WIDTH - (MARGIN * 2);  // 4.6in
  const CONTENT_HEIGHT = CARD_HEIGHT - (MARGIN * 2); // 2.6in
  
  const FONT_SIZE_TITLE = 12;
  const FONT_SIZE_LEVEL = 11;
  const FONT_SIZE_BODY = 9;
  const FONT_SIZE_BRANDING = 7;
  
  const LINE_HEIGHT = 0.16;  // inches per line at body font size
  const HEADER_HEIGHT = 0.35; // space for title + divider
  const FOOTER_HEIGHT = 0.15; // space for branding
  
  const MAX_BODY_HEIGHT = CONTENT_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

  // ============================================
  // 📄 CONTENT EXTRACTION
  // ============================================

  /**
   * Extracts structured content from a card DOM element
   * Returns: { title, level, sections[] }
   * Each section: { type: 'text'|'stats'|'divider', content, bold? }
   */
  function extractCardContent(card) {
    const title = card.querySelector('.card-title')?.textContent?.trim() || 'Untitled';
    const level = card.querySelector('.monster-level, .spell-tier, .spell-level')?.textContent?.trim() || '';
    
    const body = card.querySelector('.card-body');
    const sections = [];
    
    if (!body) return { title, level, sections };
    
    // Walk through body children and extract content
    for (const child of body.children) {
      // Skip action buttons
      if (child.classList.contains('card-actions')) continue;
      
      // Dividers
      if (child.classList.contains('divider')) {
        sections.push({ type: 'divider' });
        continue;
      }
      
      // Flavor text (italic)
      if (child.classList.contains('flavor-text')) {
        const text = child.textContent?.trim();
        if (text) {
          sections.push({ type: 'text', content: text, italic: true });
        }
        continue;
      }
      
      // Stat blocks - extract each paragraph
      if (child.classList.contains('statline') || 
          child.classList.contains('spell-stats') || 
          child.classList.contains('ose-stats') ||
          child.classList.contains('abilities')) {
        const paragraphs = child.querySelectorAll('p');
        if (paragraphs.length > 0) {
          paragraphs.forEach(p => {
            const text = extractTextWithBold(p);
            if (text.length > 0) {
              sections.push({ type: 'rich', content: text });
            }
          });
        } else {
          // Single element without nested p tags
          const text = extractTextWithBold(child);
          if (text.length > 0) {
            sections.push({ type: 'rich', content: text });
          }
        }
        continue;
      }
      
      // Regular paragraphs
      if (child.tagName === 'P' || child.tagName === 'DIV') {
        const text = extractTextWithBold(child);
        if (text.length > 0) {
          sections.push({ type: 'rich', content: text });
        }
        continue;
      }
      
      // Tables - convert to text representation
      if (child.tagName === 'TABLE') {
        const tableText = extractTableAsText(child);
        if (tableText) {
          sections.push({ type: 'text', content: tableText });
        }
        continue;
      }
      
      // Fallback: just get text content
      const text = child.textContent?.trim();
      if (text) {
        sections.push({ type: 'text', content: text });
      }
    }
    
    return { title, level, sections };
  }

  /**
   * Extracts text content, preserving bold markers
   * Returns array of { text, bold } segments
   */
  function extractTextWithBold(element) {
    const segments = [];
    
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text && text.trim()) {
          segments.push({ text: text, bold: false });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const isBold = node.tagName === 'STRONG' || node.tagName === 'B';
        
        if (isBold) {
          const text = node.textContent;
          if (text && text.trim()) {
            segments.push({ text: text, bold: true });
          }
        } else {
          // Recurse into children
          for (const child of node.childNodes) {
            walk(child);
          }
        }
      }
    }
    
    walk(element);
    return segments;
  }

  /**
   * Converts a table to simple text representation
   */
  function extractTableAsText(table) {
    const rows = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cells = [];
      tr.querySelectorAll('th, td').forEach(cell => {
        cells.push(cell.textContent?.trim() || '');
      });
      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    });
    return rows.join('\n');
  }

  // ============================================
  // 📝 PDF GENERATION
  // ============================================

  /**
   * Creates a new jsPDF document configured for 3x5 cards
   */
  function createCardDoc() {
    return new jspdf.jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: [CARD_WIDTH, CARD_HEIGHT]
    });
  }

  /**
   * Renders a single card's content to the PDF
   * Returns true if content continues to another page
   */
  function renderCardPage(doc, content, pageNum, totalPages) {
    const { title, level, sections, startIndex = 0 } = content;
    const isContinuation = pageNum > 1;
    
    let y = MARGIN;
    
    // === HEADER ===
    doc.setFontSize(FONT_SIZE_TITLE);
    doc.setFont('helvetica', 'bold');
    
    const displayTitle = isContinuation ? `${title} (cont'd)` : title;
    doc.text(displayTitle, MARGIN, y + 0.15);
    
    if (level && !isContinuation) {
      doc.setFontSize(FONT_SIZE_LEVEL);
      doc.text(level, CARD_WIDTH - MARGIN, y + 0.15, { align: 'right' });
    }
    
    y += 0.22;
    
    // Header divider line
    doc.setDrawColor(250, 128, 114); // salmon color
    doc.setLineWidth(0.02);
    doc.line(MARGIN, y, CARD_WIDTH - MARGIN, y);
    y += 0.12;
    
    // === BODY ===
    doc.setFontSize(FONT_SIZE_BODY);
    const maxY = CARD_HEIGHT - MARGIN - FOOTER_HEIGHT;
    
    let sectionIndex = startIndex;
    
    while (sectionIndex < sections.length && y < maxY) {
      const section = sections[sectionIndex];
      
      if (section.type === 'divider') {
        // Check if we have room for divider + at least one line after
        if (y + 0.1 + LINE_HEIGHT > maxY) break;
        
        y += 0.04;
        doc.setDrawColor(158, 206, 230); // light blue
        doc.setLineWidth(0.01);
        doc.line(MARGIN, y, CARD_WIDTH - MARGIN, y);
        y += 0.08;
        sectionIndex++;
        continue;
      }
      
      if (section.type === 'text') {
        doc.setFont('helvetica', section.italic ? 'italic' : 'normal');
        const lines = doc.splitTextToSize(section.content, CONTENT_WIDTH);
        
        for (const line of lines) {
          if (y + LINE_HEIGHT > maxY) {
            // Return with current position to continue on next page
            return { overflow: true, nextIndex: sectionIndex, partialLine: line };
          }
          doc.text(line, MARGIN, y);
          y += LINE_HEIGHT;
        }
        sectionIndex++;
        continue;
      }
      
      if (section.type === 'rich') {
        // Rich text with bold segments - render inline
        const rendered = renderRichText(doc, section.content, MARGIN, y, CONTENT_WIDTH, maxY);
        y = rendered.y;
        
        if (rendered.overflow) {
          return { overflow: true, nextIndex: sectionIndex };
        }
        sectionIndex++;
        continue;
      }
      
      sectionIndex++;
    }
    
    // === FOOTER (branding) ===
    doc.setFontSize(FONT_SIZE_BRANDING);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(125, 125, 125);
    doc.text('3x5arcana.com', CARD_WIDTH - MARGIN, CARD_HEIGHT - MARGIN + 0.05, { align: 'right' });
    doc.setTextColor(0, 0, 0); // reset
    
    // Check if there's more content
    if (sectionIndex < sections.length) {
      return { overflow: true, nextIndex: sectionIndex };
    }
    
    return { overflow: false };
  }

  /**
   * Renders rich text (with bold segments) handling word wrap
   * This is the tricky part - mixing fonts inline
   */
  function renderRichText(doc, segments, x, y, maxWidth, maxY) {
    // Flatten segments into one string for wrapping calculation
    let fullText = segments.map(s => s.text).join('');
    
    // Use normal font for width calculation
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(fullText, maxWidth);
    
    // For simplicity, render line by line
    // This loses some bold precision but handles wrapping correctly
    let charIndex = 0;
    
    for (const line of lines) {
      if (y + LINE_HEIGHT > maxY) {
        return { y, overflow: true };
      }
      
      // Find which segments this line covers and render with appropriate styling
      let lineX = x;
      let remaining = line;
      
      while (remaining.length > 0 && charIndex < fullText.length) {
        // Find current segment
        let segmentStart = 0;
        let currentSegment = null;
        
        for (const seg of segments) {
          if (charIndex >= segmentStart && charIndex < segmentStart + seg.text.length) {
            currentSegment = seg;
            break;
          }
          segmentStart += seg.text.length;
        }
        
        if (!currentSegment) break;
        
        // How much of this segment is in our remaining line?
        const segmentOffset = charIndex - segmentStart;
        const segmentRemaining = currentSegment.text.substring(segmentOffset);
        
        let chunkEnd = remaining.indexOf(segmentRemaining);
        let chunk;
        
        if (chunkEnd === 0) {
          // Segment starts at beginning of remaining
          const maxLen = Math.min(segmentRemaining.length, remaining.length);
          // Find where segment ends or line ends
          if (segmentRemaining.length <= remaining.length) {
            chunk = segmentRemaining;
          } else {
            chunk = remaining;
          }
        } else {
          // Just take what we can
          chunk = remaining.substring(0, Math.min(remaining.length, segmentRemaining.length));
        }
        
        // Render chunk
        doc.setFont('helvetica', currentSegment.bold ? 'bold' : 'normal');
        doc.text(chunk, lineX, y);
        lineX += doc.getTextWidth(chunk);
        
        remaining = remaining.substring(chunk.length);
        charIndex += chunk.length;
      }
      
      y += LINE_HEIGHT;
      charIndex++; // account for newline/space between wrapped lines
    }
    
    return { y, overflow: false };
  }

  // ============================================
  // 🎯 PUBLIC API
  // ============================================

  /**
   * Print a single card to PDF
   */
  function printSingleCard(card) {
    if (typeof jspdf === 'undefined') {
      alert('jsPDF library not loaded. Please refresh and try again.');
      return;
    }

    try {
      const content = extractCardContent(card);
      const doc = createCardDoc();
      
      let pageNum = 1;
      let result = renderCardPage(doc, { ...content, startIndex: 0 }, pageNum, 1);
      
      // Handle multi-page cards
      while (result.overflow && result.nextIndex !== undefined) {
        doc.addPage([CARD_WIDTH, CARD_HEIGHT], 'landscape');
        pageNum++;
        result = renderCardPage(doc, { ...content, startIndex: result.nextIndex }, pageNum, pageNum);
      }
      
      const filename = content.title.replace(/[^a-z0-9]/gi, '_') + '.pdf';
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Check console for details.');
    }
  }

  /**
   * Print all favorited cards to a single PDF
   */
  function printAllFavorites() {
    if (typeof jspdf === 'undefined') {
      alert('jsPDF library not loaded. Please refresh and try again.');
      return;
    }

    const favoritesContainer = document.getElementById('favorites-list');
    if (!favoritesContainer) return;
    
    const favoriteCards = Array.from(favoritesContainer.querySelectorAll('.card:not(.bookmark)'));
    
    if (favoriteCards.length === 0) {
      alert('No favorites to print!');
      return;
    }

    // Update button state
    const btn = document.getElementById('print-all-favorites-btn');
    let originalHTML;
    if (btn) {
      originalHTML = btn.innerHTML;
      btn.innerHTML = '⏳ Generating...';
      btn.disabled = true;
    }

    try {
      const doc = createCardDoc();
      let isFirstCard = true;
      
      for (const card of favoriteCards) {
        const content = extractCardContent(card);
        
        if (!isFirstCard) {
          doc.addPage([CARD_WIDTH, CARD_HEIGHT], 'landscape');
        }
        isFirstCard = false;
        
        let pageNum = 1;
        let result = renderCardPage(doc, { ...content, startIndex: 0 }, pageNum, 1);
        
        // Handle multi-page cards
        while (result.overflow && result.nextIndex !== undefined) {
          doc.addPage([CARD_WIDTH, CARD_HEIGHT], 'landscape');
          pageNum++;
          result = renderCardPage(doc, { ...content, startIndex: result.nextIndex }, pageNum, pageNum);
        }
      }
      
      const timestamp = new Date().toISOString().slice(0, 10);
      doc.save(`3x5_Favorites_${timestamp}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      if (btn) {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    }
  }

  /**
   * Updates visibility of "Print All Favorites" button
   */
  function updatePrintAllButton() {
    if (typeof jspdf === 'undefined') return;
    
    const favoritesContainer = document.getElementById('favorites-list');
    if (!favoritesContainer) return;
    
    let printButton = document.getElementById('print-all-favorites-btn');
    const favoriteCards = favoritesContainer.querySelectorAll('.card:not(.bookmark)');
    const count = favoriteCards.length;
    
    if (count === 0) {
      if (printButton) printButton.remove();
      return;
    }
    
    if (!printButton) {
      printButton = document.createElement('button');
      printButton.id = 'print-all-favorites-btn';
      printButton.className = 'print-all-favorites';
      printButton.innerHTML = '<span class="button-icon">⎙</span>Print All Favorites';
      printButton.addEventListener('click', printAllFavorites);
      favoritesContainer.appendChild(printButton);
    }
    
    printButton.classList.add('visible');
  }

  // ============================================
  // 🌐 EXPORTS
  // ============================================
  
  window.printSingleCard = printSingleCard;
  window.printAllFavorites = printAllFavorites;
  window.updatePrintAllButton = updatePrintAllButton;

})();
