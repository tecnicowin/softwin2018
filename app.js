/**
 * SoftWin eCommerce - Firebase Production Edition
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDwHAVDMBTK-5MiEZbVZfHJdCFILFC9PY",
  authDomain: "softwin-c1805.firebaseapp.com",
  projectId: "softwin-c1805",
  storageBucket: "softwin-c1805.firebasestorage.app",
  messagingSenderId: "931713874982",
  appId: "1:931713874982:web:ffb24fc1c9afd3a5183ae7",
  measurementId: "G-RL29F9W1QJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// 2. UI & Notification System
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
            el.classList.remove('modal-visible', 'flex');
            setTimeout(() => { 
                if(el.classList.contains('modal-hidden')) {
                    el.classList.add('hidden');
                }
            }, 300);
        }
    }
    if (ov) ov.classList.toggle('hidden', !show);

    if (id === 'user-modal' && show) {
        document.getElementById('checkout-form-container')?.classList.remove('hidden');
        document.getElementById('checkout-success-container')?.classList.add('hidden');
        const submitBtn = document.getElementById('checkout-submit-btn');
        if(submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Confirmar Pedido"; }
    }
}

function closeEverything() {
    ['admin-modal', 'admin-login-modal', 'user-modal', 'order-detail-modal'].forEach(id => toggleModal(id, false));
    toggleModal('cart-sidebar', false);
}

// 3. Database Layer (Firestore)
const DB = {
    async load(col, defaultValue = []) {
        try {
            const q = query(collection(db, col));
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            return data.length > 0 ? data : defaultValue;
        } catch (e) {
            console.error(`Error loading ${col}`, e);
            return defaultValue;
        }
    },
    async save(col, id, data) {
        try {
            await setDoc(doc(db, col, id), data);
            return true;
        } catch (e) {
            console.error(`Error saving ${col}`, e);
            Notify.error("Error al sincronizar con el servidor");
            return false;
        }
    },
    async delete(col, id) {
        try {
            await deleteDoc(doc(db, col, id));
            return true;
        } catch (e) {
            console.error(`Error deleting ${col}`, e);
            return false;
        }
    },
    async uploadImage(path, base64) {
        if (!base64 || !base64.startsWith('data:')) return base64;
        try {
            const storageRef = ref(storage, path);
            await uploadString(storageRef, base64, 'data_url');
            return await getDownloadURL(storageRef);
        } catch (e) {
            console.error("Error uploading image", e);
            return base64;
        }
    }
};

// 4. Global State
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



// 5. Logic
async function handleProductSubmit(e) {
    if (e) e.preventDefault();
    if (isLoading) return;
    
    try {
        isLoading = true;
        const btn = document.getElementById('admin-submit-btn');
        const originalText = btn.textContent;
        btn.textContent = "Sincronizando...";
        btn.disabled = true;

        const editId = document.getElementById('edit-id').value;
        const name = document.getElementById('admin-name').value;
        const price = parseFloat(document.getElementById('admin-price').value) || 0;
        const type = document.getElementById('admin-type')?.value || window.currentCatalog;
        const category = document.getElementById('admin-category')?.value || 'Varios';
        const imageInput = document.getElementById('admin-image')?.value || '';
        const description = document.getElementById('admin-desc')?.value || '';
        const isOffer = document.getElementById('admin-is-offer')?.checked || false;

        if (!name) {
            Notify.error("Por favor ingrese el nombre del producto");
            isLoading = false; btn.disabled = false; btn.textContent = originalText;
            return;
        }

        const id = editId || Date.now().toString();
        
        // Upload image to Storage if it's new/local
        let finalImageUrl = imageInput;
        if (tempLocalImage) {
            finalImageUrl = await DB.uploadImage(`products/${id}`, tempLocalImage);
        }

        const productData = { type, category, name, price, image: finalImageUrl, description, isOffer };
        await DB.save('products', id, productData);
        
        await loadAllData();
        renderProducts();
        renderInventory();
        resetAdminForm();
        
        Notify.success("Producto sincronizado con el servidor");
        btn.disabled = false; btn.textContent = originalText; isLoading = false;
    } catch (error) {
        console.error("Critical error saving product:", error);
        Notify.error("Error al guardar en el servidor");
        isLoading = false;
    }
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    if (isLoading) return;

    const submitBtn = document.getElementById('checkout-submit-btn');
    const customer = { name: document.getElementById('user-name').value, phone: document.getElementById('user-phone').value };
    
    if (customer.phone.length < 8) {
        Notify.error("Número de WhatsApp inválido");
        return;
    }

    try {
        isLoading = true;
        if(submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Procesando..."; }
        
        const oid = Math.floor(Math.random()*90000)+10000;
        const pay = document.querySelector('input[name="payment"]:checked').value;
        const total = cart.reduce((a,b)=>a+(b.price*b.quantity),0);
        
        let screenshotUrl = "";
        if (tempCheckoutScreenshot) {
            Notify.info("Subiendo comprobante...");
            screenshotUrl = await DB.uploadImage(`orders/${oid}`, tempCheckoutScreenshot);
        }

        const order = { 
            id: oid.toString(), 
            timestamp: Date.now(), 
            customer, 
            paymentMethod: pay, 
            items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })), 
            total, 
            screenshot: screenshotUrl, 
            status: screenshotUrl ? 'Pago Reportado' : 'Por Pagar' 
        };
        
        await DB.save('orders', oid.toString(), order);
        
        const waText = encodeURIComponent(`🚀 *SoftWin - Nueva Orden*\n\n📦 *Orden:* #${oid}\n👤 *Cliente:* ${customer.name}\n📱 *WhatsApp:* ${customer.phone}\n💳 *Pago:* ${pay}\n💰 *Total:* $${total.toFixed(2)}\n\n_El comprobante ha sido sincronizado en el sistema._`);
        const waLink = `https://wa.me/584242948338?text=${waText}`;
        
        // UI Success state
        document.getElementById('checkout-form-container').classList.add('hidden');
        document.getElementById('checkout-success-container').classList.remove('hidden');
        document.getElementById('success-order-id').textContent = `#${oid}`;
        document.getElementById('success-wa-link').href = waLink;

        // Try automatic open (might be blocked)
        window.open(waLink, '_blank');
        
        cart = []; 
        localStorage.removeItem('softwin_cart');
        updateCartUI(); 
        Notify.success(`¡Orden #${oid} enviada!`);
        isLoading = false;
    } catch (error) {
        console.error(error);
        Notify.error("Error al procesar el pedido");
        if(submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Confirmar Pedido"; }
        isLoading = false;
    }
}

// 6. UI Rendering & Helpers
window.switchCatalog = (type) => {
    window.currentCatalog = type;
    document.querySelectorAll('.nav-link').forEach(l => {
        const is = l.textContent.toLowerCase().includes(type);
        l.className = is ? 'nav-link text-neon-blue font-bold border-b-2 border-neon-blue pb-1 cursor-pointer' : 'nav-link text-gray-400 hover:text-neon-blue transition-all pb-1 cursor-pointer';
    });
    const t = document.getElementById('catalog-title');
    if(t) {
        if(type === 'software') t.innerHTML = `Software <span class="text-neon-blue">Destacado</span>`;
        else if(type === 'streaming') t.innerHTML = `Streaming <span class="text-neon-blue">Digital</span>`;
        else if(type === 'ofertas') t.innerHTML = `Ofertas <span class="text-neon-blue">Especiales</span>`;
    }
    renderFilters();
    renderProducts();
};

function renderProducts(f = null) {
    const grid = document.getElementById('products-grid'); if(!grid) return;
    let its = f || (window.currentCatalog === 'ofertas' ? products.filter(p => p.isOffer) : products.filter(p => p.type === window.currentCatalog));
    grid.innerHTML = its.length === 0 ? '<div class="col-span-full py-20 text-center text-gray-500 italic">No hay productos en esta sección</div>' : '';
    its.forEach(p => {
        const div = document.createElement('div'); 
        div.className = 'glass-card rounded-2xl p-5 flex flex-col group animate-fade-in relative';
        const badge = p.isOffer ? `<div class="absolute top-4 right-4 bg-neon-blue text-dark text-[9px] font-black px-2 py-1 rounded shadow-neon-blue z-10 animate-pulse">PROMO</div>` : '';
        const price = parseFloat(p.price) || 0;
        
        div.innerHTML = `
            ${badge}
            <div class="h-48 rounded-xl bg-dark flex items-center justify-center mb-6 p-8 overflow-hidden">
                <img src="${p.image}" class="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform" onerror="this.src='https://via.placeholder.com/200?text=Error+Imagen'">
            </div>
            <div class="mb-4">
                <span class="text-[10px] uppercase text-neon-blue font-bold px-2 py-1 bg-neon-blue/10 rounded">${p.category || 'General'}</span>
            </div>
            <h3 class="text-xl font-bold mb-2 group-hover:text-neon-blue transition-colors">${p.name}</h3>
            <p class="text-gray-500 text-sm mb-6 flex-1">${p.description || ""}</p>
            <div class="flex items-center justify-between mt-auto">
                <span class="text-2xl font-black">$${price.toFixed(2)}</span>
                <button class="add-to-cart-btn w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-neon-blue hover:text-dark transition-all" data-id="${p.id}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>`;
        
        grid.appendChild(div);
        div.querySelector('.add-to-cart-btn').onclick = () => window.addToCart(p.id);
    });
}

function renderInventory() {
    const list = document.getElementById('admin-inventory-list'); if(!list) return;
    list.innerHTML = products.map(p => `
        <tr class="hover:bg-white/5 border-b border-white/5 transition-colors">
            <td class="p-4"><input type="checkbox" class="product-select accent-neon-blue" data-id="${p.id}"></td>
            <td class="p-4"><img src="${p.image}" class="w-10 h-10 object-contain bg-dark rounded p-1" onerror="this.src='https://via.placeholder.com/50?text=Error'"></td>
            <td class="p-4 font-bold text-sm">${p.name}<div class="text-[9px] text-gray-500 uppercase">${p.type} | ${p.category} ${p.isOffer?'| PROMO':''}</div></td>
            <td class="p-4 text-neon-blue font-bold">$${(parseFloat(p.price) || 0).toFixed(2)}</td>
            <td class="p-4 text-right">
                <div class="flex justify-end gap-2">
                    <button id="edit-${p.id}" class="p-2 text-gray-400 hover:text-neon-blue transition-colors" title="Editar"><i class="fas fa-edit"></i></button>
                    <button id="del-${p.id}" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    
    products.forEach(p => {
        const editBtn = document.getElementById(`edit-${p.id}`);
        const delBtn = document.getElementById(`del-${p.id}`);
        if(editBtn) editBtn.onclick = () => window.editProduct(p.id);
        if(delBtn) delBtn.onclick = () => window.deleteProduct(p.id);
    });

    // Selection listeners
    const checkboxes = document.querySelectorAll('.product-select');
    checkboxes.forEach(cb => {
        cb.onchange = updateBulkActionsUI;
    });

    const selectAll = document.getElementById('select-all-inventory');
    if(selectAll) {
        selectAll.checked = false;
        selectAll.onchange = (e) => {
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateBulkActionsUI();
        };
    }
    updateBulkActionsUI();
}

function updateBulkActionsUI() {
    const selected = document.querySelectorAll('.product-select:checked');
    const bar = document.getElementById('bulk-actions');
    const count = document.getElementById('selected-count');
    if(!bar || !count) return;

    if(selected.length > 0) {
        bar.classList.remove('hidden');
        count.textContent = `${selected.length} productos seleccionados`;
    } else {
        bar.classList.add('hidden');
    }
}

window.bulkDelete = async () => {
    const selected = Array.from(document.querySelectorAll('.product-select:checked')).map(cb => cb.getAttribute('data-id'));
    if(selected.length === 0) return;

    if(confirm(`¿Estás seguro de que deseas eliminar permanentemente estos ${selected.length} productos del servidor?`)) {
        Notify.info("Eliminando productos...");
        for(const id of selected) {
            await DB.delete('products', id);
        }
        await loadAllData();
        renderInventory();
        renderProducts();
        Notify.success("Eliminación masiva completada");
    }
};

// 7. Lifecycle
async function init() {
    Notify.info("Iniciando conexión segura...");
    await loadAllData();
    attachGlobalListeners();
    updateCartUI();
    window.switchCatalog('software');
    loadPaymentSettingsIntoForm();
    setupPaymentSwitching();
}

async function loadAllData() {
    products = await DB.load('products', []);
    orders = await DB.load('orders', []);
    const savedCart = localStorage.getItem('softwin_cart');
    cart = savedCart ? JSON.parse(savedCart) : [];
    adminPassword = localStorage.getItem('softwin_admin_password');
    
    const settings = await DB.load('settings', null);
    const p = settings?.find(s => s.id === 'payments');
    if (p) {
        Object.keys(paymentSettings).forEach(m => {
            if(p[m]) Object.keys(paymentSettings[m]).forEach(k => { if(p[m][k] !== undefined) paymentSettings[m][k] = p[m][k]; });
        });
    }
}

function attachGlobalListeners() {
    const bind = (id, ev, fn) => { const el = document.getElementById(id); if(el) el[ev] = fn; };
    
    bind('cart-btn', 'onclick', () => toggleModal('cart-sidebar', true));
    bind('close-cart', 'onclick', () => toggleModal('cart-sidebar', false));
    bind('checkout-btn', 'onclick', () => { if(cart.length > 0) toggleModal('user-modal', true); });
    bind('cancel-modal', 'onclick', () => toggleModal('user-modal', false));
    bind('close-admin', 'onclick', () => { toggleModal('admin-modal', false); resetAdminForm(); });
    bind('close-admin-auth', 'onclick', () => toggleModal('admin-login-modal', false));
    bind('overlay', 'onclick', closeEverything);
    
    bind('tab-inventory', 'onclick', () => switchAdminTab('inventory'));
    bind('tab-payments', 'onclick', () => switchAdminTab('payments'));
    bind('tab-sales', 'onclick', () => switchAdminTab('sales'));
    
    bind('admin-auth-btn', 'onclick', handleAdminAuth);
    bind('admin-form', 'onsubmit', handleProductSubmit);
    bind('user-form', 'onsubmit', handleCheckoutSubmit);
    bind('save-payments-btn', 'onclick', handlePaymentSave);
    bind('update-status-btn', 'onclick', handleStatusUpdate);
    bind('cancel-edit', 'onclick', resetAdminForm);
    bind('overlay', 'onclick', closeEverything);
    
    bind('excel-input', 'onchange', handleExcelImport);
    bind('admin-image-file', 'onchange', (e) => handleImageFile(e, 'tempLocalImage'));
    bind('checkout-screenshot', 'onchange', (e) => handleImageFile(e, 'tempCheckoutScreenshot', 'screenshot-name'));
}

// Global Exports for HTML
window.addToCart = (id) => { 
    const p = products.find(x => x.id.toString() === id.toString()); 
    if(!p) return; 
    const exists = cart.find(x => x.id.toString() === id.toString()); 
    if(exists) exists.quantity++; 
    else cart.push({...p, quantity: 1}); 
    localStorage.setItem('softwin_cart', JSON.stringify(cart));
    updateCartUI(); 
    toggleModal('cart-sidebar', true); 
    Notify.success(`Añadido: ${p.name}`);
};

window.updateQuantity = (id, d) => { 
    const i = cart.find(x => x.id.toString() === id.toString()); 
    if(i) { 
        i.quantity += d; 
        if(i.quantity <= 0) cart = cart.filter(x => x.id.toString() !== id.toString()); 
        localStorage.setItem('softwin_cart', JSON.stringify(cart));
        updateCartUI(); 
    } 
};

window.deleteProduct = async (id) => {
    if(confirm("¿Seguro que deseas eliminar este producto permanentemente del servidor?")) {
        await DB.delete('products', id);
        await loadAllData();
        renderInventory();
        renderProducts();
        Notify.info("Producto eliminado");
    }
};

window.editProduct = (id) => {
    const p = products.find(x => x.id.toString() === id.toString());
    if(!p) return;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('admin-type').value = p.type;
    window.updateAdminCategories();
    document.getElementById('admin-category').value = p.category;
    document.getElementById('admin-name').value = p.name;
    document.getElementById('admin-price').value = p.price;
    document.getElementById('admin-image').value = p.image;
    document.getElementById('admin-desc').value = p.description || "";
    document.getElementById('admin-is-offer').checked = p.isOffer || false;
    document.getElementById('admin-submit-btn').textContent = "Actualizar en Servidor";
    document.getElementById('cancel-edit').classList.remove('hidden');
    document.getElementById('admin-modal').querySelector('.overflow-y-auto').scrollTo({top: 0, behavior: 'smooth'});
};

window.showOrderDetail = (id) => {
    const o = orders.find(x => x.id.toString() === id.toString()); if(!o) return;
    currentViewOrderId = id;
    document.getElementById('detail-order-id').textContent = '#'+o.id;
    document.getElementById('update-status-select').value = o.status || 'Por Pagar';
    let iH = o.items.map(i => `<div class="flex justify-between text-xs py-1 border-b border-white/5"><span>${i.quantity}x ${i.name}</span><span>$${(i.price*i.quantity).toFixed(2)}</span></div>`).join('');
    document.getElementById('order-detail-content').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-8"><div class="space-y-4"><div class="bg-white/5 p-4 rounded-2xl border border-white/5"><h4 class="text-[10px] uppercase text-gray-500 font-bold mb-2">Cliente</h4><p class="text-sm">${o.customer.name} - ${o.customer.phone}</p></div><div class="bg-white/5 p-4 rounded-2xl border border-white/5"><h4 class="text-[10px] uppercase text-gray-500 font-bold mb-2">Pago: ${o.paymentMethod}</h4><div class="text-neon-blue font-bold text-lg mb-1">Total: $${o.total.toFixed(2)}</div><div class="text-[10px] uppercase font-black text-gray-500">${o.status}</div></div><div class="bg-white/5 p-4 rounded-2xl border border-white/5"><h4 class="text-[10px] uppercase text-gray-500 font-bold mb-2">Productos</h4>${iH}</div></div><div class="space-y-2"><h4 class="text-[10px] uppercase text-gray-500 font-bold">Comprobante</h4>${o.screenshot ? `<img src="${o.screenshot}" class="w-full rounded-2xl border border-white/10 cursor-pointer" onclick="window.open(this.src)">` : '<div class="text-xs text-gray-500 italic">Sin captura</div>'}</div></div>`;
    toggleModal('order-detail-modal', true);
};

window.requestAdminAccess = () => { toggleModal('admin-login-modal', true); document.getElementById('admin-pass-input')?.focus(); };

// Initialization and remaining logic...
function updateCartUI() {
    const count = document.getElementById('cart-count'); if(count) count.textContent = cart.reduce((a,b)=>a+b.quantity,0);
    const container = document.getElementById('cart-items'); if(!container) return;
    container.innerHTML = cart.length === 0 ? '<div class="text-center py-10 text-gray-500">Vacío</div>' : cart.map(i => `<div class="flex gap-4 bg-white/5 p-4 rounded-xl border border-white/5"><img src="${i.image}" class="w-10 h-10 object-contain"><div class="flex-1"><h4 class="text-xs font-bold">${i.name}</h4><div class="flex items-center gap-3 mt-1"><button id="q-min-${i.id}">-</button><span>${i.quantity}</span><button id="q-pls-${i.id}">+</button></div></div><div class="text-right text-neon-blue font-bold text-xs">$${(i.price*i.quantity).toFixed(2)}</div></div>`).join('');
    cart.forEach(i => {
        document.getElementById(`q-min-${i.id}`).onclick = () => window.updateQuantity(i.id, -1);
        document.getElementById(`q-pls-${i.id}`).onclick = () => window.updateQuantity(i.id, 1);
    });
    const total = document.getElementById('cart-total'); if(total) total.textContent = `$${cart.reduce((a,b)=>a+(b.price*b.quantity),0).toFixed(2)}`;
}

function handleAdminAuth() {
    const v = document.getElementById('admin-pass-input').value; if(!v) return;
    const _check = (s) => btoa(s); 
    if(!adminPassword) { adminPassword = _check(v); localStorage.setItem('softwin_admin_password', adminPassword); openAdminPanel(); Notify.success("Clave establecida"); }
    else if(_check(v) === adminPassword) { openAdminPanel(); Notify.info("Acceso concedido"); } else { Notify.error("Clave Incorrecta"); }
}

function openAdminPanel() { toggleModal('admin-login-modal', false); toggleModal('admin-modal', true); switchAdminTab('inventory'); }

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

async function handlePaymentSave() {
    const ms = ['pm1', 'pm2', 'binance', 'paypal', 'airtm', 'intl'];
    ms.forEach(m => {
        Object.keys(paymentSettings[m]).forEach(k => {
            const el = document.getElementById(`pay-${m}-${k}`);
            if(el) paymentSettings[m][k] = el.value;
        });
    });
    await DB.save('settings', 'payments', paymentSettings);
    Notify.success("Formas de pago actualizadas en servidor");
}

async function handleStatusUpdate() {
    if(!currentViewOrderId) return;
    const ns = document.getElementById('update-status-select').value;
    const i = orders.findIndex(o => o.id.toString() === currentViewOrderId.toString());
    if(i !== -1) { 
        orders[i].status = ns; 
        await DB.save('orders', currentViewOrderId.toString(), orders[i]);
        renderSales(); 
        Notify.success("Estado actualizado"); 
    }
}

function renderSales() {
    const list = document.getElementById('admin-sales-list'); if(!list) return;
    list.innerHTML = orders.sort((a,b)=>b.timestamp-a.timestamp).map(o => `<tr class="hover:bg-white/5 border-b border-white/5 cursor-pointer" id="sale-${o.id}"><td class="p-4 text-xs font-mono">#${o.id}</td><td class="p-4 text-sm font-bold">${o.customer.name}</td><td class="p-4 font-bold text-neon-blue">$${o.total.toFixed(2)}</td><td class="p-4 text-[10px] uppercase font-black tracking-widest">${o.status}</td></tr>`).join('');
    orders.forEach(o => { document.getElementById(`sale-${o.id}`).onclick = () => window.showOrderDetail(o.id); });
}

function handleExcelImport(e) {
    const f = e.target.files[0]; if(!f) return;
    
    if (typeof XLSX === 'undefined') {
        Notify.error("Librería de Excel no cargada. Verifica tu conexión.");
        console.error("XLSX library is not defined. Check the script tag in index.html");
        return;
    }

    Notify.info("Procesando archivo...");
    const r = new FileReader();
    r.onload = async (ev) => {
        try {
            const d = new Uint8Array(ev.target.result); 
            const wb = XLSX.read(d, {type:'array'});
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            
            console.log(`Procesando ${json.length} filas del Excel...`);
            let importedCount = 0;

            for(const row of json) {
                const fv = (ks) => { 
                    const fk = Object.keys(row).find(k => ks.some(key => k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === key.toLowerCase())); 
                    return fk ? row[fk] : ''; 
                };

                const name = fv(['Nombre', 'Name', 'Producto', 'Item']);
                if(!name || name.toString().trim() === '') continue;

                const id = (Date.now() + Math.random()).toString().replace('.', '');
                const rawPrice = String(fv(['Precio', 'Price', 'Costo', 'Monto'])).replace(/[^0-9.]/g, '');
                
                const p = { 
                    type: window.currentCatalog || 'software', 
                    name: name.toString().trim(), 
                    category: fv(['Categoria', 'Category', 'Clase', 'Tipo']) || 'Varios', 
                    price: parseFloat(rawPrice) || 0, 
                    image: fv(['Imagen', 'Image', 'URL', 'Link']) || '', 
                    description: fv(['Descripcion', 'Description', 'Detalle']) || '', 
                    isOffer: false 
                };

                await DB.save('products', id, p);
                importedCount++;
            }
            
            await loadAllData();
            renderProducts();
            renderInventory();
            Notify.success(`¡Éxito! ${importedCount} productos cargados.`);
            console.log(`Carga masiva finalizada. ${importedCount} productos importados.`);
            e.target.value = ''; // Reset input
        } catch(err) { 
            console.error("Excel Processing Error:", err);
            Notify.error("Error al procesar el archivo Excel"); 
        }
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
    const filters = window.currentCatalog === 'software' ? 
        [{id:'all',l:'Todos'},{id:'OS',l:'S.O.'},{id:'Database',l:'Base de Datos'},{id:'Diseño',l:'Diseño'},{id:'Programación',l:'Programación'},{id:'Antivirus',l:'Antivirus'}] : 
        [{id:'all',l:'Todos'},{id:'Películas',l:'Películas'},{id:'Combos',l:'Combos'},{id:'Música',l:'Música'},{id:'TV',l:'TV'},{id:'Juegos',l:'Juegos'}];
    
    container.innerHTML = filters.map(f => `
        <button id="f-${f.id}" data-filter="${f.id}" class="filter-btn px-4 py-2 ${f.id==='all'?'bg-neon-blue text-dark font-bold':'text-gray-400 hover:bg-white/5'} rounded-lg text-sm transition-all cursor-pointer">
            ${f.l}
        </button>`).join('');
    
    filters.forEach(f => {
        const btn = document.getElementById(`f-${f.id}`);
        if(btn) btn.onclick = (e) => applyFilter(e.currentTarget);
    });
}

function applyFilter(btn) {
    if (!btn) return;
    const filterValue = btn.getAttribute('data-filter') || 'all';
    
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'filter-btn px-4 py-2 text-gray-400 hover:bg-white/5 rounded-lg text-sm transition-all';
    });
    btn.className = 'filter-btn px-4 py-2 bg-neon-blue text-dark font-bold rounded-lg text-sm transition-all';
    
    const filtered = products.filter(p => {
        if (p.type !== window.currentCatalog && window.currentCatalog !== 'ofertas') return false;
        if (window.currentCatalog === 'ofertas' && !p.isOffer) return false;
        if (filterValue === 'all') return true;
        
        const normalize = (s) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cat = normalize(p.category || '');
        const f = normalize(filterValue);
        
        return cat.includes(f) || f.includes(cat);
    });
    
    renderProducts(filtered);
}

function resetAdminForm() {
    const form = document.getElementById('admin-form'); if (form) form.reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('admin-submit-btn').textContent = "Guardar Producto";
    document.getElementById('cancel-edit').classList.add('hidden');
    tempLocalImage = "";
}

function loadPaymentSettingsIntoForm() {
    const ms = ['pm1', 'pm2', 'binance', 'paypal', 'airtm', 'intl'];
    ms.forEach(m => {
        if(paymentSettings[m]) Object.keys(paymentSettings[m]).forEach(k => {
            const el = document.getElementById(`pay-${m}-${k}`);
            if(el) el.value = paymentSettings[m][k];
        });
    });
}

window.updateAdminCategories = () => {
    const tSelect = document.getElementById('admin-type'); if(!tSelect) return;
    const t = tSelect.value;
    const cats = t === 'software' ? ['OS', 'Database', 'Diseño', 'Programación', 'Antivirus'] : ['Películas', 'Combos', 'Música', 'TV', 'Juegos'];
    const sel = document.getElementById('admin-category');
    if(sel) sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
};

window.clearImageCache = () => {
    if(confirm("¿Deseas limpiar el caché local? El servidor no se verá afectado.")) {
        localStorage.clear();
        location.reload();
    }
};

window.exportData = () => {
    const data = { products, paymentSettings, orders, version: 'Firebase-1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `SoftWin_Full_Backup.json`; a.click();
    Notify.success("Respaldo exportado");
};

// Start
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}
