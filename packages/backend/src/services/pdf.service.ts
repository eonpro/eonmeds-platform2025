import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

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
          margin: 50,
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

        // Add EONMeds logo/header
        doc.fontSize(24)
           .fillColor('#20c997')
           .text('eonmeds', 50, 50, { align: 'left' })
           .fillColor('#000000');

        // Title
        doc.fontSize(20)
           .text('Patient Intake Form', 50, 100, { align: 'left' });

        // Submission info
        doc.fontSize(10)
           .fillColor('#666666')
           .text(`Submitted via HeyFlow on ${formatDate(patientData.created_at || new Date())}`, 50, 130);

        // Reset color
        doc.fillColor('#000000');

        // Patient Information Section
        drawSection(doc, 180, 'Patient Information', [
          { label: 'FIRST NAME', value: patientData.first_name || '' },
          { label: 'LAST NAME', value: patientData.last_name || '' },
          { label: 'DATE OF BIRTH', value: formatDate(patientData.date_of_birth) || '' },
          { label: 'SEX', value: capitalizeFirst(patientData.gender) || '' },
          { label: 'EMAIL ADDRESS', value: patientData.email || '' },
          { label: 'PHONE NUMBER', value: formatPhone(patientData.phone) || '' }
        ]);

        // Check if we need a new page
        if (doc.y > 500) {
          doc.addPage();
        }

        // Shipping Information Section (from webhook data)
        const shippingY = doc.y + 30;
        drawSection(doc, shippingY, 'Shipping Information', [
          { label: 'STREET ADDRESS', value: webhookData.street || 'Not provided' },
          { label: 'APARTMENT/SUITE NUMBER', value: webhookData.apt || 'Not provided' },
          { label: 'CITY', value: webhookData.city || 'Not provided' },
          { label: 'STATE', value: webhookData.state || 'Not provided' },
          { label: 'POSTAL CODE', value: webhookData.zip || 'Not provided' },
          { label: 'COUNTRY', value: webhookData.country || 'Estados Unidos' }
        ]);

        // Add new page for medical history
        doc.addPage();

        // Medical History Section
        drawSection(doc, 50, 'Medical History', [
          { 
            label: 'HAVE YOU EVER TAKEN A GLP-1 MEDICATION BEFORE?', 
            value: formatAnswer(webhookData.glp1_medication) 
          },
          { 
            label: 'HAVE YOU EVER BEEN DIAGNOSED WITH TYPE 1 DIABETES?', 
            value: formatAnswer(webhookData.diabetes_type1) 
          },
          { 
            label: 'HAVE YOU EVER BEEN DIAGNOSED WITH ANY TYPE OF THYROID CANCER?', 
            value: formatAnswer(webhookData.thyroid_cancer) 
          },
          { 
            label: 'HAVE YOU EVER BEEN DIAGNOSED WITH MULTIPLE ENDOCRINE NEOPLASIA (MEN)?', 
            value: formatAnswer(webhookData.endocrine_neoplasia) 
          },
          { 
            label: 'HAVE YOU EVER BEEN DIAGNOSED WITH CHRONIC PANCREATITIS?', 
            value: formatAnswer(webhookData.pancreatitis) 
          },
          { 
            label: 'ARE YOU CURRENTLY PREGNANT OR BREASTFEEDING?', 
            value: formatAnswer(webhookData.pregnant_breastfeeding) 
          },
          { 
            label: 'DO YOU HAVE ANY KNOWN ALLERGIES TO MEDICATIONS?', 
            value: formatAnswer(webhookData.medication_allergies) 
          },
          { 
            label: 'WHAT IS YOUR MOST RECENT BLOOD PRESSURE READING?', 
            value: webhookData.blood_pressure || 'Not provided' 
          }
        ]);

        // Add new page for treatment readiness
        doc.addPage();

        // Treatment Readiness Section
        drawSection(doc, 50, 'Treatment Readiness', [
          { 
            label: 'HOW COMMITTED ARE YOU TO STARTING TREATMENT? (SCALE 1-5)', 
            value: formatCommitmentLevel(webhookData.commitment_level) 
          },
          { 
            label: 'ARE YOU OVER THE AGE OF 18?', 
            value: webhookData.over_18 === 'yes' ? '✓' : 'No' 
          },
          { 
            label: 'HOW DID YOU HEAR ABOUT US?', 
            value: capitalizeFirst(webhookData.referral_source) || 'Not specified' 
          }
        ]);

        // Consent Agreements Section
        const consentY = doc.y + 30;
        drawSection(doc, consentY, 'Consent Agreements', [
          {
            label: 'Telehealth Consent',
            value: webhookData.consent_telehealth === 'yes' ? '✓ Accepted ✓' : 'Not accepted',
            description: 'By checking this box, I confirm that I understand and agree to receive medical care and treatment through telehealth services.'
          },
          {
            label: 'Terms & Conditions Agreement',
            value: webhookData.consent_treatment === 'yes' ? '✓ Accepted' : 'Not accepted',
            description: 'By checking the box below, you confirm that you have read and agree to our Terms & Conditions and Privacy Policy.'
          },
          {
            label: 'Cancellation & Subscription Policy',
            value: webhookData.consent_cancellation === 'yes' ? '✓ Accepted' : 'Not accepted',
            description: 'By checking this box, I acknowledge that I have read and agree to the Cancellation Policy.'
          }
        ]);

        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Helper functions
function drawSection(doc: PDFKit.PDFDocument, yPosition: number, title: string, fields: any[]) {
  // Section background
  doc.rect(50, yPosition, 515, 30)
     .fillColor('#f5f5f5')
     .fill()
     .fillColor('#000000');

  // Section title
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text(title, 60, yPosition + 8);

  // Reset font
  doc.font('Helvetica')
     .fontSize(10);

  let currentY = yPosition + 45;
  let columnX = 60;
  let columnWidth = 235;
  let itemsInColumn = 0;

  fields.forEach((field, index) => {
    // Check if we need to move to the right column
    if (itemsInColumn === 3 && index < fields.length) {
      columnX = 300;
      currentY = yPosition + 45;
      itemsInColumn = 0;
    }

    // Check if we need a new page
    if (currentY > 700) {
      doc.addPage();
      currentY = 50;
      columnX = 60;
      itemsInColumn = 0;
    }

    // Draw field
    doc.fillColor('#666666')
       .fontSize(8)
       .text(field.label, columnX, currentY);

    doc.fillColor('#000000')
       .fontSize(11)
       .text(field.value || 'Not provided', columnX, currentY + 12);

    if (field.description) {
      doc.fillColor('#666666')
         .fontSize(8)
         .text(field.description, columnX, currentY + 26, { width: columnWidth });
      currentY += 60;
    } else {
      currentY += 40;
    }

    itemsInColumn++;
  });

  // Update doc.y position
  doc.y = Math.max(currentY, doc.y);
}

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

function formatCommitmentLevel(level: string): string {
  if (!level) return 'Not specified';
  const num = parseInt(level);
  if (!isNaN(num)) {
    return `${num}/5`;
  }
  return level;
} 