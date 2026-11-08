# proyecto-portal-docente-uees
Universidad Evangélica de El Salvador

Carrera: Ingenieria en desarrollo de contenidos digitales y robótica aplicada

Proyecto de cátedra: rediseño del Portal Docente UEES

Integrantes y carnets:
Andrea Gabriela Miranda Marítnez 2025011075

Daniela Alejandra Méndez Ramírez 2025010674

Emily Josabet Pérez Melgar 2025010519

Asignatura:
Programación Web

Ciclo: II-2026

Docente:
Ing. Ricardo Ernesto Alvarado Martínez

Resumen ejecutivo: 
Durante la catedrá de programación web se rediseñara el portal docente debido a que el sistema anterior posee distintos problemas como adaptavilidad a distintos dispositivos e incluso a miniminizaciones en las computadoras, problemas de contraste, tamaño de letra, lentitud al momento de cargar la base de datos y botones sin algún uso concreto. Esta nueva propuesta redefine el sistema anterior manteniendo todos los componentes funcionales a uno más capaz y con mejor imagen visual. El objetivo de este proyecto es hacer la entrega de calificaciones un proceso  mas rapido para todos los docentes de la Universidad Evangelica de El Salvador. La propuesta presenta una mejor accesibilidad al sitio del sistema de notas, para distinguir con mayor facilidad alumnos aprobados, reprobados o si se encuentran pedientes de calificaiones. Al final todas las fases del proyecto se entregará un sitio mas eficiente al personal docente de la institución. 

Instrucciones de visualización y ejecución

1. Descargar archivo ZIP
2. Descomprimir y abrir en Visual Studio Code
3. El archivo de vistas.io se encuentra en formato XML. por lo tanto para ejecutarlo debe en Draw.io para poder visualizarlo correctamente.
4. Las APIs se encuentran en archivo pdf

Commits representativos

•	Diagramas en Draw.io - Emily
•	APIs                 - Andrea
•	Base de datos        - Daniela
•	Código               - Emily, Andrea y Daniela.
•	Matriz comparativa   - Emily, Andrea y Daniela.

## Ejecución local y publicación

1. Instala las dependencias desde la raíz del repositorio con `npm install`.
2. Configura `DATABASE_URL` en el archivo `.env` de la raíz.
3. Inicia el sitio y la API juntos con `node PagWeb/Backend/server.js`.
4. Abre `http://localhost:3000`. Para probarlo desde otro dispositivo conectado a la misma red Wi-Fi, abre `http://IP-DE-LA-COMPUTADORA:3000`.

Para usar el portal desde cualquier lugar, configura en Vercel **Root Directory** como la raíz del repositorio (`.`), no como `PagWeb`: el handler de la API está en `api/`, al mismo nivel que esa carpeta. Deja **Output Directory** como `PagWeb` (o permite que `vercel.json` lo establezca), agrega `DATABASE_URL` en las variables de entorno de producción y vuelve a desplegar. Comprueba que `https://TU-DOMINIO/api/v1/login` responda `400` al enviar `{}`; un `404 NOT_FOUND` significa que Vercel todavía no publicó el handler. No abras los archivos HTML directamente con `file://`.
