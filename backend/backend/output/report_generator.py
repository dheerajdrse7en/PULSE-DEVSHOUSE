"""
report_generator.py
Generates the official PMGSY Application PDF using ReportLab.
"""
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from pathlib import Path
import datetime

def generate_pmgsy_pdf(session_data: dict, filepath: str) -> str:
    """
    Generates a PDF report for PMGSY application.
    """
    # Ensure directory exists
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    
    doc = SimpleDocTemplate(
        filepath, 
        pagesize=A4,
        rightMargin=72, leftMargin=72,
        topMargin=72, bottomMargin=18
    )
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CenterTitle', alignment=1, fontSize=16, spaceAfter=20, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='NormalIndent', fontSize=10, leading=14, firstLineIndent=20))
    
    Story = []
    
    # Title
    Story.append(Paragraph("PRADHAN MANTRI GRAM SADAK YOJANA (PMGSY)", styles['CenterTitle']))
    Story.append(Paragraph("ROAD SURVEILLANCE & REHABILITATION APPLICATION", styles['CenterTitle']))
    Story.append(Spacer(1, 0.2 * inch))
    
    # Metadata
    pmgsy = session_data.get("pmgsy_application", {})
    eco = session_data.get("economic", {})
    
    data = [
        ["Report Generated On", datetime.datetime.now().strftime("%Y-%m-%d %H:%M")],
        ["Session ID", session_data.get("session_id", "N/A")],
        ["Road Length Assessed", f"{pmgsy.get('road_length_km', 'N/A')} km"],
        ["Surface Type", pmgsy.get("surface_type", "Unknown")],
        ["Overall IRI", str(pmgsy.get("iri_condition", "N/A"))],
        ["Proposed Intervention", pmgsy.get("intervention_type", "N/A")],
        ["Estimated Budget", f"Rs {pmgsy.get('total_budget_lakh', 'N/A')} Lakh"],
    ]
    
    t = Table(data, colWidths=[2 * inch, 3.5 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    Story.append(t)
    Story.append(Spacer(1, 0.4 * inch))
    
    # Drafted Text
    Story.append(Paragraph("1. Auto-Drafted Application Narrative", styles['Heading2']))
    
    app_text = pmgsy.get("application_text", "")
    if app_text:
        for paragraph in app_text.split('\n'):
            if paragraph.strip():
                Story.append(Paragraph(paragraph.strip(), styles['NormalIndent']))
                Story.append(Spacer(1, 0.1 * inch))
    else:
         Story.append(Paragraph("No narrative drafted. Please ensure pipeline analyzes video.", styles['Normal']))

    Story.append(Spacer(1, 0.3 * inch))
    
    # Economic Summary
    Story.append(Paragraph("2. Economic Impact Summary", styles['Heading2']))
    eco_text = eco.get("narrative", "")
    if eco_text:
        Story.append(Paragraph(eco_text, styles['NormalIndent']))
    else:
        Story.append(Paragraph("No economic analysis available.", styles['Normal']))
        
    doc.build(Story)
    return filepath
