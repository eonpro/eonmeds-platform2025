import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import * as path from 'path';

interface IntakeFormData {
  // Patient Information
  firstname?: string;
  lastname?: string;
  email?: string;
  PhoneNumber?: string;
  dob?: string;
  gender?: string;
  
  // Address Information
  street?: string;
  apt?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  
  // Medical History
  glp1_medication?: string;
  diabetes_type1?: string;
  thyroid_cancer?: string;
  endocrine_neoplasia?: string;
  pancreatitis?: string;
  pregnant_breastfeeding?: string;
  medication_allergies?: string;
  blood_pressure?: string;
  
  // Treatment Readiness
  commitment_level?: string;
  over_18?: string;
  referral_source?: string;
  
  // Consent
  consent_telehealth?: string;
  consent_treatment?: string;
  consent_terms?: string;
  consent_cancellation?: string;
  
  // Form Metadata
  submitted_at?: string;
  form_type?: string;
}

export class PDFService {
  static async generateIntakeFormPDF(patientData: any, webhookData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margin: 40,
          info: {
            Title: 'Patient Intake Form',
            Author: 'EONMeds',
            Subject: 'Patient Intake Form'
          }
        });

        const stream = new PassThrough();
        const chunks: Buffer[] = [];

        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);

        doc.pipe(stream);

        // Add EONMeds logo
        try {
          const logoPath = path.join(__dirname, '../assets/eonmeds-logo.png');
          doc.image(logoPath, 40, 40, { width: 120 });
        } catch (error) {
          // Fallback to text logo if image fails
          doc.fontSize(36)
             .fillColor('#20c997')
             .font('Helvetica-Bold')
             .text('eonmeds', 40, 40, { align: 'left' })
             .fillColor('#000000');
        }

        // Title
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Patient Intake Form', 40, 110);

        // Submission info
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text(`Submitted via HeyFlow on ${formatDateFull(patientData.created_at || new Date())}`, 40, 140);

        // Reset color
        doc.fillColor('#000000');

        // Patient Information Section with new design
        let currentY = 180;
        currentY = drawRoundedSection(doc, currentY, 'Patient Information', [
          [
            { label: 'FIRST NAME', value: patientData.first_name || '' },
            { label: 'LAST NAME', value: patientData.last_name || '' }
          ],
          [
            { label: 'DATE OF BIRTH', value: formatDateLong(patientData.date_of_birth) || '' },
            { label: 'SEX', value: capitalizeFirst(patientData.gender) || '' }
          ],
          [
            { label: 'EMAIL ADDRESS', value: patientData.email || '' },
            { label: 'PHONE NUMBER', value: formatPhone(patientData.phone) || '' }
          ]
        ]);

        // Shipping Information Section
        currentY = drawRoundedSection(doc, currentY + 20, 'Shipping Information', [
          [
            { label: 'STREET ADDRESS', value: webhookData.street || 'Not provided', fullWidth: true }
          ],
          [
            { label: 'APARTMENT/SUITE NUMBER', value: webhookData.apt || 'Not provided', fullWidth: true }
          ],
          [
            { label: 'CITY', value: webhookData.city || 'Not provided' },
            { label: 'STATE', value: webhookData.state || 'Not provided' }
          ],
          [
            { label: 'POSTAL CODE', value: webhookData.zip || 'Not provided' },
            { label: 'COUNTRY', value: webhookData.country || 'Estados Unidos' }
          ]
        ]);

        // Check if we need a new page
        if (currentY > 500) {
          doc.addPage();
          currentY = 50;
        }

        // Treatment Readiness Section with visual elements
        currentY = drawRoundedSection(doc, currentY + 20, 'Treatment Readiness', [
          [
            { 
              label: 'HOW COMMITTED ARE YOU TO STARTING TREATMENT? (SCALE 1-5)', 
              value: formatCommitmentWithVisual(doc, webhookData.commitment_level),
              isSpecial: true,
              fullWidth: true
            }
          ],
          [
            { 
              label: 'HOW DID YOU HEAR ABOUT US?', 
              value: capitalizeFirst(webhookData.referral_source) || 'Not specified',
              fullWidth: true
            }
          ]
        ]);

        // Consent Agreements Section with green checkmarks
        currentY = drawRoundedSection(doc, currentY + 20, 'Consent Agreements', [
          [
            {
              label: 'Telehealth Consent',
              value: webhookData.consent_telehealth === 'yes' ? '✓ Accepted ✓' : 'Not accepted',
              description: 'By checking this box, I confirm that I understand and agree to receive medical care and treatment through telehealth services. I acknowledge that I have read and agree to the terms outlined in the Telehealth Consent Policy.',
              isConsent: true,
              isAccepted: webhookData.consent_telehealth === 'yes',
              fullWidth: true
            }
          ],
          [
            {
              label: 'Terms & Conditions Agreement',
              value: webhookData.consent_telehealth === 'yes' ? '✓ Accepted' : 'Not accepted', // If telehealth is accepted, terms are also accepted
              description: 'By checking the box below, you confirm that you have read and agree to our Terms & Conditions and Privacy Policy.',
              isConsent: true,
              isAccepted: webhookData.consent_telehealth === 'yes', // Linked to telehealth consent
              fullWidth: true
            }
          ],
          [
            {
              label: 'Cancellation & Subscription Policy',
              value: webhookData.consent_cancellation === 'yes' ? '✓ Accepted' : 'Not accepted',
              description: 'By checking this box, I acknowledge that I have read and agree to the Cancellation Policy. I understand that all sales are final, and charges may recur monthly unless canceled according to the terms provided.',
              isConsent: true,
              isAccepted: webhookData.consent_cancellation === 'yes',
              fullWidth: true
            }
          ],
          [
            { 
              label: 'ARE YOU OVER THE AGE OF 18?', 
              value: webhookData.over_18 === 'yes' ? '✓ Accepted ✓' : 'Not accepted',
              description: '18+ Disclosure: By submitting this form. I certify that I am over 18 years of age and that the date of birth provided in this form is legitimate and it belongs to me.',
              isConsent: true,
              isAccepted: webhookData.over_18 === 'yes',
              fullWidth: true
            }
          ]
        ]);

        // Add Medical History on new page
        doc.addPage();

        // Medical History Section (keeping same data, just updating visual style)
        drawRoundedSection(doc, 50, 'Medical History', [
          [
            { 
              label: 'HAVE YOU EVER TAKEN A GLP-1 MEDICATION BEFORE?', 
              value: formatAnswer(webhookData.glp1_medication),
              fullWidth: true
            }
          ],
          [
            { 
              label: 'HAVE YOU EVER BEEN DIAGNOSED WITH TYPE 1 DIABETES?', 
              value: formatAnswer(webhookData.diabetes_type1),
              fullWidth: true
            }
          ],
          [
            { 
              label: 'HAVE YOU EVER BEEN DIAGNOSED WITH ANY TYPE OF THYROID CANCER?', 
              value: formatAnswer(webhookData.thyroid_cancer),
              fullWidth: true
            }
          ],
          [
            { 
              label: 'HAVE YOU EVER BEEN DIAGNOSED WITH MULTIPLE ENDOCRINE NEOPLASIA (MEN)?', 
              value: formatAnswer(webhookData.endocrine_neoplasia),
              fullWidth: true
            }
          ],
          [
            { 
              label: 'HAVE YOU EVER BEEN DIAGNOSED WITH CHRONIC PANCREATITIS?', 
              value: formatAnswer(webhookData.pancreatitis),
              fullWidth: true
            }
          ],
          [
            { 
              label: 'ARE YOU CURRENTLY PREGNANT OR BREASTFEEDING?', 
              value: formatAnswer(webhookData.pregnant_breastfeeding),
              fullWidth: true
            }
          ],
          [
            { 
              label: 'DO YOU HAVE ANY KNOWN ALLERGIES TO MEDICATIONS?', 
              value: formatAnswer(webhookData.medication_allergies),
              fullWidth: true
            }
          ],
          [
            { 
              label: 'WHAT IS YOUR MOST RECENT BLOOD PRESSURE READING?', 
              value: webhookData.blood_pressure || 'Not provided',
              fullWidth: true
            }
          ]
        ]);

        // Add Additional Information section to show all other fields
        if (webhookData.allFields && Object.keys(webhookData.allFields).length > 0) {
          const additionalFieldRows: any[] = [];
          const tempRow: any[] = [];
          
          // Filter out fields we've already shown
          const shownFields = [
            'street', 'address', 'apartment#', 'apt', 'city', 'state', 'zip', 'country',
            'address [city]', 'address [state]', 'address [zip]', 'address [country]',
            'Are you currently taking, or have you ever taken, a GLP-1 medication?',
            'Do you have a personal history of type 2 diabetes?',
            'Do you have a personal history of medullary thyroid cancer?',
            'Do you have a personal history of multiple endocrine neoplasia type-2?',
            'Do you have a personal history of gastroparesis (delayed stomach emptying)?',
            'Are you pregnant or breast feeding?',
            'Do you have any medical conditions or chronic illnesses?',
            'Blood Pressure',
            'What is your usual level of daily physical activity?',
            '18+ Disclosure : By submitting this form. I certify that I am over 18 years of age and that the date of birth provided in this form is legitimate and it belongs to me.',
            'How did you hear about us?',
            'By clicking this box, I acknowledge that I have read, understood, and agree to the Terms of Use, and I acknowledge the Privacy Policy, Informed Telemedicine Consent, and the Cancellation Policy. If you live in Florida, you also accept the Florida Weight Loss Consumer Bill of Rights and the Florida Consent.',
            'Terms Agreement',
            'Marketing Consent',
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
            'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term', 'UTM ID'
          ];
          
          let fieldCount = 0;
          Object.entries(webhookData.allFields).forEach(([key, value]) => {
            if (!shownFields.includes(key) && value && value !== '') {
              tempRow.push({
                label: key.toUpperCase().replace(/_/g, ' '),
                value: formatAnswer(String(value)),
                fullWidth: false
              });
              
              fieldCount++;
              
              // Group fields in pairs
              if (tempRow.length === 2) {
                additionalFieldRows.push([...tempRow]);
                tempRow.length = 0;
              }
            }
          });
          
          // Add any remaining field
          if (tempRow.length > 0) {
            tempRow[0].fullWidth = true; // Make single field full width
            additionalFieldRows.push([...tempRow]);
          }
          
          if (additionalFieldRows.length > 0) {
            // Check if we need a new page
            if (doc.y > 600) {
              doc.addPage();
              currentY = 50;
            } else {
              currentY = doc.y + 20;
            }
            
            drawRoundedSection(doc, currentY, 'Additional Information', additionalFieldRows);
          }
        }

        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

// New helper function for rounded sections
function drawRoundedSection(doc: PDFKit.PDFDocument, yPosition: number, title: string, fieldRows: any[]): number {
  let sectionHeight = 35; // Reduced base height for title
  
  // Calculate section height based on content with tighter spacing
  fieldRows.forEach(row => {
    row.forEach((field: any) => {
      sectionHeight += field.description ? 60 : 35; // Reduced from 70 and 45
    });
  });

  // Add a small bottom padding
  sectionHeight += 10; // Small padding at bottom

  // Draw rounded rectangle background
  doc.roundedRect(40, yPosition, 532, sectionHeight, 5)
     .fillColor('#f5f5f5')
     .fill();

  // Section title
  doc.fillColor('#000000')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text(title, 60, yPosition + 15);

  // Reset font for fields
  doc.font('Helvetica')
     .fontSize(10);

  let currentY = yPosition + 40;

  // Draw fields with new layout
  fieldRows.forEach(row => {
    const rowWidth = 532 - 40; // Section width minus padding
    const fieldCount = row.filter((f: any) => !f.fullWidth).length;
    const fieldWidth = fieldCount > 0 ? (rowWidth - 20) / fieldCount : rowWidth - 20;
    let currentX = 60;

    row.forEach((field: any, index: number) => {
      // Label
      doc.fillColor('#666666')
         .fontSize(8)
         .text(field.label.toUpperCase(), currentX, currentY);

      // Value
      if (field.isCheckmark && field.value === '✓') {
        doc.fillColor('#20c997');
      } else if (field.isConsent && field.isAccepted) {
        doc.fillColor('#20c997');
      } else {
        doc.fillColor('#000000');
      }
      
      doc.fontSize(11)
         .text(field.value || 'Not provided', currentX, currentY + 12);

      // Description for consent items
      if (field.description) {
        doc.fillColor('#666666')
           .fontSize(8)
           .text(field.description, currentX, currentY + 26, { 
             width: field.fullWidth ? rowWidth - 20 : fieldWidth - 10,
             align: 'left'
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

// Updated date formatter to match mockup
function formatDateFull(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString();
}

// New date formatter for long format
function formatDateLong(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

// Keep existing helper functions unchanged
function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatAnswer(answer: string): string {
  if (!answer) return 'Not answered';
  if (answer.toLowerCase() === 'yes') return 'Yes';
  if (answer.toLowerCase() === 'no') return 'No';
  if (answer.toLowerCase() === 'never') return 'Never';
  return capitalizeFirst(answer);
}

// Updated commitment formatter with visual indicator
function formatCommitmentWithVisual(doc: any, level: string): string {
  if (!level) return 'Not specified';
  const num = parseInt(level);
  if (!isNaN(num)) {
    return `${num}/5`;
  }
  return level;
}

function formatCommitmentLevel(level: string): string {
  if (!level) return 'Not specified';
  const num = parseInt(level);
  if (!isNaN(num)) {
    return `${num}/5`;
  }
  return level;
} 