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