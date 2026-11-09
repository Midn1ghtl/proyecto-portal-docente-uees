# proyecto-portal-docente-uees
Universidad Evangélica de El Salvador

Carrera: Ingeniería en desarrollo de contenidos digitales y robótica aplicada

Proyecto de cátedra: rediseño del Portal Docente UEES

Integrantes y carnets:
Andrea Gabriela Miranda Martínez 2025011075

Daniela Alejandra Méndez Ramírez 2025010674

Emily Josabet Pérez Melgar 2025010519

Asignatura:
Programación Web

Ciclo: II-2026

Docente:
Ing. Ricardo Ernesto Alvarado Martínez

Resumen ejecutivo: 
Durante la cátedra de programación web se rediseñará el portal docente debido a que el sistema anterior posee distintos problemas como adaptabilidad a distintos dispositivos e incluso a minimizaciones en las computadoras, problemas de contraste, tamaño de letra, lentitud al momento de cargar la base de datos y botones sin algún uso concreto. Esta nueva propuesta redefine el sistema anterior manteniendo todos los componentes funcionales a uno más capaz y con mejor imagen visual. El objetivo de este proyecto es hacer la entrega de calificaciones un proceso  más rápido para todos los docentes de la Universidad Evangélica de El Salvador. La propuesta presenta una mejor accesibilidad al sitio del sistema de notas, para distinguir con mayor facilidad alumnos aprobados, reprobados o si se encuentran pendientes de calificaciones. Al final, en todas las fases del proyecto se entregará un sitio más eficiente al personal docente de la institución. 

## Funcionalidades

- Inicio de sesión de docentes con ID y contraseña.
- Lista de las asignaturas a cargo del docente, con su carrera y horario.
- Lista de estudiantes matriculados en cada asignatura.
- Captura de **Nota 1, Nota 2, Nota 3 y Reposición**; lo escrito se guarda temporalmente en el navegador hasta presionar **Enviar**.
- Nota final calculada en el servidor.
- Exportar a Excel e imprimir.
- Páginas de calendario, soporte y video tutorial.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | HTML5, CSS3 y JavaScript |
| Servidor | Node.js y Express 5 |
| Base de datos | PostgreSQL en [Neon](https://neon.tech) (`@neondatabase/serverless`) |
| Seguridad | `bcryptjs` para contraseñas y tokens firmados con HMAC-SHA256 |
| Despliegue | [Vercel](https://vercel.com) |
| Control de versiones | Git y GitHub |

## Arquitectura

```mermaid
flowchart LR
    A["Navegador<br/>HTML, CSS y JavaScript"] -- "HTTPS + token" --> B["API REST<br/>Node.js + Express<br/>/api/v1"]
    B -- "SQL" --> C[("PostgreSQL<br/>Neon<br/>esquema UniversidadUEES")]
```

El navegador nunca habla con la base de datos: toda petición pasa por la API, que valida el token y que la asignatura pertenezca al docente.

## Base de datos

El esquema se llama `UniversidadUEES` y tiene 7 tablas:

| Tabla | Contenido |
|---|---|
| `Cursos` | Carrera y horario |
| `Profesores` | Docentes y contraseña con hash (`contrahash`) |
| `Estudiantes` | Datos personales y carné (CIF) |
| `Asignaturas` | Cada asignatura pertenece a un curso y a un docente |
| `Evaluaciones` | Ponderación de cada evaluación |
| `Matricula` | Estudiante inscrito en una asignatura (llave compuesta) |
| `Calificaciones` | Notas 1 a 3, reposición y nota final |

Reglas aplicadas en la base: notas entre 0 y 10, una sola matrícula por estudiante y asignatura, y una calificación solo existe si hay matrícula.

Los datos de `docs/Scrip_base_datos.sql` son **ficticios**: 3 docentes, 3 asignaturas, 50 estudiantes, 150 matrículas y 150 calificaciones.

## Instalación y ejecución local

**Requisitos:** Node.js 18 o superior y una base de datos PostgreSQL en Neon.

1. Clona el repositorio e instala las dependencias:

   ```bash
   git clone https://github.com/Midn1ghtl/proyecto-portal-docente-uees.git
   cd proyecto-portal-docente-uees
   npm install
   ```

2. En el editor SQL de Neon, ejecuta completo el archivo `docs/Scrip_base_datos.sql`. Crea el esquema `UniversidadUEES` con sus tablas y datos de ejemplo.

3. Crea un archivo `.env` en la raíz del proyecto:

   ```env
   DATABASE_URL=postgresql://usuario:contraseña@host/neondb?sslmode=require
   SESSION_SECRET=un-texto-largo-y-aleatorio
   ```

 el archivo .env es el .gitignore

4. Comprueba la conexión y el esquema:

   ```bash
   node PagWeb/Backend/probar-bd.js
   ```

5. Inicia el sitio y la API juntos:

   ```bash
   npm start
   ```

   Este comando prepara primero la carpeta `public/`. Abre `http://localhost:3000`. Para probarlo desde otro dispositivo en la misma red Wi-Fi, abre `http://IP-DE-LA-COMPUTADORA:3000`.

No abras los archivos HTML directamente con `file://`.

### Usuarios de prueba

| ID de docente | Nombre | Asignatura | Contraseña |
|---|---|---|---|
| `024565789` | Ana Martínez Rivas | Bases de Datos | 123456789 |
| `036578429` | Carlos Juan Hernández Hernández | Programación | 123456789 |
| `079825643` | Lucía Pérez López | Matemática | 123456789 |

## API

Todas las rutas empiezan con `/api/v1`. Excepto `login`, requieren la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/login` | Recibe `{ "profesorId", "contrasena" }` y devuelve los datos del docente y un token |
| `GET` | `/sesion` | Comprueba que el token siga vigente |
| `GET` | `/profesor/:profesorId/cursos` | Asignaturas del docente |
| `GET` | `/cursos/:cursoId/estudiantes` | Estudiantes matriculados en la asignatura |
| `GET` | `/cursos/:cursoId/calificaciones` | Calificaciones de la asignatura |
| `POST` | `/cursos/:cursoId/calificaciones` | Guarda las notas: `{ "calificaciones": [{ "estudianteId", "nota1", "nota2", "nota3", "reposicion" }] }` |

> En la API, `cursoId` corresponde al **`AsignaturaId`**. En la base de datos, la tabla `Cursos` representa la carrera.

Códigos de error comunes: `400` datos inválidos, `401` sin sesión o sesión vencida, `403` asignatura de otro docente, `404` asignatura inexistente y `500` error interno.

## Reglas de las notas

- **Nota final** = Nota 1 × 30 % + Nota 2 × 30 % + Nota 3 × 40 %, calculada en el servidor.
- **Reposición:** solo se permite si Nota 1 + Nota 2 suman 10 o más.
- Todas las notas deben estar entre 0 y 10.
- Nota 1, Nota 2 y Nota 3 son obligatorias para guardar un registro.
- Solo reciben nota los estudiantes matriculados en la asignatura.

## Seguridad

- Las contraseñas se guardan con hash `bcrypt`, nunca en texto plano.
- La sesión usa un token firmado (HMAC-SHA256) que expira a las 8 horas.
- Un docente solo puede consultar y modificar sus propias asignaturas.
- En producción (`NODE_ENV=production`) los errores del servidor no exponen detalles internos.
- Las credenciales y el `.env` nunca deben subirse al repositorio.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura **Root Directory** como la raíz del repositorio (`.`), no como `PagWeb`: el handler de la API está en `api/`, al mismo nivel.
3. **Build Command:** `npm run build` y **Output Directory:** `public` (ya definidos en `vercel.json`).
4. Agrega `DATABASE_URL` (y, si quieres, `SESSION_SECRET`) en las variables de entorno de producción y vuelve a desplegar.
5. Comprueba que `https://TU-DOMINIO/api/v1/login` responda `400` al enviar `{}`. Un `404 NOT_FOUND` significa que Vercel todavía no publicó el handler.

El build copia las páginas y los recursos de `PagWeb/src` a `public/`. Nunca configures `PagWeb` como carpeta de salida: contiene también el código privado de `Backend/`.

## Pruebas

```bash
npm run test:public
```

Comprueba que el build público excluye el backend y los secretos. Después de desplegar, `/Backend/app.js` debe responder `404` y `/` debe mostrar el login.

**Puede abrir directamente el link de Vercel en cualquiera de sus dispositivos para visualizar el funcionamiento del sitio web**

| Aporte | Responsable |
|---|---|
| Diagramas en draw.io | Emily |
| APIs | Andrea |
| Base de datos | Daniela |
| Código | Emily, Andrea y Daniela |
| Matriz comparativa | Emily, Andrea y Daniela |
