import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const existingProduct = updatedCart.find(response => response.id === productId);

      const stock = await api.get(`/stock/${productId}`)
        .then(response => response.data);

      const currentAmount = existingProduct ? existingProduct.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (existingProduct) {
        existingProduct.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`)
          .then(response => response.data);
        
        const newProduct = {
          ...product,
          amount
        }

        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedCart)
      );
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const indexProduct = updatedCart.findIndex(product => product.id === productId);

      if (indexProduct >= 0) {
        updatedCart.splice(indexProduct, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1)
        throw Error();

      const updatedCart = [...cart];
      const existingProduct = updatedCart.find(product => product.id === productId);

      const stock = await api.get(`/stock/${productId}`)
        .then(response => response.data);

      if (!existingProduct)
        throw Error();

      if (amount <= stock.amount){
        existingProduct.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      } 
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
