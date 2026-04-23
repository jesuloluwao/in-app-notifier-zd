import { useMemo, useState, useEffect, createContext } from 'react'
export const ClientContext = createContext({})

export function ClientProvider({ children }) {
  console.log('=== ClientProvider initializing ===');
  
  const client = useMemo(() => {
    console.log('Creating ZAF client...');
    const c = window.ZAFClient.init();
    console.log('ZAF client created:', c);
    return c;
  }, []);
  
  const [appRegistered, setAppRegistered] = useState(false)

  useEffect(() => {
    console.log('Setting up app.registered listener...');
    client.on('app.registered', function (data) {
      console.log('=== APP REGISTERED ===', data);
      setAppRegistered(true)
    })
  }, [client])

  if (!appRegistered) {
    console.log('Waiting for app.registered...');
    return null;
  }

  console.log('App registered, rendering children');
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
}