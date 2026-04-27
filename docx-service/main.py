from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic import Field
from typing import List, Optional
from docx import Document
from docx.shared import Inches
from docx.shared import Pt
from docx.oxml.ns import qn
import io


# This python script converts the SOW's to word .docx
# It utlizatied the system we built out for .json files and 
# FastAPI to generate a word document. 

#TODO: Account for tables and match formating to editor better


app = FastAPI()
FONT_SANS = "Calibri"
FONT_MONO = "Consolas"


# Allow frontend requests 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------

class Section(BaseModel):
    id: Optional[str] = None
    number: Optional[str] = ""
    title: Optional[str] = ""
    content: Optional[str] = ""
    children: List["Section"] = Field(default_factory=list)

Section.model_rebuild()

class DocumentModel(BaseModel):
    documentName: Optional[str] = "Document"
    sections: List[Section] = Field(default_factory=list)

    coverPage: Optional[dict] = None
    headerFooter: Optional[dict] = None


# ---------- Core Rendering Logic ----------

def render_section(doc, section, level=1):
    title_text = f"{section.number or ''} {section.title or ''}".strip()

    indent = 0.25 * (level - 1)

    # Heading
    if title_text:
        add_heading(doc, title_text, level, indent)

    # Content
    if section.content:
        add_paragraph(doc, section.content, indent + 0.25)

    # Children
    for child in section.children:
        render_section(doc, child, level + 1)


# FastAPI endpoint
@app.post("/generate")
async def generate_docx(data: DocumentModel):
    doc = Document()

    # --- NEW: Cover Page ---
    if hasattr(data, "coverPage") and data.coverPage:
        render_cover_page(doc, data.coverPage)
    else:
        if data.documentName:
            doc.add_heading(data.documentName, 0)

    # --- NEW: Header/Footer ---
    if hasattr(data, "headerFooter") and data.headerFooter:
        apply_header_footer(doc, data.headerFooter)

    # --- Sections ---
    for section in data.sections:
        render_section(doc, section, level=1)

    # Save to memory
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)

    return Response(
        content=file_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{data.documentName}.docx"'
        },
    )

def render_cover_page(doc, cover):
    p = doc.add_paragraph()
    run = p.add_run(cover.get("title", ""))
    run.bold = True
    p.alignment = 1  # center

    doc.add_paragraph(f"Project: {cover.get('projectNumber', '')}").alignment = 1
    doc.add_paragraph(f"Client: {cover.get('clientName', '')}").alignment = 1
    doc.add_paragraph(f"Date: {cover.get('date', '')}").alignment = 1

    doc.add_page_break()

def apply_header_footer(doc, hf):
    section = doc.sections[0]

    header = section.header
    header.paragraphs[0].text = hf.get("headerLeft", "")

    footer = section.footer
    footer.paragraphs[0].text = hf.get("footerLeft", "")

def add_paragraph(doc, text, indent=0):
    p = doc.add_paragraph()
    run = p.add_run(text)

    run.font.name = FONT_SANS
    run.font.size = Pt(11)
    run._element.rPr.rFonts.set(qn('w:eastAsia'), FONT_SANS)

    p.paragraph_format.left_indent = Inches(indent)
    p.paragraph_format.space_after = Pt(8)

    return p

def add_heading(doc, text, level, indent=0):
    h = doc.add_heading("", level=min(level, 9))
    run = h.add_run(text)

    run.font.name = FONT_SANS
    run.font.size = Pt(12)
    run.bold = True
    run._element.rPr.rFonts.set(qn('w:eastAsia'), FONT_SANS)

    h.paragraph_format.left_indent = Inches(indent)
    h.paragraph_format.space_after = Pt(6)

    return h
