import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import FormularioAuth from './FormularioAuth'
import CampoTexto from './CampoTexto'
import { hayErrores, validarLogin } from './validaciones'

const CREDENCIALES_VACIAS = { email: '', password: '' }

export default function Login() {
  const avisos = useAvisos()
  const { iniciarSesion: entrar } = useAuth()
  const [credenciales, setCredenciales] = useState(CREDENCIALES_VACIAS)
  const [errores, setErrores] = useState({})
  const [autenticando, setAutenticando] = useState(false)

  // Al escribir se limpia el error de ese campo: dejarlo mientras el usuario
  // corrige convierte el formulario en un regaño permanente.
  const actualizar = (campo) => (evento) => {
    setCredenciales((previas) => ({ ...previas, [campo]: evento.target.value }))
    setErrores((previos) => ({ ...previos, [campo]: null }))
  }

  const iniciarSesion = async (evento) => {
    evento.preventDefault()

    const erroresEncontrados = validarLogin(credenciales)
    if (hayErrores(erroresEncontrados)) {
      setErrores(erroresEncontrados)
      return
    }

    setAutenticando(true)
    try {
      // AuthContext guarda token y usuario; App redirige al panel del rol.
      await entrar({ email: credenciales.email.trim(), password: credenciales.password })
      avisos.exito('¡Bienvenido!', 'Sesión iniciada en Corralejo Fast Food.')
    } catch (err) {
      // Mensaje genérico a propósito (R63): distinguir "correo inexistente" de
      // "contraseña incorrecta" revela qué correos están registrados.
      const estado = err.response?.status
      avisos.error(
        'No pudimos iniciar sesión',
        estado === 401 || estado === 400
          ? 'El correo o la contraseña no son correctos.'
          : 'No se pudo conectar con el servidor. Inténtalo de nuevo.'
      )
    } finally {
      setAutenticando(false)
    }
  }

  return (
    <FormularioAuth
      titulo="Bienvenido a CFF"
      accion={autenticando ? 'Entrando…' : 'Iniciar sesión'}
      accionDeshabilitada={autenticando}
      onSubmit={iniciarSesion}
      pie={
        <>
          ¿No tienes una cuenta?{' '}
          <Link to="/registro" className="align-baseline">
            Registrarse
          </Link>
          <br />
          <Link to="/visitante/inicio" className="align-baseline">
            Continuar como visitante
          </Link>
        </>
      }
    >
      <CampoTexto
        id="email"
        etiqueta="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="pepito@correo.com"
        value={credenciales.email}
        error={errores.email}
        onChange={actualizar('email')}
      />
      <CampoTexto
        id="password"
        etiqueta="Contraseña"
        type="password"
        autoComplete="current-password"
        placeholder="********"
        value={credenciales.password}
        error={errores.password}
        onChange={actualizar('password')}
      />
    </FormularioAuth>
  )
}
