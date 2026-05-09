import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_ID = '844709f4-761c-4f1f-85d1-64605f99968d'; // Test Company

const expenseCategories = [
  { name: 'Venue & Accommodation', description: 'Event venue rentals, hotel bookings, conference halls' },
  { name: 'Catering & Refreshments', description: 'Food, beverages, catering services' },
  { name: 'Audio Visual Equipment', description: 'Sound systems, projectors, lighting, staging' },
  { name: 'Decor & Branding', description: 'Event decoration, branding materials, signage' },
  { name: 'Entertainment & Talent', description: 'Performers, speakers, MCs, DJs' },
  { name: 'Transportation & Logistics', description: 'Vehicle hire, fuel, parking, shipping' },
  { name: 'Marketing & Promotion', description: 'Advertising, social media promotion, PR' },
  { name: 'Staffing & Personnel', description: 'Event staff, security, ushers' },
  { name: 'Photography & Videography', description: 'Event documentation, live streaming' },
  { name: 'Printing & Stationery', description: 'Invitations, programs, banners, certificates' },
];

const activationCategories = [
  { name: 'Brand Activation Materials', description: 'Promotional items, branded merchandise' },
  { name: 'Sampling & Demos', description: 'Product samples, demonstration equipment' },
  { name: 'Experiential Marketing', description: 'Interactive experiences, games, contests' },
  { name: 'Promotional Staff', description: 'Brand ambassadors, promoters' },
  { name: 'Digital Activation', description: 'Social media campaigns, influencer marketing' },
  { name: 'Campaign Logistics', description: 'Setup, teardown, transportation for activations' },
];

const operationCategories = [
  { name: 'Office Supplies', description: 'Stationery, printer supplies, office equipment' },
  { name: 'IT & Technology', description: 'Software licenses, hardware, IT maintenance' },
  { name: 'Facility Management', description: 'Rent, utilities, office maintenance' },
  { name: 'Human Resources', description: 'Recruitment, training, employee benefits' },
  { name: 'Professional Services', description: 'Legal, accounting, consulting fees' },
  { name: 'Marketing & Advertising', description: 'Corporate marketing, brand development' },
  { name: 'Travel & Meetings', description: 'Business travel, client meetings' },
  { name: 'Insurance & Licenses', description: 'Business insurance, licenses, permits' },
];

async function main() {
  console.log('Adding sample categories to Test Company...');

  console.log('\n--- Adding Expense Categories ---');
  for (const category of expenseCategories) {
    const created = await prisma.expenseCategory.create({
      data: {
        ...category,
        companyId: COMPANY_ID,
        status: 'Active',
      },
    });
    console.log(`✓ Created: ${created.name}`);
  }

  console.log('\n--- Adding Activation Categories ---');
  for (const category of activationCategories) {
    const created = await prisma.activationCategory.create({
      data: {
        ...category,
        companyId: COMPANY_ID,
        status: 'Active',
      },
    });
    console.log(`✓ Created: ${created.name}`);
  }

  console.log('\n--- Adding Operation Categories ---');
  for (const category of operationCategories) {
    const created = await prisma.operationCategory.create({
      data: {
        ...category,
        companyId: COMPANY_ID,
        status: 'Active',
      },
    });
    console.log(`✓ Created: ${created.name}`);
  }

  const total = expenseCategories.length + activationCategories.length + operationCategories.length;
  console.log(`\n✅ Successfully added ${total} categories!`);
}

main()
  .catch((e) => {
    console.error('Error adding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
