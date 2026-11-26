/**
 * Momento en que vence un JWT, en milisegundos (o null si el token no se puede leer).
 *
 * Un JWT son tres partes separadas por puntos: cabecera.payload.firma. El payload NO va cifrado
 * (es Base64URL), así que el navegador puede leer su `exp` (segundos desde 1970) sin el secreto.
 * Leerlo no sirve para confiar en el token: eso lo decide el backend al verificar la firma.
 */
export const vencimientoDe = (token) => {
  try {
    const payload = String(token).split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(base64))
    return Number.isFinite(exp) ? exp * 1000 : null
  } catch {
    return null
  }
}
