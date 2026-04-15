import { useState, useEffect, useCallback } from 'react'
import { supabase, apiJSON, apiCall, API_BASE } from './lib/supabase'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const AREAS = ['Alappuzha Town', 'Cherthala', 'Kayamkulam', 'Haripad', 'Ambalapuzha', 'Mararikulam', 'Kainakary', 'Thanneermukkom']
const TIER_INFO = {
  bronze: { label: 'Bronze', color: '#cd7f32', min: 0 },
  silver: { label: 'Silver', color: '#9BA4B5', min: 10000 },
  gold:   { label: 'Gold',   color: '#D4AF37', min: 50000 },
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function formatCurrency(n) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function getStatusColor(s) {
  const m = { pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6', out_for_delivery: '#f97316', delivered: '#22c55e', cancelled: '#ef4444' }
  return m[s] || '#9ca3af'
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#fee2e2' : t.type === 'success' ? '#dcfce7' : '#fef9c3',
          border: `1px solid ${t.type === 'error' ? '#fca5a5' : t.type === 'success' ? '#86efac' : '#fde047'}`,
          color: t.type === 'error' ? '#dc2626' : t.type === 'success' ? '#16a34a' : '#ca8a04',
          padding: '12px 18px', borderRadius: 10, fontFamily: 'Lato', fontSize: 14, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', maxWidth: 320, animation: 'slideIn 0.3s ease'
        }}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── AUTH PAGE ───────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', shopName: '', ownerName: '', phone: '', address: '', area: 'Alappuzha Town' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
        onAuth(data.session)
      } else {
        const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password })
        if (error) throw error
        if (data.session) {
          // Create shop profile
          await apiJSON('/shops', {
            method: 'POST',
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            body: JSON.stringify({ shop_name: form.shopName, owner_name: form.ownerName, phone: form.phone, address: form.address, area: form.area })
          })
          onAuth(data.session)
        } else {
          setError('Check your email to confirm your account.')
        }
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🍮</div>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 38, color: '#f5c842', margin: 0, letterSpacing: '-1px' }}>Arvee Sweets</h1>
          <p style={{ color: '#c9956a', fontFamily: 'Lato', margin: '4px 0 0', fontSize: 14, letterSpacing: 2 }}>WHOLESALE PORTAL • ALAPPUZHA, KERALA</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', borderRadius: 20, border: '1px solid rgba(245,200,66,0.2)', padding: 36 }}>
          <div style={{ display: 'flex', marginBottom: 28, background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '10px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'Lato', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                background: mode === m ? '#f5c842' : 'transparent',
                color: mode === m ? '#1a0a00' : '#9ca3af'
              }}>
                {m === 'login' ? 'Sign In' : 'Register Shop'}
              </button>
            ))}
          </div>

          <form onSubmit={handle}>
            {mode === 'register' && (
              <>
                <Input label="Shop Name" value={form.shopName} onChange={v => setForm(f => ({...f, shopName: v}))} placeholder="e.g. Babu Stores" />
                <Input label="Owner Name" value={form.ownerName} onChange={v => setForm(f => ({...f, ownerName: v}))} placeholder="Your full name" />
                <Input label="Phone" value={form.phone} onChange={v => setForm(f => ({...f, phone: v}))} placeholder="+91 XXXXX XXXXX" />
                <Input label="Address" value={form.address} onChange={v => setForm(f => ({...f, address: v}))} placeholder="Shop address" />
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', color: '#c9956a', fontFamily: 'Lato', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Area</label>
                  <select value={form.area} onChange={e => setForm(f => ({...f, area: e.target.value}))} style={selectStyle}>
                    {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </>
            )}
            <Input label="Email" type="email" value={form.email} onChange={v => setForm(f => ({...f, email: v}))} placeholder="your@email.com" />
            <Input label="Password" type="password" value={form.password} onChange={v => setForm(f => ({...f, password: v}))} placeholder="Min 6 characters" />

            {error && <p style={{ color: '#f87171', fontFamily: 'Lato', fontSize: 13, marginBottom: 16 }}>{error}</p>}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px 0', background: loading ? '#8a7a30' : 'linear-gradient(135deg, #f5c842, #e6a817)', border: 'none', borderRadius: 12,
              color: '#1a0a00', fontFamily: 'Lato', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
            }}>
              {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── SHARED INPUTS ────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(245,200,66,0.25)',
  borderRadius: 10, color: '#f5f0e8', fontFamily: 'Lato', fontSize: 14, outline: 'none', boxSizing: 'border-box'
}
const selectStyle = { ...inputStyle, background: '#2d1200' }

function Input({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', color: '#c9956a', fontFamily: 'Lato', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputStyle} />
    </div>
  )
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, shop, onLogout }) {
  const navItems = [
    { id: 'catalog', icon: '🍬', label: 'Order Sweets' },
    { id: 'orders', icon: '📦', label: 'My Orders' },
    { id: 'schedule', icon: '🚚', label: 'Delivery Schedule' },
    { id: 'pricing', icon: '💰', label: 'Pricing Tiers' },
    { id: 'profile', icon: '🏪', label: 'My Shop' },
  ]
  return (
    <div style={{
      width: 240, minHeight: '100vh', background: '#0f0500', borderRight: '1px solid rgba(245,200,66,0.15)',
      display: 'flex', flexDirection: 'column', padding: '24px 16px', boxSizing: 'border-box', flexShrink: 0
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(245,200,66,0.15)' }}>
        <div style={{ fontSize: 36 }}>🍮</div>
        <h2 style={{ fontFamily: '"Playfair Display", serif', color: '#f5c842', margin: '6px 0 2px', fontSize: 22 }}>Arvee Sweets</h2>
        <p style={{ color: '#7a5c3a', fontFamily: 'Lato', fontSize: 11, margin: 0, letterSpacing: 1 }}>WHOLESALE PORTAL</p>
      </div>

      {shop && (
        <div style={{ background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 24 }}>
          <p style={{ color: '#f5c842', fontFamily: 'Lato', fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{shop.shop_name}</p>
          <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 12, margin: 0 }}>{shop.area}</p>
          <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: TIER_INFO[shop.tier]?.color + '22', border: `1px solid ${TIER_INFO[shop.tier]?.color}55` }}>
            <span style={{ color: TIER_INFO[shop.tier]?.color, fontFamily: 'Lato', fontSize: 11, fontWeight: 700 }}>
              ⭐ {TIER_INFO[shop.tier]?.label} Member
            </span>
          </div>
        </div>
      )}

      <nav style={{ flex: 1 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: 'none',
            borderRadius: 12, marginBottom: 4, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
            background: page === item.id ? 'rgba(245,200,66,0.15)' : 'transparent',
            borderLeft: page === item.id ? '3px solid #f5c842' : '3px solid transparent',
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontFamily: 'Lato', fontSize: 14, fontWeight: page === item.id ? 700 : 500, color: page === item.id ? '#f5c842' : '#9ca3af' }}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <button onClick={onLogout} style={{
        width: '100%', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 12, color: '#ef4444', fontFamily: 'Lato', fontWeight: 600, fontSize: 14, cursor: 'pointer'
      }}>
        Sign Out
      </button>
    </div>
  )
}

// ─── CATALOG PAGE ─────────────────────────────────────────────────────────────
function CatalogPage({ shop, addToast }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({})
  const [category, setCategory] = useState('all')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliverySlot, setDeliverySlot] = useState('')
  const [schedules, setSchedules] = useState([])
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState('catalog') // catalog | checkout
  const [loading, setLoading] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)

  useEffect(() => {
    apiJSON('/products').then(setProducts).catch(() => {})
    if (shop) {
      apiJSON(`/delivery-schedules?area=${encodeURIComponent(shop.area)}`).then(setSchedules).catch(() => {})
    }
  }, [shop])

  const categories = ['all', ...new Set(products.map(p => p.category))]
  const filtered = category === 'all' ? products : products.filter(p => p.category === category)

  const getPrice = (p) => {
    const tier = shop?.tier || 'bronze'
    if (tier === 'gold' && p.gold_price) return p.gold_price
    if (tier === 'silver' && p.silver_price) return p.silver_price
    if (tier === 'bronze' && p.bronze_price) return p.bronze_price
    return p.base_price
  }

  const updateCart = (id, qty) => {
    setCart(c => ({ ...c, [id]: Math.max(0, qty) }))
  }

  const cartItems = products.filter(p => cart[p.id] > 0).map(p => ({
    ...p, qty: cart[p.id], price: getPrice(p), lineTotal: cart[p.id] * getPrice(p)
  }))
  const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0)
  const discountPct = subtotal >= 5000 ? 10 : subtotal >= 2000 ? 5 : subtotal >= 1000 ? 2 : 0
  const discountAmt = subtotal * discountPct / 100
  const total = subtotal - discountAmt

  const availableSlots = schedules.filter(s => s.area === shop?.area)
  const uniqueDates = [...new Set(availableSlots.map(s => s.date))]

  const placeOrder = async () => {
    if (!deliveryDate || !deliverySlot) { addToast('Please select delivery date and slot', 'error'); return }
    if (cartItems.length === 0) { addToast('Cart is empty', 'error'); return }
    setLoading(true)
    try {
      const order = await apiJSON('/orders', {
        method: 'POST',
        body: JSON.stringify({
          delivery_date: deliveryDate, delivery_slot: deliverySlot, notes,
          items: cartItems.map(i => ({
            product_id: i.id, product_name: i.name, quantity: i.qty, unit: i.unit, unit_price: i.price, total_price: i.lineTotal
          }))
        })
      })
      setPlacedOrder(order)
      setCart({})
      setStep('success')
      addToast('Order placed successfully! 🎉', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
    setLoading(false)
  }

  if (step === 'success') return (
    <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🎊</div>
      <h2 style={{ fontFamily: '"Playfair Display", serif', color: '#f5c842', fontSize: 32 }}>Order Placed!</h2>
      <p style={{ color: '#c9956a', fontFamily: 'Lato' }}>Order #{placedOrder?.order_number}</p>
      <p style={{ color: '#9ca3af', fontFamily: 'Lato' }}>Delivery on {formatDate(placedOrder?.delivery_date)} | {placedOrder?.delivery_slot}</p>
      <p style={{ color: '#f5c842', fontFamily: 'Lato', fontSize: 22, fontWeight: 700 }}>{formatCurrency(placedOrder?.total_amount)}</p>
      <button onClick={() => setStep('catalog')} style={primaryBtn}>Order More</button>
    </div>
  )

  if (step === 'checkout') return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <button onClick={() => setStep('catalog')} style={{ background: 'none', border: 'none', color: '#f5c842', fontFamily: 'Lato', cursor: 'pointer', fontSize: 14, marginBottom: 20 }}>
        ← Back to Catalog
      </button>
      <h2 style={pageTitle}>Review Order</h2>
      <div style={card}>
        <h3 style={sectionTitle}>Items</h3>
        {cartItems.map(i => (
          <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(245,200,66,0.1)', fontFamily: 'Lato' }}>
            <span style={{ color: '#f5f0e8' }}>{i.name} <span style={{ color: '#9ca3af', fontSize: 13 }}>×{i.qty}{i.unit}</span></span>
            <span style={{ color: '#f5c842' }}>{formatCurrency(i.lineTotal)}</span>
          </div>
        ))}
        <div style={{ marginTop: 16, paddingTop: 12 }}>
          <Row label="Subtotal" value={formatCurrency(subtotal)} />
          {discountPct > 0 && <Row label={`Bulk Discount (${discountPct}%)`} value={`-${formatCurrency(discountAmt)}`} accent />}
          <Row label="Total" value={formatCurrency(total)} bold />
        </div>
      </div>

      <div style={card}>
        <h3 style={sectionTitle}>🚚 Delivery Schedule</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Delivery Date</label>
          <select value={deliveryDate} onChange={e => { setDeliveryDate(e.target.value); setDeliverySlot('') }} style={{ ...selectStyle, marginTop: 6 }}>
            <option value="">Select date...</option>
            {uniqueDates.map(d => <option key={d} value={d}>{formatDate(d)}</option>)}
          </select>
        </div>
        {deliveryDate && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Time Slot</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              {availableSlots.filter(s => s.date === deliveryDate).map(s => (
                <button key={s.id} onClick={() => setDeliverySlot(s.slot)} style={{
                  padding: '10px 16px', borderRadius: 10, border: `2px solid ${deliverySlot === s.slot ? '#f5c842' : 'rgba(245,200,66,0.2)'}`,
                  background: deliverySlot === s.slot ? 'rgba(245,200,66,0.15)' : 'transparent',
                  color: deliverySlot === s.slot ? '#f5c842' : '#9ca3af', fontFamily: 'Lato', fontSize: 13, cursor: 'pointer'
                }}>
                  {s.slot}<br /><span style={{ fontSize: 11 }}>{s.max_orders - s.current_orders} slots left</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle}>Special Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions..." rows={3}
            style={{ ...inputStyle, resize: 'vertical', marginTop: 6 }} />
        </div>
      </div>

      <button onClick={placeOrder} disabled={loading} style={primaryBtn}>
        {loading ? 'Placing Order...' : `Place Order • ${formatCurrency(total)}`}
      </button>
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={pageTitle}>Order Sweets</h2>
          <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 14, margin: 0 }}>Fresh sweets delivered to your shop in Alappuzha</p>
        </div>
        {cartItems.length > 0 && (
          <button onClick={() => setStep('checkout')} style={primaryBtn}>
            🛒 Checkout ({cartItems.length} items) • {formatCurrency(total)}
          </button>
        )}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: '8px 16px', borderRadius: 20, border: `1px solid ${category === c ? '#f5c842' : 'rgba(245,200,66,0.2)'}`,
            background: category === c ? '#f5c842' : 'transparent', color: category === c ? '#1a0a00' : '#9ca3af',
            fontFamily: 'Lato', fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize'
          }}>
            {c === 'all' ? '✨ All Sweets' : c}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {filtered.map(p => {
          const price = getPrice(p)
          const qty = cart[p.id] || 0
          const savings = p.base_price - price
          return (
            <div key={p.id} style={{ ...card, padding: 20, transition: 'transform 0.2s', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontFamily: '"Playfair Display", serif', color: '#f5f0e8', fontSize: 18, margin: '0 0 2px' }}>{p.name}</h3>
                  {p.name_ml && <p style={{ color: '#f5c842', fontFamily: 'Lato', fontSize: 13, margin: 0, opacity: 0.8 }}>{p.name_ml}</p>}
                </div>
                <span style={{ fontSize: 28 }}>
                  {p.category === 'Kerala Specials' ? '🌴' : p.category === 'Premium Sweets' ? '✨' : p.category === 'Fried Sweets' ? '🍩' : '🍮'}
                </span>
              </div>
              <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 12, margin: '0 0 14px' }}>{p.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <span style={{ color: '#f5c842', fontFamily: 'Lato', fontWeight: 700, fontSize: 20 }}>{formatCurrency(price)}/{p.unit}</span>
                  {savings > 0 && <span style={{ color: '#22c55e', fontFamily: 'Lato', fontSize: 11, display: 'block' }}>Save {formatCurrency(savings)}/{p.unit}</span>}
                </div>
                <span style={{ color: '#7a5c3a', fontFamily: 'Lato', fontSize: 11 }}>Min: {p.min_order_qty}{p.unit}</span>
              </div>
              {/* Qty control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => updateCart(p.id, qty - (p.min_order_qty || 1))} style={qtyBtn}>−</button>
                <span style={{ flex: 1, textAlign: 'center', color: qty > 0 ? '#f5c842' : '#9ca3af', fontFamily: 'Lato', fontWeight: 700 }}>
                  {qty > 0 ? `${qty} ${p.unit}` : 'Add'}
                </span>
                <button onClick={() => updateCart(p.id, qty + (p.min_order_qty || 1))} style={{ ...qtyBtn, background: 'rgba(245,200,66,0.2)', color: '#f5c842' }}>+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ORDERS PAGE ──────────────────────────────────────────────────────────────
function OrdersPage({ addToast, setPage, setReorderItems }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiJSON('/orders')
      setOrders(data)
    } catch (err) {
      addToast(err.message, 'error')
    }
    setLoading(false)
  }, [addToast])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const downloadInvoice = async (orderId, orderNumber) => {
    try {
      const session = (await supabase.auth.getSession()).data.session
      const res = await fetch(`${API_BASE}/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `invoice_${orderNumber}.txt`; a.click()
      addToast('Invoice downloaded!', 'success')
    } catch {
      addToast('Failed to download invoice', 'error')
    }
  }

  const handleReorder = async (orderId) => {
    try {
      const data = await apiJSON(`/orders/${orderId}/reorder`, { method: 'POST' })
      addToast('Items added to new order! 🛒', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  if (loading) return <div style={{ padding: 40, color: '#9ca3af', fontFamily: 'Lato' }}>Loading orders...</div>

  return (
    <div style={{ padding: 24 }}>
      <h2 style={pageTitle}>My Orders</h2>
      {orders.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p style={{ color: '#9ca3af', fontFamily: 'Lato' }}>No orders yet. Start ordering sweets!</p>
        </div>
      ) : orders.map(order => (
        <div key={order.id} style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ color: '#f5c842', fontFamily: 'Lato', fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>#{order.order_number}</p>
              <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 13, margin: 0 }}>
                {formatDate(order.delivery_date)} • {order.delivery_slot}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: getStatusColor(order.status) + '22', color: getStatusColor(order.status), fontFamily: 'Lato', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                {order.status.replace(/_/g, ' ')}
              </span>
              <span style={{ color: '#f5c842', fontFamily: 'Lato', fontWeight: 700, fontSize: 18 }}>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setExpanded(expanded === order.id ? null : order.id)} style={outlineBtn}>
              {expanded === order.id ? 'Hide' : 'View'} Items
            </button>
            <button onClick={() => downloadInvoice(order.id, order.order_number)} style={outlineBtn}>
              📄 Invoice
            </button>
            <button onClick={() => handleReorder(order.id)} style={outlineBtn}>
              🔄 Reorder
            </button>
          </div>

          {expanded === order.id && order.order_items && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(245,200,66,0.1)' }}>
              {order.order_items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'Lato', fontSize: 14 }}>
                  <span style={{ color: '#f5f0e8' }}>{item.product_name} <span style={{ color: '#9ca3af' }}>×{item.quantity}{item.unit}</span></span>
                  <span style={{ color: '#f5c842' }}>{formatCurrency(item.total_price)}</span>
                </div>
              ))}
              {parseFloat(order.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid rgba(245,200,66,0.1)', marginTop: 8 }}>
                  <span style={{ color: '#22c55e', fontFamily: 'Lato', fontSize: 13 }}>Bulk Discount Applied</span>
                  <span style={{ color: '#22c55e', fontFamily: 'Lato' }}>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── SCHEDULE PAGE ────────────────────────────────────────────────────────────
function SchedulePage({ shop }) {
  const [schedules, setSchedules] = useState([])
  const [selectedArea, setSelectedArea] = useState(shop?.area || 'Alappuzha Town')

  useEffect(() => {
    apiJSON(`/delivery-schedules?area=${encodeURIComponent(selectedArea)}`).then(setSchedules).catch(() => {})
  }, [selectedArea])

  const grouped = schedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2 style={pageTitle}>Delivery Schedule</h2>
      <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 14, marginBottom: 24 }}>Available delivery slots for your area</p>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Select Area</label>
        <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} style={{ ...selectStyle, marginTop: 6, maxWidth: 280 }}>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {Object.entries(grouped).map(([date, slots]) => (
        <div key={date} style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ fontFamily: '"Playfair Display", serif', color: '#f5c842', fontSize: 18, margin: '0 0 14px' }}>
            🗓 {formatDate(date)}
          </h3>
          {slots.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(245,200,66,0.08)' }}>
              <div>
                <p style={{ color: '#f5f0e8', fontFamily: 'Lato', fontWeight: 600, margin: '0 0 2px' }}>{s.slot}</p>
                <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 12, margin: 0 }}>{s.area}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ width: 120, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 4 }}>
                  <div style={{ width: `${(s.current_orders / s.max_orders) * 100}%`, height: '100%', background: s.current_orders / s.max_orders > 0.8 ? '#ef4444' : '#22c55e', borderRadius: 3 }} />
                </div>
                <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 12, margin: 0 }}>{s.max_orders - s.current_orders} slots left</p>
              </div>
            </div>
          ))}
        </div>
      ))}
      {Object.keys(grouped).length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#9ca3af', fontFamily: 'Lato' }}>No delivery slots available for this area</p>
        </div>
      )}
    </div>
  )
}

// ─── PRICING PAGE ────────────────────────────────────────────────────────────
function PricingPage({ shop }) {
  const [products, setProducts] = useState([])
  useEffect(() => { apiJSON('/products').then(setProducts).catch(() => {}) }, [])

  const tiers = [
    { key: 'bronze', label: 'Bronze', icon: '🥉', color: '#cd7f32', desc: 'Starting tier', discount: 'Up to 5% off base price', min: '0 kg+' },
    { key: 'silver', label: 'Silver', icon: '🥈', color: '#9BA4B5', desc: '₹10,000+ total orders', discount: 'Up to 10% off base price', min: 'Reach ₹10,000 total' },
    { key: 'gold',   label: 'Gold',   icon: '🥇', color: '#D4AF37', desc: '₹50,000+ total orders', discount: 'Up to 15% off base price', min: 'Reach ₹50,000 total' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <h2 style={pageTitle}>Pricing Tiers & Discounts</h2>

      {/* Tier cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
        {tiers.map(t => (
          <div key={t.key} style={{
            ...card, textAlign: 'center', padding: 28,
            border: `2px solid ${shop?.tier === t.key ? t.color : 'rgba(245,200,66,0.1)'}`,
            position: 'relative', overflow: 'hidden'
          }}>
            {shop?.tier === t.key && (
              <div style={{ position: 'absolute', top: 10, right: 10, background: t.color, color: '#fff', fontFamily: 'Lato', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                YOUR TIER
              </div>
            )}
            <div style={{ fontSize: 40, marginBottom: 8 }}>{t.icon}</div>
            <h3 style={{ fontFamily: '"Playfair Display", serif', color: t.color, fontSize: 22, margin: '0 0 8px' }}>{t.label}</h3>
            <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 13, margin: '0 0 8px' }}>{t.desc}</p>
            <p style={{ color: '#22c55e', fontFamily: 'Lato', fontSize: 13, fontWeight: 700, margin: 0 }}>{t.discount}</p>
          </div>
        ))}
      </div>

      {/* Order-level discounts */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={sectionTitle}>📦 Order-Level Bulk Discounts</h3>
        {[
          { label: 'Order ≥ ₹1,000', discount: '2% off' },
          { label: 'Order ≥ ₹2,000', discount: '5% off' },
          { label: 'Order ≥ ₹5,000', discount: '10% off' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(245,200,66,0.08)', fontFamily: 'Lato' }}>
            <span style={{ color: '#f5f0e8' }}>{r.label}</span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>{r.discount}</span>
          </div>
        ))}
      </div>

      {/* Price comparison table */}
      <div style={card}>
        <h3 style={sectionTitle}>💲 Price Comparison by Tier</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Lato', fontSize: 14 }}>
            <thead>
              <tr>
                {['Product', 'Base', '🥉 Bronze', '🥈 Silver', '🥇 Gold'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Product' ? 'left' : 'right', color: '#c9956a', borderBottom: '1px solid rgba(245,200,66,0.2)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 8).map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', color: '#f5f0e8' }}>{p.name}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#9ca3af' }}>₹{p.base_price}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#cd7f32' }}>₹{p.bronze_price || p.base_price}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#9BA4B5' }}>₹{p.silver_price || p.base_price}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#D4AF37' }}>₹{p.gold_price || p.base_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ shop }) {
  if (!shop) return <div style={{ padding: 40, color: '#9ca3af', fontFamily: 'Lato' }}>Loading profile...</div>
  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2 style={pageTitle}>My Shop Profile</h2>
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: '"Playfair Display", serif', color: '#f5c842', fontSize: 26, margin: 0 }}>{shop.shop_name}</h3>
            <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 14, margin: '4px 0 0' }}>{shop.area}, Alappuzha</p>
          </div>
          <div style={{ padding: '8px 18px', borderRadius: 24, background: TIER_INFO[shop.tier]?.color + '22', border: `2px solid ${TIER_INFO[shop.tier]?.color}` }}>
            <span style={{ color: TIER_INFO[shop.tier]?.color, fontFamily: 'Lato', fontWeight: 700 }}>
              ⭐ {TIER_INFO[shop.tier]?.label}
            </span>
          </div>
        </div>
        {[
          ['Owner', shop.owner_name],
          ['Phone', shop.phone],
          ['Address', shop.address],
          ['GST Number', shop.gst_number || 'Not provided'],
          ['Member Since', formatDate(shop.created_at)],
          ['Total Orders', shop.total_orders],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid rgba(245,200,66,0.08)' }}>
            <span style={{ color: '#7a5c3a', fontFamily: 'Lato', fontSize: 13, width: 120, flexShrink: 0 }}>{label}</span>
            <span style={{ color: '#f5f0e8', fontFamily: 'Lato', fontSize: 14 }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ ...card, textAlign: 'center', padding: 28 }}>
        <p style={{ color: '#f5c842', fontFamily: '"Playfair Display", serif', fontSize: 18, margin: '0 0 8px' }}>Arvee Sweets Wholesale</p>
        <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 13, margin: '0 0 4px' }}>📍 Alappuzha, Kerala — 688001</p>
        <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 13, margin: '0 0 4px' }}>📞 +91 98765 43210</p>
        <p style={{ color: '#9ca3af', fontFamily: 'Lato', fontSize: 13, margin: 0 }}>✉️ arveesweets@gmail.com</p>
      </div>
    </div>
  )
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const card = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,200,66,0.12)', borderRadius: 16, padding: 24
}
const pageTitle = {
  fontFamily: '"Playfair Display", serif', color: '#f5c842', fontSize: 28, margin: '0 0 8px', fontWeight: 700
}
const sectionTitle = { fontFamily: '"Playfair Display", serif', color: '#f5f0e8', fontSize: 18, margin: '0 0 16px' }
const labelStyle = { display: 'block', color: '#c9956a', fontFamily: 'Lato', fontSize: 13, fontWeight: 600 }
const primaryBtn = {
  display: 'inline-block', padding: '14px 28px', background: 'linear-gradient(135deg, #f5c842, #e6a817)', border: 'none',
  borderRadius: 12, color: '#1a0a00', fontFamily: 'Lato', fontWeight: 700, fontSize: 15, cursor: 'pointer'
}
const outlineBtn = {
  padding: '8px 16px', border: '1px solid rgba(245,200,66,0.3)', borderRadius: 10, background: 'transparent',
  color: '#c9956a', fontFamily: 'Lato', fontWeight: 600, fontSize: 13, cursor: 'pointer'
}
const qtyBtn = {
  width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(245,200,66,0.2)', background: 'transparent',
  color: '#9ca3af', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
}
function Row({ label, value, accent, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontFamily: 'Lato' }}>
      <span style={{ color: '#9ca3af', fontSize: 14 }}>{label}</span>
      <span style={{ color: accent ? '#22c55e' : bold ? '#f5c842' : '#f5f0e8', fontWeight: bold ? 700 : 500, fontSize: bold ? 17 : 14 }}>{value}</span>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [shop, setShop] = useState(null)
  const [page, setPage] = useState('catalog')
  const [toasts, setToasts] = useState([])
  const [authLoading, setAuthLoading] = useState(true)

  const addToast = (message, type = 'info') => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      apiJSON('/shops/me').then(setShop).catch(() => setShop(null))
    }
  }, [session])

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null); setShop(null)
  }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#0f0500', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56 }}>🍮</div>
        <p style={{ color: '#f5c842', fontFamily: '"Playfair Display", serif', fontSize: 22, marginTop: 16 }}>Arvee Sweets</p>
      </div>
    </div>
  )

  if (!session) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400;600;700&display=swap'); @keyframes slideIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
      <AuthPage onAuth={setSession} />
      <Toast toasts={toasts} />
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #0f0500; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0f0500; } ::-webkit-scrollbar-thumb { background: #3d1a00; border-radius: 3px; }
      `}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar page={page} setPage={setPage} shop={shop} onLogout={logout} />
        <main style={{ flex: 1, overflowY: 'auto', maxHeight: '100vh' }}>
          {page === 'catalog' && <CatalogPage shop={shop} addToast={addToast} />}
          {page === 'orders' && <OrdersPage addToast={addToast} setPage={setPage} />}
          {page === 'schedule' && <SchedulePage shop={shop} />}
          {page === 'pricing' && <PricingPage shop={shop} />}
          {page === 'profile' && <ProfilePage shop={shop} />}
        </main>
      </div>
      <Toast toasts={toasts} />
    </>
  )
}
