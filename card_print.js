// 📌 card_print.js
// Clean jsPDF-based 3x5 card printing with National Park font

(function() {
  'use strict';

  // ============================================
  // 🔤 LAZY LOAD ALL FONTS
  // ============================================
  
  let NATIONAL_PARK_BOLD = null;
  let NATIONAL_PARK_LIGHT = null;
  let NATIONAL_PARK_LIGHT_ITALIC = null;
  let fontLoadPromises = {};

  async function loadFont(fontName) {
    // Map font names to variables
    const fontMap = {
      'NationalPark-Bold': 'BOLD',
      'NationalPark-Light': 'LIGHT',
      'NationalPark-LightItalic': 'ITALIC'
    };
    
    const fontKey = fontMap[fontName];
    
    // If already loaded, return it
    if (fontKey === 'BOLD' && NATIONAL_PARK_BOLD) return NATIONAL_PARK_BOLD;
    if (fontKey === 'LIGHT' && NATIONAL_PARK_LIGHT) return NATIONAL_PARK_LIGHT;
    if (fontKey === 'ITALIC' && NATIONAL_PARK_LIGHT_ITALIC) return NATIONAL_PARK_LIGHT_ITALIC;
    
    // If currently loading, return the existing promise
    if (fontLoadPromises[fontKey]) {
      return fontLoadPromises[fontKey];
    }
    
    // Start loading
    fontLoadPromises[fontKey] = fetch(`/files/${fontName}-base64.txt`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load ${fontName} font`);
        }
        return response.text();
      })
      .then(base64String => {
        const cleaned = base64String.replace(/\s/g, '');
        
        // Store in the appropriate variable
        if (fontKey === 'BOLD') NATIONAL_PARK_BOLD = cleaned;
        else if (fontKey === 'LIGHT') NATIONAL_PARK_LIGHT = cleaned;
        else if (fontKey === 'ITALIC') NATIONAL_PARK_LIGHT_ITALIC = cleaned;
        
        return cleaned;
      })
      .catch(error => {
        console.error(`Error loading ${fontName} font:`, error);
        delete fontLoadPromises[fontKey];
        throw error;
      });
    
    return fontLoadPromises[fontKey];
  }

  async function loadAllFonts() {
    const [bold, light, italic] = await Promise.all([
      loadFont('NationalPark-Bold'),
      loadFont('NationalPark-Light'),
      loadFont('NationalPark-LightItalic')
    ]);
    return { bold, light, italic };
  }

  // ============================================
  // 📝 ITALIC TEXT RENDERING
  // ============================================

  /**
   * Renders text with italic font (National Park Light Italic)
   */
  function renderItalicText(doc, text, x, y) {
    doc.setFont('NationalPark', 'italic');
    doc.text(text, x, y);
  }

  // ============================================
  // 📐 CONSTANTS
  // ============================================
  
  const CARD_WIDTH = 5;      // inches
  const CARD_HEIGHT = 3;     // inches
  const MARGIN = 0.2;        // inches
  const CONTENT_WIDTH = CARD_WIDTH - (MARGIN * 2);  // 4.6in
  const CONTENT_HEIGHT = CARD_HEIGHT - (MARGIN * 2); // 2.6in
  
  const FONT_SIZE_TITLE = 12;
  const FONT_SIZE_LEVEL = 10;
  const FONT_SIZE_BODY = 10;
  const FONT_SIZE_BRANDING = 7;
  
  const LINE_HEIGHT = 0.16;  // inches per line at body font size
  const ABILITY_SPACING = LINE_HEIGHT * 0.15;  // extra space between ability paragraphs
  const HEADER_HEIGHT = 0.35; // space for title + divider
  const FOOTER_HEIGHT = 0.12; // space for branding
  
  const MAX_BODY_HEIGHT = CONTENT_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

  // ============================================
  // 📄 CONTENT EXTRACTION
  // ============================================

  /**
   * Extracts structured content from a dungeon generator card (data-card-type="dungeon").
   * Returns: { title, level, sections[] }
   * Plain-text output only — Phase 4. Bold markup stripped via .textContent (acceptable).
   */
  function extractDungeonCardContent(card) {
    const title = card.querySelector('.card-title')?.textContent?.trim() || 'Untitled';

    // Dice meta line (room cards only — notes cards have no .stat-tag or .die-sum)
    const statTag = card.querySelector('.stat-tag');
    const dieSum  = card.querySelector('.die-sum');
    const sections = [];

    if (statTag || dieSum) {
      const metaParts = [];
      if (dieSum)  metaParts.push(dieSum.textContent.trim());
      if (statTag) metaParts.push(statTag.textContent.trim());
      const metaText = metaParts.join('  ');
      if (metaText) sections.push({ type: 'text', content: metaText });
    }

    // Key lines (bullet rows) — skip description rows
    const keyLines = card.querySelectorAll('.key-line:not(.key-desc) .editable');
    keyLines.forEach(el => {
      const text = el.textContent.trim();
      if (text) sections.push({ type: 'text', content: text });
    });

    // Description line (key-desc)
    const descEl = card.querySelector('.key-desc .editable');
    if (descEl) {
      const descText = descEl.textContent.trim();
      if (descText) sections.push({ type: 'text', content: descText, italic: true });
    }

    return { title, level: '', sections };
  }

  /**
   * Extracts structured content from a card DOM element
   * Returns: { title, level, sections[] }
   * Each section: { type: 'text'|'rich'|'divider', content, italic? }
   */
  function extractCardContent(card) {
    // Dungeon generator cards use their own extractor (authoritative detection via data-card-type)
    if (card.dataset.cardType === 'dungeon') {
      return extractDungeonCardContent(card);
    }

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
   * Extracts text content, preserving bold AND italic markers
   * Returns array of { text, bold, italic } segments
   */
  function extractTextWithBold(element) {
    const segments = [];
    
    function walk(node, ancestorItalic = false) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Replace newlines/tabs with spaces, but keep leading/trailing spaces
        let text = node.textContent.replace(/[\n\r\t]+/g, ' ');
        // Collapse multiple spaces to single space
        text = text.replace(/  +/g, ' ');
        
        if (text) {  // Don't check trim() - we need those spaces!
          segments.push({ text: text, bold: false, italic: ancestorItalic });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const isBold = node.tagName === 'STRONG' || node.tagName === 'B';
        const isItalic = ancestorItalic || 
                         node.tagName === 'EM' || 
                         node.tagName === 'I' || 
                         node.classList.contains('flavor-text');
        
        if (isBold) {
          // For bold elements, we can safely trim since they're inline
          const text = node.textContent.replace(/\s+/g, ' ').trim();
          if (text) {
            segments.push({ text: text, bold: true, italic: isItalic });
          }
        } else {
          // Recurse into children
          for (const child of node.childNodes) {
            walk(child, isItalic);
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
   * Creates a new jsPDF document configured for 3x5 cards with National Park font
   */
  async function createCardDoc() {
    const doc = new jspdf.jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: [CARD_WIDTH, CARD_HEIGHT]
    });
    
    // Load all fonts asynchronously
    const fonts = await loadAllFonts();
    
    // Register National Park fonts
    doc.addFileToVFS('NationalPark-Bold.ttf', fonts.bold);
    doc.addFileToVFS('NationalPark-Light.ttf', fonts.light);
    doc.addFileToVFS('NationalPark-LightItalic.ttf', fonts.italic);
    doc.addFont('NationalPark-Bold.ttf', 'NationalPark', 'bold');
    doc.addFont('NationalPark-Light.ttf', 'NationalPark', 'light');
    doc.addFont('NationalPark-LightItalic.ttf', 'NationalPark', 'italic');
    
    return doc;
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
    doc.setFont('NationalPark', 'bold');
    
    const displayTitle = title.toUpperCase() + (isContinuation ? " (cont'd)" : "");
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
    y += 0.2;
    
    // === BODY ===
    doc.setFontSize(FONT_SIZE_BODY);
    const maxY = CARD_HEIGHT - MARGIN - FOOTER_HEIGHT;
    
    let sectionIndex = startIndex;
    
    while (sectionIndex < sections.length && y < maxY) {
      const section = sections[sectionIndex];
      
      if (section.type === 'divider') {
        // Check if we have room for divider + at least one line after
        if (y + 0.1 + LINE_HEIGHT > maxY) break;
        
        y -= 0.08;  // Adjust space above
        doc.setDrawColor(158, 206, 230); // light blue
        doc.setLineWidth(0.01);
        doc.line(MARGIN, y, CARD_WIDTH - MARGIN, y);
        y += 0.2;  // Space below
        sectionIndex++;
        continue;
      }
      
      if (section.type === 'text') {
        doc.setFont('NationalPark', 'light');
        const lines = doc.splitTextToSize(section.content, CONTENT_WIDTH);
        
        for (const line of lines) {
          if (y + LINE_HEIGHT > maxY) {
            // Return with current position to continue on next page
            return { overflow: true, nextIndex: sectionIndex, partialLine: line };
          }
          
          if (section.italic) {
            renderItalicText(doc, line, MARGIN, y);
          } else {
            doc.text(line, MARGIN, y);
          }
          
          y += LINE_HEIGHT;
        }
        sectionIndex++;
        continue;
      }
      
      if (section.type === 'rich') {
        // Estimate section height (rough: ~12 words per line based on actual rendering)
        const totalWords = section.content.reduce((sum, seg) => sum + seg.text.split(' ').length, 0);
        const estimatedLines = Math.ceil(totalWords / 12);
        const estimatedHeight = estimatedLines * LINE_HEIGHT + ABILITY_SPACING;
        
        // If section won't fit AND we're not at the top of the page, move to next page
        // (If we ARE at top of page, we must try to render it anyway to avoid infinite loop)
        const isNearTopOfPage = y < (MARGIN + HEADER_HEIGHT + 0.3);
        if (!isNearTopOfPage && y + estimatedHeight > maxY) {
          return { overflow: true, nextIndex: sectionIndex };
        }
        
        // Rich text with bold/italic segments - render inline
        const rendered = renderRichText(doc, section.content, MARGIN, y, CONTENT_WIDTH, maxY);
        y = rendered.y;
        
        if (rendered.overflow) {
          return { overflow: true, nextIndex: sectionIndex };
        }
        
        // Add extra space between abilities
        y += ABILITY_SPACING;
        
        sectionIndex++;
        continue;
      }
        
      sectionIndex++;
    }
    
    // === FOOTER (branding) ===
    doc.setFontSize(FONT_SIZE_BRANDING);
    doc.setFont('NationalPark', 'light');
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
   * Renders rich text (with bold AND italic segments) handling word wrap
   */
  function renderRichText(doc, segments, x, y, maxWidth, maxY) {
    let currentLine = [];
    let currentLineWidth = 0;
    
    for (const segment of segments) {
      doc.setFont('NationalPark', segment.bold ? 'bold' : 'light');
      const words = segment.text.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        const wordWidth = doc.getTextWidth(word);
        
        if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
          // Render current line
          if (y + LINE_HEIGHT > maxY) {
            return { y, overflow: true };
          }
          renderLine(doc, currentLine, x, y);
          y += LINE_HEIGHT;
          currentLine = [];
          currentLineWidth = 0;
        }
        
        currentLine.push({ text: word, bold: segment.bold, italic: segment.italic });
        currentLineWidth += wordWidth;
      }
    }
    
    // Render final line
    if (currentLine.length > 0) {
      if (y + LINE_HEIGHT > maxY) {
        return { y, overflow: true };
      }
      renderLine(doc, currentLine, x, y);
      y += LINE_HEIGHT;
    }
    
    return { y, overflow: false };
  }

  function renderLine(doc, segments, x, y) {
    let currentX = x;
    for (const seg of segments) {
      doc.setFont('NationalPark', seg.bold ? 'bold' : 'light');
      
      if (seg.italic) {
        renderItalicText(doc, seg.text, currentX, y);
      } else {
        doc.text(seg.text, currentX, y);
      }
      
      currentX += doc.getTextWidth(seg.text);
    }
  }

  // ============================================
  // 🎯 PUBLIC API
  // ============================================

  /**
   * Print a single card to PDF
   */
  async function printSingleCard(card) {
    if (typeof jspdf === 'undefined') {
      alert('jsPDF library not loaded. Please refresh and try again.');
      return;
    }

    try {
      const content = extractCardContent(card);
      const doc = await createCardDoc();
      
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
   * Print an arbitrary array of card elements to a single PDF.
   * Used by printCluster (dungeon page) and available for other multi-card print needs.
   */
  async function printCardsToPDF(cards, filename) {
    if (!cards || cards.length === 0) {
      alert('No cards to print.');
      return;
    }

    const doc = await createCardDoc();
    let isFirstCard = true;

    for (const card of cards) {
      const content = extractCardContent(card);

      if (!isFirstCard) {
        doc.addPage([CARD_WIDTH, CARD_HEIGHT], 'landscape');
      }
      isFirstCard = false;

      let pageNum = 1;
      let result = renderCardPage(doc, { ...content, startIndex: 0 }, pageNum, 1);

      while (result.overflow && result.nextIndex !== undefined) {
        doc.addPage([CARD_WIDTH, CARD_HEIGHT], 'landscape');
        pageNum++;
        result = renderCardPage(doc, { ...content, startIndex: result.nextIndex }, pageNum, pageNum);
      }
    }

    const safeName = filename || ('3x5_cards_' + new Date().toISOString().slice(0, 10) + '.pdf');
    doc.save(safeName);
  }

  /**
   * Print all favorited cards to a single PDF
   */
  async function printAllFavorites() {
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
      btn.innerHTML = 'generating...';
      btn.disabled = true;
    }

    try {
      const doc = await createCardDoc();
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
      doc.save('3x5_Favorites_' + timestamp + '.pdf');
      
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
      printButton.title = 'Print All Favorites';
      printButton.innerHTML = '<img src="/files/printer_icon.png" alt="Print">';
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
  window.printCardsToPDF = printCardsToPDF;
  window.updatePrintAllButton = updatePrintAllButton;

})();
