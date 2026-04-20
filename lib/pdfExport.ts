import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    // Save original styles to restore them later
    const originalStyle = element.style.cssText;
    
    // Temporarily modify element styles so it captures EVERYTHING (no scrolling cut-offs)
    element.style.width = `${Math.max(1000, element.scrollWidth)}px`; 
    element.style.height = `${element.scrollHeight}px`;
    element.style.overflow = "visible";
    element.style.padding = "24px"; // Add some padding so content isn't flush with the capture edge
    element.style.backgroundColor = "#ffffff"; // Ensure solid white background

    // Capture the image data URL using html-to-image
    const imgData = await htmlToImage.toPng(element, { 
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    
    // Restore original styles
    element.style.cssText = originalStyle;

    // Load image to get its dimensions
    const img = new Image();
    img.src = imgData;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Standard A4 dimensions in landscape: 297mm x 210mm
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // PDF Margin
    const margin = 10;
    const availableWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - margin * 2 - 10; // -10 for title space

    const imgWidth = img.width;
    const imgHeight = img.height;
    
    // Calculate aspect ratio to fit image into A4 page
    const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

    const targetWidth = imgWidth * ratio;
    const targetHeight = imgHeight * ratio;

    // Center the image horizontally
    const x = (pdfWidth - targetWidth) / 2;
    const y = margin + 15; // Start below the title

    // Add a professional title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(30, 41, 59); // Slate-800
    pdf.text("Sitzplan", margin, margin + 5);
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139); // Slate-500
    pdf.text(filename.replace(/_/g, " "), margin, margin + 10);

    // Add the grid image
    pdf.addImage(imgData, "PNG", x, y, targetWidth, targetHeight);
    
    // Add export date at the bottom right
    pdf.setFontSize(8);
    pdf.text(`Exportiert am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')} Uhr`, pdfWidth - margin, pdfHeight - 5, { align: "right" });

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error("PDF Export failed", error);
    alert("Export fehlgeschlagen.");
  }
};
