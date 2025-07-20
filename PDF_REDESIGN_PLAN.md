# Patient Intake Form PDF UI Redesign Plan (July 2025)

## Background and Motivation
The user has provided a specific design mockup for the Patient Intake Form PDF that requires a complete UI overhaul to match the exact styling shown in the provided image. The current PDF generation uses pdfkit with a different layout and styling that needs to be updated. Additionally, a download button needs to be added to allow users to save the PDF locally.

## Current Implementation Analysis

### PDF Generation Architecture
1. **Backend Service**: `packages/backend/src/services/pdf.service.ts`
   - Uses `pdfkit` library for PDF generation
   - Current design: Blue/green EONMeds branding with multi-column layout
   - Gray section headers with white text
   - Helvetica font family

2. **Frontend Integration**: `packages/frontend/src/pages/PatientProfile.tsx`
   - PDF accessed via API endpoint: `/api/v1/patients/{id}/intake-pdf`
   - Currently has "View Intake Form PDF" button that opens in new tab
   - No download button functionality

## Design Requirements from Mockup

### 1. Visual Design Elements
- **Logo**: EONMeds logo in top-left corner (green color #20c997)
- **Title**: "Patient Intake Form" - 24pt bold font
- **Subtitle**: "Submitted via HeyFlow on [date]" in gray text (#666666)
- **Section Backgrounds**: Light gray (#f5f5f5) with rounded corners
- **Text Colors**: 
  - Section Headers: Black (#000000), 16pt bold
  - Field Labels: Gray (#666666), 10pt, uppercase
  - Field Values: Black (#000000), 12pt
  - Checkmarks: Green (#20c997)

### 2. Layout Structure
- **Single column layout** for better readability
- **Section boxes** with 10px rounded corners
- **40px margins** on document
- **20px spacing** between sections
- **Clear visual hierarchy** with consistent typography

### 3. Content Sections (Exact Order)
1. **Patient Information**
   - First Name | Last Name (side by side)
   - Date of Birth | Sex (side by side)
   - Email Address | Phone Number (side by side)

2. **Shipping Information**
   - Street Address (full width)
   - Apartment/Suite Number (full width)
   - City | State (side by side)
   - Postal Code | Country (side by side)

3. **Treatment Readiness**
   - Commitment Level (5/5 with visual indicator)
   - Over 18 confirmation (checkmark)
   - How did you hear about us

4. **Consent Agreements**
   - Telehealth Consent
   - Terms & Conditions Agreement
   - Cancellation & Subscription Policy
   - Each with green checkmark and descriptive text

## Implementation Plan

### Phase 1: Backend PDF Service Refactor
1. **Create new helper functions for consistent styling**
2. **Implement rounded section backgrounds**
3. **Update field layout to match mockup exactly**
4. **Add green checkmarks for consents**
5. **Format dates properly**

### Phase 2: Frontend Download Button
1. **Add download button next to view button**
2. **Implement blob download functionality**
3. **Show loading state during generation**
4. **Handle errors gracefully**

### Phase 3: Testing & Polish
1. **Test with various data scenarios**
2. **Verify print quality**
3. **Check file sizes**
4. **Cross-browser testing**

## High-level Task Breakdown

### Task 1: Update PDF Visual Structure ⏱️ 2 hours
**Success Criteria**: PDF sections have gray backgrounds with rounded corners matching mockup
- [ ] Implement `drawRoundedSection` helper function
- [ ] Update document margins to 40px
- [ ] Add 20px spacing between sections
- [ ] Test section rendering with sample data

### Task 2: Redesign Patient Information Section ⏱️ 1 hour
**Success Criteria**: Fields display in 2-column layout with proper labels and formatting
- [ ] Create side-by-side field layout
- [ ] Style labels as uppercase gray text
- [ ] Format dates as "January 3, 1997"
- [ ] Add proper spacing between fields

### Task 3: Update Remaining Sections ⏱️ 2 hours
**Success Criteria**: All sections match mockup design exactly
- [ ] Shipping Information with proper field layout
- [ ] Treatment Readiness with commitment scale visualization
- [ ] Consent Agreements with green checkmarks
- [ ] Consistent typography throughout

### Task 4: Add Frontend Download Functionality ⏱️ 1 hour
**Success Criteria**: Users can download PDF with single click
- [ ] Add download button to UI
- [ ] Implement fetch and blob download
- [ ] Add loading spinner during generation
- [ ] Show success/error feedback

### Task 5: Testing and Deployment ⏱️ 1 hour
**Success Criteria**: PDF works flawlessly in production
- [ ] Test with real patient data
- [ ] Verify in Chrome, Firefox, Safari
- [ ] Check print preview quality
- [ ] Deploy to Railway
- [ ] Test in production environment

## Current Status / Progress Tracking
- [x] Requirements analysis complete
- [x] Current implementation reviewed
- [x] Design mockup analyzed
- [ ] Implementation started
- [ ] Testing in progress
- [ ] Deployed to production

## Executor's Feedback or Assistance Requests
- **Logo Access**: Need EONMeds logo file or permission to extract from the SVG URL
- **Date Formatting**: Should we display the ISO date as "July 3, 2025 at 12:28 AM" or simpler format?
- **Font Choice**: Mockup appears to use system font - should we use Helvetica or system font stack?
- **Color Verification**: Is #20c997 the official brand green for checkmarks and logo? 