import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  //automatically setStorage when cart object Changers
  //1)new useRef
  const previousCartRef = useRef<Product[]>()
  //2)copy old reference before cart changes
  useEffect(() => {
    previousCartRef.current = cart
  })
  //3) first time "previousReference" = "actualReference"
  const cartPreviousValue = previousCartRef.current ?? cart
  //4) monitor cart, compare previousReference, and update localStorage if necessary
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {

      const dataStock = await api.get(`/stock/${productId}`)
      const stock: Stock = dataStock.data
      const stockAmount = stock.amount
      const newCart = [...cart]
      const productExists = cart.find(product => product.id === productId)
      const currentAmount = productExists ? productExists.amount : 0

      if (currentAmount + 1 > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (productExists) {
        productExists.amount++
      } else {
        const productData = await api.get(`/products/${productId}`)
        newCart.push({ ...productData.data, amount: 1 })
      }

      setCart(newCart)
      // __setNewCart(newCart)

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //just to pass at rocketseat tests 
      // (i know it passes two times at cart array, but it's only educational,
      // and I prefer the second alternative)
      if (cart.filter(product => product.id === productId).length === 0) {
        throw Error('Product not found')
      }

      //if product is not found, does nothing
      const newCart = cart.filter(product => product.id !== productId)
      // __setNewCart(newCart)
      setCart(newCart)

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) {
        return
      }

      const dataStock = await api.get('/stock/' + productId)
      const stockAmount = dataStock.data.amount

      if (stockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = cart.map(product => {
        product.id === productId && (product.amount = amount)
        return product
      })
      // __setNewCart(newCart)
      setCart(newCart)

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  // function __setNewCart(newCart: Product[]) {
  //   localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
  //   setCart(newCart)
  // }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
