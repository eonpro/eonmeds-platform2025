import { Router, Request, Response } from 'express';
import { PatientService } from '../services/patient.service';
import { checkJwt, checkRole } from '../middleware/auth0';

const router = Router();

// Get all patients (list view)
// TEMPORARY: Removing auth for testing
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = '100', offset = '0', search, status } = req.query;
    
    const result = await PatientService.getPatientList(
      parseInt(limit as string),
      parseInt(offset as string),
      search as string,
      status as string
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get patient by ID
router.get('/:id', checkJwt, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const patient = await PatientService.getPatientById(id);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Get patient intake form data
router.get('/:id/intake', checkJwt, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const intakeData = await PatientService.getPatientIntakeData(id);
    
    if (!intakeData) {
      return res.status(404).json({ error: 'Intake form not found' });
    }
    
    res.json(intakeData);
  } catch (error) {
    console.error('Error fetching intake data:', error);
    res.status(500).json({ error: 'Failed to fetch intake data' });
  }
});

// Update patient status
router.patch('/:id/status', 
  checkJwt, 
  checkRole(['provider', 'admin', 'superadmin']), 
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const reviewedBy = (req as any).auth?.sub; // Auth0 user ID
      
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }
      
      const success = await PatientService.updatePatientStatus(id, status, reviewedBy);
      
      if (!success) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating patient status:', error);
      res.status(500).json({ error: 'Failed to update patient status' });
    }
  }
);

export default router; 