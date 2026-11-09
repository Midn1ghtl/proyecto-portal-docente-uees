CREATE TABLE Cursos (
    CursoId integer PRIMARY KEY,
    Nombre varchar(50) NOT NULL,
    Horario varchar(20)
);

CREATE TABLE Profesores (
    ProfesorId integer PRIMARY KEY,
	DUI varchar(10) NOT NULL UNIQUE,
	Nombre varchar(100) NOT NULL,
    Apellidos varchar(100) NOT NULL,
    Email varchar(250) NOT NULL UNIQUE,
	PasswordHash varcgar(255) NOT NULL
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

/* Una fila por estudiante y asignatura: esta llave impide matricular dos
veces al mismo estudiante en la misma asignatura. */

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
(1, 'Programación web', 'Vespertino');

INSERT INTO Profesores (ProfesorId, DUI, Nombre, Apellidos, Email, Sexo, Telefono) VALUES
(1, '01235895-0', 'Ana', 'Martínez', '01235895-0@cvirtualuees.edu.sv', 'F', '7000-0001'),
(2, '02345678-9', 'Carlos', 'Hernández', '02345678-9@cvirtualuees.edu.sv', 'M', '7000-0002'),
(3, '07251132-8', 'Lucía', 'Pérez', '07251132-8@cvirtualuees.edu.sv', 'F', '7000-0003');

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
(1, 'Sofía', 'López', '2025016552', '2025016552@cvirtualuees.edu.sv', 'MAT-UEES-0001', 1, DATE '2004-01-12', 'F'),
(2, 'Diego', 'Ramírez', '2025014427', '2025014427@cvirtualuees.edu.sv', 'MAT-UEES-0002', 1, DATE '2003-02-23', 'M'),
(3, 'Valeria', 'Castillo', '2025011909', '2025011909@cvirtualuees.edu.sv', 'MAT-UEES-0003', 1, DATE '2004-03-08', 'F'),
(4, 'Mateo', 'Flores', '2025013574', '2025013574@cvirtualuees.edu.sv', 'MAT-UEES-0004', 1, DATE '2003-04-19', 'M'),
(5, 'Isabella', 'Rivera', '2025018160', '2025018160@cvirtualuees.edu.sv', 'MAT-UEES-0005', 1, DATE '2004-05-27', 'F'),
(6, 'Gabriel', 'Gómez', '2025011849', '2025011849@cvirtualuees.edu.sv', 'MAT-UEES-0006', 1, DATE '2003-06-14', 'M'),
(7, 'Camila', 'Díaz', '2025012703', '2025012703@cvirtualuees.edu.sv', 'MAT-UEES-0007', 1, DATE '2004-07-02', 'F'),
(8, 'Samuel', 'Morales', '2025013745', '2025013745@cvirtualuees.edu.sv', 'MAT-UEES-0008', 1, DATE '2003-08-11', 'M'),
(9, 'Emma', 'Ortiz', '2025010939', '2025010939@cvirtualuees.edu.sv', 'MAT-UEES-0009', 1, DATE '2004-09-16', 'F'),
(10, 'Nicolás', 'Chávez', '2025018346', '2025018346@cvirtualuees.edu.sv', 'MAT-UEES-0010', 1, DATE '2003-10-05', 'M'),
(11, 'Renata', 'Mejía', '2025015055', '2025015055@cvirtualuees.edu.sv', 'MAT-UEES-0011', 1, DATE '2004-11-21', 'F'),
(12, 'Andrés', 'Vásquez', '2025015961', '2025015961@cvirtualuees.edu.sv', 'MAT-UEES-0012', 1, DATE '2003-12-09', 'M'),
(13, 'Daniela', 'Herrera', '2025018779', '2025018779@cvirtualuees.edu.sv', 'MAT-UEES-0013', 1, DATE '2004-01-30', 'F'),
(14, 'Emilio', 'Aguilar', '2025014730', '2025014730@cvirtualuees.edu.sv', 'MAT-UEES-0014', 1, DATE '2003-02-17', 'M'),
(15, 'Mariana', 'Rojas', '2025012056', '2025012056@cvirtualuees.edu.sv', 'MAT-UEES-0015', 1, DATE '2004-03-25', 'F'),
(16, 'Joaquín', 'Mendoza', '2025014032', '2025014032@cvirtualuees.edu.sv', 'MAT-UEES-0016', 1, DATE '2003-04-07', 'M'),
(17, 'Paula', 'Cruz', '2025019964', '2025019964@cvirtualuees.edu.sv', 'MAT-UEES-0017', 1, DATE '2004-05-13', 'F'),
(18, 'Adrián', 'Reyes', '2025019309', '2025019309@cvirtualuees.edu.sv', 'MAT-UEES-0018', 1, DATE '2003-06-28', 'M'),
(19, 'Luciana', 'Campos', '2025019931', '2025019931@cvirtualuees.edu.sv', 'MAT-UEES-0019', 1, DATE '2004-07-19', 'F'),
(20, 'Tomás', 'Alvarado', '2025013352', '2025013352@cvirtualuees.edu.sv', 'MAT-UEES-0020', 1, DATE '2003-08-03', 'M'),
(21, 'Elena', 'Vega', '2025010637', '2025010637@cvirtualuees.edu.sv', 'MAT-UEES-0021', 1, DATE '2004-09-24', 'F'),
(22, 'Daniel', 'Pineda', '2025011989', '2025011989@cvirtualuees.edu.sv', 'MAT-UEES-0022', 1, DATE '2003-10-12', 'M'),
(23, 'Mía', 'Santos', '2025019235', '2025019235@cvirtualuees.edu.sv', 'MAT-UEES-0023', 1, DATE '2004-11-06', 'F'),
(24, 'Sebastián', 'Guzmán', '2025017762', '2025017762@cvirtualuees.edu.sv', 'MAT-UEES-0024', 1, DATE '2003-12-18', 'M'),
(25, 'Amanda', 'Navarro', '2025011145', '2025011145@cvirtualuees.edu.sv', 'MAT-UEES-0025', 1, DATE '2004-01-09', 'F'),
(26, 'Felipe', 'Romero', '2025027995', '2025027995@cvirtualuees.edu.sv', 'MAT-UEES-0026', 1, DATE '2003-02-26', 'M'),
(27, 'Carolina', 'Fuentes', '2025025670', '2025025670@cvirtualuees.edu.sv', 'MAT-UEES-0027', 1, DATE '2004-03-14', 'F'),
(28, 'David', 'Molina', '2025028687', '2025028687@cvirtualuees.edu.sv', 'MAT-UEES-0028', 1, DATE '2003-04-22', 'M'),
(29, 'Julieta', 'Escobar', '2025023508', '2025023508@cvirtualuees.edu.sv', 'MAT-UEES-0029', 1, DATE '2004-05-31', 'F'),
(30, 'Esteban', 'Peña', '2025025633', '2025025633@cvirtualuees.edu.sv', 'MAT-UEES-0030', 1, DATE '2003-06-10', 'M'),
(31, 'Natalia', 'Cabrera', '2025023795', '2025023795@cvirtualuees.edu.sv', 'MAT-UEES-0031', 1, DATE '2004-07-07', 'F'),
(32, 'Pablo', 'Serrano', '2025029073', '2025029073@cvirtualuees.edu.sv', 'MAT-UEES-0032', 1, DATE '2003-08-29', 'M'),
(33, 'Regina', 'Méndez', '2025023530', '2025023530@cvirtualuees.edu.sv', 'MAT-UEES-0033', 1, DATE '2004-09-03', 'F'),
(34, 'Martín', 'Cáceres', '2025020351', '2025020351@cvirtualuees.edu.sv', 'MAT-UEES-0034', 1, DATE '2003-10-27', 'M'),
(35, 'Victoria', 'Lara', '2025029181', '2025029181@cvirtualuees.edu.sv', 'MAT-UEES-0035', 1, DATE '2004-11-15', 'F'),
(36, 'Alejandro', 'Bonilla', '2025023797', '2025023797@cvirtualuees.edu.sv', 'MAT-UEES-0036', 1, DATE '2003-12-04', 'M'),
(37, 'Sara', 'Calderón', '2025029989', '2025029989@cvirtualuees.edu.sv', 'MAT-UEES-0037', 1, DATE '2004-01-18', 'F'),
(38, 'Juan', 'Márquez', '2025023162', '2025023162@cvirtualuees.edu.sv', 'MAT-UEES-0038', 1, DATE '2003-02-08', 'M'),
(39, 'Abril', 'Orellana', '2025026504', '2025026504@cvirtualuees.edu.sv', 'MAT-UEES-0039', 1, DATE '2004-03-29', 'F'),
(40, 'Ricardo', 'Lemus', '2025025754', '2025025754@cvirtualuees.edu.sv', 'MAT-UEES-0040', 1, DATE '2003-04-16', 'M'),
(41, 'Alma', 'Zelaya', '2025027201', '2025027201@cvirtualuees.edu.sv', 'MAT-UEES-0041', 1, DATE '2004-05-04', 'F'),
(42, 'Mauricio', 'Sosa', '2025029912', '2025029912@cvirtualuees.edu.sv', 'MAT-UEES-0042', 1, DATE '2003-06-21', 'M'),
(43, 'Fernanda', 'Leiva', '2025029937', '2025029937@cvirtualuees.edu.sv', 'MAT-UEES-0043', 1, DATE '2004-07-26', 'F'),
(44, 'Óscar', 'Sorto', '2025020781', '2025020781@cvirtualuees.edu.sv', 'MAT-UEES-0044', 1, DATE '2003-08-15', 'M'),
(45, 'Ariana', 'Duarte', '2025025196', '2025025196@cvirtualuees.edu.sv', 'MAT-UEES-0045', 1, DATE '2004-09-11', 'F'),
(46, 'Hugo', 'Portillo', '2025025175', '2025025175@cvirtualuees.edu.sv', 'MAT-UEES-0046', 1, DATE '2003-10-31', 'M'),
(47, 'Irene', 'Arévalo', '2025027309', '2025027309@cvirtualuees.edu.sv', 'MAT-UEES-0047', 1, DATE '2004-11-02', 'F'),
(48, 'Manuel', 'Quintanilla', '2025028858', '2025028858@cvirtualuees.edu.sv', 'MAT-UEES-0048', 1, DATE '2003-12-22', 'M'),
(49, 'Cecilia', 'Rivas', '2025022813', '2025022813@cvirtualuees.edu.sv', 'MAT-UEES-0049', 1, DATE '2004-01-06', 'F'),
(50, 'Rodrigo', 'Amaya', '2025025641', '2025025641@cvirtualuees.edu.sv', 'MAT-UEES-0050', 1, DATE '2003-02-13', 'M');

/* Calificaciones ficticias en escala de 0 a 10.
NotaFinal se calcula con ponderaciones de 30%, 30% y 40%.*/
WITH NotasGeneradas AS (
    SELECT
        (a.AsignaturaId * 1000) + e.EstudianteId AS CalificacionId,
        a.AsignaturaId,
        e.EstudianteId,
        a.ProfesorId AS DocenteId,
        round((6.00 + ((e.EstudianteId * 7 + a.AsignaturaId * 3) % 41) / 10.0)::numeric, 2) AS Nota1,
        round((6.00 + ((e.EstudianteId * 11 + a.AsignaturaId * 5) % 41) / 10.0)::numeric, 2) AS Nota2,
        round((6.00 + ((e.EstudianteId * 13 + a.AsignaturaId * 2) % 41) / 10.0)::numeric, 2) AS Nota3
    FROM Estudiantes e
    CROSS JOIN Asignaturas a
    WHERE e.CursoId = a.CursoId
)
INSERT INTO Calificaciones
    (CalificacionId, AsignaturaId, EstudianteId, DocenteId, Nota1, Nota2, Nota3, Reposicion, NotaFinal)
SELECT
    CalificacionId,
    AsignaturaId,
    EstudianteId,
    DocenteId,
    Nota1,
    Nota2,
    Nota3,
    NULL AS Reposicion,
    round((
	      CASE
	          WHEN NULL IS NULL THEN Nota1 * 0.30 + Nota2 * 0.30 + Nota3 * 0.40
              ELSE GREATEST(Nota1, Nota2) * 0.30 + NULL * 0.30 + Nota3 * 0.40
		  END
    )::numeric, 2) AS NotaFinal
FROM NotasGeneradas;