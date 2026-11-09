// Esquema único de PQRS, compartido por el panel del cliente y el del empleado.
// Antes cada pantalla guardaba campos distintos sobre la misma colección
// (asunto/descripcion vs nombre/texto), así que los registros no se veían entre sí.
//
// Registro: { id, tipo, nombre, asunto, texto, fecha (ISO), estado, usuario }

export const TIPOS = {
  Petición: 'fa-file-lines',
  Queja: 'fa-bullhorn',
  Reclamo: 'fa-triangle-exclamation',
  Sugerencia: 'fa-lightbulb',
}

export const ESTADOS = ['Pendiente', 'En revisión', 'Resuelta']

export const COLOR_ESTADO = {
  Pendiente: 'warning',
  'En revisión': 'info',
  Resuelta: 'success',
}

export const iconoDe = (tipo) => TIPOS[tipo] ?? TIPOS.Petición

export const pqrsVacia = (tipo = 'Petición') => ({
  tipo,
  nombre: '',
  asunto: '',
  texto: '',
  estado: 'Pendiente',
})
