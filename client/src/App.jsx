import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import DirectoryView from './DirectoryView';
import Register from './Register';
import Login from './Login';
import UsersPage from './UsersPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DirectoryView />,
  },

  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/users',
    element: <UsersPage />,
  },
  {
    path: '/directory/:dirId',
    element: <DirectoryView />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
