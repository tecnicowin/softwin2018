/**
 * SoftWin eCommerce Logic - Super Robust Save Edition
 */

// 1. UI & Notification System
const Notify = {
    show(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info} ${type === 'success' ? 'text-neon-green' : type === 'error' ? 'text-red-500' : 'text-neon-blue'}"></i>
                           <div class="flex-1 text-sm font-medium">${msg}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
    },
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); }
};

function toggleModal(id, show) {
    const el = document.getElementById(id);
    const ov = document.getElementById('overlay');
    if (!el) return;
    
    if (id === 'cart-sidebar') {
        el.classList.toggle('translate-x-full', !show);
    } else {
        if (show) {
            el.classList.remove('hidden');
            el.classList.add('flex', 'modal-visible');
            el.classList.remove('modal-hidden');
        } else {
            el.classList.add('modal-hidden');
            el.classList.remove('modal-visible');
            setTimeout(() => { if(el.classList.contains('modal-hidden')) el.classList.add('hidden'); }, 300);
        }
    }
    if (ov) ov.classList.toggle('hidden', !show);
}

function closeEverything() {
    ['admin-modal', 'admin-login-modal', 'user-modal', 'order-detail-modal'].forEach(id => toggleModal(id, false));
    toggleModal('cart-sidebar', false);
}

// 2. Global State & DB Service
const DB = {
    async load(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(`softwin_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error loading ${key}`, e);
            return defaultValue;
        }
    },
    async save(key, data) {
        try {
            localStorage.setItem(`softwin_${key}`, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Error saving ${key}`, e);
            Notify.error("Error al guardar en servidor local");
            return false;
        }
    }
};

let products = [];
let cart = [];
let orders = [];
let adminPassword = null;
window.currentCatalog = 'software';
let tempLocalImage = ""; 
let tempCheckoutScreenshot = ""; 
let currentViewOrderId = null;
let isLoading = false;

let paymentSettings = {
    pm1: { titular: 'Antonio Jose Caceres Acosta', banco: '', cedula: '', celular: '' },
    pm2: { titular: 'Antonio Jose Caceres Acosta', banco: '', cedula: '', celular: '' },
    binance: { titular: 'Antonio Jose Caceres Acosta', id: '' },
    paypal: { titular: 'Antonio Jose Caceres Acosta', email: 'tecnicoelectropc2017@gmail.com' },
    airtm: { titular: 'Antonio Jose Caceres Acosta', email: 'tecnicoelectropc2017@gmail.com' },
    intl: { titular: 'Antonio Jose Caceres Acosta', banco: '', cuenta: '', doc: '' }
};

const defaultProducts = [
    { id: '1', type: "software", name: "Windows 11 Professional", category: "OS", price: 149.99, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Windows_11_logo_and_wordmark.svg/1200px-Windows_11_logo_and_wordmark.svg.png", description: "Licencia digital permanente.", isOffer: false },
    { id: '5', type: "streaming", name: "Netflix Premium (4K)", category: "Películas", price: 12.99, image: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg", description: "Acceso total Ultra HD.", isOffer: true }
];

async function handleProductSubmit(e) {
    if (e) e.preventDefault();
    if (isLoading) return;
    
    try {
        isLoading = true;
        const btn = document.getElementById('admin-submit-btn');
        const originalText = btn.textContent;
        btn.textContent = "Guardando...";
        btn.disabled = true;

        const editId = document.getElementById('edit-id').value;
        const name = document.getElementById('admin-name').value;
        const price = parseFloat(document.getElementById('admin-price').value) || 0;
        const type = document.getElementById('admin-type')?.value || window.currentCatalog;
        const category = document.getElementById('admin-category')?.value || 'Varios';
        const image = tempLocalImage || document.getElementById('admin-image')?.value || '';
        const description = document.getElementById('admin-desc')?.value || '';
        const isOffer = document.getElementById('admin-is-offer')?.checked || false;

        if (!name) {
            Notify.error("Por favor ingrese el nombre del producto");
            isLoading = false;
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }

        const productData = {
            id: editId ? editId.toString() : Date.now().toString(),
            type, category, name, price, image, description, isOffer
        };

        if (editId) {
            const index = products.findIndex(p => p.id && p.id.toString() === editId.toString());
            if (index !== -1) products[index] = productData;
            else products.push(productData);
        } else {
            products.push(productData);
        }

        await saveProducts();
        resetAdminForm();
        Notify.success("Producto guardado correctamente");
        
        btn.disabled = false;
        btn.textContent = originalText;
        isLoading = false;
    } catch (error) {
        console.error("Critical error saving product:", error);
        Notify.error("Error al guardar el producto");
        isLoading = false;
    }
}

async function saveProducts() {
    await DB.save('products', products);
    renderProducts();
    renderInventory();
}

function resetAdminForm() {
    const form = document.getElementById('admin-form');
    if (form) form.reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('admin-submit-btn').textContent = "Guardar Producto";
    document.getElementById('cancel-edit').classList.add('hidden');
    tempLocalImage = "";
}

// 4. Initialization & Event Binding
function init() {
    console.log("SoftWin: Robust Initializer Starting...");
    loadAllData();
    attachGlobalListeners();
    updateCartUI();
    window.switchCatalog('software');
    loadPaymentSettingsIntoForm();
}

async function loadAllData() {
    try {
        products = await DB.load('products', [...defaultProducts]);
        cart = await DB.load('cart', []);
        orders = await DB.load('orders', []);
        adminPassword = localStorage.getItem('softwin_admin_password'); // Local security stays local for now
        
        const p = await DB.load('payments', null);
        if (p) {
            Object.keys(paymentSettings).forEach(m => {
                if(p[m]) Object.keys(paymentSettings[m]).forEach(k => { if(p[m][k] !== undefined) paymentSettings[m][k] = p[m][k]; });
            });
        }
    } catch (e) { 
        console.error("Initialization error", e);
        products = [...defaultProducts]; 
    }
}

function attachGlobalListeners() {
    const bind = (id, ev, fn) => { const el = document.getElementById(id); if(el) el[ev] = fn; };
    
    // Core Navigation
    bind('cart-btn', 'onclick', () => toggleModal('cart-sidebar', true));
    bind('close-cart', 'onclick', () => toggleModal('cart-sidebar', false));
    bind('checkout-btn', 'onclick', () => { if(cart.length > 0) toggleModal('user-modal', true); });
    bind('cancel-modal', 'onclick', () => toggleModal('user-modal', false));
    bind('close-admin', 'onclick', () => { toggleModal('admin-modal', false); resetAdminForm(); });
    bind('close-admin-auth', 'onclick', () => toggleModal('admin-login-modal', false));
    bind('overlay', 'onclick', closeEverything);
    
    // Admin Tabs
    bind('tab-inventory', 'onclick', () => switchAdminTab('inventory'));
    bind('tab-payments', 'onclick', () => switchAdminTab('payments'));
    bind('tab-sales', 'onclick', () => switchAdminTab('sales'));
    
    // Form Submissions
    bind('admin-auth-btn', 'onclick', handleAdminAuth);
    bind('admin-form', 'onsubmit', handleProductSubmit);
    bind('user-form', 'onsubmit', handleCheckoutSubmit);
    bind('save-payments-btn', 'onclick', handlePaymentSave);
    bind('update-status-btn', 'onclick', handleStatusUpdate);
    bind('cancel-edit', 'onclick', resetAdminForm);
    
    // File Handlers
    bind('excel-input', 'onchange', handleExcelImport);
    bind('admin-image-file', 'onchange', (e) => handleImageFile(e, 'tempLocalImage'));
    bind('checkout-screenshot', 'onchange', (e) => handleImageFile(e, 'tempCheckoutScreenshot', 'screenshot-name'));
}

// 5. Store Logic & Rendering
window.switchCatalog = (type) => {
    window.currentCatalog = type;
    document.querySelectorAll('.nav-link').forEach(l => {
        const is = l.textContent.toLowerCase().includes(type);
        if (is) {
            l.className = 'nav-link text-neon-blue font-bold border-b-2 border-neon-blue pb-1 cursor-pointer';
        } else {
            l.className = 'nav-link text-gray-400 hover:text-neon-blue transition-all pb-1 cursor-pointer';
        }
    });
    const t = document.getElementById('catalog-title');
    if(t) {
        if(type === 'software') t.innerHTML = `Software <span class="text-neon-blue">Destacado</span>`;
        else if(type === 'streaming') t.innerHTML = `Streaming <span class="text-neon-blue">Digital</span>`;
        else if(type === 'ofertas') t.innerHTML = `Ofertas <span class="text-neon-blue">Especiales</span>`;
    }
    renderFilters();
    renderProducts();
    setupPaymentSwitching();
};

function renderProducts(f = null) {
    const grid = document.getElementById('products-grid'); if(!grid) return;
    let its = f || (window.currentCatalog === 'ofertas' ? products.filter(p => p.isOffer) : products.filter(p => p.type === window.currentCatalog));
    grid.innerHTML = its.length === 0 ? '<div class="col-span-full py-20 text-center text-gray-500 italic">No hay productos</div>' : '';
    its.forEach(p => {
        const div = document.createElement('div'); div.className = 'glass-card rounded-2xl p-5 flex flex-col group animate-fade-in relative';
        const badge = p.isOffer ? `<div class="absolute top-4 right-4 bg-neon-blue text-dark text-[9px] font-black px-2 py-1 rounded shadow-neon-blue z-10 animate-pulse">PROMO</div>` : '';
        div.innerHTML = `${badge}<div class="h-48 rounded-xl bg-dark flex items-center justify-center mb-6 p-8"><img src="${p.image}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform"></div><div class="mb-4"><span class="text-[10px] uppercase text-neon-blue font-bold px-2 py-1 bg-neon-blue/10 rounded">${p.category}</span></div><h3 class="text-xl font-bold mb-2 group-hover:text-neon-blue transition-colors">${p.name}</h3><p class="text-gray-500 text-sm mb-6 flex-1">${p.description||""}</p><div class="flex items-center justify-between mt-auto"><span class="text-2xl font-black">$${parseFloat(p.price).toFixed(2)}</span><button onclick="addToCart('${p.id}')" class="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-neon-blue hover:text-dark transition-all"><i class="fas fa-plus"></i></button></div>`;
        grid.appendChild(div);
    });
}

function renderInventory() {
    const list = document.getElementById('admin-inventory-list'); if(!list) return;
    list.innerHTML = products.map(p => `
        <tr class="hover:bg-white/5 border-b border-white/5 transition-colors">
            <td class="p-4"><img src="${p.image}" class="w-10 h-10 object-contain bg-dark rounded p-1"></td>
            <td class="p-4 font-bold text-sm">${p.name}<div class="text-[9px] text-gray-500 uppercase">${p.type} | ${p.category} ${p.isOffer?'| PROMO':''}</div></td>
            <td class="p-4 text-neon-blue font-bold">$${parseFloat(p.price).toFixed(2)}</td>
            <td class="p-4 text-right">
                <button onclick="editProduct('${p.id}')" class="p-2 text-gray-400 hover:text-neon-blue transition-colors"><i class="fas fa-edit"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// 6. Admin Actions
window.requestAdminAccess = () => { toggleModal('admin-login-modal', true); const inp = document.getElementById('admin-pass-input'); if(inp) inp.focus(); };

function handleAdminAuth() {
    const v = document.getElementById('admin-pass-input').value; if(!v) return;
    // Simple obfuscated comparison for local security
    const _check = (s) => btoa(s); 
    if(!adminPassword) { 
        adminPassword = _check(v); 
        localStorage.setItem('softwin-admin-password', adminPassword); 
        openAdminPanel(); 
        Notify.success("Nueva clave establecida");
    }
    else if(_check(v) === adminPassword) { 
        openAdminPanel(); 
        Notify.info("Acceso concedido");
    } else { 
        Notify.error("Clave Incorrecta"); 
    }
}

function openAdminPanel() { toggleModal('admin-login-modal', false); toggleModal('admin-modal', true); switchAdminTab('inventory'); }

window.editProduct = (id) => {
    const p = products.find(x => x.id && x.id.toString() === id.toString());
    if(!p) return;
    document.getElementById('edit-id').value = p.id;
    if(document.getElementById('admin-type')) document.getElementById('admin-type').value = p.type;
    updateAdminCategories();
    if(document.getElementById('admin-category')) document.getElementById('admin-category').value = p.category;
    document.getElementById('admin-name').value = p.name;
    document.getElementById('admin-price').value = p.price;
    document.getElementById('admin-image').value = p.image;
    document.getElementById('admin-desc').value = p.description || "";
    if(document.getElementById('admin-is-offer')) document.getElementById('admin-is-offer').checked = p.isOffer || false;
    document.getElementById('admin-submit-btn').textContent = "Actualizar Producto";
    document.getElementById('cancel-edit').classList.remove('hidden');
    const container = document.getElementById('admin-modal').querySelector('.overflow-y-auto');
    if(container) container.scrollTo({top: 0, behavior: 'smooth'});
};

window.deleteProduct = (id) => {
    if(confirm("¿Seguro que deseas eliminar este producto?")) {
        products = products.filter(p => p.id && p.id.toString() !== id.toString());
        saveProducts();
    }
};

// 7. Payment & Sales
function handlePaymentSave() {
    const ms = ['pm1', 'pm2', 'binance', 'paypal', 'airtm', 'intl'];
    ms.forEach(m => {
        Object.keys(paymentSettings[m]).forEach(k => {
            const el = document.getElementById(`pay-${m}-${k}`);
            if(el) paymentSettings[m][k] = el.value;
        });
    });
    localStorage.setItem('softwin-payments', JSON.stringify(paymentSettings));
    alert("✅ Formas de pago guardadas");
}

function handleStatusUpdate() {
    if(!currentViewOrderId) return;
    const ns = document.getElementById('update-status-select').value;
    const i = orders.findIndex(o => o.id.toString() === currentViewOrderId.toString());
    if(i !== -1) { 
        orders[i].status = ns; 
        localStorage.setItem('softwin-orders', JSON.stringify(orders)); 
        renderSales(); 
        Notify.success("Estado actualizado"); 
    }
}

window.clearImageCache = () => {
    if(confirm("¿Deseas limpiar el caché de imágenes? Esto liberará espacio pero las imágenes locales pesadas podrían dejar de verse.")) {
        products = products.map(p => ({ ...p, image: p.image.startsWith('data:') ? '' : p.image }));
        saveProducts();
        Notify.info("Caché de imágenes optimizado");
    }
};

window.exportData = () => {
    const data = { products, paymentSettings, orders, version: '1.0.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SoftWin_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    Notify.success("Respaldo descargado");
};

function renderSales() {
    const list = document.getElementById('admin-sales-list'); if(!list) return;
    list.innerHTML = orders.sort((a,b)=>b.timestamp-a.timestamp).map(o => `<tr class="hover:bg-white/5 border-b border-white/5 cursor-pointer" onclick="showOrderDetail('${o.id}')"><td class="p-4 text-xs font-mono">#${o.id}</td><td class="p-4 text-sm font-bold">${o.customer.name}</td><td class="p-4 font-bold text-neon-blue">$${o.total.toFixed(2)}</td><td class="p-4 text-[10px] uppercase font-black tracking-widest">${o.status}</td></tr>`).join('');
}

window.showOrderDetail = (id) => {
    const o = orders.find(x => x.id.toString() === id.toString()); if(!o) return;
    currentViewOrderId = id;
    document.getElementById('detail-order-id').textContent = '#'+o.id;
    document.getElementById('update-status-select').value = o.status || 'Por Pagar';
    let iH = o.items.map(i => `<div class="flex justify-between text-xs py-1 border-b border-white/5"><span>${i.quantity}x ${i.name}</span><span>$${(i.price*i.quantity).toFixed(2)}</span></div>`).join('');
    document.getElementById('order-detail-content').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-8"><div class="space-y-4"><div class="bg-white/5 p-4 rounded-2xl border border-white/5"><h4 class="text-[10px] uppercase text-gray-500 font-bold mb-2">Cliente</h4><p class="text-sm">${o.customer.name} - ${o.customer.phone}</p></div><div class="bg-white/5 p-4 rounded-2xl border border-white/5"><h4 class="text-[10px] uppercase text-gray-500 font-bold mb-2">Pago: ${o.paymentMethod}</h4><div class="text-neon-blue font-bold text-lg mb-1">Total: $${o.total.toFixed(2)}</div><div class="text-[10px] uppercase font-black text-gray-500">${o.status}</div></div><div class="bg-white/5 p-4 rounded-2xl border border-white/5"><h4 class="text-[10px] uppercase text-gray-500 font-bold mb-2">Productos</h4>${iH}</div></div><div class="space-y-2"><h4 class="text-[10px] uppercase text-gray-500 font-bold">Comprobante</h4>${o.screenshot ? `<img src="${o.screenshot}" class="w-full rounded-2xl border border-white/10" onclick="window.open(this.src)">` : '<div class="text-xs text-gray-500 italic">Sin captura</div>'}</div></div>`;
    toggleModal('order-detail-modal', true);
};

// 8. Support Logic
window.addToCart = (id) => { const p = products.find(x => x.id && x.id.toString() === id.toString()); if(!p) return; const exists = cart.find(x => x.id && x.id.toString() === id.toString()); if(exists) exists.quantity++; else cart.push({...p, quantity: 1}); saveCart(); updateCartUI(); toggleModal('cart-sidebar', true); };
window.updateQuantity = (id, d) => { const i = cart.find(x => x.id && x.id.toString() === id.toString()); if(i) { i.quantity += d; if(i.quantity <= 0) cart = cart.filter(x => x.id && x.id.toString() !== id.toString()); saveCart(); updateCartUI(); } };
function updateCartUI() {
    const count = document.getElementById('cart-count'); if(count) count.textContent = cart.reduce((a,b)=>a+b.quantity,0);
    const container = document.getElementById('cart-items'); if(!container) return;
    container.innerHTML = cart.length === 0 ? '<div class="text-center py-10 text-gray-500">Vacío</div>' : cart.map(i => `<div class="flex gap-4 bg-white/5 p-4 rounded-xl border border-white/5"><img src="${i.image}" class="w-10 h-10 object-contain"><div class="flex-1"><h4 class="text-xs font-bold">${i.name}</h4><div class="flex items-center gap-3 mt-1"><button onclick="updateQuantity('${i.id}', -1)">-</button><span>${i.quantity}</span><button onclick="updateQuantity('${i.id}', 1)">+</button></div></div><div class="text-right text-neon-blue font-bold text-xs">$${(i.price*i.quantity).toFixed(2)}</div></div>`).join('');
    const total = document.getElementById('cart-total'); if(total) total.textContent = `$${cart.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2)}`;
}

function switchAdminTab(view) {
    const tabs = { inventory: 'tab-inventory', payments: 'tab-payments', sales: 'tab-sales' };
    const views = { inventory: 'view-inventory', payments: 'view-payments', sales: 'view-sales' };
    Object.keys(tabs).forEach(k => {
        const btn = document.getElementById(tabs[k]); const v = document.getElementById(views[k]);
        if(btn) btn.className = (k === view) ? 'pb-2 border-b-2 border-neon-blue text-neon-blue font-bold transition-all cursor-pointer' : 'pb-2 border-b-2 border-transparent text-gray-500 transition-all cursor-pointer';
        if(v) v.classList.toggle('hidden', k !== view);
    });
    if(view === 'inventory') renderInventory(); if(view === 'sales') renderSales();
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    if (isLoading) return;

    const customer = { name: document.getElementById('user-name').value, phone: document.getElementById('user-phone').value };
    if (customer.phone.length < 8) {
        Notify.error("Número de WhatsApp inválido");
        return;
    }

    try {
        isLoading = true;
        const oid = Math.floor(Math.random()*90000)+10000;
        const pay = document.querySelector('input[name="payment"]:checked').value;
        const total = cart.reduce((a,b)=>a+(b.price*b.quantity),0);
        const order = { id: oid.toString(), timestamp: Date.now(), customer, paymentMethod: pay, items: [...cart], total, screenshot: tempCheckoutScreenshot, status: tempCheckoutScreenshot?'Pago Reportado':'Por Pagar' };
        
        orders.push(order); 
        await DB.save('orders', orders);
        
        window.open(`https://wa.me/51900000000?text=${encodeURIComponent(`🚀 *SoftWin - Nueva Orden*\n\n📦 *Orden:* #${oid}\n👤 *Cliente:* ${customer.name}\n📱 *WhatsApp:* ${customer.phone}\n💳 *Pago:* ${pay}\n💰 *Total:* $${total.toFixed(2)}\n\n_El comprobante ha sido adjuntado en la plataforma._`)}`, '_blank');
        
        cart = []; 
        await saveCart(); 
        updateCartUI(); 
        closeEverything(); 
        Notify.success(`¡Orden #${oid} enviada con éxito!`);
        isLoading = false;
    } catch (error) {
        Notify.error("Error al procesar el pedido");
        isLoading = false;
    }
}

function handleExcelImport(e) {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
        try {
            const d = new Uint8Array(ev.target.result); const wb = XLSX.read(d, {type:'array'});
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            const newP = json.map(row => {
                const fv = (ks) => { const fk = Object.keys(row).find(k => ks.some(key => k.toLowerCase().trim() === key.toLowerCase())); return fk ? row[fk] : ''; };
                return { id: (Date.now() + Math.random()).toString(), type: window.currentCatalog, name: fv(['Nombre', 'Name', 'Producto']) || 'Sin Nombre', category: fv(['Categoria', 'Category']) || 'Varios', price: parseFloat(String(fv(['Precio', 'Price', 'Costo'])).replace(/[^0-9.]/g, '')) || 0, image: fv(['Imagen', 'Image', 'URL']), description: fv(['Descripcion', 'Description']), isOffer: false };
            });
            products = [...products, ...newP.filter(p=>p.name!=='Sin Nombre')]; 
            saveProducts(); 
            Notify.success("Excel procesado con éxito");
        } catch(err) { Notify.error("Error al leer Excel"); }
    };
    r.readAsArrayBuffer(f);
}

function handleImageFile(e, target, nameId) {
    const f = e.target.files[0];
    if(f) {
        const r = new FileReader();
        r.onload = (ev) => {
            if(target==='tempLocalImage') tempLocalImage = ev.target.result;
            else tempCheckoutScreenshot = ev.target.result;
            if(nameId) document.getElementById(nameId).textContent = "✅ " + f.name;
        };
        r.readAsDataURL(f);
    }
}

function setupPaymentSwitching() {
    const opts = document.querySelectorAll('input[name="payment"]');
    opts.forEach(o => o.addEventListener('change', () => {
        const det = document.getElementById('selected-payment-details'); const inf = document.getElementById('pay-info-container'); const tit = document.getElementById('pay-title');
        if(det) det.classList.remove('hidden'); if(tit) tit.textContent = o.value;
        let m = '';
        if(o.value === 'Pago Movil 1') m = 'pm1'; else if(o.value === 'Pago Movil 2') m = 'pm2'; else if(o.value === 'Binance') m = 'binance'; else if(o.value === 'PayPal') m = 'paypal'; else if(o.value === 'Airtm') m = 'airtm'; else if(o.value === 'Internacional') m = 'intl';
        if(m && paymentSettings[m]) {
            let h = `<p class="text-xs font-bold text-neon-blue">Titular: ${paymentSettings[m].titular}</p>`;
            Object.keys(paymentSettings[m]).forEach(k => { if(k !== 'titular' && paymentSettings[m][k]) h += `<p class="text-xs text-gray-400 capitalize">${k === 'id' ? 'ID' : k === 'doc' ? 'Documento/SWIFT' : k}: ${paymentSettings[m][k]}</p>`; });
            if(inf) inf.innerHTML = h;
        }
    }));
}

function renderFilters() {
    const container = document.getElementById('filter-buttons'); if(!container) return;
    if(window.currentCatalog === 'ofertas') { container.innerHTML = ''; return; }
    const filters = window.currentCatalog === 'software' ? [{id:'all',l:'Todos'},{id:'SO',l:'S.O.'},{id:'Diseno',l:'Diseño'},{id:'Prog',l:'Programación'},{id:'Anti',l:'Antivirus'}] : [{id:'all',l:'Todos'},{id:'Movie',l:'Películas'},{id:'Combo',l:'Combos'},{id:'Music',l:'Música'},{id:'TV',l:'TV'}];
    container.innerHTML = filters.map(f => `<button onclick="applyFilter(this)" data-filter="${f.id}" class="filter-btn px-4 py-2 ${f.id==='all'?'bg-neon-blue text-dark font-bold':'text-gray-400 hover:bg-white/5'} rounded-lg text-sm transition-all">${f.l}</button>`).join('');
}

async function saveCart() { await DB.save('cart', cart); }
function loadPaymentSettingsIntoForm() { const ms = ['pm1', 'pm2', 'binance', 'paypal', 'airtm', 'intl']; ms.forEach(m => { if(paymentSettings[m]) Object.keys(paymentSettings[m]).forEach(k => { const el = document.getElementById(`pay-${m}-${k}`); if(el) el.value = paymentSettings[m][k]; }); }); }
window.updateAdminCategories = () => { const tSelect = document.getElementById('admin-type'); if(!tSelect) return; const t = tSelect.value; const cats = t === 'software' ? ['OS', 'Database', 'Diseño', 'Programación', 'Antivirus'] : ['Películas', 'Combos', 'Música', 'TV', 'Juegos']; const sel = document.getElementById('admin-category'); if(sel) sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join(''); };

// Start
document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'complete' || document.readyState === 'interactive') { init(); }
