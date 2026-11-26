import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { authApi } from '../../api/auth.api'
import { useAvisos } from '../../context/AvisosContext'

import CampoTexto from './CampoTexto'
import FormularioAuth from './FormularioAuth'
import ReglasPassword from './ReglasPassword'
import {
  esPasswordValida,
  hayErrores,
  mensajeErrorRegistro,
  validarRegistro,
} from './validaciones'

const FORMULARIO_VACIO = { nombre: '', telefono: '', email: '', password: '', confirmacion: '' }

/**
 * Registro público: POST /auth/register. Toda cuenta creada aquí es de Cliente (lo decide el
 * backend). Las reglas de la contraseña se muestran en vivo (ReglasPassword) y se comprueban
 * antes de enviar; al terminar se va al login.
 */
export default function Register() {
  const navegar = useNavigate()
  const avisos = useAvisos()
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [errores, setErrores] = useState({})
  const [registrando, setRegistrando] = useState(false)

  const actualizar = (campo) => (evento) => {
    setFormulario((previo) => ({ ...previo, [campo]: evento.target.value }))
    setErrores((previos) => ({ ...previos, [campo]: null }))
  }

  const crearCuenta = async (evento) => {
    evento.preventDefault()

    // RNF-15: la política se comprueba aquí, antes de gastar una llamada de red.
    const erroresEncontrados = validarRegistro(formulario)
    if (hayErrores(erroresEncontrados)) {
      setErrores(erroresEncontrados)
      return
    }

    setRegistrando(true)
    // El backend fuerza el rol Cliente y exige `name`: sin nombre se usa la parte del correo
    // antes de la @. Un teléfono vacío no se envía.
    const email = formulario.email.trim()
    const telefono = formulario.telefono.replace(/\s+/g, '')
    const payload = {
      name: formulario.nombre.trim() || email.split('@')[0],
      email,
      password: formulario.password,
      ...(telefono && { phone: telefono }),
    }
    try {
      await authApi.register(payload)
    } catch (err) {
      setRegistrando(false)
      avisos.error('No se pudo crear la cuenta', mensajeErrorRegistro(err))
      return
    }
    setRegistrando(false)

    avisos.exito('¡Cuenta creada!', 'Ya puedes iniciar sesión con tu correo.')
    // Cuenta creada: se va directo al login. `replace` evita que el botón "atrás" del
    // navegador regrese al formulario ya enviado.
    navegar('/login', { replace: true })
  }

  // El botón se deshabilita solo cuando la contraseña ya es válida pero falta
  // algo más; no se bloquea desde el primer carácter, porque un botón muerto
  // sin explicación es peor que un error al enviar.
  const passwordLista = esPasswordValida(formulario.password)

  return (
    <FormularioAuth
      titulo="Crear cuenta"
      accion={registrando ? 'Creando cuenta…' : 'Registrarse'}
      accionDeshabilitada={registrando}
      onSubmit={crearCuenta}
      pie={
        <>
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="align-baseline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <CampoTexto
        id="nombre"
        etiqueta="Nombre (opcional)"
        autoComplete="name"
        placeholder="Pepito Pérez"
        value={formulario.nombre}
        error={errores.nombre}
        onChange={actualizar('nombre')}
      />
      <CampoTexto
        id="telefono"
        etiqueta="Teléfono (opcional)"
        type="tel"
        autoComplete="tel"
        placeholder="3001234567"
        value={formulario.telefono}
        error={errores.telefono}
        onChange={actualizar('telefono')}
      />
      <CampoTexto
        id="email"
        etiqueta="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="pepito@correo.com"
        value={formulario.email}
        error={errores.email}
        onChange={actualizar('email')}
      />
      <CampoTexto
        id="password"
        etiqueta="Contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="********"
        value={formulario.password}
        error={errores.password}
        onChange={actualizar('password')}
      >
        {!passwordLista && <ReglasPassword password={formulario.password} />}
      </CampoTexto>
      <CampoTexto
        id="confirmacion"
        etiqueta="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="********"
        value={formulario.confirmacion}
        error={errores.confirmacion}
        onChange={actualizar('confirmacion')}
      />
    </FormularioAuth>
  )
}
