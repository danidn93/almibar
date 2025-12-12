import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

import adminBg from '/assets/admin-bg.png';
import logo from '/assets/logo-admin.png';

/* ------------------------------------------------------------
   INTERFACES
-------------------------------------------------------------*/
interface Mesa {
  id: string;
  nombre: string;
  slug: string;
  token: string;
  activa: boolean;
  sucursal_id: string;
  pin_hash?: string | null;
}

interface Item {
  id: string;
  tipo: 'producto' | 'cancion';
  nombre: string;
  categoria?: string;
  precio?: number;
  image_url?: string | null;
  description?: string | null;
  disponible: boolean;
}

interface CartItem {
  item: Item;
  cantidad: number;
}

/* ------------------------------------------------------------
   COMPONENTE PRINCIPAL
-------------------------------------------------------------*/
export default function ClientMesa() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');

  const navigate = useNavigate();

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  const [mesaTotal, setMesaTotal] = useState(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);

  const [activeTab, setActiveTab] = useState<'productos' | 'canciones'>('productos');

  const [qProductos, setQProductos] = useState('');
  const [qCanciones, setQCanciones] = useState('');

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);

  const [showCartModal, setShowCartModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  /* ------------------------------------------------------------
     VALIDAR APERTURA Y MESA
  -------------------------------------------------------------*/
  useEffect(() => {
    if (!slug || !token) return;

    (async () => {
      try {
        const { data: conf } = await supabase
          .from('configuracion')
          .select('abierto')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setIsOpen(conf?.abierto ?? true);

        if (!conf?.abierto) {
          navigate('/landing', { replace: true });
          return;
        }

        await validateMesaAndToken();
        setIsLoading(false);
      } catch {
        await validateMesaAndToken();
        setIsLoading(false);
      }
    })();
  }, [slug, token]);

  /* ------------------------------------------------------------
     VALIDAR MESA
  -------------------------------------------------------------*/
  const validateMesaAndToken = async () => {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('slug', slug)
      .eq('token', token)
      .eq('activa', true)
      .single();

    if (error || !data) {
      toast({ title: 'Mesa no encontrada', variant: 'destructive' });
      return;
    }

    setMesa(data as Mesa);
    await fetchMesaTotal(data.id);
    await fetchItems(data.sucursal_id);
  };

  /* ------------------------------------------------------------
     TOTAL DE LA MESA
  -------------------------------------------------------------*/
  async function fetchMesaTotal(mesaId: string) {
    const { data } = await supabase
      .from('pedidos')
      .select('total')
      .eq('mesa_id', mesaId)
      .eq('liquidado', false);

    const sum = (data || []).reduce((acc, r) => acc + Number(r.total || 0), 0);
    setMesaTotal(sum);
  }

  /* ------------------------------------------------------------
     OBTENER ITEMS
  -------------------------------------------------------------*/
  async function fetchItems(sucursalId: string) {
    try {
      const { data: suc } = await supabase
        .from('sucursales')
        .select('local_id')
        .eq('id', sucursalId)
        .single();

      const localId = suc.local_id;

      const { data: productos } = await supabase
        .from('productos_local')
        .select('id,nombre,descripcion,categoria,tipo,precio,image_url')
        .eq('local_id', localId);

      const { data: disponibles } = await supabase
        .from('productos_sucursal')
        .select('producto_id,disponible')
        .eq('sucursal_id', sucursalId);

      const mapDisp = new Map(disponibles.map(d => [d.producto_id, d.disponible]));

      const result: Item[] = (productos || []).map(p => ({
        id: p.id,
        tipo: p.tipo === 'cancion' ? 'cancion' : 'producto',
        nombre: p.nombre,
        categoria: p.categoria,
        precio: p.precio,
        disponible: mapDisp.get(p.id) ?? true,
        image_url: p.image_url,
        description: p.descripcion,
      }));

      setItems(result);
    } catch {
      toast({ title: 'Error cargando productos', variant: 'destructive' });
    }
  }

  /* ------------------------------------------------------------
     CARRITO
  -------------------------------------------------------------*/
  useEffect(() => {
    const total = cart.reduce((sum, ci) => sum + (ci.item.precio || 0) * ci.cantidad, 0);
    setCartTotal(total);
  }, [cart]);

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci => ci.item.id === item.id ? { ...ci, cantidad: ci.cantidad + 1 } : ci);
      }
      return [...prev, { item, cantidad: 1 }];
    });
  };

  const reduceQty = (id: string) => {
    setCart(prev =>
      prev.reduce((acc, ci) => {
        if (ci.item.id === id) {
          if (ci.cantidad > 1) acc.push({ ...ci, cantidad: ci.cantidad - 1 });
        } else acc.push(ci);
        return acc;
      }, [] as CartItem[])
    );
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(ci => ci.item.id !== id));
  };

  const clearCart = () => setCart([]);

  /* ------------------------------------------------------------
     CREAR PEDIDO
  -------------------------------------------------------------*/
  const createOrder = async () => {
    if (!mesa || cart.length === 0 || isCreating) return;

    setIsCreating(true);

    try {
      const tipo =
        cart.some(ci => ci.item.tipo === 'producto') &&
        cart.some(ci => ci.item.tipo === 'cancion')
          ? 'mixto'
          : cart.some(ci => ci.item.tipo === 'cancion')
          ? 'canciones'
          : 'productos';

      const total = cart.reduce((sum, ci) => sum + (ci.item.precio || 0) * ci.cantidad, 0);

      const { data: pedido, error } = await supabase
        .from('pedidos')
        .insert({
          sucursal_id: mesa.sucursal_id,
          mesa_id: mesa.id,
          tipo,
          total,
        })
        .select()
        .single();

      if (error) throw error;

      const pedidoItems = cart.map(ci => ({
        pedido_id: pedido.id,
        producto_id: ci.item.id,
        cantidad: ci.cantidad,
      }));

      const { error: e2 } = await supabase.from('pedido_items').insert(pedidoItems);
      if (e2) throw e2;

      toast({ title: 'Pedido enviado' });

      setCart([]);
      setShowCartModal(false);
      await fetchMesaTotal(mesa.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateClick = () => {
    if (!mesa) return;
    if (mesa.pin_hash?.trim()) {
      setPendingCreate(true);
      setShowPinModal(true);
    } else {
      createOrder();
    }
  };

  const confirmPinAndCreate = async () => {
    if (pinInput !== mesa?.pin_hash) {
      setPinError('PIN incorrecto');
      return;
    }
    setShowPinModal(false);
    setPendingCreate(false);
    await createOrder();
  };

  /* ------------------------------------------------------------
     FILTROS
  -------------------------------------------------------------*/
  const productos = items.filter(
    i =>
      i.tipo === 'producto' &&
      i.disponible &&
      (qProductos ? (i.nombre + (i.categoria || '')).toLowerCase().includes(qProductos.toLowerCase()) : true)
  );

  const canciones = items.filter(
    i =>
      i.tipo === 'cancion' &&
      i.disponible &&
      (qCanciones
        ? (i.nombre + (i.categoria || '')).toLowerCase().includes(qCanciones.toLowerCase())
        : true)
  );

  const showProdTab = productos.length > 0;
  const showSongTab = canciones.length > 0;

  /* ------------------------------------------------------------
     UI
  -------------------------------------------------------------*/
  if (isLoading)
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto mb-3" />
          Cargando...
        </div>
      </div>
    );

  if (!mesa)
    return (
      <div className="min-h-screen grid place-items-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Mesa no encontrada</CardTitle>
            <CardDescription>Enlace inválido</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );

  return (
    <div className="relative min-h-screen">
      {/* Fondo */}
      <div className="fixed inset-0 -z-10">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${adminBg})` }} />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* TOPBAR */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} className="h-9 w-9 object-contain" />
            <div>
              <h1 className="font-semibold">{mesa.nombre}</h1>
              <p className="text-xs text-muted-foreground">Realiza tu pedido</p>
            </div>
          </div>

          <div className="flex items-center gap-4">

            {/* Vista previa carrito */}
            <button
              onClick={() => setShowCartModal(true)}
              className="relative"
            >
              <ShoppingCart className="h-6 w-6 text-primary" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                  {cart.length}
                </span>
              )}
            </button>

            {/* Totales */}
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Total mesa pendiente</p>
              <p className="text-lg font-bold">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(mesaTotal)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="container mx-auto px-4 mt-4">
        <div className="flex gap-3 mb-4">
          {showProdTab && (
            <button
              className={`px-4 py-2 rounded-full font-semibold ${
                activeTab === 'productos' ? 'bg-white shadow' : 'bg-white/30 text-white'
              }`}
              onClick={() => setActiveTab('productos')}
            >
              Productos ({productos.length})
            </button>
          )}

          {showSongTab && (
            <button
              className={`px-4 py-2 rounded-full font-semibold ${
                activeTab === 'canciones' ? 'bg-white shadow' : 'bg-white/30 text-white'
              }`}
              onClick={() => setActiveTab('canciones')}
            >
              Canciones ({canciones.length})
            </button>
          )}
        </div>

        {/* LISTA DE PRODUCTOS */}
        {activeTab === 'productos' && showProdTab && (
          <div className="space-y-4">
            <Input
              placeholder="Buscar productos..."
              value={qProductos}
              onChange={(e) => setQProductos(e.target.value)}
            />

            {productos.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow p-3 flex justify-between">
                <div>
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="text-sm text-muted-foreground">{p.description || p.categoria}</p>
                  <p className="font-bold mt-1">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(p.precio ?? 0)}
                  </p>
                </div>
                <Button size="sm" onClick={() => addToCart(p)}>Agregar</Button>
              </div>
            ))}
          </div>
        )}

        {/* LISTA DE CANCIONES */}
        {activeTab === 'canciones' && showSongTab && (
          <div className="space-y-4">
            <Input
              placeholder="Buscar canciones..."
              value={qCanciones}
              onChange={(e) => setQCanciones(e.target.value)}
            />

            {canciones.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow p-3 flex justify-between">
                <div>
                  <p className="font-semibold">{c.nombre}</p>
                  <p className="text-sm text-muted-foreground">{c.categoria}</p>
                </div>
                <Button size="sm" onClick={() => addToCart(c)}>Agregar</Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------
         MODAL CARRITO
      -------------------------------------------------------------*/}
      <Dialog open={showCartModal} onOpenChange={setShowCartModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tu Carrito</DialogTitle>
            <DialogDescription>Revisa los artículos antes de enviar el pedido</DialogDescription>
          </DialogHeader>

          {/* LISTA */}
          <div className="space-y-4 max-h-[40vh] overflow-y-auto mt-2">
            {cart.length === 0 && <p className="text-center text-muted-foreground">Carrito vacío</p>}

            {cart.map(ci => (
              <div key={ci.item.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow">
                <div>
                  <p className="font-semibold">{ci.item.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Subtotal: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format((ci.item.precio || 0) * ci.cantidad)}
                  </p>
                </div>

                {/* controles */}
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => reduceQty(ci.item.id)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-6 text-center font-bold">{ci.cantidad}</span>
                  <Button size="icon" variant="outline" onClick={() => addToCart(ci.item)}>
                    <Plus className="w-4 h-4" />
                  </Button>

                  <Button size="icon" variant="ghost" onClick={() => removeItem(ci.item.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* SEPARADOR */}
          {cart.length > 0 && <div className="border-t my-3"></div>}

          {/* TOTAL + BOTONES */}
          <div className="flex justify-between items-center">
            <p className="font-bold">
              Total:{' '}
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(cartTotal)}
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearCart}>Limpiar</Button>
              <Button onClick={handleCreateClick} disabled={isCreating || cart.length === 0}>
                {isCreating ? 'Enviando...' : 'Realizar Pedido'}
              </Button>
            </div>
          </div>

          <DialogFooter />
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------
         MODAL PIN
      -------------------------------------------------------------*/}
      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar PIN</DialogTitle>
          </DialogHeader>
          <DialogDescription>Ingresa el PIN asignado a la mesa</DialogDescription>

          <Input
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError(null);
            }}
          />

          {pinError && <p className="text-red-500 text-sm">{pinError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinModal(false)}>Cancelar</Button>
            <Button onClick={confirmPinAndCreate}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
