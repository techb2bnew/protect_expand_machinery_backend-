import Equipment from '../../models/Equipment.js';

/**
 * Get all equipment for website/admin panel
 */
export const getEquipment = async (req, res) => {
  try {
    // Fetch only active equipment, sorted by sortOrder
    const equipment = await Equipment.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .select('name serialNumber modelNumber description sortOrder');

    res.json({
      success: true,
      message: 'Equipment fetched successfully',
      data: equipment.map(eq => ({
        id: eq._id,
        name: eq.name,
        serialNumber: eq.serialNumber,
        modelNumber: eq.modelNumber,
        description: eq.description
      }))
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment'
    });
  }
};

