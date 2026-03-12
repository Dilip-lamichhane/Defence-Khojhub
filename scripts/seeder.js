const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://qbimoqxwrcqamnghiear.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiaW1vcXh3cmNxYW1uZ2hpZWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzQ4ODIsImV4cCI6MjA4NjQ1MDg4Mn0.EV4ZIxOVFZwy4aL1kfUO8imV4S_tZ8Hb5p8SEHtvI1E';

const supabase = createClient(supabaseUrl, supabaseKey);

// Predefined realistic data
const shopsData = [
  {
    name: "North Thamel Cafe",
    category: "Restaurant",
    coordinates: { lat: 27.7230, lng: 85.3140 },
    products: [
      { name: "Chicken Wrap", price: 280 },
      { name: "Veggie Sandwich", price: 200 },
      { name: "Grilled Paneer", price: 350 },
      { name: "French Fries", price: 150 },
      { name: "Mushroom Soup", price: 220 },
      { name: "Chocolate Shake", price: 250 },
      { name: "Caesar Salad", price: 300 },
      { name: "Lemonade", price: 120 },
      { name: "Iced Coffee", price: 180 },
      { name: "Brownie with Ice Cream", price: 250 }
    ]
  },
  {
    name: "Lazimpat Tech Store",
    category: "Electronics",
    coordinates: { lat: 27.7105, lng: 85.3350 },
    products: [
      { name: "Wireless Earbuds", price: 3500 },
      { name: "Bluetooth Speaker", price: 4000 },
      { name: "USB-C Cable", price: 400 },
      { name: "Gaming Mouse", price: 1200 },
      { name: "Mechanical Keyboard", price: 4500 },
      { name: "HD Webcam", price: 3000 },
      { name: "Laptop Stand", price: 1800 },
      { name: "Power Bank 10000mAh", price: 2500 },
      { name: "LED Monitor 24-inch", price: 22000 },
      { name: "RGB Mouse Pad", price: 900 }
    ]
  },
  {
    name: "Pulchowk Fitness Center",
    category: "Fitness",
    coordinates: { lat: 27.7000, lng: 85.3155 },
    products: [
      { name: "Monthly Gym Pass", price: 2500 },
      { name: "Yoga Mat", price: 1200 },
      { name: "Dumbbell Set", price: 1500 },
      { name: "Resistance Bands", price: 800 },
      { name: "Protein Powder", price: 3500 },
      { name: "Shaker Bottle", price: 400 },
      { name: "Jump Rope", price: 500 },
      { name: "Foam Roller", price: 900 },
      { name: "Pre-Workout Supplement", price: 2500 },
      { name: "Gym Gloves", price: 700 }
    ]
  },
  {
    name: "Jawalakhel Health Hub",
    category: "Health/Medicine",
    coordinates: { lat: 27.6950, lng: 85.3280 },
    products: [
      { name: "Paracetamol 500mg", price: 5 },
      { name: "Vitamin C Tablets", price: 150 },
      { name: "Digital Thermometer", price: 300 },
      { name: "Face Masks Pack", price: 250 },
      { name: "Hand Sanitizer 500ml", price: 180 },
      { name: "First Aid Kit", price: 800 },
      { name: "Blood Pressure Monitor", price: 2500 },
      { name: "Multivitamin Syrup", price: 350 },
      { name: "Pain Relief Balm", price: 80 },
      { name: "Cough Syrup", price: 120 }
    ]
  },
  {
    name: "Taumadhi Auto Works",
    category: "Automobile",
    coordinates: { lat: 27.6785, lng: 85.4100 },
    products: [
      { name: "Engine Oil 1L", price: 900 },
      { name: "Brake Pads", price: 2500 },
      { name: "Car Battery 12V", price: 7000 },
      { name: "Tyre 16-inch", price: 12000 },
      { name: "Spark Plug", price: 450 },
      { name: "Car Wax", price: 500 },
      { name: "Windshield Wipers", price: 300 },
      { name: "Headlight Bulb", price: 400 },
      { name: "Air Freshener", price: 150 },
      { name: "Oil Filter", price: 350 }
    ]
  },
  {
    name: "Dattatreya Auto Center",
    category: "Automobile",
    coordinates: { lat: 27.6750, lng: 85.3985 },
    products: [
      { name: "Car Battery 24V", price: 14000 },
      { name: "Brake Fluid", price: 600 },
      { name: "Tyre 18-inch", price: 15000 },
      { name: "Car Polisher", price: 1200 },
      { name: "Fuel Injector Cleaner", price: 450 },
      { name: "Car Wash Soap", price: 250 },
      { name: "Headlight Cleaner", price: 300 },
      { name: "Windshield Fluid", price: 200 },
      { name: "Oil Pan Gasket", price: 350 },
      { name: "Air Filter", price: 400 }
    ]
  },
  {
    name: "Budhanilkantha Electronics",
    category: "Electronics",
    coordinates: { lat: 27.7255, lng: 85.3000 },
    products: [
      { name: "Smartphone 128GB", price: 45000 },
      { name: "Tablet 10-inch", price: 35000 },
      { name: "Bluetooth Headphones", price: 5500 },
      { name: "Portable Speaker", price: 4000 },
      { name: "USB-C Cable 1m", price: 400 },
      { name: "Laptop Stand", price: 1800 },
      { name: "HDMI Cable", price: 500 },
      { name: "Wireless Mouse", price: 1200 },
      { name: "Gaming Keyboard", price: 4500 },
      { name: "Power Bank 15000mAh", price: 3000 }
    ]
  },
  {
    name: "East Patan Fitness Studio",
    category: "Fitness",
    coordinates: { lat: 27.7030, lng: 85.3450 },
    products: [
      { name: "Personal Training Session", price: 1000 },
      { name: "Yoga Class Pack", price: 2000 },
      { name: "Pilates Mat", price: 1200 },
      { name: "Resistance Bands", price: 800 },
      { name: "Dumbbell Set", price: 1500 },
      { name: "Protein Bar Pack", price: 400 },
      { name: "Shaker Bottle", price: 400 },
      { name: "Gym Gloves", price: 700 },
      { name: "Jump Rope", price: 500 },
      { name: "Pre-Workout Supplement", price: 2500 }
    ]
  },
  {
    name: "Central Bhaktapur Health Hub",
    category: "Health/Medicine",
    coordinates: { lat: 27.6810, lng: 85.3600 },
    products: [
      { name: "Antibiotic Ointment", price: 350 },
      { name: "Paracetamol 500mg", price: 5 },
      { name: "Vitamin D Tablets", price: 200 },
      { name: "Digital Thermometer", price: 300 },
      { name: "Face Masks Pack", price: 250 },
      { name: "Hand Sanitizer 500ml", price: 180 },
      { name: "First Aid Kit", price: 800 },
      { name: "Cough Syrup", price: 120 },
      { name: "Pain Relief Balm", price: 80 },
      { name: "Blood Pressure Monitor", price: 2500 }
    ]
  },
  {
    name: "Boudhanagar Restaurant",
    category: "Restaurant",
    coordinates: { lat: 27.7100, lng: 85.3650 },
    products: [
      { name: "Grilled Chicken", price: 320 },
      { name: "Veggie Burger", price: 200 },
      { name: "Caesar Salad", price: 280 },
      { name: "French Fries", price: 150 },
      { name: "Chocolate Muffin", price: 220 },
      { name: "Fruit Juice", price: 180 },
      { name: "Brownie with Ice Cream", price: 250 },
      { name: "Iced Latte", price: 180 },
      { name: "Chicken Sandwich", price: 300 },
      { name: "Veg Wrap", price: 200 }
    ]
  }
];

// Seed shops and products
async function seedData() {
  try {
    for (const shopData of shopsData) {
      // Create shop
      const shopPayload = {
        name: shopData.name,
        category: shopData.category,
        description: `Located at approx. lat: ${shopData.coordinates.lat}, lng: ${shopData.coordinates.lng}`,
        latitude: shopData.coordinates.lat,
        longitude: shopData.coordinates.lng,
        status: 'active'
      };

      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert(shopPayload)
        .select()
        .single();

      if (shopError) throw shopError;

      // Create products for this shop
      const productsPayload = shopData.products.map(product => ({
        name: product.name,
        price: product.price,
        shop_id: shop.id,
        in_stock: true,
        availability: 'available',
        description: `Delicious ${product.name} from ${shopData.name}`,
        image_url: `https://via.placeholder.com/150?text=${encodeURIComponent(product.name)}`
      }));

      const { error: productsError } = await supabase
        .from('products')
        .insert(productsPayload);

      if (productsError) throw productsError;

      console.log(`Inserted shop "${shop.name}" with ${productsPayload.length} products.`);
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

// Run seeder
seedData();