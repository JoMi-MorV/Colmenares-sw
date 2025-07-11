// Variables globales
let posts = [];
let categories = [];
let estados = [];
let selectedImageUrl = null;
let editor = null;
let editorEditar = null;
let imagenesDisponibles = [];
let imagenesAdicionales = [];
let imagenesAdicionalesEditar = [];
let imagenAEliminar = null;
let categoriaAEliminar = null;

// Configuración de URL base usando detección automática
const baseURL = window.ngrokConfig ? window.ngrokConfig.getBaseURL() : 'http://localhost:8080';

// Función para probar la conexión
const testConnection = async () => {
    try {
        const response = await fetch(`${baseURL}/api/categories`);
        return response.ok;
    } catch (error) {
        console.error('Error de conexión:', error);
        return false;
    }
};

// Probar conexión al cargar
testConnection();

// Validar sesión
const checkAuth = async () => {
    try {
        const response = await fetch(`${baseURL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: localStorage.getItem('username'),
                password: localStorage.getItem('password')
            })
        });
        const data = await response.json();
        if (!data.success || data.user.role !== 'admin') {
            window.location.href = 'blog.html';
        }
    } catch (error) {
        window.location.href = 'blog.html';
    }
};

// Cargar categorías
const loadCategories = async () => {
    try {
        const response = await fetch(`${baseURL}/api/categories`);
        categories = await response.json();
        updateCategorySelects();
        updateCategoriesTable();
    } catch (error) {
        console.error('Error al cargar categorías:', error);
    }
};

// Cargar estados
const loadEstados = async () => {
    try {
        const response = await fetch(`${baseURL}/api/estados`);
        estados = await response.json();
        updateEstadoSelects();
    } catch (error) {
        console.error('Error al cargar estados:', error);
    }
};

// Actualizar selects de categorías
const updateCategorySelects = () => {
    const categorySelects = ['categoriasPost', 'categoriasEditar'];
    
    categorySelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '';
            categories.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria.nom_categoria;
                option.textContent = categoria.nom_categoria;
                select.appendChild(option);
            });
        }
    });
};

// Actualizar selects de estados
const updateEstadoSelects = () => {
    const estadoSelects = ['estadoPost', 'estadoEditar'];
    
    estadoSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Seleccionar estado...</option>';
            estados.forEach(estado => {
                const option = document.createElement('option');
                option.value = estado.id_estado;
                option.textContent = estado.nom_estado;
                select.appendChild(option);
            });
        }
    });
};

// Actualizar tabla de categorías
const updateCategoriesTable = () => {
    const tableBody = document.getElementById('categoriasTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = categories.map(cat => `
        <tr>
            <td>${cat.id_categoria}</td>
            <td>${cat.nom_categoria}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarCategoria(${cat.id_categoria})">
                    <span class="material-icons">delete</span>
                </button>
            </td>
        </tr>
    `).join('');
};

// Cerrar sesión
const logout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('password');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    
    alert('Sesión cerrada correctamente');
    window.location.href = 'blog.html';
};

// Cargar posts
const loadPosts = async () => {
    try {
        const response = await fetch(`${baseURL}/api/posts/all`);
        if (!response.ok) {
            throw new Error('Error al cargar posts');
        }
        posts = await response.json();
        renderPosts();
        updateDashboardStats();
    } catch (error) {
        console.error('Error al cargar posts:', error);
        const container = document.getElementById('postsContainer');
        if (container) {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <p>No se pudieron cargar los posts. Por favor, intenta más tarde.</p>
                    </div>
                </div>
            `;
        }
    }
};

// Función para obtener el nombre del estado
const getEstadoNombre = (idEstado) => {
    const estado = estados.find(e => e.id_estado === idEstado);
    return estado ? estado.nom_estado : 'Desconocido';
};

// Renderizar posts
const renderPosts = () => {
    const container = document.getElementById('postsContainer');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-info">
                    <p>No hay posts disponibles. ¡Crea tu primer post!</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const imagen = post.imagen_principal ? post.imagen_principal : 'imagenes/panal.png';
        const contenidoLimpio = post.contenido.replace(/<[^>]*>/g, '').substring(0, 150);
        const fecha = new Date(post.fecha_publicacion).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const estadoNombre = getEstadoNombre(post.id_estado);
        const estadoClass = post.id_estado === 1 ? 'success' : 'warning';

        return `
            <div class="col">
                <div class="card h-100">
                    <img src="${imagen}" class="card-img-top" alt="${post.titulo}" style="width: 100%; height: auto;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${post.titulo}</h5>
                            <span class="badge bg-${estadoClass}">${estadoNombre}</span>
                        </div>
                        <p class="card-text">${contenidoLimpio}...</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="btn-group">
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="editarPost(${post.id_post})">
                                    <span class="material-icons">edit</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarPost(${post.id_post})">
                                    <span class="material-icons">delete</span>
                                </button>
                            </div>
                            <small class="text-muted">${fecha}</small>
                        </div>
                        <div class="mt-2">
                            ${Array.isArray(post.categorias) ? 
                                post.categorias.map(cat => 
                                    `<span class="badge me-1">${cat}</span>`
                                ).join('') :
                                post.categorias.split(',').map(cat => 
                                    `<span class="badge me-1">${cat.trim()}</span>`
                                ).join('')
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// Actualizar estadísticas del dashboard
const updateDashboardStats = () => {
    const totalPostsPublicadosElement = document.getElementById('totalPostsPublicados');
    const totalPostsBorradoresElement = document.getElementById('totalPostsBorradores');
    const totalCategoriesElement = document.getElementById('totalCategories');

    // Asumimos que id_estado === 1 es publicado y cualquier otro es borrador/guardado
    const publicados = posts.filter(post => post.id_estado === 1).length;
    const borradores = posts.filter(post => post.id_estado !== 1).length;

    if (totalPostsPublicadosElement) {
        totalPostsPublicadosElement.textContent = publicados;
    }
    if (totalPostsBorradoresElement) {
        totalPostsBorradoresElement.textContent = borradores;
    }
    if (totalCategoriesElement) {
        totalCategoriesElement.textContent = categories.length;
    }
};

// Crear post
const crearPost = async (postData) => {
    try {


        const response = await fetch(`${baseURL}/admin/crear-post`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error de conexión' }));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('crearPostModal'));
            if (modal) {
                modal.hide();
            }
            
            // Limpiar formulario
            const form = document.getElementById('crearPostForm');
            if (form) {
                form.reset();
            }
            
            // Limpiar editor si existe
            if (window.editor) {
                window.editor.setData('');
            }
            
            // Recargar posts
            await loadPosts();
            
            // Redirigir a la pestaña de posts
            const postsTab = document.querySelector('a[href="#posts"]');
            if (postsTab) {
                postsTab.click();
            }
        } else {
            throw new Error(result.message || 'Error desconocido al crear el post');
        }
    } catch (error) {
        console.error('Error al crear post:', error);
        alert('Error al crear el post: ' + error.message);
    }
};

// Funciones globales para botones
const editarPost = async (postId) => {
    try {
        // Obtener datos del post
        const response = await fetch(`${baseURL}/api/posts/${postId}`);
        if (!response.ok) {
            throw new Error('Error al obtener el post');
        }
        
        const post = await response.json();
        

        
        // Llenar el formulario de edición
        document.getElementById('postIdEditar').value = post.id_post;
        document.getElementById('tituloEditar').value = post.titulo;
        document.getElementById('estadoEditar').value = post.id_estado;
        
        // Seleccionar categorías
        const categoriasSelect = document.getElementById('categoriasEditar');
        if (post.categorias && Array.isArray(post.categorias)) {
            // post.categorias ya es un array desde el backend
            Array.from(categoriasSelect.options).forEach(option => {
                option.selected = post.categorias.includes(option.value);
            });
        } else if (post.categorias && typeof post.categorias === 'string') {
            // Fallback por si acaso viene como string
            const categoriasArray = post.categorias.split(',').map(cat => cat.trim());
            Array.from(categoriasSelect.options).forEach(option => {
                option.selected = categoriasArray.includes(option.value);
            });
        }
        
        // Mostrar imagen principal si existe
        if (post.imagenes && post.imagenes.length > 0) {
            const imagenPrincipal = post.imagen_principal;
            imagenPrincipalSeleccionadaEditar = imagenPrincipal;
            
            // Seleccionar la imagen en la lista después de que se renderice
            setTimeout(() => {
                seleccionarImagenPrincipal(imagenPrincipal, 'editar');
            }, 100);
        }
        
        // Guardar el contenido para cargarlo después de que el editor esté listo
        const contenidoPost = post.contenido || '';
        
        // Abrir modal de edición
        const modalEditar = new bootstrap.Modal(document.getElementById('editarPostModal'));
        modalEditar.show();
        
        // Inicializar el editor y cargar contenido después de un breve retraso
        setTimeout(async () => {
            try {
                // Inicializar el editor
                editorEditar = await initializeCKEditor('contenidoEditar', editorEditar);
                
                // Cargar el contenido después de que el editor esté listo
                if (editorEditar && contenidoPost) {
                            editorEditar.setData(contenidoPost);
                }
            } catch (error) {
                console.error('Error al inicializar el editor de edición:', error);
            }
        }, 200);
        
    } catch (error) {
        console.error('Error al cargar post para editar:', error);
        alert('Error al cargar el post para editar: ' + error.message);
    }
};

// Función para actualizar post
const actualizarPost = async (postData) => {
    try {


        const response = await fetch(`${baseURL}/admin/actualizar-post/${postData.id_post}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error de conexión' }));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success) {
            window.location.href = 'admin.html'; // Redirigir al panel de administración
            return;
        } else {
            throw new Error(result.message || 'Error desconocido al actualizar el post');
        }
    } catch (error) {
        console.error('Error al actualizar post:', error);
        alert('Error al actualizar el post: ' + error.message);
    }
};

// Configurar event listeners
const setupEventListeners = () => {
    // Inicializar CKEditor cuando se abra el modal de crear post
    const crearPostModal = document.getElementById('crearPostModal');
    if (crearPostModal) {
        crearPostModal.addEventListener('shown.bs.modal', async () => {
            editor = await initializeCKEditor('contenidoPost', editor);
        });
        
        crearPostModal.addEventListener('hidden.bs.modal', () => {
            if (editor) {
                editor.destroy();
                editor = null;
            }
            // Limpiar selección de imagen principal
            imagenPrincipalSeleccionada = null;
            const previewContainer = document.getElementById('previewImagenPrincipalExistente');
            if (previewContainer) {
                previewContainer.innerHTML = '';
            }
        });
    }

    // Solo manejar el cierre del modal de editar post para limpiar el editor
    const editarPostModal = document.getElementById('editarPostModal');
    if (editarPostModal) {
        editarPostModal.addEventListener('hidden.bs.modal', () => {
            if (editorEditar) {
                editorEditar.destroy();
                editorEditar = null;
            }
            // Limpiar selección de imagen principal
            imagenPrincipalSeleccionadaEditar = null;
            const previewContainer = document.getElementById('previewImagenExistenteEditar');
            if (previewContainer) {
                previewContainer.innerHTML = '';
            }
        });
    }

    // Event listener para crear post
    const formCrear = document.getElementById('crearPostForm');
    if (!formCrear) {
        alert('No se encontró el formulario de crear post en el DOM.');
        console.error('No se encontró el formulario de crear post en el DOM.');
        return;
    }
    formCrear.addEventListener('submit', async (e) => {
        try {
            e.preventDefault();

            const titulo = document.getElementById('tituloPost').value.trim();
            const contenido = editor ? editor.getData() : '';
            const id_estado = parseInt(document.getElementById('estadoPost').value);
            
            // Validar campos requeridos
            if (!titulo || !contenido || !id_estado) {
                alert('Todos los campos marcados con * son obligatorios');
                return;
            }

            // Generar fecha automáticamente
            const fecha_publicacion = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Obtener categorías seleccionadas
            const categoriasSelect = document.getElementById('categoriasPost');
            const categorias = Array.from(categoriasSelect.selectedOptions).map(option => option.value);

            // Obtener imagen principal
            let imagenUrl = '';
            
            // Validar que se haya seleccionado una imagen principal
            if (!imagenPrincipalSeleccionada) {
                // Verificar si hay imágenes disponibles en el sistema
                const hayImagenesDisponibles = imagenesDisponibles && imagenesDisponibles.length > 0;
                
                if (hayImagenesDisponibles) {
                    alert('Debes seleccionar una imagen principal para el post');
                } else {
                    alert('No hay imágenes disponibles en el sistema. Por favor, sube imágenes desde el panel de gestión de imágenes.');
                }
                return;
            }

            imagenUrl = imagenPrincipalSeleccionada;

            // Procesar imágenes adicionales
            let imagenesAdicionalesSeleccionadas = [];
            const imagenesAdicionalesSelect = document.getElementById('imagenesAdicionales');
            if (imagenesAdicionalesSelect) {
                imagenesAdicionalesSeleccionadas = Array.from(imagenesAdicionalesSelect.selectedOptions).map(option => option.value);
            }
            
            // Subir nuevas imágenes adicionales si las hay
            let nuevasImagenesFiles = [];
            const nuevasImagenesInput = document.getElementById('nuevasImagenesAdicionales');
            if (nuevasImagenesInput) {
                nuevasImagenesFiles = nuevasImagenesInput.files;
            }
            const nuevasImagenesUrls = [];
            for (let i = 0; i < nuevasImagenesFiles.length; i++) {
                const formData = new FormData();
                formData.append('imagen', nuevasImagenesFiles[i]);
                const uploadResponse = await fetch(`${baseURL}/api/upload-post-image`, {
                    method: 'POST',
                    body: formData
                });
                const uploadResult = await uploadResponse.json();
                if (uploadResult.success) {
                    nuevasImagenesUrls.push(uploadResult.url);
                }
            }

            // Combinar todas las imágenes adicionales
            const todasImagenesAdicionales = [...imagenesAdicionalesSeleccionadas, ...nuevasImagenesUrls];

            // Crear post
            const postData = {
                titulo,
                contenido,
                id_estado,
                categorias,
                imagenUrl,
                imagenesAdicionales: todasImagenesAdicionales,
                fecha_publicacion
            };

            // Validar que haya imágenes disponibles
            if (!imagenesDisponibles || imagenesDisponibles.length === 0) {
                alert('No hay imágenes disponibles. Sube una imagen antes de crear un post.');
                return;
            }

            await crearPost(postData);
        } catch (err) {
            alert('Error al intentar crear el post: ' + err.message);
            console.error('Error al intentar crear el post:', err);
        }
    });

    // Event listener para editar post
    document.getElementById('editarPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const postId = document.getElementById('postIdEditar').value;
        const titulo = document.getElementById('tituloEditar').value.trim();
        const contenido = editorEditar ? editorEditar.getData() : '';
        const id_estado = parseInt(document.getElementById('estadoEditar').value);
        
        // Validar campos requeridos
        if (!titulo || !contenido || !id_estado) {
            alert('Todos los campos marcados con * son obligatorios');
            return;
        }

        // Generar fecha automáticamente
        const fecha_publicacion = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Obtener categorías seleccionadas
        const categoriasSelect = document.getElementById('categoriasEditar');
        const categorias = Array.from(categoriasSelect.selectedOptions).map(option => option.value);

        // Obtener imagen principal
        let imagenUrl = '';
        
        // Validar que se haya seleccionado una imagen principal
        if (!imagenPrincipalSeleccionadaEditar) {
            // Verificar si hay imágenes disponibles en el sistema
            const hayImagenesDisponibles = imagenesDisponibles && imagenesDisponibles.length > 0;
            
            if (hayImagenesDisponibles) {
                alert('Debes seleccionar una imagen principal para el post');
            } else {
                alert('No hay imágenes disponibles en el sistema. Por favor, sube imágenes desde el panel de gestión de imágenes.');
            }
            return;
        }

        imagenUrl = imagenPrincipalSeleccionadaEditar;

        // Actualizar post
        const postData = {
            id_post: postId,
            titulo,
            contenido,
            id_estado,
            categorias,
            imagenUrl,
            fecha_publicacion
        };

        await actualizarPost(postData);
    });

    // Event listeners para imágenes adicionales
    document.getElementById('imagenesAdicionales')?.addEventListener('change', function() {
        const preview = document.getElementById('previewImagenesAdicionales');
        const selectedOptions = Array.from(this.selectedOptions);
        
        preview.innerHTML = selectedOptions.map(option => 
            `<div class="col-md-3 mb-2">
                <img src="${option.value}" class="img-thumbnail" style="max-height: 80px;">
                <small class="d-block">${option.textContent}</small>
            </div>`
        ).join('');
    });

    document.getElementById('nuevasImagenesAdicionales')?.addEventListener('change', function() {
        const preview = document.getElementById('previewImagenesAdicionales');
        const currentPreview = preview.innerHTML;
        let newPreview = currentPreview;
        
        for (let i = 0; i < this.files.length; i++) {
            const reader = new FileReader();
            reader.onload = function(e) {
                newPreview += `<div class="col-md-3 mb-2">
                    <img src="${e.target.result}" class="img-thumbnail" style="max-height: 80px;">
                    <small class="d-block">Nueva imagen ${i + 1}</small>
                </div>`;
                preview.innerHTML = newPreview;
            };
            reader.readAsDataURL(this.files[i]);
        }
    });

    // Botón para insertar imágenes en el editor (crear post)
    document.getElementById('insertarImagenesBtn')?.addEventListener('click', function() {
        const imagenesAdicionalesSelect = document.getElementById('imagenesAdicionales');
        const imagenesSeleccionadas = Array.from(imagenesAdicionalesSelect.selectedOptions).map(option => option.value);
        
        if (imagenesSeleccionadas.length === 0) {
            alert('Por favor selecciona al menos una imagen para insertar');
            return;
        }
        
        if (editor) {
            insertMultipleImagesInEditor(imagenesSeleccionadas, editor);
            alert(`${imagenesSeleccionadas.length} imagen(es) insertada(s) en el editor`);
        } else {
            alert('El editor no está disponible. Por favor, espera a que se cargue completamente.');
        }
    });

    // Botón para limpiar selección de imágenes (crear post)
    document.getElementById('limpiarImagenesBtn')?.addEventListener('click', function() {
        const imagenesAdicionalesSelect = document.getElementById('imagenesAdicionales');
        const nuevasImagenesInput = document.getElementById('nuevasImagenesAdicionales');
        const preview = document.getElementById('previewImagenesAdicionales');
        
        // Limpiar selección
        Array.from(imagenesAdicionalesSelect.options).forEach(option => option.selected = false);
        
        // Limpiar input de archivos
        nuevasImagenesInput.value = '';
        
        // Limpiar preview
        preview.innerHTML = '';
        
        alert('Selección de imágenes limpiada');
    });

    // Botón para insertar imágenes en el editor (editar post)
    document.getElementById('insertarImagenesEditarBtn')?.addEventListener('click', function() {
        const imagenesAdicionalesSelect = document.getElementById('imagenesAdicionalesEditar');
        const imagenesSeleccionadas = Array.from(imagenesAdicionalesSelect.selectedOptions).map(option => option.value);
        
        if (imagenesSeleccionadas.length === 0) {
            alert('Por favor selecciona al menos una imagen para insertar');
            return;
        }
        
        if (editorEditar) {
            insertMultipleImagesInEditor(imagenesSeleccionadas, editorEditar);
            alert(`${imagenesSeleccionadas.length} imagen(es) insertada(s) en el editor`);
        } else {
            alert('El editor no está disponible. Por favor, espera a que se cargue completamente.');
        }
    });

    // Botón para limpiar selección de imágenes (editar post)
    document.getElementById('limpiarImagenesEditarBtn')?.addEventListener('click', function() {
        const imagenesAdicionalesSelect = document.getElementById('imagenesAdicionalesEditar');
        const nuevasImagenesInput = document.getElementById('nuevasImagenesAdicionalesEditar');
        const preview = document.getElementById('previewImagenesAdicionalesEditar');
        
        // Limpiar selección
        Array.from(imagenesAdicionalesSelect.options).forEach(option => option.selected = false);
        
        // Limpiar input de archivos
        nuevasImagenesInput.value = '';
        
        // Limpiar preview
        preview.innerHTML = '';
        
        alert('Selección de imágenes limpiada');
    });

    // Event listener para crear categoría
    document.getElementById('newCategoriaForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const nom_categoria = document.getElementById('nomCategoria').value.trim();

        if (!nom_categoria) {
            alert('El nombre de la categoría es obligatorio');
            return;
        }

        try {
            const response = await fetch(`${baseURL}/api/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nom_categoria })
            });
            
            if (response.ok) {
                document.getElementById('newCategoriaForm').reset();
                await loadCategories();
                
                const modalEl = document.getElementById('crearCategoriaModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            } else {
                alert('Error al crear la categoría');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear la categoría');
        }
    });



    // Event listener para subir imagen
    document.getElementById('subirImagenForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const archivo = document.getElementById('archivoImagen').files[0];
        const nombre = document.getElementById('nombreImagen').value.trim();
        
        if (!archivo) {
            alert('Por favor selecciona un archivo');
            return;
        }
        
        if (!nombre) {
            alert('Por favor ingresa un nombre para el archivo');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('imagen', archivo);
            formData.append('nombre', nombre);
            
            const response = await fetch(`${baseURL}/api/upload-post-image`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if (result.success) {
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('subirImagenModal'));
                modal.hide();
                
                // Limpiar formulario
                document.getElementById('subirImagenForm').reset();
                document.getElementById('previewSubidaImagen').innerHTML = '';
                
                // Recargar imágenes
                await loadPostImages();
            } else {
                alert('Error al subir la imagen: ' + result.message);
            }
        } catch (error) {
            console.error('Error al subir imagen:', error);
            alert('Error al subir la imagen');
        }
    });

    // Preview de imagen al seleccionar archivo
    document.getElementById('archivoImagen')?.addEventListener('change', function() {
        const preview = document.getElementById('previewSubidaImagen');
        if (this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `
                    <div class="mt-3">
                        <img src="${e.target.result}" class="img-thumbnail" style="max-height: 200px;">
                        <p class="text-muted mt-2">${this.files[0].name}</p>
                    </div>
                `;
            }.bind(this);
            reader.readAsDataURL(this.files[0]);
        } else {
            preview.innerHTML = '';
        }
    });

    // Event listeners para preview de imágenes
    document.getElementById('imagenPrincipalExistente')?.addEventListener('change', function() {
        const preview = document.getElementById('previewImagenPrincipalExistente');
        if (this.value) {
            preview.innerHTML = `<img src="${this.value}" class="img-thumbnail" style="max-height: 100px;">`;
        } else {
            preview.innerHTML = '';
        }
    });
    
    // Event listener para preview de imagen principal (editar post)
    document.getElementById('imagenExistenteEditar')?.addEventListener('change', function() {
        const preview = document.getElementById('previewImagenExistenteEditar');
        if (this.value) {
            preview.innerHTML = `<img src="${this.value}" class="img-thumbnail" style="max-height: 100px;">`;
        } else {
            preview.innerHTML = '';
        }
    });

    // Redirigir al panel de administración al cancelar la edición de un post
    const cancelarEditarPostBtn = document.getElementById('cancelarEditarPostBtn');
    if (cancelarEditarPostBtn) {
        cancelarEditarPostBtn.addEventListener('click', function() {
            window.location.href = 'admin.html';
        });
    }



};

// Funciones globales para botones
const confirmarEliminarPost = async (postId) => {
    const post = posts.find(p => p.id_post === postId);
    const postTitle = post ? post.titulo : 'este post';
    
    if (confirm(`¿Estás seguro de que deseas eliminar "${postTitle}"? Esta acción no se puede deshacer.`)) {
        try {
            const response = await fetch(`${baseURL}/api/posts/${postId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                await loadPosts(); // Recargar la lista de posts
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error al eliminar el post' }));
                alert('Error al eliminar el post: ' + errorData.message);
            }
        } catch (error) {
            console.error('Error al eliminar post:', error);
            alert('Error al eliminar el post: ' + error.message);
        }
    }
};



const confirmarEliminarCategoria = async (categoriaId) => {
    categoriaAEliminar = categoriaId;
    const modal = new bootstrap.Modal(document.getElementById('confirmarEliminarEtiquetaModal'));
    modal.show();
};

document.getElementById('confirmarEliminarEtiquetaBtn')?.addEventListener('click', async function() {
    if (categoriaAEliminar) {
        try {
            const response = await fetch(`${baseURL}/api/categories/${categoriaAEliminar}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await loadCategories();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error al eliminar la categoría' }));
                if (errorData.message && errorData.message.includes('No se puede eliminar la etiqueta porque está siendo utilizada')) {
                    const errorModal = new bootstrap.Modal(document.getElementById('errorEliminarCategoriaModal'));
                    errorModal.show();
                } else {
                    alert('Error al eliminar la categoría: ' + errorData.message);
                }
            }
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            alert('Error al eliminar la categoría: ' + error.message);
        }
        categoriaAEliminar = null;
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmarEliminarEtiquetaModal'));
        modal.hide();
    }
});

// Cargar imágenes de posts
const loadPostImages = async () => {
    try {
        const response = await fetch(`${baseURL}/api/post-images`);
        const data = await response.json();
        if (data.success) {
            imagenesDisponibles = data.images;
            updateImageSelects();
            renderImagesGrid();
            renderImagenesContenido();
            renderImagenesPrincipales();
        }
    } catch (error) {
        console.error('Error al cargar imágenes:', error);
        imagenesDisponibles = [];
        updateImageSelects();
        renderImagesGrid();
        renderImagenesContenido();
        renderImagenesPrincipales();
    }
};

// Renderizar grid de imágenes
const renderImagesGrid = () => {
    const grid = document.getElementById('imagenesGrid');
    const mensajeNoImagenes = document.getElementById('mensajeNoImagenes');
    
    if (!grid) return;
    
    if (!imagenesDisponibles || imagenesDisponibles.length === 0) {
        grid.innerHTML = '';
        mensajeNoImagenes.classList.remove('d-none');
        return;
    }
    
    mensajeNoImagenes.classList.add('d-none');
    
    grid.innerHTML = imagenesDisponibles.map(imagen => {
        const nombreArchivo = imagen.split('/').pop();
        
        return `
            <div class="col">
                <div class="card h-100 image-card">
                    <img src="${imagen}" class="card-img-top" alt="${nombreArchivo}" style="height: 200px; object-fit: cover;">
                    <div class="card-body">
                        <h6 class="card-title text-truncate">${nombreArchivo}</h6>
                        <p class="card-text">
                            <span class="badge bg-primary">Imagen</span>
                        </p>
                        <div class="btn-group w-100">
                            <button class="btn btn-sm btn-outline-danger" onclick="confirmarEliminarImagen('${imagen}')" title="Eliminar imagen">
                                <span class="material-icons">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// Confirmar eliminar imagen
const confirmarEliminarImagen = (url) => {
    imagenAEliminar = url;
    const modal = new bootstrap.Modal(document.getElementById('confirmarEliminarImagenModal'));
    modal.show();
};

document.getElementById('confirmarEliminarImagenBtn')?.addEventListener('click', function() {
    if (imagenAEliminar) {
        eliminarImagen(imagenAEliminar);
        imagenAEliminar = null;
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmarEliminarImagenModal'));
        modal.hide();
    }
});

// Eliminar imagen
const eliminarImagen = async (url) => {
    try {
        const response = await fetch(`${baseURL}/api/delete-image`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        });
        const result = await response.json();
        if (result.success) {
            await loadPostImages();
        } else if (result.message && result.message.includes('No se puede eliminar la imagen porque está siendo utilizada como imagen principal')) {
            const errorModal = new bootstrap.Modal(document.getElementById('errorEliminarImagenPrincipalModal'));
            errorModal.show();
        } else {
            alert('Error al eliminar la imagen: ' + (result.message || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        alert('Error al eliminar la imagen: ' + error.message);
    }
};

// Renderizar imágenes para insertar en contenido
const renderImagenesContenido = () => {
    const containerCrear = document.getElementById('imagenesContenidoContainer');
    const containerEditar = document.getElementById('imagenesContenidoContainerEditar');
    
    if (!imagenesDisponibles || imagenesDisponibles.length === 0) {
        const mensaje = `
            <div class="col-12 text-center">
                <p class="text-muted">No hay imágenes disponibles</p>
            </div>
        `;
        if (containerCrear) containerCrear.innerHTML = mensaje;
        if (containerEditar) containerEditar.innerHTML = mensaje;
        return;
    }
    
    // Ordenar imágenes alfabéticamente por nombre de archivo
    const imagenesOrdenadas = [...imagenesDisponibles].sort((a, b) => {
        const nombreA = a.split('/').pop().toLowerCase();
        const nombreB = b.split('/').pop().toLowerCase();
        return nombreA.localeCompare(nombreB, 'es', { numeric: true });
    });
    
    const imagenesHTML = `
        <div class="col-12">
            <div class="imagenes-contenido-scroll-container">
                <div class="imagenes-contenido-list" tabindex="0">
                    ${imagenesOrdenadas.map((imagen, index) => {
                        const nombreArchivo = imagen.split('/').pop();
                        return `
                            <div class="imagen-contenido-item" 
                                 onclick="insertarImagenEnContenido('${imagen}')"
                                 onkeydown="handleImageItemKeydown(event, '${imagen}', ${index})"
                                 tabindex="0"
                                 role="button"
                                 aria-label="Insertar imagen ${nombreArchivo}">
                                <div class="imagen-contenido-nombre">${nombreArchivo}</div>
                                <div class="imagen-contenido-preview">
                                    <img src="${imagen}" alt="${nombreArchivo}" class="imagen-contenido-thumbnail">
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
    
    if (containerCrear) containerCrear.innerHTML = imagenesHTML;
    if (containerEditar) containerEditar.innerHTML = imagenesHTML;
    
    // Configurar navegación con teclado y rueda del ratón
    setupImageNavigation();
};

// Insertar imagen en el contenido del editor
const insertarImagenEnContenido = (urlImagen) => {
    const nombreArchivo = urlImagen.split('/').pop();
    
    // Determinar qué editor está activo y enfocar en él
    let activeEditor = null;
    
    if (editor) {
        activeEditor = editor;
        editor.focus();
    } else if (editorEditar) {
        activeEditor = editorEditar;
        editorEditar.focus();
    }
    
    if (activeEditor) {
        // Crear HTML de la imagen con tamaño uniforme, centrada y visualmente atractiva
        const imagenHTML = `
            <div class="imagen-contenido-wrapper" style="
                text-align: center; 
                margin: 30px 0; 
                padding: 20px 0;
                border-radius: 12px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                border: 1px solid #dee2e6;
                position: relative;
                overflow: hidden;
            ">
                <img src="${urlImagen}" 
                     alt="${nombreArchivo}" 
                     style="
                         width: 600px; 
                         height: 400px; 
                         object-fit: cover; 
                         border-radius: 8px; 
                         box-shadow: 0 6px 20px rgba(0,0,0,0.15);
                         border: 3px solid white;
                         display: inline-block;
                         transition: all 0.3s ease;
                     "
                     onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.2)'"
                     onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.15)'"
                >

            </div>
        `;
        
        // Insertar la imagen usando el método correcto de CKEditor
        const viewFragment = activeEditor.data.processor.toView(imagenHTML);
        const modelFragment = activeEditor.data.toModel(viewFragment);
        activeEditor.model.insertContent(modelFragment);
        
        // Mostrar confirmación
        const toast = document.createElement('div');
        toast.className = 'position-fixed top-0 end-0 p-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast show" role="alert">
                <div class="toast-header">
                    <strong class="me-auto">Imagen insertada</strong>
                    <button type="button" class="btn-close" onclick="this.closest('.toast').remove()"></button>
                </div>
                <div class="toast-body">
                    La imagen "${nombreArchivo}" ha sido insertada centrada en el contenido.
                </div>
            </div>
        `;
        document.body.appendChild(toast);
        
        // Remover el toast después de 3 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    } else {
        alert('No hay editor activo. Por favor, haz clic en el área de contenido primero.');
    }
};

// Actualizar selects de imágenes
const updateImageSelects = () => {
    const imageSelects = ['imagenesAdicionales', 'imagenesAdicionalesEditar'];
    let hayImagenes = imagenesDisponibles && imagenesDisponibles.length > 0;
    imageSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '';
            if (hayImagenes) {
                imagenesDisponibles.forEach(imagen => {
                    const option = document.createElement('option');
                    option.value = imagen;
                    option.textContent = imagen.split('/').pop();
                    select.appendChild(option);
                });
            }
        }
    });
    
    // Deshabilitar botón Guardar Post si no hay imágenes
    const guardarBtn = document.querySelector('#crearPostForm button[type="submit"]');
    if (guardarBtn) {
        guardarBtn.disabled = !hayImagenes;
    }
    
    // Mostrar mensaje claro en el modal de crear post
    const mensajeElement = document.getElementById('mensajeImagenesDisponibles');
    if (mensajeElement) {
        if (hayImagenes) {
            mensajeElement.textContent = `Hay ${imagenesDisponibles.length} imagen(es) disponible(s) en la carpeta de posts`;
            mensajeElement.className = 'form-text mt-2 text-success';
        } else {
            mensajeElement.textContent = 'No hay imágenes disponibles en la carpeta de posts. Sube una nueva imagen desde la pestaña Imágenes antes de crear un post.';
            mensajeElement.className = 'form-text mt-2 text-danger';
        }
    }
    
    // Mostrar mensaje claro en el modal de editar post
    const mensajeElementEditar = document.getElementById('mensajeImagenesDisponiblesEditar');
    if (mensajeElementEditar) {
        if (hayImagenes) {
            mensajeElementEditar.textContent = `Hay ${imagenesDisponibles.length} imagen(es) disponible(s) en la carpeta de posts`;
            mensajeElementEditar.className = 'form-text mt-2 text-success';
        } else {
            mensajeElementEditar.textContent = 'No hay imágenes disponibles en la carpeta de posts. Sube una nueva imagen desde la pestaña Imágenes antes de editar un post.';
            mensajeElementEditar.className = 'form-text mt-2 text-danger';
        }
    }
};

// Inicializar CKEditor
const initializeCKEditor = async (elementId, editorInstance) => {
    // Destruir editor existente si hay uno
    if (editorInstance && editorInstance.destroy) {
        editorInstance.destroy();
    }
    
    try {
        const newEditor = await ClassicEditor
            .create(document.getElementById(elementId), {
            toolbar: {
                items: [
                    'undo', 'redo',
                    '|', 'heading',
                    '|', 'bold', 'italic', 'strikethrough', 'underline',
                    '|', 'link', 'blockQuote', 'insertTable', 'mediaEmbed',
                    '|', 'bulletedList', 'numberedList',
                    '|', 'indent', 'outdent',
                    '|', 'fontSize', 'fontColor', 'fontBackgroundColor',
                    '|', 'alignment',
                    '|', 'horizontalLine', 'specialCharacters',
                    '|', 'removeFormat'
                ]
            },
            language: 'es',
            table: {
                contentToolbar: [
                    'tableColumn',
                    'tableRow',
                    'mergeTableCells'
                ]
            },
            mediaEmbed: {
                previewsInData: true,
                providers: [
                    {
                        name: 'youtube',
                        url: [
                            /^(?:m\.)?youtube\.com\/watch\?v=([\w-]+)/,
                            /^(?:m\.)?youtube\.com\/v\/([\w-]+)/,
                            /^youtube\.com\/embed\/([\w-]+)/,
                            /^youtu\.be\/([\w-]+)/
                        ],
                        html: match => {
                            const id = match[1];
                            return (
                                '<div class="video-embed">' +
                                '<iframe src="https://www.youtube.com/embed/' + id + '" ' +
                                'frameborder="0" allowfullscreen="true" ' +
                                'style="width: 100%; height: 400px;">' +
                                '</iframe>' +
                                '</div>'
                            );
                        }
                    },
                    {
                        name: 'vimeo',
                        url: [
                            /^vimeo\.com\/(\d+)/,
                            /^vimeo\.com\/video\/(\d+)/,
                            /^vimeo\.com\/groups\/[\w-]+\/videos\/(\d+)/,
                            /^vimeo\.com\/channels\/[\w-]+\/(\d+)/
                        ],
                        html: match => {
                            const id = match[1];
                            return (
                                '<div class="video-embed">' +
                                '<iframe src="https://player.vimeo.com/video/' + id + '" ' +
                                'frameborder="0" allowfullscreen="true" ' +
                                'style="width: 100%; height: 400px;">' +
                                '</iframe>' +
                                '</div>'
                            );
                        }
                    }
                ]
            },
            image: {
                toolbar: [
                    'imageTextAlternative',
                    'imageStyle:inline',
                    'imageStyle:block',
                    'imageStyle:side'
                ],
                styles: [
                    'full',
                    'side',
                    'alignLeft',
                    'alignCenter',
                    'alignRight'
                ]
            }
        });
        

        return newEditor;
    } catch (error) {
        console.error('Error al inicializar CKEditor:', error);
        throw error;
    }
};

// Función para insertar imagen en el editor
const insertImageInEditor = (imageUrl, editorInstance) => {
    if (editorInstance) {
        editorInstance.model.change(writer => {
            // Crear un elemento de imagen
            const imageElement = writer.createElement('image', {
                src: imageUrl,
                alt: 'Imagen insertada'
            });
            
            // Obtener la posición actual del cursor
            const insertPosition = editorInstance.model.document.selection.getFirstPosition();
            
            // Insertar la imagen en la posición actual
            editorInstance.model.insertContent(imageElement, insertPosition);
            
            // Mover el cursor después de la imagen
            writer.setSelection(imageElement, 'after');
        });
    }
};

// Función para insertar múltiples imágenes en el editor
const insertMultipleImagesInEditor = (imageUrls, editorInstance) => {
    if (editorInstance && imageUrls.length > 0) {
        editorInstance.model.change(writer => {
            const insertPosition = editorInstance.model.document.selection.getFirstPosition();
            
            // Crear un fragmento con todas las imágenes
            const fragment = writer.createRawElement('div', {}, function(domElement) {
                imageUrls.forEach(imageUrl => {
                    const imgElement = document.createElement('img');
                    imgElement.src = imageUrl;
                    imgElement.alt = 'Imagen insertada';
                    imgElement.style.maxWidth = '100%';
                    imgElement.style.height = 'auto';
                    imgElement.style.margin = '10px 0';
                    domElement.appendChild(imgElement);
                });
            });
            
            editorInstance.model.insertContent(fragment, insertPosition);
        });
    }
};

// Función para manejar navegación con teclado en elementos de imagen
const handleImageItemKeydown = (event, imageUrl, index) => {
    const items = document.querySelectorAll('.imagen-contenido-item');
    const currentItem = event.target.closest('.imagen-contenido-item');
    const currentIndex = Array.from(items).indexOf(currentItem);
    
    switch (event.key) {
        case 'Enter':
        case ' ':
            event.preventDefault();
            insertarImagenEnContenido(imageUrl);
            break;
        case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
                items[currentIndex - 1].focus();
            }
            break;
        case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < items.length - 1) {
                items[currentIndex + 1].focus();
            }
            break;
        case 'Home':
            event.preventDefault();
            items[0].focus();
            break;
        case 'End':
            event.preventDefault();
            items[items.length - 1].focus();
            break;
    }
};

// Variables para imagen principal seleccionada
let imagenPrincipalSeleccionada = null;
let imagenPrincipalSeleccionadaEditar = null;

// Renderizar imágenes principales
const renderImagenesPrincipales = () => {
    const containerCrear = document.getElementById('imagenesPrincipalesContainer');
    const containerEditar = document.getElementById('imagenesPrincipalesContainerEditar');
    
    if (!imagenesDisponibles || imagenesDisponibles.length === 0) {
        const mensaje = `
            <div class="col-12 text-center">
                <p class="text-muted">No hay imágenes disponibles</p>
            </div>
        `;
        if (containerCrear) containerCrear.innerHTML = mensaje;
        if (containerEditar) containerEditar.innerHTML = mensaje;
        return;
    }
    
    // Ordenar imágenes alfabéticamente por nombre de archivo
    const imagenesOrdenadas = [...imagenesDisponibles].sort((a, b) => {
        const nombreA = a.split('/').pop().toLowerCase();
        const nombreB = b.split('/').pop().toLowerCase();
        return nombreA.localeCompare(nombreB, 'es', { numeric: true });
    });
    
    const imagenesHTML = imagenesOrdenadas.map((imagen, index) => {
        const nombreArchivo = imagen.split('/').pop();
        return `
            <div class="imagen-principal-item" 
                 onclick="seleccionarImagenPrincipal('${imagen}', 'crear')"
                 onkeydown="handleImagenPrincipalKeydown(event, '${imagen}', ${index}, 'crear')"
                 tabindex="0"
                 role="button"
                 aria-label="Seleccionar imagen principal ${nombreArchivo}">
                <div class="imagen-principal-nombre">${nombreArchivo}</div>
                <div class="imagen-principal-preview">
                    <img src="${imagen}" alt="${nombreArchivo}" class="imagen-principal-thumbnail">
                </div>
            </div>
        `;
    }).join('');
    
    const imagenesHTMLEditar = imagenesOrdenadas.map((imagen, index) => {
        const nombreArchivo = imagen.split('/').pop();
        return `
            <div class="imagen-principal-item" 
                 onclick="seleccionarImagenPrincipal('${imagen}', 'editar')"
                 onkeydown="handleImagenPrincipalKeydown(event, '${imagen}', ${index}, 'editar')"
                 tabindex="0"
                 role="button"
                 aria-label="Seleccionar imagen principal ${nombreArchivo}">
                <div class="imagen-principal-nombre">${nombreArchivo}</div>
                <div class="imagen-principal-preview">
                    <img src="${imagen}" alt="${nombreArchivo}" class="imagen-principal-thumbnail">
                </div>
            </div>
        `;
    }).join('');
    
    if (containerCrear) containerCrear.innerHTML = imagenesHTML;
    if (containerEditar) containerEditar.innerHTML = imagenesHTMLEditar;
    
    // Configurar navegación para imágenes principales
    setupImageNavigation();
};

// Seleccionar imagen principal
const seleccionarImagenPrincipal = (imageUrl, tipo) => {
    const container = tipo === 'crear' ? 
        document.getElementById('imagenesPrincipalesContainer') : 
        document.getElementById('imagenesPrincipalesContainerEditar');
    
    const previewContainer = tipo === 'crear' ? 
        document.getElementById('previewImagenPrincipalExistente') : 
        document.getElementById('previewImagenExistenteEditar');
    
    // Remover selección anterior
    const items = container.querySelectorAll('.imagen-principal-item');
    items.forEach(item => item.classList.remove('selected'));
    
    // Seleccionar nueva imagen
    const selectedItem = container.querySelector(`[onclick*="${imageUrl}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Actualizar variable global
    if (tipo === 'crear') {
        imagenPrincipalSeleccionada = imageUrl;
    } else {
        imagenPrincipalSeleccionadaEditar = imageUrl;
    }
    
    // Mostrar preview
    const nombreArchivo = imageUrl.split('/').pop();
    previewContainer.innerHTML = `
        <div class="alert alert-success">
            <div class="d-flex align-items-center">
                <img src="${imageUrl}" alt="${nombreArchivo}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.25rem; margin-right: 1rem;">
                <div>
                    <strong>Imagen seleccionada:</strong> ${nombreArchivo}
                </div>
            </div>
        </div>
    `;
    
    // Hacer scroll al elemento seleccionado
    selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Manejar navegación con teclado para imágenes principales
const handleImagenPrincipalKeydown = (event, imageUrl, index, tipo) => {
    const container = tipo === 'crear' ? 
        document.getElementById('imagenesPrincipalesContainer') : 
        document.getElementById('imagenesPrincipalesContainerEditar');
    
    const items = container.querySelectorAll('.imagen-principal-item');
    const currentItem = event.target.closest('.imagen-principal-item');
    const currentIndex = Array.from(items).indexOf(currentItem);
    
    switch (event.key) {
        case 'Enter':
        case ' ':
            event.preventDefault();
            seleccionarImagenPrincipal(imageUrl, tipo);
            break;
        case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
                items[currentIndex - 1].focus();
            }
            break;
        case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < items.length - 1) {
                items[currentIndex + 1].focus();
            }
            break;
        case 'Home':
            event.preventDefault();
            items[0].focus();
            break;
        case 'End':
            event.preventDefault();
            items[items.length - 1].focus();
            break;
    }
};

// Configurar navegación con teclado y rueda del ratón
const setupImageNavigation = () => {
    const containers = document.querySelectorAll('.imagenes-contenido-list');
    
    containers.forEach(container => {
        // Navegación con rueda del ratón
        container.addEventListener('wheel', (event) => {
            event.preventDefault();
            const scrollAmount = event.deltaY > 0 ? 50 : -50;
            container.scrollTop += scrollAmount;
        });
        
        // Navegación con teclado en el contenedor
        container.addEventListener('keydown', (event) => {
            const items = container.querySelectorAll('.imagen-contenido-item, .imagen-principal-item');
            const focusedItem = container.querySelector('.imagen-contenido-item:focus, .imagen-principal-item:focus');
            const currentIndex = focusedItem ? Array.from(items).indexOf(focusedItem) : -1;
            
            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    if (currentIndex > 0) {
                        items[currentIndex - 1].focus();
                    }
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    if (currentIndex < items.length - 1) {
                        items[currentIndex + 1].focus();
                    } else if (currentIndex === -1) {
                        items[0].focus();
                    }
                    break;
                case 'Home':
                    event.preventDefault();
                    items[0].focus();
                    break;
                case 'End':
                    event.preventDefault();
                    items[items.length - 1].focus();
                    break;
            }
        });
        
        // Mostrar indicador de scroll cuando hay más contenido
        const checkScrollIndicator = () => {
            const hasMore = container.scrollHeight > container.clientHeight;
            container.parentElement.classList.toggle('has-more', hasMore);
        };
        
        container.addEventListener('scroll', checkScrollIndicator);
        checkScrollIndicator();
    });
};

// Al inicio del archivo, aseguro que el código se ejecute solo cuando el DOM esté listo
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mainInit);
    } else {
        mainInit();
    }

    function mainInit() {
        try {
            // Código original de inicialización
            checkAuth()
                .then(loadCategories)
                .then(loadEstados)
                .then(loadPosts)
                .then(loadPostImages)
                .then(setupEventListeners)
                .catch(error => {
                    console.error('Error en inicialización:', error);
                    alert('Error crítico al inicializar la página: ' + error.message);
                });
        } catch (e) {
            console.error('Error global:', e);
            alert('Error global: ' + e.message);
        }
    }

    // Manejo global de errores JS
    window.onerror = function(msg, url, line, col, error) {
        alert('Error de JavaScript: ' + msg + ' en ' + url + ':' + line);
        return false;
    };
})();
