import { useContext } from "react";
import { StoreContext } from "./StoreContext";

export const useStores = () => {
  const stores = useContext(StoreContext);
  if (!stores) {
    throw new Error("useStores must be used within a StoreProvider");
  }
  return stores;
};