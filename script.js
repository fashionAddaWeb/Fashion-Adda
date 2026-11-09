const SHOP_PHONE = "918208399612";

let db = window.db;
let auth = window.auth;
let storage = window.storage;
let currentUser = null;
let products = [];
let activeFilter = "All";
let editingImageUrl = "";

const grid = document.getElementById("productGrid");
const message = document.getElementById("message");

function safe(value) {
 return String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",
  '"':"&quot;","'":"&#39;"
 }[c]));
}

function money(value) {
 return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function showMessage(text) {
 message.textContent = text;
}

function loadProducts() {
 if (!window.firebaseReady || !db) {
  grid.innerHTML = "<p>Firebase configuration is missing.</p>";
  return;
 }

 db.collection("products").onSnapshot(snapshot => {
  products = snapshot.docs.map(doc => ({
   id: doc.id,
   ...doc.data()
  }));
  renderProducts();
  renderManage();
 }, error => {
  grid.innerHTML = "<p>Database error: " +
   safe(error.message) + "</p>";
 });
}

function renderProducts() {
 const filtered = activeFilter === "All"
  ? products
  : products.filter(p => p.category === activeFilter);

 if (!filtered.length) {
  grid.innerHTML = "<p>No products available yet.</p>";
  return;
 }

 grid.innerHTML = filtered.map(p => {
  const price = p.offerPrice || p.price;
  const stock = p.inStock
   ? '<span class="stock">In Stock</span>'
   : '<span class="stock out">Out of Stock</span>';

  const image = p.imageUrl
   ? safe(p.imageUrl)
   : "https://placehold.co/400x300?text=Fashion+ADDA";

  return `
   <div class="product">
    <img src="${image}" alt="${safe(p.name)}">
    <div class="product-info">
     <h3>${safe(p.name)}</h3>
     <p>${safe(p.category)}</p>
     <p>${safe(p.description || "")}</p>
     <p class="price">${money(price)}
      ${p.offerPrice ? '<span class="old">' +
       money(p.price) + '</span>' : ''}
     </p>
     <p>${stock}</p>
     <button onclick="enquire('${safe(p.id)}')">
      Enquire on WhatsApp
     </button>
    </div>
   </div>
  `;
 }).join("");
}

function enquire(id) {
 const p = products.find(x => x.id === id);
 if (!p) return;

 const text = "Hello Fashion ADDA! I am interested in " +
  p.name + ". Price: " + money(p.offerPrice || p.price);

 window.open(
  "https://wa.me/" + SHOP_PHONE + "?text=" +
  encodeURIComponent(text),
  "_blank"
 );
}

document.querySelectorAll("[data-category]").forEach(btn => {
 btn.addEventListener("click", () => {
  activeFilter = btn.dataset.category;
  document.querySelectorAll("[data-category]")
   .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderProducts();
 });
});

document.getElementById("loginBtn").addEventListener("click", async () => {
 const email = document.getElementById("adminEmail").value.trim();
 const password = document.getElementById("adminPassword").value;

 try {
  await auth.signInWithEmailAndPassword(email, password);
  showMessage("Login successful.");
 } catch (e) {
  showMessage("Login failed: " + e.message);
 }
});

auth.onAuthStateChanged(user => {
 currentUser = user;
 document.getElementById("loginArea").hidden = !!user;
 document.getElementById("adminArea").hidden = !user;
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
 await auth.signOut();
 showMessage("Logged out.");
});

document.getElementById("clearBtn").addEventListener("click", clearForm);

function clearForm() {
 document.getElementById("editId").value = "";
 document.getElementById("pname").value = "";
 document.getElementById("pcat").value = "Women";
 document.getElementById("price").value = "";
 document.getElementById("offer").value = "";
 document.getElementById("desc").value = "";
 document.getElementById("pstock").value = "true";
 document.getElementById("imageFile").value = "";
 document.getElementById("saveBtn").textContent = "Save Product";
 editingImageUrl = "";
}

document.getElementById("saveBtn").addEventListener("click", saveProduct);

async function saveProduct() {
 if (!currentUser) {
  showMessage("Please login first.");
  return;
 }

 const name = document.getElementById("pname").value.trim();
 const price = Number(document.getElementById("price").value);
 const offerValue = document.getElementById("offer").value;
 const offerPrice = offerValue ? Number(offerValue) : null;
 const category = document.getElementById("pcat").value;
 const description = document.getElementById("desc").value.trim();
 const inStock = document.getElementById("pstock").value === "true";
 const file = document.getElementById("imageFile").files[0];
 const id = document.getElementById("editId").value;

 if (!name || !price || price <= 0) {
  showMessage("Enter a product name and valid price.");
  return;
 }

 if (offerPrice !== null &&
     (offerPrice <= 0 || offerPrice >= price)) {
  showMessage("Offer price must be lower than regular price.");
  return;
 }

 const btn = document.getElementById("saveBtn");
 btn.disabled = true;
 btn.textContent = "Saving...";

 try {
  let imageUrl = editingImageUrl;

  if (file) {
   const ref = storage.ref().child(
    "products/" + Date.now() + "_" +
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
   );
   const result = await ref.put(file);
   imageUrl = await result.ref.getDownloadURL();
  }

  const data = {
   name,
   category,
   price,
   offerPrice,
   description,
   inStock,
   imageUrl,
   updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (id) {
   await db.collection("products").doc(id).update(data);
  } else {
   await db.collection("products").add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
   });
  }

  showMessage("Product saved successfully.");
  clearForm();

 } catch (e) {
  showMessage("Save failed: " + e.message);
 } finally {
  btn.disabled = false;
  btn.textContent = "Save Product";
 }
}

function renderManage() {
 const el = document.getElementById("manageList");
 if (!el) return;

 if (!products.length) {
  el.innerHTML = "<p>No products added yet.</p>";
  return;
 }

 el.innerHTML = products.map(p => `
  <div class="manage-item">
   <span><b>${safe(p.name)}</b> — ${money(p.offerPrice || p.price)}
    — ${p.inStock ? "In Stock" : "Out of Stock"}
   </span>
   <span>
    <button onclick="editProduct('${safe(p.id)}')">Edit</button>
    <button onclick="deleteProduct('${safe(p.id)}')">Delete</button>
   </span>
  </div>
 `).join("");
}

function editProduct(id) {
 const p = products.find(x => x.id === id);
 if (!p) return;

 document.getElementById("editId").value = id;
 document.getElementById("pname").value = p.name || "";
 document.getElementById("pcat").value = p.category || "Women";
 document.getElementById("price").value = p.price || "";
 document.getElementById("offer").value = p.offerPrice || "";
 document.getElementById("desc").value = p.description || "";
 document.getElementById("pstock").value = String(!!p.inStock);

 editingImageUrl = p.imageUrl || "";
 document.getElementById("saveBtn").textContent = "Update Product";

 document.getElementById("admin").scrollIntoView({
  behavior: "smooth"
 });
}

async function deleteProduct(id) {
 if (!currentUser) return;
 if (!confirm("Delete this product?")) return;

 try {
  await db.collection("products").doc(id).delete();
  showMessage("Product deleted.");
 } catch (e) {
  showMessage("Delete failed: " + e.message);
 }
}

if (window.firebaseReady) {
 loadProducts();
} else {
 grid.innerHTML = "<p>Firebase configuration is missing. Check firebase.js.</p>";
}