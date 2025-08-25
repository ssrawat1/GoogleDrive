import { useLocation, useNavigate } from 'react-router-dom';
import { loginWithGithub } from '../api/loginWithGithubApi';
import { useEffect } from 'react';

export default function GithubAuth() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      console.log('running...');
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      console.log({ code });

      if (location.pathname === '/auth/github' && code) {
        try {
          const data = await loginWithGithub(code);
          console.log({ data });
          navigate('/');
        } catch (err) {
          console.error('Github Login Failed:', err.message);
          navigate('/register');
        }
      } else {
        console.log('Github Login Failed: No code found');
        navigate('/register');
      }
    };

    run(); // call async function
  }, [location, navigate]);

  return <p>Logging you in...</p>;
}
