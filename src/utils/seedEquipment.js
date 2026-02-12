import Equipment from '../models/Equipment.js';

export const seedEquipment = async () => {
  try {
    const count = await Equipment.countDocuments();
    
    if (count > 0) {
      console.log('🔧 Equipment already exist, skipping seed');
      return;
    }

    const equipmentList = [
      {
        name: '3D Camera Pro',
        serialNumber: 'CAM001234',
        modelNumber: 'CP-2024-PRO',
        description: 'Professional 3D camera for high-resolution scanning',
        sortOrder: 1
      },
      {
        name: '3D Scanner XL',
        serialNumber: 'SCN005678',
        modelNumber: 'SX-2024-XL',
        description: 'Extra-large 3D scanner for industrial applications',
        sortOrder: 2
      },
      {
        name: '3D Printer Pro',
        serialNumber: 'PRT009876',
        modelNumber: 'PP-2024-PRO',
        description: 'Professional grade 3D printer with advanced features',
        sortOrder: 3
      },
      {
        name: '3D Measuring Device',
        serialNumber: 'MES002468',
        modelNumber: 'MD-2024-STD',
        description: 'Precision measuring device for 3D measurements',
        sortOrder: 4
      },
      {
        name: '3D Laser Scanner',
        serialNumber: 'LSR001357',
        modelNumber: 'LS-2024-ADV',
        description: 'Advanced laser scanner with high precision',
        sortOrder: 5
      }
    ];

    await Equipment.insertMany(equipmentList);
    console.log('✅ Equipment seeded successfully');
    console.log('   - 3D Camera Pro (CAM001234)');
    console.log('   - 3D Scanner XL (SCN005678)');
    console.log('   - 3D Printer Pro (PRT009876)');
    console.log('   - 3D Measuring Device (MES002468)');
    console.log('   - 3D Laser Scanner (LSR001357)');
  } catch (error) {
    console.error('❌ Error seeding equipment:', error);
  }
};

