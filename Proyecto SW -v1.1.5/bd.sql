-- Tabla de roles
-- 1. Tabla de roles (sin dependencias)
CREATE TABLE rol (
    id_rol INT NOT NULL AUTO_INCREMENT,
    nom_rol VARCHAR(255),
    desc_rol VARCHAR(255),
    PRIMARY KEY (id_rol)
);

-- 2. Tabla de usuarios (depende de rol)
CREATE TABLE usuario (
    username VARCHAR(255),
    password VARCHAR(255),
    id_usr INT NOT NULL AUTO_INCREMENT,
    id_rol INT,
    correo VARCHAR(255),
    PRIMARY KEY (id_usr),
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

-- 3. Tabla de estados (sin dependencias)
CREATE TABLE estado (
    id_estado INT NOT NULL AUTO_INCREMENT,
    desc_estado VARCHAR(255),
    nom_estado VARCHAR(255),
    PRIMARY KEY (id_estado)
);

-- 4. Tabla de imágenes (sin dependencias)
CREATE TABLE imagenpost (
    url_imagen VARCHAR(255),
    id_imagen INT NOT NULL AUTO_INCREMENT,
    desc_imagen VARCHAR(255),
    PRIMARY KEY (id_imagen)
);

-- 5. Tabla de blogpost (depende de usuario, estado e imagenpost)
CREATE TABLE blogpost (
    titulo VARCHAR(255),
    slug VARCHAR(255),
    id_usr INT,
    id_post INT NOT NULL AUTO_INCREMENT,
    id_estado INT,
    id_imagen INT,
    fecha_publicacion DATETIME,
    fecha_creacion DATETIME,
    contenido LONGTEXT,
    PRIMARY KEY (id_post),
    FOREIGN KEY (id_usr) REFERENCES usuario(id_usr),
    FOREIGN KEY (id_estado) REFERENCES estado(id_estado),
    FOREIGN KEY (id_imagen) REFERENCES imagenpost(id_imagen)
);

-- 6. Tabla de categorías (sin dependencias)
CREATE TABLE categoria (
    nom_categoria VARCHAR(255),
    id_categoria INT NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id_categoria)
);

-- 7. Tabla intermedia blogpost-categoría (depende de blogpost y categoria)
CREATE TABLE categoria_blog (
    id_post INT,
    id_categoria INT NOT NULL,
    PRIMARY KEY (id_post, id_categoria),
    FOREIGN KEY (id_post) REFERENCES blogpost(id_post),
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
);

CREATE TABLE password_reset (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    usado TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES usuario(id_usr)
);

--
INSERT INTO rol (nom_rol, desc_rol) VALUES 
('admin', 'Administrador del sistema');

-- Insertar estados
INSERT INTO estado (nom_estado, desc_estado) VALUES 
('publicado', 'Post publicado'),
('borrador', 'Post en borrador');