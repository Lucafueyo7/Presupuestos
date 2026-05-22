import { SignOutButton } from '@clerk/nextjs'

export default function NoAutorizado() {
  return (
    <div className="unauth-shell">
      <div className="unauth-card">
        <div className="unauth-mark">F</div>
        <h1 className="unauth-title">Acceso restringido</h1>
        <p className="unauth-body">
          Tu cuenta no tiene permisos para acceder a esta aplicación.
          Contactá al administrador para solicitar acceso.
        </p>
        <SignOutButton redirectUrl="/">
          <button className="unauth-btn">Cerrar sesión</button>
        </SignOutButton>
      </div>
    </div>
  )
}
