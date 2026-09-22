import {
  PrismaClient,
  ListingCondition,
  ListingType,
  ListingStatus,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: "electronics", nameEn: "Electronics", namePt: "Eletrônicos", icon: "laptop" },
  { slug: "phones", nameEn: "Phones", namePt: "Telemóveis", icon: "smartphone" },
  { slug: "computers", nameEn: "Computers", namePt: "Computadores", icon: "laptop" },
  { slug: "vehicles", nameEn: "Vehicles", namePt: "Veículos", icon: "car" },
  { slug: "fashion", nameEn: "Fashion", namePt: "Moda", icon: "shirt" },
  { slug: "home", nameEn: "Home", namePt: "Casa", icon: "home" },
  { slug: "food", nameEn: "Food", namePt: "Comida", icon: "utensils" },
  { slug: "services", nameEn: "Services", namePt: "Serviços", icon: "wrench" },
  { slug: "jobs", nameEn: "Jobs", namePt: "Empregos", icon: "briefcase" },
  { slug: "digital-goods", nameEn: "Digital Goods", namePt: "Bens Digitais", icon: "hard-drive" },
  { slug: "other", nameEn: "Other", namePt: "Outros", icon: "more-horizontal" },
];

/** Stable, free image URLs (picsum.photos with deterministic seeds). */
function imageFor(slug: string, index: number) {
  // picsum.photos/seed/{seed}/{w}/{h} is reliable and CORS-friendly
  const seed = `${slug}-${index}`;
  return `https://picsum.photos/seed/${seed}/800/600`;
}

async function main() {
  console.log("🌱 Seeding BCH Local...");

  // Platform settings (configurable prices)
  const settings = [
    { key: "price_boost", value: "100" },
    { key: "price_featured", value: "250" },
    { key: "price_top_spot", value: "500" },
    { key: "price_business_monthly", value: "500" },
    { key: "default_country", value: "MZ" },
    { key: "default_city", value: "Maputo" },
    { key: "mzn_per_usd", value: "64" },
  ];
  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // BCH rate (placeholder ~ MZN per BCH)
  const existingRate = await prisma.bchRate.findFirst();
  if (!existingRate) {
    await prisma.bchRate.create({
      data: { rateMzn: 45000, source: "seed" },
    });
  }

  // Categories
  const catMap: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, namePt: c.namePt, icon: c.icon, sortOrder: i },
      create: { ...c, sortOrder: i },
    });
    catMap[c.slug] = cat.id;
  }

  // Demo users — password is always "demo1234"
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const usersData = [
    {
      email: "admin@bchlocal.mz",
      username: "admin",
      role: UserRole.ADMIN,
      displayName: "Admin",
      city: "Maputo",
    },
    {
      email: "joao@demo.mz",
      username: "joao_tech",
      role: UserRole.USER,
      displayName: "João Tech",
      city: "Matola",
      completed: 23,
      rating: 4.9,
    },
    {
      email: "maria@demo.mz",
      username: "casa_bonita",
      role: UserRole.USER,
      displayName: "Maria Casa",
      city: "Maputo",
      completed: 12,
      rating: 4.7,
    },
    {
      email: "carlos@demo.mz",
      username: "auto_maputo",
      role: UserRole.BUSINESS,
      displayName: "Auto Maputo",
      city: "Maputo",
      completed: 45,
      rating: 4.8,
      business: true,
    },
    {
      email: "ana@demo.mz",
      username: "phones_mz",
      role: UserRole.USER,
      displayName: "Ana Phones",
      city: "Maputo",
      completed: 8,
      rating: 5.0,
    },
    {
      email: "pedro@demo.mz",
      username: "plomero_pro",
      role: UserRole.USER,
      displayName: "Pedro Plomero",
      city: "Matola",
      completed: 31,
      rating: 4.9,
    },
    {
      email: "sofia@demo.mz",
      username: "moda_sofia",
      role: UserRole.USER,
      displayName: "Sofia Moda",
      city: "Maputo",
      completed: 5,
      rating: 4.6,
    },
    {
      email: "luis@demo.mz",
      username: "digital_mz",
      role: UserRole.USER,
      displayName: "Luís Digital",
      city: "Maputo",
      completed: 15,
      rating: 4.8,
    },
  ];

  const userIds: Record<string, string> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash, // always reset so demo password stays working
        role: u.role,
        isSuspended: false,
        isBlocked: false,
      },
      create: {
        email: u.email,
        username: u.username,
        passwordHash,
        role: u.role,
        profile: {
          create: {
            displayName: u.displayName,
            locationCity: u.city,
            countryCode: "MZ",
            completedTx: u.completed ?? 0,
            averageRating: u.rating ?? 0,
            reviewCount: u.completed ?? 0,
            trustLevel:
              (u.completed ?? 0) >= 50
                ? "Trusted"
                : (u.completed ?? 0) >= 10
                ? "Established"
                : "New",
            isBusiness: u.business ?? false,
            businessName: u.business ? u.displayName : null,
            verifiedBusiness: u.business ?? false,
            avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username}`,
          },
        },
      },
    });

    // Ensure profile exists / is updated on re-seed
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        displayName: u.displayName,
        locationCity: u.city,
        completedTx: u.completed ?? 0,
        averageRating: u.rating ?? 0,
        reviewCount: u.completed ?? 0,
        trustLevel:
          (u.completed ?? 0) >= 50
            ? "Trusted"
            : (u.completed ?? 0) >= 10
            ? "Established"
            : "New",
        isBusiness: u.business ?? false,
        businessName: u.business ? u.displayName : null,
        verifiedBusiness: u.business ?? false,
        avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username}`,
      },
      create: {
        userId: user.id,
        displayName: u.displayName,
        locationCity: u.city,
        countryCode: "MZ",
        completedTx: u.completed ?? 0,
        averageRating: u.rating ?? 0,
        reviewCount: u.completed ?? 0,
        trustLevel:
          (u.completed ?? 0) >= 50
            ? "Trusted"
            : (u.completed ?? 0) >= 10
            ? "Established"
            : "New",
        isBusiness: u.business ?? false,
        businessName: u.business ? u.displayName : null,
        verifiedBusiness: u.business ?? false,
        avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username}`,
      },
    });

    userIds[u.username] = user.id;
  }

  // Clear old demo listings so re-seed is clean (only listings from demo users)
  const demoUserIds = Object.values(userIds);
  await prisma.listingImage.deleteMany({
    where: { listing: { sellerId: { in: demoUserIds } } },
  });
  await prisma.listing.deleteMany({
    where: { sellerId: { in: demoUserIds } },
  });

  // Demo listings
  const listings = [
    // Electronics / Phones
    {
      title: "iPhone 13 128GB — Excellent condition",
      desc: "Battery health 89%. Original box and cable. Unlocked. No scratches.",
      price: 28000,
      cat: "phones",
      city: "Matola",
      seller: "joao_tech",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Samsung Galaxy A54 5G 128GB",
      desc: "Like new, used 3 months. Full box.",
      price: 19500,
      cat: "phones",
      city: "Maputo",
      seller: "phones_mz",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "iPhone 12 64GB",
      desc: "Good condition, minor wear on edges.",
      price: 16500,
      cat: "phones",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Xiaomi Redmi Note 12",
      desc: "Brand new sealed.",
      price: 12500,
      cat: "phones",
      city: "Matola",
      seller: "phones_mz",
      condition: ListingCondition.NEW,
    },
    {
      title: "Samsung Galaxy S21",
      desc: "128GB, good battery.",
      price: 22000,
      cat: "phones",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },
    {
      title: 'MacBook Pro 13" 2019 16GB RAM',
      desc: "256GB SSD. Excellent for work.",
      price: 65000,
      cat: "computers",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.GOOD,
    },
    {
      title: "HP Laptop 15s 8GB RAM",
      desc: "Intel i5, 512GB SSD. Great for students.",
      price: 28000,
      cat: "computers",
      city: "Matola",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },
    {
      title: 'Dell Monitor 24" Full HD',
      desc: "Almost new, perfect for office.",
      price: 8500,
      cat: "electronics",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Sony WH-1000XM4 Headphones",
      desc: "Noise cancelling, great condition.",
      price: 12000,
      cat: "electronics",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },
    {
      title: "iPad 9th Gen 64GB",
      desc: "WiFi only, light use.",
      price: 18500,
      cat: "electronics",
      city: "Matola",
      seller: "phones_mz",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Logitech MX Master 3 Mouse",
      desc: "Wireless, excellent condition.",
      price: 4500,
      cat: "electronics",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Canon EOS 2000D Camera",
      desc: "With 18-55mm lens. Great starter DSLR.",
      price: 32000,
      cat: "electronics",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },
    {
      title: "PlayStation 5 Disc Edition",
      desc: "With 2 controllers and 3 games.",
      price: 42000,
      cat: "electronics",
      city: "Matola",
      seller: "joao_tech",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Nintendo Switch OLED",
      desc: "With Mario Kart 8.",
      price: 28000,
      cat: "electronics",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.GOOD,
    },
    {
      title: "JBL Flip 6 Bluetooth Speaker",
      desc: "Waterproof, powerful sound.",
      price: 5500,
      cat: "electronics",
      city: "Maputo",
      seller: "phones_mz",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Apple Watch Series 7 45mm",
      desc: "GPS + Cellular. Good battery.",
      price: 21000,
      cat: "electronics",
      city: "Matola",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },
    {
      title: 'Samsung 55" 4K Smart TV',
      desc: "2022 model, excellent picture.",
      price: 38000,
      cat: "electronics",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Dyson V11 Vacuum",
      desc: "Cordless, strong suction.",
      price: 25000,
      cat: "electronics",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Kindle Paperwhite",
      desc: "Latest generation, barely used.",
      price: 7500,
      cat: "electronics",
      city: "Matola",
      seller: "digital_mz",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "GoPro Hero 10",
      desc: "With accessories kit.",
      price: 18000,
      cat: "electronics",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },

    // Vehicles
    {
      title: "Toyota Corolla 2015 Automatic",
      desc: "Low mileage, full service history. Clean interior.",
      price: 850000,
      cat: "vehicles",
      city: "Maputo",
      seller: "auto_maputo",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Honda Fit 2012",
      desc: "Economical, great for city.",
      price: 420000,
      cat: "vehicles",
      city: "Matola",
      seller: "auto_maputo",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Toyota Hilux 2018 Double Cab",
      desc: "Diesel, excellent condition.",
      price: 1850000,
      cat: "vehicles",
      city: "Maputo",
      seller: "auto_maputo",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Nissan NP200 2019",
      desc: "Work bakkie, reliable.",
      price: 380000,
      cat: "vehicles",
      city: "Matola",
      seller: "auto_maputo",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Yamaha YBR 125 Motorcycle",
      desc: "Low km, perfect for commuting.",
      price: 95000,
      cat: "vehicles",
      city: "Maputo",
      seller: "auto_maputo",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Suzuki Swift 2016",
      desc: "Automatic, fuel efficient.",
      price: 480000,
      cat: "vehicles",
      city: "Maputo",
      seller: "auto_maputo",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Ford Ranger 2014",
      desc: "4x4, good for long trips.",
      price: 720000,
      cat: "vehicles",
      city: "Beira",
      seller: "auto_maputo",
      condition: ListingCondition.FAIR,
    },
    {
      title: "Scooter 150cc 2021",
      desc: "Almost new, ideal for Maputo traffic.",
      price: 65000,
      cat: "vehicles",
      city: "Maputo",
      seller: "auto_maputo",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Toyota Quantum 2010",
      desc: "14 seater, good for business.",
      price: 550000,
      cat: "vehicles",
      city: "Matola",
      seller: "auto_maputo",
      condition: ListingCondition.FAIR,
    },
    {
      title: "Bicycle Mountain Bike",
      desc: "21 speed, good condition.",
      price: 8500,
      cat: "vehicles",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.GOOD,
    },

    // Home
    {
      title: "Sofa 3 places — Fabric",
      desc: "Comfortable, neutral color. Good condition.",
      price: 12500,
      cat: "home",
      city: "Matola",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Professional Sofa Set (3+2)",
      desc: "Modern design, barely used.",
      price: 18500,
      cat: "home",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Dining Table + 6 Chairs",
      desc: "Solid wood, excellent quality.",
      price: 15000,
      cat: "home",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Queen Size Bed Frame + Mattress",
      desc: "Orthopedic mattress included.",
      price: 14000,
      cat: "home",
      city: "Matola",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Wardrobe 3 doors",
      desc: "Spacious, good condition.",
      price: 9500,
      cat: "home",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Kitchen Appliance Set",
      desc: "Microwave, kettle, toaster.",
      price: 6500,
      cat: "home",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Office Desk + Chair",
      desc: "Ergonomic chair, large desk.",
      price: 7800,
      cat: "home",
      city: "Matola",
      seller: "digital_mz",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Air Conditioner 12000 BTU",
      desc: "Inverter, energy efficient.",
      price: 22000,
      cat: "home",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Washing Machine 7kg",
      desc: "Front loader, works perfectly.",
      price: 11000,
      cat: "home",
      city: "Matola",
      seller: "casa_bonita",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Garden Furniture Set",
      desc: "Table + 4 chairs, weather resistant.",
      price: 8900,
      cat: "home",
      city: "Maputo",
      seller: "casa_bonita",
      condition: ListingCondition.LIKE_NEW,
    },

    // Fashion
    {
      title: "Nike Air Force 1 Size 42",
      desc: "White, barely worn.",
      price: 4500,
      cat: "fashion",
      city: "Maputo",
      seller: "moda_sofia",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Leather Jacket Men M",
      desc: "Genuine leather, classic style.",
      price: 6800,
      cat: "fashion",
      city: "Maputo",
      seller: "moda_sofia",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Women's Summer Dress Set",
      desc: "3 dresses, size M.",
      price: 3200,
      cat: "fashion",
      city: "Matola",
      seller: "moda_sofia",
      condition: ListingCondition.NEW,
    },
    {
      title: "Adidas Sneakers Size 40",
      desc: "Original, good condition.",
      price: 2800,
      cat: "fashion",
      city: "Maputo",
      seller: "moda_sofia",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Formal Suit Men L",
      desc: "Dark blue, worn twice.",
      price: 7500,
      cat: "fashion",
      city: "Maputo",
      seller: "moda_sofia",
      condition: ListingCondition.LIKE_NEW,
    },
    {
      title: "Handbag Designer Style",
      desc: "High quality faux leather.",
      price: 2200,
      cat: "fashion",
      city: "Maputo",
      seller: "moda_sofia",
      condition: ListingCondition.NEW,
    },
    {
      title: "Kids Clothing Bundle 4-6y",
      desc: "20 pieces, mixed.",
      price: 1800,
      cat: "fashion",
      city: "Matola",
      seller: "moda_sofia",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Sunglasses Ray-Ban Style",
      desc: "UV protection, new.",
      price: 1500,
      cat: "fashion",
      city: "Maputo",
      seller: "moda_sofia",
      condition: ListingCondition.NEW,
    },
    {
      title: "Winter Coat Women M",
      desc: "Warm, stylish.",
      price: 4200,
      cat: "fashion",
      city: "Maputo",
      seller: "moda_sofia",
      condition: ListingCondition.GOOD,
    },
    {
      title: "Sportswear Set Men L",
      desc: "T-shirt + shorts + hoodie.",
      price: 2500,
      cat: "fashion",
      city: "Matola",
      seller: "moda_sofia",
      condition: ListingCondition.NEW,
    },

    // Services
    {
      title: "Plumbing Services — Maputo & Matola",
      desc: "Emergency and scheduled. Fair prices.",
      price: 1500,
      cat: "services",
      city: "Maputo",
      seller: "plomero_pro",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "Electrical Installations & Repairs",
      desc: "Licensed electrician. Residential & small commercial.",
      price: 2000,
      cat: "services",
      city: "Maputo",
      seller: "plomero_pro",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "House Cleaning — Weekly or One-time",
      desc: "Reliable, thorough cleaning service.",
      price: 1200,
      cat: "services",
      city: "Matola",
      seller: "casa_bonita",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "Phone Screen Repair (iPhone & Samsung)",
      desc: "Same day service. Quality parts.",
      price: 2500,
      cat: "services",
      city: "Maputo",
      seller: "phones_mz",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "Graphic Design & Logos",
      desc: "Professional branding for small businesses.",
      price: 3500,
      cat: "services",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "Tutoring Math & Physics (Grade 8-12)",
      desc: "Experienced teacher. Online or in-person.",
      price: 800,
      cat: "services",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "Car Wash & Detailing Mobile",
      desc: "We come to you. Interior + exterior.",
      price: 1500,
      cat: "services",
      city: "Matola",
      seller: "auto_maputo",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "Web Development for Small Business",
      desc: "Simple websites, WhatsApp integration.",
      price: 15000,
      cat: "services",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "Event Photography",
      desc: "Weddings, birthdays, corporate. Full album.",
      price: 8000,
      cat: "services",
      city: "Maputo",
      seller: "joao_tech",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },
    {
      title: "AC Installation & Maintenance",
      desc: "Quick service, warranty on work.",
      price: 3500,
      cat: "services",
      city: "Maputo",
      seller: "plomero_pro",
      condition: ListingCondition.NEW,
      type: ListingType.SERVICE,
    },

    // Digital goods
    {
      title: "Microsoft Office 2021 License Key",
      desc: "Genuine license. Instant delivery after payment.",
      price: 2500,
      cat: "digital-goods",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.NEW,
      type: ListingType.DIGITAL,
    },
    {
      title: "Adobe Creative Cloud 1 Month",
      desc: "Shared access. Contact for details.",
      price: 1800,
      cat: "digital-goods",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.NEW,
      type: ListingType.DIGITAL,
    },
    {
      title: "Canva Pro 1 Year Account",
      desc: "Full features. Delivery via email.",
      price: 1200,
      cat: "digital-goods",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.NEW,
      type: ListingType.DIGITAL,
    },
    {
      title: "Stock Photo Bundle — 500 images",
      desc: "Commercial license. Download link after payment.",
      price: 900,
      cat: "digital-goods",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.NEW,
      type: ListingType.DIGITAL,
    },
    {
      title: "Online Course: Digital Marketing Basics",
      desc: "Video lessons + certificate. Lifetime access.",
      price: 3500,
      cat: "digital-goods",
      city: "Maputo",
      seller: "digital_mz",
      condition: ListingCondition.NEW,
      type: ListingType.DIGITAL,
    },
  ];

  let idx = 0;
  for (const l of listings) {
    await prisma.listing.create({
      data: {
        title: l.title,
        description: l.desc,
        priceMzn: l.price,
        condition: l.condition,
        listingType: l.type ?? ListingType.GOODS,
        status: ListingStatus.ACTIVE,
        locationCity: l.city,
        countryCode: "MZ",
        deliveryOption: "BOTH",
        acceptsBch: true,
        publishedAt: new Date(
          Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000
        ),
        sellerId: userIds[l.seller],
        categoryId: catMap[l.cat],
        images: {
          create: [
            {
              url: imageFor(l.cat, idx),
              sortOrder: 0,
              isPrimary: true,
            },
            {
              url: imageFor(l.cat, idx + 1000),
              sortOrder: 1,
              isPrimary: false,
            },
          ],
        },
      },
    });
    idx++;
  }

  console.log(
    `✅ Seeded ${listings.length} listings, ${usersData.length} users, ${CATEGORIES.length} categories`
  );
  console.log("");
  console.log("Demo logins (password always: demo1234)");
  console.log("  User:  joao@demo.mz");
  console.log("  Admin: admin@bchlocal.mz");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
