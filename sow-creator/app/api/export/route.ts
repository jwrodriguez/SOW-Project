/**
 * Export API route - receives merged TemplateData from the SOW engineer page,
 * forwards it to the FastAPI docx service, and streams the .docx back to the browser.
 *
 * The engineer page merges fieldValues into fields[].defaultValue before calling
 * this route so the Python service receives a complete self-contained document.
 *
 * POST /api/export
 * Body: TemplateData JSON
 * Response: .docx file download
 */

import { NextRequest, NextResponse } from "next/server";

// URL of the FastAPI docx service. Update this if the service runs on a different port.
// In production this should come from an environment variable.
const DOCX_SERVICE_URL = process.env.DOCX_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic presence check - the Python service does full Pydantic validation
    // but we catch obviously missing fields early to return a clear error.
    if (!body.documentName || !body.sections || !body.headerFooter) {
      return NextResponse.json(
        { error: "Invalid template data - missing required fields." },
        { status: 400 }
      );
    }

    // Forward the full TemplateData to the FastAPI service
    const serviceResponse = await fetch(`${DOCX_SERVICE_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!serviceResponse.ok) {
      const detail = await serviceResponse.text();
      console.error("Docx service error:", detail);
      return NextResponse.json(
        { error: "Document generation failed.", detail },
        { status: 502 }
      );
    }

    // Stream the .docx binary back to the browser as a file download
    const docxBuffer = await serviceResponse.arrayBuffer();
    const filename = `${body.documentName.replace(/\s+/g, "-").toLowerCase()}.docx`;

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export route error:", err);
    return NextResponse.json(
      { error: "Unexpected server error during export." },
      { status: 500 }
    );
  }
}