import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get billing metrics
router.get('/billing/metrics', authenticate, async (req, res) => {
  try {
    // For now, return demo data
    // In production, this would query real database metrics
    const metrics = {
      totalRevenue: 847250.00,
      outstandingBalance: 124300.00,
      collectionRate: 94.5,
      averageDaysToPayment: 18,
      totalPatients: 1247,
      activeInsuranceClaims: 89,
      deniedClaims: 12,
      monthlyRevenue: 142580.00,
      patientPayments: 212300.00,
      insurancePayments: 550450.00,
      otherRevenue: 84500.00
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching billing metrics:', error);
    res.status(500).json({ error: 'Failed to fetch billing metrics' });
  }
});

export default router;
