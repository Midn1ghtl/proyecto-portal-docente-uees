-- Esquema de ejemplo para PostgreSQL. Los estudiantes y calificaciones son
-- datos ficticios para desarrollo y demostración.
CREATE SCHEMA IF NOT EXISTS UniversidadUEES;
SET search_path TO UniversidadUEES;

CREATE TABLE Cursos (
    CursoId integer PRIMARY KEY,
    Nombre varchar(50) NOT NULL,
    Horario varchar(20)
);

CREATE TABLE Profesores (
    ProfesorId integer PRIMARY KEY,
    Nombre varchar(100) NOT NULL,
    Apellidos varchar(100) NOT NULL,
    Email varchar(250) UNIQUE,
    Sexo char(1) CHECK (Sexo IN ('F', 'M', 'O')),
    Telefono varchar(15)
);

CREATE TABLE Estudiantes (
    EstudianteId integer PRIMARY KEY,
    Nombre varchar(100) NOT NULL,
    Apellidos varchar(100) NOT NULL,
    Cif varchar(20) NOT NULL UNIQUE,
    Email varchar(150) NOT NULL UNIQUE,
    MatriculaId varchar(50) NOT NULL UNIQUE,
    CursoId integer NOT NULL REFERENCES Cursos(CursoId),
    FechaNacimiento date,
    Sexo char(1) CHECK (Sexo IN ('F', 'M', 'O'))
);

CREATE TABLE Asignaturas (
    AsignaturaId integer PRIMARY KEY,
    Nombre varchar(50) NOT NULL,
    CursoId integer NOT NULL REFERENCES Cursos(CursoId),
    ProfesorId integer NOT NULL REFERENCES Profesores(ProfesorId)
);

CREATE TABLE Evaluaciones (
    EvaluacionesId integer PRIMARY KEY,
    AsignaturaId integer NOT NULL REFERENCES Asignaturas(AsignaturaId),
    Ponderacion integer NOT NULL CHECK (Ponderacion BETWEEN 0 AND 100),
    Fecha date,
    NombreEvaluacion varchar(50) NOT NULL,
    UNIQUE (AsignaturaId, NombreEvaluacion)
);

-- Una fila por estudiante y asignatura: esta llave impide matricular dos
-- veces al mismo estudiante en la misma asignatura.
CREATE TABLE Matricula (
    AsignaturaId integer NOT NULL REFERENCES Asignaturas(AsignaturaId),
    EstudianteId integer NOT NULL REFERENCES Estudiantes(EstudianteId),
    CursoId integer NOT NULL REFERENCES Cursos(CursoId),
    FechaMatricula date NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT PK_Matricula PRIMARY KEY (AsignaturaId, EstudianteId)
);

CREATE TABLE Calificaciones (
    CalificacionId integer PRIMARY KEY,
    AsignaturaId integer NOT NULL,
    EstudianteId integer NOT NULL,
    DocenteId integer NOT NULL REFERENCES Profesores(ProfesorId),
    Nota1 numeric(5,2) NOT NULL CHECK (Nota1 BETWEEN 0 AND 10),
    Nota2 numeric(5,2) NOT NULL CHECK (Nota2 BETWEEN 0 AND 10),
    Nota3 numeric(5,2) NOT NULL CHECK (Nota3 BETWEEN 0 AND 10),
    Reposicion numeric(5,2) CHECK (Reposicion BETWEEN 0 AND 10),
    NotaFinal numeric(5,2) NOT NULL CHECK (NotaFinal BETWEEN 0 AND 10),
    CONSTRAINT FK_Calificaciones_Matricula
        FOREIGN KEY (AsignaturaId, EstudianteId)
        REFERENCES Matricula(AsignaturaId, EstudianteId),
    CONSTRAINT UQ_Calificaciones_Estudiante_Asignatura
        UNIQUE (AsignaturaId, EstudianteId)
);

INSERT INTO Cursos (CursoId, Nombre, Horario) VALUES
(1, 'Licenciatura en Sistemas', 'Diurno');

INSERT INTO Profesores (ProfesorId, Nombre, Apellidos, Email, Sexo, Telefono) VALUES
(1, 'Ana', 'Martínez', 'ana.martinez@example.test', 'F', '7000-0001'),
(2, 'Carlos', 'Hernández', 'carlos.hernandez@example.test', 'M', '7000-0002'),
(3, 'Lucía', 'Pérez', 'lucia.perez@example.test', 'F', '7000-0003');

INSERT INTO Asignaturas (AsignaturaId, Nombre, CursoId, ProfesorId) VALUES
(1, 'Bases de Datos', 1, 1),
(2, 'Programación', 1, 2),
(3, 'Matemática', 1, 3);

INSERT INTO Evaluaciones (EvaluacionesId, AsignaturaId, Ponderacion, Fecha, NombreEvaluacion) VALUES
(1, 1, 30, DATE '2026-09-15', 'Parcial 1'),
(2, 1, 30, DATE '2026-10-15', 'Parcial 2'),
(3, 1, 40, DATE '2026-11-15', 'Proyecto final'),
(4, 2, 30, DATE '2026-09-15', 'Parcial 1'),
(5, 2, 30, DATE '2026-10-15', 'Parcial 2'),
(6, 2, 40, DATE '2026-11-15', 'Proyecto final'),
(7, 3, 30, DATE '2026-09-15', 'Parcial 1'),
(8, 3, 30, DATE '2026-10-15', 'Parcial 2'),
(9, 3, 40, DATE '2026-11-15', 'Proyecto final');

INSERT INTO Estudiantes
    (EstudianteId, Nombre, Apellidos, Cif, Email, MatriculaId, CursoId, FechaNacimiento, Sexo)
VALUES
(1, 'Sofía', 'López', 'CIF-UEES-0001', 'estudiante0001@example.test', 'MAT-UEES-0001', 1, DATE '2004-01-12', 'F'),
(2, 'Diego', 'Ramírez', 'CIF-UEES-0002', 'estudiante0002@example.test', 'MAT-UEES-0002', 1, DATE '2003-02-23', 'M'),
(3, 'Valeria', 'Castillo', 'CIF-UEES-0003', 'estudiante0003@example.test', 'MAT-UEES-0003', 1, DATE '2004-03-08', 'F'),
(4, 'Mateo', 'Flores', 'CIF-UEES-0004', 'estudiante0004@example.test', 'MAT-UEES-0004', 1, DATE '2003-04-19', 'M'),
(5, 'Isabella', 'Rivera', 'CIF-UEES-0005', 'estudiante0005@example.test', 'MAT-UEES-0005', 1, DATE '2004-05-27', 'F'),
(6, 'Gabriel', 'Gómez', 'CIF-UEES-0006', 'estudiante0006@example.test', 'MAT-UEES-0006', 1, DATE '2003-06-14', 'M'),
(7, 'Camila', 'Díaz', 'CIF-UEES-0007', 'estudiante0007@example.test', 'MAT-UEES-0007', 1, DATE '2004-07-02', 'F'),
(8, 'Samuel', 'Morales', 'CIF-UEES-0008', 'estudiante0008@example.test', 'MAT-UEES-0008', 1, DATE '2003-08-11', 'M'),
(9, 'Emma', 'Ortiz', 'CIF-UEES-0009', 'estudiante0009@example.test', 'MAT-UEES-0009', 1, DATE '2004-09-16', 'F'),
(10, 'Nicolás', 'Chávez', 'CIF-UEES-0010', 'estudiante0010@example.test', 'MAT-UEES-0010', 1, DATE '2003-10-05', 'M'),
(11, 'Renata', 'Mejía', 'CIF-UEES-0011', 'estudiante0011@example.test', 'MAT-UEES-0011', 1, DATE '2004-11-21', 'F'),
(12, 'Andrés', 'Vásquez', 'CIF-UEES-0012', 'estudiante0012@example.test', 'MAT-UEES-0012', 1, DATE '2003-12-09', 'M'),
(13, 'Daniela', 'Herrera', 'CIF-UEES-0013', 'estudiante0013@example.test', 'MAT-UEES-0013', 1, DATE '2004-01-30', 'F'),
(14, 'Emilio', 'Aguilar', 'CIF-UEES-0014', 'estudiante0014@example.test', 'MAT-UEES-0014', 1, DATE '2003-02-17', 'M'),
(15, 'Mariana', 'Rojas', 'CIF-UEES-0015', 'estudiante0015@example.test', 'MAT-UEES-0015', 1, DATE '2004-03-25', 'F'),
(16, 'Joaquín', 'Mendoza', 'CIF-UEES-0016', 'estudiante0016@example.test', 'MAT-UEES-0016', 1, DATE '2003-04-07', 'M'),
(17, 'Paula', 'Cruz', 'CIF-UEES-0017', 'estudiante0017@example.test', 'MAT-UEES-0017', 1, DATE '2004-05-13', 'F'),
(18, 'Adrián', 'Reyes', 'CIF-UEES-0018', 'estudiante0018@example.test', 'MAT-UEES-0018', 1, DATE '2003-06-28', 'M'),
(19, 'Luciana', 'Campos', 'CIF-UEES-0019', 'estudiante0019@example.test', 'MAT-UEES-0019', 1, DATE '2004-07-19', 'F'),
(20, 'Tomás', 'Alvarado', 'CIF-UEES-0020', 'estudiante0020@example.test', 'MAT-UEES-0020', 1, DATE '2003-08-03', 'M'),
(21, 'Elena', 'Vega', 'CIF-UEES-0021', 'estudiante0021@example.test', 'MAT-UEES-0021', 1, DATE '2004-09-24', 'F'),
(22, 'Daniel', 'Pineda', 'CIF-UEES-0022', 'estudiante0022@example.test', 'MAT-UEES-0022', 1, DATE '2003-10-12', 'M'),
(23, 'Mía', 'Santos', 'CIF-UEES-0023', 'estudiante0023@example.test', 'MAT-UEES-0023', 1, DATE '2004-11-06', 'F'),
(24, 'Sebastián', 'Guzmán', 'CIF-UEES-0024', 'estudiante0024@example.test', 'MAT-UEES-0024', 1, DATE '2003-12-18', 'M'),
(25, 'Amanda', 'Navarro', 'CIF-UEES-0025', 'estudiante0025@example.test', 'MAT-UEES-0025', 1, DATE '2004-01-09', 'F'),
(26, 'Felipe', 'Romero', 'CIF-UEES-0026', 'estudiante0026@example.test', 'MAT-UEES-0026', 1, DATE '2003-02-26', 'M'),
(27, 'Carolina', 'Fuentes', 'CIF-UEES-0027', 'estudiante0027@example.test', 'MAT-UEES-0027', 1, DATE '2004-03-14', 'F'),
(28, 'David', 'Molina', 'CIF-UEES-0028', 'estudiante0028@example.test', 'MAT-UEES-0028', 1, DATE '2003-04-22', 'M'),
(29, 'Julieta', 'Escobar', 'CIF-UEES-0029', 'estudiante0029@example.test', 'MAT-UEES-0029', 1, DATE '2004-05-31', 'F'),
(30, 'Esteban', 'Peña', 'CIF-UEES-0030', 'estudiante0030@example.test', 'MAT-UEES-0030', 1, DATE '2003-06-10', 'M'),
(31, 'Natalia', 'Cabrera', 'CIF-UEES-0031', 'estudiante0031@example.test', 'MAT-UEES-0031', 1, DATE '2004-07-07', 'F'),
(32, 'Pablo', 'Serrano', 'CIF-UEES-0032', 'estudiante0032@example.test', 'MAT-UEES-0032', 1, DATE '2003-08-29', 'M'),
(33, 'Regina', 'Méndez', 'CIF-UEES-0033', 'estudiante0033@example.test', 'MAT-UEES-0033', 1, DATE '2004-09-03', 'F'),
(34, 'Martín', 'Cáceres', 'CIF-UEES-0034', 'estudiante0034@example.test', 'MAT-UEES-0034', 1, DATE '2003-10-27', 'M'),
(35, 'Victoria', 'Lara', 'CIF-UEES-0035', 'estudiante0035@example.test', 'MAT-UEES-0035', 1, DATE '2004-11-15', 'F'),
(36, 'Alejandro', 'Bonilla', 'CIF-UEES-0036', 'estudiante0036@example.test', 'MAT-UEES-0036', 1, DATE '2003-12-04', 'M'),
(37, 'Sara', 'Calderón', 'CIF-UEES-0037', 'estudiante0037@example.test', 'MAT-UEES-0037', 1, DATE '2004-01-18', 'F'),
(38, 'Juan', 'Márquez', 'CIF-UEES-0038', 'estudiante0038@example.test', 'MAT-UEES-0038', 1, DATE '2003-02-08', 'M'),
(39, 'Abril', 'Orellana', 'CIF-UEES-0039', 'estudiante0039@example.test', 'MAT-UEES-0039', 1, DATE '2004-03-29', 'F'),
(40, 'Ricardo', 'Lemus', 'CIF-UEES-0040', 'estudiante0040@example.test', 'MAT-UEES-0040', 1, DATE '2003-04-16', 'M'),
(41, 'Alma', 'Zelaya', 'CIF-UEES-0041', 'estudiante0041@example.test', 'MAT-UEES-0041', 1, DATE '2004-05-04', 'F'),
(42, 'Mauricio', 'Sosa', 'CIF-UEES-0042', 'estudiante0042@example.test', 'MAT-UEES-0042', 1, DATE '2003-06-21', 'M'),
(43, 'Fernanda', 'Leiva', 'CIF-UEES-0043', 'estudiante0043@example.test', 'MAT-UEES-0043', 1, DATE '2004-07-26', 'F'),
(44, 'Óscar', 'Sorto', 'CIF-UEES-0044', 'estudiante0044@example.test', 'MAT-UEES-0044', 1, DATE '2003-08-15', 'M'),
(45, 'Ariana', 'Duarte', 'CIF-UEES-0045', 'estudiante0045@example.test', 'MAT-UEES-0045', 1, DATE '2004-09-11', 'F'),
(46, 'Hugo', 'Portillo', 'CIF-UEES-0046', 'estudiante0046@example.test', 'MAT-UEES-0046', 1, DATE '2003-10-31', 'M'),
(47, 'Irene', 'Arévalo', 'CIF-UEES-0047', 'estudiante0047@example.test', 'MAT-UEES-0047', 1, DATE '2004-11-02', 'F'),
(48, 'Manuel', 'Quintanilla', 'CIF-UEES-0048', 'estudiante0048@example.test', 'MAT-UEES-0048', 1, DATE '2003-12-22', 'M'),
(49, 'Cecilia', 'Rivas', 'CIF-UEES-0049', 'estudiante0049@example.test', 'MAT-UEES-0049', 1, DATE '2004-01-06', 'F'),
(50, 'Rodrigo', 'Amaya', 'CIF-UEES-0050', 'estudiante0050@example.test', 'MAT-UEES-0050', 1, DATE '2003-02-13', 'M');

-- Los 50 estudiantes quedan matriculados una vez en cada una de las tres
-- asignaturas; las claves foráneas y la PK compuesta bloquean duplicados.
INSERT INTO Matricula (AsignaturaId, EstudianteId, CursoId)
SELECT a.AsignaturaId, e.EstudianteId, e.CursoId
FROM Estudiantes e CROSS JOIN Asignaturas a
WHERE e.CursoId = a.CursoId;

-- Calificaciones ficticias en escala de 0 a 10, una por estudiante y asignatura.
INSERT INTO Calificaciones
    (CalificacionId, AsignaturaId, EstudianteId, DocenteId, Nota1, Nota2, Nota3, Reposicion, NotaFinal)
SELECT
    (a.AsignaturaId * 1000) + e.EstudianteId,
    a.AsignaturaId,
    e.EstudianteId,
    a.ProfesorId,
    round((6.00 + ((e.EstudianteId * 7 + a.AsignaturaId * 3) % 41) / 10.0)::numeric, 2),
    round((6.00 + ((e.EstudianteId * 11 + a.AsignaturaId * 5) % 41) / 10.0)::numeric, 2),
    round((6.00 + ((e.EstudianteId * 13 + a.AsignaturaId * 2) % 41) / 10.0)::numeric, 2),
    NULL,
    round((6.00 + ((e.EstudianteId * 17 + a.AsignaturaId * 4) % 41) / 10.0)::numeric, 2)
FROM Estudiantes e CROSS JOIN Asignaturas a
WHERE e.CursoId = a.CursoId;
