import React from "react";

// Создаем контекст для хранилищ
export const StoreContext = React.createContext();

// Создаем провайдер для хранилищ
export const StoreProvider = ({ children, stores }) => {
  return (
    <StoreContext.Provider value={stores}>
      {children}
    </StoreContext.Provider>
  );
};