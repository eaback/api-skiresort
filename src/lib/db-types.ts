export interface Product {
        id: number
        name: string
        description: string
        price: number
        stock: number
        category: string
        image: string
        created_at?: string
    }
    
    export interface Customer {
        id: number
        firstname: string
        lastname: string
        email: string
        password?: string
        phone: string
        street_address: string
        postal_code: string
        city: string
        country: string
        created_at?: string
    }
    
    export interface OrderItem {
        id: number
        order_id: number
        product_id: number
        product_name: string
        quantity: number
        unit_price: number
        created_at?: string
    }
    
    export interface Order {
        id: number
        customer_id: number
        total_price: number 
        payment_status: string 
        payment_id?: string
        order_status: string 
        created_at?: string
        items?: OrderItem[]
    }
    
    export interface CartItem {
        product: Product
        quantity: number
    }
    