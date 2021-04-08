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
      if (productTarget) {
        await validateStock(productTarget);
        saveUpdatedCart(cart.map(updateProductTargetAmount));
      } else {
        const newProduct = await getNewProduct();
        await validateStock(newProduct);
        saveUpdatedCart([...cart, newProduct]);
      }
    } catch(error) {
      if (error.message === 'STOCKOUT') {
        return toast.error('Quantidade solicitada fora de estoque');
      }
      return toast.error('Erro na adição do produto');
    }

    function saveUpdatedCart(updatedCart: Product[]) {
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    }

    async function validateStock(product: Product) {
      const { data: stock } = await api.get<Stock>(`stock/${product.id}`);
      if (stock.amount < product.amount + 1)  throw new Error('STOCKOUT');
    }

    async function getNewProduct() {
      const {
        data: newProduct,
      } = await api.get<Omit<Product, 'amount'>>(`products/${productId}`);
      return {
        ...newProduct,
        amount: 1,
      };
    }

    function updateProductTargetAmount(product: Product) {
      if (product.id === productId) {
        const amount = product.id === productId ? (product.amount + 1) : product.amount;
        return { ...product, amount };
      }
      return product;
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
      // TODO
    } catch {
      // TODO
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
