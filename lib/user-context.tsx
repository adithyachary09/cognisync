"use client";



import React, { createContext, useContext, useState } from "react";



interface User {

  id: string;

  name?: string;

  email: string;

}



interface UserContextType {

  user: User | null;

  setUser: (user: User | null) => void;

  logout: () => void;

}



const UserContext = createContext<UserContextType | undefined>(undefined);



export function UserProvider({ children }: { children: React.ReactNode }) {

  const [user, setUser] = useState<User | null>(null);



  const handleSetUser = (u: User | null) => {

    setUser(u);

  };



  const logout = () => {

    setUser(null);

  };



  return (

    <UserContext.Provider value={{ user, setUser: handleSetUser, logout }}>

      {children}

    </UserContext.Provider>

  );

}



export const useUser = () => {

  const context = useContext(UserContext);

  if (!context) {

    throw new Error("useUser must be used within a UserProvider");

  }

  return context;

};