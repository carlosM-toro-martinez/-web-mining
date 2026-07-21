# Documentación Técnica — Sistema de Control de Asistencia de Personal

**Dirigido a:** Ministerio de Trabajo, Empleo y Previsión Social
**Empresa:** Minera Marte
**Sistema:** Plataforma de Gestión de Personal y Control Biométrico de Asistencia
**Fecha de emisión:** 18 de julio de 2026
**Versión del documento:** 1.0

---

## 1. Objeto del documento

El presente documento describe, con fines de fiscalización laboral, la arquitectura técnica, las herramientas de desarrollo, el dispositivo biométrico y los mecanismos de seguridad e integridad de datos del sistema utilizado por la empresa para el registro y control de asistencia de su personal.

El sistema fue diseñado bajo el principio de que **el registro de asistencia debe ser generado exclusivamente por verificación biométrica del propio trabajador**, sin intervención manual posterior que permita alterar, falsificar o eliminar una marcación ya efectuada.

---

## 2. Descripción general del sistema

El sistema está compuesto por tres capas independientes:

| Capa | Componente | Función |
|---|---|---|
| Captura | Terminal biométrico ZKTeco SenseFace 2A | Verificación de identidad por reconocimiento facial y registro de la marcación (entrada, salida, descanso, hora extra) |
| Transporte | Servicio puente (*biometric-relay*) | Enlace seguro entre la red local del equipo y el servidor central, sin exponer el dispositivo a Internet |
| Gestión | API central de Personal y Asistencia | Recepción, almacenamiento inmutable, consulta y generación de reportes de asistencia |

El personal se identifica biométricamente en el equipo; el sistema jamás requiere ni permite que un usuario administrativo "marque" asistencia en nombre de un trabajador.

---

## 3. Dispositivo biométrico

| Característica | Detalle |
|---|---|
| Marca | **ZKTeco** |
| Modelo | **SenseFace 2A** |
| Método de verificación | Reconocimiento facial |
| Enrolamiento de identidad | Únicamente **físico**, en el propio equipo. El sistema no cuenta con ninguna función para cargar, sustituir o editar remotamente la identidad biométrica de un trabajador (no se puede "subir una foto" vía software) |
| Conectividad directa (SDK/TCP puerto 4370) | **Deshabilitada.** El equipo no acepta conexiones entrantes |
| Modo de operación | Protocolo **ADMS**: el propio dispositivo actúa como cliente y reporta sus datos al servidor, nunca al revés |
| Exposición a Internet | Ninguna. El equipo opera en la red interna de la operación y se comunica exclusivamente a través del servicio puente autorizado |

---

## 4. Protocolo y lenguaje de comunicación con el biométrico

La comunicación entre el equipo y la plataforma se realiza mediante el **protocolo ADMS de ZKTeco sobre HTTP/HTTPS**, implementado íntegramente en el backend de la empresa.

- **Lenguaje de desarrollo del backend que dialoga con el dispositivo:** TypeScript, ejecutado sobre Node.js (framework Express 5).
- El dispositivo reporta su estado y nuevas marcaciones a intervalos fijos (cada 10 segundos), y en tiempo real ante cada verificación biométrica exitosa.
- Toda instrucción hacia el dispositivo (por ejemplo, alta de un nuevo usuario) se entrega de forma controlada y auditable, únicamente en respuesta a la solicitud periódica que el propio equipo realiza — el servidor nunca inicia una conexión hacia el dispositivo.
- El servicio puente (*biometric-relay*), también desarrollado en Node.js, aísla la red del equipo del servidor central, y toda comunicación entre ambos viaja cifrada mediante **HTTPS/TLS**.

---

## 5. Integridad de los registros de marcación — no manipulación

Este es un punto central del diseño del sistema, dado su uso como fuente de verdad para el control de asistencia:

1. **No existe ninguna función, endpoint ni pantalla en el sistema que permita editar, corregir o eliminar manualmente el contenido de una marcación ya recibida** (fecha, hora o tipo de evento). El registro se crea una única vez, en el instante en que el dispositivo lo transmite.
2. La base de datos aplica una **restricción de unicidad** por trabajador y fecha/hora de marcación, que impide de forma estructural la duplicación o sobreescritura de un registro.
3. Si un trabajador es dado de baja administrativamente, **su historial de marcaciones se conserva íntegro** — el sistema únicamente desvincula la referencia al perfil, nunca borra el registro histórico.
4. Las únicas acciones administrativas que el sistema puede enviar al dispositivo se limitan a la **gestión de usuarios** (alta, baja o corrección de datos identificativos como nombre o PIN de un trabajador); en ningún caso a los registros de asistencia ya generados.
5. Toda instrucción enviada al dispositivo queda registrada en una cola de sincronización con estado verificable (*pendiente / sincronizado / rechazado por el equipo*), lo que permite auditar en cualquier momento qué órdenes fueron efectivamente entregadas.

---

## 6. Niveles de seguridad del sistema

El sistema implementa seguridad en capas (*defense in depth*):

| Nivel | Capa | Medida implementada |
|---|---|---|
| 1 | Seguridad de red | El dispositivo biométrico opera en red interna, sin puerto expuesto a Internet; toda comunicación externa pasa por un servicio puente dedicado |
| 2 | Seguridad de transporte | Cifrado HTTPS/TLS en toda comunicación entre el equipo, el servidor central y los usuarios administrativos |
| 3 | Autenticación | Acceso a la plataforma mediante tokens de sesión (JSON Web Tokens) con expiración controlada; ningún dato de asistencia es accesible sin autenticación |
| 4 | Gestión de credenciales | Las contraseñas de los usuarios del sistema se almacenan mediante *hashing* criptográfico unidireccional (bcrypt) — nunca en texto plano, ni siquiera para los administradores |
| 5 | Autorización por roles (RBAC) | Cada usuario tiene un rol asignado (Administrador, Superintendente, Almacenero, Trabajador, etc.); los módulos de Personal y Biométrico están restringidos a roles de administración y supervisión |
| 6 | Integridad de datos | Restricciones de unicidad e inmutabilidad de los registros de marcación a nivel de base de datos relacional |
| 7 | Trazabilidad | Cola auditable de comandos hacia el dispositivo, con estado individual por operación, y registro de eventos de sistema (*logging* estructurado) en el servidor |

---

## 7. Herramientas y tecnologías utilizadas en el desarrollo

| Categoría | Herramienta / tecnología |
|---|---|
| Lenguaje de programación | TypeScript |
| Entorno de ejecución | Node.js |
| Framework del servidor | Express 5 |
| Base de datos | PostgreSQL |
| Capa de acceso a datos (ORM) | Prisma (control de esquema y migraciones versionadas) |
| Autenticación | JSON Web Tokens (JWT) |
| Protección de contraseñas | bcrypt |
| Cabeceras de seguridad HTTP | Helmet |
| Validación de datos de entrada | Zod |
| Comunicación en tiempo real | Socket.IO |
| Protocolo de integración biométrica | ADMS (ZKTeco) sobre HTTP/HTTPS |
| Servicio puente biométrico | Node.js (*biometric-relay*) |
| Contenedores e infraestructura | Docker |
| Proxy reverso y terminación TLS | Traefik |
| Control de versiones | Git |

---

## 8. Conclusión

El sistema de control de asistencia de Minera Marte genera registros de marcación biométrica de forma automática, verificable y no editable, mediante un equipo ZKTeco SenseFace 2A operado exclusivamente en red interna, integrado a la plataforma de gestión mediante el protocolo estándar ADMS y comunicaciones cifradas. El diseño técnico garantiza que ningún registro de asistencia pueda ser alterado, sustituido o eliminado una vez generado por el dispositivo, y restringe toda operación administrativa mediante autenticación, roles y trazabilidad.

---

*Documento de carácter técnico, elaborado a partir de la arquitectura vigente del sistema al 18 de julio de 2026.*
