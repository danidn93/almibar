// ClientMesa.tsx
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Music, Package, Plus, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// fondos / branding (ajusta rutas si fuera necesario)
import adminBg from '/assets/admin-bg.png';
import logo from '/assets/logo-admin.png';

interface Mesa {
  id: string;
  nombre: string;
  slug: string;
  token: string;
  activa: boolean;
  pin_hash?: string | null;
}

interface Item {
  id: string;
  tipo: 'producto' | 'cancion';
  nombre: string;
  artista?: string;
  categoria?: string;
  precio?: number;
  disponible: boolean;
  image_url?: string | null;
  description?: string | null; // <— NUEVO
}


interface CartItem {
  item: Item;
  cantidad: number;
  nota?: string;
}

const ClientMesa = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');

  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [mesaTotal, setMesaTotal] = useState(0);

  // Modal de PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);

  // Buscadores
  const [qProductos, setQProductos] = useState('');
  const [qCanciones, setQCanciones] = useState('');

  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!slug || !token) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('configuracion')
          .select('abierto')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        const abierto = error ? true : (data?.abierto ?? true);
        setIsOpen(abierto);

        if (!abierto) {
          navigate('/landing', { replace: true });
          return;
        }

        await validateMesaAndToken();
        await fetchItems();
      } catch (e) {
        await validateMesaAndToken();
        await fetchItems();
      }
    })();

    return () => { cancelled = true; };
  }, [slug, token, navigate]);

  const mapTipoPedido = (hasProd: boolean, hasSong: boolean) =>
    (hasProd && hasSong ? 'mixto' : hasProd ? 'productos' : 'canciones') as 'productos' | 'canciones' | 'mixto';

  async function fetchMesaTotal(mesaId: string) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('total, liquidado')
      .eq('mesa_id', mesaId)
      .eq('liquidado', false);

    if (error) throw error;
    const sum = (data || []).reduce((acc, r) => acc + Number(r.total || 0), 0);
    setMesaTotal(sum);
  }

  const validateMesaAndToken = async () => {
    try {
      const { data, error } = await supabase
        .from('mesas')
        .select('*')
        .eq('slug', slug)
        .eq('token', token)
        .eq('activa', true)
        .single();

      if (error || !data) {
        toast({
          title: 'Mesa no encontrada',
          description: 'La mesa no existe o el enlace es inválido',
          variant: 'destructive',
        });
        return;
      }

      setMesa(data as Mesa);
      await fetchMesaTotal((data as Mesa).id);
    } catch (error) {
      console.error('Error validating mesa:', error);
      toast({
        title: 'Error',
        description: 'No se pudo validar la mesa',
        variant: 'destructive',
      });
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('disponible', true)
        .order('tipo', { ascending: true });

    if (error) throw error;
      setItems((data as Item[]) || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const total = cart.reduce((sum, cartItem) => sum + (cartItem.item.precio || 0) * cartItem.cantidad, 0);
    setCartTotal(total);
  }, [cart]);

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci => (ci.item.id === item.id ? { ...ci, cantidad: ci.cantidad + 1 } : ci));
      }
      return [...prev, { item, cantidad: 1 }];
    });
    toast({ title: 'Agregado al carrito', description: `${item.nombre} agregado` });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev =>
      prev.reduce((acc, ci) => {
        if (ci.item.id === itemId) {
          if (ci.cantidad > 1) acc.push({ ...ci, cantidad: ci.cantidad - 1 });
          // si llega a 1 y resta, lo quita (quedarían 0)
        } else acc.push(ci);
        return acc;
      }, [] as CartItem[]),
    );
  };

  // Crear pedido con validación de PIN (si la mesa tiene PIN)
  const handleClickCreate = () => {
    if (!mesa || cart.length === 0 || isCreating) return;
    if (mesa.pin_hash && (mesa.pin_hash?.trim() ?? '') !== '') {
      setPendingCreate(true);
      setShowPinModal(true);
      setPinInput('');
      setPinError(null);
    } else {
      createOrder();
    }
  };

  const confirmPinAndCreate = async () => {
    if (!mesa) return;
    const sanitized = pinInput.replace(/\D/g, '').slice(0, 6);
    if (!sanitized) return setPinError('Ingresa el PIN.');
    if ((mesa.pin_hash || '') !== sanitized) return setPinError('PIN incorrecto.');

    setShowPinModal(false);
    setPendingCreate(false);
    await createOrder();
  };

  const createOrder = async () => {
    if (!mesa || cart.length === 0 || isCreating) return;

    setIsCreating(true);
    try {
      const productItems = cart.filter(ci => ci.item.tipo === 'producto');
      const songItems = cart.filter(ci => ci.item.tipo === 'cancion');

      const tipo = mapTipoPedido(productItems.length > 0, songItems.length > 0);
      const productTotal = productItems.reduce((sum, ci) => sum + (ci.item.precio || 0) * ci.cantidad, 0);

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          mesa_id: mesa.id,
          tipo,
          total: productTotal, // canciones = 0
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      const allItems = [...productItems, ...songItems];
      const pedidoItems = allItems.map(ci => ({
        pedido_id: (pedido as any).id,
        item_id: ci.item.id,
        cantidad: ci.cantidad,
        ...(ci.nota?.trim() ? { nota: ci.nota } : {}),
      }));

      const { error: itemsError } = await supabase.from('pedido_items').insert(pedidoItems);
      if (itemsError) throw itemsError;

      setCart([]);
      await fetchMesaTotal(mesa.id);
      toast({ title: 'Pedido realizado', description: `Se creó el pedido (${tipo})` });
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: `No se pudo crear el pedido: ${error?.message || 'Error desconocido'}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getCartItemQuantity = (itemId: string): number => {
    const ci = cart.find(c => c.item.id === itemId);
    return ci ? ci.cantidad : 0;
  };

  // Filtrados
  const productos = items
    .filter(i => i.tipo === 'producto')
    .filter(i => (qProductos ? (i.nombre + ' ' + (i.categoria || '')).toLowerCase().includes(qProductos.toLowerCase()) : true));

  const canciones = items
    .filter(i => i.tipo === 'cancion')
    .filter(i =>
      qCanciones
        ? (i.nombre + ' ' + (i.artista || '') + ' ' + (i.categoria || '')).toLowerCase().includes(qCanciones.toLowerCase())
        : true,
    );

  // === Helpers UI ===
  function groupByCategoria(arr: Item[]) {
    const map = new Map<string, Item[]>();
    for (const it of arr) {
      const key = (it.categoria || 'Otros').toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }

  // Control de cantidad tipo "píldora" (− 1 +)
  const QtyPill = ({
    qty,
    onAdd,
    onRemove,
  }: {
    qty: number;
    onAdd: () => void;
    onRemove: () => void;
  }) => {
    const disabledMinus = qty <= 0;
    return (
      <div className="inline-flex items-center gap-3 rounded-full bg-gray-100 px-4 h-10 shadow-sm select-none">
        <button
          type="button"
          onClick={disabledMinus ? undefined : onRemove}
          className={`text-xl leading-none ${disabledMinus ? 'text-gray-300 cursor-default' : 'cursor-pointer'}`}
          aria-label="Disminuir"
        >
          &minus;
        </button>
        <span className="min-w-[14px] text-base font-medium text-gray-900 text-center">{qty}</span>
        <button
          type="button"
          onClick={onAdd}
          className="text-xl leading-none text-gray-900 cursor-pointer"
          aria-label="Aumentar"
        >
          +
        </button>
      </div>
    );
  };

  // Fila de item estilo delivery (miniatura derecha, control cantidad)
  const ItemRow = ({
    item,
    qty,
    onAdd,
    onRemove,
  }: {
    item: Item;
    qty: number;
    onAdd: () => void;
    onRemove: () => void;
  }) => {
    const showPrice = typeof item.precio === 'number';
    return (
      <div className="relative flex items-stretch gap-3 py-3 border-b">
        {/* texto a la izquierda */}
        <div className="flex-1 min-w-0 pr-2">
          
          {/* Título */}
          <div className="font-semibold text-[15px] leading-snug line-clamp-1">
            {item.nombre}
          </div>

          {/* Descripción / subinfo */}
          {item.tipo === 'cancion' ? (
            item.artista && (
              <div className="text-[12px] text-muted-foreground line-clamp-2">
                {item.artista}
              </div>
            )
          ) : (
            (item.description || item.categoria) && (
              <div className="text-[12px] text-muted-foreground line-clamp-2">
                {item.description || item.categoria}
              </div>
            )
          )}

          {/* Precio */}
          <div className="mt-1 font-bold text-[15px]">
            {showPrice
              ? new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(item.precio!)
              : 'Gratis'}
          </div>

          {/* Control cantidad debajo en móviles (opcional) */}
          <div className="mt-2 sm:hidden">
            <QtyPill qty={qty} onAdd={onAdd} onRemove={onRemove} />
          </div>
        </div>

        {/* miniatura a la derecha */}
        <div className="relative w-[104px] shrink-0">
          <div className="rounded-xl overflow-hidden bg-black/5 aspect-square">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.nombre}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground">
                <Package className="h-6 w-6 opacity-60" />
              </div>
            )}
          </div>

          {/* Control cantidad superpuesto abajo-derecha en pantallas >= sm */}
          <div className="hidden sm:block absolute -bottom-3 right-2">
            <QtyPill qty={qty} onAdd={onAdd} onRemove={onRemove} />
          </div>
        </div>
      </div>
    );
  };

  // Loading / mesa inválida
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!mesa) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Mesa no encontrada</CardTitle>
            <CardDescription>La mesa no existe o el enlace es inválido</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Fondo responsive */}
      <div className="fixed inset-0 -z-10">
        <div
          className="h-full w-full bg-no-repeat bg-center bg-cover"
          style={{ backgroundImage: `url(${adminBg})` }}
        />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Topbar */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 rounded object-contain" />
            <div>
              <h1 className="text-base md:text-lg font-semibold leading-tight">
                Mesa <span className="font-bold">{mesa.nombre}</span>
              </h1>
              <p className="text-xs text-muted-foreground -mt-0.5">Realiza tu pedido</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Total mesa (pendiente)</p>
              <p className="text-lg font-bold">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(mesaTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Realizar Pedido</p>
              <p className="text-lg font-bold">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cartTotal)}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleClickCreate}
              disabled={cart.length === 0 || isCreating}
              className={cart.length > 0 && !isCreating ? 'bg-primary text-primary-foreground animate-pulse' : ''}
            >
              {isCreating ? 'Enviando...' : (<><ShoppingCart className="mr-2 h-4 w-4" />Realizar Pedido ({cart.length})</>)}
            </Button>
          </div>
        </div>
      </header>

      {/* Carrito resumen */}
      {cart.length > 0 && (
        <div className="bg-white/70 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3">
            <h3 className="font-semibold mb-2">Tu pedido</h3>
            <div className="space-y-1 text-sm">
              {cart.map(ci => (
                <div key={ci.item.id} className="flex justify-between items-center">
                  <span>{ci.cantidad}x {ci.item.nombre}</span>
                  <span className="font-medium">
                    {ci.item.precio
                      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
                          (ci.item.precio || 0) * ci.cantidad,
                        )
                      : 'Gratis'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-8">
          {/* Productos LISTA AGRUPADA */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div className="w-full sm:w-64">
                <Input
                  value={qProductos}
                  onChange={(e) => setQProductos(e.target.value)}
                  placeholder="Buscar productos..."
                />
              </div>
            </div>

            {groupByCategoria(productos).map(([categoria, lista]) => (
              <div key={categoria} className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    {categoria}
                  </div>
                </div>
                <div className="px-4">
                  {lista.map((p) => (
                    <ItemRow
                      key={p.id}
                      item={p}
                      qty={getCartItemQuantity(p.id)}
                      onAdd={() => addToCart(p)}
                      onRemove={() => removeFromCart(p.id)}
                    />
                  ))}
                  {lista.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4">No hay productos que coincidan con tu búsqueda.</p>
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Canciones LISTA AGRUPADA */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-white/90" />
                <h2 className="text-xl font-semibold text-white/90">Canciones</h2>
                <Badge variant="secondary">{canciones.length}</Badge>
              </div>
              <div className="w-full sm:w-64">
                <Input
                  value={qCanciones}
                  onChange={(e) => setQCanciones(e.target.value)}
                  placeholder="Buscar canciones o artista..."
                />
              </div>
            </div>

            {groupByCategoria(canciones).map(([categoria, lista]) => (
              <div key={categoria} className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    {categoria}
                  </div>
                </div>
                <div className="px-4">
                  {lista.map((c) => (
                    <ItemRow
                      key={c.id}
                      item={c}
                      qty={getCartItemQuantity(c.id)}
                      onAdd={() => addToCart(c)}
                      onRemove={() => removeFromCart(c.id)}
                    />
                  ))}
                  {lista.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4">No hay canciones que coincidan con tu búsqueda.</p>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>

      {/* Modal de PIN */}
      <Dialog open={showPinModal} onOpenChange={(o) => setShowPinModal(o)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Confirmar PIN</DialogTitle>
            <DialogDescription>
              Ingresa el PIN de <span className="font-semibold">{mesa?.nombre}</span> para enviar el pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pin">PIN de la mesa</Label>
            <Input
              id="pin"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinError(null);
                setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6));
              }}
              placeholder="4-6 dígitos"
              className="font-mono tracking-widest"
            />
            {pinError && <p className="text-sm text-destructive">{pinError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPinModal(false);
                setPendingCreate(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={confirmPinAndCreate} disabled={!pendingCreate || isCreating}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientMesa;
