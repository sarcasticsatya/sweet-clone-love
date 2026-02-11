import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReceiptData {
  transactionId: string;
  date: string;
  studentName: string;
  courseName: string;
  amountPaid: number;
  discountAmount?: number | null;
  couponCode?: string | null;
  paymentMethod?: string;
  paymentGateway?: string | null;
  validityDays?: number;
  expiresAt?: string;
}

export const generateReceipt = (data: ReceiptData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // ---- HEADER ----
  // Brand bar
  doc.setFillColor(99, 51, 204); // Purple brand color
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("NythicAI", margin, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Your 24x7 Personal Teacher", margin, 28);

  doc.setFontSize(9);
  doc.text("www.nythicai.com", pageWidth - margin, 20, { align: "right" });
  doc.text("support@nythicai.com", pageWidth - margin, 28, { align: "right" });

  // ---- INVOICE TITLE ----
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Receipt", margin, 55);

  // Receipt number & date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt #: ${data.transactionId.substring(0, 8).toUpperCase()}`, margin, 64);
  doc.text(`Date: ${data.date}`, margin, 71);

  // ---- BILL TO ----
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Bill To:", margin, 85);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentName, margin, 93);

  // ---- LINE ----
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 100, pageWidth - margin, 100);

  // ---- ORDER DETAILS TABLE ----
  const originalPrice = data.amountPaid + (data.discountAmount || 0);

  const tableBody: (string | number)[][] = [
    ["Course", data.courseName, "1", `₹${originalPrice.toLocaleString("en-IN")}`],
  ];

  autoTable(doc, {
    startY: 108,
    head: [["Description", "Item", "Qty", "Amount"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [99, 51, 204],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      3: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // Get Y position after table
  let y = (doc as any).lastAutoTable.finalY + 10;

  // ---- TOTALS ----
  const totalsX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  doc.text("Subtotal:", totalsX - 60, y);
  doc.text(`₹${originalPrice.toLocaleString("en-IN")}`, totalsX, y, { align: "right" });
  y += 8;

  if (data.discountAmount && data.discountAmount > 0) {
    doc.setTextColor(0, 150, 0);
    doc.text(`Discount${data.couponCode ? ` (${data.couponCode})` : ""}:`, totalsX - 60, y);
    doc.text(`-₹${data.discountAmount.toLocaleString("en-IN")}`, totalsX, y, { align: "right" });
    y += 8;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX - 80, y, totalsX, y);
  y += 8;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Total Paid:", totalsX - 60, y);
  doc.text(`₹${data.amountPaid.toLocaleString("en-IN")}`, totalsX, y, { align: "right" });
  y += 14;

  // ---- PAYMENT INFO ----
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);

  if (data.paymentGateway) {
    doc.text(`Payment Gateway: ${data.paymentGateway}`, margin, y);
    y += 7;
  }
  if (data.validityDays) {
    doc.text(`Validity: ${data.validityDays} days`, margin, y);
    y += 7;
  }
  if (data.expiresAt) {
    doc.text(`Valid Until: ${data.expiresAt}`, margin, y);
    y += 7;
  }

  // ---- FOOTER ----
  const footerY = doc.internal.pageSize.getHeight() - 30;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(99, 51, 204);
  doc.text("Thank you for choosing NythicAI!", pageWidth / 2, footerY + 2, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 130, 130);
  doc.text(
    "NythicAI • 17-18 2nd Floor, Maruti Complex, Line Bazar, Dharwad 580001 • WhatsApp: +91 82773 23208",
    pageWidth / 2,
    footerY + 10,
    { align: "center" }
  );

  // Save
  doc.save(`NythicAI_Receipt_${data.transactionId.substring(0, 8).toUpperCase()}.pdf`);
};
