// src/components/Layout.jsx
import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { authService } from '@/services/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { useToast } from '@/hooks/use-toast';

const Layout = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                const { data } = await authService.getCurrentUser();
                setUser(data);
                setLoading(false);
            } catch (error) {
                console.error('Erreur d\'authentification:', error);
                localStorage.removeItem('token');
                navigate('/login');
                toast({
                    variant: "destructive",
                    title: "Session expirée",
                    description: "Veuillez vous reconnecter.",
                });
            }
        };

        checkAuth();
    }, [navigate, toast]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    <p className="mt-2">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background p-2 md:p-4">
            <Sidebar user={user} />
            <div className="flex flex-col flex-1 overflow-hidden md:pl-4">
                <Navbar user={user} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-card rounded-xl mt-2 md:mt-4 p-4 md:p-6">
                    <Outlet context={{ user }} />
                </main>
            </div>
        </div>
    );
};

export default Layout;