import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_ID = '844709f4-761c-4f1f-85d1-64605f99968d'; // Test Company

const suppliersSamples = [
  {
    name: 'Event Furniture Ltd',
    email: 'sales@eventfurniture.co.ke',
    phone: '+254712345001',
    address: 'Industrial Area, Nairobi',
    category: 'Furniture & Equipment',
    contactPerson: 'John Mwangi',
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Event furniture rental, chairs, tables, stage platforms',
    amount: 250000,
    approvalRequired: false,
    bankName: 'Equity Bank',
    accountName: 'Event Furniture Limited',
    accountNumber: '0123456789',
    branchName: 'Industrial Area Branch',
    swiftCode: 'EQBLKENA',
    businessType: 'Limited Company',
    kraPin: 'P051234567A',
    documents: [],
    status: 'Active',
  },
  {
    name: 'TechEvent Solutions',
    email: 'info@techevents.co.ke',
    phone: '+254722345002',
    address: 'Westlands, Nairobi',
    category: 'Audio Visual',
    contactPerson: 'Sarah Wanjiku',
    paymentStatus: 'Pending',
    paymentMethod: 'M-Pesa',
    servicesProvided: 'Sound systems, lighting, projectors, LED screens',
    amount: 180000,
    approvalRequired: true,
    mpesaPhone: '+254722345002',
    paybillNumber: '400200',
    paybillAccount: 'TECH001',
    businessType: 'Limited Company',
    kraPin: 'P051234568B',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Decor Plus',
    email: 'decorplus@gmail.com',
    phone: '+254733345003',
    address: 'Ngara, Nairobi',
    category: 'Decor & Styling',
    contactPerson: 'Mary Njeri',
    paymentStatus: 'Partially Paid',
    paymentMethod: 'M-Pesa',
    servicesProvided: 'Event decoration, floral arrangements, linens, draping',
    amount: 95000,
    approvalRequired: false,
    mpesaPhone: '+254733345003',
    tillNumber: '523456',
    businessType: 'Sole Proprietor',
    kraPin: 'P051234569C',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Gourmet Catering Services',
    email: 'bookings@gourmetcatering.co.ke',
    phone: '+254744345004',
    address: 'Karen, Nairobi',
    category: 'Catering',
    contactPerson: 'Chef David Kamau',
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Full catering services, buffet, cocktail events, staff',
    amount: 420000,
    approvalRequired: true,
    bankName: 'KCB Bank',
    accountName: 'Gourmet Catering Services Ltd',
    accountNumber: '1234567890',
    branchName: 'Karen Branch',
    swiftCode: 'KCBLKENX',
    businessType: 'Limited Company',
    kraPin: 'P051234570D',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Power Events Generator Hire',
    email: 'hire@powerevents.co.ke',
    phone: '+254755345005',
    address: 'Ruaraka, Nairobi',
    category: 'Power & Energy',
    contactPerson: 'James Ochieng',
    paymentStatus: 'Pending',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Generator rental, power distribution, backup power',
    amount: 65000,
    approvalRequired: false,
    bankName: 'Co-operative Bank',
    accountName: 'Power Events Ltd',
    accountNumber: '0987654321',
    branchName: 'Thika Road Branch',
    swiftCode: 'KCOOKENX',
    businessType: 'Limited Company',
    kraPin: 'P051234571E',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Glamour Photography Studios',
    email: 'shoots@glamourphotos.co.ke',
    phone: '+254766345006',
    address: 'Kilimani, Nairobi',
    category: 'Photography & Videography',
    contactPerson: 'Peter Otieno',
    paymentStatus: 'Paid',
    paymentMethod: 'M-Pesa',
    servicesProvided: 'Event photography, videography, drone shots, editing',
    amount: 85000,
    approvalRequired: false,
    mpesaPhone: '+254766345006',
    paybillNumber: '400200',
    paybillAccount: 'GLAM001',
    businessType: 'Partnership',
    kraPin: 'P051234572F',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Security Plus Kenya',
    email: 'operations@securityplus.co.ke',
    phone: '+254777345007',
    address: 'Embakasi, Nairobi',
    category: 'Security Services',
    contactPerson: 'Captain Michael Waweru',
    paymentStatus: 'Pending',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Event security, crowd control, VIP protection',
    amount: 120000,
    approvalRequired: true,
    bankName: 'NCBA Bank',
    accountName: 'Security Plus Kenya Ltd',
    accountNumber: '2345678901',
    branchName: 'CBD Branch',
    swiftCode: 'CBAFKENX',
    businessType: 'Limited Company',
    kraPin: 'P051234573G',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Tent Masters',
    email: 'rentals@tentmasters.co.ke',
    phone: '+254788345008',
    address: 'Athi River, Machakos',
    category: 'Tents & Structures',
    contactPerson: 'Robert Mutua',
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Marquee tents, gazebos, canopies, flooring',
    amount: 195000,
    approvalRequired: false,
    bankName: 'Equity Bank',
    accountName: 'Tent Masters Ltd',
    accountNumber: '3456789012',
    branchName: 'Athi River Branch',
    swiftCode: 'EQBLKENA',
    businessType: 'Limited Company',
    kraPin: 'P051234574H',
    documents: [],
    status: 'Active',
  },
  {
    name: 'DJ Maestro Entertainment',
    email: 'bookings@djmaestro.co.ke',
    phone: '+254799345009',
    address: 'South B, Nairobi',
    category: 'Entertainment',
    contactPerson: 'DJ Mike Kipchoge',
    paymentStatus: 'Partially Paid',
    paymentMethod: 'M-Pesa',
    servicesProvided: 'DJ services, MC, live band coordination, entertainment',
    amount: 55000,
    approvalRequired: false,
    mpesaPhone: '+254799345009',
    tillNumber: '654321',
    businessType: 'Sole Proprietor',
    kraPin: 'P051234575I',
    documents: [],
    status: 'Active',
  },
  {
    name: 'PrintHub Kenya',
    email: 'orders@printhub.co.ke',
    phone: '+254700345010',
    address: 'Mombasa Road, Nairobi',
    category: 'Printing & Branding',
    contactPerson: 'Anne Wairimu',
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Banners, signage, branded materials, roll-up stands',
    amount: 42000,
    approvalRequired: false,
    bankName: 'KCB Bank',
    accountName: 'PrintHub Kenya Ltd',
    accountNumber: '4567890123',
    branchName: 'Mombasa Road Branch',
    swiftCode: 'KCBLKENX',
    businessType: 'Limited Company',
    kraPin: 'P051234576J',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Transport Solutions Kenya',
    email: 'fleet@transportsolutions.co.ke',
    phone: '+254711345011',
    address: 'Kasarani, Nairobi',
    category: 'Transport & Logistics',
    contactPerson: 'Simon Njenga',
    paymentStatus: 'Pending',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Event transportation, shuttle services, logistics',
    amount: 135000,
    approvalRequired: true,
    bankName: 'Co-operative Bank',
    accountName: 'Transport Solutions Kenya Ltd',
    accountNumber: '5678901234',
    branchName: 'Thika Road Branch',
    swiftCode: 'KCOOKENX',
    businessType: 'Limited Company',
    kraPin: 'P051234577K',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Ice & Beverages Co.',
    email: 'sales@icebeverages.co.ke',
    phone: '+254723345012',
    address: 'Industrial Area, Nairobi',
    category: 'Catering Supplies',
    contactPerson: 'Lucy Akinyi',
    paymentStatus: 'Paid',
    paymentMethod: 'M-Pesa',
    servicesProvided: 'Ice supply, beverage delivery, coolers rental',
    amount: 28000,
    approvalRequired: false,
    mpesaPhone: '+254723345012',
    paybillNumber: '400200',
    paybillAccount: 'ICE001',
    businessType: 'Limited Company',
    kraPin: 'P051234578L',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Elite Ushers & Hostesses',
    email: 'recruitment@eliteushers.co.ke',
    phone: '+254734345013',
    address: 'Kileleshwa, Nairobi',
    category: 'Staffing',
    contactPerson: 'Grace Muthoni',
    paymentStatus: 'Partially Paid',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Professional ushers, hostesses, event staff',
    amount: 75000,
    approvalRequired: false,
    bankName: 'Equity Bank',
    accountName: 'Elite Ushers Ltd',
    accountNumber: '6789012345',
    branchName: 'Westlands Branch',
    swiftCode: 'EQBLKENA',
    businessType: 'Limited Company',
    kraPin: 'P051234579M',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Stage Effects & Pyrotechnics',
    email: 'info@stageeffects.co.ke',
    phone: '+254745345014',
    address: 'Juja, Kiambu',
    category: 'Special Effects',
    contactPerson: 'Kevin Omondi',
    paymentStatus: 'Pending',
    paymentMethod: 'Bank Transfer',
    servicesProvided: 'Pyrotechnics, smoke machines, special effects, CO2 cannons',
    amount: 150000,
    approvalRequired: true,
    bankName: 'NCBA Bank',
    accountName: 'Stage Effects Ltd',
    accountNumber: '7890123456',
    branchName: 'Thika Branch',
    swiftCode: 'CBAFKENX',
    businessType: 'Limited Company',
    kraPin: 'P051234580N',
    documents: [],
    status: 'Active',
  },
  {
    name: 'Floral Designs & More',
    email: 'orders@floraldesigns.co.ke',
    phone: '+254756345015',
    address: 'Lavington, Nairobi',
    category: 'Decor & Styling',
    contactPerson: 'Rose Wangari',
    paymentStatus: 'Paid',
    paymentMethod: 'M-Pesa',
    servicesProvided: 'Fresh flowers, artificial flowers, centerpieces, bouquets',
    amount: 68000,
    approvalRequired: false,
    mpesaPhone: '+254756345015',
    tillNumber: '789012',
    businessType: 'Sole Proprietor',
    kraPin: 'P051234581O',
    documents: [],
    status: 'Active',
  },
];

async function addSuppliersSamples() {
  try {
    console.log('🔄 Adding suppliers sample data...');

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: COMPANY_ID },
    });

    if (!company) {
      console.error(`❌ Company with ID ${COMPANY_ID} not found!`);
      process.exit(1);
    }

    console.log(`✅ Found company: ${company.name}`);

    // Check existing suppliers count
    const existingCount = await prisma.supplier.count({
      where: { companyId: COMPANY_ID },
    });

    console.log(`📊 Existing suppliers: ${existingCount}`);

    // Add supplier items
    let addedCount = 0;
    for (const supplier of suppliersSamples) {
      // Check if supplier already exists by name
      const existing = await prisma.supplier.findFirst({
        where: {
          companyId: COMPANY_ID,
          name: supplier.name,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${supplier.name} - already exists`);
        continue;
      }

      await prisma.supplier.create({
        data: {
          companyId: COMPANY_ID,
          ...supplier,
        },
      });

      addedCount++;
      console.log(`✅ Added: ${supplier.name}`);
    }

    console.log(`\n🎉 Successfully added ${addedCount} suppliers!`);

    // Show final count
    const finalCount = await prisma.supplier.count({
      where: { companyId: COMPANY_ID },
    });

    console.log(`📊 Total suppliers: ${finalCount}`);

    // Show summary by category
    console.log('\n📋 Suppliers by category:');
    const categories = await prisma.supplier.groupBy({
      by: ['category'],
      where: { companyId: COMPANY_ID },
      _count: true,
    });

    categories.forEach(cat => {
      console.log(`   ${cat.category}: ${cat._count} suppliers`);
    });

  } catch (error) {
    console.error('❌ Error adding suppliers samples:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addSuppliersSamples();
