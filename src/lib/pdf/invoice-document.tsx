import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatDate } from "@/lib/utils";

// Format numbers for PDF with standard ASCII characters (e.g. 18,000/- or 60.50/-)
function formatPdfCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return "0/-";
  const num = Number(amount);
  const formatted =
    num % 1 === 0
      ? num.toLocaleString("en-IN")
      : num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${formatted}/-`;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
    lineHeight: 1.4,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 26,
    height: 26,
    marginBottom: 4,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#164e3f",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#164e3f",
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#164e3f",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    color: "#047857",
    marginBottom: 3,
  },
  companyDetails: {
    fontSize: 7.5,
    textAlign: "center",
    color: "#64748b",
    lineHeight: 1.3,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    marginVertical: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    fontSize: 8.5,
  },
  metaLeft: {
    flex: 1,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  refNote: {
    color: "#64748b",
    fontFamily: "Helvetica-Oblique",
    marginBottom: 2,
  },
  billTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#164e3f",
    marginVertical: 6,
    textTransform: "uppercase",
  },
  buyerBlock: {
    marginBottom: 8,
  },
  buyerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  buyerDetail: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 1,
  },
  subject: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 4,
    marginBottom: 3,
  },
  salutation: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 1.3,
  },
  table: {
    borderWidth: 0.5,
    borderColor: "#94a3b8",
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#0f172a",
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    fontSize: 7.5,
    paddingVertical: 3.5,
    alignItems: "center",
  },
  colSL: { width: "5%", textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colDate: { width: "12%", textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colOrderNo: { width: "16%", textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colChallan: { width: "10%", textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colStyleRef: { width: "11%", textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colDesign: { width: "20%", paddingHorizontal: 4, borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colPerPcs: { width: "9%", textAlign: "right", paddingRight: 4, borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colQty: { width: "8%", textAlign: "center", borderRightWidth: 0.5, borderRightColor: "#cbd5e1" },
  colAmount: { width: "13%", textAlign: "right", paddingRight: 4, fontFamily: "Helvetica-Bold" },
  summaryContainer: {
    alignSelf: "flex-end",
    width: "45%",
    marginTop: 4,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 8,
  },
  summaryRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: "#164e3f",
    marginTop: 2,
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
  },
  inWords: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 20,
  },
  footerSection: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  signatureBuyer: {
    width: 120,
    borderTopWidth: 0.8,
    borderTopColor: "#94a3b8",
    paddingTop: 3,
    fontSize: 7.5,
    textAlign: "center",
    color: "#64748b",
  },
  signatureBlock: {
    textAlign: "right",
  },
  proprietorName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#164e3f",
  },
  proprietorTitle: {
    fontSize: 7.5,
    color: "#475569",
  },
});

export interface InvoiceDocumentProps {
  invoice: any;
  settings: any;
  hideHeader?: boolean;
}

export const InvoicePDFDocument: React.FC<InvoiceDocumentProps> = ({
  invoice,
  settings,
  hideHeader = false,
}) => {
  // Flatten line items from all bundled orders
  let sl = 1;
  const lineItems: any[] = [];

  for (const orderJoin of invoice.orders || []) {
    const order = orderJoin.order;
    for (const item of order.items || []) {
      lineItems.push({
        sl: sl++,
        date: formatDate(order.orderDate, "dd-MM-yyyy"),
        orderNo: order.orderNumber,
        challanNo: order.challanNumber || "—",
        styleRef: item.styleRef || "—",
        designDesc: item.designReference,
        perPcs: formatPdfCurrency(item.unitPrice),
        quantity: item.quantity,
        amount: formatPdfCurrency(item.totalPrice),
      });
    }
  }

  return (
    <Document>
      <Page
        size="A4"
        style={{
          ...styles.page,
          paddingTop: hideHeader ? 140 : 36,
        }}
      >
        {/* Company Header (Only shown if hideHeader is false) */}
        {!hideHeader && (
          <>
            <View style={styles.headerContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>N</Text>
              </View>
              <Text style={styles.companyName}>{settings.companyName || "New Model Embroidery"}</Text>
              <Text style={styles.subtitle}>{settings.subtitle || "( A Computerized Embroidery Project )"}</Text>
              <Text style={styles.companyDetails}>
                {settings.address ||
                  "South Azampur, House 23, R-1, Block-A, Jalal Ahmed Soroni Road, Dhakhin Khan, Dhaka-1230"}
              </Text>
              <Text style={styles.companyDetails}>
                Mobile : {settings.phones || "01731-992361, 01971-992361, 0013472992519"}
              </Text>
              <Text style={styles.companyDetails}>
                E-mail: {settings.email || "newmodelemb@gmail.com"}
              </Text>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            {invoice.referenceNote && (
              <Text style={styles.refNote}>Ref: {invoice.referenceNote}</Text>
            )}
            <Text>
              <Text style={styles.bold}>Bill No: </Text>
              {invoice.invoiceNumber}
            </Text>
            <Text>
              <Text style={styles.bold}>Date: </Text>
              {formatDate(invoice.invoiceDate, "yyyy-MM-dd")}
            </Text>
          </View>
        </View>

        {/* Bill Title */}
        <Text style={styles.billTitle}>Bill - {invoice.invoiceNumber}</Text>

        {/* Buyer Info */}
        <View style={styles.buyerBlock}>
          <Text style={styles.buyerDetail}>To</Text>
          <Text style={styles.buyerName}>{invoice.buyer?.companyName}</Text>
          <Text style={styles.buyerDetail}>Location: {invoice.buyer?.address}</Text>
          <Text style={styles.buyerDetail}>Contact No. {invoice.buyer?.phone}</Text>
        </View>

        {/* Subject & Salutation */}
        <Text style={styles.subject}>{invoice.subject || "Subject: Bill for Embroidery orders."}</Text>
        <Text style={styles.salutation}>
          {invoice.salutationText ||
            "Dear Sir,\nWe are pleased to submit the bill of Embroidery work which done by us. We will be highly Grateful to you if you could make the payments at your earliest."}
        </Text>

        {/* Itemized Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colSL}>SL</Text>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colOrderNo}>Order No</Text>
            <Text style={styles.colChallan}>Challan #</Text>
            <Text style={styles.colStyleRef}>Style Ref</Text>
            <Text style={styles.colDesign}>Design Desc.</Text>
            <Text style={styles.colPerPcs}>Per pcs</Text>
            <Text style={styles.colQty}>Quantity</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {lineItems.map((row, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colSL}>{row.sl}</Text>
              <Text style={styles.colDate}>{row.date}</Text>
              <Text style={styles.colOrderNo}>{row.orderNo}</Text>
              <Text style={styles.colChallan}>{row.challanNo}</Text>
              <Text style={styles.colStyleRef}>{row.styleRef}</Text>
              <Text style={styles.colDesign}>{row.designDesc}</Text>
              <Text style={styles.colPerPcs}>{row.perPcs}</Text>
              <Text style={styles.colQty}>{row.quantity}</Text>
              <Text style={styles.colAmount}>{row.amount}</Text>
            </View>
          ))}
        </View>

        {/* Financial Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={{ color: "#64748b" }}>Subtotal</Text>
            <Text style={styles.bold}>{formatPdfCurrency(invoice.subtotal)}</Text>
          </View>
          {Number(invoice.discount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={{ color: "#64748b" }}>Discount</Text>
              <Text>- {formatPdfCurrency(invoice.discount)}</Text>
            </View>
          )}
          {Number(invoice.advanceReceived) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={{ color: "#64748b" }}>Advance Received</Text>
              <Text>- {formatPdfCurrency(invoice.advanceReceived)}</Text>
            </View>
          )}
          <View style={styles.summaryRowGrand}>
            <Text style={{ color: "#164e3f" }}>Grand Total</Text>
            <Text style={{ color: "#164e3f" }}>{formatPdfCurrency(invoice.grandTotal)}</Text>
          </View>
        </View>

        {/* In Words */}
        <Text style={styles.inWords}>In Words: {invoice.inWords || "Forty Six Thousand Five Hundred Taka Only"}</Text>

        {/* Footer & Signature */}
        <View style={styles.footerSection}>
          <View style={styles.signatureBuyer}>
            <Text>Buyer Signature</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={{ fontSize: 7.5, color: "#64748b", fontStyle: "italic", marginBottom: 2 }}>
              Your faithfully,
            </Text>
            <Text style={styles.proprietorName}>{settings.proprietorName || "Radwen Hossain"}</Text>
            <Text style={styles.proprietorTitle}>Proprietor, {settings.companyName || "New Model Embroidery"}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
