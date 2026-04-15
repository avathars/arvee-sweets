from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os
import io
import json
from datetime import datetime, date
import re

SUPABASE_URL = "https://zrgradbxdkceozheiogy.supabase.co"
SUPABASE_ANON_KEY = "sb_publishable_jnl_RuIfuu9FpXqfZhRILw_yxYuD1af"

app = FastAPI(title="Arvee Sweets Wholesale API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Pydantic Models ----

class ShopCreate(BaseModel):
    shop_name: str
    owner_name: str
    phone: str
    address: str
    area: str
    gst_number: Optional[str] = None

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit: str
    unit_price: float
    total_price: float

class OrderCreate(BaseModel):
    delivery_date: str
    delivery_slot: str
    items: List[OrderItem]
    notes: Optional[str] = None

# ---- Helpers ----

def supabase_headers(token: Optional[str] = None):
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers

async def get_shop_for_user(token: str):
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/shops?select=*&limit=1",
            headers=supabase_headers(token)
        )
        data = r.json()
        if not data:
            return None
        return data[0]

def generate_order_number():
    now = datetime.now()
    return f"ARV-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}"

def get_tier_price(product: dict, tier: str) -> float:
    mapping = {
        'bronze': product.get('bronze_price') or product['base_price'],
        'silver': product.get('silver_price') or product['base_price'],
        'gold': product.get('gold_price') or product['base_price'],
    }
    return float(mapping.get(tier, product['base_price']))

# ---- Auth Dependency ----

async def get_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    return authorization.split(" ")[1]

# ---- Routes ----

@app.get("/")
async def root():
    return {"message": "Arvee Sweets Wholesale API", "location": "Alappuzha, Kerala"}

@app.post("/auth/signup")
async def signup(data: dict):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers=supabase_headers(),
            json={"email": data["email"], "password": data["password"]}
        )
        return r.json()

@app.post("/auth/login")
async def login(data: dict):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=supabase_headers(),
            json={"email": data["email"], "password": data["password"]}
        )
        return r.json()

@app.post("/shops")
async def create_shop(shop: ShopCreate, token: str = Depends(get_token)):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/shops",
            headers={**supabase_headers(token), "Prefer": "return=representation"},
            json=shop.dict()
        )
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=r.status_code, detail=r.json())
        return r.json()

@app.get("/shops/me")
async def get_my_shop(token: str = Depends(get_token)):
    shop = await get_shop_for_user(token)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop

@app.get("/products")
async def get_products(category: Optional[str] = None):
    url = f"{SUPABASE_URL}/rest/v1/products?select=*&stock_available=eq.true&order=category,name"
    if category:
        url += f"&category=eq.{category}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=supabase_headers())
        return r.json()

@app.get("/delivery-schedules")
async def get_delivery_schedules(area: Optional[str] = None):
    url = f"{SUPABASE_URL}/rest/v1/delivery_schedules?select=*&is_available=eq.true&date=gte.{date.today().isoformat()}&order=date,slot"
    if area:
        url += f"&area=eq.{area}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=supabase_headers())
        data = r.json()
        # filter out full slots
        return [s for s in data if s['current_orders'] < s['max_orders']]

@app.post("/orders")
async def create_order(order: OrderCreate, token: str = Depends(get_token)):
    shop = await get_shop_for_user(token)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not registered")

    subtotal = sum(item.total_price for item in order.items)
    # Auto discount tiers
    discount_pct = 0
    if subtotal >= 5000:
        discount_pct = 10
    elif subtotal >= 2000:
        discount_pct = 5
    elif subtotal >= 1000:
        discount_pct = 2

    discount_amount = round(subtotal * discount_pct / 100, 2)
    total_amount = round(subtotal - discount_amount, 2)
    order_number = generate_order_number()

    async with httpx.AsyncClient() as client:
        # Create order
        order_data = {
            "order_number": order_number,
            "shop_id": shop["id"],
            "delivery_date": order.delivery_date,
            "delivery_slot": order.delivery_slot,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "total_amount": total_amount,
            "notes": order.notes,
            "status": "pending"
        }
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/orders",
            headers={**supabase_headers(token), "Prefer": "return=representation"},
            json=order_data
        )
        if r.status_code not in (200, 201):
            raise HTTPException(status_code=400, detail=r.json())

        created_order = r.json()[0]
        order_id = created_order["id"]

        # Create order items
        items_data = [
            {**item.dict(), "order_id": order_id}
            for item in order.items
        ]
        await client.post(
            f"{SUPABASE_URL}/rest/v1/order_items",
            headers=supabase_headers(token),
            json=items_data
        )

        return {**created_order, "discount_pct": discount_pct}

@app.get("/orders")
async def get_orders(token: str = Depends(get_token)):
    shop = await get_shop_for_user(token)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&shop_id=eq.{shop['id']}&order=created_at.desc",
            headers=supabase_headers(token)
        )
        return r.json()

@app.get("/orders/{order_id}/invoice")
async def download_invoice(order_id: str, token: str = Depends(get_token)):
    """Generate and return a text-based invoice (PDF via reportlab if available)"""
    shop = await get_shop_for_user(token)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&id=eq.{order_id}",
            headers=supabase_headers(token)
        )
        orders = r.json()
        if not orders:
            raise HTTPException(status_code=404, detail="Order not found")
        order = orders[0]

    # Build invoice text
    lines = []
    lines.append("=" * 55)
    lines.append("          ARVEE SWEETS - WHOLESALE INVOICE")
    lines.append("       Alappuzha, Kerala | +91 98765 43210")
    lines.append("       GSTIN: 32XXXXX1234X1ZX")
    lines.append("=" * 55)
    lines.append(f"Invoice No : {order['order_number']}")
    lines.append(f"Date       : {order['created_at'][:10]}")
    lines.append(f"Shop       : {shop['shop_name']}")
    lines.append(f"Owner      : {shop['owner_name']}")
    lines.append(f"Address    : {shop['address']}, {shop['area']}")
    lines.append(f"Phone      : {shop['phone']}")
    lines.append(f"Delivery   : {order['delivery_date']} | {order['delivery_slot']}")
    lines.append("-" * 55)
    lines.append(f"{'Item':<25} {'Qty':>6} {'Rate':>8} {'Amount':>10}")
    lines.append("-" * 55)
    for item in order.get('order_items', []):
        lines.append(
            f"{item['product_name']:<25} {item['quantity']:>5}{item['unit']:>2} "
            f"₹{item['unit_price']:>7.2f} ₹{item['total_price']:>9.2f}"
        )
    lines.append("-" * 55)
    lines.append(f"{'Subtotal':<40} ₹{order['subtotal']:>9.2f}")
    if float(order['discount_amount']) > 0:
        lines.append(f"{'Discount':<40} -₹{order['discount_amount']:>8.2f}")
    lines.append(f"{'TOTAL':<40} ₹{order['total_amount']:>9.2f}")
    lines.append("=" * 55)
    lines.append("Thank you for choosing Arvee Sweets!")
    lines.append("For queries: arveesweets@gmail.com")
    lines.append("=" * 55)

    content = "\n".join(lines)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="invoice_{order["order_number"]}.txt"'
        }
    )

@app.post("/orders/{order_id}/reorder")
async def reorder(order_id: str, token: str = Depends(get_token)):
    """Fetch previous order items for reorder"""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&id=eq.{order_id}",
            headers=supabase_headers(token)
        )
        orders = r.json()
        if not orders:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"items": orders[0].get('order_items', [])}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
