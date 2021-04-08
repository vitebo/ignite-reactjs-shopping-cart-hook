import { access } from 'node:fs';
import { createContext, ReactNode, useContext, useState } from 'react';
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
    // const storagedCart = Buscar dados do localStorage

    // if (storagedCart) {
    //   return JSON.parse(storagedCart);
    // }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productTarget = cart.find(product => product.id === productId);
      if (!productTarget) {
        const response = await api.get<Omit<Product, 'amount'>>(`products/${productId}`);
        const newProduct = {
          ...response.data,
          amount: 0,
        };
        const updatedCart = [...cart, newProduct];
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      }
      updateProductAmount({ productId, amount: 1 })
    } catch {
      return toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter(product => product.id !== productId);
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productTarget = cart.find(product => product.id === productId);
      if (!productTarget) throw new Error('NOT_FOUND');
      const newAmount = productTarget.amount + amount;
      const { data: stock } = await api.get<Stock>(`stock/${productTarget.id}`);
      if (stock.amount < newAmount)  throw new Error('STOCKOUT');
      const updatedCart = cart.map((product) => {
        if (product.id === productId) {
          return { ...product, amount: newAmount };
        }
        return product;
      });
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch(error) {
      if (error.message === 'STOCKOUT') {
        return toast.error('Quantidade solicitada fora de estoque');
      }
      if (error.message === 'NOT_FOUND') {
        return toast.error('Produto não encontrado no carrinho');
      }
      return toast.error('Erro na atualização da quantidade do produto');
    }
  };

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
