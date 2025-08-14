import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import * as path from "path";

// Main PDF Service class
export class PDFService {
  static async generateIntakeFormPDF(
    patientData: any,
    webhookData: any,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "LETTER",
          margin: 40,
          info: {
            Title: "Patient Intake Form",
            Author: "EONMeds",
            Subject: "Patient Intake Form",
          },
        });

        // Register Poppins font if available, otherwise use Helvetica
        try {
          // In production, you would add Poppins font files to your project
          // doc.registerFont('Poppins', 'path/to/Poppins-Regular.ttf');
          // doc.registerFont('Poppins-Bold', 'path/to/Poppins-Bold.ttf');
        } catch (e) {
          // Fallback to Helvetica if Poppins not available
        }

        const stream = new PassThrough();
        const chunks: Buffer[] = [];

        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);

        doc.pipe(stream);

        // Add EONMeds logo
        try {
          const logoPath = path.join(__dirname, "../assets/eonmeds-logo.png");
          doc.image(logoPath, 40, 40, { width: 120 });
        } catch (error) {
          // Fallback to text logo if image fails with Poppins-like styling
          doc
            .fontSize(32)
            .fillColor("#20c997")
            .font("Helvetica-Bold")
            .text("eonmeds", 40, 45, { align: "left" })
            .fillColor("#000000");
        }

        // Title
        doc
          .fontSize(24)
          .font("Helvetica-Bold")
          .text("Patient Intake Form", 40, 110);

        // Submission info
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#666666")
          .text(
            `Submitted via HeyFlow on ${formatDateFull(patientData.created_at || new Date())}`,
            40,
            140,
          );

        // Reset color
        doc.fillColor("#000000");

        // Patient Information Section with new design
        let currentY = 180;

        // Consent Agreements Section first (as requested)
        currentY = drawRoundedSection(doc, currentY, "Consent Agreements", [
          [
            {
              label: "Telehealth Consent",
              value:
                webhookData.consent_telehealth === "yes"
                  ? "✓ Accepted ✓"
                  : "Not accepted",
              description:
                "By checking this box, I confirm that I understand and agree to receive medical care and treatment through telehealth services. I acknowledge that I have read and agree to the terms outlined in the Telehealth Consent Policy.",
              isConsent: true,
              isAccepted: webhookData.consent_telehealth === "yes",
              fullWidth: true,
            },
          ],
          [
            {
              label: "Terms & Conditions Agreement",
              value:
                webhookData.consent_telehealth === "yes"
                  ? "✓ Accepted"
                  : "Not accepted", // If telehealth is accepted, terms are also accepted
              description:
                "By checking the box below, you confirm that you have read and agree to our Terms & Conditions and Privacy Policy.",
              isConsent: true,
              isAccepted: webhookData.consent_telehealth === "yes", // Linked to telehealth consent
              fullWidth: true,
            },
          ],
          [
            {
              label: "Cancellation & Subscription Policy",
              value:
                webhookData.consent_cancellation === "yes"
                  ? "✓ Accepted"
                  : "Not accepted",
              description:
                "By checking this box, I acknowledge that I have read and agree to the Cancellation Policy. I understand that all sales are final, and charges may recur monthly unless canceled according to the terms provided.",
              isConsent: true,
              isAccepted: webhookData.consent_cancellation === "yes",
              fullWidth: true,
            },
          ],
          [
            {
              label: "ARE YOU OVER THE AGE OF 18?",
              value:
                webhookData.over_18 === "yes" ? "✓ Accepted ✓" : "Not accepted",
              description:
                "18+ Disclosure: By submitting this form. I certify that I am over 18 years of age and that the date of birth provided in this form is legitimate and it belongs to me.",
              isConsent: true,
              isAccepted: webhookData.over_18 === "yes",
              fullWidth: true,
            },
          ],
        ]);

        // Now Patient Information
        if (currentY > 600) {
          doc.addPage();
          currentY = 50;
        }
        currentY = drawRoundedSection(
          doc,
          currentY + 20,
          "Patient Information",
          [
            [
              { label: "FIRST NAME", value: patientData.first_name || "" },
              { label: "LAST NAME", value: patientData.last_name || "" },
            ],
            [
              {
                label: "DATE OF BIRTH",
                value: formatDateLong(patientData.date_of_birth) || "",
              },
              {
                label: "SEX",
                value: capitalizeFirst(patientData.gender) || "",
              },
            ],
            [
              { label: "EMAIL ADDRESS", value: patientData.email || "" },
              {
                label: "PHONE NUMBER",
                value: formatPhone(patientData.phone) || "",
              },
            ],
          ],
        );

        // Shipping Information Section - more compact layout
        if (currentY > 600) {
          doc.addPage();
          currentY = 50;
        }
        currentY = drawRoundedSection(
          doc,
          currentY + 20,
          "Shipping Information",
          [
            [
              {
                label: "STREET ADDRESS",
                value: webhookData.street || "Not provided",
                fullWidth: true,
              },
            ],
            [
              { label: "APT/SUITE", value: webhookData.apt || "Not provided" },
              { label: "CITY", value: webhookData.city || "Not provided" },
            ],
            [
              { label: "STATE", value: webhookData.state || "Not provided" },
              {
                label: "POSTAL CODE",
                value: webhookData.zip || "Not provided",
              },
            ],
            [
              {
                label: "COUNTRY",
                value: webhookData.country || "Estados Unidos",
                fullWidth: true,
              },
            ],
          ],
        );

        // Check if we need a new page
        if (currentY > 500) {
          doc.addPage();
          currentY = 50;
        }

        // Treatment Readiness Section with visual elements
        if (currentY > 650) {
          doc.addPage();
          currentY = 50;
        }
        currentY = drawRoundedSection(
          doc,
          currentY + 20,
          "Treatment Readiness",
          [
            [
              {
                label:
                  "HOW COMMITTED ARE YOU TO STARTING TREATMENT? (SCALE 1-5)",
                value: formatCommitmentWithVisual(webhookData.commitment_level),
                isSpecial: true,
                fullWidth: true,
              },
            ],
            [
              {
                label: "HOW DID YOU HEAR ABOUT US?",
                value:
                  capitalizeFirst(webhookData.referral_source) ||
                  "Not specified",
                fullWidth: true,
              },
            ],
            [
              {
                label: "HOW WOULD YOUR LIFE CHANGE BY LOSING WEIGHT?",
                value:
                  webhookData.allFields?.[
                    "How would your life change by losing weight?"
                  ] ||
                  webhookData.allFields?.[
                    "HOW WOULD YOUR LIFE CHANGE BY LOSING WEIGHT?"
                  ] ||
                  "Not specified",
                fullWidth: true,
              },
            ],
            [
              {
                label:
                  "WOULD YOU BE INTERESTED IN YOUR PROVIDER CONSIDERING A PERSONALIZED TREATMENT PLAN TO HELP YOU MANAGE THESE SIDE EFFECTS?",
                value: formatAnswer(
                  webhookData.allFields?.[
                    "Would you be interested in your provider considering a personalized treatment plan to help you manage these side effects?"
                  ] ||
                    webhookData.allFields?.[
                      "WOULD YOU BE INTERESTED IN YOUR PROVIDER CONSIDERING A PERSONALIZED TREATMENT PLAN TO HELP YOU MANAGE THESE SIDE EFFECTS?"
                    ] ||
                    "",
                ),
                fullWidth: true,
              },
            ],
          ],
        );

        // Weight Loss Treatment Info - right after Treatment Readiness
        if (webhookData.allFields) {
          const feet =
            webhookData.allFields?.["FEET"] ||
            webhookData.allFields?.["feet"] ||
            "";
          const inches =
            webhookData.allFields?.["INCHES"] ||
            webhookData.allFields?.["inches"] ||
            "";
          const heightDisplay =
            feet && inches ? `${feet}' ${inches}"` : "Not provided";

          // Try to find starting weight with various field names
          const startingWeight =
            webhookData.allFields?.["STARTING WEIGHT"] ||
            webhookData.allFields?.["starting weight"] ||
            webhookData.allFields?.["STARTINGWEIGHT"] ||
            webhookData.allFields?.["Starting Weight"] ||
            webhookData.allFields?.["starting_weight"] ||
            webhookData.allFields?.["startingweight"] ||
            webhookData.allFields?.["StartingWeight"] ||
            webhookData.allFields?.["STARTING_WEIGHT"] ||
            "Not provided";

          // Try to find ideal weight with various field names
          const idealWeight =
            webhookData.allFields?.["IDEALWEIGHT"] ||
            webhookData.allFields?.["ideal weight"] ||
            webhookData.allFields?.["IDEAL WEIGHT"] ||
            webhookData.allFields?.["Ideal Weight"] ||
            webhookData.allFields?.["idealweight"] ||
            webhookData.allFields?.["ideal_weight"] ||
            webhookData.allFields?.["IdealWeight"] ||
            webhookData.allFields?.["IDEAL_WEIGHT"] ||
            "Not provided";

          currentY = drawRoundedSection(
            doc,
            currentY + 20,
            "Weight Loss Treatment Info",
            [
              [
                {
                  label: "HEIGHT",
                  value: heightDisplay,
                  fullWidth: true,
                },
              ],
              [
                {
                  label: "STARTING WEIGHT",
                  value: startingWeight,
                  fullWidth: true,
                },
              ],
              [
                {
                  label: "IDEAL WEIGHT",
                  value: idealWeight,
                  fullWidth: true,
                },
              ],
              [
                {
                  label: "BMI",
                  value:
                    webhookData.allFields?.["BMI"] ||
                    webhookData.allFields?.["bmi"] ||
                    "Not provided",
                  fullWidth: true,
                },
              ],
            ],
          );
        }

        // Add Medical History on new page
        doc.addPage();

        // Medical History Section (keeping same data, just updating visual style)
        drawRoundedSection(doc, 50, "Medical History", [
          [
            {
              label: "HAVE YOU EVER TAKEN A GLP-1 MEDICATION BEFORE?",
              value: formatAnswer(webhookData.glp1_medication),
              fullWidth: true,
            },
          ],
          [
            {
              label: "HAVE YOU EVER BEEN DIAGNOSED WITH TYPE 1 DIABETES?",
              value: formatAnswer(webhookData.diabetes_type1),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "HAVE YOU EVER BEEN DIAGNOSED WITH ANY TYPE OF THYROID CANCER?",
              value: formatAnswer(webhookData.thyroid_cancer),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "HAVE YOU EVER BEEN DIAGNOSED WITH MULTIPLE ENDOCRINE NEOPLASIA (MEN)?",
              value: formatAnswer(webhookData.endocrine_neoplasia),
              fullWidth: true,
            },
          ],
          [
            {
              label: "HAVE YOU EVER BEEN DIAGNOSED WITH CHRONIC PANCREATITIS?",
              value: formatAnswer(webhookData.pancreatitis),
              fullWidth: true,
            },
          ],
          [
            {
              label: "ARE YOU CURRENTLY PREGNANT OR BREASTFEEDING?",
              value: formatAnswer(webhookData.pregnant_breastfeeding),
              fullWidth: true,
            },
          ],
          [
            {
              label: "DO YOU HAVE ANY KNOWN ALLERGIES TO MEDICATIONS?",
              value: formatAnswer(webhookData.medication_allergies),
              fullWidth: true,
            },
          ],
          [
            {
              label: "WHAT IS YOUR MOST RECENT BLOOD PRESSURE READING?",
              value: webhookData.blood_pressure || "Not provided",
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "HAVE YOU BEEN DIAGNOSED WITH ANY MENTAL HEALTH CONDITION?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Have you been diagnosed with any mental health condition?"
                ] ||
                  webhookData.allFields?.[
                    "HAVE YOU BEEN DIAGNOSED WITH ANY MENTAL HEALTH CONDITION?"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "DO YOU HAVE A PERSONAL HISTORY OF MEDULLARY THYROID CANCER?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Do you have a personal history of medullary thyroid cancer?1"
                ] ||
                  webhookData.allFields?.[
                    "DO YOU HAVE A PERSONAL HISTORY OF MEDULLARY THYROID CANCER?1"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "HAVE YOU EVER UNDERGONE ANY SURGERIES OR MEDICAL PROCEDURES?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Have you ever undergone any surgeries or medical procedures?"
                ] ||
                  webhookData.allFields?.[
                    "HAVE YOU EVER UNDERGONE ANY SURGERIES OR MEDICAL PROCEDURES?"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "HAVE YOU BEEN DIAGNOSED WITH ANY OF THE FOLLOWING CONDITIONS?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Have you been diagnosed with any of the following conditions?"
                ] ||
                  webhookData.allFields?.[
                    "HAVE YOU BEEN DIAGNOSED WITH ANY OF THE FOLLOWING CONDITIONS?"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "CHRONIC DISEASES: DO YOU HAVE A HISTORY OF ANY OF THE FOLLOWING?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Chronic Diseases: Do you have a history of any of the following?"
                ] ||
                  webhookData.allFields?.[
                    "CHRONIC DISEASES: DO YOU HAVE A HISTORY OF ANY OF THE FOLLOWING?"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "DO YOU USUALLY PRESENT SIDE EFFECTS WHEN STARTING A NEW MEDICATION?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Do you usually present side effects when starting a new medication?"
                ] ||
                  webhookData.allFields?.[
                    "DO YOU USUALLY PRESENT SIDE EFFECTS WHEN STARTING A NEW MEDICATION?"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "HAVE YOU EVER UNDERGONE ANY OF THE FOLLOWING WEIGHT LOSS SURGERIES OR PROCEDURES?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Have you ever undergone any of the following weight loss surgeries or procedures?"
                ] ||
                  webhookData.allFields?.[
                    "HAVE YOU EVER UNDERGONE ANY OF THE FOLLOWING WEIGHT LOSS SURGERIES OR PROCEDURES?"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
          [
            {
              label:
                "HAVE YOU OR ANY OF YOUR FAMILY MEMBERS EVER BEEN DIAGNOSED WITH ANY OF THE FOLLOWING CONDITIONS?",
              value: formatAnswer(
                webhookData.allFields?.[
                  "Have you or any of your family members ever been diagnosed with any of the following conditions?"
                ] ||
                  webhookData.allFields?.[
                    "HAVE YOU OR ANY OF YOUR FAMILY MEMBERS EVER BEEN DIAGNOSED WITH ANY OF THE FOLLOWING CONDITIONS?"
                  ] ||
                  "",
              ),
              fullWidth: true,
            },
          ],
        ]);

        // Add footer immediately after the last section
        currentY = currentY + 20; // Add some space after last section

        // Check if footer will fit on current page (need 60 points)
        const pageHeight = 792;
        const bottomMargin = 40;
        const footerHeight = 60;

        if (currentY + footerHeight > pageHeight - bottomMargin) {
          // Not enough space, start new page
          doc.addPage();
          currentY = 50;
        }

        // Draw footer background
        doc
          .rect(40, currentY - 5, 532, footerHeight)
          .fillColor("#f5f5f5")
          .fillOpacity(0.3)
          .fill()
          .fillOpacity(1);

        // Draw separator line
        doc
          .moveTo(40, currentY - 8)
          .lineTo(572, currentY - 8)
          .strokeColor("#cccccc")
          .lineWidth(0.5)
          .stroke();

        // Get all footer data
        const flowId =
          webhookData.flowID ||
          webhookData.flow_id ||
          patientData.form_type ||
          "Not available";

        const submissionId =
          webhookData.submissionID ||
          webhookData.submission_id ||
          patientData.heyflow_submission_id ||
          "Not available";

        const submissionDate =
          webhookData.created_at ||
          patientData.created_at ||
          new Date().toISOString();

        // Create footer text as single block
        const footerText = `Form Details
Flow ID: ${flowId} | Submission ID: ${submissionId}
This form was submitted electronically via HeyFlow
Date: ${submissionDate}`;

        // Write footer text as one block
        doc
          .fillColor("#666666")
          .fontSize(8)
          .font("Helvetica")
          .text(footerText, 50, currentY, {
            width: 500,
            lineGap: 4,
          });

        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

// New helper function for rounded sections
function drawRoundedSection(
  doc: PDFKit.PDFDocument,
  yPosition: number,
  title: string,
  fieldRows: any[],
): number {
  let sectionHeight = 35; // Reduced base height for title

  // Calculate section height based on content with tighter spacing
  fieldRows.forEach((row) => {
    row.forEach((field: any) => {
      sectionHeight += field.description ? 60 : 35; // Reduced from 70 and 45
    });
  });

  // Add a small bottom padding
  sectionHeight += 10; // Small padding at bottom

  // Check if section will fit on current page
  const pageHeight = 792; // Letter size height
  const bottomMargin = 40;
  const availableSpace = pageHeight - bottomMargin - yPosition;

  // If section won't fit, start new page
  if (sectionHeight > availableSpace && yPosition > 100) {
    doc.addPage();
    yPosition = 50;
  }

  // Draw rounded rectangle background
  doc
    .roundedRect(40, yPosition, 532, sectionHeight, 5)
    .fillColor("#f5f5f5")
    .fill();

  // Section title
  doc
    .fillColor("#000000")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title, 60, yPosition + 15);

  // Reset font for fields
  doc.font("Helvetica").fontSize(10);

  let currentY = yPosition + 40;

  // Draw fields with new layout
  fieldRows.forEach((row) => {
    const rowWidth = 532 - 40; // Section width minus padding
    const fieldCount = row.filter((f: any) => !f.fullWidth).length;
    const fieldWidth =
      fieldCount > 0 ? (rowWidth - 20) / fieldCount : rowWidth - 20;
    let currentX = 60;

    row.forEach((field: any, index: number) => {
      // Label
      doc
        .fillColor("#666666")
        .fontSize(8)
        .text(field.label.toUpperCase(), currentX, currentY);

      // Value
      if (field.isCheckmark && field.value === "✓") {
        doc.fillColor("#20c997");
      } else if (field.isConsent && field.isAccepted) {
        doc.fillColor("#20c997");
      } else {
        doc.fillColor("#000000");
      }

      doc
        .fontSize(11)
        .text(field.value || "Not provided", currentX, currentY + 12);

      // Description for consent items
      if (field.description) {
        doc
          .fillColor("#666666")
          .fontSize(8)
          .text(field.description, currentX, currentY + 26, {
            width: field.fullWidth ? rowWidth - 20 : fieldWidth - 10,
            align: "left",
          });
      }

      // Move to next field position
      if (!field.fullWidth && index < row.length - 1) {
        currentX += fieldWidth + 10;
      }
    });

    // Move to next row
    currentY += row.some((f: any) => f.description) ? 60 : 35; // Reduced from 70 and 45
  });

  return yPosition + sectionHeight;
}

// Helper functions that are actually used
function formatDateFull(date: string | Date): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateLong(date: string | Date): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+1 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatAnswer(answer: string): string {
  if (!answer) return "Not answered";
  if (answer.toLowerCase() === "yes") return "Yes";
  if (answer.toLowerCase() === "no") return "No";
  if (answer.toLowerCase() === "never") return "Never";
  return capitalizeFirst(answer);
}

function formatCommitmentWithVisual(level: string): string {
  if (!level) return "Not specified";
  const num = parseInt(level);
  if (!isNaN(num)) {
    return `${num}/5`;
  }
  return level;
}
