// ============================================================================
//  Supabase Type Definitions (Generado y Ajustado Manualmente)
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
//  DATABASE
// ============================================================================

export type Database = {
  public: {
    Tables: {

      // ----------------------------------------------------------------------
      // LOCALES
      // ----------------------------------------------------------------------
      locales: {
        Row: {
          id: string
          nombre: string
          direccion: string | null
          telefono: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          direccion?: string | null
          telefono?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          direccion?: string | null
          telefono?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------------------
      // SUCURSALES
      // ----------------------------------------------------------------------
      sucursales: {
        Row: {
          id: string
          local_id: string
          nombre: string
          slug: string | null
          direccion: string | null
          telefono: string | null
          created_at: string
        }
        Insert: {
          id?: string
          local_id: string
          nombre: string
          slug?: string | null
          direccion?: string | null
          telefono?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          local_id?: string
          nombre?: string
          slug?: string | null
          direccion?: string | null
          telefono?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sucursales_local_id_fkey"
            columns: ["local_id"]
            referencedRelation: "locales"
            referencedColumns: ["id"]
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // PRODUCTOS POR LOCAL
      // ----------------------------------------------------------------------
      productos_local: {
        Row: {
          id: string
          local_id: string
          nombre: string
          descripcion: string | null
          categoria: string | null
          tipo: "producto" | "cancion"
          precio: number
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          local_id: string
          nombre: string
          descripcion?: string | null
          categoria?: string | null
          tipo: "producto" | "cancion"
          precio?: number
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          local_id?: string
          nombre?: string
          descripcion?: string | null
          categoria?: string | null
          tipo?: "producto" | "cancion"
          precio?: number
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_local_local_id_fkey",
            columns: ["local_id"],
            referencedRelation: "locales",
            referencedColumns: ["id"],
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // PRODUCTOS POR SUCURSAL (Disponibilidad)
      // ----------------------------------------------------------------------
      productos_sucursal: {
        Row: {
          id: string
          sucursal_id: string
          producto_id: string
          disponible: boolean
        }
        Insert: {
          id?: string
          sucursal_id: string
          producto_id: string
          disponible?: boolean
        }
        Update: {
          id?: string
          sucursal_id?: string
          producto_id?: string
          disponible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "productos_sucursal_sucursal_id_fkey",
            columns: ["sucursal_id"],
            referencedRelation: "sucursales",
            referencedColumns: ["id"],
            isOneToOne: false
          },
          {
            foreignKeyName: "productos_sucursal_producto_id_fkey",
            columns: ["producto_id"],
            referencedRelation: "productos_local",
            referencedColumns: ["id"],
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // MESAS
      // ----------------------------------------------------------------------
      mesas: {
        Row: {
          id: string
          sucursal_id: string
          nombre: string
          slug: string
          token: string
          activa: boolean
          pin_hash: string | null
          pin_updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sucursal_id: string
          nombre: string
          slug: string
          token: string
          activa?: boolean
          pin_hash?: string | null
          pin_updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sucursal_id?: string
          nombre?: string
          slug?: string
          token?: string
          activa?: boolean
          pin_hash?: string | null
          pin_updated_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesas_sucursal_id_fkey"
            columns: ["sucursal_id"]
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // PEDIDOS
      // ----------------------------------------------------------------------
      pedidos: {
        Row: {
          id: string
          sucursal_id: string
          mesa_id: string
          tipo: "productos" | "canciones" | "mixto"
          estado: string
          total: number
          liquidado: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sucursal_id: string
          mesa_id: string
          tipo: "productos" | "canciones" | "mixto"
          estado?: string
          total?: number
          liquidado?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sucursal_id?: string
          mesa_id?: string
          tipo?: string
          estado?: string
          total?: number
          liquidado?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_mesa_id_fkey"
            columns: ["mesa_id"]
            referencedRelation: "mesas"
            referencedColumns: ["id"]
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // ITEMS DE PEDIDO
      // ----------------------------------------------------------------------
      pedido_items: {
        Row: {
          id: string
          pedido_id: string
          producto_id: string
          cantidad: number
          nota: string | null
          state: "PENDIENTE" | "PREPARANDO" | "LISTO"
          pagado: number
        }
        Insert: {
          id?: string
          pedido_id: string
          producto_id: string
          cantidad?: number
          nota?: string | null
          state?: "PENDIENTE" | "PREPARANDO" | "LISTO"
          pagado?: number
        }
        Update: {
          id?: string
          pedido_id?: string
          producto_id?: string
          cantidad?: number
          nota?: string | null
          state?: string
          pagado?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_producto_id_fkey",
            columns: ["producto_id"],
            referencedRelation: "productos_local",
            referencedColumns: ["id"],
            isOneToOne: false
          },
          {
            foreignKeyName: "pedido_items_pedido_id_fkey",
            columns: ["pedido_id"],
            referencedRelation: "pedidos",
            referencedColumns: ["id"],
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // PAGOS
      // ----------------------------------------------------------------------
      pagos: {
        Row: {
          id: string
          sucursal_id: string
          mesa_id: string
          total: number
          pagado: number
          saldo: number | null
          metodo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sucursal_id: string
          mesa_id: string
          total: number
          metodo?: string | null
          pagado?: number
          saldo?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          sucursal_id?: string
          mesa_id?: string
          total?: number
          metodo?: string | null
          pagado?: number
          saldo?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
            isOneToOne: false
          },
          {
            foreignKeyName: "pagos_mesa_id_fkey"
            columns: ["mesa_id"]
            referencedRelation: "mesas"
            referencedColumns: ["id"]
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // INGRESOS
      // ----------------------------------------------------------------------
      ingresos: {
        Row: {
          id: string
          sucursal_id: string
          local_id: string
          pedido_id: string | null
          pago_id: string | null
          monto: number
          metodo: string | null
          origen: "venta" | "propina" | "extra" | "ajuste"
          created_at: string
        }
        Insert: {
          id?: string
          sucursal_id: string
          local_id: string
          pedido_id?: string | null
          pago_id?: string | null
          monto: number
          metodo?: string | null
          origen?: "venta" | "propina" | "extra" | "ajuste"
          created_at?: string
        }
        Update: {
          id?: string
          sucursal_id?: string
          local_id?: string
          pedido_id?: string | null
          pago_id?: string | null
          monto?: number
          metodo?: string | null
          origen?: string
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------------------
      // FACTURAS
      // ----------------------------------------------------------------------
      facturas: {
        Row: {
          id: string
          pedido_id: string
          cliente_nombre: string | null
          cliente_identificacion: string | null
          cliente_email: string | null
          direccion: string | null
          subtotal: number
          impuestos: number
          total: number
          metodo_pago: string | null
          estado: "emitida" | "anulada" | "borrador"
          created_at: string
        }
        Insert: {
          id?: string
          pedido_id: string
          cliente_nombre?: string | null
          cliente_identificacion?: string | null
          cliente_email?: string | null
          direccion?: string | null
          subtotal?: number
          impuestos?: number
          total?: number
          metodo_pago?: string | null
          estado?: "emitida" | "anulada" | "borrador"
          created_at?: string
        }
        Update: {
          id?: string
          pedido_id?: string
          cliente_nombre?: string | null
          cliente_identificacion?: string | null
          cliente_email?: string | null
          direccion?: string | null
          subtotal?: number
          impuestos?: number
          total?: number
          metodo_pago?: string | null
          estado?: "emitida" | "anulada" | "borrador"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facturas_pedido_id_fkey"
            columns: ["pedido_id"]
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
            isOneToOne: false
          }
        ]
      }

      // ----------------------------------------------------------------------
      // CONFIGURACIÓN DE SUCURSAL
      // ----------------------------------------------------------------------
      configuracion: {
        Row: {
          id: string
          sucursal_id: string
          abierto: boolean
          horario_arr: Json
          logo_url: string | null
          hero_bg_url: string | null
          maps_url: string | null
          lat: number | null
          lng: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          sucursal_id: string
          abierto?: boolean
          horario_arr?: Json
          logo_url?: string | null
          hero_bg_url?: string | null
          maps_url?: string | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          sucursal_id?: string
          abierto?: boolean
          horario_arr?: Json
          logo_url?: string | null
          hero_bg_url?: string | null
          maps_url?: string | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------------------
      // USUARIOS ADMINISTRATIVOS (LOCAL)
      // ----------------------------------------------------------------------
      app_users: {
        Row: {
          id: string
          email: string | null
          username: string
          password_hash: string
          name: string | null
          phone: string | null
          role: "admin" | "empleado" | "staff" | "user"
          local_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          username: string
          password_hash: string
          name?: string | null
          phone?: string | null
          role: "admin" | "empleado" | "staff" | "user"
          local_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          username?: string
          password_hash?: string
          name?: string | null
          phone?: string | null
          role?: "admin" | "empleado" | "staff" | "user"
          local_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_local_id_fkey"
            columns: ["local_id"]
            referencedRelation: "locales"
            referencedColumns: ["id"]
            isOneToOne: false
          }
        ]
      }
      // ----------------------------------------------------------------------
      // EVENTOS
      // ----------------------------------------------------------------------
      eventos: {
        Row: {
          id: string
          sucursal_id: string
          titulo: string
          fecha: string
          descripcion: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sucursal_id: string
          titulo: string
          fecha: string
          descripcion?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sucursal_id?: string
          titulo?: string
          fecha?: string
          descripcion?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_sucursal_id_fkey"
            columns: ["sucursal_id"]
            referencedRelation: "sucursales"
            referencedColumns: ["id"]
            isOneToOne: false
          }
        ]
      }
    },

    // ========================================================================
    // FUNCTIONS (RPC)
    // ========================================================================
    Functions: {

      // --------------------------------------------------------------------
      // LOGIN
      // --------------------------------------------------------------------
      admin_login: {
        Args: {
          p_username: string
          p_local_id: string
        }
        Returns: {
          id: string
          username: string
          name: string | null
          role: "admin" | "empleado" | "staff"
          local_id: string
          password_hash: string
        }[]
      },

      // --------------------------------------------------------------------
      // LIST USERS
      // --------------------------------------------------------------------
      admin_list_users: {
        Args: Record<string, never>
        Returns: {
          id: string
          username: string | null
          name: string | null
          role: "admin" | "empleado" | "staff" | "user"
          email: string | null
          created_at: string
          updated_at: string
        }[]
      },

      // --------------------------------------------------------------------
      // CREATE USER
      // --------------------------------------------------------------------
      admin_create_user: {
        Args: {
          p_username: string
          p_display_name: string
          p_role: "admin" | "empleado" | "staff" | "user"
          p_password: string
          p_email?: string | null
        }
        Returns: void
      },

      // --------------------------------------------------------------------
      // UPDATE USER
      // --------------------------------------------------------------------
      admin_update_user: {
        Args: {
          p_id: string
          p_username: string
          p_display_name: string
          p_role: "admin" | "empleado" | "staff" | "user"
          p_email: string | null
        }
        Returns: void
      },

      // --------------------------------------------------------------------
      // UPDATE PASSWORD
      // --------------------------------------------------------------------
      admin_update_user_password: {
        Args: {
          p_id: string
          p_password: string
        }
        Returns: void
      },

      // --------------------------------------------------------------------
      // DELETE USER
      // --------------------------------------------------------------------
      admin_delete_user: {
        Args: {
          p_id: string
        }
        Returns: void
      },

      // --------------------------------------------------------------------
      // CIERRE DIARIO
      // --------------------------------------------------------------------
      cierre_diario: {
        Args: {
          p_fecha: string
          p_tz: string
          p_sucursal: string
        }
        Returns: {
          fecha: string
          timezone: string

          canciones: {
            total: number
            listado: {
              id: string
              nombre: string
              cantidad: number
            }[]
          }

          ingresos: {
            total: number
            por_metodo: {
              metodo: string | null
              total: number
            }[]
          }

          pedidos: {
            id: string
            mesa_id: string
            mesa: string
            tipo: "productos" | "canciones" | "mixto"
            estado: "pendiente" | "preparando" | "entregado" | "cancelado"
            total: number
            created_at: string
            items: {
              item_id: string
              nombre: string
              tipo: "producto" | "cancion"
              cantidad: number
              precio: number | null
              subtotal: number
            }[]
          }[]
        }
      }
    },

    Views: {},
    Enums: {},
    CompositeTypes: {}
  }
}

// ============================================================================
// Helper types
// ============================================================================

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
