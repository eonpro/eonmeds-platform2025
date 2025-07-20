export interface ServiceOption {
  id: string;
  name: string;
  category: string;
  billingType: 'recurring' | 'one-time';
  prices: {
    recurring?: number;
    oneTime?: number;
  };
  variants?: {
    name: string;
    recurring?: number;
    oneTime?: number;
  }[];
}

export const MEDICAL_SERVICES: ServiceOption[] = [
  // Weight Loss Category - Semaglutide
  {
    id: 'semaglutide-1ml',
    name: 'Semaglutide 2.5mg/mL - 1mL (2.5mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 229, oneTime: 299 }
  },
  {
    id: 'semaglutide-2ml',
    name: 'Semaglutide 2.5mg/mL - 2mL (5mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 229, oneTime: 299 }
  },
  {
    id: 'semaglutide-3ml',
    name: 'Semaglutide 2.5mg/mL - 3mL (7.5mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 349, oneTime: 449 }
  },
  {
    id: 'semaglutide-4ml',
    name: 'Semaglutide 2.5mg/mL - 4mL (10mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 449, oneTime: 599 }
  },
  {
    id: 'semaglutide-5ml',
    name: 'Semaglutide 2.5mg/mL - 5mL (12.5mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 599, oneTime: 699 }
  },
  {
    id: 'semaglutide-special',
    name: 'Semaglutide 2.5mg/mL - 3 month special (10-15mg/Month)',
    category: 'Weight Loss',
    billingType: 'one-time',
    prices: { oneTime: 1300 }
  },

  // Weight Loss Category - Tirzepatide
  {
    id: 'tirzepatide-1ml',
    name: 'Tirzepatide 10mg/mL - 1mL (10mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 329, oneTime: 399 }
  },
  {
    id: 'tirzepatide-2ml',
    name: 'Tirzepatide 10mg/mL - 2mL (20mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 329, oneTime: 399 }
  },
  {
    id: 'tirzepatide-3ml',
    name: 'Tirzepatide 10mg/mL - 3mL (30mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 449, oneTime: 599 }
  },
  {
    id: 'tirzepatide-4ml',
    name: 'Tirzepatide 10mg/mL - 4mL (40mg)',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 599, oneTime: 699 }
  },
  {
    id: 'tirzepatide-special',
    name: 'Tirzepatide 10mg/mL - 3mL/20mg (60mg) Special',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 699, oneTime: 899 }
  },

  // Hormone Replacement Category
  {
    id: 'testosterone',
    name: 'Testosterone Replacement',
    category: 'Hormone Replacement',
    billingType: 'recurring',
    prices: { recurring: 199, oneTime: 249 }
  },

  // Mental Health Category
  {
    id: 'modafinil',
    name: 'Modafinil 200mg',
    category: 'Mental Health',
    billingType: 'recurring',
    prices: { recurring: 179, oneTime: 249 }
  },

  // Peptide Category
  {
    id: 'cjc-ipamorelin',
    name: 'CJC/Ipamorelin',
    category: 'Peptide',
    billingType: 'recurring',
    prices: { recurring: 199, oneTime: 249 }
  },
  {
    id: 'tesamorelin',
    name: 'Tesamorelin',
    category: 'Peptide',
    billingType: 'recurring',
    prices: { recurring: 299, oneTime: 349 }
  },
  {
    id: 'bpc-157',
    name: 'BPC-157/TB-500',
    category: 'Peptide',
    billingType: 'recurring',
    prices: { recurring: 249, oneTime: 299 }
  },

  // Weight Loss Category - Other
  {
    id: 'metformin',
    name: 'Metformin',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 149, oneTime: 199 }
  },
  {
    id: 'phentermine',
    name: 'Phentermine',
    category: 'Weight Loss',
    billingType: 'recurring',
    prices: { recurring: 199, oneTime: 249 }
  },

  // Consultation Services
  {
    id: 'consultation',
    name: 'Consultation',
    category: 'General Services',
    billingType: 'one-time',
    prices: { oneTime: 99 }
  },
  {
    id: 'lab-work',
    name: 'Lab Work',
    category: 'General Services',
    billingType: 'one-time',
    prices: { oneTime: 149 }
  },
  {
    id: 'follow-up',
    name: 'Follow-up Visit',
    category: 'General Services',
    billingType: 'one-time',
    prices: { oneTime: 49 }
  }
];

// Helper function to get all services as dropdown options
export const getServiceOptions = () => {
  const options: { value: string; label: string; price: number; billingType: string }[] = [];
  
  MEDICAL_SERVICES.forEach(service => {
    // Add recurring price option if available
    if (service.prices.recurring) {
      options.push({
        value: `${service.id}-recurring`,
        label: `${service.name} - Monthly`,
        price: service.prices.recurring,
        billingType: 'recurring'
      });
    }
    
    // Add one-time price option if available
    if (service.prices.oneTime) {
      options.push({
        value: `${service.id}-onetime`,
        label: `${service.name} - One Time`,
        price: service.prices.oneTime,
        billingType: 'one-time'
      });
    }
  });
  
  // Add custom option
  options.push({
    value: 'custom',
    label: 'Custom Service',
    price: 0,
    billingType: 'custom'
  });
  
  return options;
};

// Helper function to get service by ID
export const getServiceById = (serviceId: string): ServiceOption | undefined => {
  const [id] = serviceId.split('-');
  return MEDICAL_SERVICES.find(service => service.id === id);
};

// Helper function to get price for a service
export const getServicePrice = (serviceId: string): number => {
  const [id, type] = serviceId.split('-');
  const service = MEDICAL_SERVICES.find(s => s.id === id);
  
  if (!service) return 0;
  
  if (type === 'recurring') {
    return service.prices.recurring || 0;
  } else if (type === 'onetime') {
    return service.prices.oneTime || 0;
  }
  
  return 0;
}; 