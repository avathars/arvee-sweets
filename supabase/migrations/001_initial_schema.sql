-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shops table (registered small shops)
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  area TEXT NOT NULL,  -- area in Alappuzha
  gst_number TEXT,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products/Sweets catalog
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ml TEXT,  -- Malayalam name
  category TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'kg',
  base_price DECIMAL(10,2) NOT NULL,
  bronze_price DECIMAL(10,2),   -- >5kg discount
  silver_price DECIMAL(10,2),   -- >20kg discount
  gold_price DECIMAL(10,2),     -- >50kg discount
  min_order_qty DECIMAL(10,2) DEFAULT 1,
  stock_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_date DATE NOT NULL,
  delivery_slot TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  invoice_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- Delivery schedules
CREATE TABLE IF NOT EXISTS delivery_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  slot TEXT NOT NULL,
  area TEXT NOT NULL,
  max_orders INTEGER DEFAULT 20,
  current_orders INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;

-- Shops: users can only see/edit their own shop
CREATE POLICY "shops_own" ON shops FOR ALL USING (auth.uid() = user_id);

-- Orders: users can only see their shop's orders
CREATE POLICY "orders_own" ON orders FOR ALL USING (
  shop_id IN (SELECT id FROM shops WHERE user_id = auth.uid())
);

-- Order items: via orders
CREATE POLICY "order_items_own" ON order_items FOR ALL USING (
  order_id IN (
    SELECT o.id FROM orders o
    JOIN shops s ON s.id = o.shop_id
    WHERE s.user_id = auth.uid()
  )
);

-- Products: everyone can read
CREATE POLICY "products_read" ON products FOR SELECT USING (true);

-- Delivery schedules: everyone can read
CREATE POLICY "delivery_schedules_read" ON delivery_schedules FOR SELECT USING (true);

-- Insert sample products
INSERT INTO products (name, name_ml, category, description, unit, base_price, bronze_price, silver_price, gold_price, min_order_qty) VALUES
('Mysore Pak', 'മൈസൂർ പാക്ക്', 'Traditional Sweets', 'Rich gram flour sweet with ghee', 'kg', 380, 360, 340, 320, 1),
('Halwa', 'ഹൽവ', 'Traditional Sweets', 'Kerala wheat halwa', 'kg', 320, 300, 285, 270, 1),
('Ladoo', 'ലഡ്ഡൂ', 'Ball Sweets', 'Besan ladoo with dry fruits', 'kg', 280, 265, 250, 235, 1),
('Burfi', 'ബർഫി', 'Milk Sweets', 'Milk cake burfi assorted', 'kg', 350, 330, 315, 295, 1),
('Jalebi', 'ജിലേബി', 'Fried Sweets', 'Crispy syrup-soaked jalebi', 'kg', 220, 205, 190, 180, 2),
('Gulab Jamun', 'ഗുലാബ് ജാമൂൻ', 'Milk Sweets', 'Soft khoya balls in syrup', 'kg', 300, 280, 265, 250, 2),
('Unniyappam', 'ഉണ്ണിയപ്പം', 'Kerala Specials', 'Traditional Kerala rice sweet', 'kg', 260, 245, 230, 215, 1),
('Achappam', 'അച്ചപ്പം', 'Kerala Specials', 'Rose cookie - Kerala snack', 'kg', 240, 225, 210, 195, 1),
('Kozhukatta', 'കൊഴുക്കട്ട', 'Kerala Specials', 'Steamed rice dumpling with coconut', 'kg', 200, 185, 175, 160, 2),
('Avalose Unda', 'അവലോസ് ഉണ്ട', 'Kerala Specials', 'Roasted rice flour ball', 'kg', 180, 165, 155, 145, 1),
('Kaju Katli', 'കാജു കത്ലി', 'Premium Sweets', 'Pure cashew fudge', 'kg', 680, 650, 620, 590, 0.5),
('Peda', 'പേഡ', 'Milk Sweets', 'Milk peda with saffron', 'kg', 400, 380, 360, 340, 1);

-- Sample delivery schedules for next 14 days
INSERT INTO delivery_schedules (date, slot, area, max_orders) VALUES
(CURRENT_DATE + 1, 'Morning (7AM - 10AM)', 'Alappuzha Town', 15),
(CURRENT_DATE + 1, 'Afternoon (12PM - 3PM)', 'Alappuzha Town', 15),
(CURRENT_DATE + 1, 'Morning (7AM - 10AM)', 'Cherthala', 10),
(CURRENT_DATE + 1, 'Afternoon (12PM - 3PM)', 'Cherthala', 10),
(CURRENT_DATE + 2, 'Morning (7AM - 10AM)', 'Kayamkulam', 10),
(CURRENT_DATE + 2, 'Afternoon (12PM - 3PM)', 'Kayamkulam', 10),
(CURRENT_DATE + 2, 'Morning (7AM - 10AM)', 'Alappuzha Town', 15),
(CURRENT_DATE + 3, 'Morning (7AM - 10AM)', 'Haripad', 8),
(CURRENT_DATE + 3, 'Afternoon (12PM - 3PM)', 'Haripad', 8),
(CURRENT_DATE + 3, 'Morning (7AM - 10AM)', 'Ambalapuzha', 8),
(CURRENT_DATE + 4, 'Morning (7AM - 10AM)', 'Alappuzha Town', 15),
(CURRENT_DATE + 4, 'Afternoon (12PM - 3PM)', 'Alappuzha Town', 15),
(CURRENT_DATE + 5, 'Morning (7AM - 10AM)', 'Cherthala', 10),
(CURRENT_DATE + 5, 'Afternoon (12PM - 3PM)', 'Kayamkulam', 10);
