const express = require('express');
const cors = require('cors');
const db = require('./config/db.config');
const { sendContactEmail } = require('./config/email.config');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();

// Configuración simple para subir imágenes
const upload = multer({
    storage: multer.memoryStorage(), // Guardar en memoria
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    },
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB
    }
});

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'frontend', 'views'));

// Configurar CORS para permitir conexiones desde ngrok
app.use(cors({
    origin: true, // Permitir cualquier origen para ngrok
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta frontend que está fuera de backend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Servir index1.html en la ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index1.html'));
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
    console.log('Endpoint de prueba llamado');
    res.json({ success: true, message: 'Servidor funcionando correctamente' });
});

// Endpoint de login (ahora usando bcrypt)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Buscar usuario por username
        const [users] = await db.execute(
            'SELECT u.*, r.nom_rol FROM usuario u JOIN rol r ON u.id_rol = r.id_rol WHERE u.username = ?',
            [username]
        );

        if (users.length > 0) {
            const user = users[0];
            // Comparar contraseña hasheada
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                res.json({
                    success: true,
                    user: {
                        id: user.id_usr,
                        username: user.username,
                        role: user.nom_rol
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Endpoint para manejar el formulario de contacto
app.post('/api/contact', async (req, res) => {
    try {
        const { nombre, email, telefono, asunto, mensaje } = req.body;

        // Validar campos requeridos
        if (!nombre || !email || !asunto || !mensaje) {
            return res.status(400).json({
                success: false,
                message: 'Los campos nombre, email, asunto y mensaje son requeridos'
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'El formato del email no es válido'
            });
        }

        // Enviar el correo
        const result = await sendContactEmail({
            nombre,
            email,
            telefono,
            asunto,
            mensaje
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error al enviar el mensaje. Por favor, intenta nuevamente.'
            });
        }
    } catch (error) {
        console.error('Error en endpoint de contacto:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener todas las categorías
app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await db.execute('SELECT * FROM categoria');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Crear catergoria
app.post('/api/categories', async (req, res) => {
    try {
        const { nom_categoria } = req.body;
        if (!nom_categoria) {
            return res.status(400).json({ message: 'nom_categoria is required' });
        }

        const [result] = await db.execute(
            'INSERT INTO categoria (nom_categoria) VALUES (?)',
            [nom_categoria]
        );
        res.json({ id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Actualizar categoría
app.put('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nom_categoria } = req.body;
        await db.execute(
            'UPDATE categoria SET nom_categoria = ? WHERE id_categoria = ?',
            [nom_categoria, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Eliminar categoría
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Verificar si la categoría está siendo usada en algún post
        const [usos] = await db.execute('SELECT id_post FROM categoria_blog WHERE id_categoria = ?', [id]);
        if (usos.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la etiqueta porque está siendo utilizada en uno o más posts.'
            });
        }
        await db.execute('DELETE FROM categoria WHERE id_categoria = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Ruta para mostrar post individual por slug con categoría
app.get('/blog/:slug/:categoria', async (req, res) => {
    try {
        const { slug, categoria } = req.params;
        
        // Consulta para obtener el post con información de usuario, estado, categorías e imágenes
        const [posts] = await db.execute(`
            SELECT 
                b.id_post,
                b.titulo,
                b.contenido,
                b.fecha_publicacion,
                b.slug,
                u.username as autor,
                e.nom_estado as estado,
                GROUP_CONCAT(c.nom_categoria SEPARATOR ', ') as categorias,
                ip.url_imagen AS imagen_principal
            FROM blogpost b
            LEFT JOIN usuario u ON b.id_usr = u.id_usr
            LEFT JOIN estado e ON b.id_estado = e.id_estado
            LEFT JOIN categoria_blog cb ON b.id_post = cb.id_post
            LEFT JOIN categoria c ON cb.id_categoria = c.id_categoria
            LEFT JOIN imagenpost ip ON b.id_imagen = ip.id_imagen
            WHERE b.slug = ? AND b.id_estado = 1
            GROUP BY b.id_post, b.titulo, b.contenido, b.fecha_publicacion, b.slug, u.username, e.nom_estado, ip.url_imagen
        `, [slug]);

        if (posts.length === 0) {
            return res.status(404).render('error', { 
                message: 'Post no encontrado',
                error: 'El post que buscas no existe o no está publicado.'
            });
        }

        const post = posts[0];
        
        // Convertir categorías e imágenes de string a array
        post.categorias = post.categorias ? post.categorias.split(', ') : [];
        post.imagen_principal = post.imagen_principal;
        
        // Verificar si la categoría en la URL coincide con alguna de las categorías del post
        const categoriaSlug = generateSlug(categoria);
        const postCategoriaSlugs = post.categorias.map(cat => generateSlug(cat));
        
        if (!postCategoriaSlugs.includes(categoriaSlug)) {
            // Redirigir a la URL correcta con la primera categoría
            const correctUrl = generatePostUrl(slug, post.categorias);
            return res.redirect(`/blog/${correctUrl}`);
        }
        
        // Crear URL completa para compartir
        const shareUrl = `https://${req.get('host')}${req.originalUrl}`;
        
        res.render('verPost', { post, shareUrl });
    } catch (error) {
        console.error('Error al obtener post:', error);
        res.status(500).render('error', { 
            message: 'Error interno del servidor',
            error: 'Ha ocurrido un error al cargar el post.'
        });
    }
});

// Ruta para mostrar post individual por slug (sin categoría)
app.get('/blog/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Consulta para obtener el post con información de usuario, estado, categorías e imágenes
        const [posts] = await db.execute(`
            SELECT 
                b.id_post,
                b.titulo,
                b.contenido,
                b.fecha_publicacion,
                b.slug,
                u.username as autor,
                e.nom_estado as estado,
                GROUP_CONCAT(c.nom_categoria SEPARATOR ', ') as categorias,
                ip.url_imagen AS imagen_principal
            FROM blogpost b
            LEFT JOIN usuario u ON b.id_usr = u.id_usr
            LEFT JOIN estado e ON b.id_estado = e.id_estado
            LEFT JOIN categoria_blog cb ON b.id_post = cb.id_post
            LEFT JOIN categoria c ON cb.id_categoria = c.id_categoria
            LEFT JOIN imagenpost ip ON b.id_imagen = ip.id_imagen
            WHERE b.slug = ? AND b.id_estado = 1
            GROUP BY b.id_post, b.titulo, b.contenido, b.fecha_publicacion, b.slug, u.username, e.nom_estado, ip.url_imagen
        `, [slug]);

        if (posts.length === 0) {
            return res.status(404).render('error', { 
                message: 'Post no encontrado',
                error: 'El post que buscas no existe o no está publicado.'
            });
        }

        const post = posts[0];
        
        // Convertir categorías e imágenes de string a array
        post.categorias = post.categorias ? post.categorias.split(', ') : [];
        post.imagen_principal = post.imagen_principal;
        
        // Crear URL completa para compartir
        const shareUrl = `https://${req.get('host')}${req.originalUrl}`;
        
        res.render('verPost', { post, shareUrl });
    } catch (error) {
        console.error('Error al obtener post:', error);
        res.status(500).render('error', { 
            message: 'Error interno del servidor',
            error: 'Ha ocurrido un error al cargar el post.'
        });
    }
});

// Ruta para mostrar posts por categoría
app.get('/categoria/:nombre', async (req, res) => {
    try {
        const { nombre } = req.params;
        
        const [posts] = await db.execute(`
            SELECT 
                b.titulo,
                b.slug
            FROM blogpost b
            JOIN categoria_blog cb ON b.id_post = cb.id_post
            JOIN categoria c ON cb.id_categoria = c.id_categoria
            WHERE c.nom_categoria = ? AND b.id_estado = 1
            ORDER BY b.fecha_publicacion DESC
        `, [nombre]);

        res.render('categoriaPosts', { posts, categoria: nombre });
    } catch (error) {
        console.error('Error al obtener posts por categoría:', error);
        res.status(500).render('error', { 
            message: 'Error interno del servidor',
            error: 'Ha ocurrido un error al cargar los posts de la categoría.'
        });
    }
});

// Obtener todos los estados
app.get('/api/estados', async (req, res) => {
    try {
        const [estados] = await db.execute('SELECT * FROM estado');
        res.json(estados);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Obtener posts recientes (API endpoint)
app.get('/api/posts/recent', async (req, res) => {
    try {
        const [posts] = await db.execute(`
            SELECT 
                b.id_post,
                b.titulo,
                b.contenido,
                b.slug,
                b.fecha_creacion,
                b.fecha_publicacion,
                u.username,
                e.nom_estado,
                GROUP_CONCAT(c.nom_categoria SEPARATOR ',') as categorias,
                ip.url_imagen AS imagen_principal
            FROM blogpost b
            LEFT JOIN usuario u ON b.id_usr = u.id_usr
            LEFT JOIN estado e ON b.id_estado = e.id_estado
            LEFT JOIN categoria_blog cb ON b.id_post = cb.id_post
            LEFT JOIN categoria c ON cb.id_categoria = c.id_categoria
            LEFT JOIN imagenpost ip ON b.id_imagen = ip.id_imagen
            WHERE b.id_estado = 1
            GROUP BY b.id_post
            ORDER BY b.fecha_publicacion DESC
            LIMIT 10
        `);
        
        res.json(posts);
    } catch (error) {
        console.error('Error al obtener posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Obtener todos los posts (para admin)
app.get('/api/posts/all', async (req, res) => {
    try {
        const [posts] = await db.execute(`
            SELECT 
                b.id_post,
                b.titulo,
                b.contenido,
                b.slug,
                b.fecha_creacion,
                b.fecha_publicacion,
                b.id_estado,
                u.username,
                e.nom_estado,
                GROUP_CONCAT(c.nom_categoria SEPARATOR ', ') as categorias,
                ip.url_imagen AS imagen_principal
            FROM blogpost b
            LEFT JOIN usuario u ON b.id_usr = u.id_usr
            LEFT JOIN estado e ON b.id_estado = e.id_estado
            LEFT JOIN categoria_blog cb ON b.id_post = cb.id_post
            LEFT JOIN categoria c ON cb.id_categoria = c.id_categoria
            LEFT JOIN imagenpost ip ON b.id_imagen = ip.id_imagen
            GROUP BY b.id_post, b.titulo, b.contenido, b.slug, b.fecha_creacion, b.fecha_publicacion, b.id_estado, u.username, e.nom_estado, ip.url_imagen
            ORDER BY b.fecha_creacion DESC
        `);
        
        // Convertir categorías e imágenes de string a array
        const postsWithArrays = posts.map(post => ({
            ...post,
            categorias: post.categorias ? post.categorias.split(', ') : [],
            imagen_principal: post.imagen_principal
        }));
        
        res.json(postsWithArrays);
    } catch (error) {
        console.error('Error al obtener posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Obtener posts con paginación y filtros
app.get('/api/posts', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 3, 
            search = '', 
            categoria = '', 
            orden = 'fecha_desc' 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        // Construir la consulta base
        let query = `
            SELECT 
                b.id_post,
                b.titulo,
                b.contenido,
                b.slug,
                b.fecha_creacion,
                b.fecha_publicacion,
                u.username,
                e.nom_estado,
                GROUP_CONCAT(c.nom_categoria SEPARATOR ',') as categorias,
                ip.url_imagen AS imagen_principal
            FROM blogpost b
            LEFT JOIN usuario u ON b.id_usr = u.id_usr
            LEFT JOIN estado e ON b.id_estado = e.id_estado
            LEFT JOIN categoria_blog cb ON b.id_post = cb.id_post
            LEFT JOIN categoria c ON cb.id_categoria = c.id_categoria
            LEFT JOIN imagenpost ip ON b.id_imagen = ip.id_imagen
            WHERE b.id_estado = 1
        `;
        
        const params = [];
        
        // Agregar filtros
        if (search) {
            query += ` AND (b.titulo LIKE ? OR b.contenido LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (categoria) {
            query += ` AND c.nom_categoria = ?`;
            params.push(categoria);
        }
        
        query += ` GROUP BY b.id_post`;
        
        // Agregar ordenamiento
        switch (orden) {
            case 'fecha_asc':
                query += ` ORDER BY b.fecha_publicacion ASC`;
                break;
            case 'fecha_desc':
            default:
                query += ` ORDER BY b.fecha_publicacion DESC`;
                break;
            case 'titulo_asc':
                query += ` ORDER BY b.titulo ASC`;
                break;
            case 'titulo_desc':
                query += ` ORDER BY b.titulo DESC`;
                break;
        }
        
        // Agregar paginación
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);
        
        const [posts] = await db.execute(query, params);
        
        // Obtener total de posts para paginación
        let countQuery = `
            SELECT COUNT(DISTINCT b.id_post) as total
            FROM blogpost b
            LEFT JOIN categoria_blog cb ON b.id_post = cb.id_post
            LEFT JOIN categoria c ON cb.id_categoria = c.id_categoria
            WHERE b.id_estado = 1
        `;
        
        const countParams = [];
        
        if (search) {
            countQuery += ` AND (b.titulo LIKE ? OR b.contenido LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }
        
        if (categoria) {
            countQuery += ` AND c.nom_categoria = ?`;
            countParams.push(categoria);
        }
        
        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;
        
        res.json({
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al obtener posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Obtener todas las categorías para filtros
app.get('/api/categories/filter', async (req, res) => {
    try {
        const [categories] = await db.execute(`
            SELECT DISTINCT c.nom_categoria, COUNT(cb.id_post) as post_count
            FROM categoria c
            JOIN categoria_blog cb ON c.id_categoria = cb.id_categoria
            JOIN blogpost b ON cb.id_post = b.id_post
            WHERE b.id_estado = 1
            GROUP BY c.id_categoria, c.nom_categoria
            ORDER BY c.nom_categoria
        `);
        res.json(categories);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Obtener un post específico por ID
app.get('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Consulta para obtener el post con información completa
        const [posts] = await db.execute(`
            SELECT 
                b.id_post,
                b.titulo,
                b.contenido,
                b.fecha_publicacion,
                b.slug,
                b.id_estado,
                u.username as autor,
                e.nom_estado as estado,
                GROUP_CONCAT(c.nom_categoria SEPARATOR ', ') as categorias,
                ip.url_imagen AS imagen_principal
            FROM blogpost b
            LEFT JOIN usuario u ON b.id_usr = u.id_usr
            LEFT JOIN estado e ON b.id_estado = e.id_estado
            LEFT JOIN categoria_blog cb ON b.id_post = cb.id_post
            LEFT JOIN categoria c ON cb.id_categoria = c.id_categoria
            LEFT JOIN imagenpost ip ON b.id_imagen = ip.id_imagen
            WHERE b.id_post = ?
            GROUP BY b.id_post, b.titulo, b.contenido, b.fecha_publicacion, b.slug, b.id_estado, u.username, e.nom_estado, ip.url_imagen
        `, [id]);

        if (posts.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Post no encontrado' 
            });
        }

        const post = posts[0];
        
        // Convertir categorías e imágenes de string a array
        post.categorias = post.categorias ? post.categorias.split(', ') : [];
        post.imagen_principal = post.imagen_principal;

        res.json(post);
    } catch (error) {
        console.error('Error al obtener post:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Actualizar post existente
app.put('/admin/actualizar-post/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { titulo, contenido, id_estado, categorias, imagenUrl } = req.body;

        // Validar campos requeridos
        if (!titulo || !contenido || !id_estado) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        let finalSlug = generateSlug(titulo);
        let id_imagen = null;
        if (imagenUrl) {
            const [imgRows] = await db.execute('SELECT id_imagen FROM imagenpost WHERE url_imagen = ?', [imagenUrl]);
            if (imgRows.length > 0) {
                id_imagen = imgRows[0].id_imagen;
            } else {
                const nombreArchivo = imagenUrl.split('/').pop();
                const [imgResult] = await db.execute(
                    'INSERT INTO imagenpost (url_imagen, desc_imagen) VALUES (?, ?)',
                    [imagenUrl, nombreArchivo]
                );
                id_imagen = imgResult.insertId;
            }
        }

        await db.execute(
            `UPDATE blogpost SET titulo = ?, contenido = ?, slug = ?, id_estado = ?, id_imagen = ? WHERE id_post = ?`,
            [titulo, contenido, finalSlug, id_estado, id_imagen, id]
        );
        await db.execute('DELETE FROM categoria_blog WHERE id_post = ?', [id]);
        if (categorias && categorias.length > 0) {
            for (const categoria of categorias) {
                let categoriaId;
                const [existingCats] = await db.execute(
                    'SELECT id_categoria FROM categoria WHERE nom_categoria = ?',
                    [categoria]
                );
                if (existingCats.length > 0) {
                    categoriaId = existingCats[0].id_categoria;
                } else {
                    const [newCatResult] = await db.execute(
                        'INSERT INTO categoria (nom_categoria) VALUES (?)',
                        [categoria]
                    );
                    categoriaId = newCatResult.insertId;
                }
                await db.execute(
                    'INSERT INTO categoria_blog (id_post, id_categoria) VALUES (?, ?)',
                    [id, categoriaId]
                );
            }
        }
        const finalUrl = generatePostUrl(finalSlug, categorias);
        res.json({ 
            success: true, 
            message: 'Post actualizado exitosamente',
            postId: id,
            slug: finalSlug,
            url: finalUrl
        });
    } catch (error) {
        console.error('Error al actualizar post:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Eliminar post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Eliminar relaciones con categorías
        await db.execute('DELETE FROM categoria_blog WHERE id_post = ?', [id]);
        
        // Eliminar el post
        await db.execute('DELETE FROM blogpost WHERE id_post = ?', [id]);

        res.json({ success: true, message: 'Post eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar post:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Crear nuevo post
app.post('/admin/crear-post', async (req, res) => {
    try {
        const { titulo, contenido, id_estado, fecha_publicacion, categorias, imagenUrl } = req.body;

        // Validar campos requeridos
        if (!titulo || !contenido || !id_estado || !fecha_publicacion) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        let finalSlug = generateSlug(titulo);
        let id_imagen = null;
        if (imagenUrl) {
            // Buscar si la imagen ya existe
            const [imgRows] = await db.execute('SELECT id_imagen FROM imagenpost WHERE url_imagen = ?', [imagenUrl]);
            if (imgRows.length > 0) {
                id_imagen = imgRows[0].id_imagen;
            } else {
                // Si es nueva, insertar solo con url y nombre simple
                const nombreArchivo = imagenUrl.split('/').pop();
                const [imgResult] = await db.execute(
                    'INSERT INTO imagenpost (url_imagen, desc_imagen) VALUES (?, ?)',
                    [imagenUrl, nombreArchivo]
                );
                id_imagen = imgResult.insertId;
            }
        }

        const [result] = await db.execute(
            `INSERT INTO blogpost (titulo, contenido, slug, id_usr, id_estado, id_imagen, fecha_publicacion, fecha_creacion) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [titulo, contenido, finalSlug, 1, id_estado, id_imagen, fecha_publicacion]
        );
        const postId = result.insertId;

        // Procesar categorías
        if (categorias && categorias.length > 0) {
            for (const categoria of categorias) {
                let categoriaId;
                const [existingCats] = await db.execute(
                    'SELECT id_categoria FROM categoria WHERE nom_categoria = ?',
                    [categoria]
                );
                if (existingCats.length > 0) {
                    categoriaId = existingCats[0].id_categoria;
                } else {
                    const [newCatResult] = await db.execute(
                        'INSERT INTO categoria (nom_categoria) VALUES (?)',
                        [categoria]
                    );
                    categoriaId = newCatResult.insertId;
                }
                await db.execute(
                    'INSERT INTO categoria_blog (id_post, id_categoria) VALUES (?, ?)',
                    [postId, categoriaId]
                );
            }
        }
        const finalUrl = generatePostUrl(finalSlug, categorias);
        res.json({ 
            success: true, 
            message: 'Post creado exitosamente',
            postId: postId,
            slug: finalSlug,
            url: finalUrl
        });
    } catch (error) {
        console.error('Error al crear post:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Endpoint para subir imagen principal de post
app.post('/api/upload-post-image', upload.single('imagen'), async (req, res) => {
    try {
        const nombre = req.body.nombre || '';
        if (!nombre.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del archivo es obligatorio'
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se ha subido ningún archivo'
            });
        }
        const extension = path.extname(req.file.originalname).toLowerCase();
        const nombreLimpio = nombre.trim()
            .replace(/[^a-zA-Z0-9\s-]/g, '')  // Solo letras, números, espacios y guiones
            .replace(/\s+/g, '-')            // Espacios por guiones
            .replace(/-+/g, '-')             // Múltiples guiones por uno solo
            .replace(/^-|-$/g, '');          // Quitar guiones al inicio y final
        
        const nombreFinal = `${nombreLimpio}${extension}`;
        const rutaDirectorio = path.join(__dirname, '..', 'frontend', 'imagenes', 'posts');
        if (!fs.existsSync(rutaDirectorio)) {
            fs.mkdirSync(rutaDirectorio, { recursive: true });
        }
        
        // Verificar si el archivo ya existe
        const rutaFinal = path.join(rutaDirectorio, nombreFinal);
        if (fs.existsSync(rutaFinal)) {
            return res.status(400).json({
                success: false,
                message: `El nombre "${nombreLimpio}" ya está en uso. Por favor, elige otro nombre.`
            });
        }
        
        fs.writeFileSync(rutaFinal, req.file.buffer);
        const imageUrl = `/imagenes/posts/${nombreFinal}`;
        // Guardar en la base de datos
        await db.execute(
            'INSERT INTO imagenpost (url_imagen, desc_imagen) VALUES (?, ?)',
            [imageUrl, nombreFinal]
        );
        console.log(`Imagen guardada como: ${rutaFinal}`);
        res.status(200).json({
            success: true,
            mensaje: 'Imagen subida con éxito',
            archivo: nombreFinal,
            url: imageUrl
        });
    } catch (err) {
        console.error('Error al guardar imagen:', err);
        res.status(500).json({ success: false, error: 'No se pudo guardar la imagen' });
    }
});

// Obtener solo las imágenes de posts
app.get('/api/post-images', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const postsDir = path.join(__dirname, '../frontend/imagenes/posts');
        
        let images = [];
        
        // Leer solo imágenes del directorio de posts
        try {
            const postImages = await fs.readdir(postsDir);
            images = postImages
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .map(file => `/imagenes/posts/${file}`);
        } catch (error) {
            console.error('Error al leer directorio de posts:', error);
        }
        
        res.json({
            success: true,
            images: images
        });
    } catch (error) {
        console.error('Error al obtener imágenes de posts:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las imágenes de posts'
        });
    }
});

// Eliminar imagen
app.delete('/api/delete-image', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL de imagen requerida'
            });
        }
        const [imgRows] = await db.execute('SELECT id_imagen FROM imagenpost WHERE url_imagen = ?', [url]);
        if (imgRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada en la base de datos'
            });
        }
        const id_imagen = imgRows[0].id_imagen;
        const [posts] = await db.execute('SELECT id_post FROM blogpost WHERE id_imagen = ?', [id_imagen]);
        if (posts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la imagen porque está siendo utilizada como imagen principal de un post.'
            });
        }
        const fs = require('fs').promises;
        const path = require('path');
        const imagePath = path.join(__dirname, '..', 'frontend', url);
        try {
            await fs.access(imagePath);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'Imagen no encontrada'
            });
        }
        await fs.unlink(imagePath);
        try {
            await db.execute('DELETE FROM imagenpost WHERE url_imagen = ?', [url]);
        } catch (err) {
            // Capturar error de clave foránea
            if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({
                    success: false,
                    message: 'No se puede eliminar la imagen porque está siendo utilizada como imagen principal de un post.'
                });
            }
            throw err;
        }
        res.json({
            success: true,
            message: 'Imagen eliminada exitosamente. Si la imagen estaba en el contenido de un post, este podría verse afectado.'
        });
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la imagen'
        });
    }
});

// Función para generar slug amigable
function generateSlug(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

// Función para generar URL con categorías
function generatePostUrl(slug, categorias) {
    if (categorias && categorias.length > 0) {
        const categoriaSlug = generateSlug(categorias[0]); // Usar la primera categoría
        return `${slug}/${categoriaSlug}`;
    }
    return slug;
}

// Redirección desde /blog hacia /blog.html
app.get('/blog', (req, res) => {
    res.redirect('/blog.html');
});

// Endpoint para solicitar recuperación de contraseña
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { correo } = req.body;
        if (!correo) {
            return res.status(400).json({ success: false, message: 'Correo requerido' });
        }
        // Buscar usuario por correo
        const [users] = await db.execute('SELECT * FROM usuario WHERE correo = ?', [correo]);
        if (users.length === 0) {
            // Ahora respondemos con success: false para que el frontend pueda distinguir
            return res.json({ success: false, message: 'El correo no existe o está mal escrito.' });
        }
        const user = users[0];
        // Generar token/código aleatorio de 6 dígitos
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        // Guardar en tabla password_reset
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        await db.execute('INSERT INTO password_reset (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id_usr, token, expires]);
        // Enviar email (usa tu función de email)
        await sendContactEmail({
            nombre: user.username,
            email: correo,
            telefono: '',
            asunto: 'Recuperación de contraseña',
            mensaje: `Tu código de recuperación es: ${token}`
        });
        return res.json({ success: true, message: 'Si el correo existe, se ha enviado un código de recuperación.' });
    } catch (error) {
        console.error('Error en forgot-password:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Endpoint para verificar el token de recuperación
app.post('/api/verify-reset-token', async (req, res) => {
    try {
        const { correo, token } = req.body;
        if (!correo || !token) {
            return res.status(400).json({ success: false, message: 'Correo y token requeridos' });
        }
        // Buscar usuario por correo
        const [users] = await db.execute('SELECT * FROM usuario WHERE correo = ?', [correo]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Token inválido' });
        }
        const user = users[0];
        // Buscar token válido, no usado y no expirado
        const [tokens] = await db.execute(
            'SELECT * FROM password_reset WHERE user_id = ? AND token = ? AND usado = 0 AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1',
            [user.id_usr, token]
        );
        if (tokens.length === 0) {
            return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
        }
        return res.json({ success: true, message: 'Token válido' });
    } catch (error) {
        console.error('Error en verify-reset-token:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Endpoint para cambiar la contraseña usando el token
app.post('/api/reset-password', async (req, res) => {
    try {
        const { correo, token, nuevaPassword } = req.body;
        if (!correo || !token || !nuevaPassword) {
            return res.status(400).json({ success: false, message: 'Datos incompletos' });
        }
        // Buscar usuario por correo
        const [users] = await db.execute('SELECT * FROM usuario WHERE correo = ?', [correo]);
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'Token inválido' });
        }
        const user = users[0];
        // Buscar token válido, no usado y no expirado
        const [tokens] = await db.execute(
            'SELECT * FROM password_reset WHERE user_id = ? AND token = ? AND usado = 0 AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1',
            [user.id_usr, token]
        );
        if (tokens.length === 0) {
            return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
        }
        // Hashear la nueva contraseña
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash(nuevaPassword, 10);
        // Actualizar contraseña del usuario
        await db.execute('UPDATE usuario SET password = ? WHERE id_usr = ?', [hash, user.id_usr]);
        // Marcar token como usado
        await db.execute('UPDATE password_reset SET usado = 1 WHERE id = ?', [tokens[0].id]);
        return res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error en reset-password:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});



// === SCRIPT TEMPORAL PARA CREAR USUARIO DE PRUEBA ===
if (process.env.CREAR_ADMIN_PRUEBA === '1') {
    const bcrypt = require('bcrypt');
    (async () => {
        const username = 'prueba';
        const passwordPlano = '12345';
        const correo = 'phonepalta711@gmail.com';
        const id_rol = 1; // admin
        const saltRounds = 10;
        const hash = await bcrypt.hash(passwordPlano, saltRounds);
        try {
            // Verificar si ya existe
            const [existe] = await db.execute('SELECT * FROM usuario WHERE username = ?', [username]);
            if (existe.length > 0) {
                console.log('El usuario de prueba ya existe.');
            } else {
                await db.execute('INSERT INTO usuario (correo, username, password, id_rol) VALUES (?, ?, ?, ?)', [correo, username, hash, id_rol]);
                console.log('Usuario de prueba creado con éxito.');
            }
        } catch (err) {
            console.error('Error al crear usuario de prueba:', err);
        } finally {
            process.exit(0);
        }
    })();
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});