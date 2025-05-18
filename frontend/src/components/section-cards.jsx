import { Car, Users, Wallet, AlertCircle, Eye, EyeOff } from "lucide-react"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { paymentService, vehicleService, driverService, maintenanceService } from "@/services/api"

export function SectionCards() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeVehicles: 0,
    totalVehicles: 0,
    totalExpenses: 0,
    activeDrivers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showValues, setShowValues] = useState(false);

  const toggleValues = () => {
    setShowValues(prev => !prev);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        const [revenueRes, vehiclesRes, expensesRes, driversRes] = await Promise.all([
          paymentService.getStats().catch(err => {
            console.error('Erreur paymentService:', err);
            return { data: { totalAmount: 0 } };
          }),
          vehicleService.getAll().catch(err => {
            console.error('Erreur vehicleService:', err);
            return { data: [] };
          }),
          maintenanceService.getStats().catch(err => {
            console.error('Erreur maintenanceService:', err);
            return { data: { statsByType: [] } };
          }),
          driverService.getActive().catch(err => {
            console.error('Erreur driverService:', err);
            return { data: [] };
          })
        ]);

        setStats({
          totalRevenue: revenueRes.data?.totalAmount || 0,
          activeVehicles: vehiclesRes.data?.filter(v => v.status === 'active').length || 0,
          totalVehicles: vehiclesRes.data?.length || 0,
          totalExpenses: expensesRes.data?.statsByType?.reduce((sum, t) => sum + (t.totalCost || 0), 0) || 0,
          activeDrivers: driversRes.data?.length || 0
        });

      } catch (error) {
        console.error("Erreur globale fetchStats:", error);
        toast.error("Erreur de chargement des données");
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <CardDescription>Chargement...</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                ...
              </CardTitle>
            </CardHeader>
            <CardFooter className="h-10" />
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Erreur</CardDescription>
            <CardTitle className="text-lg text-red-500">
              {error}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="size-4" />
            Impossible de charger les données
          </CardFooter>
        </Card>
      </div>
    )
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR').format(num)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Contrôle global pour afficher/masquer les valeurs */}
      <div className="col-span-full flex justify-end mb-2">
        <button
          onClick={toggleValues}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          {showValues ? (
            <>
              <EyeOff className="h-4 w-4" />
              Masquer les valeurs
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Afficher les valeurs
            </>
          )}
        </button>
      </div>

      {/* Revenu total */}
      <Card>
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <CardDescription>Revenu total</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {showValues ? `${formatNumber(stats.totalRevenue)} FCFA` : '•••••'}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Véhicules actifs */}
      <Card>
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" />
            <CardDescription>Véhicules actifs</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {showValues ? `${stats.activeVehicles}/${stats.totalVehicles}` : '••/••'}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Dépenses totales */}
      <Card>
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <CardDescription>Dépenses totales</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {showValues ? `${formatNumber(stats.totalExpenses)} FCFA` : '•••••'}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Chauffeurs actifs */}
      <Card>
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardDescription>Chauffeurs actifs</CardDescription>
          </div>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {showValues ? stats.activeDrivers : '••'}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}