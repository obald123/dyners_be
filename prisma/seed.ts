/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const services = [
  // --- Catering ---
  { tab: "catering", sortOrder: 0, title: "Corporate Catering", description: "Professional meal services tailored for meetings, conferences, and corporate events.", included: ["Customized menu based on event type", "Breakfast, lunch, and refreshment options", "Professional buffet or plated service", "On-site setup and service coordination", "Beverage service (tea, coffee, soft drinks)", "Timely delivery and event-ready presentation"] },
  { tab: "catering", sortOrder: 1, title: "School Feeding", description: "Reliable, nutritious meals prepared for students at scale.", included: ["Balanced and nutritious meal planning", "Large-scale food preparation", "Consistent daily meal scheduling", "Hygienic food handling and packaging", "Portion control for students", "Reliable on-time delivery or service"] },
  { tab: "catering", sortOrder: 2, title: "Wedding Catering", description: "Elegant catering designed to match the style and experience of your special day.", included: ["Customized menu planning with tasting session", "Full-course meals, appetizers, and desserts", "Professional serving staff", "Elegant table setup and food presentation", "Wedding cake coordination (if required)", "On-site catering management"] },
  { tab: "catering", sortOrder: 3, title: "Restaurants", description: "Quality food service solutions supporting daily restaurant operations.", included: ["Menu development and meal preparation support", "Consistent food quality and portioning", "Kitchen operations support", "Supply of ready-to-serve meals (if needed)", "Food presentation standards", "Flexible service based on restaurant needs"] },
  { tab: "catering", sortOrder: 4, title: "Deliveries", description: "Freshly prepared meals delivered quickly and conveniently to your location.", included: ["Freshly prepared meals on demand", "Secure and hygienic packaging", "Fast and reliable delivery service", "Individual or bulk order options", "Flexible delivery scheduling", "Ready-to-eat meal options"] },
  { tab: "catering", sortOrder: 5, title: "Event Beverage Service", description: "Well-coordinated beverage service to complement any event setting.", included: ["Selection of soft drinks, juices, and water", "Tea and coffee service stations", "Professional beverage serving staff", "Setup of beverage stations or bars", "Glassware and serving equipment", "Continuous service throughout the event"] },
  // --- Event planning ---
  { tab: "planning", sortOrder: 0, title: "Full Event Coordination", description: "Complete planning from concept to day-of execution, keeping every moving part aligned.", included: ["Event planning based on objectives", "Venue setup and layout planning", "Schedule and program coordination", "Guest and seating arrangement", "On-site event supervision", "Coordination with catering and service teams"] },
  { tab: "planning", sortOrder: 1, title: "School Events", description: "Organized planning for school ceremonies, programs, and student gatherings.", included: ["Event structure and program planning", "Stage and seating arrangement", "Coordination with school administration", "Crowd and flow management", "Setup for ceremonies and presentations", "On-site event coordination"] },
  { tab: "planning", sortOrder: 2, title: "Weddings", description: "Complete planning and coordination to ensure a smooth and memorable celebration.", included: ["Full event planning and timeline creation", "Venue setup and decoration coordination", "Seating and guest arrangement", "Coordination with catering and vendors", "Ceremony and reception management", "On-site coordination throughout the event"] },
  { tab: "planning", sortOrder: 3, title: "Event Supervision", description: "Real-time oversight keeping every part of your event running on schedule.", included: ["Real-time event supervision", "Vendor and team coordination", "Schedule and timing control", "Guest flow management", "Problem handling and adjustments", "End-to-end event monitoring"] },
  { tab: "planning", sortOrder: 4, title: "Venue Setup & Styling", description: "Transform any space into a styled event environment aligned with your vision.", included: ["Venue layout design", "Table and seating arrangement", "Decoration setup and styling", "Theme alignment (colors, structure)", "Lighting and ambiance setup", "Final presentation adjustments"] },
  { tab: "planning", sortOrder: 5, title: "Production Management", description: "Coordination of sound, lighting, and technical setup for a complete event experience.", included: ["Sound system setup (speakers, microphones)", "Lighting arrangement for the event", "Stage setup and positioning", "Technical equipment coordination", "Testing and quality checks", "On-site technical support"] },
  // --- Rentals ---
  { tab: "rentals", sortOrder: 0, title: "Tents & Structures", description: "Marquee tents, stretch tents, and event structures for outdoor gatherings.", included: [] },
  { tab: "rentals", sortOrder: 1, title: "Seating", description: "Premium chairs in multiple styles, from Chiavari to banquet seating.", included: [] },
  { tab: "rentals", sortOrder: 2, title: "Tables", description: "Round, rectangular, and cocktail tables to suit every event layout.", included: [] },
  { tab: "rentals", sortOrder: 3, title: "Linen & Decor", description: "Full linen packages, centrepieces, floral arrangements, and accessories.", included: [] },
  { tab: "rentals", sortOrder: 4, title: "Lighting", description: "Ambient lighting, uplighting, and LED setups to shape the atmosphere.", included: [] },
  { tab: "rentals", sortOrder: 5, title: "Audio & Visual", description: "Sound systems, projectors, and screens for speeches and entertainment.", included: [] },
];

const courseMenus: Record<string, Record<string, string[]>> = {
  weddings: {
    Appetizers: ["Beef / Chicken Samosas", "Vegetable Spring Rolls", "Mini Chicken Or Veggie Sandwiches", "Grilled Meat Skewers", "Sausage Bites", "Cheese & Cracker Platters"],
    "Main Courses": ["Grilled Chicken / Roasted Beef", "Fish Fillet (Grilled Or Fried)", "Pilau Rice / Steamed White Rice", "Roasted Or Mashed Potatoes", "Vegetable Sides (Mixed Veggies, Sauteed Greens)", "Pasta (Creamy Or Tomato-Based)"],
    Desserts: ["Wedding Cake (Custom)", "Cupcakes / Mini Cakes", "Doughnuts / Pastries", "Fresh Fruit Platters", "Custard Or Cream Desserts"],
    Beverages: ["Fresh Juices (Mango, Orange, Passion)", "Soft Drinks (Soda Varieties)", "Bottled Water", "Champagne / Wine", "Tea & Coffee Station"],
  },
  corporate: {
    Breakfast: ["Tea (Black, Milk, Spiced)", "Coffee (Black, Milk)", "Hot Chocolate", "Croissants / Doughnuts", "Boiled / Scrambled Eggs", "Sausages", "Fruit Cups"],
    "Main Courses": ["Rice (Plain Or Pilau)", "Grilled Or Fried Chicken", "Beef Stew / Roasted Beef", "Fish Options", "Vegetables (Cabbage, Carrots, Greens)", "Pasta Or Noodles"],
    "Snacks & Breaks": ["Samosas", "Mandazi", "Cookies / Biscuits", "Mini Sandwiches", "Tea / Coffee"],
    Beverages: ["Tea (Black, Milk, Spiced)", "Coffee (Black, Milk)", "Fresh Juices", "Soft Drinks", "Bottled Water"],
  },
  private: {
    Appetizers: ["Samosas / Spring Rolls", "Chicken Wings", "Meat Skewers", "Mini Burgers Or Sandwiches", "Chips / Fries"],
    "Main Courses": ["Buffet-Style Mixed Meals", "Grilled Meats (Chicken, Beef)", "Rice / Potatoes / Pasta", "Chapati", "Vegetable Sides"],
    Desserts: ["Cakes", "Doughnuts", "Fruit Platters", "Sweet Pastries"],
    Beverages: ["Juice", "Soft Drinks", "Water", "Optional Alcohol (Beer, Wine, Spirits)"],
  },
};

const schoolWeeklyMenu: Record<string, Record<string, string[]>> = {
  Monday: {
    Breakfast: ["Porridge (Millet/Sorghum)", "Bread", "Tea (Milk)"],
    Lunch: ["Rice & Beans", "Vegetables (Cabbage, Greens)", "Fruit"],
    Dinner: ["Ugali & Bean Stew", "Sweet Potatoes", "Mixed Greens"],
  },
  Tuesday: {
    Breakfast: ["Porridge", "Mandazi", "Milk"],
    Lunch: ["Ugali & Beef Or Bean Stew", "Plantains", "Vegetables"],
    Dinner: ["Rice & Beans", "Sweet Potatoes", "Greens"],
  },
  Wednesday: {
    Breakfast: ["Bread", "Boiled Eggs", "Tea (Milk)"],
    Lunch: ["Rice & Beans", "Vegetables (Cabbage, Greens)", "Fruit"],
    Dinner: ["Chapati & Bean Stew", "Mixed Vegetables"],
  },
  Thursday: {
    Breakfast: ["Porridge (Millet/Sorghum)", "Bread", "Milk"],
    Lunch: ["Ugali & Beef Stew", "Plantains", "Cabbage"],
    Dinner: ["Rice & Beans", "Sweet Potatoes", "Greens"],
  },
  Friday: {
    Breakfast: ["Mandazi", "Fresh Fruit", "Tea (Milk)"],
    Lunch: ["Rice & Beans", "Vegetables", "Fruit"],
    Dinner: ["Ugali & Beef Or Bean Stew", "Sweet Potatoes", "Mixed Greens"],
  },
  Saturday: {
    Breakfast: ["Mandazi", "Fresh Fruit", "Milk"],
    Lunch: ["Rice & Chicken Stew", "Plantains", "Salad"],
    Dinner: ["Pasta & Vegetables", "Bread"],
  },
  Sunday: {
    Breakfast: ["Porridge", "Bread", "Tea (Milk)"],
    Lunch: ["Rice & Beans", "Grilled Chicken", "Vegetables"],
    Dinner: ["Ugali & Bean Stew", "Sweet Potatoes"],
  },
};

const deliveryProducts: Record<string, Array<{ name: string; description: string; price: number }>> = {
  Burgers: [
    { name: "Beef Burger", description: "Juicy beef patty with cheese, fresh lettuce, and signature sauce.", price: 6500 },
    { name: "Chicken Burger", description: "Crispy chicken fillet served with fresh toppings and fries.", price: 7000 },
    { name: "Double Burger Combo", description: "Double beef burger served with fries and a soft drink.", price: 10500 },
  ],
  "Fries & Sides": [
    { name: "French Fries", description: "Golden crispy fries lightly seasoned and freshly prepared.", price: 2500 },
    { name: "Loaded Fries", description: "Fries topped with melted cheese and house sauce.", price: 4500 },
    { name: "Chicken Wings", description: "Spicy glazed chicken wings served with dipping sauce.", price: 6000 },
  ],
  "Fast Meals": [
    { name: "Mini Pizza", description: "Mini pizza topped with cheese and pepperoni.", price: 8000 },
    { name: "Grilled Chicken Plate", description: "Grilled chicken served with fries and fresh salad.", price: 9500 },
    { name: "Shawarma Wrap", description: "Chicken or beef wrap with vegetables and creamy sauce.", price: 5500 },
  ],
  Drinks: [
    { name: "Soda", description: "Coke, Fanta, Sprite, and other soft drink options.", price: 1000 },
    { name: "Fresh Juice", description: "Freshly blended mango, passion, or pineapple juice.", price: 2500 },
    { name: "Water", description: "Chilled bottled still water.", price: 800 },
  ],
  Desserts: [
    { name: "Doughnuts", description: "Soft homemade doughnuts with a sweet finish.", price: 1500 },
    { name: "Cake Slices", description: "Freshly prepared cake slices available in a variety of flavors.", price: 3000 },
  ],
};

const menuItems = [
  ...Object.entries(courseMenus).flatMap(([category, courses]) =>
    Object.entries(courses).flatMap(([course, names], courseIdx) =>
      names.map((name, i) => ({ name, category, course, sortOrder: courseIdx * 100 + i }))
    )
  ),
  ...Object.entries(schoolWeeklyMenu).flatMap(([day, meals], dayIdx) =>
    Object.entries(meals).flatMap(([meal, names], mealIdx) =>
      names.map((name, i) => ({
        name,
        category: "school",
        course: day,
        description: meal,
        sortOrder: dayIdx * 1000 + mealIdx * 100 + i,
      }))
    )
  ),
  ...Object.entries(deliveryProducts).flatMap(([course, products], courseIdx) =>
    products.map((p, i) => ({ ...p, category: "delivery", course, sortOrder: courseIdx * 100 + i }))
  ),
];

const galleryImages = [
  { src: "/images/gallery/1_54163933022_l.jpg", alt: "Corporate group event", category: "corporate", sortOrder: 0 },
  { src: "/images/gallery/f7awc9hxkae2u6k_53270452788_l.jpg", alt: "Conference catering setup", category: "corporate", sortOrder: 1 },
  { src: "/images/gallery/f7co86cw4aab7zs_53270168491_l.jpg", alt: "Corporate dinner buffet", category: "corporate", sortOrder: 2 },
  { src: "/images/gallery/2_54164808566_l.jpg", alt: "Wedding table arrangement", category: "weddings", sortOrder: 3 },
  { src: "/images/gallery/f7dakodwyaaew___53270168371_l.jpg", alt: "Elegant wedding setup", category: "weddings", sortOrder: 4 },
  { src: "/images/gallery/f7glyj4xuaaydmp_53270452343_l.jpg", alt: "Wedding reception detail", category: "weddings", sortOrder: 5 },
  { src: "/images/gallery/f7glyh-xmaax9jo_53270452358_l.jpg", alt: "Catering spread", category: "weddings", sortOrder: 6 },
  { src: "/images/gallery/f7b2s2dxyaa-zdf_53270527454_l.jpg", alt: "Buffet line setup", category: "private", sortOrder: 7 },
  { src: "/images/gallery/f7dakogwoaapnxh_53270168311_l.jpg", alt: "Private dining arrangement", category: "private", sortOrder: 8 },
  { src: "/images/gallery/f7glx3-wgaaae_i_53270452353_l.jpg", alt: "Food & dessert display", category: "private", sortOrder: 9 },
  { src: "/images/gallery/3_54165265015_l.jpg", alt: "School event catering", category: "school", sortOrder: 10 },
  { src: "/images/gallery/f7b2scrwkaa4dvx_53270168586_l.jpg", alt: "School function setup", category: "school", sortOrder: 11 },
  { src: "/images/gallery/f7ce6bbwcaay3nj_53270527369_l.jpg", alt: "Event venue styling", category: "school", sortOrder: 12 },
  { src: "/images/gallery/f7b2se_xoaazhaf_53270527464_l.jpg", alt: "Catering service in action", category: "corporate", sortOrder: 13 },
  { src: "/images/gallery/f7ce-xhwuaahbxo_53270634160_l.jpg", alt: "Event food presentation", category: "private", sortOrder: 14 },
  { src: "/images/gallery/f7ce6xexeaa1_5r_53270527334_l.jpg", alt: "Table settings close-up", category: "weddings", sortOrder: 15 },
  { src: "/images/gallery/f7b2tldwcaa2ixr_53270527379_l.jpg", alt: "Event catering display", category: "school", sortOrder: 16 },
];

const collectionImg = [
  "/images/collection/1_54163933022_l.jpg",
  "/images/collection/2_54164808566_l.jpg",
  "/images/collection/3_54165265015_l.jpg",
  "/images/gallery/f7dakodwyaaew___53270168371_l.jpg",
  "/images/gallery/f7glyj4xuaaydmp_53270452343_l.jpg",
  "/images/gallery/f7glyh-xmaax9jo_53270452358_l.jpg",
  "/images/gallery/f7b2s2dxyaa-zdf_53270527454_l.jpg",
  "/images/gallery/f7awc9hxkae2u6k_53270452788_l.jpg",
  "/images/gallery/f7co86cw4aab7zs_53270168491_l.jpg",
  "/images/gallery/f7dakogwoaapnxh_53270168311_l.jpg",
  "/images/gallery/f7glx3-wgaaae_i_53270452353_l.jpg",
  "/images/gallery/2_54164808566_l.jpg",
  "/images/gallery/3_54165265015_l.jpg",
  "/images/gallery/f7b2scrwkaa4dvx_53270168586_l.jpg",
  "/images/gallery/f7ce6bbwcaay3nj_53270527369_l.jpg",
  "/images/gallery/f7b2tldwcaa2ixr_53270527379_l.jpg",
  "/images/gallery/f7ce-xhwuaahbxo_53270634160_l.jpg",
  "/images/gallery/f7ce6xexeaa1_5r_53270527334_l.jpg",
] as const;

const collectionItems = [
  { category: "tents", name: "Marquee Tent 10×20m", description: "Seats up to 200 guests. Includes sidewalls and flooring.", image: collectionImg[0] },
  { category: "tents", name: "Marquee Tent 15×30m", description: "Seats up to 400 guests. Ideal for large weddings.", image: collectionImg[1] },
  { category: "tents", name: "Stretch Tent", description: "Modern free-form canopy. Great for outdoor garden parties.", image: collectionImg[2] },
  { category: "tents", name: "Frame Tent", description: "No centre pole design. Maximum space inside.", image: collectionImg[3] },
  { category: "tents", name: "Clear Span Structure", description: "Rigid aluminium frame. Weatherproof for all seasons.", image: collectionImg[4] },
  { category: "tents", name: "Bell Tent", description: "Intimate glamping-style structure for smaller events.", image: collectionImg[5] },
  { category: "chairs", name: "Chiavari Chair (Gold)", description: "Classic gold frame with cushioned seat. Elegant finish.", image: collectionImg[6] },
  { category: "chairs", name: "Chiavari Chair (Silver)", description: "Silver frame with ivory cushion. Modern look.", image: collectionImg[7] },
  { category: "chairs", name: "White Banquet Chair", description: "Stackable resin chair. Clean and versatile.", image: collectionImg[8] },
  { category: "chairs", name: "Garden Chair", description: "Folding white wood chair. Perfect for outdoor events.", image: collectionImg[9] },
  { category: "chairs", name: "Throne Chair (King)", description: "Ornate high-back chair for couples and VIP seating.", image: collectionImg[10] },
  { category: "chairs", name: "Ghost Chair", description: "Transparent polycarbonate. Contemporary and minimal.", image: collectionImg[11] },
  { category: "tables", name: "Round Table 1.2m", description: "Seats 6-8 guests. Compact and versatile.", image: collectionImg[12] },
  { category: "tables", name: "Round Table 1.8m", description: "Seats 10-12 guests. Standard banquet table.", image: collectionImg[13] },
  { category: "tables", name: "Rectangular Table 1.8m", description: "Seats 6. Great for buffets and head tables.", image: collectionImg[14] },
  { category: "tables", name: "Rectangular Table 2.4m", description: "Seats 8-10. Long banquet configuration.", image: collectionImg[15] },
  { category: "tables", name: "Cocktail / Poseur Table", description: "High table for standing receptions.", image: collectionImg[16] },
  { category: "tables", name: "Sweetheart Table", description: "Two-seat intimate table for the couple.", image: collectionImg[17] },
  { category: "linens", name: "White Table Linen", description: "Crisp white tablecloth. Available in all sizes.", image: collectionImg[0] },
  { category: "linens", name: "Ivory Table Linen", description: "Warm ivory tone. Pairs with gold & neutral décor.", image: collectionImg[3] },
  { category: "linens", name: "Coloured Overlays", description: "Satin overlays in 20+ colours.", image: collectionImg[6] },
  { category: "linens", name: "Chair Sashes", description: "Organza and satin sashes in multiple colours.", image: collectionImg[9] },
  { category: "linens", name: "Chair Covers", description: "Spandex stretch covers. Clean universal fit.", image: collectionImg[12] },
  { category: "linens", name: "Table Runners", description: "Sequin and satin runners. Adds texture to table tops.", image: collectionImg[15] },
  { category: "lighting", name: "Fairy Lights Canopy", description: "Ceiling canopy of warm white fairy lights.", image: collectionImg[1] },
  { category: "lighting", name: "LED Uplighting", description: "RGBW LED cans. Remote-controlled colour change.", image: collectionImg[4] },
  { category: "lighting", name: "Chandelier", description: "Crystal pendant chandelier. Adds instant glamour.", image: collectionImg[7] },
  { category: "lighting", name: "Neon Signs", description: "Custom neon signs for names and messages.", image: collectionImg[10] },
  { category: "lighting", name: "Lanterns", description: "Hanging paper and metal lanterns. Warm ambient glow.", image: collectionImg[13] },
  { category: "lighting", name: "Spotlight Rigs", description: "Trussing and spot lights for stages and dance floors.", image: collectionImg[16] },
  { category: "decor", name: "Flower Wall", description: "3×3m artificial flower wall. Ideal photo backdrop.", image: collectionImg[2] },
  { category: "decor", name: "Balloon Arch", description: "Custom colour balloon arch. Entrance or stage feature.", image: collectionImg[5] },
  { category: "decor", name: "Centrepieces", description: "Floral, candle and geometric centrepiece options.", image: collectionImg[8] },
  { category: "decor", name: "Welcome Signage", description: "Mirror, wood and acrylic welcome signs.", image: collectionImg[11] },
  { category: "decor", name: "Backdrop Stand", description: "Adjustable metal frame. For banners or draping.", image: collectionImg[14] },
  { category: "decor", name: "Carpet Runner", description: "Red, white or ivory carpet. 10m standard length.", image: collectionImg[17] },
];

const testimonials = [
  { name: "Amina K.", role: "Bride", quote: "Dyners made our wedding day absolutely magical. The food was exceptional and the service flawless.", rating: 5, imageUrl: "/images/gallery/1_54163933022_l.jpg" },
  { name: "Jean-Pierre M.", role: "Event Coordinator", quote: "We've worked with Dyners on five corporate events - they always deliver beyond expectations.", rating: 5, imageUrl: "/images/gallery/2_54164808566_l.jpg" },
  { name: "Claire N.", role: "Private Client", quote: "From the tent setup to the last dessert, everything was perfect. Highly recommend!", rating: 5, imageUrl: "/images/gallery/3_54165265015_l.jpg" },
];

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 10) {
    throw new Error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (10+ chars) in .env before seeding.");
  }

  await prisma.admin.upsert({
    where: { email },
    update: { role: "super_admin" },
    create: { email, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), role: "super_admin" },
  });
  console.log(`Admin ready: ${email}`);

  await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: { id: "site", address: "Kigali, Rwanda", email: "dyners@gmail.com", phone: "+250 788 123 456" },
  });

  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({ data: services });
    console.log(`Seeded ${services.length} services`);
  }
  if ((await prisma.menuItem.count()) === 0) {
    await prisma.menuItem.createMany({ data: menuItems });
    console.log(`Seeded ${menuItems.length} menu items`);
  }
  if ((await prisma.testimonial.count()) === 0) {
    await prisma.testimonial.createMany({ data: testimonials });
    console.log(`Seeded ${testimonials.length} testimonials`);
  }
  if ((await prisma.galleryImage.count()) === 0) {
    await prisma.galleryImage.createMany({ data: galleryImages });
    console.log(`Seeded ${galleryImages.length} gallery images`);
  }
  if ((await prisma.collectionItem.count()) === 0) {
    await prisma.collectionItem.createMany({ data: collectionItems });
    console.log(`Seeded ${collectionItems.length} collection items`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
