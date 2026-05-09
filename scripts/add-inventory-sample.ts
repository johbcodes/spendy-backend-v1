import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_ID = '844709f4-761c-4f1f-85d1-64605f99968d'; // Test Company

const inventorySamples = [
  {
    name: 'Folding Chairs',
    category: 'Furniture',
    quantity: 150,
    unit: 'pcs',
    location: 'Warehouse A - Section 1',
    checkedOut: 25,
    checkedIn: 125,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 100, Good: 40, Fair: 8, Damaged: 2 },
    price: 500,
    cost: 350,
    sku: 'FUR-CHR-001',
    supplier: 'Event Furniture Ltd',
    status: 'Active',
  },
  {
    name: 'Conference Tables',
    category: 'Furniture',
    quantity: 30,
    unit: 'pcs',
    location: 'Warehouse A - Section 2',
    checkedOut: 10,
    checkedIn: 20,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 20, Good: 8, Fair: 2, Damaged: 0 },
    price: 3500,
    cost: 2800,
    sku: 'FUR-TBL-002',
    supplier: 'Event Furniture Ltd',
    status: 'Active',
  },
  {
    name: 'LED Stage Lights',
    category: 'Lighting',
    quantity: 50,
    unit: 'pcs',
    location: 'Warehouse B - Electronics',
    checkedOut: 0,
    checkedIn: 50,
    checkoutStatus: 'Available',
    conditionCounts: { Excellent: 45, Good: 5, Fair: 0, Damaged: 0 },
    price: 2500,
    cost: 1800,
    sku: 'LGT-LED-003',
    supplier: 'TechEvent Solutions',
    status: 'Active',
  },
  {
    name: 'Sound System - PA',
    category: 'Audio',
    quantity: 10,
    unit: 'sets',
    location: 'Warehouse B - Electronics',
    checkedOut: 2,
    checkedIn: 8,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 8, Good: 2, Fair: 0, Damaged: 0 },
    price: 15000,
    cost: 12000,
    sku: 'AUD-PA-004',
    supplier: 'TechEvent Solutions',
    status: 'Active',
  },
  {
    name: 'Projectors - HD',
    category: 'Electronics',
    quantity: 15,
    unit: 'pcs',
    location: 'Warehouse B - Electronics',
    checkedOut: 5,
    checkedIn: 10,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 12, Good: 3, Fair: 0, Damaged: 0 },
    price: 8500,
    cost: 6500,
    sku: 'ELC-PRJ-005',
    supplier: 'TechEvent Solutions',
    status: 'Active',
  },
  {
    name: 'Projection Screens',
    category: 'Electronics',
    quantity: 20,
    unit: 'pcs',
    location: 'Warehouse B - Electronics',
    checkedOut: 3,
    checkedIn: 17,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 15, Good: 4, Fair: 1, Damaged: 0 },
    price: 4500,
    cost: 3200,
    sku: 'ELC-SCR-006',
    supplier: 'TechEvent Solutions',
    status: 'Active',
  },
  {
    name: 'Table Linens - White',
    category: 'Decor',
    quantity: 200,
    unit: 'pcs',
    location: 'Warehouse C - Textiles',
    checkedOut: 50,
    checkedIn: 150,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 150, Good: 40, Fair: 10, Damaged: 0 },
    price: 250,
    cost: 150,
    sku: 'DEC-LIN-007',
    supplier: 'Decor Plus',
    status: 'Active',
  },
  {
    name: 'Banquet Chairs - Gold',
    category: 'Furniture',
    quantity: 100,
    unit: 'pcs',
    location: 'Warehouse A - Section 3',
    checkedOut: 0,
    checkedIn: 100,
    checkoutStatus: 'Available',
    conditionCounts: { Excellent: 85, Good: 12, Fair: 3, Damaged: 0 },
    price: 750,
    cost: 550,
    sku: 'FUR-BNQ-008',
    supplier: 'Event Furniture Ltd',
    status: 'Active',
  },
  {
    name: 'Cocktail Tables',
    category: 'Furniture',
    quantity: 40,
    unit: 'pcs',
    location: 'Warehouse A - Section 2',
    checkedOut: 15,
    checkedIn: 25,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 30, Good: 8, Fair: 2, Damaged: 0 },
    price: 1500,
    cost: 1100,
    sku: 'FUR-CKT-009',
    supplier: 'Event Furniture Ltd',
    status: 'Active',
  },
  {
    name: 'Microphones - Wireless',
    category: 'Audio',
    quantity: 25,
    unit: 'pcs',
    location: 'Warehouse B - Electronics',
    checkedOut: 8,
    checkedIn: 17,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 20, Good: 4, Fair: 1, Damaged: 0 },
    price: 1200,
    cost: 900,
    sku: 'AUD-MIC-010',
    supplier: 'TechEvent Solutions',
    status: 'Active',
  },
  {
    name: 'Stage Platforms - Modular',
    category: 'Stage Equipment',
    quantity: 50,
    unit: 'panels',
    location: 'Warehouse D - Large Items',
    checkedOut: 20,
    checkedIn: 30,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 40, Good: 8, Fair: 2, Damaged: 0 },
    price: 2000,
    cost: 1500,
    sku: 'STG-PLT-011',
    supplier: 'Event Furniture Ltd',
    status: 'Active',
  },
  {
    name: 'Backdrop Stands',
    category: 'Stage Equipment',
    quantity: 15,
    unit: 'sets',
    location: 'Warehouse D - Large Items',
    checkedOut: 3,
    checkedIn: 12,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 12, Good: 3, Fair: 0, Damaged: 0 },
    price: 3500,
    cost: 2500,
    sku: 'STG-BKD-012',
    supplier: 'Event Furniture Ltd',
    status: 'Active',
  },
  {
    name: 'LED Video Wall Panels',
    category: 'Electronics',
    quantity: 30,
    unit: 'panels',
    location: 'Warehouse B - Electronics',
    checkedOut: 0,
    checkedIn: 30,
    checkoutStatus: 'Available',
    conditionCounts: { Excellent: 28, Good: 2, Fair: 0, Damaged: 0 },
    price: 12000,
    cost: 9500,
    sku: 'ELC-LED-013',
    supplier: 'TechEvent Solutions',
    status: 'Active',
  },
  {
    name: 'Catering Tables - Buffet',
    category: 'Furniture',
    quantity: 35,
    unit: 'pcs',
    location: 'Warehouse A - Section 4',
    checkedOut: 10,
    checkedIn: 25,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 28, Good: 6, Fair: 1, Damaged: 0 },
    price: 2500,
    cost: 1800,
    sku: 'FUR-CAT-014',
    supplier: 'Event Furniture Ltd',
    status: 'Active',
  },
  {
    name: 'Extension Cables - 50m',
    category: 'Accessories',
    quantity: 80,
    unit: 'pcs',
    location: 'Warehouse B - Storage',
    checkedOut: 20,
    checkedIn: 60,
    checkoutStatus: 'Partially Checked Out',
    conditionCounts: { Excellent: 60, Good: 15, Fair: 5, Damaged: 0 },
    price: 150,
    cost: 100,
    sku: 'ACC-CBL-015',
    supplier: 'TechEvent Solutions',
    status: 'Active',
  },
];

async function addInventorySamples() {
  try {
    console.log('🔄 Adding inventory sample data...');

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: COMPANY_ID },
    });

    if (!company) {
      console.error(`❌ Company with ID ${COMPANY_ID} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found company: ${company.name}`);

    // Check existing inventory count
    const existingCount = await prisma.inventory.count({
      where: { companyId: COMPANY_ID },
    });

    console.log(`📊 Existing inventory items: ${existingCount}`);

    // Add inventory items
    let addedCount = 0;
    for (const item of inventorySamples) {
      // Check if item already exists by SKU
      const existing = await prisma.inventory.findFirst({
        where: {
          companyId: COMPANY_ID,
          sku: item.sku,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${item.name} - already exists`);
        continue;
      }

      await prisma.inventory.create({
        data: {
          companyId: COMPANY_ID,
          ...item,
          lastRestocked: new Date(),
        },
      });

      addedCount++;
      console.log(`✅ Added: ${item.name}`);
    }

    console.log(`\n🎉 Successfully added ${addedCount} inventory items!`);

    // Show final count
    const finalCount = await prisma.inventory.count({
      where: { companyId: COMPANY_ID },
    });

    console.log(`📊 Total inventory items: ${finalCount}`);
  } catch (error) {
    console.error('❌ Error adding inventory samples:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addInventorySamples();
