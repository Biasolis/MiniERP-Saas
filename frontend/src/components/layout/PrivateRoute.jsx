import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function PrivateRoute({ children }) {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div style={{
                height: '100vh', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                color: '#666',
                fontFamily: 'sans-serif',
                fontSize: '1.2rem'
            }}>
                Carregando...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return children;
}