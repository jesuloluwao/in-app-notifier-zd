import { AdminConfig } from '../components/AdminConfig';
import { useClient } from '../hooks/useClient';

const NavBar = () => {
  const client = useClient();
  return <AdminConfig client={client} />;
};

export default NavBar;