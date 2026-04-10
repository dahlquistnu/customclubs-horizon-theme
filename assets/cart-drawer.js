/* ============================================================
   Cart Drawer — Custom Clubs Horizon Theme
   AJAX add-to-cart + slide-in drawer
   ============================================================ */

class CartDrawer {
  constructor() {
    this.drawer = null;
    this.overlay = null;
    this.init();
  }

  init() {
    this.buildDrawer();
    this.bindEvents();
  }

  buildDrawer() {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'cart-drawer-overlay';
    this.overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;opacity:0;visibility:hidden;transition:opacity 0.3s,visibility 0.3s;';
    this.overlay.setAttribute('aria-hidden', 'true');

    // Drawer panel
    this.drawer = document.createElement('div');
    this.drawer.id = 'cart-drawer';
    this.drawer.setAttribute('role', 'dialog');
    this.drawer.setAttribute('aria-label', 'Kundvagn');
    this.drawer.setAttribute('aria-modal', 'true');
    this.drawer.style.cssText = 'position:fixed;top:0;right:0;height:100%;width:min(420px,100vw);background:#fff;z-index:1000;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,0.15);';

    this.drawer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #e2e2e2;background:#001914;">
        <h2 style="font-size:18px;font-weight:500;color:#fff;margin:0;">Kundvagn <span id="cart-drawer-count" style="font-size:14px;color:#00E697;"></span></h2>
        <button id="cart-drawer-close" aria-label="Stäng kundvagn" style="width:36px;height:36px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;line-height:1;">&times;</button>
      </div>
      <div id="cart-drawer-items" style="flex:1;overflow-y:auto;padding:16px 24px;"></div>
      <div id="cart-drawer-footer" style="padding:20px 24px;border-top:1px solid #e2e2e2;background:#f9f9f9;"></div>
    `;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.drawer);

    document.getElementById('cart-drawer-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());
  }

  bindEvents() {
    // Intercept all add-to-cart forms
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-type="add-to-cart-form"], #product-form');
      if (!form) return;
      e.preventDefault();
      this.addToCart(form);
    });

    // Cart icon opens drawer
    const cartIcon = document.getElementById('cart-icon-bubble');
    if (cartIcon) {
      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
        this.refresh();
      });
    }
  }

  async addToCart(form) {
    const btn = form.querySelector('[type="submit"]');
    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Lägger till...'; }

    try {
      const data = new FormData(form);
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: data,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!response.ok) throw new Error('Add to cart failed');

      await this.refresh();
      this.open();
      this.updateHeaderCount();
    } catch (err) {
      console.error('Cart error:', err);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  }

  async refresh() {
    const items = document.getElementById('cart-drawer-items');
    const footer = document.getElementById('cart-drawer-footer');
    const countEl = document.getElementById('cart-drawer-count');
    if (!items || !footer) return;

    items.innerHTML = '<p style="color:#999;padding:20px 0;text-align:center;font-size:14px;">Laddar...</p>';

    const res = await fetch('/cart.js');
    const cart = await res.json();

    if (countEl) countEl.textContent = cart.item_count > 0 ? `(${cart.item_count})` : '';

    if (cart.item_count === 0) {
      items.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <p style="font-size:16px;color:#666;margin:0 0 20px;">Din kundvagn är tom</p>
          <a href="/" onclick="cartDrawer.close()" style="display:inline-flex;align-items:center;height:44px;padding:0 24px;border-radius:70px;background:#00352B;color:#00E697;text-decoration:none;font-size:14px;">Fortsätt handla</a>
        </div>`;
      footer.innerHTML = '';
      return;
    }

    items.innerHTML = cart.items.map((item, i) => `
      <div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #f0f0f0;align-items:flex-start;">
        <a href="${item.url}" style="flex-shrink:0;width:72px;height:72px;border-radius:8px;overflow:hidden;background:#f7f7f7;display:block;">
          ${item.image ? `<img src="${item.image}" alt="${this.escape(item.title)}" width="72" height="72" loading="lazy" style="width:100%;height:100%;object-fit:contain;">` : ''}
        </a>
        <div style="flex:1;min-width:0;">
          <a href="${item.url}" style="font-size:14px;color:#222;text-decoration:none;line-height:1.3;display:block;">${this.escape(item.product_title)}</a>
          ${item.variant_title && item.variant_title !== 'Default Title' ? `<p style="font-size:12px;color:#999;margin:3px 0 0;">${this.escape(item.variant_title)}</p>` : ''}
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <div style="display:flex;align-items:center;border:1px solid #e2e2e2;border-radius:20px;overflow:hidden;">
              <button onclick="cartDrawer.updateQty(${i + 1}, ${item.quantity - 1})" style="width:30px;height:30px;background:transparent;border:none;cursor:pointer;font-size:14px;color:#444;">−</button>
              <span style="min-width:24px;text-align:center;font-size:13px;color:#222;">${item.quantity}</span>
              <button onclick="cartDrawer.updateQty(${i + 1}, ${item.quantity + 1})" style="width:30px;height:30px;background:transparent;border:none;cursor:pointer;font-size:14px;color:#444;">+</button>
            </div>
            <span style="font-size:14px;color:#222;font-weight:500;">${this.formatMoney(item.line_price)}</span>
          </div>
        </div>
        <button onclick="cartDrawer.updateQty(${i + 1}, 0)" style="background:none;border:none;color:#ccc;font-size:18px;cursor:pointer;padding:0;line-height:1;" aria-label="Ta bort">&times;</button>
      </div>
    `).join('');

    const total = this.formatMoney(cart.total_price);
    footer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="font-size:15px;font-weight:500;color:#222;">Delsumma</span>
        <span style="font-size:18px;font-weight:500;color:#222;">${total}</span>
      </div>
      <a href="/checkout" style="display:block;width:100%;height:52px;border-radius:70px;background:#00352B;color:#00E697;text-decoration:none;font-size:15px;font-weight:500;text-align:center;line-height:52px;transition:background 0.2s;" onmouseover="this.style.background='#00483a'" onmouseout="this.style.background='#00352B'">Till kassan</a>
      <a href="/cart" style="display:block;text-align:center;font-size:13px;color:#999;margin-top:10px;text-decoration:underline;">Visa kundvagn</a>
    `;
  }

  async updateQty(line, quantity) {
    await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line, quantity })
    });
    await this.refresh();
    this.updateHeaderCount();
  }

  async updateHeaderCount() {
    const res = await fetch('/cart.js');
    const cart = await res.json();
    const bubble = document.querySelector('.cart-count-bubble');
    const icon = document.getElementById('cart-icon-bubble');
    if (cart.item_count > 0) {
      if (bubble) { bubble.textContent = cart.item_count; bubble.style.display = 'flex'; }
      else if (icon) {
        const span = document.createElement('span');
        span.className = 'cart-count-bubble';
        span.textContent = cart.item_count;
        span.style.cssText = 'position:absolute;top:-2px;right:-2px;width:20px;height:20px;background:#00E697;color:#001914;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;';
        icon.appendChild(span);
      }
    } else if (bubble) {
      bubble.style.display = 'none';
    }
  }

  open() {
    this.drawer.style.transform = 'translateX(0)';
    this.overlay.style.opacity = '1';
    this.overlay.style.visibility = 'visible';
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) closeBtn.focus();
  }

  close() {
    this.drawer.style.transform = 'translateX(100%)';
    this.overlay.style.opacity = '0';
    this.overlay.style.visibility = 'hidden';
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  formatMoney(cents) {
    return (cents / 100).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' });
  }

  escape(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { window.cartDrawer = new CartDrawer(); });
} else {
  window.cartDrawer = new CartDrawer();
}
