import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/', (c) => c.text('MCP Laburen Activo'))

// 1. BUSCAR PRODUCTOS
app.get('/products', async (c) => {
  const query = c.req.query('q')
  try {
    let results;
    if (query) {
      // Agregamos filtros para las nuevas columnas del Excel
      results = await c.env.DB.prepare(
        "SELECT * FROM products WHERE name LIKE ?1 OR description LIKE ?1 OR color LIKE ?1 OR size LIKE ?1 OR category LIKE ?1"
      )
      .bind(`%${query}%`)
      .all();
    } else {
      results = await c.env.DB.prepare("SELECT * FROM products LIMIT 10").all();
    }
    return c.json(results.results);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
})

// 2. CREAR CARRITO
app.post('/carts', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO carts (created_at) VALUES (datetime('now')) RETURNING id"
    ).first();
    
    return c.json({ 
      message: "Carrito creado", 
      cart_id: result.id 
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
})

// 3. AGREGAR ITEM AL CARRITO
app.post('/carts/items', async (c) => {
  try {
    const body = await c.req.json();
    const { cart_id, product_id, qty } = body;

    if (!cart_id || !product_id) return c.json({ error: "Faltan datos" }, 400);

    await c.env.DB.prepare(
      "INSERT INTO cart_items (cart_id, product_id, qty) VALUES (?, ?, ?)"
    )
    .bind(cart_id, product_id, qty || 1)
    .run();

    return c.json({ message: "Producto agregado", status: "success" });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
})

// 4. VER CARRITO
app.get('/carts/:id', async (c) => {
  const cartId = c.req.param('id');
  try {
    const items = await c.env.DB.prepare(`
      SELECT 
        p.name, 
        p.price, 
        p.size, 
        p.color, 
        SUM(ci.qty) as qty,                       
        SUM(p.price * ci.qty) as subtotal         
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
      GROUP BY p.id, p.name, p.price, p.size, p.color 
    `)
    .bind(cartId)
    .all();

    return c.json({ 
      cart_id: cartId, 
      items: items.results 
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
})

// 5. ACTUALIZAR CARRITO (EXTRA)
app.put('/carts/items', async (c) => {
  try {
    const body = await c.req.json();
    const { cart_id, product_id, qty } = body;

    if (!cart_id || !product_id) return c.json({ error: "Faltan datos" }, 400);

    if (qty > 0) {
      await c.env.DB.prepare(
        "UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?"
      )
      .bind(qty, cart_id, product_id)
      .run();
      return c.json({ message: "Cantidad actualizada", status: "success" });
    } else {
      await c.env.DB.prepare(
        "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?"
      )
      .bind(cart_id, product_id)
      .run();
      return c.json({ message: "Producto eliminado del carrito", status: "success" });
    }
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
})

// 6. AGREGAR MÚLTIPLES ÍTEMS (BULK)
app.post('/carts/items/bulk', async (c) => {
  try {
    const body = await c.req.json();
    const { cart_id, product_ids, qtys } = body;

    if (!cart_id || !product_ids) return c.json({ error: "Faltan datos" }, 400);

    const ids = product_ids.toString().split(',').map((id: string) => parseInt(id.trim()));
    
    const quantities = qtys ? qtys.toString().split(',').map((q: string) => parseInt(q.trim())) : [];

    const stmt = c.env.DB.prepare("INSERT INTO cart_items (cart_id, product_id, qty) VALUES (?, ?, ?)");
    const batch = [];

    // Creamos el lote de inserciones
    for (let i = 0; i < ids.length; i++) {
       if (isNaN(ids[i])) continue; 
       const qty = quantities[i] || 1; 
       batch.push(stmt.bind(cart_id, ids[i], qty));
    }

    if (batch.length > 0) {
      await c.env.DB.batch(batch);
    }

    return c.json({ 
      message: "Productos agregados correctamente", 
      count: batch.length 
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
})

export default app