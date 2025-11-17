const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

async function createPresentation() {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Stu';
    pptx.title = 'Business Model Canvas';

    // Create slide with Business Model Canvas
    const slide = pptx.addSlide();

    // Add HTML-rendered content manually using PptxGenJS shapes and text
    // Header
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 10, h: 0.5,
        fill: { color: '1F4788' },
        line: { color: '17A2B8', width: 2 }
    });

    slide.addText('Stu: Business Model Canvas', {
        x: 0.2, y: 0.08, w: 9.6, h: 0.35,
        fontSize: 24, bold: true, color: 'FFFFFF',
        align: 'center', valign: 'middle',
        fontFace: 'Arial'
    });

    // Block data: [x, y, w, h, bgColor, headerColor, title, content]
    const blocks = [
        // Left column
        {x: 0.1, y: 0.6, w: 1.8, h: 1.0, bg: 'E8F4F8', header: '0A5F7F', title: 'Key Partnerships',
         content: ['SIS vendors (Ellucian)', 'Student success networks', 'AWS, Supabase, Looker']},
        {x: 0.1, y: 1.65, w: 1.8, h: 1.2, bg: 'F0E8FF', header: '6B4BA8', title: 'Key Activities',
         content: ['AI graduation mapping', 'Data integration', 'Customer success', 'Direct sales']},
        {x: 0.1, y: 2.95, w: 1.8, h: 1.0, bg: 'EEEEEE', header: '424242', title: 'Cost Structure',
         content: ['Eng/Product: $250–300K', 'CS & Sales: $120–150K', 'Infrastructure: $5–15K/mo']},

        // Center-left
        {x: 2.05, y: 0.6, w: 1.8, h: 1.0, bg: 'F0F9FF', header: '1E40AF', title: 'Customer Segments',
         content: ['Community & tech colleges', 'Public universities', 'For-profit institutions', 'Online programs']},
        {x: 2.05, y: 1.65, w: 1.75, h: 0.6, bg: 'FFF9C4', header: 'F57F17', title: 'Jobs-To-Be-Done',
         content: ['Automate scheduling', 'Improve retention', 'Forecast enrollment', 'Enable self-service']},
        {x: 3.85, y: 1.65, w: 1.75, h: 0.6, bg: 'C8E6C9', header: '388E3C', title: 'Value Proposition',
         content: ['40%+ time savings', 'AI-powered guidance', 'Unified visibility', 'No rip-and-replace']},
        {x: 2.05, y: 2.35, w: 1.8, h: 0.85, bg: 'E8F5E9', header: '2E7D32', title: 'Channels',
         content: ['Direct outbound', 'NACADA conferences', 'Pilot-first SaaS', 'Dedicated success']},
        {x: 2.05, y: 3.28, w: 1.8, h: 0.67, bg: 'FCE4EC', header: 'C2185B', title: 'Relationships',
         content: ['90-day ROI pilots', 'Quarterly reviews', 'Co-creation', 'Automated dashboards']},

        // Right column
        {x: 8.1, y: 0.6, w: 1.8, h: 1.0, bg: 'FFF4E6', header: 'D97706', title: 'Key Resources',
         content: ['AI/ML engine', 'SIS integrations', 'Domain expertise', '$500K–1M funding']},
        {x: 8.1, y: 1.65, w: 1.8, h: 1.2, bg: 'FFF3E0', header: 'E65100', title: 'Revenue Streams',
         content: ['SaaS: $6–20/student/yr', 'Integration fees: $5K–30K', 'Per-FTE pricing', 'Enterprise support']}
    ];

    blocks.forEach(block => {
        // Background
        slide.addShape(pptx.ShapeType.rect, {
            x: block.x, y: block.y, w: block.w, h: block.h,
            fill: { color: block.bg },
            line: { color: 'DDDDDD', width: 1 }
        });

        // Header
        slide.addShape(pptx.ShapeType.rect, {
            x: block.x, y: block.y, w: block.w, h: 0.25,
            fill: { color: block.header },
            line: { color: block.header }
        });

        // Title
        slide.addText(block.title, {
            x: block.x + 0.08, y: block.y + 0.03, w: block.w - 0.16, h: 0.19,
            fontSize: 9, bold: true, color: 'FFFFFF',
            fontFace: 'Arial'
        });

        // Content
        const contentText = block.content.join('\n');
        slide.addText(contentText, {
            x: block.x + 0.08, y: block.y + 0.32, w: block.w - 0.16, h: block.h - 0.4,
            fontSize: 7.5, color: '333333',
            fontFace: 'Arial',
            valign: 'top'
        });
    });

    // Footer
    slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 4.05, w: 10, h: 0.3,
        fill: { color: 'FFFFFF' },
        line: { color: 'DDDDDD', width: 1 }
    });

    slide.addText('Stu: AI-powered degree planning & student success platform', {
        x: 0.2, y: 4.08, w: 9.6, h: 0.24,
        fontSize: 7, color: '666666',
        align: 'right', valign: 'middle',
        fontFace: 'Arial'
    });

    // Save presentation
    await pptx.writeFile({ fileName: '/Users/jarom/Desktop/stu_/stuV1.0/business-model-canvas.pptx' });
    console.log('✓ Business Model Canvas presentation created successfully!');
}

createPresentation().catch(console.error);
