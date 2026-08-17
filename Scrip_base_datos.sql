/* SET SCHEMA 'UniversidadUEES' */
 
/* SQLINES DEMO * able [dbo].[Asignaturas]    Script Date: 16/8/2026 12:17:14 **/
/* SET ANSI_NULLS ON */
 
/* SET QUOTED_IDENTIFIER ON */
 
-- SQLINES FOR EVALUATION USE ONLY
CREATE TABLE Asignaturas(
	AsignaturaId int NOT NULL,
	Nombre Varchar(50) NULL,
	CursoId int NULL,
	ProfesorId int NULL,
 CONSTRAINT PK_Asignaturas PRIMARY KEY 
(
	AsignaturaId
) 
);
 
 
CREATE TABLE Calificaciones(
	CalificacionId int NOT NULL,
	AsignaturaId int NULL,
	EstudianteId int NULL,
	DocenteId int NULL,
	Nota1 Double precision NULL,
	Nota2 Double precision NULL,
	Nota3 Double precision NULL,
	Reposicion Double precision NULL,
	NotaFinal Double precision NULL,
 CONSTRAINT PK_Calificaciones PRIMARY KEY 
(
	CalificacionId
) 
);
 
 
CREATE TABLE Cursos(
	CursoId int NOT NULL,
	Nombre varchar(50) NULL,
	Horario varchar(20) NULL,
 CONSTRAINT PK_Cursos PRIMARY KEY 
(
	CursoId
) 
);
 
 
CREATE TABLE Estudiantes(
	EstudianteId int NOT NULL,
	Nombre varchar(100) NULL,
	Apellidos varchar(100) NULL,
	Cif int NULL,
	Email varchar(150) NULL,
	MatriculaId varchar(50) NULL,
	CursoId int NULL,
	FechaNacimiento Timestamp(3) NULL,
	Sexo char(1) NULL,
 CONSTRAINT PK_Estudiantes PRIMARY KEY 
(
	EstudianteId
) 
);
 
/* SQLINES DEMO * able [dbo].[Profesores]    Script Date: 16/8/2026 12:17:17 **/

CREATE TABLE Profesores(
	ProfesorId int NOT NULL,
	Nombre varchar(100) NULL,
	Apellidos varchar(100) NULL,
	Email varchar(250) NULL,
	Sexo char(1) NULL,
	Telefono varchar(15) NULL,
 CONSTRAINT PK_Docentess PRIMARY KEY 
(
	ProfesorId
) 
);

CREATE TABLE Evaluaciones(
    EvaluacionesId int NOT NULL
	AsignaturaId int NOT NULL,
	Ponderacion int NULL,
	Fecha date NULL,
	NombreEvaluacion varchar(50) NULL,
	
	
 CONSTRAINT PK_Matricula PRIMARY KEY 
(
	AsignaturaId
) 
);
 
ALTER TABLE Asignaturas ADD  CONSTRAINT FK_Asignaturas_Cursos FOREIGN KEY(CursoId)
REFERENCES Cursos (CursoId);
 
ALTER TABLE Asignaturas VALIDATE CONSTRAINT FK_Asignaturas_Cursos;
