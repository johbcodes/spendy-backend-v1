import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_ID = '844709f4-761c-4f1f-85d1-64605f99968d'; // Test Company
const USER_ID = '6e935b0e-5036-4741-a9f6-792f5fbfa4f8'; // Admin user

const eventsSamples = [
  {
    name: 'Tech Summit 2026',
    type: 'Event',
    category: 'Conference',
    client: 'Tech Corp Ltd',
    brand: 'TechCorp',
    projectLead: 'John Doe',
    budget: 500000,
    spent: 0,
    startDate: new Date('2026-03-15'),
    endDate: new Date('2026-03-17'),
    status: 'Planning',
    location: 'KICC, Nairobi',
  },
  {
    name: 'Product Launch - XYZ Brand',
    type: 'Activation',
    category: 'Product Launch',
    client: 'XYZ Corporation',
    brand: 'XYZ',
    projectLead: 'Jane Smith',
    budget: 300000,
    spent: 0,
    startDate: new Date('2026-04-10'),
    endDate: new Date('2026-04-10'),
    status: 'Planning',
    location: 'Sarit Centre, Nairobi',
  },
  {
    name: 'Annual Team Building',
    type: 'Event',
    category: 'Team Building',
    client: 'Internal - Test Company',
    brand: 'Spendy',
    projectLead: 'Admin User',
    budget: 150000,
    spent: 0,
    startDate: new Date('2026-05-20'),
    endDate: new Date('2026-05-22'),
    status: 'Planning',
    location: 'Maasai Mara, Kenya',
  },
  {
    name: 'Corporate Gala Dinner',
    type: 'Event',
    category: 'Corporate Event',
    client: 'ABC Limited',
    brand: 'ABC',
    projectLead: 'Sarah Johnson',
    budget: 400000,
    spent: 0,
    startDate: new Date('2026-06-05'),
    endDate: new Date('2026-06-05'),
    status: 'Planning',
    location: 'Villa Rosa Kempinski, Nairobi',
  },
  {
    name: 'Music Festival 2026',
    type: 'Event',
    category: 'Entertainment',
    client: 'Live Events Ltd',
    brand: 'MusicFest',
    projectLead: 'Mike Williams',
    budget: 1000000,
    spent: 0,
    startDate: new Date('2026-07-15'),
    endDate: new Date('2026-07-17'),
    status: 'Planning',
    location: 'Uhuru Gardens, Nairobi',
  },
  {
    name: 'Marketing Campaign - Summer Sale',
    type: 'Activation',
    category: 'Marketing Campaign',
    client: 'Retail Chain Ltd',
    brand: 'RetailPlus',
    projectLead: 'Lisa Brown',
    budget: 250000,
    spent: 0,
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-31'),
    status: 'Planning',
    location: 'Various Malls - Nairobi',
  },
  {
    name: 'Office IT Infrastructure Upgrade',
    type: 'Operation',
    category: 'IT Operations',
    client: 'Internal - Test Company',
    brand: 'Spendy',
    projectLead: 'Tech Team',
    budget: 350000,
    spent: 0,
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-31'),
    status: 'In Progress',
    location: 'Spendy HQ, Nairobi',
  },
  {
    name: 'Q1 Marketing Operations',
    type: 'Operation',
    category: 'Marketing Operations',
    client: 'Internal - Test Company',
    brand: 'Spendy',
    projectLead: 'Marketing Team',
    budget: 200000,
    spent: 0,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    status: 'In Progress',
    location: 'Nairobi',
  },
];

async function main() {
  console.log('Adding sample events to Test Company...');

  for (const event of eventsSamples) {
    const createdEvent = await prisma.event.create({
      data: {
        ...event,
        companyId: COMPANY_ID,
        createdById: USER_ID,
      },
    });
    console.log(`✓ Created event: ${createdEvent.name} (${createdEvent.type})`);
  }

  console.log(`\n✅ Successfully added ${eventsSamples.length} events!`);
}

main()
  .catch((e) => {
    console.error('Error adding events:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
