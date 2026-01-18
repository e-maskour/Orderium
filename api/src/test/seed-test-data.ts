import { DataSource } from 'typeorm';
import { Partner } from '../modules/partners/entities/partner.entity';
import { DeliveryPerson } from '../modules/delivery/entities/delivery.entity';
import * as bcrypt from 'bcrypt';

// Moroccan company names
const companyNames = [
  'Maroc Telecom',
  'SAHAM Assurance',
  'Attijariwafa Bank',
  'Managem Group',
  "Label'Vie",
  'Cosumar',
  'BMCE Bank',
  'LafargeHolcim Maroc',
  'Centrale Danone',
  'Auto Hall',
  'Salafin',
  'Wafa Assurance',
  'Taqa Morocco',
  'Med Paper',
  'Alliance',
];

// Moroccan first names
const firstNames = [
  'Mehdi',
  'Yasmine',
  'Omar',
  'Fatima',
  'Hassan',
  'Amina',
  'Karim',
  'Salma',
  'Rachid',
  'Nadia',
  'Youssef',
  'Laila',
  'Ahmed',
  'Khadija',
  'Amine',
  'Zineb',
  'Mourad',
  'Sofia',
  'Hamza',
  'Meriem',
  'Adil',
  'Sanaa',
  'Tarik',
  'Houda',
  'Bilal',
];

// Moroccan last names
const lastNames = [
  'El Alami',
  'Benali',
  'Chakir',
  'Fassi',
  'Guessous',
  'Idrissi',
  'Kettani',
  'Lahlou',
  'Mansouri',
  'Naciri',
  'Ouazzani',
  'Berrada',
  'Tazi',
  'Sqalli',
  'Bennani',
  'Cherkaoui',
  'El Amrani',
  'Filali',
  'Hariri',
  'Jazouli',
];

// Moroccan cities
const cities = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Tanger',
  'Agadir',
  'Meknès',
  'Oujda',
  'Kenitra',
  'Tétouan',
  'Safi',
  'El Jadida',
  'Nador',
  'Mohammedia',
  'Beni Mellal',
];

// Moroccan street names and types
const streetTypes = ['Avenue', 'Boulevard', 'Rue', 'Place', 'Quartier'];
const streetNames = [
  'Mohammed V',
  'Hassan II',
  'des FAR',
  'de la Liberté',
  'Zerktouni',
  'Allal Ben Abdellah',
  'Moulay Youssef',
  "de l'Unité Africaine",
  'Anfa',
  'Mers Sultan',
  'Ghandi',
  'Al Massira',
  'Al Qods',
  'Bir Anzarane',
  'Yacoub El Mansour',
  'Agdal',
  'Souissi',
];

// Generate random phone number (Moroccan format)
function generatePhoneNumber(): string {
  const prefixes = ['06', '07', '05'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${number}`;
}

// Generate random email
function generateEmail(name: string): string {
  const cleanName = name.toLowerCase().replace(/['\s]/g, '');
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${cleanName}${Math.floor(Math.random() * 1000)}@${domain}`;
}

// Generate random ICE (15 digits)
function generateICE(): string {
  return (
    '00' + Math.floor(1000000000000 + Math.random() * 9000000000000).toString()
  );
}

// Generate random IF (8 digits)
function generateIF(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// Generate random RC (6 digits)
function generateRC(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate random Patente (8 digits)
function generatePatente(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// Generate random CNSS (9 digits)
function generateCNSS(): string {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

// Generate random TVA number
function generateTVA(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// Generate random address
function generateAddress(city?: string): string {
  const streetType =
    streetTypes[Math.floor(Math.random() * streetTypes.length)];
  const streetName =
    streetNames[Math.floor(Math.random() * streetNames.length)];
  const number = Math.floor(1 + Math.random() * 200);
  const selectedCity =
    city || cities[Math.floor(Math.random() * cities.length)];

  return `${number} ${streetType} ${streetName}, ${selectedCity}`;
}

// Generate random coordinates for Moroccan cities
function generateCoordinates(city: string): { lat: number; lng: number } {
  const coordinates: { [key: string]: { lat: number; lng: number } } = {
    Casablanca: { lat: 33.5731, lng: -7.5898 },
    Rabat: { lat: 34.0209, lng: -6.8416 },
    Marrakech: { lat: 31.6295, lng: -7.9811 },
    Fès: { lat: 34.0181, lng: -5.0078 },
    Tanger: { lat: 35.7595, lng: -5.834 },
    Agadir: { lat: 30.4278, lng: -9.5981 },
    Meknès: { lat: 33.8935, lng: -5.5473 },
    Oujda: { lat: 34.6814, lng: -1.9086 },
    Kenitra: { lat: 34.261, lng: -6.5802 },
    Tétouan: { lat: 35.5889, lng: -5.3626 },
  };

  const base = coordinates[city] || { lat: 33.5731, lng: -7.5898 };

  // Add small random offset (within ~5km)
  return {
    lat: base.lat + (Math.random() - 0.5) * 0.05,
    lng: base.lng + (Math.random() - 0.5) * 0.05,
  };
}

// Shuffle array
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function seedTestData(dataSource: DataSource) {
  console.log('🌱 Starting test data seeding...\n');

  const partnerRepository = dataSource.getRepository(Partner);
  const deliveryRepository = dataSource.getRepository(DeliveryPerson);

  // ==================== CUSTOMERS ====================
  console.log('📦 Creating 10 customers (5 companies + 5 individuals)...');

  const customers: Partial<Partner>[] = [];

  // 5 Company customers
  const shuffledCompanies = shuffle([...companyNames]);
  const shuffledCities = shuffle([...cities]);

  for (let i = 0; i < 5; i++) {
    const city = shuffledCities[i % shuffledCities.length];
    const coords = generateCoordinates(city);
    const address = generateAddress(city);

    customers.push({
      name: shuffledCompanies[i],
      phoneNumber: generatePhoneNumber(),
      email: generateEmail(shuffledCompanies[i]),
      address: address,
      deliveryAddress: address,
      ice: generateICE(),
      if: generateIF(),
      rc: generateRC(),
      patente: generatePatente(),
      cnss: generateCNSS(),
      tvaNumber: generateTVA(),
      isCompany: true,
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapsUrl: `https://maps.google.com/?q=${coords.lat},${coords.lng}`,
      wazeUrl: `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
      isEnabled: true,
      isCustomer: true,
      isSupplier: false,
    });
  }

  // 5 Individual customers
  const shuffledFirstNames = shuffle([...firstNames]);
  const shuffledLastNames = shuffle([...lastNames]);

  for (let i = 0; i < 5; i++) {
    const fullName = `${shuffledFirstNames[i]} ${shuffledLastNames[i]}`;
    const city = shuffledCities[(i + 5) % shuffledCities.length];
    const coords = generateCoordinates(city);
    const address = generateAddress(city);

    customers.push({
      name: fullName,
      phoneNumber: generatePhoneNumber(),
      email: generateEmail(fullName),
      address: address,
      deliveryAddress: address,
      isCompany: false,
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapsUrl: `https://maps.google.com/?q=${coords.lat},${coords.lng}`,
      wazeUrl: `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
      isEnabled: true,
      isCustomer: true,
      isSupplier: false,
    });
  }

  const savedCustomers = await partnerRepository.save(customers);
  console.log(`✅ Created ${savedCustomers.length} customers`);
  console.log(`   - 5 companies with ICE, IF, RC, Patente, CNSS, TVA`);
  console.log(`   - 5 individuals\n`);

  // ==================== SUPPLIERS ====================
  console.log('🏭 Creating 10 suppliers (5 companies + 5 individuals)...');

  const suppliers: Partial<Partner>[] = [];

  // 5 Company suppliers
  for (let i = 5; i < 10; i++) {
    const city = shuffledCities[i % shuffledCities.length];
    const coords = generateCoordinates(city);
    const address = generateAddress(city);

    suppliers.push({
      name: shuffledCompanies[i],
      phoneNumber: generatePhoneNumber(),
      email: generateEmail(shuffledCompanies[i]),
      address: address,
      deliveryAddress: address,
      ice: generateICE(),
      if: generateIF(),
      rc: generateRC(),
      patente: generatePatente(),
      cnss: generateCNSS(),
      tvaNumber: generateTVA(),
      isCompany: true,
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapsUrl: `https://maps.google.com/?q=${coords.lat},${coords.lng}`,
      wazeUrl: `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
      isEnabled: true,
      isCustomer: false,
      isSupplier: true,
    });
  }

  // 5 Individual suppliers
  for (let i = 5; i < 10; i++) {
    const fullName = `${shuffledFirstNames[i]} ${shuffledLastNames[i]}`;
    const city = shuffledCities[i % shuffledCities.length];
    const coords = generateCoordinates(city);
    const address = generateAddress(city);

    suppliers.push({
      name: fullName,
      phoneNumber: generatePhoneNumber(),
      email: generateEmail(fullName),
      address: address,
      deliveryAddress: address,
      isCompany: false,
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapsUrl: `https://maps.google.com/?q=${coords.lat},${coords.lng}`,
      wazeUrl: `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
      isEnabled: true,
      isCustomer: false,
      isSupplier: true,
    });
  }

  const savedSuppliers = await partnerRepository.save(suppliers);
  console.log(`✅ Created ${savedSuppliers.length} suppliers`);
  console.log(`   - 5 companies with ICE, IF, RC, Patente, CNSS, TVA`);
  console.log(`   - 5 individuals\n`);

  // ==================== DELIVERY PERSONS ====================
  console.log('🚚 Creating 10 delivery persons...');

  const deliveryPersons: Partial<DeliveryPerson>[] = [];

  for (let i = 10; i < 20; i++) {
    const fullName = `${shuffledFirstNames[i % firstNames.length]} ${shuffledLastNames[i % lastNames.length]}`;
    const email = generateEmail(fullName);
    const hashedPassword = await bcrypt.hash('123456', 10);

    deliveryPersons.push({
      name: fullName,
      email: email,
      password: hashedPassword,
      phoneNumber: generatePhoneNumber(),
      isActive: true,
    });
  }

  const savedDeliveryPersons = await deliveryRepository.save(deliveryPersons);
  console.log(`✅ Created ${savedDeliveryPersons.length} delivery persons`);
  console.log(`   - All accounts active with password: password123\n`);

  // ==================== SUMMARY ====================
  console.log('🎉 Test data seeding completed!\n');
  console.log('Summary:');
  console.log(
    `  📦 Customers: ${savedCustomers.length} (5 companies + 5 individuals)`,
  );
  console.log(
    `  🏭 Suppliers: ${savedSuppliers.length} (5 companies + 5 individuals)`,
  );
  console.log(`  🚚 Delivery Persons: ${savedDeliveryPersons.length}`);
  console.log('\n📊 Sample Data:');
  console.log('\nCustomers:');
  savedCustomers.slice(0, 3).forEach((c, i) => {
    console.log(
      `  ${i + 1}. ${c.name} - ${c.phoneNumber} ${c.isCompany ? '(Company)' : '(Individual)'}`,
    );
    if (c.isCompany) {
      console.log(`     ICE: ${c.ice}, IF: ${c.if}`);
    }
  });
  console.log('\nSuppliers:');
  savedSuppliers.slice(0, 3).forEach((s, i) => {
    console.log(
      `  ${i + 1}. ${s.name} - ${s.phoneNumber} ${s.isCompany ? '(Company)' : '(Individual)'}`,
    );
    if (s.isCompany) {
      console.log(`     ICE: ${s.ice}, IF: ${s.if}`);
    }
  });
  console.log('\nDelivery Persons:');
  savedDeliveryPersons.slice(0, 3).forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.name} - ${d.email} - ${d.phoneNumber}`);
  });
}
