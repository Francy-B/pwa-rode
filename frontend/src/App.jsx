import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Inicio from './pages/Inicio.jsx'
import Inventario from './pages/Inventario.jsx'
import IngredienteForm from './pages/IngredienteForm.jsx'
import Recetas from './pages/Recetas.jsx'
import RecetaForm from './pages/RecetaForm.jsx'
import Encargos from './pages/Encargos.jsx'
import EncargoForm from './pages/EncargoForm.jsx'
import ListaCompras from './pages/ListaCompras.jsx'

export default function App() {
  const { usuario } = useAuth()

  // Mientras se consulta la sesión no se muestra ni el login ni el panel (evita parpadeos).
  if (usuario === undefined) return <div className="cargando" aria-busy="true" />

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      {/* Todo lo que está dentro de Layout exige sesión iniciada. */}
      <Route element={usuario ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Inicio />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="inventario/nuevo" element={<IngredienteForm />} />
        <Route path="inventario/:id/editar" element={<IngredienteForm />} />
        <Route path="recetas" element={<Recetas />} />
        <Route path="recetas/nuevo" element={<RecetaForm />} />
        <Route path="recetas/:id/editar" element={<RecetaForm />} />
        <Route path="encargos" element={<Encargos />} />
        <Route path="encargos/nuevo" element={<EncargoForm />} />
        <Route path="compras" element={<ListaCompras />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
