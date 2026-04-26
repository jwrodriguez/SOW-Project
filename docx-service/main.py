from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import io
import re

app = FastAPI()

# Allow requests from the Next.js dev server and production origin.
# Update ALLOWED_ORIGINS if your Next.js app runs on a different port.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# ─── Pydantic models matching TemplateData shape ──────────────────────────────
# These mirror the TypeScript types in types/pageTypes.ts so FastAPI can
# validate the incoming JSON and provide clear error messages on bad input.

class TableData(BaseModel):
    id: str
    rows: int
    cols: int
    data: list[list[str]]

class SectionNode(BaseModel):
    id: str
    number: str
    title: str
    content: str
    locked: bool
    tables: Optional[list[TableData]] = []
    children: Optional[list["SectionNode"]] = []

# Required for self-referential Pydantic model (children: list[SectionNode])
SectionNode.model_rebuild()

class CoverPageData(BaseModel):
    title: str
    projectNumber: str
    clientName: str
    building: str
    location: str
    preparedBy: str
    department: str
    date: str
    version: str
    confidentiality: str

class HeaderFooterData(BaseModel):
    headerLeft: str
    headerCenter: str
    headerRight: str
    footerLeft: str
    footerCenter: str
    footerRight: str
    showPageNumbers: bool
    pageNumberPosition: str

class TemplateField(BaseModel):
    id: str
    label: str
    type: str
    defaultValue: Optional[str] = ""
    placeholder: Optional[str] = ""
    required: Optional[bool] = False

class TemplateData(BaseModel):
    documentName: str
    fields: list[TemplateField]
    coverPage: CoverPageData
    headerFooter: HeaderFooterData
    sections: list[SectionNode]


# ─── Token resolver ───────────────────────────────────────────────────────────
# Replaces {{field_id}} tokens in content strings with their defaultValue.
# The engineer page merges fieldValues into defaultValue before sending here,
# so defaultValue holds the final answer the engineer typed.
def resolve_tokens(content: str, field_map: dict[str, str]) -> str:
    def replace(match):
        field_id = match.group(1)
        return field_map.get(field_id, f"[{field_id}]")
    return re.sub(r"\{\{([^}]+)\}\}", replace, content)


# ─── Section renderer ─────────────────────────────────────────────────────────
# Recursively adds sections to the document with correct heading levels.
# Depth 0 = Heading 1, depth 1 = Heading 2, depth 2 = Heading 3.
def add_sections(doc: Document, sections: list[SectionNode], field_map: dict[str, str], depth: int = 0):
    heading_level = min(depth + 1, 3)

    for section in sections:
        # Section heading — number + title
        heading_text = f"{section.number}  {section.title}"
        doc.add_heading(heading_text, level=heading_level)

        # Section body — resolve any {{tokens}} to their filled values
        if section.content.strip():
            resolved = resolve_tokens(section.content, field_map)
            para = doc.add_paragraph(resolved)
            para.style = doc.styles["Normal"]

        # Tables
        if section.tables:
            for table_data in section.tables:
                if table_data.rows > 0 and table_data.cols > 0:
                    table = doc.add_table(rows=table_data.rows, cols=table_data.cols)
                    table.style = "Table Grid"
                    for ri, row in enumerate(table_data.data):
                        for ci, cell_value in enumerate(row):
                            if ri < len(table.rows) and ci < len(table.rows[ri].cells):
                                table.rows[ri].cells[ci].text = cell_value
                    doc.add_paragraph()  # spacing after table

        # Recurse into children
        if section.children:
            add_sections(doc, section.children, field_map, depth + 1)


# ─── Main export endpoint ─────────────────────────────────────────────────────
@app.post("/generate")
async def generate_docx(template: TemplateData):
    try:
        doc = Document()

        # Build a field map of id -> resolved value for token replacement.
        field_map = {
            f.id: (f.defaultValue or f.placeholder or f"[{f.label}]")
            for f in template.fields
        }

        # ── Cover page ────────────────────────────────────────────────────────
        cover = template.coverPage

        title_para = doc.add_paragraph()
        title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title_run = title_para.add_run(cover.title.upper())
        title_run.bold = True
        title_run.font.size = Pt(24)

        doc.add_paragraph()

        for_para = doc.add_paragraph()
        for_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for_run = for_para.add_run("FOR")
        for_run.bold = True
        for_run.font.size = Pt(18)

        client_para = doc.add_paragraph()
        client_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        client_run = client_para.add_run(cover.clientName.upper() if cover.clientName else "—")
        client_run.bold = True
        client_run.font.size = Pt(18)

        if cover.building:
            bldg_para = doc.add_paragraph()
            bldg_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            bldg_run = bldg_para.add_run(f"BUILDING {cover.building}")
            bldg_run.bold = True
            bldg_run.font.size = Pt(14)

        doc.add_paragraph()
        doc.add_paragraph()

        details = [
            cover.location,
            "",
            "Prepared by",
            cover.preparedBy,
            cover.department,
            "",
            f"Date: {cover.date}",
            f"Version: {cover.version}",
            f"Project Number: {cover.projectNumber}",
            f"Classification: {cover.confidentiality}",
        ]
        for line in details:
            p = doc.add_paragraph(line)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # ── End cover page with a section break that carries border + vAlign ──
        # Embedding a w:sectPr inside a paragraph's w:pPr ends Section 1 here.
        # Everything before this paragraph is in Section 1 (cover page only).
        # Everything after belongs to Section 2 (the rest of the document).
        # This isolates the border and vertical centering to the cover page only.
        cover_break_para = doc.add_paragraph()
        cover_pPr = OxmlElement("w:pPr")

        cover_sectPr = OxmlElement("w:sectPr")

        # Vertical centering — centers cover content between top and bottom margins
        vAlign = OxmlElement("w:vAlign")
        vAlign.set(qn("w:val"), "center")
        cover_sectPr.append(vAlign)

        # Page border — single black 3pt border on all four sides, cover page only
        pgBorders = OxmlElement("w:pgBorders")
        pgBorders.set(qn("w:offsetFrom"), "page")
        for side in ("w:top", "w:left", "w:bottom", "w:right"):
            b = OxmlElement(side)
            b.set(qn("w:val"), "single")
            b.set(qn("w:sz"), "24")
            b.set(qn("w:space"), "24")
            b.set(qn("w:color"), "000000")
            pgBorders.append(b)
        cover_sectPr.append(pgBorders)

        cover_pPr.append(cover_sectPr)
        cover_break_para._p.append(cover_pPr)

        # ── Table of Contents placeholder ─────────────────────────────────────
        doc.add_heading("Table of Contents", level=1)
        toc_note = doc.add_paragraph(
            "[Right-click this area in Word and select 'Update Field' "
            "to generate the Table of Contents]"
        )
        toc_note.runs[0].italic = True
        toc_note.runs[0].font.color.rgb = RGBColor(0x88, 0x88, 0x88)
        doc.add_page_break()

        # ── Document sections ─────────────────────────────────────────────────
        add_sections(doc, template.sections, field_map, depth=0)

        # ── Header and footer (Section 2 — all pages after cover) ─────────────
        # Tab stops position left/center/right text in a single paragraph
        # without tables so no visible borders appear.
        hf = template.headerFooter
        # 6.5in usable width in twips (1in = 1440 twips)
        PAGE_WIDTH_TWIPS = 9360

        def make_page_number_field() -> list:
            """Returns XML run elements forming a real Word PAGE field."""
            r1 = OxmlElement("w:r")
            fc1 = OxmlElement("w:fldChar")
            fc1.set(qn("w:fldCharType"), "begin")
            r1.append(fc1)

            r2 = OxmlElement("w:r")
            instr = OxmlElement("w:instrText")
            instr.text = " PAGE "
            instr.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            r2.append(instr)

            r3 = OxmlElement("w:r")
            fc3 = OxmlElement("w:fldChar")
            fc3.set(qn("w:fldCharType"), "end")
            r3.append(fc3)

            return [r1, r2, r3]

        def make_run(text: str, font_size: int = 9) -> OxmlElement:
            r = OxmlElement("w:r")
            rPr = OxmlElement("w:rPr")
            sz = OxmlElement("w:sz")
            sz.set(qn("w:val"), str(font_size * 2))
            rPr.append(sz)
            r.append(rPr)
            t = OxmlElement("w:t")
            t.text = text
            t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
            r.append(t)
            return r

        def make_tab_run() -> OxmlElement:
            r = OxmlElement("w:r")
            r.append(OxmlElement("w:tab"))
            return r

        def add_hf_paragraph(parent, left_text: str, center_text: str, right_text: str):
            """
            Single paragraph with center and right tab stops.
            Handles {PAGE} token by inserting a real Word PAGE field.
            """
            for para in parent.paragraphs:
                para._p.getparent().remove(para._p)

            p = OxmlElement("w:p")
            pPr = OxmlElement("w:pPr")
            tabs = OxmlElement("w:tabs")

            tab_c = OxmlElement("w:tab")
            tab_c.set(qn("w:val"), "center")
            tab_c.set(qn("w:pos"), str(PAGE_WIDTH_TWIPS // 2))
            tabs.append(tab_c)

            tab_r = OxmlElement("w:tab")
            tab_r.set(qn("w:val"), "right")
            tab_r.set(qn("w:pos"), str(PAGE_WIDTH_TWIPS))
            tabs.append(tab_r)

            pPr.append(tabs)
            p.append(pPr)

            def append_text_or_field(zone_text: str):
                """Splits text on {PAGE} and inserts a real field for that token."""
                if not zone_text:
                    return
                parts = zone_text.split("{PAGE}")
                for i, part in enumerate(parts):
                    if part:
                        p.append(make_run(part))
                    if i < len(parts) - 1:
                        for field_run in make_page_number_field():
                            p.append(field_run)

            append_text_or_field(left_text)
            p.append(make_tab_run())
            append_text_or_field(center_text)
            p.append(make_tab_run())
            append_text_or_field(right_text)

            parent._element.append(p)

        # Section 2 is doc.sections[0] in python-docx when a section break exists
        # doc.sections[-1] always refers to the last (main) section
        main_section = doc.sections[-1]

        add_hf_paragraph(
            main_section.header,
            hf.headerLeft.split("\n")[0] if hf.headerLeft else "",
            hf.headerCenter,
            hf.headerRight,
        )
        add_hf_paragraph(
            main_section.footer,
            hf.footerLeft,
            hf.footerCenter,
            hf.footerRight,
        )

        # ── Serialize and return ──────────────────────────────────────────────
        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)

        filename = template.documentName.replace(" ", "-").lower()
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}.docx"'
        }

        return Response(
            content=file_stream.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=headers,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}