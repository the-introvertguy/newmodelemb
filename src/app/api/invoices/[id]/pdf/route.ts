import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getInvoiceById } from "@/actions/invoices";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "@/lib/pdf/invoice-document";
import React from "react";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { invoice, settings } = await getInvoiceById(id);

    const isLetterhead =
      req.nextUrl.searchParams.get("letterhead") === "true" ||
      req.nextUrl.searchParams.get("hideHeader") === "true";

    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDFDocument, {
        invoice,
        settings,
        hideHeader: isLetterhead,
      }) as any
    );

    const filename = isLetterhead
      ? `Bill-${invoice.invoiceNumber}-Pad.pdf`
      : `Bill-${invoice.invoiceNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[Invoice PDF Generation Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to render PDF" },
      { status: 500 }
    );
  }
}
