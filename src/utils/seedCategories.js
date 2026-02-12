import Category from '../models/Category.js';

export const seedCategories = async () => {
  try {
    const count = await Category.countDocuments();
    
    if (count > 0) {
      console.log('📁 Categories already exist, skipping seed');
      return;
    }

    const categories = [
      {
        name: 'Applications Support',
        description: 'Help with software applications and technical issues'
      },
      {
        name: 'Service Support',
        description: 'Equipment maintenance and service requests'
      },
      {
        name: 'Parts Support',
        description: 'Replacement parts and hardware components'
      },
      {
        name: 'Sales Support',
        description: 'Product information and sales inquiries'
      }
    ];

    await Category.insertMany(categories);
    console.log('✅ Categories seeded successfully');
    console.log('   - Applications Support');
    console.log('   - Service Support');
    console.log('   - Parts Support');
    console.log('   - Sales Support');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  }
};

