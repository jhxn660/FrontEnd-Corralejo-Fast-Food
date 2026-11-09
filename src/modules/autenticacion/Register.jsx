import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { supabase } from '../../services/supabase'
import { useAvisos } from '../../context/AvisosContext'
import FormularioAuth from './FormularioAuth'
import CampoTexto from './CampoTexto'
import ReglasPassword from './ReglasPassword'
import { esPasswordValida, hayErrores, validarRegistro } from './validaciones'

const FORMULARIO_VACIO = { email: '', password: '', confirmacion: '' }

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
    // Toda cuenta nueva arranca como cliente (R3); elevarla es una acción
    // administrativa en Supabase. El rol viaja en el JWT: es el mismo sitio
    // del que lo lee la aplicación (R1, R4).
    const { error } = await supabase.auth.signUp({
      email: formulario.email.trim(),
      password: formulario.password,
      options: { data: { rol: 'cliente' } },
    })
    setRegistrando(false)

    if (error) {
      avisos.fallo('No se pudo crear la cuenta', error)
      return
    }

    avisos.exito('¡Cuenta creada!', 'Ya puedes iniciar sesión con tu correo.')
    // Antes había que pulsar "Ir a iniciar sesión" en un diálogo modal; el
    // aviso no interrumpe, así que se lleva al login directamente. `replace`
    // evita que volver atrás regrese al formulario ya enviado (R13).
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
