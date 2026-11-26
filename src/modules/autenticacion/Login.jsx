import { useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../../services/supabase'
import { useAvisos } from '../../context/AvisosContext'
import FormularioAuth from './FormularioAuth'
import CampoTexto from './CampoTexto'
import { hayErrores, validarLogin } from './validaciones'

const CREDENCIALES_VACIAS = { email: '', password: '' }

export default function Login() {
  const avisos = useAvisos()
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credenciales.email.trim(),
      password: credenciales.password,
    })
    setAutenticando(false)

    if (error || !data.user) {
      // Mensaje genérico a propósito (R63): distinguir "correo inexistente" de
      // "contraseña incorrecta" revela qué correos están registrados.
      avisos.error('No pudimos iniciar sesión', 'El correo o la contraseña no son correctos.')
      return
    }

    // No hace falta avisar al padre: AuthContext se entera por su suscripción
    // a onAuthStateChange y App redirige al panel del rol. El aviso no bloquea
    // esa redirección: el diálogo modal que había antes obligaba a esperar a su
    // temporizador antes de entrar al panel.
    avisos.exito('¡Bienvenido!', 'Sesión iniciada en Corralejo Fast Food.')
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
