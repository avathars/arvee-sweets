# 🍮 Arvee Sweets — Wholesale Portal
### Alappuzha, Kerala | Full-Stack Ordering Application

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Python FastAPI |
| Auth & DB | Supabase (PostgreSQL + Row Level Security) |
| Deployment | Vercel (frontend) + Railway/Render (backend) |

---

## 📁 Project Structure

```
arvee-sweets/
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React app (all pages)
│   │   ├── main.jsx
│   │   └── lib/
│   │       └── supabase.js  # Supabase client + API helper
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## ⚙️ Features

- **Auth**: Shop registration & login via Supabase Auth
- **Product Catalog**: 12 Kerala sweets + filter by category
- **Shopping Cart**: Quantity picker with tier-based pricing
- **Delivery Schedule Picker**: Slots by area/date/time for Alappuzha
- **Bulk Discount Tiers**: 2% / 5% / 10% based on order value
- **Member Tiers**: Bronze → Silver → Gold with price savings
- **Invoice Download**: Text invoice with full breakdown
- **Reorder Button**: One-click repeat from order history
- **Order Tracking**: Status pipeline from pending → delivered

---

## 🚀 LOCAL SETUP

### Step 1 — Supabase Database Setup

1. Go to **https://supabase.com/dashboard/project/zrgradbxdkceozheiogy**
2. Click **SQL Editor** → **New Query**
3. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

### Step 2 — Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API will be live at: `http://localhost:8000`
Docs at: `http://localhost:8000/docs`

### Step 3 — Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App will be live at: `http://localhost:5173`

---

## 🌐 DEPLOYMENT

### Deploy Backend to Railway (Free)

1. Go to **https://railway.app** → New Project → Deploy from GitHub
2. Select your repo, set root directory to `backend/`
3. Railway auto-detects Python. Add start command:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Copy the generated Railway URL (e.g. `https://arvee-backend.up.railway.app`)

**Alternative: Render**
1. Go to **https://render.com** → New Web Service
2. Root dir: `backend/`, Build cmd: `pip install -r requirements.txt`
3. Start cmd: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Deploy Frontend to Vercel (Free)

1. Go to **https://vercel.com** → New Project → Import from GitHub
2. Set root directory to `frontend/`
3. Add environment variable:
   - `VITE_API_URL` = your Railway/Render backend URL
4. Deploy!

---

## 🔐 Supabase Configuration

Your project details:
- **Project URL**: `https://zrgradbxdkceozheiogy.supabase.co`
- **Anon Key**: `sb_publishable_jnl_RuIfuu9FpXqfZhRILw_yxYuD1af`

### Enable Email Auth
In Supabase Dashboard → Authentication → Providers → Email: Enable

### For production, add your domain to:
Dashboard → Authentication → URL Configuration → Site URL

---

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `shops` | Registered shop profiles |
| `products` | Sweet catalog with tier pricing |
| `orders` | Order records with status |
| `order_items` | Line items per order |
| `delivery_schedules` | Available delivery slots |

---

## 🌴 Delivery Areas Covered (Alappuzha)

- Alappuzha Town
- Cherthala
- Kayamkulam
- Haripad
- Ambalapuzha
- Mararikulam
- Kainakary
- Thanneermukkom

---

## 📞 Support
**Arvee Sweets** | Alappuzha, Kerala — 688001
📞 +91 98765 43210 | ✉️ arveesweets@gmail.com
