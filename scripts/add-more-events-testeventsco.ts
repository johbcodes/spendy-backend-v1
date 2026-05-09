import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_ID = '0f0fdcea-0a2b-4241-ab5f-5e9fc164a531'; // Test Events Co
const USER_ID = 'c41a31cc-6d53-bfdf-1cf0-3203b00309ee'; // Admin user

const newEvents = [
  // Activation Events
  {
    name: 'Coca-Cola Brand Activation',
    type: 'Activation',
    category: 'Product Launch',
    client: 'Coca-Cola Kenya',
    brand: 'Coca-Cola',
    projectLead: 'Marketing Team',
    budget: 350000,
    spent: 0,
    startDate: new Date('2026-03-20'),
    endDate: new Date('2026-03-22'),
    status: 'Planning',
    location: 'Westgate Mall, Nairobi',
  },
  {
    name: 'Safaricom 5G Launch Campaign',
    type: 'Activation',
    category: 'Marketing Campaign',
    client: 'Safaricom PLC',
    brand: 'Safaricom',
    projectLead: 'Digital Team',
    budget: 500000,
    spent: 0,
    startDate: new Date('2026-04-15'),
    endDate: new Date('2026-05-15'),
    status: 'Planning',
    location: 'Multiple Locations - Nairobi',
  },
  {
    name: 'EABL Product Sampling',
    type: 'Activation',
    category: 'Sampling & Demos',
    client: 'East African Breweries',
    brand: 'Tusker',
    projectLead: 'Experiential Team',
    budget: 200000,
    spent: 0,
    startDate: new Date('2026-06-10'),
    endDate: new Date('2026-06-12'),
    status: 'Planning',
    location: 'Garden City, Nairobi',
  },

  // Operation Events
  {
    name: 'Office Lease & Utilities Q2 2026',
    type: 'Operation',
    category: 'Facility Management',
    client: 'Internal - Test Events Co',
    brand: 'Test Events Co',
    projectLead: 'Admin',
    budget: 450000,
    spent: 0,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-06-30'),
    status: 'In Progress',
    location: 'Head Office',
  },
  {
    name: 'Equipment & Technology Upgrade',
    type: 'Operation',
    category: 'IT Operations',
    client: 'Internal - Test Events Co',
    brand: 'Test Events Co',
    projectLead: 'IT Manager',
    budget: 300000,
    spent: 0,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-04-30'),
    status: 'In Progress',
    location: 'Head Office',
  },
  {
    name: 'Staff Training & Development Q1',
    type: 'Operation',
    category: 'Human Resources',
    client: 'Internal - Test Events Co',
    brand: 'Test Events Co',
    projectLead: 'HR Manager',
    budget: 150000,
    spent: 0,
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-03-31'),
    status: 'In Progress',
    location: 'Various',
  },
];

async function main() {
  console.log('Adding Activation and Operation events to Test Events Co...');

  for (const event of newEvents) {
    const createdEvent = await prisma.event.create({
      data: {
        ...event,
        companyId: COMPANY_ID,
        createdById: USER_ID,
      },
    });
    console.log(`✓ Created ${createdEvent.type}: ${createdEvent.name}`);
  }

  console.log(`\n✅ Successfully added ${newEvents.length} events!`);

  // Show summary
  const summary = await prisma.event.groupBy({
    by: ['type'],
    where: {
      companyId: COMPANY_ID,
    },
    _count: true,
  });

  console.log('\n📊 Total events by type for Test Events Co:');
  summary.forEach(s => {
    console.log(`   ${s.type}: ${s._count} events`);
  });
}

main()
  .catch((e) => {
    console.error('Error adding events:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
